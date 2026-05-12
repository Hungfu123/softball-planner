import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { BarChart3, ChevronDown } from 'lucide-react'
import { useTraining } from '@/hooks/useTraining'
import { usePlayers } from '@/hooks/usePlayers'
import { computeAttendanceStats, type PlayerAttendanceStats } from '@/hooks/useAttendanceStats'
import * as api from '@/api/client'
import type { TrainingPlanContentResponse, DrillResponse } from '@/types'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { AttendanceList } from './AttendanceList'
import { AttendanceCounter } from './AttendanceCounter'
import { StatsDrawer } from './StatsDrawer'
import { PlanEditDrawer } from './PlanEditDrawer'
import { TrainingPlanView } from './TrainingPlanView'
import { TrainingPickerDrawer } from './TrainingPickerDrawer'
import { GeneratePlanDrawer } from './GeneratePlanDrawer'

type MobileTab = 'anwesenheit' | 'plan'

export function TrainingTodayPage() {
  const { trainings, attendance, toggleAttendance } = useTraining()
  const { players } = usePlayers()
  const [statsOpen, setStatsOpen] = useState(false)
  const [planEditOpen, setPlanEditOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [planContent, setPlanContent] = useState<TrainingPlanContentResponse | null>(null)
  const [planId, setPlanId] = useState<number | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('anwesenheit')
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

  const handleToggle = (playerId: number) => {
    if (!currentTraining) return
    const wasPresent = presentIds.has(playerId)
    const player = players.find(p => p.id === playerId)
    try {
      toggleAttendance(currentTraining.id, playerId)
      toast.success(`${player?.name ?? 'Spieler'} ${!wasPresent ? 'anwesend' : 'abwesend'}`, {
        action: { label: 'Rückgängig', onClick: () => toggleAttendance(currentTraining.id, playerId) },
      })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleGenerate = async (data: { playerCount: number; focus: string; durationMinutes: number }) => {
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
      // Re-load to recover if delete succeeded but generate failed
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
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-sm text-navy-700 hover:text-navy-900 flex items-center gap-1 cursor-pointer"
            aria-label="Training wechseln"
          >
            {new Date(currentTraining.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <AttendanceCounter present={presentIds.size} total={players.length} />
          </div>
          <button
            onClick={() => setStatsOpen(true)}
            className="bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold px-4 py-3 rounded-xl flex items-center gap-2 self-stretch cursor-pointer"
            aria-label="Statistik anzeigen"
          >
            <BarChart3 size={18} />
            <span className="hidden sm:inline">Statistik</span>
          </button>
        </div>

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
            <h2 className="font-display text-sm font-bold text-navy-700 uppercase tracking-wide mb-2 hidden lg:block">Anwesenheit</h2>
            <AttendanceList
              players={players}
              presentIds={presentIds}
              onToggle={handleToggle}
            />
          </section>

          <section className={`${mobileTab === 'plan' ? '' : 'hidden lg:block'} mt-4 lg:mt-0`}>
            <TrainingPlanView
              planContent={planContent}
              drills={drills}
              onEdit={() => setPlanEditOpen(true)}
              onRegenerate={() => setGenerateOpen(true)}
              onDelete={() => setDeleteConfirmOpen(true)}
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
          onGenerate={handleGenerate}
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
      </div>
    </div>
  )
}
