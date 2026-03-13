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
} from '@dnd-kit/sortable'
import { LineupRow } from './LineupRow'
import type { LocalLineupEntry, Player } from '@/types'
import { POSITIONS, FIELD_POSITIONS } from '@/types'
import { CrossBones, TrashBin, DiceIcon } from '@/icons'

interface Props {
  entries: LocalLineupEntry[]
  poolPlayers: Player[]
  onRemove: (playerId: number) => void
  onSetPosition: (playerId: number, position: string) => void
  onSetDhBatter: (fieldPlayerId: number, batter: Player | null) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onReorder: (oldIndex: number, newIndex: number) => void
  onClear?: () => void
  onCopyOtherGame?: () => void
  onAutoGenerate?: () => void
  autoGenerateLoading?: boolean
}

const FIELD_POS_SET = new Set<string>(FIELD_POSITIONS)
// DH is not in the dropdown — it's managed via checkbox
const SELECTABLE_POSITIONS = (POSITIONS as readonly string[]).filter(p => p !== 'DH')

export function LineupEditor({
  entries, poolPlayers, onRemove, onSetPosition, onSetDhBatter,
  onMoveUp, onMoveDown, onReorder, onClear, onCopyOtherGame, onAutoGenerate, autoGenerateLoading,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = entries.findIndex(e => e.player.id === active.id)
    const newIndex = entries.findIndex(e => e.player.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex)
    }
  }

  // Track used field positions
  const usedFieldPositions = new Set(
    entries
      .filter(e => e.position && FIELD_POS_SET.has(e.position))
      .map(e => e.position!)
  )

  // Only one DH allowed at a time
  const hasDhActive = entries.some(e => e.dhBatterId !== null)

  const filledCount = entries.filter(e => e.position).length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
          <span className="w-1 h-4 bg-softball-red-500 rounded-full" />
          Lineup
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-mono">{filledCount}/10</span>
          {onAutoGenerate && (
            <button
              onClick={onAutoGenerate}
              disabled={autoGenerateLoading}
              className="p-1 rounded text-gray-300 hover:text-navy-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Positionen zufällig befüllen — für alle Spiele gleichzeitig 'Alle aufstellen' nutzen"
            >
              <DiceIcon size={14} />
            </button>
          )}
          {entries.length > 0 && onClear && (
            <button
              onClick={onClear}
              className="p-1 rounded text-gray-300 hover:text-softball-red-500 transition-colors cursor-pointer"
              title="Lineup leeren"
            >
              <TrashBin size={14} />
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <CrossBones size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Tippe Spieler im Pool an</p>
          {onCopyOtherGame && (
            <button
              onClick={onCopyOtherGame}
              className="mt-3 px-4 py-2 text-xs font-medium text-navy-700 bg-navy-50 rounded-lg hover:bg-navy-100 hover:text-navy-900 transition-colors cursor-pointer"
            >
              Lineup kopieren
            </button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={entries.map(e => e.player.id)} strategy={verticalListSortingStrategy}>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {entries.map((entry, index) => {
                const isFieldPos = !!entry.position && FIELD_POS_SET.has(entry.position)

                // Available positions: own + unused field positions + EH (no DH)
                const availablePositions = SELECTABLE_POSITIONS.filter(pos => {
                  if (pos === entry.position) return true
                  if (FIELD_POS_SET.has(pos)) return !usedFieldPositions.has(pos)
                  return true
                })

                // Can check DH: has field position, no other DH active, pool has players
                const canCheckDh = isFieldPos && !hasDhActive && poolPlayers.length > 0

                return (
                  <LineupRow
                    key={entry.player.id}
                    entry={entry}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === entries.length - 1}
                    availablePositions={availablePositions}
                    isFieldPosition={isFieldPos}
                    canCheckDh={canCheckDh}
                    poolPlayers={poolPlayers}
                    onRemove={onRemove}
                    onSetPosition={onSetPosition}
                    onSetDhBatter={onSetDhBatter}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
