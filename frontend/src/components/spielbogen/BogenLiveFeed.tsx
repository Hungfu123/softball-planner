import type { BogenSide, BogenTeamTotals } from '@/types'
import { halfInningId, type HalfInning } from '@/utils/bogenFeed'

export interface BogenLiveFeedProps {
  homeTeamName: string
  awayTeamName: string
  status: 'DRAFT' | 'LIVE' | 'DONE'
  currentInning: number
  currentSide: BogenSide
  homeRuns: number
  awayRuns: number
  inningRuns: Record<number, { home: number; away: number }>
  homeTotals: BogenTeamTotals
  awayTotals: BogenTeamTotals
  feed: HalfInning[]
  /** Slot-Name des aktuellen Batters, optional. */
  currentBatterName?: string | null
}

/** Regelspiel geht über 7 Innings, Extra-Innings hängen rechts an. */
const REGULAR_INNINGS = 7

// currentInning muss mit rein: ein torloses Extra-Inning erzeugt keinen inningRuns-Key,
// die Spalte würde sonst fehlen — obwohl der Feed darunter schon "8. Inning" zeigt.
function inningColumns(inningRuns: Record<number, { home: number; away: number }>, currentInning: number): number[] {
  const highest = Object.keys(inningRuns).reduce((max, k) => Math.max(max, Number(k)), 0)
  const count = Math.max(REGULAR_INNINGS, highest, currentInning)
  return Array.from({ length: count }, (_, i) => i + 1)
}

export function BogenLiveFeed({
  homeTeamName, awayTeamName, status, currentInning, currentSide,
  homeRuns, awayRuns, inningRuns, homeTotals, awayTotals, feed, currentBatterName,
}: BogenLiveFeedProps) {
  const columns = inningColumns(inningRuns, currentInning)
  const played = new Set(feed.map(h => halfInningId(h.inning, h.side)))

  const jumpTo = (inning: number, side: BogenSide) => {
    document.getElementById(halfInningId(inning, side))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      {/* Scoreboard — einziger dunkler Block, damit der Stand sofort gefunden wird */}
      <div data-testid="scoreboard" className="bg-navy-900 text-cream-50 px-5 pt-3 pb-3">
        <div className="flex items-center justify-between py-0.5">
          <span className="font-display text-xl uppercase tracking-wide opacity-70">{awayTeamName}</span>
          <span className="font-display text-2xl font-extrabold">{awayRuns}</span>
        </div>
        <div className="flex items-center justify-between py-0.5">
          <span className="font-display text-xl uppercase tracking-wide">{homeTeamName}</span>
          <span className="font-display text-2xl font-extrabold">{homeRuns}</span>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-navy-600 flex items-center gap-3 font-display text-xs uppercase tracking-widest text-navy-100">
          <span className="text-cream-50 text-sm">
            {currentSide === 'AWAY' ? '▲' : '▼'} {currentInning}. Inning
          </span>
          {status === 'DONE' && <span className="text-cream-50">Endstand</span>}
          {currentBatterName && <span className="ml-auto">{currentBatterName} am Schlag</span>}
        </div>
      </div>

      {/* Linescore — Zellen sind Sprungziele */}
      <div className="overflow-x-auto bg-cream-100 border-b border-cream-300">
        <table className="w-full font-display text-sm whitespace-nowrap">
          <thead>
            <tr className="text-[10px] tracking-wider text-gray-500">
              <th className="text-left pl-5 py-1.5 font-bold"></th>
              {columns.map(i => <th key={i} className="py-1.5 px-1 font-bold text-center">{i}</th>)}
              <th className="py-1.5 px-1 text-center font-bold border-l border-cream-300">R</th>
              <th className="py-1.5 px-1 text-center font-bold">H</th>
              <th className="py-1.5 pr-5 pl-1 text-center font-bold">E</th>
            </tr>
          </thead>
          <tbody>
            {([
              { side: 'AWAY' as const, name: awayTeamName, totals: awayTotals },
              { side: 'HOME' as const, name: homeTeamName, totals: homeTotals },
            ]).map(row => (
              <tr key={row.side} data-testid={`linescore-row-${row.side}`} className="border-t border-cream-200">
                <td className="text-left pl-5 py-1 text-xs font-bold text-navy-800">{row.name}</td>
                {columns.map(i => {
                  const runs = inningRuns[i]
                  const value = row.side === 'HOME' ? runs?.home : runs?.away
                  const canJump = played.has(halfInningId(i, row.side))
                  return (
                    <td key={i} className="p-0 text-center">
                      <button
                        type="button"
                        data-testid={`linescore-cell-${i}-${row.side}`}
                        disabled={!canJump}
                        onClick={() => jumpTo(i, row.side)}
                        className={`w-full py-1 px-1 ${canJump ? 'cursor-pointer hover:bg-cream-200' : 'text-gray-400'}`}
                      >
                        {canJump ? (value ?? 0) : '–'}
                      </button>
                    </td>
                  )
                })}
                <td className="py-1 px-1 text-center font-extrabold text-softball-red-700 border-l border-cream-300">{row.totals.runs}</td>
                <td className="py-1 px-1 text-center font-extrabold text-navy-900">{row.totals.hits}</td>
                <td className="py-1 pr-5 pl-1 text-center font-extrabold text-navy-900">{row.totals.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Play-by-Play */}
      {status === 'DRAFT' && (
        <p className="px-5 py-8 text-center text-sm text-gray-500 font-body">
          Das Spiel ist noch nicht gestartet.
        </p>
      )}
      {status !== 'DRAFT' && feed.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-gray-500 font-body">
          Spiel läuft — noch nichts passiert.
        </p>
      )}

      {feed.map((half, index) => (
        <div key={halfInningId(half.inning, half.side)} id={halfInningId(half.inning, half.side)}>
          <div className="sticky top-0 flex items-center gap-2 px-5 pt-2 pb-1.5 bg-cream-100 border-b border-cream-200 font-display text-xs uppercase tracking-widest text-navy-700">
            <span className="text-softball-red-600">{half.side === 'AWAY' ? '▲' : '▼'}</span>
            {half.inning}. Inning — {half.side === 'HOME' ? homeTeamName : awayTeamName}
            {index === 0 && status === 'LIVE' && (
              <span className="ml-auto bg-softball-red-600 text-white text-[9px] tracking-widest px-2 py-0.5 rounded-full">LIVE</span>
            )}
          </div>

          {half.events.map(ev => (
            <div
              key={ev.key}
              data-testid={`event-${ev.key}`}
              data-scored={String(ev.scored)}
              data-minor={String(ev.minor)}
              className={`flex items-baseline gap-2.5 py-2 border-b border-cream-200 text-sm ${
                ev.scored ? 'bg-amber-50 border-l-[3px] border-l-amber-500 pl-[17px] pr-5' : 'px-5'
              } ${ev.minor ? 'italic text-gray-500' : ''}`}
            >
              <span className={`font-display text-[15px] tracking-wide shrink-0 w-24 ${ev.minor ? 'text-gray-500' : 'text-navy-900'}`}>
                {ev.who}
              </span>
              <span className={`flex-1 ${ev.scored ? 'text-navy-900 font-semibold' : ''}`}>{ev.what}</span>
              {ev.rbi > 0 && (
                <span className="font-display text-[11px] tracking-wide px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0">
                  +{ev.rbi} RBI
                </span>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2.5 px-5 py-1.5 bg-cream-200 font-display text-xs tracking-widest text-gray-600">
            <span className="flex-1 h-px bg-cream-300" />
            {/* Away zuerst — gleiche Konvention wie Scoreboard und Linescore */}
            <b className="text-navy-800 text-[13px]">{half.scoreAfter.away} : {half.scoreAfter.home}</b>
            <span className="flex-1 h-px bg-cream-300" />
          </div>
        </div>
      ))}
    </div>
  )
}
