import { useEffect, useState, useId, Fragment } from 'react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'motion/react'
import { Flame, Target, Coffee, Trophy, Circle, GripVertical, X, Plus, ChevronDown, Boxes, SquarePen } from 'lucide-react'
import { BatIcon } from '@/icons'
import * as api from '@/api/client'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { Button } from '@/components/shared'
import { useToastContext } from '@/components/layout/Layout'
import type { TrainingPlanContentResponse, TrainingPlanSectionResponse, DrillResponse } from '@/types'
import { DrillPickerModal } from './DrillPickerModal'

type Props = {
  open: boolean
  onClose: () => void
  planContent: TrainingPlanContentResponse | null
  planId?: number | null
  onSave: (content: TrainingPlanContentResponse) => Promise<void>
}

function iconFor(sectionType: string | null) {
  const t = (sectionType ?? '').toUpperCase()
  if (t === 'WARMUP') return { Icon: Flame, color: 'text-softball-red-600' }
  if (t === 'DRILL') return { Icon: Target, color: 'text-navy-700' }
  if (t === 'BREAK') return { Icon: Coffee, color: 'text-navy-500' }
  if (t === 'GAME' || t === 'SCRIMMAGE') return { Icon: Trophy, color: 'text-emerald-700' }
  if (t === 'BATTING') return { Icon: BatIcon as typeof Flame, color: 'text-softball-red-700' }
  return { Icon: Circle, color: 'text-navy-500' }
}

function emptyPlan(): TrainingPlanContentResponse {
  return { sections: [], groupDistributionHint: null, overallNotes: null }
}

function SortableSection({
  section, idx, drill, expanded, selected, onToggleSelect, onToggleExpanded, onUpdate, onRemove, onSwap,
}: {
  section: TrainingPlanSectionResponse
  idx: number
  drill: DrillResponse | undefined
  expanded: boolean
  selected: boolean
  onToggleSelect: () => void
  onToggleExpanded: () => void
  onUpdate: (patch: Partial<TrainingPlanSectionResponse>) => void
  onRemove: () => void
  onSwap?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `section-${idx}` })
  const { Icon, color } = iconFor(section.sectionType)
  const inStation = section.parallelGroup != null

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`bg-white border ${selected ? 'border-navy-500 ring-2 ring-navy-200' : 'border-cream-300'} ${inStation ? 'border-l-4 border-l-navy-700' : ''} rounded-xl overflow-hidden`}
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
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label="Auswählen"
          className="w-4 h-4 rounded border-cream-300 text-navy-700 focus:ring-navy-500 cursor-pointer shrink-0"
        />
        <Icon size={18} strokeWidth={2.2} className={`${color} shrink-0`} />
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer"
          aria-expanded={expanded}
          aria-label={`${section.title ?? section.sectionType ?? 'Block'} ${expanded ? 'einklappen' : 'ausklappen'}`}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 leading-tight flex items-center gap-1.5">
              <span>{section.sectionType ?? 'Block'}</span>
              {section.group && section.group !== 'ALL' && (
                <span className={`text-[9px] font-display font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${
                  section.group === 'MAIN' ? 'bg-navy-50 text-navy-800' : 'bg-amber-50 text-amber-800'
                }`}>
                  {section.group === 'MAIN' ? 'Hauptgruppe' : 'Anfänger'}
                </span>
              )}
              {inStation && (
                <span className="bg-navy-100 text-navy-800 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                  <Boxes size={10} className="text-softball-red-600" />
                  Station {section.parallelGroup}
                </span>
              )}
            </div>
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
        {onSwap && section.drillId && (
          <button
            type="button"
            onClick={onSwap}
            title="Drill tauschen"
            aria-label="Drill tauschen"
            className="p-1 text-gray-500 hover:text-navy-800 cursor-pointer shrink-0"
          >
            <SquarePen size={14} />
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
            type="text"
            inputMode="numeric"
            value={section.durationMinutes ?? ''}
            placeholder="—"
            onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, '')
              onUpdate({ durationMinutes: v === '' ? null : Number(v) })
            }}
            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Runden</label>
          <input
            type="text"
            inputMode="numeric"
            value={section.rounds ?? ''}
            placeholder="—"
            onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, '')
              onUpdate({ rounds: v === '' ? null : Number(v) })
            }}
            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Stationen</label>
          <input
            type="text"
            inputMode="numeric"
            value={section.parallelGroup ?? ''}
            placeholder="—"
            onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, '')
              onUpdate({ parallelGroup: v === '' ? null : Number(v) })
            }}
            className="w-full px-2 py-1.5 border border-cream-300 rounded-md text-sm text-navy-900 bg-cream-50 focus:bg-white focus:border-navy-400 focus:outline-none tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Sp./Station</label>
          <input
            type="text"
            inputMode="numeric"
            value={section.playersPerGroup ?? ''}
            placeholder="—"
            onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, '')
              onUpdate({ playersPerGroup: v === '' ? null : Number(v) })
            }}
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

export function PlanEditDrawer({ open, onClose, planContent, planId, onSave }: Props) {
  const _toast = useToastContext()
  const toast = { error: (m: string) => _toast.show(m, 'error') }
  const [sections, setSections] = useState<TrainingPlanSectionResponse[]>([])
  const [overallNotes, setOverallNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [drills, setDrills] = useState<DrillResponse[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerType, setPickerType] = useState<'WARMUP' | 'DRILL' | 'BREAK'>('DRILL')
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set())
  const [selectedSet, setSelectedSet] = useState<Set<number>>(new Set())
  const [swapTargetIndex, setSwapTargetIndex] = useState<number | null>(null)
  const dndId = useId()

  const openSwapPicker = (index: number) => setSwapTargetIndex(index)
  const closeSwapPicker = () => setSwapTargetIndex(null)

  const handleSwapDrill = async (drill: DrillResponse) => {
    if (swapTargetIndex === null || planId == null) {
      setSwapTargetIndex(null)
      return
    }
    try {
      const updated = await api.patchPlanSection(planId, swapTargetIndex, drill.id)
      if (updated.content?.sections) {
        setSections(updated.content.sections)
      }
      setSwapTargetIndex(null)
    } catch (e) {
      console.error(e)
      toast.error((e as Error).message)
    }
  }

  const swapComplexityFilter = swapTargetIndex !== null && sections[swapTargetIndex]?.group === 'BEGINNER'
    ? 'BASIC' as const
    : null

  const toggleExpanded = (idx: number) => {
    setExpandedSet(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleSelected = (idx: number) => {
    setSelectedSet(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const combineToStation = () => {
    if (selectedSet.size < 2) return
    const indices = [...selectedSet].sort((a, b) => a - b)
    const maxGroup = Math.max(0, ...sections.map(s => s.parallelGroup ?? 0))
    const newGroup = maxGroup + 1
    const sharedDuration = sections[indices[0]]?.durationMinutes ?? 20
    const insertAt = indices[0]
    setSections(prev => {
      const grouped = indices.map(i => ({ ...prev[i], parallelGroup: newGroup, durationMinutes: sharedDuration }))
      const remaining = prev.filter((_, i) => !selectedSet.has(i))
      return [...remaining.slice(0, insertAt), ...grouped, ...remaining.slice(insertAt)]
    })
    setSelectedSet(new Set())
  }

  const dissolveStation = (group: number) => {
    setSections(prev => prev.map(s => s.parallelGroup === group ? { ...s, parallelGroup: null, playersPerGroup: null } : s))
  }

  const selectedStationGroups = new Set(
    [...selectedSet].map(i => sections[i]?.parallelGroup).filter((g): g is number => g != null),
  )

  useEffect(() => {
    if (open) {
      const base = planContent ?? emptyPlan()
      setSections(base.sections.map(s => ({ ...s })))
      setOverallNotes(base.overallNotes ?? '')
      setExpandedSet(new Set())
      setSelectedSet(new Set())
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
    // Index BEFORE setSections — keeps setExpandedSet out of setSections updater
    // (Anti-Pattern: nested setState inside updater bricht StrictMode-Double-Invoke)
    const newIndex = sections.length
    setSections(prev => [...prev, {
      drillId: null, sectionType: 'BREAK', title: 'Pause',
      durationMinutes: 5, rounds: null, adaptationNotes: null,
      rotationPlan: null, setupNotes: null, tips: null,
      groupSetup: null, userNotes: null, parallelGroup: null, playersPerGroup: null,
    } as TrainingPlanSectionResponse])
    setExpandedSet(prev => new Set(prev).add(newIndex))
  }

  const openPicker = (type: 'WARMUP' | 'DRILL') => {
    setPickerType(type)
    setShowPicker(true)
  }

  const addDrill = (drill: DrillResponse) => {
    // Index BEFORE setSections — keeps setExpandedSet out of setSections updater
    // (Anti-Pattern: nested setState inside updater bricht StrictMode-Double-Invoke)
    const newIndex = sections.length
    setSections(prev => [...prev, {
      drillId: drill.id,
      sectionType: pickerType,
      title: drill.name,
      durationMinutes: pickerType === 'WARMUP' ? 15 : 20,
      rounds: null, adaptationNotes: null,
      rotationPlan: drill.rotation, setupNotes: null, tips: null,
      groupSetup: null, userNotes: null, parallelGroup: null, playersPerGroup: null,
    } as TrainingPlanSectionResponse])
    setExpandedSet(prev => new Set(prev).add(newIndex))
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

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="secondary" onClick={onClose} className="h-11 w-full">
        Abbrechen
      </Button>
      <Button variant="primary" onClick={handleSave} disabled={saving} className="h-11 w-full font-bold">
        {saving ? 'Speichere…' : 'Speichern'}
      </Button>
    </div>
  )

  return (
    <>
      <ResponsiveSheet open={open} onClose={onClose} title="Plan bearbeiten" maxWidth="lg" footer={footer}>
        {selectedSet.size > 0 && (
          <div className="px-4 py-2 bg-navy-50 border-b border-navy-200 flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-navy-900 flex-1">{selectedSet.size} ausgewählt</span>
            {selectedSet.size >= 2 && (
              <button
                type="button"
                onClick={combineToStation}
                className="px-3 py-1.5 text-xs font-bold rounded-md bg-navy-700 text-white hover:bg-navy-800 cursor-pointer flex items-center gap-1.5"
              >
                <Boxes size={14} /> Zur Station verbinden
              </button>
            )}
            {selectedStationGroups.size > 0 && (
              <>
                {[...selectedStationGroups].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => dissolveStation(g)}
                    className="px-3 py-1.5 text-xs font-bold rounded-md bg-white border border-navy-300 text-navy-700 hover:bg-cream-100 cursor-pointer"
                  >
                    Station {g} auflösen
                  </button>
                ))}
              </>
            )}
            <button
              type="button"
              onClick={() => setSelectedSet(new Set())}
              className="text-xs font-semibold text-navy-600 hover:underline cursor-pointer px-2 py-1"
            >
              Auswahl ×
            </button>
          </div>
        )}

        <div className="px-4 py-4 space-y-4">
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

          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs text-navy-600 tabular-nums">{totalMinutes} min · {sections.length} {sections.length === 1 ? 'Block' : 'Blöcke'}</p>
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
                  <div className="bg-white border-2 border-dashed border-cream-300 rounded-xl p-6 text-center space-y-2">
                    <div className="text-4xl">📋</div>
                    <p className="text-sm font-semibold text-navy-800">Noch keine Blöcke</p>
                    <p className="text-xs text-navy-500">Drill aus Bibliothek wählen, Warmup oder Pause hinzufügen — siehe Buttons oben.</p>
                  </div>
                ) : (
                  sections.map((s, idx) => {
                    const drill = s.drillId ? drills.find(d => d.id === s.drillId) : undefined
                    // Gruppen-Überschrift, wenn sich die Gruppe ändert (nur bei Anfängergruppe).
                    const hasBeginnerGroup = sections.some(x => x.group === 'BEGINNER')
                    const group = s.group ?? 'ALL'
                    const prevGroup = idx > 0 ? (sections[idx - 1].group ?? 'ALL') : null
                    const showHeader = hasBeginnerGroup && group !== prevGroup
                    const headerLabel = group === 'MAIN' ? 'Hauptgruppe' : group === 'BEGINNER' ? 'Anfänger' : 'Gemeinsam'
                    const headerCls = group === 'MAIN' ? 'bg-navy-50 text-navy-800'
                      : group === 'BEGINNER' ? 'bg-amber-50 text-amber-800'
                      : 'bg-cream-200 text-navy-700'
                    return (
                      <Fragment key={`sec-${idx}`}>
                        {showHeader && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className={`font-display text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded ${headerCls}`}>
                              {headerLabel}
                            </span>
                            <span className="flex-1 h-px bg-cream-300" />
                          </div>
                        )}
                        <SortableSection
                          section={s}
                          idx={idx}
                          drill={drill}
                          expanded={expandedSet.has(idx)}
                          selected={selectedSet.has(idx)}
                          onToggleSelect={() => toggleSelected(idx)}
                          onToggleExpanded={() => toggleExpanded(idx)}
                          onUpdate={(patch) => updateSection(idx, patch)}
                          onRemove={() => removeSection(idx)}
                          onSwap={planId != null ? () => openSwapPicker(idx) : undefined}
                        />
                      </Fragment>
                    )
                  })
                )}
              </div>
            </SortableContext>
          </DndContext>

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
      </ResponsiveSheet>

      {showPicker && (
        <DrillPickerModal
          drills={drills}
          onSelect={addDrill}
          onClose={() => setShowPicker(false)}
        />
      )}

      {swapTargetIndex !== null && (
        <DrillPickerModal
          drills={drills}
          onSelect={handleSwapDrill}
          onClose={closeSwapPicker}
          complexityFilter={swapComplexityFilter}
        />
      )}
    </>
  )
}
