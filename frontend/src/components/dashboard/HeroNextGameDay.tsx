import { Link } from 'react-router-dom'
import type { GameDayResponse } from '@/types'

interface Props {
  gameDay: GameDayResponse
  variant: 'today' | 'upcoming' | 'past'
}

function formatHeroDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.toLocaleDateString('de-DE', { weekday: 'short' }).toUpperCase()
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }).toUpperCase()
  return `${day} · ${date}`
}

export function HeroNextGameDay({ gameDay, variant }: Props) {
  const stripeLabel = variant === 'today' ? 'Heute · Nächster Spieltag' : variant === 'upcoming' ? 'Nächster Spieltag' : 'Letzter Spieltag'
  const stripeBg = variant === 'past' ? 'bg-navy-700' : 'bg-softball-red-600'

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg shadow-navy-900/15">
      <div className={`${stripeBg} text-white px-4 py-1.5 flex items-center gap-2 font-display text-[11px] font-bold tracking-widest uppercase`}>
        {variant === 'today' && (
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
        )}
        {stripeLabel}
      </div>
      <div className="bg-navy-900 text-white px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-display font-extrabold text-xl sm:text-2xl tracking-wide leading-none">
            {formatHeroDate(gameDay.date)}
          </div>
          {gameDay.location && (
            <div className="text-[11px] sm:text-xs text-white/65 truncate">📍 {gameDay.location}</div>
          )}
        </div>
        {gameDay.games.length > 0 && (
          <div className="mt-2.5 space-y-1">
            {gameDay.games.map((g, i) => {
              const displayNum = i + 1
              const routeIdx = i  // 0-based array index — ScoringPage uses gameDay.games[gameIndex]
              // "Fertig" wenn beide Scores gesetzt ODER User hat lokal "Spiel beenden" geklickt
              const manuallyEnded = typeof window !== 'undefined' && localStorage.getItem(`scoring-ended-${g.id}`) === '1'
              const finished = manuallyEnded || (g.scoreUs != null && g.scoreThem != null)
              const result: 'W' | 'L' | 'T' | null = !finished
                ? null
                : (g.scoreUs ?? 0) > (g.scoreThem ?? 0) ? 'W'
                : (g.scoreUs ?? 0) < (g.scoreThem ?? 0) ? 'L' : 'T'
              const cls = finished
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : 'bg-white/8 border-white/15 hover:bg-white/15'
              const numCls = finished
                ? 'bg-white/10 text-white/60'
                : 'bg-white/15 text-white'
              return (
                <Link
                  key={g.id}
                  to={`/gameday/${gameDay.id}/scoring/${routeIdx}`}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-colors ${cls}`}
                >
                  <span className={`font-display w-6 h-6 rounded-md text-[11px] font-extrabold flex items-center justify-center shrink-0 ${numCls}`}>
                    {displayNum}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-display font-bold text-[13px] tracking-wide uppercase truncate ${finished ? 'text-white/70' : 'text-white'}`}>
                      {g.opponentTeam?.name ?? 'Gegner offen'}
                    </div>
                    {(g.scoreUs != null || g.scoreThem != null) && (
                      <div className="text-[10px] text-white/55">
                        {finished ? 'Endstand' : 'Stand'} {g.scoreUs ?? 0}–{g.scoreThem ?? 0}
                      </div>
                    )}
                  </div>
                  {finished ? (
                    <span className={`font-display text-[10px] font-extrabold tracking-widest uppercase shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md ${
                      result === 'W' ? 'bg-emerald-500/15 text-emerald-300'
                      : result === 'L' ? 'bg-softball-red-500/15 text-softball-red-200'
                      : 'bg-white/10 text-white/70'
                    }`}>
                      ✓ Fertig
                    </span>
                  ) : (
                    <span className="font-display text-[10px] font-bold tracking-widest uppercase shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 text-white/70 border border-white/15">
                      Offen
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
        <Link
          to={`/gameday/${gameDay.id}`}
          className="font-display mt-2.5 w-full h-10 rounded-lg bg-white/95 hover:bg-white text-navy-900 font-extrabold text-xs tracking-widest uppercase flex items-center justify-center gap-2 transition-colors"
        >
          📋 Lineup verwalten
        </Link>
      </div>
    </div>
  )
}
