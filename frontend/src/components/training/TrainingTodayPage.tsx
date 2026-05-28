import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { ChevronDown, Calendar, Ban } from 'lucide-react'
import { useTraining } from '@/hooks/useTraining'
import { usePlayers } from '@/hooks/usePlayers'
import { computeAttendanceStats, type PlayerAttendanceStats } from '@/hooks/useAttendanceStats'
import * as api from '@/api/client'
import type { TrainingPlanContentResponse, DrillResponse, InfieldPosition } from '@/types'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { AttendanceList } from './AttendanceList'
import { AttendanceCounter } from './AttendanceCounter'
import { StatsDrawer } from './StatsDrawer'
import { PlanEditDrawer } from './PlanEditDrawer'
import { TrainingPlanView } from './TrainingPlanView'
import { TrainingPickerDrawer } from './TrainingPickerDrawer'
import { GeneratePlanDrawer } from './GeneratePlanDrawer'
import { SharePlanDrawer } from './SharePlanDrawer'

type MobileTab = 'anwesenheit' | 'plan'
type AttendanceSort = 'alpha' | 'frequency' | 'decided'

export function TrainingTodayPage() {
  const { trainings, attendance, toggleAttendance, cancelTraining } = useTraining()
  const { players } = usePlayers()
  const [statsOpen, setStatsOpen] = useState(false)
  const [planEditOpen, setPlanEditOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [planContent, setPlanContent] = useState<TrainingPlanContentResponse | null>(null)
  const [planId, setPlanId] = useState<number | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('anwesenheit')
  const [attendanceSort, setAttendanceSort] = useState<AttendanceSort>('frequency')
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null)
  const [drills, setDrills] = useState<DrillResponse[]>([])

  useEffect(() => {
    let cancelled = false
    api.getDrills()
      .then(d => { if (!cancelled) setDrills(d) })
      .catch(() => { if (!cancelled) setDrills([]) })
    return () => { cancelled = true }
  }, [])

  const sortedActiveTrainings = useMemo(
    () => trainings.filter(t => !t.cancelled).slice().sort((a, b) => a.date.localeCompare(b.date)),
    [trainings],
  )

  const defaultTrainingId = useMemo(() => {
    const now = new Date()
    const upcoming = sortedActiveTrainings.find(t => new Date(t.date) >= now)
    return upcoming?.id ?? sortedActiveTrainings[sortedActiveTrainings.length - 1]?.id ?? null
  }, [sortedActiveTrainings])

  const currentTrainingId = selectedTrainingId ?? defaultTrainingId
  const currentTraining = useMemo(
    () => trainings.find(t => t.id === currentTrainingId) ?? null,
    [trainings, currentTrainingId],
  )

  const presentIds = useMemo(() => {
    if (!currentTraining) return new Set<number>()
    const map = attendance.get(currentTraining.id) ?? new Map<number, boolean>()
    return new Set([...map.entries()].filter(([, p]) => p).map(([id]) => id))
  }, [attendance, currentTraining])

  const stats = useMemo(() => {
    const m = new Map<number, PlayerAttendanceStats>()
    for (const p of players) {
      m.set(p.id, computeAttendanceStats({ trainings, attendance, playerId: p.id }))
    }
    return m
  }, [players, trainings, attendance])

  const totalTrainings = useMemo(() => trainings.filter(t => !t.cancelled).length, [trainings])

  const decidedIds = useMemo(() => {
    if (!currentTraining) return new Set<number>()
    const map = attendance.get(currentTraining.id) ?? new Map<number, boolean>()
    return new Set(map.keys())
  }, [attendance, currentTraining])

  const sortedPlayers = useMemo(() => {
    const base = [...players]
    if (attendanceSort === 'frequency') {
      return base.sort((a, b) => {
        const cA = stats.get(a.id)?.last3Months.attended ?? 0
        const cB = stats.get(b.id)?.last3Months.attended ?? 0
        if (cA !== cB) return cB - cA
        return a.name.localeCompare(b.name)
      })
    }
    if (attendanceSort === 'decided') {
      return base.sort((a, b) => {
        const aDec = decidedIds.has(a.id)
        const bDec = decidedIds.has(b.id)
        if (aDec !== bDec) return aDec ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    }
    return base.sort((a, b) => a.name.localeCompare(b.name))
  }, [players, stats, attendanceSort, decidedIds])

  const loadPlanFor = async (trainingId: number) => {
    try {
      const result = await api.getTrainingPlansByTrainingIds([trainingId])
      const plan = result[String(trainingId)] ?? result[trainingId as unknown as string]
      if (plan) {
        setPlanContent(plan.content)
        setPlanId(plan.id)
      } else {
        setPlanContent(null)
        setPlanId(null)
      }
    } catch {
      setPlanContent(null)
      setPlanId(null)
    }
  }

  useEffect(() => {
    if (!currentTraining) {
      setPlanContent(null)
      setPlanId(null)
      return
    }
    let cancelled = false
    api.getTrainingPlansByTrainingIds([currentTraining.id])
      .then(result => {
        if (cancelled) return
        const plan = result[String(currentTraining.id)] ?? result[currentTraining.id as unknown as string]
        if (plan) {
          setPlanContent(plan.content)
          setPlanId(plan.id)
        } else {
          setPlanContent(null)
          setPlanId(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlanContent(null)
          setPlanId(null)
        }
      })
    return () => { cancelled = true }
  }, [currentTraining])

  const avgPresent = useMemo(() => {
    if (totalTrainings === 0) return 0
    let sum = 0
    for (const t of trainings) {
      if (t.cancelled) continue
      const map = attendance.get(t.id) ?? new Map<number, boolean>()
      const presentCount = [...map.values()].filter(v => v === true).length
      sum += presentCount
    }
    return sum / totalTrainings
  }, [attendance, trainings, totalTrainings])

  const { avgRecent, recentCount } = useMemo(() => {
    const refDate = currentTraining?.date ?? new Date().toISOString().slice(0, 10)
    const past = trainings
      .filter(t => !t.cancelled && t.id !== currentTraining?.id && t.date < refDate)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
    if (past.length === 0) return { avgRecent: null as number | null, recentCount: 0 }
    let sum = 0
    for (const t of past) {
      const map = attendance.get(t.id) ?? new Map<number, boolean>()
      sum += [...map.values()].filter(v => v === true).length
    }
    return { avgRecent: sum / past.length, recentCount: past.length }
  }, [trainings, attendance, currentTraining])

  const handleToggle = (playerId: number) => {
    if (!currentTraining) return
    try {
      toggleAttendance(currentTraining.id, playerId)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleGenerate = async (data: { playerCount: number; focus: string; durationMinutes: number; infieldPositions?: InfieldPosition[]; withBeginnerGroup?: boolean; beginnerCount?: number; beginnerFocus?: string }) => {
    if (!currentTraining) return
    try {
      if (planId != null) {
        await api.deleteTrainingPlan(planId)
      }
      const plan = await api.generateTrainingPlan({ ...data, trainingId: currentTraining.id })
      setPlanContent(plan.content)
      setPlanId(plan.id)
      toast.success('Trainingsplan generiert')
    } catch (e) {
      toast.error((e as Error).message)
      if (currentTraining) await loadPlanFor(currentTraining.id)
    }
  }

  const handleDelete = async () => {
    if (planId == null) return
    try {
      await api.deleteTrainingPlan(planId)
      setPlanContent(null)
      setPlanId(null)
      toast.success('Trainingsplan gelöscht')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeleteConfirmOpen(false)
    }
  }

  if (!currentTraining) {
    return (
      <div className="min-h-screen bg-cream-50 p-4">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 space-y-4">
          <h1 className="font-display text-2xl font-extrabold text-navy-900 uppercase tracking-wide">
            Training
          </h1>
          <p className="text-navy-700">Kein Training verfügbar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-extrabold text-navy-900 uppercase tracking-wide">
            Training
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-sm font-semibold text-navy-800 bg-white border border-cream-300 hover:bg-cream-50 hover:border-navy-400 rounded-lg px-3 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-sm"
              aria-label="Training wechseln (vergangene + anstehende)"
              title="Anderes Training wählen — vergangene anklicken zum Nachpflegen"
            >
              <Calendar size={14} className="text-softball-red-600" />
              {new Date(currentTraining.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              <ChevronDown size={14} className="text-navy-400" />
            </button>
            {!currentTraining.cancelled && (
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(true)}
                aria-label="Training absagen"
                title="Training absagen"
                className="p-1.5 rounded-lg bg-white border border-cream-300 hover:border-softball-red-400 hover:bg-softball-red-50 text-navy-600 hover:text-softball-red-700 cursor-pointer"
              >
                <Ban size={14} />
              </button>
            )}
            {currentTraining.cancelled && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-softball-red-100 text-softball-red-700">
                Abgesagt
              </span>
            )}
          </div>
        </div>

        <AttendanceCounter
          present={presentIds.size}
          avgRecent={avgRecent}
          recentCount={recentCount}
          onStatsClick={() => setStatsOpen(true)}
        />

        {/* Mobile-Tab-Bar (< lg) */}
        <div className="lg:hidden inline-flex bg-cream-200 rounded-lg p-0.5 w-full" role="tablist">
          <button
            role="tab"
            aria-selected={mobileTab === 'anwesenheit'}
            onClick={() => setMobileTab('anwesenheit')}
            className={`flex-1 px-3 py-2 text-sm rounded-md font-bold uppercase tracking-wide cursor-pointer transition-colors ${mobileTab === 'anwesenheit' ? 'bg-navy-800 text-white' : 'text-navy-700'}`}
          >
            Anwesenheit
          </button>
          <button
            role="tab"
            aria-selected={mobileTab === 'plan'}
            onClick={() => setMobileTab('plan')}
            className={`flex-1 px-3 py-2 text-sm rounded-md font-bold uppercase tracking-wide cursor-pointer transition-colors ${mobileTab === 'plan' ? 'bg-navy-800 text-white' : 'text-navy-700'}`}
          >
            Plan
          </button>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-4">
          <section className={mobileTab === 'anwesenheit' ? '' : 'hidden lg:block'}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-sm font-bold text-navy-700 uppercase tracking-wide hidden lg:block">Anwesenheit</h2>
              <div className="ml-auto inline-flex bg-cream-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setAttendanceSort('decided')}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer transition-colors ${attendanceSort === 'decided' ? 'bg-navy-700 text-white' : 'text-navy-700'}`}
                  title="Bereits abgestimmte Spieler zuerst"
                >
                  ✓ Abgestimmt
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceSort('frequency')}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer transition-colors ${attendanceSort === 'frequency' ? 'bg-navy-700 text-white' : 'text-navy-700'}`}
                  title="Häufigkeit (letzte 3 Monate)"
                >
                  Häufig ↓
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceSort('alpha')}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer transition-colors ${attendanceSort === 'alpha' ? 'bg-navy-700 text-white' : 'text-navy-700'}`}
                >
                  A–Z
                </button>
              </div>
            </div>
            <AttendanceList
              players={sortedPlayers}
              presentIds={presentIds}
              onToggle={handleToggle}
              stats={stats}
            />
          </section>

          <section className={`${mobileTab === 'plan' ? '' : 'hidden lg:block'} mt-4 lg:mt-0`}>
            <TrainingPlanView
              planContent={planContent}
              drills={drills}
              onEdit={() => setPlanEditOpen(true)}
              onRegenerate={() => setGenerateOpen(true)}
              onDelete={() => setDeleteConfirmOpen(true)}
              onShare={() => setShareOpen(true)}
            />
          </section>
        </div>

        <StatsDrawer
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
          players={players}
          stats={stats}
          avgPresent={avgPresent}
          totalTrainings={totalTrainings}
          trainings={trainings}
          attendance={attendance}
        />

        <PlanEditDrawer
          open={planEditOpen}
          onClose={() => setPlanEditOpen(false)}
          planContent={planContent}
          planId={planId}
          onSave={async (content) => {
            if (planId == null) return
            await api.updateTrainingPlan(planId, content)
            setPlanContent(content)
            toast.success('Plan gespeichert')
          }}
        />

        <GeneratePlanDrawer
          open={generateOpen}
          onClose={() => setGenerateOpen(false)}
          defaultPlayerCount={presentIds.size > 0 ? presentIds.size : Math.max(players.length, 10)}
          trainingDate={currentTraining?.date ?? null}
          onGenerate={handleGenerate}
        />

        <SharePlanDrawer
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          planContent={planContent}
          trainingDate={currentTraining?.date ?? null}
        />

        <TrainingPickerDrawer
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          trainings={trainings}
          selectedId={currentTrainingId}
          onSelect={setSelectedTrainingId}
        />

        {deleteConfirmOpen && (
          <ConfirmModal
            title="Trainingsplan löschen?"
            message="Der aktuelle Plan wird unwiderruflich entfernt."
            confirmLabel="Löschen"
            cancelLabel="Abbrechen"
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirmOpen(false)}
          />
        )}

        {cancelConfirmOpen && currentTraining && (
          <ConfirmModal
            title="Training absagen?"
            message={`Training am ${new Date(currentTraining.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} wird als abgesagt markiert.`}
            confirmLabel="Absagen"
            cancelLabel="Zurück"
            onConfirm={async () => {
              try {
                await cancelTraining(currentTraining.id)
                toast.success('Training abgesagt')
              } catch (e) {
                toast.error((e as Error).message)
              } finally {
                setCancelConfirmOpen(false)
              }
            }}
            onCancel={() => setCancelConfirmOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
