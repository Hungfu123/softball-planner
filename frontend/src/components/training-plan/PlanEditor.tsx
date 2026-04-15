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
      selected ? 'bg-navy-50 border border-navy-300' : 'bg-white border border-gray-200'
    }`}>
      <button {...attributes} {...listeners}
        className="p-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none flex-shrink-0"
      >
        <GripHandle size={14} />
      </button>

      <input type="checkbox" checked={selected} onChange={onToggleSelect}
        className="w-4 h-4 rounded border-gray-300 text-navy-600 focus:ring-navy-500 cursor-pointer flex-shrink-0" />

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900 truncate">{section.title}</span>
        {drill?.pdfPage && (
          <button
            onClick={e => { e.stopPropagation(); window.open(`/drills.pdf?t=${Date.now()}#page=${drill.pdfPage}`, 'drill-handbuch') }}
            className="text-[10px] text-navy-600 hover:underline cursor-pointer flex-shrink-0"
          >
            S.{drill.pdfPage} ↗
          </button>
        )}
        {section.sectionType && section.sectionType !== 'DRILL' && (
          <span className="text-[10px] text-gray-400 uppercase">{section.sectionType}</span>
        )}
      </div>

      <input type="number" min={1} max={180} value={section.durationMinutes ?? ''}
        onChange={e => onUpdateDuration(Number(e.target.value))}
        className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-center focus:border-navy-600 outline-none flex-shrink-0" />
      <span className="text-[10px] text-gray-400 flex-shrink-0">min</span>

      <button onClick={onRemove}
        className="p-0.5 text-gray-300 hover:text-softball-red-500 cursor-pointer flex-shrink-0">
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
      const mapped = FOCUS_CATEGORIES[f.trim()]
      if (mapped) mapped.forEach(c => cats.add(c))
    }
    return cats.size > 0 ? [...cats] : undefined
  }, [plan.focus])

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
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    setSections(reordered)
    setSelectedIndices(new Set())
  }

  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index))
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
      {/* Sticky header — nur Action-Buttons */}
      <div className="flex items-center justify-end sticky top-16 bg-gray-100 z-10 py-2 -mx-4 px-4">
        <div className="flex gap-2">
          <button onClick={() => { setAddToStation(null); setShowDrillPicker(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors cursor-pointer">
            <PlusCircle size={14} /> Drill
          </button>
          <button onClick={handleSave}
            className="px-3 py-1.5 text-sm border border-navy-800 text-navy-800 rounded-lg hover:bg-navy-800 hover:text-white transition-colors cursor-pointer">
            Speichern
          </button>
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 cursor-pointer">
            Abbrechen
          </button>
        </div>
      </div>

      {/* Info + Hint Box */}
      <div className="bg-navy-800 rounded-lg px-4 py-3 space-y-2">
        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-white">
          <span className="font-bold">{sections.length} Drills</span>
          <span className="text-white/60">·</span>
          <span className={overTime ? 'text-softball-red-500 font-bold' : 'font-bold'}>{totalMinutes} / {plan.durationMinutes} min</span>
          {!overTime && totalMinutes < plan.durationMinutes && (
            <span className="text-white/50 text-xs">({plan.durationMinutes - totalMinutes} min frei)</span>
          )}
          {overTime && (
            <span className="text-softball-red-500 text-xs">({totalMinutes - plan.durationMinutes} min über Limit)</span>
          )}
        </div>
        {/* Hint */}
        {selectedIndices.size === 0 && (
          <p className="text-[11px] text-white/60">
            💡 <span className="font-bold text-white/80">Tipp:</span> Drills per Checkbox auswählen → als Station gruppieren. Oder Drills in bestehende Stationen einfügen.
          </p>
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
                  <div key={gi} className="rounded-xl bg-white border border-gray-200 border-l-4 border-l-navy-600 overflow-hidden">
                    {/* Station header */}
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-800 text-white uppercase tracking-wider">
                          Station {g.group}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {g.indices.length} Drills · {blockMin} min Block · {perStation} min/Drill
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setAddToStation(g.group); setShowDrillPicker(true) }}
                          className="px-2 py-0.5 text-[11px] font-medium text-navy-600 border border-navy-200 rounded hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors cursor-pointer">
                          + Drill
                        </button>
                        <button onClick={() => dissolveStation(g.group!)}
                          className="px-2 py-0.5 text-[11px] text-gray-400 border border-gray-200 rounded hover:bg-softball-red-50 hover:text-softball-red-600 hover:border-softball-red-200 transition-colors cursor-pointer">
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
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-navy-600 outline-none resize-none" />

      {showDrillPicker && (
        <DrillPickerModal drills={drills} focusCategories={focusCategories} onSelect={addDrill} onClose={() => { setShowDrillPicker(false); setAddToStation(null) }} />
      )}
    </div>
  )
}
