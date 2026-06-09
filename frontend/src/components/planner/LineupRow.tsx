import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CoachRotationPair, LocalLineupEntry, Player } from '@/types'
import { GripHandle, ChevronUp, ChevronDown, XMark, ArrowsSwap } from '@/icons'
import { getPairPositions } from '@/utils/coachRotation'

interface Props {
  entry: LocalLineupEntry
  index: number
  isFirst: boolean
  isLast: boolean
  availablePositions: string[]
  isFieldPosition: boolean
  canCheckDh: boolean
  poolPlayers: Player[]
  onRemove: (playerId: number) => void
  onSetPosition: (playerId: number, position: string) => void
  onSetDhBatter: (fieldPlayerId: number, batter: Player | null) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onOpenSwap: (entry: LocalLineupEntry) => void
  firstBaseCoachRotation?: CoachRotationPair | null
  thirdBaseCoachRotation?: CoachRotationPair | null
}

export function LineupRow({
  entry, index, isFirst, isLast, availablePositions,
  isFieldPosition, canCheckDh, poolPlayers,
  onRemove, onSetPosition, onSetDhBatter, onMoveUp, onMoveDown, onOpenSwap,
  firstBaseCoachRotation, thirdBaseCoachRotation,
}: Props) {
  const battingOrder = index + 1
  const is1BCoach = firstBaseCoachRotation
    ? getPairPositions(firstBaseCoachRotation).includes(battingOrder)
    : false
  const is3BCoach = thirdBaseCoachRotation
    ? getPairPositions(thirdBaseCoachRotation).includes(battingOrder)
    : false
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.player.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  }

  const [showDhPicker, setShowDhPicker] = useState(false)

  const hasPosition = entry.position !== null && entry.position !== ''
  const hasDh = entry.dhBatterId !== null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`lineup-row group/row flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 min-h-[44px] ${
        isDragging ? 'shadow-lg bg-cream-50 rounded-lg' : ''
      } ${!hasPosition ? 'bg-amber-50' : ''}`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
      >
        <GripHandle size={16} />
      </button>

      {/* Number */}
      <span className="w-6 text-center text-xs font-display tabular-nums font-bold text-gray-400">
        {index + 1}
      </span>

      {/* Name — Tap/Click öffnet Swap-Sheet */}
      <button
        type="button"
        onClick={() => onOpenSwap(entry)}
        className="flex-1 min-w-0 flex items-center gap-1.5 text-left text-sm font-medium text-gray-900 px-1.5 py-1 -mx-1.5 -my-1 rounded hover:bg-cream-100 cursor-pointer group/swap"
        title="Spieler tauschen"
      >
        <span className="truncate min-w-0">{entry.player.name}</span>
        {is1BCoach && <CoachBadge label="1B" />}
        {is3BCoach && <CoachBadge label="3B" />}
        <ArrowsSwap
          size={12}
          className="shrink-0 text-gray-300 sm:opacity-0 sm:group-hover/swap:opacity-100 sm:group-hover/swap:text-navy-600 transition-opacity"
        />
      </button>

      {/* Position Dropdown */}
      <div className="relative w-16 sm:w-20">
        <select
          value={entry.position ?? ''}
          onChange={e => onSetPosition(entry.player.id, e.target.value)}
          className={`font-display appearance-none w-full text-xs font-bold tracking-wide border rounded-lg pl-2 pr-6 py-1.5 outline-none border-cream-300 bg-cream-50 hover:bg-white hover:border-navy-400 focus:border-navy-600 focus:ring-2 focus:ring-cream-200 cursor-pointer transition-colors ${
            !hasPosition ? 'text-gray-400' : 'text-navy-900'
          }`}
        >
          <option value="">Pos.</option>
          {availablePositions.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <ChevronDown size={12} className="text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* DH area — fixed-width spacer only while no DH is set (badge reclaims the space) */}
      {!hasDh && (
        <div className="w-8 shrink-0 flex items-center justify-center">
          {isFieldPosition && canCheckDh && !showDhPicker && (
            <button
              onClick={() => setShowDhPicker(true)}
              className="text-[11px] font-bold text-navy-500 hover:text-navy-700 hover:bg-navy-50 px-1.5 py-0.5 rounded transition-colors"
              title="Designated Hitter zuweisen"
            >
              +DH
            </button>
          )}
        </div>
      )}

      {/* DH picker dropdown */}
      {isFieldPosition && !hasDh && showDhPicker && (
        <div className="relative w-24 sm:w-28">
          <select
            value=""
            onChange={e => {
              const p = poolPlayers.find(pl => pl.id === Number(e.target.value))
              if (p) { onSetDhBatter(entry.player.id, p); setShowDhPicker(false) }
            }}
            onBlur={() => setShowDhPicker(false)}
            className="appearance-none w-full text-xs border border-navy-600 bg-cream-50 rounded-lg pl-2 pr-6 py-1.5 outline-none focus:ring-2 focus:ring-navy-100 cursor-pointer"
            autoFocus
          >
            <option value="">Wer schlägt?</option>
            {poolPlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="text-navy-600 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}

      {/* DH assigned badge */}
      {hasDh && (
        <button
          onClick={() => onSetDhBatter(entry.player.id, null)}
          className="flex items-center gap-1 shrink min-w-0 max-w-[5.5rem] sm:max-w-[7rem] text-xs font-medium text-navy-700 bg-navy-50 pl-2 pr-1 py-0.5 rounded-lg hover:bg-navy-100 transition-colors"
          title={`DH: ${entry.dhBatterName} — entfernen`}
        >
          <span className="truncate">DH: {entry.dhBatterName}</span>
          <XMark size={12} className="opacity-50 shrink-0" />
        </button>
      )}

      {/* Move Buttons */}
      <div className="flex flex-col">
        <button
          onClick={() => onMoveUp(index)}
          disabled={isFirst}
          className="p-0.5 text-gray-400 hover:text-navy-800 disabled:text-gray-200 disabled:cursor-default"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={() => onMoveDown(index)}
          disabled={isLast}
          className="p-0.5 text-gray-400 hover:text-navy-800 disabled:text-gray-200 disabled:cursor-default"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(entry.player.id)}
        className="p-1 text-gray-400 hover:text-softball-red-600"
      >
        <XMark size={14} />
      </button>
    </div>
  )
}

function CoachBadge({ label }: { label: string }) {
  return (
    <span
      className="font-mono inline-flex items-center justify-center min-w-[26px] h-[18px] px-1.5 text-[10px] font-extrabold tracking-widest uppercase rounded bg-navy-900 text-white shrink-0 shadow-sm"
      title={`${label}-Coach Rotation`}
    >
      {label}
    </span>
  )
}
