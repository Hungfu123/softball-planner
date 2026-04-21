import { Link } from 'react-router-dom'
import type { GameDayResponse } from '@/types'
import { TrashBin, Pencil } from '@/icons'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface Props {
  gameDay: GameDayResponse
  isNext?: boolean
  onDelete: (id: number) => void
  onEdit: (id: number) => void
}

export function GameDayCard({ gameDay, isNext, onDelete, onEdit }: Props) {
  const playerCount = gameDay.availablePlayers.length
  const totalGames = gameDay.games.length
  const gamesWithOpponent = gameDay.games.filter(g => g.opponentTeam)
  const openGames = totalGames - gamesWithOpponent.length
  const gamesWithCompleteLineup = gameDay.games.filter(g => g.lineupEntryCount >= 9).length
  const gamesWithPartialLineup = gameDay.games.filter(g => g.lineupEntryCount > 0 && g.lineupEntryCount < 9).length
  const allLineupsReady = totalGames > 0 && gamesWithCompleteLineup === totalGames

  return (
    <Link
      to={`/gameday/${gameDay.id}`}
      className={`block rounded-xl p-4 shadow-sm hover:shadow-md hover:border-navy-600 hover:bg-navy-50/50 transition-all group relative bg-white border border-gray-200 ${
        isNext ? 'border-l-4 border-l-navy-600' : allLineupsReady ? 'border-l-4 border-l-navy-600' : ''
      }`}
    >
      <div className="absolute top-3 right-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(gameDay.id) }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
          title="Bearbeiten"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(gameDay.id) }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer"
          title="Löschen"
        >
          <TrashBin size={16} />
        </button>
      </div>

      {isNext && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-navy-600 mb-1 block">Nächster Spieltag</span>
      )}
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
        {formatDate(gameDay.date)}
      </div>
      <h3 className="font-semibold text-gray-950 mt-1">
        {gameDay.label || 'Spieltag'}
      </h3>
      {gameDay.location && (
        <div className="text-sm text-gray-600 mt-0.5">@ {gameDay.location}</div>
      )}

      {/* Game details */}
      <div className="mt-2 space-y-1">
        {playerCount > 0 && (
          <div className="text-sm text-gray-600">{playerCount} Spieler</div>
        )}
        {gamesWithOpponent.map(g => (
          <div key={g.id} className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500">vs {g.opponentTeam!.name}</span>
            {g.scoreUs != null && (
              <span className={`font-mono font-semibold ${
                g.scoreUs > g.scoreThem! ? 'text-emerald-700' : g.scoreUs < g.scoreThem! ? 'text-softball-red-600' : 'text-gray-500'
              }`}>
                {g.scoreUs}:{g.scoreThem}
              </span>
            )}
          </div>
        ))}
        {openGames > 0 && (
          <div className="text-xs text-gray-500">
            {openGames === totalGames ? `${totalGames} Spiele` : `+ ${openGames} ohne Gegner`}
          </div>
        )}
        {allLineupsReady ? (
          <div className="text-xs font-medium text-navy-600 mt-1">Lineups fertig</div>
        ) : (gamesWithCompleteLineup > 0 || gamesWithPartialLineup > 0) ? (
          <div className="text-xs font-medium text-softball-red-500 mt-1">{gamesWithCompleteLineup}/{totalGames} Lineups</div>
        ) : playerCount === 0 && gamesWithOpponent.length === 0 ? (
          <span className="text-sm text-gray-400">— offen —</span>
        ) : null}
      </div>
    </Link>
  )
}
