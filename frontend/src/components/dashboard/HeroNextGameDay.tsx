import { Link } from 'react-router-dom'
import { MapPin, Check, ClipboardList } from 'lucide-react'
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
      <div className="bg-navy-900 text-white px-3.5 py-2.5 sm:px-5 sm:py-4 md:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="font-display font-extrabold text-lg sm:text-2xl md:text-3xl tracking-wide leading-none">
            {formatHeroDate(gameDay.date)}
          </div>
          {gameDay.location && (
            <div className="text-[10px] sm:text-xs text-white/65 truncate inline-flex items-center gap-1 shrink-0">
              <MapPin size={11} className="shrink-0" /> {gameDay.location}
            </div>
          )}
        </div>
        {gameDay.games.length > 0 && (
          <div className="mt-2 sm:mt-3 space-y-0.5 sm:space-y-1">
            {gameDay.games.map((g, i) => {
              const displayNum = i + 1
              const routeIdx = i  // 0-based array index — ScoringPage uses gameDay.games[gameIndex]
              // FERTIG: Backend `endedAt` ist die Wahrheit. Cross-Device-konsistent.
              // Score-Presence (auch 0–0) zählt NICHT als Ende — Spiel kann mid-game 0–0 sein.
              const finished = g.endedAt != null
              // LIVE: nicht fertig + atBats > 0 (Backend-Flag)
              const isLive = !finished && (g.atBatCount ?? 0) > 0
              const hasScore = g.scoreUs != null && g.scoreThem != null
              const result: 'W' | 'L' | 'T' | null = !finished || !hasScore
                ? null
                : (g.scoreUs ?? 0) > (g.scoreThem ?? 0) ? 'W'
                : (g.scoreUs ?? 0) < (g.scoreThem ?? 0) ? 'L' : 'T'
              const cls = finished
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : isLive
                ? 'bg-softball-red-600/20 border-softball-red-400/40 hover:bg-softball-red-600/30'
                : 'bg-white/8 border-white/15 hover:bg-white/15'
              const numCls = finished
                ? 'bg-white/10 text-white/60'
                : isLive
                ? 'bg-softball-red-500 text-white'
                : 'bg-white/15 text-white'
              return (
                <div
                  key={g.id}
                  className={`flex items-stretch gap-1 rounded-lg border transition-colors ${cls}`}
                >
                  <Link
                    to={`/gameday/${gameDay.id}?game=${routeIdx}`}
                    className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-l-lg hover:bg-white/5"
                    aria-label={`Lineup für Spiel ${displayNum}`}
                  >
                    <span className={`font-display w-5 h-5 sm:w-6 sm:h-6 rounded text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center shrink-0 ${numCls}`}>
                      {displayNum}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-display font-bold text-[12px] sm:text-[13px] tracking-wide uppercase truncate ${finished ? 'text-white/70' : 'text-white'}`}>
                        {g.opponentTeam?.name ?? 'Gegner offen'}
                      </div>
                      {(g.scoreUs != null || g.scoreThem != null) && (
                        <div className="text-[9.5px] sm:text-[10px] text-white/55 leading-tight">
                          {finished ? 'Endstand' : 'Stand'} {g.scoreUs ?? 0}–{g.scoreThem ?? 0}
                        </div>
                      )}
                    </div>
                  </Link>
                  <Link
                    to={`/gameday/${gameDay.id}/scoring/${routeIdx}`}
                    className="shrink-0 flex items-center px-1.5 my-0.5 rounded-md hover:bg-white/10"
                    aria-label={`${finished ? 'Stats' : 'Live-Scoring'} für Spiel ${displayNum}`}
                  >
                    {finished ? (
                      <span className={`font-display text-[10px] font-extrabold tracking-widest uppercase inline-flex items-center gap-1 px-2 py-1 rounded-md ${
                        result === 'W' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                        : result === 'L' ? 'bg-softball-red-500/20 text-softball-red-100 border border-softball-red-400/40'
                        : 'bg-cream-50 text-navy-900 border border-cream-200'
                      }`}>
                        <Check size={10} strokeWidth={3} /> {result === 'W' ? 'Sieg' : result === 'L' ? 'Niederlage' : 'Fertig'}
                      </span>
                    ) : isLive ? (
                      <span className="font-display text-[10px] font-extrabold tracking-widest uppercase inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-softball-red-600 text-white border border-softball-red-400/60">
                        <span className="relative flex w-1.5 h-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                        Live
                      </span>
                    ) : (
                      <span className="font-display text-[10px] font-bold tracking-widest uppercase inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 text-white/80 border border-white/15">
                        Offen
                      </span>
                    )}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
        <Link
          to={`/gameday/${gameDay.id}`}
          className="font-display mt-2 sm:mt-3 w-full h-9 sm:h-10 rounded-lg bg-white/95 hover:bg-white text-navy-900 font-extrabold text-[11px] sm:text-xs tracking-widest uppercase flex items-center justify-center gap-1.5 transition-colors"
        >
          <ClipboardList size={13} /> Lineup verwalten
        </Link>
      </div>
    </div>
  )
}
