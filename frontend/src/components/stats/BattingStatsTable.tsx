import { useMemo, useState } from 'react'
import { Trophy, ChevronDown, ChevronUp, Info, Zap } from 'lucide-react'
import type { PlayerBattingStatsResponse } from '@/types'

interface Props {
  stats: PlayerBattingStatsResponse[]
  onOpenGlossary?: () => void
}

export function BattingStatsTable({ stats, onOpenGlossary }: Props) {
  const [showDetails, setShowDetails] = useState(false)

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      const bDiff = Number(b.battingAverage) - Number(a.battingAverage)
      if (bDiff !== 0) return bDiff
      return b.hits - a.hits || a.playerName.localeCompare(b.playerName)
    })
  }, [stats])

  const maxBA = useMemo(() => Math.max(...sorted.map(s => Number(s.battingAverage)), 0.001), [sorted])

  if (stats.length === 0) {
    return (
      <div className="bg-cream-50 border border-cream-300 rounded-xl p-12 text-center text-gray-500">
        <p className="mb-2">Noch keine Schlag-Daten in diesem Zeitraum.</p>
        <p className="text-xs">Scort ein paar At-Bats in einem Spiel um Stats zu sehen.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-2">
        <button
          onClick={() => setShowDetails(x => !x)}
          className="font-display px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-full border border-cream-300 text-gray-700 hover:bg-cream-100 hover:border-navy-400 cursor-pointer inline-flex items-center gap-1.5"
        >
          {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showDetails ? 'Weniger' : 'Mehr Details (OBP, SLG, OPS)'}
        </button>
        {onOpenGlossary && (
          <button
            onClick={onOpenGlossary}
            className="font-display px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-full border border-cream-300 text-navy-700 hover:bg-cream-100 hover:border-navy-400 cursor-pointer inline-flex items-center gap-1.5"
          >
            <Info size={12} />
            Abkürzungen
          </button>
        )}
      </div>

      {/* Table — 60/30/10: White 60% / Navy 30% / Softball-Red 10% */}
      <div className="bg-cream-50 border border-cream-300 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900 text-white">
                <th className="font-display text-left px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">#</th>
                <th className="font-display text-left px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">Spieler</th>
                <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">Schlag</th>
                <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">Treffer</th>
                <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest cursor-help" onClick={onOpenGlossary} title="Batting Average (AVG)">
                  AVG
                </th>
                <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">Quote</th>
                <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">Walks</th>
                <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">K</th>
                <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">HR</th>
                <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">SB</th>
                {showDetails && (
                  <>
                    <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">Hits 1/2/3/HR</th>
                    <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest cursor-help" onClick={onOpenGlossary} title="Auf-Base-Quote (OBP)">OBP</th>
                    <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest cursor-help" onClick={onOpenGlossary} title="Schlagstärke (SLG)">SLG</th>
                    <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest cursor-help" onClick={onOpenGlossary} title="OBP + SLG = Gesamtstärke">OPS</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, idx) => {
                const baPct = Math.round(Number(s.battingAverage) * 100)
                const barWidth = Math.round((Number(s.battingAverage) / maxBA) * 100)
                const isTop = idx === 0 && s.atBats > 0
                const dimZero = (v: number) => v === 0 ? 'text-gray-300' : 'text-navy-900'
                return (
                  <tr
                    key={s.playerId}
                    className={`border-b border-cream-200 last:border-0 transition-colors hover:bg-softball-red-50/40 ${
                      idx % 2 === 1 ? 'bg-cream-100/70' : 'bg-cream-50'
                    }`}
                  >
                    {/* Rang — Top-1 in Softball-Red (10% Accent) */}
                    <td className={`font-display px-3 py-2 text-left tabular-nums font-extrabold ${isTop ? 'text-softball-red-600' : 'text-gray-400'}`}>
                      {isTop ? <Trophy size={16} className="text-softball-red-600" /> : idx + 1}
                    </td>
                    {/* Spieler — Navy für Hierarchie */}
                    <td className="px-3 py-2 font-display font-bold text-navy-900 whitespace-nowrap tracking-wide">{s.playerName}</td>
                    <td className="px-3 py-2 text-right font-display tabular-nums text-gray-700">{s.atBats}</td>
                    <td className="px-3 py-2 text-right font-display tabular-nums text-gray-700">{s.hits}</td>
                    {/* AVG — Headline-Metrik prominent in Navy */}
                    <td className="px-3 py-2 text-right font-display tabular-nums font-extrabold text-navy-900 text-base">
                      {formatDec(Number(s.battingAverage))}
                    </td>
                    {/* Quote mit Balken — Softball-Red (10% Accent) */}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 sm:w-16 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                          <div className="h-full bg-softball-red-600 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="font-semibold text-navy-900 w-10 text-right tabular-nums text-xs">
                          {baPct}%
                        </span>
                      </div>
                    </td>
                    <td className={`px-3 py-2 text-right font-display tabular-nums ${dimZero(s.walks)}`}>{s.walks}</td>
                    <td className={`px-3 py-2 text-right font-display tabular-nums ${dimZero(s.strikeouts)}`}>{s.strikeouts}</td>
                    {/* HR — wenn > 0, Softball-Red Akzent */}
                    <td className={`px-3 py-2 text-right font-display tabular-nums font-bold ${
                      s.homeRuns > 0 ? 'text-softball-red-600' : 'text-gray-300'
                    }`}>
                      {s.homeRuns > 0 ? (
                        <span className="inline-flex items-center gap-0.5">{s.homeRuns} <Zap size={11} /></span>
                      ) : '0'}
                    </td>
                    <td className={`px-3 py-2 text-right font-display tabular-nums ${dimZero(s.stolenBases)}`}>{s.stolenBases}</td>
                    {showDetails && (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-600 text-xs" title="Single / Double / Triple / HR">
                          {s.singles}/{s.doubles}/{s.triples}/{s.homeRuns}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-navy-900">{formatPct(Number(s.onBasePct))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-navy-900">{formatDec(Number(s.sluggingPct))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-navy-900 font-bold">{formatDec(Number(s.ops))}</td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function formatPct(val: number): string {
  return `${Math.round(val * 100)} %`
}

function formatDec(val: number): string {
  return val.toFixed(3).replace(/^0\./, '.')
}
