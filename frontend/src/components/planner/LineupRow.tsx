import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { LocalLineupEntry, Player } from '@/types'
import { GripHandle, ChevronUp, ChevronDown, XMark, ArrowsSwap } from '@/icons'

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
  onFillSlot: (slotId: number, player: Player) => void
}

export function LineupRow({
  entry, index, isFirst, isLast, availablePositions,
  isFieldPosition, canCheckDh, poolPlayers,
  onRemove, onSetPosition, onSetDhBatter, onMoveUp, onMoveDown, onOpenSwap, onFillSlot,
}: Props) {
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
      className={`lineup-row group/row flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 min-h-[44px] xl:py-1 xl:min-h-[2.375rem] ${
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

      {/* Schlagposition — der Bogen wird über diese Zahl gelesen, darum als
          eigene Spalte in Versalhöhe statt als kleingedruckte Randnotiz. */}
      <span className="w-6 text-center font-display text-[15px] leading-none tabular-nums font-extrabold text-navy-900/45">
        {index + 1}
      </span>

      {/* Name — leerer Slot zeigt Fill-Picker; sonst Tap/Click öffnet Swap-Sheet */}
      {entry.isEmptySlot ? (
        <div className="flex-1 min-w-[3rem] flex items-center gap-1.5">
          <span className="text-sm font-medium text-amber-700 shrink-0">— frei —</span>
          <div className="relative">
            <select
              value=""
              onChange={e => {
                const p = poolPlayers.find(pl => pl.id === Number(e.target.value))
                if (p) onFillSlot(entry.player.id, p)
              }}
              className="appearance-none text-xs border border-amber-400 bg-amber-50 rounded-lg pl-2 pr-6 py-1 outline-none focus:ring-2 focus:ring-amber-100 cursor-pointer"
            >
              <option value="">Spieler…</option>
              {poolPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="text-amber-600 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      ) : (
        /* Name und — falls gesetzt — der DH darunter. Der DH stand früher in
           derselben Zeile und drückte den Namen in schmalen Spalten auf zwei
           Buchstaben zusammen; untereinander bleibt beides lesbar. */
        <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => onOpenSwap(entry)}
            className="max-w-full flex items-center gap-1.5 text-left text-sm font-medium text-gray-900 px-1.5 py-1 -mx-1.5 -my-1 rounded hover:bg-cream-100 cursor-pointer group/swap"
            title="Spieler tauschen"
          >
            <span className="truncate min-w-0">{entry.player.name}</span>
            <ArrowsSwap
              size={12}
              className="shrink-0 text-gray-300 sm:opacity-0 sm:group-hover/swap:opacity-100 sm:group-hover/swap:text-navy-600 transition-opacity"
            />
          </button>
          {hasDh && (
            <button
              onClick={() => onSetDhBatter(entry.player.id, null)}
              className="max-w-full flex items-center gap-1 min-w-0 text-xs font-medium text-navy-700 bg-navy-50 pl-1.5 pr-1 py-0.5 rounded-lg hover:bg-navy-100 transition-colors"
              title={`DH: ${entry.dhBatterName} — entfernen`}
            >
              <span className="font-display text-[10px] font-extrabold tracking-widest text-navy-500 shrink-0">DH</span>
              <span className="truncate">{entry.dhBatterName}</span>
              <XMark size={12} className="opacity-50 shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* Position Dropdown */}
      <div className="relative w-16 sm:w-20">
        <select
          value={entry.position ?? ''}
          onChange={e => onSetPosition(entry.player.id, e.target.value)}
          className={`font-display appearance-none w-full text-xs font-bold tracking-wide border rounded-lg pl-2 pr-6 py-1.5 xl:py-1 outline-none focus:border-navy-600 focus:ring-2 focus:ring-cream-200 cursor-pointer transition-colors ${
            hasPosition
              ? 'text-navy-900 border-navy-300 bg-cream-50 hover:border-navy-500'
              : 'text-amber-700 border-amber-300 bg-amber-50 hover:border-amber-500'
          }`}
        >
          <option value="">Pos.</option>
          {availablePositions.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <ChevronDown size={12} className="text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* DH-Spalte — immer gleich breit, damit die Positions-Dropdowns aller Zeilen
          auf einer Flucht stehen (die Zeile mit gesetztem DH sprang sonst heraus). */}
      {!showDhPicker && (
        <div className="w-8 shrink-0 flex items-center justify-center">
          {isFieldPosition && canCheckDh && !hasDh && (
            <button
              onClick={() => setShowDhPicker(true)}
              className="text-[11px] font-bold text-navy-500 hover:text-navy-700 hover:bg-navy-50 px-1.5 py-0.5 rounded transition-[color,background-color,opacity] [@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
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

      {/* Hoch/Runter — auf Zeigegeräten erst beim Hovern der Zeile sichtbar (wie
          Stift/Papierkorb überall sonst). Ziehen ist dort der schnellere Weg, die
          Pfeile bleiben aber als Tastatur-Pfad erhalten und tauchen bei :focus auf. */}
      <div className="flex flex-col xl:flex-row transition-opacity [@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-hover/row:opacity-100 focus-within:opacity-100">
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
