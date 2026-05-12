import { useEffect, useState, useId } from 'react'
import { Drawer } from 'vaul'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'motion/react'
import { Flame, Target, Coffee, Trophy, Circle, GripVertical, X, Plus, ChevronDown } from 'lucide-react'
import * as api from '@/api/client'
import type { TrainingPlanContentResponse, TrainingPlanSectionResponse, DrillResponse } from '@/types'
import { DrillPickerModal } from './DrillPickerModal'

type Props = {
  open: boolean
  onClose: () => void
  planContent: TrainingPlanContentResponse | null
  onSave: (content: TrainingPlanContentResponse) => Promise<void>
}

function iconFor(sectionType: string | null) {
  const t = (sectionType ?? '').toUpperCase()
  if (t === 'WARMUP') return { Icon: Flame, color: 'text-softball-red-600' }
  if (t === 'DRILL') return { Icon: Target, color: 'text-navy-700' }
  if (t === 'BREAK') return { Icon: Coffee, color: 'text-navy-500' }
  if (t === 'GAME' || t === 'SCRIMMAGE') return { Icon: Trophy, color: 'text-emerald-700' }
  return { Icon: Circle, color: 'text-navy-500' }
}

function emptyPlan(): TrainingPlanContentResponse {
  return { sections: [], groupDistributionHint: null, overallNotes: null }
}

function SortableSection({
  section, idx, drill, expanded, onToggleExpanded, onUpdate, onRemove,
}: {
  section: TrainingPlanSectionResponse
  idx: number
  drill: DrillResponse | undefined
  expanded: boolean
  onToggleExpanded: () => void
  onUpdate: (patch: Partial<TrainingPlanSectionResponse>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `section-${idx}` })
  const { Icon, color } = iconFor(section.sectionType)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="bg-white border border-cream-300 rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          {...attributes}
          {...listeners}
          aria-label="Reihenfolge ziehen"
          className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none shrink-0"
        >
          <GripVertical size={16} />
        </button>
        <Icon size={18} strokeWidth={2.2} className={`${color} shrink-0`} />
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer"
          aria-expanded={expanded}
          aria-label={`${section.title ?? section.sectionType ?? 'Block'} ${expanded ? 'einklappen' : 'ausklappen'}`}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 leading-tight">{section.sectionType ?? 'Block'}</div>
            <div className="text-sm font-medium text-navy-900 truncate leading-tight">{section.title || '—'}</div>
          </div>
          {section.durationMinutes != null && (
            <span className="shrink-0 text-xs font-bold tabular-nums text-navy-700">{section.durationMinutes} min</span>
          )}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-navy-500">
            <ChevronDown size={16} />
          </motion.span>
        </button>
        {drill?.pdfPage && (
          <button
            type="button"
            onClick={() => window.open(`/drills.pdf?t=${Date.now()}#page=${drill.pdfPage}`, 'drill-handbuch')}
            className="text-[10px] font-bold tracking-wider text-navy-700 hover:text-navy-900 hover:underline cursor-pointer shrink-0"
            title="Im Handbuch nachschlagen"
          >
            S.{drill.pdfPage} ↗
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Block entfernen"
          className="p-1 text-gray-400 hover:text-softball-red-600 cursor-pointer shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-cream-200">
              <div className="pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Titel</label>
                <input
                  type="text"
                  value={section.title ?? ''}
                  onChange={e => onUpdate({ title: e.target.value || null })}
                  className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none"
                />
              </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Dauer (min)</label>
          <input
            type="number"
            min={0}
            value={section.durationMinutes ?? ''}
            onChange={e => onUpdate({ durationMinutes: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Runden</label>
          <input
            type="number"
            min={0}
            value={section.rounds ?? ''}
            onChange={e => onUpdate({ rounds: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Stationen</label>
          <input
            type="number"
            min={0}
            value={section.parallelGroup ?? ''}
            onChange={e => onUpdate({ parallelGroup: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Sp./Station</label>
          <input
            type="number"
            min={0}
            value={section.playersPerGroup ?? ''}
            onChange={e => onUpdate({ playersPerGroup: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Tipps</label>
        <textarea
          value={section.tips ?? ''}
          onChange={e => onUpdate({ tips: e.target.value || null })}
          rows={2}
          placeholder="Worauf achten?"
          className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none resize-none"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Eigene Notizen</label>
        <textarea
          value={section.userNotes ?? ''}
          onChange={e => onUpdate({ userNotes: e.target.value || null })}
          rows={2}
          placeholder="z. B. heute Fokus auf …"
          className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none resize-none"
        />
      </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PlanEditDrawer({ open, onClose, planContent, onSave }: Props) {
  const [sections, setSections] = useState<TrainingPlanSectionResponse[]>([])
  const [overallNotes, setOverallNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [drills, setDrills] = useState<DrillResponse[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerType, setPickerType] = useState<'WARMUP' | 'DRILL' | 'BREAK'>('DRILL')
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set())
  const dndId = useId()

  const toggleExpanded = (idx: number) => {
    setExpandedSet(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  useEffect(() => {
    if (open) {
      const base = planContent ?? emptyPlan()
      setSections(base.sections.map(s => ({ ...s })))
      setOverallNotes(base.overallNotes ?? '')
      setExpandedSet(new Set())
      if (drills.length === 0) {
        api.getDrills().then(setDrills).catch(() => setDrills([]))
      }
    }
  }, [open, planContent, drills.length])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = sections.map((_, i) => `section-${i}`)
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    setSections(prev => {
      const next = [...prev]
      const [moved] = next.splice(oldIndex, 1)
      next.splice(newIndex, 0, moved)
      return next
    })
  }

  const updateSection = (idx: number, patch: Partial<TrainingPlanSectionResponse>) => {
    setSections(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  const removeSection = (idx: number) => {
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  const addBreak = () => {
    setSections(prev => {
      const next = [...prev, {
        drillId: null, sectionType: 'BREAK', title: 'Pause',
        durationMinutes: 5, rounds: null, adaptationNotes: null,
        rotationPlan: null, setupNotes: null, tips: null,
        groupSetup: null, userNotes: null, parallelGroup: null, playersPerGroup: null,
      } as TrainingPlanSectionResponse]
      setExpandedSet(prev => new Set(prev).add(next.length - 1))
      return next
    })
  }

  const openPicker = (type: 'WARMUP' | 'DRILL') => {
    setPickerType(type)
    setShowPicker(true)
  }

  const addDrill = (drill: DrillResponse) => {
    setSections(prev => {
      const next = [...prev, {
        drillId: drill.id,
        sectionType: pickerType,
        title: drill.name,
        durationMinutes: pickerType === 'WARMUP' ? 15 : 20,
        rounds: null, adaptationNotes: null,
        rotationPlan: drill.rotation, setupNotes: null, tips: null,
        groupSetup: null, userNotes: null, parallelGroup: null, playersPerGroup: null,
      } as TrainingPlanSectionResponse]
      setExpandedSet(prev => new Set(prev).add(next.length - 1))
      return next
    })
    setShowPicker(false)
  }

  const totalMinutes = sections.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        sections,
        groupDistributionHint: planContent?.groupDistributionHint ?? null,
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
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[92vh] flex flex-col focus:outline-none">
          <Drawer.Title className="sr-only">Plan bearbeiten</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />

          <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto w-full overflow-y-auto flex-1 min-h-0">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
                  Plan bearbeiten
                </h2>
                <p className="text-xs text-navy-600 tabular-nums">{totalMinutes} min · {sections.length} {sections.length === 1 ? 'Block' : 'Blöcke'}</p>
              </div>
              <a
                href="/drills.pdf"
                target="drill-handbuch"
                className="text-xs font-semibold text-navy-700 hover:underline cursor-pointer shrink-0"
              >
                📖 Handbuch
              </a>
            </div>

            <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((_, i) => `section-${i}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {sections.length === 0 ? (
                    <div className="bg-white border border-cream-300 rounded-xl p-4 text-sm text-navy-500 italic">
                      Noch keine Blöcke. Drill oder Pause hinzufügen.
                    </div>
                  ) : (
                    sections.map((s, idx) => {
                      const drill = s.drillId ? drills.find(d => d.id === s.drillId) : undefined
                      return (
                        <SortableSection
                          key={`section-${idx}`}
                          section={s}
                          idx={idx}
                          drill={drill}
                          expanded={expandedSet.has(idx)}
                          onToggleExpanded={() => toggleExpanded(idx)}
                          onUpdate={(patch) => updateSection(idx, patch)}
                          onRemove={() => removeSection(idx)}
                        />
                      )
                    })
                  )}
                </div>
              </SortableContext>
            </DndContext>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => openPicker('WARMUP')}
                className="h-10 rounded-lg bg-white border border-softball-red-300 text-softball-red-700 text-xs font-bold uppercase tracking-wide hover:bg-softball-red-50 cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Warmup
              </button>
              <button
                type="button"
                onClick={() => openPicker('DRILL')}
                className="h-10 rounded-lg bg-white border border-navy-300 text-navy-700 text-xs font-bold uppercase tracking-wide hover:bg-navy-50 cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Drill
              </button>
              <button
                type="button"
                onClick={addBreak}
                className="h-10 rounded-lg bg-white border border-cream-400 text-navy-600 text-xs font-bold uppercase tracking-wide hover:bg-cream-100 cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Pause
              </button>
            </div>

            <div className="bg-white border border-cream-300 rounded-xl p-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Allgemeine Notizen</label>
              <textarea
                value={overallNotes}
                onChange={e => setOverallNotes(e.target.value)}
                rows={2}
                placeholder="Optional"
                className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div
            className="px-4 py-3 max-w-2xl mx-auto w-full border-t border-cream-300 bg-cream-50 shrink-0"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClose}
                className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-11 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? 'Speichere…' : 'Speichern'}
              </button>
            </div>
          </div>

          {showPicker && (
            <DrillPickerModal
              drills={drills}
              onSelect={addDrill}
              onClose={() => setShowPicker(false)}
            />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
