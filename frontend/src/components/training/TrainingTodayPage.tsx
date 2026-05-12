import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { BarChart3 } from 'lucide-react'
import { useTraining } from '@/hooks/useTraining'
import { usePlayers } from '@/hooks/usePlayers'
import { computeAttendanceStats, type PlayerAttendanceStats } from '@/hooks/useAttendanceStats'
import * as api from '@/api/client'
import type { TrainingPlanContentResponse } from '@/types'
import { AttendanceList } from './AttendanceList'
import { AttendanceCounter } from './AttendanceCounter'
import { StatsDrawer } from './StatsDrawer'
import { PlanEditDrawer } from './PlanEditDrawer'

type SortBy = 'quote' | 'alpha'

export function TrainingTodayPage() {
  const { trainings, attendance, toggleAttendance } = useTraining()
  const { players } = usePlayers()
  const [sortBy, setSortBy] = useState<SortBy>('quote')
  const [statsOpen, setStatsOpen] = useState(false)
  const [planEditOpen, setPlanEditOpen] = useState(false)
  const [planContent, setPlanContent] = useState<TrainingPlanContentResponse | null>(null)
  const [planId, setPlanId] = useState<number | null>(null)

  const todayTraining = useMemo(() => {
    const now = new Date()
    const active = trainings.filter(t => !t.cancelled).slice().sort((a, b) => a.date.localeCompare(b.date))
    const upcoming = active.find(t => new Date(t.date) >= now)
    return upcoming ?? active[active.length - 1] ?? null
  }, [trainings])

  const presentIds = useMemo(() => {
    if (!todayTraining) return new Set<number>()
    const map = attendance.get(todayTraining.id) ?? new Map<number, boolean>()
    return new Set([...map.entries()].filter(([, p]) => p).map(([id]) => id))
  }, [attendance, todayTraining])

  const stats = useMemo(() => {
    const m = new Map<number, PlayerAttendanceStats>()
    for (const p of players) {
      m.set(p.id, computeAttendanceStats({ trainings, attendance, playerId: p.id }))
    }
    return m
  }, [players, trainings, attendance])

  const totalTrainings = useMemo(() => trainings.filter(t => !t.cancelled).length, [trainings])

  // Load existing plan for today's training (if any)
  useEffect(() => {
    if (!todayTraining) {
      setPlanContent(null)
      setPlanId(null)
      return
    }
    let cancelled = false
    api.getTrainingPlansByTrainingIds([todayTraining.id])
      .then(result => {
        if (cancelled) return
        const plan = result[String(todayTraining.id)] ?? result[todayTraining.id as unknown as string]
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
  }, [todayTraining])

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
    if (!todayTraining) return
    const wasPresent = presentIds.has(playerId)
    const player = players.find(p => p.id === playerId)
    try {
      toggleAttendance(todayTraining.id, playerId)
      toast.success(`${player?.name ?? 'Spieler'} ${!wasPresent ? 'anwesend' : 'abwesend'}`, {
        action: { label: 'Rückgängig', onClick: () => toggleAttendance(todayTraining.id, playerId) },
      })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (!todayTraining) {
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
          <span className="text-sm text-navy-600">
            {new Date(todayTraining.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
          </span>
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

        <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-sm font-bold text-navy-700 uppercase tracking-wide">Anwesenheit</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setSortBy('quote')}
                  className={`px-2 py-1 text-xs rounded-md font-semibold cursor-pointer ${sortBy === 'quote' ? 'bg-navy-700 text-white' : 'bg-cream-200 text-navy-700'}`}
                >
                  Quote ↓
                </button>
                <button
                  onClick={() => setSortBy('alpha')}
                  className={`px-2 py-1 text-xs rounded-md font-semibold cursor-pointer ${sortBy === 'alpha' ? 'bg-navy-700 text-white' : 'bg-cream-200 text-navy-700'}`}
                >
                  A-Z
                </button>
              </div>
            </div>
            <AttendanceList
              players={players}
              stats={stats}
              presentIds={presentIds}
              onToggle={handleToggle}
              sortBy={sortBy}
            />
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-sm font-bold text-navy-700 uppercase tracking-wide">Trainingsplan</h2>
              <button
                onClick={() => setPlanEditOpen(true)}
                className="text-xs font-semibold text-softball-red-700 hover:underline cursor-pointer"
              >
                ✎ Bearbeiten
              </button>
            </div>
            <div className="bg-white border border-cream-300 rounded-2xl p-4 text-sm text-navy-700">
              {planContent ? (
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(planContent, null, 2)}</pre>
              ) : (
                <p className="opacity-70 italic">Noch kein Plan für dieses Training.</p>
              )}
            </div>
          </section>
        </div>

        <StatsDrawer
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
          players={players}
          stats={stats}
          avgPresent={avgPresent}
          totalTrainings={totalTrainings}
        />

        <PlanEditDrawer
          open={planEditOpen}
          onClose={() => setPlanEditOpen(false)}
          planContent={planContent}
          onSave={async (content) => {
            if (planId == null) return
            await api.updateTrainingPlan(planId, content)
            setPlanContent(content)
          }}
        />
      </div>
    </div>
  )
}
