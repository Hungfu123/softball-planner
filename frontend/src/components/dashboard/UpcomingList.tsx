import { Link } from 'react-router-dom'
import type { GameDayResponse } from '@/types'

interface Props {
  gameDays: GameDayResponse[]
  showAll: boolean
  onShowAll: () => void
  onShowLess: () => void
  visibleCount?: number
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

export function UpcomingList({ gameDays, showAll, onShowAll, onShowLess, visibleCount = 3 }: Props) {
  if (gameDays.length === 0) return null

  const visible = showAll ? gameDays : gameDays.slice(0, visibleCount)
  const hidden = Math.max(0, gameDays.length - visibleCount)

  return (
    <div className="space-y-1.5">
      {visible.map(gd => (
        <Link
          key={gd.id}
          to={`/gameday/${gd.id}`}
          className="flex items-center gap-3 px-3 py-2.5 bg-cream-50 border border-cream-300 rounded-xl hover:border-navy-400 hover:bg-white transition-colors active:scale-[0.99]"
        >
          <span className="font-display text-sm font-extrabold text-navy-900 tracking-wider min-w-[64px]">
            {formatPill(gd.date)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13px] text-gray-900 truncate">
              {gd.label || (gd.location ? gd.location : 'Spieltag')}
            </div>
            <div className="text-[11px] text-gray-500 truncate">{summary(gd)}</div>
          </div>
          <span className="text-gray-400 text-lg shrink-0">›</span>
        </Link>
      ))}
      {!showAll && hidden > 0 && (
        <button
          onClick={onShowAll}
          className="font-display w-full mt-1 text-[12px] font-bold tracking-wider uppercase text-navy-700 bg-transparent border border-dashed border-cream-300 hover:border-navy-500 hover:bg-cream-50 rounded-xl py-2 cursor-pointer"
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

