import { useState, useEffect, useRef } from 'react'
import { useTrainingPlan } from '@/hooks/useTrainingPlan'
import PeriodSelector from '@/components/shared/PeriodSelector'
import PlanForm from './PlanForm'
import PlanDisplay from './PlanDisplay'
import PlanEditor from './PlanEditor'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import type { GeneratePlanRequest, TrainingPlanContentResponse } from '@/types'
import { CrossBones, Pencil, TrashBin } from '@/icons'

export default function TrainingPlanPage() {
  const {
    trainings, periods, activePeriodId, plans, drills,
    loading, generating,
    selectPeriod, generate, update, deletePlan,
  } = useTrainingPlan()

  const [formTrainingId, setFormTrainingId] = useState<number | null>(null)
  const [viewTrainingId, setViewTrainingId] = useState<number | null>(null)
  const [editTrainingId, setEditTrainingId] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ planId: number; trainingId: number } | null>(null)
  const [showPast, setShowPast] = useState(false)
  const todayRef = useRef<HTMLDivElement>(null)
  const scrolledRef = useRef(false)

  // Auto-scroll zum nächsten Training ab heute
  useEffect(() => {
    if (!loading && trainings.length > 0 && !scrolledRef.current) {
      scrolledRef.current = true
      setTimeout(() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    }
  }, [loading, trainings])

  const handleGenerate = async (data: GeneratePlanRequest) => {
    const plan = await generate(data)
    if (plan) {
      setFormTrainingId(null)
      setViewTrainingId(data.trainingId)
    }
  }

  const handleDelete = async (planId: number, trainingId: number) => {
    await deletePlan(planId, trainingId)
    setViewTrainingId(null)
    setDeleteConfirm(null)
  }

  const handleSave = async (trainingId: number, planId: number, content: TrainingPlanContentResponse) => {
    await update(planId, trainingId, content)
    setEditTrainingId(null)
    setViewTrainingId(trainingId)
  }

  // View: Plan bearbeiten
  if (editTrainingId !== null) {
    const plan = plans.get(editTrainingId)
    if (!plan) {
      setEditTrainingId(null)
      return null
    }
    const training = trainings.find(t => t.id === editTrainingId)
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => { setEditTrainingId(null); setViewTrainingId(editTrainingId) }}
          className="text-sm text-gray-500 hover:text-navy-600 mb-4 cursor-pointer"
        >
          ← Zurück zum Plan
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Plan bearbeiten — {training ? formatDate(training.date) : ''}
        </h2>
        <PlanEditor
          plan={plan}
          drills={drills}
          onSave={content => handleSave(editTrainingId, plan.id, content)}
          onCancel={() => { setEditTrainingId(null); setViewTrainingId(editTrainingId) }}
        />
      </div>
    )
  }

  // View: Plan anzeigen
  if (viewTrainingId !== null) {
    const plan = plans.get(viewTrainingId)
    if (!plan) {
      setViewTrainingId(null)
      return null
    }
    const training = trainings.find(t => t.id === viewTrainingId)
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button
          onClick={() => setViewTrainingId(null)}
          className="text-sm text-gray-500 hover:text-navy-600 mb-4 cursor-pointer"
        >
          ← Zurück zur Übersicht
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Trainingsplan — {training ? formatDate(training.date) : ''}
        </h2>
        <PlanDisplay
          plan={plan}
          drills={drills}
          trainingDate={training?.date ?? ''}
          onEdit={() => { setViewTrainingId(null); setEditTrainingId(viewTrainingId) }}
          onDelete={() => setDeleteConfirm({ planId: plan.id, trainingId: viewTrainingId })}
        />
        {deleteConfirm && (
          <ConfirmModal
            title="Plan löschen"
            message="Möchtest du diesen Trainingsplan wirklich löschen? Das kann nicht rückgängig gemacht werden."
            confirmLabel="Löschen"
            onConfirm={() => handleDelete(deleteConfirm.planId, deleteConfirm.trainingId)}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}
      </div>
    )
  }

  // View: Plan erstellen
  if (formTrainingId !== null) {
    const training = trainings.find(t => t.id === formTrainingId)
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => setFormTrainingId(null)}
          className="text-sm text-gray-500 hover:text-navy-600 mb-4 cursor-pointer"
        >
          ← Zurück zur Übersicht
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Trainingsplan erstellen — {training ? formatDate(training.date) : ''}
        </h2>
        <PlanForm
          trainingId={formTrainingId}
          training={training}
          generating={generating}
          onGenerate={handleGenerate}
          onCancel={() => setFormTrainingId(null)}
        />
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-navy-800 rounded-full animate-[shimmer_1s_ease-in-out_infinite]" />
        </div>
        <p className="text-sm text-gray-400">Laden…</p>
      </div>
    )
  }

  // Split trainings into: next, upcoming, past
  const today = new Date().toISOString().split('T')[0]
  const upcoming = trainings.filter(t => t.date >= today && !t.cancelled)
  const past = trainings.filter(t => t.date < today || t.cancelled)
  const nextTraining = upcoming[0] ?? null
  const restUpcoming = upcoming.slice(1, 6) // nächste 5

  // Overview
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-softball-red-600 rounded-full" />
          <h1 className="text-2xl font-bold text-gray-950">Trainingsplan</h1>
        </div>
        {periods.length > 1 && (
          <div className="flex gap-1.5 mt-2 ml-4">
            {periods.map(p => (
              <button
                key={p.id}
                onClick={() => selectPeriod(p.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                  activePeriodId === p.id
                    ? 'bg-navy-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {trainings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CrossBones size={48} className="mx-auto mb-4 opacity-30" />
          <p>Keine Trainings in diesem Zeitraum</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* === NÄCHSTES TRAINING — groß und prominent === */}
          {nextTraining && (() => {
            const plan = plans.get(nextTraining.id)
            const hasPlan = !!plan
            return (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nächstes Training</h2>
                <div
                  onClick={() => {
                    if (hasPlan) setViewTrainingId(nextTraining.id)
                    else setFormTrainingId(nextTraining.id)
                  }}
                  className="group bg-navy-800 text-white rounded-2xl p-5 cursor-pointer hover:bg-navy-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold">{formatDateLong(nextTraining.date)}</p>
                      {hasPlan && plan && (
                        <div className="mt-2 space-y-1.5">
                          <FocusBadges focus={plan.focus} />
                          <p className="text-sm text-navy-100">
                            {plan.playerCount} Spieler · {plan.durationMinutes} min
                          </p>
                          <p className="text-xs text-navy-100/60">
                            {plan.content?.sections?.length ?? 0} Drills geplant
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {hasPlan ? (
                        <>
                          <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-medium">✓ <span className="font-bold">Plan</span></span>
                          <button
                            onClick={e => { e.stopPropagation(); setEditTrainingId(nextTraining.id) }}
                            className="p-2 hover:bg-white/10 rounded-lg cursor-pointer"
                            title="Bearbeiten"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteConfirm({ planId: plan!.id, trainingId: nextTraining.id }) }}
                            className="p-2 hover:bg-softball-red-500/30 rounded-lg cursor-pointer"
                            title="Löschen"
                          >
                            <TrashBin size={16} />
                          </button>
                        </>
                      ) : (
                        <span className="px-4 py-2 bg-white text-navy-800 rounded-lg text-sm font-medium">
                          Plan erstellen →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* === KOMMENDE TRAININGS — kompakte Liste === */}
          {restUpcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kommende Trainings</h2>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {restUpcoming.map(t => {
                  const plan = plans.get(t.id)
                  const hasPlan = !!plan
                  return (
                    <div
                      key={t.id}
                      onClick={() => hasPlan ? setViewTrainingId(t.id) : setFormTrainingId(t.id)}
                      className="group flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-navy-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${hasPlan ? 'bg-navy-600' : 'bg-gray-300'}`} />
                        <span className="text-sm font-medium text-gray-900">{formatDate(t.date)}</span>
                        {hasPlan && plan && <FocusBadgesLight focus={plan.focus} />}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPlan ? (
                          <>
                            <span className="text-xs text-navy-600">✓ <span className="font-bold">Plan</span></span>
                            <div className="hidden group-hover:flex items-center gap-1">
                              <button
                                onClick={e => { e.stopPropagation(); setEditTrainingId(t.id) }}
                                className="p-1 text-navy-600 hover:bg-navy-50 rounded cursor-pointer"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteConfirm({ planId: plan!.id, trainingId: t.id }) }}
                                className="p-1 text-gray-400 hover:text-softball-red-600 rounded cursor-pointer"
                              >
                                <TrashBin size={14} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-300 group-hover:text-navy-600 transition-colors">Plan erstellen →</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* === VERGANGENE — eingeklappt === */}
          {past.length > 0 && (
            <div>
              <button
                onClick={() => setShowPast(!showPast)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 transition-colors"
              >
                <span className={`transition-transform ${showPast ? 'rotate-90' : ''}`}>▸</span>
                Vergangene Trainings ({past.length})
              </button>
              {showPast && (
                <div className="mt-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {past.map(t => {
                    const plan = plans.get(t.id)
                    const hasPlan = !!plan
                    return (
                      <div
                        key={t.id}
                        onClick={() => hasPlan ? setViewTrainingId(t.id) : undefined}
                        className={`flex items-center justify-between px-4 py-2.5 ${hasPlan ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-1.5 h-1.5 rounded-full ${hasPlan ? 'bg-navy-600' : 'bg-gray-300'}`} />
                          <span className="text-sm text-gray-500">{formatDate(t.date)}</span>
                          {t.cancelled && <span className="text-[10px] text-softball-red-500">Abgesagt</span>}
                          {hasPlan && plan && <FocusBadgesLight focus={plan.focus} />}
                        </div>
                        {hasPlan && <span className="text-[10px] text-gray-400">✓ <span className="font-medium">Plan</span></span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {deleteConfirm && (
        <ConfirmModal
          title="Plan löschen"
          message="Möchtest du diesen Trainingsplan wirklich löschen? Das kann nicht rückgängig gemacht werden."
          confirmLabel="Löschen"
          onConfirm={() => handleDelete(deleteConfirm.planId, deleteConfirm.trainingId)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })
}

const FOCUS_SHORT: Record<string, string> = {
  INFIELD_DEFENSE: 'Infield',
  OUTFIELD: 'Outfield',
  WERFEN: 'Werfen',
  BASERUNNING: 'Running',
  SITUATIONAL: 'Situational',
  CATCHER: 'Catcher',
  RELAY: 'Relay',
  ALLROUND: 'Allround',
}

function FocusBadges({ focus, max = 2 }: { focus: string; max?: number }) {
  const parts = focus.split(',').map(f => f.trim())
  if (parts.length === 1 && parts[0] === 'ALLROUND') {
    return <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-medium">Allround</span>
  }
  const shown = parts.slice(0, max)
  const rest = parts.length - max
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map(f => (
        <span key={f} className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-medium">
          {FOCUS_SHORT[f] ?? f}
        </span>
      ))}
      {rest > 0 && <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/60">+{rest}</span>}
    </span>
  )
}

function FocusBadgesLight({ focus, max = 2 }: { focus: string; max?: number }) {
  const parts = focus.split(',').map(f => f.trim())
  if (parts.length === 1 && parts[0] === 'ALLROUND') {
    return <span className="px-1.5 py-0.5 bg-navy-50 text-navy-600 rounded text-[10px] font-medium">Allround</span>
  }
  const shown = parts.slice(0, max)
  const rest = parts.length - max
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map(f => (
        <span key={f} className="px-1.5 py-0.5 bg-navy-50 text-navy-600 rounded text-[10px] font-medium">
          {FOCUS_SHORT[f] ?? f}
        </span>
      ))}
      {rest > 0 && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">+{rest}</span>}
    </span>
  )
}
