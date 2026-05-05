import { useState, useId, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TrainingPlanResponse, TrainingPlanSectionResponse, TrainingPlanContentResponse, DrillResponse, DrillCategory } from '@/types'
import { XMark, PlusCircle, GripHandle } from '@/icons'
import DrillPickerModal from './DrillPickerModal'

const FOCUS_CATEGORIES: Record<string, DrillCategory[]> = {
  WERFEN: ['THROWING'],
  INFIELD_DEFENSE: ['FIRST_BASE', 'SECOND_BASE', 'SS', 'THIRD_BASE', 'DOUBLE_PLAY', 'BUNT_DEFENSE'],
  OUTFIELD: ['OUTFIELD'],
  BASERUNNING: ['BASERUNNING', 'CONDITIONING'],
  SITUATIONAL: ['SITUATIONAL', 'DOUBLE_PLAY', 'BUNT_DEFENSE', 'COMINGS'],
  CATCHER: ['CATCHER', 'COMINGS'],
  RELAY: ['RELAY'],
}

interface Props {
  plan: TrainingPlanResponse
  drills: DrillResponse[]
  onSave: (content: TrainingPlanContentResponse) => void
  onCancel: () => void
}

function SortableItem({
  section, sectionId, drills, selected, onToggleSelect, onRemove, onUpdateDuration,
}: {
  section: TrainingPlanSectionResponse
  sectionId: string
  drills: DrillResponse[]
  selected: boolean
  onToggleSelect: () => void
  onRemove: () => void
  onUpdateDuration: (minutes: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sectionId })
  const drill = section.drillId ? drills.find(d => d.id === section.drillId) : null

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors ${
      selected ? 'bg-navy-50 border border-navy-300' : 'bg-cream-50 border border-cream-300'
    }`}>
      <button {...attributes} {...listeners}
        className="p-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none flex-shrink-0"
      >
        <GripHandle size={14} />
      </button>

      <input type="checkbox" checked={selected} onChange={onToggleSelect}
        className="w-4 h-4 rounded border-cream-300 text-navy-600 focus:ring-navy-500 cursor-pointer flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-gray-900 truncate">{section.title}</span>
          {drill?.pdfPage && (
            <button
              onClick={e => { e.stopPropagation(); window.open(`/drills.pdf?t=${Date.now()}#page=${drill.pdfPage}`, 'drill-handbuch') }}
              className="font-display text-[10px] font-bold tracking-wider text-navy-700 hover:text-navy-900 hover:underline cursor-pointer flex-shrink-0"
            >
              S.{drill.pdfPage} ↗
            </button>
          )}
        </div>
        {section.sectionType && section.sectionType !== 'DRILL' && (
          <span className="font-display text-[9px] tracking-widest uppercase text-gray-400 font-bold">{section.sectionType}</span>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <input
          type="number" min={1} max={180} value={section.durationMinutes ?? ''}
          onChange={e => onUpdateDuration(Number(e.target.value))}
          className="font-display w-11 border border-cream-300 rounded px-1 py-0.5 text-xs font-bold text-navy-900 text-center focus:border-navy-600 focus:ring-2 focus:ring-cream-200 outline-none"
        />
        <span className="font-display text-[9px] tracking-widest uppercase text-gray-400 font-bold">min</span>
      </div>

      <button
        onClick={onRemove}
        className="p-1 text-gray-300 hover:text-softball-red-600 cursor-pointer flex-shrink-0"
        aria-label="Drill entfernen"
      >
        <XMark size={14} />
      </button>
    </div>
  )
}

function groupForDisplay(sections: TrainingPlanSectionResponse[]): { type: 'single' | 'station'; indices: number[]; group: number | null }[] {
  const result: { type: 'single' | 'station'; indices: number[]; group: number | null }[] = []
  let i = 0
  while (i < sections.length) {
    if (sections[i].parallelGroup != null) {
      const group = sections[i].parallelGroup
      const indices: number[] = []
      while (i < sections.length && sections[i].parallelGroup === group) {
        indices.push(i)
        i++
      }
      result.push({ type: indices.length >= 2 ? 'station' : 'single', indices, group })
    } else {
      result.push({ type: 'single', indices: [i], group: null })
      i++
    }
  }
  return result
}

export default function PlanEditor({ plan, drills, onSave, onCancel }: Props) {
  const [sections, setSections] = useState<TrainingPlanSectionResponse[]>(
    plan.content?.sections ?? []
  )
  const [overallNotes, setOverallNotes] = useState(plan.content?.overallNotes ?? '')
  const [showDrillPicker, setShowDrillPicker] = useState(false)
  const [addToStation, setAddToStation] = useState<number | null>(null) // parallelGroup to add to
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // Focus → Kategorien auflösen für DrillPicker-Hervorhebung
  const focusCategories = useMemo(() => {
    if (!plan.focus) return undefined
    const cats = new Set<DrillCategory>()
    for (const f of plan.focus.split(',')) {
      const trimmed = f.trim()
      if (trimmed === 'INFIELD_DEFENSE' && plan.infieldPositions && plan.infieldPositions.length > 0) {
        // Sub-Focus aktiv → nur die gewählten Positionen, nicht alle
        plan.infieldPositions.forEach(pos => cats.add(pos as DrillCategory))
        cats.add('FIELDING')
        continue
      }
      const mapped = FOCUS_CATEGORIES[trimmed]
      if (mapped) mapped.forEach(c => cats.add(c))
    }
    return cats.size > 0 ? [...cats] : undefined
  }, [plan.focus, plan.infieldPositions])

  const dndId = useId()
  const sectionIds = sections.map((_, i) => `section-${i}`)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sectionIds.indexOf(active.id as string)
    const newIndex = sectionIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = [...sections]
    let [moved] = reordered.splice(oldIndex, 1)

    // Wenn der Drill eine Station verlässt, parallelGroup prüfen
    if (moved.parallelGroup != null) {
      const remainingInGroup = reordered.filter(s => s.parallelGroup === moved.parallelGroup)
      if (remainingInGroup.length < 2) {
        // Station hat nur noch ≤1 Drill → komplett auflösen
        const group = moved.parallelGroup
        reordered.forEach((s, i) => {
          if (s.parallelGroup === group) {
            reordered[i] = { ...s, parallelGroup: null, playersPerGroup: null }
          }
        })
      }
      // Prüfen ob Drill noch neben seiner Gruppe landet
      const targetGroup = reordered[newIndex]?.parallelGroup ?? reordered[Math.max(0, newIndex - 1)]?.parallelGroup
      if (targetGroup !== moved.parallelGroup) {
        moved = { ...moved, parallelGroup: null, playersPerGroup: null }
      }
    }

    reordered.splice(newIndex, 0, moved)
    setSections(reordered)
    setSelectedIndices(new Set())
  }

  const removeSection = (index: number) => {
    setSections(prev => {
      const removed = prev[index]
      const filtered = prev.filter((_, i) => i !== index)
      // Wenn der entfernte Drill zu einer Station gehörte und nur noch ≤1 übrig: auflösen
      if (removed.parallelGroup != null) {
        const remainingInGroup = filtered.filter(s => s.parallelGroup === removed.parallelGroup)
        if (remainingInGroup.length < 2) {
          return filtered.map(s =>
            s.parallelGroup === removed.parallelGroup ? { ...s, parallelGroup: null, playersPerGroup: null } : s
          )
        }
      }
      return filtered
    })
    setSelectedIndices(prev => { const next = new Set(prev); next.delete(index); return next })
  }

  const updateSectionDuration = (index: number, minutes: number) => {
    setSections(prev => {
      const section = prev[index]
      if (section.parallelGroup != null) {
        return prev.map(s => s.parallelGroup === section.parallelGroup ? { ...s, durationMinutes: minutes } : s)
      }
      return prev.map((s, i) => i === index ? { ...s, durationMinutes: minutes } : s)
    })
  }

  const toggleSelect = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index); else next.add(index)
      return next
    })
  }

  const groupAsStation = () => {
    if (selectedIndices.size < 2) return
    const maxGroup = Math.max(0, ...sections.map(s => s.parallelGroup ?? 0))
    const newGroup = maxGroup + 1
    const firstDuration = sections[[...selectedIndices][0]]?.durationMinutes ?? 30
    setSections(prev => prev.map((s, i) =>
      selectedIndices.has(i) ? { ...s, parallelGroup: newGroup, durationMinutes: firstDuration } : s
    ))
    setSelectedIndices(new Set())
  }

  const addSelectedToStation = (targetGroup: number) => {
    if (selectedIndices.size === 0) return
    const stationDuration = sections.find(s => s.parallelGroup === targetGroup)?.durationMinutes ?? 30
    setSections(prev => prev.map((s, i) =>
      selectedIndices.has(i) ? { ...s, parallelGroup: targetGroup, durationMinutes: stationDuration } : s
    ))
    setSelectedIndices(new Set())
  }

  const dissolveStation = (group: number) => {
    setSections(prev => prev.map(s =>
      s.parallelGroup === group ? { ...s, parallelGroup: null, playersPerGroup: null } : s
    ))
  }

  const addDrillToStation = (drill: DrillResponse, stationGroup: number) => {
    const stationDuration = sections.find(s => s.parallelGroup === stationGroup)?.durationMinutes ?? 30
    setSections(prev => [...prev, {
      drillId: drill.id, sectionType: 'DRILL', title: drill.name,
      durationMinutes: stationDuration, rounds: null, adaptationNotes: null,
      rotationPlan: drill.rotation, setupNotes: null, tips: null,
      groupSetup: null, userNotes: null, parallelGroup: stationGroup, playersPerGroup: null,
    }])
    setShowDrillPicker(false)
    setAddToStation(null)
  }

  const addDrill = (drill: DrillResponse) => {
    if (addToStation != null) {
      addDrillToStation(drill, addToStation)
      return
    }
    setSections(prev => [...prev, {
      drillId: drill.id, sectionType: 'DRILL', title: drill.name,
      durationMinutes: 15, rounds: null, adaptationNotes: null,
      rotationPlan: drill.rotation, setupNotes: null, tips: null,
      groupSetup: null, userNotes: null, parallelGroup: null, playersPerGroup: null,
    }])
    setShowDrillPicker(false)
  }

  const handleSave = () => {
    onSave({
      sections,
      groupDistributionHint: plan.content?.groupDistributionHint ?? null,
      overallNotes: overallNotes || null,
    })
  }

  const displayGroups = groupForDisplay(sections)
  const totalMinutes = displayGroups.reduce((sum, g) => sum + (sections[g.indices[0]]?.durationMinutes ?? 0), 0)
  const overTime = totalMinutes > plan.durationMinutes

  // Gibt es Stationen wo selected Drills hinzugefügt werden können?
  const existingStationGroups = [...new Set(sections.filter(s => s.parallelGroup != null).map(s => s.parallelGroup!))]

  return (
    <div className="space-y-3">
      {/* Sticky header — Action-Buttons (Mobile-friendly) */}
      <div className="flex items-center justify-between sm:justify-end sticky top-16 bg-cream-100/95 backdrop-blur z-10 py-2 -mx-4 px-4 border-b border-cream-300">
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={() => { setAddToStation(null); setShowDrillPicker(true) }}
            className="font-display flex items-center gap-1.5 px-3 py-2 text-[11px] font-extrabold tracking-widest uppercase bg-navy-900 text-white rounded-lg hover:bg-navy-800 shadow-sm shadow-navy-900/15 transition-colors cursor-pointer"
          >
            <PlusCircle size={14} /> Drill
          </button>
          <div className="flex-1 sm:hidden" />
          <button
            onClick={handleSave}
            className="font-display px-4 py-2 text-[11px] font-extrabold tracking-widest uppercase bg-softball-red-600 text-white rounded-lg hover:bg-softball-red-700 shadow-sm shadow-softball-red-600/20 transition-colors cursor-pointer"
          >
            Speichern
          </button>
          <button
            onClick={onCancel}
            className="font-display px-3 py-2 text-[11px] font-bold tracking-widest uppercase text-gray-500 hover:text-navy-900 cursor-pointer"
          >
            Abbrechen
          </button>
        </div>
      </div>

      {/* Info-Strip — kompakt */}
      <div className="flex items-center gap-3 px-1 text-sm">
        <span className="font-display font-extrabold tracking-wide text-navy-900">{sections.length} Drills</span>
        <span className="text-cream-300">·</span>
        <span className={`font-display font-extrabold tracking-wide tabular-nums ${overTime ? 'text-softball-red-600' : 'text-navy-900'}`}>{totalMinutes} / {plan.durationMinutes} min</span>
        {!overTime && totalMinutes < plan.durationMinutes && (
          <span className="font-display text-[10px] tracking-widest uppercase text-gray-400 font-bold">{plan.durationMinutes - totalMinutes} min frei</span>
        )}
        {overTime && (
          <span className="font-display text-[10px] tracking-widest uppercase text-softball-red-600 font-bold">+{totalMinutes - plan.durationMinutes} min</span>
        )}
      </div>

      {/* Selection actions — nur bei Auswahl */}
      {selectedIndices.size >= 1 && (
        <div className="flex items-center gap-2 flex-wrap animate-[slideUp_200ms_ease]">
          <span className="text-xs text-gray-400">{selectedIndices.size} ausgewählt:</span>
          {selectedIndices.size >= 2 && (
            <button onClick={groupAsStation}
              className="px-3 py-1.5 text-xs bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors cursor-pointer">
              Neue Station
            </button>
          )}
          {existingStationGroups.map(g => (
            <button key={g} onClick={() => addSelectedToStation(g)}
              className="px-3 py-1.5 text-xs border border-navy-200 text-navy-600 rounded-lg hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors cursor-pointer">
              → Station {g}
            </button>
          ))}
        </div>
      )}

      {/* Drill list */}
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {displayGroups.map((g, gi) => {
              if (g.type === 'station' && g.indices.length >= 2) {
                const blockMin = sections[g.indices[0]]?.durationMinutes ?? 0
                const perStation = Math.round(blockMin / g.indices.length)
                return (
                  <div key={gi} className="rounded-xl bg-cream-50 border border-cream-300 border-l-4 border-l-navy-600 overflow-hidden">
                    {/* Station header */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-display px-2 py-0.5 rounded text-[10px] font-extrabold bg-navy-900 text-white uppercase tracking-widest shrink-0">
                          Station {g.group}
                        </span>
                        <span className="font-display text-[10px] tracking-widest uppercase text-gray-500 font-bold truncate">
                          {g.indices.length} Drills · {blockMin} min · {perStation}/Drill
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setAddToStation(g.group); setShowDrillPicker(true) }}
                          className="font-display inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-navy-700 border border-cream-300 rounded hover:bg-cream-100 hover:border-navy-400 hover:text-navy-900 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <PlusCircle size={11} /> Drill
                        </button>
                        <button
                          onClick={() => dissolveStation(g.group!)}
                          className="font-display px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-gray-500 border border-cream-300 rounded hover:bg-softball-red-50 hover:text-softball-red-600 hover:border-softball-red-300 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Auflösen
                        </button>
                      </div>
                    </div>
                    {/* Station drills */}
                    <div className="p-1.5 space-y-1">
                      {g.indices.map(idx => (
                        <SortableItem key={sectionIds[idx]} section={sections[idx]} sectionId={sectionIds[idx]}
                          drills={drills} selected={selectedIndices.has(idx)}
                          onToggleSelect={() => toggleSelect(idx)}
                          onRemove={() => removeSection(idx)}
                          onUpdateDuration={min => updateSectionDuration(idx, min)} />
                      ))}
                    </div>
                  </div>
                )
              }
              const idx = g.indices[0]
              return (
                <SortableItem key={sectionIds[idx]} section={sections[idx]} sectionId={sectionIds[idx]}
                  drills={drills} selected={selectedIndices.has(idx)}
                  onToggleSelect={() => toggleSelect(idx)}
                  onRemove={() => removeSection(idx)}
                  onUpdateDuration={min => updateSectionDuration(idx, min)} />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      <textarea value={overallNotes} onChange={e => setOverallNotes(e.target.value)}
        placeholder="Allgemeine Notizen…" rows={2}
        className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm focus:border-navy-600 outline-none resize-none" />

      {showDrillPicker && (
        <DrillPickerModal drills={drills} focusCategories={focusCategories} onSelect={addDrill} onClose={() => { setShowDrillPicker(false); setAddToStation(null) }} />
      )}
    </div>
  )
}
