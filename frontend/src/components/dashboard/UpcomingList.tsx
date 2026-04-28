import { Link } from 'react-router-dom'
import type { GameDayResponse } from '@/types'
import { Pencil, TrashBin } from '@/icons'

interface Props {
  gameDays: GameDayResponse[]
  showAll: boolean
  onShowAll: () => void
  onShowLess: () => void
  visibleCount?: number
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
}

const DAYS = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA']

function formatPill(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
}

function summary(gd: GameDayResponse): string {
  const opps = gd.games.map(g => g.opponentTeam?.name).filter((n): n is string => Boolean(n))
  const uniqueOpps = Array.from(new Set(opps))
  const oppPart = uniqueOpps.length === 0 ? '' : `vs ${uniqueOpps.join(', ')}`
  const gamesPart = `${gd.games.length} Spiel${gd.games.length === 1 ? '' : 'e'}`
  return [oppPart, gamesPart].filter(Boolean).join(' · ')
}

export function UpcomingList({ gameDays, showAll, onShowAll, onShowLess, visibleCount = 3, onEdit, onDelete }: Props) {
  if (gameDays.length === 0) return null

  const visible = showAll ? gameDays : gameDays.slice(0, visibleCount)
  const hidden = Math.max(0, gameDays.length - visibleCount)
  const hasActions = !!(onEdit || onDelete)

  return (
    <div className="space-y-1">
      {visible.map(gd => (
        <div
          key={gd.id}
          className="group flex items-center gap-2.5 sm:gap-3 px-2.5 py-1.5 sm:px-3 sm:py-2.5 bg-cream-50 border border-cream-300 rounded-lg sm:rounded-xl hover:border-navy-400 hover:bg-white transition-colors"
        >
          <Link to={`/gameday/${gd.id}`} className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 active:scale-[0.99]">
            <span className="font-display text-[12px] sm:text-sm font-extrabold text-navy-900 tracking-wider min-w-[58px] sm:min-w-[64px]">
              {formatPill(gd.date)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[12px] sm:text-[13px] text-gray-900 truncate leading-tight">
                {gd.label || (gd.location ? gd.location : 'Spieltag')}
              </div>
              <div className="text-[10.5px] sm:text-[11px] text-gray-500 truncate leading-tight">{summary(gd)}</div>
            </div>
          </Link>
          {hasActions ? (
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(gd.id) }}
                  className="p-1.5 text-gray-400 hover:text-navy-800 rounded hover:bg-cream-100 cursor-pointer"
                  title="Bearbeiten"
                  aria-label="Spieltag bearbeiten"
                >
                  <Pencil size={14} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(gd.id) }}
                  className="p-1.5 text-gray-400 hover:text-softball-red-600 rounded hover:bg-softball-red-50 cursor-pointer"
                  title="Löschen"
                  aria-label="Spieltag löschen"
                >
                  <TrashBin size={14} />
                </button>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm sm:text-lg shrink-0">›</span>
          )}
        </div>
      ))}
      {!showAll && hidden > 0 && (
        <button
          onClick={onShowAll}
          className="font-display w-full mt-1 text-[11px] font-bold tracking-wider uppercase text-navy-700 bg-transparent border border-dashed border-cream-300 hover:border-navy-500 hover:bg-cream-50 rounded-lg py-1.5 cursor-pointer"
        >
          + {hidden} weitere{hidden === 1 ? 'r' : ''} Spieltag{hidden === 1 ? '' : 'e'} anzeigen
        </button>
      )}
      {showAll && hidden > 0 && (
        <button
          onClick={onShowLess}
          className="w-full mt-1 text-[12px] text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          Weniger anzeigen
        </button>
      )}
    </div>
  )
}

