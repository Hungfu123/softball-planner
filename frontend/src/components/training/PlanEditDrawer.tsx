import { useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import { Flame, Target, Coffee, Trophy, Circle } from 'lucide-react'
import type { TrainingPlanContentResponse, TrainingPlanSectionResponse } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  planContent: TrainingPlanContentResponse | null
  onSave: (content: TrainingPlanContentResponse) => Promise<void>
}

function iconFor(sectionType: string | null) {
  const t = (sectionType ?? '').toUpperCase()
  if (t === 'WARMUP') return { Icon: Flame, color: 'text-softball-red-600', label: 'Aufwärmen' }
  if (t === 'DRILL') return { Icon: Target, color: 'text-navy-700', label: 'Drill' }
  if (t === 'BREAK') return { Icon: Coffee, color: 'text-navy-500', label: 'Pause' }
  if (t === 'GAME' || t === 'SCRIMMAGE') return { Icon: Trophy, color: 'text-emerald-700', label: 'Spiel' }
  return { Icon: Circle, color: 'text-navy-500', label: 'Block' }
}

export function PlanEditDrawer({ open, onClose, planContent, onSave }: Props) {
  const [sections, setSections] = useState<TrainingPlanSectionResponse[]>([])
  const [overallNotes, setOverallNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && planContent) {
      setSections(planContent.sections.map(s => ({ ...s })))
      setOverallNotes(planContent.overallNotes ?? '')
    }
  }, [open, planContent])

  const updateSection = (idx: number, patch: Partial<TrainingPlanSectionResponse>) => {
    setSections(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  const handleSave = async () => {
    if (!planContent) return
    setSaving(true)
    try {
      await onSave({
        ...planContent,
        sections,
        overallNotes: overallNotes.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[92vh] h-fit overflow-y-auto focus:outline-none">
          <Drawer.Title className="sr-only">Plan bearbeiten</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
          <div
            className="px-4 py-4 space-y-4 max-w-2xl mx-auto w-full"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <div>
              <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
                Plan bearbeiten
              </h2>
              <p className="text-xs text-navy-600">Titel, Dauer und Notizen pro Block</p>
            </div>

            {!planContent || sections.length === 0 ? (
              <div className="bg-white border border-cream-300 rounded-xl p-4 text-sm text-navy-500 italic">
                Noch kein Plan vorhanden.
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((s, idx) => {
                  const { Icon, color, label } = iconFor(s.sectionType)
                  return (
                    <div key={idx} className="bg-white border border-cream-300 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon size={18} strokeWidth={2.2} className={color} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-navy-500">{label}</span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Titel</label>
                        <input
                          type="text"
                          value={s.title ?? ''}
                          onChange={e => updateSection(idx, { title: e.target.value || null })}
                          className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Dauer (min)</label>
                          <input
                            type="number"
                            min={0}
                            value={s.durationMinutes ?? ''}
                            onChange={e => updateSection(idx, { durationMinutes: e.target.value === '' ? null : Number(e.target.value) })}
                            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Runden</label>
                          <input
                            type="number"
                            min={0}
                            value={s.rounds ?? ''}
                            onChange={e => updateSection(idx, { rounds: e.target.value === '' ? null : Number(e.target.value) })}
                            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Stationen</label>
                          <input
                            type="number"
                            min={0}
                            value={s.parallelGroup ?? ''}
                            onChange={e => updateSection(idx, { parallelGroup: e.target.value === '' ? null : Number(e.target.value) })}
                            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Sp./Station</label>
                          <input
                            type="number"
                            min={0}
                            value={s.playersPerGroup ?? ''}
                            onChange={e => updateSection(idx, { playersPerGroup: e.target.value === '' ? null : Number(e.target.value) })}
                            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Eigene Notizen</label>
                        <textarea
                          value={s.userNotes ?? ''}
                          onChange={e => updateSection(idx, { userNotes: e.target.value || null })}
                          rows={2}
                          placeholder="z. B. heute mit Schwerpunkt auf …"
                          className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none resize-none"
                        />
                      </div>

                      {(s.setupNotes || s.tips || s.rotationPlan || s.adaptationNotes) && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-navy-600 hover:text-navy-800 font-semibold py-1">
                            KI-Details (read-only)
                          </summary>
                          <div className="space-y-1 mt-1 text-navy-700">
                            {s.setupNotes && <p><span className="font-bold">Setup:</span> {s.setupNotes}</p>}
                            {s.rotationPlan && <p><span className="font-bold">Rotation:</span> {s.rotationPlan}</p>}
                            {s.adaptationNotes && <p><span className="font-bold">Anpassung:</span> {s.adaptationNotes}</p>}
                            {s.tips && <p><span className="font-bold">Tipps:</span> {s.tips}</p>}
                          </div>
                        </details>
                      )}
                    </div>
                  )
                })}

                <div className="bg-white border border-cream-300 rounded-xl p-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Allgemeine Notizen</label>
                  <textarea
                    value={overallNotes}
                    onChange={e => setOverallNotes(e.target.value)}
                    rows={3}
                    placeholder="Optionale Notizen für das ganze Training"
                    className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClose}
                className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={!planContent || sections.length === 0 || saving}
                className="h-11 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? 'Speichere…' : 'Speichern'}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
