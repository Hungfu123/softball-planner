import { useState, useMemo, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Calendar, Ban, Droplets } from 'lucide-react'
import { weatherIcon } from '@/components/dashboard/weatherIcon'
import { WeatherDayBreakdown } from '@/components/dashboard/WeatherDayBreakdown'
import { DetailSheet } from '@/components/dashboard/DashboardSheets'
import { useTraining } from '@/hooks/useTraining'
import { usePlayers } from '@/hooks/usePlayers'
import { computeAttendanceStats, type PlayerAttendanceStats } from '@/hooks/useAttendanceStats'
import { pickDefaultTrainingId } from '@/utils/defaultTraining'
import * as api from '@/api/client'
import type { DrillResponse, InfieldPosition, PlanKind, TrainingPlanResponse, UnknownVoter, WeatherResponse } from '@/types'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { Badge } from '@/components/shared/Badge'
import { DotsVertical, RefreshIcon, ClipboardListIcon } from '@/icons'
import { AttendanceList } from './AttendanceList'
import { AttendanceCounter } from './AttendanceCounter'
import { StatsDrawer } from './StatsDrawer'
import { PlanEditDrawer } from './PlanEditDrawer'
import { TrainingPlanView } from './TrainingPlanView'
import { TrainingPlanSkeleton } from './TrainingPlanSkeleton'
import { TrainingPickerDrawer } from './TrainingPickerDrawer'
import { GeneratePlanDrawer } from './GeneratePlanDrawer'
import { SharePlanDrawer } from './SharePlanDrawer'
import { AddBeginnerGroupDrawer } from './AddBeginnerGroupDrawer'
import { PeriodManagerDrawer } from './PeriodManagerDrawer'

type MobileTab = 'anwesenheit' | 'plan'
type AttendanceSort = 'alpha' | 'frequency' | 'decided'

export function TrainingTodayPage() {
  const { trainings, attendance, toggleAttendance, cancelTraining, loading: trainingsLoading,
    periods, activePeriodId, selectPeriod, createBulk, updatePeriod, deletePeriod, loadAll } = useTraining()
  const { players } = usePlayers()
  const [statsOpen, setStatsOpen] = useState(false)
  const [planEditOpen, setPlanEditOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [addBeginnerOpen, setAddBeginnerOpen] = useState(false)
  const [periodManagerOpen, setPeriodManagerOpen] = useState(false)
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false)
  const [testSyncing, setTestSyncing] = useState(false)
  const [plans, setPlans] = useState<TrainingPlanResponse[]>([])
  const [planLoading, setPlanLoading] = useState(true)
  const [activePlanKind, setActivePlanKind] = useState<PlanKind>('MAIN')
  const [generateKind, setGenerateKind] = useState<PlanKind>('MAIN')
  const [mobileTab, setMobileTab] = useState<MobileTab>('anwesenheit')
  const [attendanceSort, setAttendanceSort] = useState<AttendanceSort>('frequency')
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null)
  const [drills, setDrills] = useState<DrillResponse[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    api.getDrills()
      .then(d => { if (!cancelled) setDrills(d) })
      .catch(() => { if (!cancelled) setDrills([]) })
    return () => { cancelled = true }
  }, [])

  // Unbekannte WhatsApp-Wähler — laden (initial + nach Test-Sync), pro Training gruppieren (Badge-Count)
  const [unknownVoters, setUnknownVoters] = useState<UnknownVoter[]>([])
  const refreshUnknownVoters = useCallback(async () => {
    try {
      const v = await api.getUnknownVoters()
      setUnknownVoters(v)
    } catch {
      setUnknownVoters([])
    }
  }, [])
  useEffect(() => {
    refreshUnknownVoters()
  }, [refreshUnknownVoters])

  const unknownVoterCounts = useMemo(() => {
    const map = new Map<number, number>()
    for (const v of unknownVoters) {
      map.set(v.trainingId, (map.get(v.trainingId) ?? 0) + 1)
    }
    return map
  }, [unknownVoters])

  const defaultTrainingId = useMemo(
    () => pickDefaultTrainingId(trainings, new Date().toISOString().slice(0, 10)),
    [trainings],
  )

  const currentTrainingId = selectedTrainingId ?? defaultTrainingId
  const currentTraining = useMemo(
    () => trainings.find(t => t.id === currentTrainingId) ?? null,
    [trainings, currentTrainingId],
  )

  // Wetter zum gewählten Training (Forecast nur für nahe Termine verfügbar)
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [weatherOpen, setWeatherOpen] = useState(false)
  useEffect(() => {
    if (!currentTraining || currentTraining.cancelled) { setWeather(null); return }
    let stale = false
    api.getTrainingWeather(currentTraining.id)
      .then(w => { if (!stale) setWeather(w) })
      .catch(() => { if (!stale) setWeather(null) })
    return () => { stale = true }
  }, [currentTraining?.id, currentTraining?.cancelled])

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

  const activePlan = useMemo(
    () => plans.find(p => p.kind === activePlanKind) ?? plans[0] ?? null,
    [plans, activePlanKind],
  )

  const loadPlanFor = async (trainingId: number) => {
    setPlanLoading(true)
    try {
      const result = await api.getTrainingPlansByTrainingId(trainingId)
      setPlans(result)
    } catch {
      setPlans([])
    } finally {
      setPlanLoading(false)
    }
  }

  useEffect(() => {
    if (!currentTraining) {
      setPlans([])
      setPlanLoading(false)
      return
    }
    let cancelled = false
    setPlanLoading(true)
    api.getTrainingPlansByTrainingId(currentTraining.id)
      .then(result => {
        if (cancelled) return
        setPlans(result)
      })
      .catch(() => {
        if (!cancelled) setPlans([])
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false)
      })
    return () => { cancelled = true }
  }, [currentTraining])

  // Keep activePlanKind in sync — if MAIN doesn't exist but BEGINNER does, switch to BEGINNER
  useEffect(() => {
    if (plans.length === 0) {
      setActivePlanKind('MAIN')
      return
    }
    if (!plans.some(p => p.kind === activePlanKind)) {
      setActivePlanKind(plans[0].kind)
    }
  }, [plans, activePlanKind])

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

  const handleTestSync = async () => {
    setTestSyncing(true)
    try {
      const result = await api.syncWhatsappVotes()
      toast.success(`${result.synced} Stimmen gesynct`)
      // Anwesenheit + unbekannte Wähler neu laden, damit gebuchte/zurückgenommene Haken
      // sofort sichtbar sind (kein manuelles Reload nötig).
      await Promise.all([refreshUnknownVoters(), loadAll(activePeriodId)])
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTestSyncing(false)
    }
  }

  const handleGenerate = async (data: { playerCount: number; focus: string; durationMinutes: number; infieldPositions?: InfieldPosition[]; withBeginnerGroup?: boolean; beginnerCount?: number; beginnerFocus?: string; kind?: PlanKind }) => {
    if (!currentTraining) return
    const kind: PlanKind = data.kind ?? 'MAIN'
    try {
      // If a plan of this kind already exists, replace it (delete first)
      const existing = plans.find(p => p.kind === kind)
      if (existing) {
        await api.deleteTrainingPlan(existing.id)
      }
      const plan = await api.generateTrainingPlan({ ...data, kind, trainingId: currentTraining.id })
      setPlans(prev => {
        const filtered = prev.filter(p => p.kind !== plan.kind)
        return [...filtered, plan]
      })
      setActivePlanKind(plan.kind)
      toast.success(plan.kind === 'BEGINNER' ? 'Anfänger-Plan generiert' : 'Trainingsplan generiert')
    } catch (e) {
      toast.error((e as Error).message)
      if (currentTraining) await loadPlanFor(currentTraining.id)
    }
  }

  const handleAddBeginnerGroup = async (data: { beginnerCount: number; beginnerFocus?: string }) => {
    if (!activePlan) return
    try {
      const plan = await api.addBeginnerGroup(activePlan.id, data.beginnerCount, data.beginnerFocus)
      setPlans(prev => prev.map(p => p.id === plan.id ? plan : p))
      toast.success('Anfänger-Gruppe hinzugefügt')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleDelete = async () => {
    if (!activePlan) return
    const deletedKind = activePlan.kind
    try {
      await api.deleteTrainingPlan(activePlan.id)
      setPlans(prev => prev.filter(p => p.id !== activePlan.id))
      toast.success(deletedKind === 'BEGINNER' ? 'Anfänger-Plan gelöscht' : 'Trainingsplan gelöscht')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeleteConfirmOpen(false)
    }
  }

  const handleGenerateBeginner = () => {
    setGenerateKind('BEGINNER')
    setGenerateOpen(true)
  }

  const handleGenerateMain = () => {
    setGenerateKind('MAIN')
    setGenerateOpen(true)
  }

  const handleOpenRegenerate = () => {
    setGenerateKind(activePlan?.kind ?? 'MAIN')
    setGenerateOpen(true)
  }

  const hasExistingPlanForGenerateKind = plans.some(p => p.kind === generateKind)

  if (trainingsLoading || !currentTraining) {
    return (
      <div className="min-h-screen bg-cream-50 p-4">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 space-y-4">
          <h1 className="font-display text-2xl font-extrabold text-navy-900 uppercase tracking-wide">
            Training
          </h1>
          {trainingsLoading ? (
            <TrainingPlanSkeleton />
          ) : (
            <p className="text-navy-700">Kein Training verfügbar.</p>
          )}
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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {weather && (
              <button
                type="button"
                onClick={() => setWeatherOpen(true)}
                className="inline-flex items-center gap-1.5 bg-white border border-cream-300 hover:border-navy-400 hover:bg-cream-50 rounded-lg px-2.5 py-1.5 shadow-sm cursor-pointer"
                title="Wetter — Tagesablauf anzeigen"
              >
                {weatherIcon(weather.wmoCode, 16, 'text-navy-800')}
                <span className="font-display text-sm font-extrabold text-navy-900 tabular-nums">
                  {weather.tempMin}–{weather.tempMax}°
                </span>
                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                  weather.precipitationProbabilityPct >= 50 ? 'text-softball-red-600' : 'text-navy-500'
                }`}>
                  <Droplets size={12} className="shrink-0" />{weather.precipitationProbabilityPct}%
                </span>
              </button>
            )}
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
            {(unknownVoterCounts.get(currentTraining.id) ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => navigate('/players?tab=whatsapp')}
                title="Unbekannte WhatsApp-Wähler zuordnen"
                className="cursor-pointer"
              >
                <Badge color="red" size="sm">⚠️ {unknownVoterCounts.get(currentTraining.id)} unbekannte Wähler</Badge>
              </button>
            )}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setToolbarMenuOpen(o => !o)}
                aria-label="Weitere Aktionen"
                aria-haspopup="menu"
                aria-expanded={toolbarMenuOpen}
                title="Weitere Aktionen"
                className="p-1.5 rounded-lg bg-white border border-cream-300 hover:border-navy-400 hover:bg-cream-50 text-navy-600 hover:text-navy-900 cursor-pointer"
              >
                <DotsVertical size={16} />
              </button>
              {toolbarMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setToolbarMenuOpen(false)} />
                  <div role="menu" className="absolute right-0 top-9 z-50 w-56 rounded-xl border border-cream-300 bg-white shadow-lg py-1">
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => { setToolbarMenuOpen(false); setPeriodManagerOpen(true) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-navy-800 hover:bg-navy-50 cursor-pointer"
                    >
                      <ClipboardListIcon size={15} /> Perioden verwalten
                    </button>
                    {!currentTraining.cancelled && (
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => { setToolbarMenuOpen(false); setCancelConfirmOpen(true) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-softball-red-600 hover:bg-softball-red-50 cursor-pointer"
                      >
                        <Ban size={15} /> Training absagen
                      </button>
                    )}
                    <div className="my-1 border-t border-cream-200" />
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => { setToolbarMenuOpen(false); handleTestSync() }}
                      disabled={testSyncing}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-navy-500 hover:bg-navy-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RefreshIcon size={15} className={testSyncing ? 'animate-spin' : ''} /> Sync testen
                    </button>
                  </div>
                </>
              )}
            </div>
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
              plans={plans}
              loading={planLoading}
              activePlanKind={activePlanKind}
              onSwitchKind={setActivePlanKind}
              drills={drills}
              playerCount={presentIds.size}
              onEdit={() => setPlanEditOpen(true)}
              onSaveStations={async (nextStations) => {
                if (!activePlan?.content) return
                const updated = await api.updateTrainingPlan(activePlan.id, { ...activePlan.content, stations: nextStations })
                setPlans(prev => prev.map(p => p.id === activePlan.id ? updated : p))
                toast.success('Stationen gespeichert')
              }}
              onRegenerate={handleOpenRegenerate}
              onDelete={() => setDeleteConfirmOpen(true)}
              onShare={() => setShareOpen(true)}
              onAddBeginnerGroup={activePlan != null ? () => setAddBeginnerOpen(true) : undefined}
              onGenerateBeginnerPlan={handleGenerateBeginner}
              onGenerateMain={handleGenerateMain}
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
          planContent={activePlan?.content ?? null}
          planId={activePlan?.id ?? null}
          onSave={async (content) => {
            if (!activePlan) return
            const updated = await api.updateTrainingPlan(activePlan.id, content)
            setPlans(prev => prev.map(p => p.id === activePlan.id ? updated : p))
            toast.success('Plan gespeichert')
          }}
        />

        <GeneratePlanDrawer
          open={generateOpen}
          onClose={() => setGenerateOpen(false)}
          defaultPlayerCount={presentIds.size > 0 ? presentIds.size : Math.max(players.length, 10)}
          trainingDate={currentTraining?.date ?? null}
          initialKind={generateKind}
          hasExistingPlan={hasExistingPlanForGenerateKind}
          onGenerate={handleGenerate}
        />

        <SharePlanDrawer
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          planContent={activePlan?.content ?? null}
          trainingDate={currentTraining?.date ?? null}
          planKind={activePlan?.kind ?? 'MAIN'}
        />

        <AddBeginnerGroupDrawer
          open={addBeginnerOpen}
          onClose={() => setAddBeginnerOpen(false)}
          onSubmit={handleAddBeginnerGroup}
        />

        <TrainingPickerDrawer
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          trainings={trainings}
          selectedId={currentTrainingId}
          onSelect={setSelectedTrainingId}
          unknownVoterCounts={unknownVoterCounts}
        />

        <PeriodManagerDrawer
          open={periodManagerOpen}
          onClose={() => setPeriodManagerOpen(false)}
          periods={periods}
          activePeriodId={activePeriodId}
          onSelect={selectPeriod}
          onCreate={createBulk}
          onUpdate={updatePeriod}
          onDelete={deletePeriod}
        />

        <DetailSheet open={weatherOpen} onClose={() => setWeatherOpen(false)} title="Wetter · Tagesablauf">
          <WeatherDayBreakdown hours={weather?.hours ?? []} location={currentTraining.location || 'Düsseldorf'} />
        </DetailSheet>

        {deleteConfirmOpen && (
          <ConfirmModal
            title={activePlan?.kind === 'BEGINNER' ? 'Anfänger-Plan löschen?' : 'Trainingsplan löschen?'}
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
