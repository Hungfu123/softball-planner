import type { GameDayResponse, PlayerBattingStatsResponse } from '@/types'

interface Props {
  seasonId: number
  gameDays: GameDayResponse[]
  battingStats: PlayerBattingStatsResponse[]
  onOpenLiga: () => void
  onOpenStats: () => void
  onOpenResults: () => void
}

export function SeasonTileGrid({ gameDays, battingStats, onOpenLiga, onOpenStats, onOpenResults }: Props) {
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

  const tileBase = 'text-left bg-cream-50 border border-cream-300 rounded-2xl p-3 sm:p-4 hover:border-navy-400 hover:bg-white transition-colors active:scale-[0.98] cursor-pointer'

  const fmtAvg = (v: number) => {
    const s = v.toFixed(3)
    return s.startsWith('0') ? s.slice(1) : s
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <button onClick={onOpenLiga} className={tileBase}>
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-base mb-2">🏆</div>
        <div className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">Liga</div>
        <div className="font-display text-2xl sm:text-3xl font-extrabold text-navy-900 leading-none mt-0.5">
          {wins}–{losses}{ties > 0 ? `–${ties}` : ''}
        </div>
        <div className="text-[11px] text-gray-600 mt-0.5">{playedGames.length} Spiele</div>
      </button>

      <button onClick={onOpenStats} className={tileBase}>
        <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center text-base mb-2">⚾</div>
        <div className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">Top Hitter</div>
        {topHitter ? (
          <>
            <div className="font-display text-xl sm:text-2xl font-extrabold text-navy-900 leading-none mt-0.5 truncate">
              {fmtAvg(topHitter.battingAverage)}<span className="text-[11px] tracking-widest font-bold text-gray-500 ml-1">AVG</span>
            </div>
            <div className="text-[11px] text-gray-600 mt-0.5 truncate">{topHitter.playerName}</div>
          </>
        ) : (
          <>
            <div className="font-display text-xl font-bold text-gray-400 mt-0.5">—</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Min. {MIN_PA} PA nötig</div>
          </>
        )}
      </button>

      <button onClick={onOpenResults} className={tileBase}>
        <div className="w-8 h-8 rounded-lg bg-cream-200 text-gray-700 flex items-center justify-center text-base mb-2">📅</div>
        <div className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">Ergebnisse</div>
        <div className="flex gap-1 mt-1.5 mb-0.5">
          {recentResults.length > 0 ? recentResults.map((r, i) => (
            <span
              key={i}
              className={`font-display w-5 h-5 sm:w-6 sm:h-6 rounded text-[10px] sm:text-xs font-extrabold text-white flex items-center justify-center ${
                r === 'W' ? 'bg-emerald-600' : r === 'L' ? 'bg-softball-red-600' : 'bg-gray-500'
              }`}
            >{r}</span>
          )) : <span className="text-xs text-gray-400">Noch keine Spiele</span>}
        </div>
        {recentResults.length > 0 && <div className="text-[11px] text-gray-600">letzte {recentResults.length}</div>}
      </button>

      <button onClick={onOpenResults} className={tileBase}>
        <div className="w-8 h-8 rounded-lg bg-softball-red-50 text-softball-red-700 flex items-center justify-center text-base mb-2">📊</div>
        <div className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">Runs</div>
        {playedGames.length > 0 ? (
          <>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-navy-900 leading-none mt-0.5 inline-flex items-baseline gap-1">
              <span className="text-emerald-700">{runsScored}</span>
              <span className="text-gray-400 text-base">/</span>
              <span className="text-softball-red-700">{runsConceded}</span>
            </div>
            <div className="text-[11px] text-gray-600 mt-0.5">
              Diff {runDiff > 0 ? `+${runDiff}` : runDiff}
            </div>
          </>
        ) : (
          <>
            <div className="font-display text-xl font-bold text-gray-400 mt-0.5">—</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Noch keine Spiele</div>
          </>
        )}
      </button>
    </div>
  )
}
