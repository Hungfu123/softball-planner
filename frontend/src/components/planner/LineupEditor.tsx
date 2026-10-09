import { useState } from 'react'
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
import { LineupRowSwapSheet } from './LineupRowSwapSheet'
import type { CoachRotationPair, LocalLineupEntry, Player } from '@/types'
import { POSITIONS, FIELD_POSITIONS } from '@/types'
import { CrossBones, TrashBin, DiceIcon } from '@/icons'
import { EmptyState } from '@/components/shared'

interface Props {
  entries: LocalLineupEntry[]
  poolPlayers: Player[]
  onRemove: (playerId: number) => void
  onSetPosition: (playerId: number, position: string) => void
  onSetDhBatter: (fieldPlayerId: number, batter: Player | null) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onReorder: (oldIndex: number, newIndex: number) => void
  onSwapWithPool: (rowPlayerId: number, poolPlayer: Player) => void
  onSwapWithLineup: (rowPlayerId: number, otherRowPlayerId: number) => void
  onFillSlot: (slotId: number, player: Player) => void
  onClear?: () => void
  onCopyOtherGame?: () => void
  onAutoGenerate?: () => void
  autoGenerateLoading?: boolean
  firstBaseCoachRotation?: CoachRotationPair | null
  thirdBaseCoachRotation?: CoachRotationPair | null
}

const FIELD_POS_SET = new Set<string>(FIELD_POSITIONS)
// DH is not in the dropdown — it's managed via checkbox
const SELECTABLE_POSITIONS = (POSITIONS as readonly string[]).filter(p => p !== 'DH')

export function LineupEditor({
  entries, poolPlayers, onRemove, onSetPosition, onSetDhBatter,
  onMoveUp, onMoveDown, onReorder, onSwapWithPool, onSwapWithLineup, onFillSlot,
  onClear, onCopyOtherGame, onAutoGenerate, autoGenerateLoading,
  firstBaseCoachRotation, thirdBaseCoachRotation,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const [swapRow, setSwapRow] = useState<LocalLineupEntry | null>(null)
  const swapRowIndex = swapRow ? entries.findIndex(e => e.player.id === swapRow.player.id) : null

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

  const MIN_PLAYERS = 9
  const MAX_PLAYERS = 10
  const statusColor =
    filledCount >= MIN_PLAYERS ? 'text-navy-900' :
    'text-softball-red-700'

  return (
    <div>
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-cream-200 gap-2">
        <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900 inline-flex items-center gap-2">
          <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
          Lineup
        </h2>
        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <span className={`font-display text-sm font-extrabold tabular-nums tracking-wide ${statusColor}`}>
            {filledCount} <span className="text-gray-400 font-bold">von</span> {MAX_PLAYERS}
            {filledCount < MIN_PLAYERS && <span className="ml-1.5 font-display text-[10px] tracking-widest uppercase text-gray-500">min {MIN_PLAYERS}</span>}
          </span>
          {onAutoGenerate && (
            <button
              onClick={onAutoGenerate}
              disabled={autoGenerateLoading}
              className="p-1 rounded text-gray-300 hover:text-navy-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        <EmptyState
          dashed
          icon={<CrossBones size={32} />}
          title="Tippe Spieler im Pool an"
          action={onCopyOtherGame && (
            <button
              onClick={onCopyOtherGame}
              className="px-4 py-2 text-xs font-medium text-navy-700 bg-navy-50 rounded-lg hover:bg-navy-100 hover:text-navy-900 transition-colors cursor-pointer"
            >
              Lineup kopieren
            </button>
          )}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={entries.map(e => e.player.id)} strategy={verticalListSortingStrategy}>
            {/* Der Bogen ist das Objekt, das hier bearbeitet wird — er bekommt als einziges
                 Papier-Panel den vollen Card-Schatten und eine rote Kante, damit er sich
                 auf dem Desktop klar von den Referenz-Panels ringsum abhebt. */}
            <div className="bg-cream-50 border border-cream-300 border-l-[3px] border-l-softball-red-600 rounded-2xl shadow-card overflow-hidden divide-y divide-cream-200">
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
                    onOpenSwap={setSwapRow}
                    onFillSlot={onFillSlot}
                    firstBaseCoachRotation={firstBaseCoachRotation}
                    thirdBaseCoachRotation={thirdBaseCoachRotation}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <LineupRowSwapSheet
        open={swapRow !== null}
        row={swapRow}
        rowIndex={swapRowIndex !== null && swapRowIndex >= 0 ? swapRowIndex : null}
        entries={entries}
        poolPlayers={poolPlayers}
        onSwapWithPool={onSwapWithPool}
        onSwapWithLineup={onSwapWithLineup}
        onClose={() => setSwapRow(null)}
      />
    </div>
  )
}
