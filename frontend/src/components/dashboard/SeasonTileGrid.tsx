import { Trophy, Medal, ChevronRight, CalendarDays, TrendingUp, Droplets } from 'lucide-react'
import type { GameDayResponse, PlayerBattingStatsResponse, WeatherResponse } from '@/types'
import { weatherIcon } from './weatherIcon'

interface Props {
  seasonId: number
  gameDays: GameDayResponse[]
  battingStats: PlayerBattingStatsResponse[]
  weather?: WeatherResponse | null
  nextGameDay?: GameDayResponse | null
  onOpenLiga: () => void
  onOpenAwards: () => void
  onOpenResults: () => void
  onOpenWeather: () => void
}

export function SeasonTileGrid({ gameDays, battingStats, weather, nextGameDay, onOpenLiga, onOpenAwards, onOpenResults, onOpenWeather }: Props) {
  // Liga-Stand: Win/Loss/Tie aus Spielen mit Score
  const games = gameDays.flatMap(gd => gd.games)
  const playedGames = games.filter(g => g.scoreUs != null && g.scoreThem != null)
  const wins = playedGames.filter(g => (g.scoreUs ?? 0) > (g.scoreThem ?? 0)).length
  const losses = playedGames.filter(g => (g.scoreUs ?? 0) < (g.scoreThem ?? 0)).length
  const ties = playedGames.filter(g => (g.scoreUs ?? 0) === (g.scoreThem ?? 0)).length

  // Letzte 4 Ergebnisse
  const recentResults = playedGames
    .slice(-4)
    .map(g => ((g.scoreUs ?? 0) > (g.scoreThem ?? 0) ? 'W' : (g.scoreUs ?? 0) < (g.scoreThem ?? 0) ? 'L' : 'T'))

  // Top Hitter: höchste battingAverage mit Min-Plate-Appearances
  const MIN_PA = 5
  const eligible = battingStats.filter(p => p.plateAppearances >= MIN_PA)
  const topHitter = eligible.length > 0
    ? [...eligible].sort((a, b) => b.battingAverage - a.battingAverage)[0]
    : null

  // Runs: gesamt gescort vs kassiert
  const runsScored = playedGames.reduce((s, g) => s + (g.scoreUs ?? 0), 0)
  const runsConceded = playedGames.reduce((s, g) => s + (g.scoreThem ?? 0), 0)
  const runDiff = runsScored - runsConceded

  const tileBase = 'text-left bg-cream-50 border border-cream-300 rounded-xl p-2.5 sm:p-3 md:p-4 flex flex-col shadow-sm shadow-navy-900/5 hover:border-navy-400 hover:shadow-md hover:shadow-navy-900/10 transition-all active:scale-[0.98] cursor-pointer'
  const iconHeader = 'flex items-center gap-1.5 mb-1'
  const labelCls = 'font-display text-[9px] sm:text-[10px] tracking-widest font-bold text-gray-500 uppercase'
  const bigCls = 'font-display text-lg sm:text-xl md:text-2xl font-extrabold text-navy-900 leading-none mt-0.5'
  const subCls = 'text-[10px] sm:text-[11px] text-gray-600 mt-0.5 leading-tight'

  const fmtAvg = (v: number) => {
    const s = v.toFixed(3)
    return s.startsWith('0') ? s.slice(1) : s
  }

  // Bento-Asymmetric: LIGA span-2 hero · TOP HITTER + RUNS 50/50 · ERGEBNISSE span-2 strip
  const heroBig = 'font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy-900 leading-none'

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
      {/* Row 1 — Wetter (nächster Spieltag) + Liga als halbe Kacheln, wenn Forecast vorliegt.
          Sonst Liga als span-2-Hero (kein leerer halber Slot). Wetter kostet so KEINE Extra-Zeile. */}
      {weather && nextGameDay ? (
        <>
          <button onClick={onOpenWeather} className={tileBase}>
            <div className={iconHeader}>
              {weatherIcon(weather.wmoCode, 18, 'text-navy-800')}
              <span className={labelCls}>Wetter</span>
            </div>
            <div className="flex items-end justify-between gap-2 mt-0.5">
              <div className="min-w-0">
                <div className={bigCls}>{weather.tempMin}–{weather.tempMax}°</div>
                <div className={`${subCls} truncate`}>{nextGameDay.location ?? 'Nächster Spieltag'}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-display text-base sm:text-lg font-extrabold leading-none inline-flex items-center gap-1 ${
                  weather.precipitationProbabilityPct >= 50 ? 'text-softball-red-600' : 'text-navy-800'
                }`}>
                  <Droplets size={13} className="shrink-0" />{weather.precipitationProbabilityPct}%
                </div>
                <div className={`${labelCls} text-[8px] sm:text-[9px]`}>Regen</div>
              </div>
            </div>
          </button>

          <button onClick={onOpenLiga} className={tileBase}>
            <div className={iconHeader}>
              <Trophy size={18} strokeWidth={2.2} className="text-navy-800" />
              <span className={labelCls}>Liga</span>
            </div>
            <div className="flex items-end justify-between gap-2 mt-0.5">
              <div className="min-w-0">
                <div className={bigCls}>{wins}–{losses}{ties > 0 ? `–${ties}` : ''}</div>
                <div className={subCls}>Bilanz</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-base sm:text-lg font-extrabold text-gray-300 leading-none">{playedGames.length}</div>
                <div className={`${labelCls} text-[8px] sm:text-[9px]`}>Spiele</div>
              </div>
            </div>
          </button>
        </>
      ) : (
        <button onClick={onOpenLiga} className={`${tileBase} col-span-2 flex-row items-center gap-3`}>
          <Trophy size={22} strokeWidth={2.2} className="text-navy-800 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className={labelCls}>Liga</div>
            <div className={heroBig}>{wins}–{losses}{ties > 0 ? `–${ties}` : ''}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-gray-300 leading-none">{playedGames.length}</div>
            <div className={`${labelCls} text-[8px] sm:text-[9px]`}>Spiele</div>
          </div>
        </button>
      )}

      {/* Row 2 — TOP HITTER + RUNS */}
      {/* Auszeichnungen-Kachel: Top Hitter als Teaser, Klick → Award-Sheet (Saison/Spieltag) */}
      <button onClick={onOpenAwards} className={tileBase}>
        <div className="flex items-center justify-between mb-1">
          <div className="inline-flex items-center gap-1.5">
            <Medal size={18} strokeWidth={2.2} className="text-softball-red-700" />
            <span className={labelCls}>Auszeichnungen</span>
          </div>
          <ChevronRight size={14} className="text-gray-400 shrink-0" />
        </div>
        <div className="font-display text-[9px] tracking-widest uppercase text-gray-400 font-bold leading-none mb-0.5">Top Hitter</div>
        {topHitter ? (
          <>
            <div className={`${bigCls} truncate`}>
              {fmtAvg(topHitter.battingAverage)}<span className="text-[10px] tracking-widest font-bold text-gray-500 ml-1">AVG</span>
            </div>
            <div className={`${subCls} truncate`}>{topHitter.playerName}</div>
          </>
        ) : (
          <>
            <div className="font-display text-base font-bold text-gray-400">—</div>
            <div className={subCls}>Titel ab erstem Spiel</div>
          </>
        )}
      </button>

      <button onClick={onOpenResults} className={tileBase}>
        <div className={iconHeader}>
          <TrendingUp size={18} strokeWidth={2.2} className="text-navy-800" />
          <span className={labelCls}>Runs</span>
        </div>
        {playedGames.length > 0 ? (
          <div className="flex items-end justify-between gap-2 mt-0.5">
            <div className="min-w-0">
              <div className={`${bigCls} inline-flex items-baseline gap-1`}>
                <span className="text-navy-800">{runsScored}</span>
                <span className="text-gray-400 text-xs">/</span>
                <span className="text-softball-red-700">{runsConceded}</span>
              </div>
              <div className={subCls}>geschossen / kassiert</div>
            </div>
            <div className="text-right shrink-0">
              <div className={`font-display text-base sm:text-lg font-extrabold leading-none ${runDiff > 0 ? 'text-emerald-600' : runDiff < 0 ? 'text-softball-red-600' : 'text-gray-400'}`}>
                {runDiff > 0 ? `+${runDiff}` : runDiff}
              </div>
              <div className={`${labelCls} text-[8px] sm:text-[9px]`}>Diff</div>
            </div>
          </div>
        ) : (
          <>
            <div className="font-display text-base font-bold text-gray-400 mt-0.5">—</div>
            <div className={subCls}>Keine Spiele</div>
          </>
        )}
      </button>

      {/* Row 3 — ERGEBNISSE Strip (span 2 cols) */}
      <button onClick={onOpenResults} className={`${tileBase} col-span-2 flex-row items-center gap-3`}>
        <CalendarDays size={20} strokeWidth={2.2} className="text-navy-800 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className={labelCls}>Ergebnisse</div>
          <div className="flex items-center gap-1.5 mt-1">
            {recentResults.length > 0 ? recentResults.map((r, i) => (
              <span
                key={i}
                className={`font-display w-6 h-6 sm:w-7 sm:h-7 rounded text-[10px] sm:text-xs font-extrabold text-white flex items-center justify-center ${
                  r === 'W' ? 'bg-emerald-600' : r === 'L' ? 'bg-softball-red-600' : 'bg-gray-500'
                }`}
              >{r}</span>
            )) : <span className="text-xs text-gray-400">Noch keine Spiele</span>}
          </div>
        </div>
        {recentResults.length > 0 && (
          <div className="text-right shrink-0">
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-gray-300 leading-none">{recentResults.length}</div>
            <div className={`${labelCls} text-[8px] sm:text-[9px]`}>Letzte</div>
          </div>
        )}
      </button>
    </div>
  )
}
