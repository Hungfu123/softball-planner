import { useMemo, useState } from 'react'
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
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
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
          className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
        >
          {showDetails ? '▲ Weniger' : '▼ Mehr Details (OBP, SLG, OPS)'}
        </button>
        {onOpenGlossary && (
          <button
            onClick={onOpenGlossary}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-navy-100 text-navy-700 hover:bg-navy-200 cursor-pointer inline-flex items-center gap-1"
          >
            <span className="inline-flex w-4 h-4 items-center justify-center rounded-full bg-navy-600 text-white text-[10px] font-bold">i</span>
            Abkürzungen
          </button>
        )}
      </div>

      {/* Table — 60/30/10: White 60% / Navy 30% / Softball-Red 10% */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900 text-white">
                <th className="text-left px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider">#</th>
                <th className="text-left px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider">Spieler</th>
                <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider">Schlag</th>
                <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider">Treffer</th>
                <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider cursor-help" onClick={onOpenGlossary} title="Batting Average (AVG) — Softball-Standard z.B. .333">
                  AVG <span className="text-[9px] text-white/60">ⓘ</span>
                </th>
                <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider">Quote</th>
                <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider">Walks</th>
                <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider">K</th>
                <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider">HR</th>
                <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider">SB</th>
                {showDetails && (
                  <>
                    <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider">Hits 1/2/3/HR</th>
                    <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider cursor-help" onClick={onOpenGlossary} title="Auf-Base-Quote (OBP)">
                      OBP <span className="text-[9px] text-white/60">ⓘ</span>
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider cursor-help" onClick={onOpenGlossary} title="Schlagstärke (SLG)">
                      SLG <span className="text-[9px] text-white/60">ⓘ</span>
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-[11px] uppercase tracking-wider cursor-help" onClick={onOpenGlossary} title="OBP + SLG = Gesamtstärke">
                      OPS <span className="text-[9px] text-white/60">ⓘ</span>
                    </th>
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
                    className={`border-b border-gray-100 last:border-0 transition-colors hover:bg-softball-red-50/40 ${
                      idx % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'
                    }`}
                  >
                    {/* Rang — Top-1 in Softball-Red (10% Accent) */}
                    <td className={`px-3 py-2 text-left tabular-nums font-bold ${isTop ? 'text-softball-red-600' : 'text-gray-400'}`}>
                      {isTop ? '🏆' : idx + 1}
                    </td>
                    {/* Spieler — Navy für Hierarchie */}
                    <td className="px-3 py-2 font-semibold text-navy-900 whitespace-nowrap">{s.playerName}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">{s.atBats}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">{s.hits}</td>
                    {/* AVG — Headline-Metrik prominent in Navy */}
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-navy-900 text-base">
                      {formatDec(Number(s.battingAverage))}
                    </td>
                    {/* Quote mit Balken — Softball-Red (10% Accent) */}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 sm:w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-softball-red-600 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="font-semibold text-navy-900 w-10 text-right tabular-nums text-xs">
                          {baPct}%
                        </span>
                      </div>
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${dimZero(s.walks)}`}>{s.walks}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${dimZero(s.strikeouts)}`}>{s.strikeouts}</td>
                    {/* HR — wenn > 0, Softball-Red Akzent */}
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${
                      s.homeRuns > 0 ? 'text-softball-red-600' : 'text-gray-300'
                    }`}>
                      {s.homeRuns > 0 ? `${s.homeRuns} ⚡` : '0'}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${dimZero(s.stolenBases)}`}>{s.stolenBases}</td>
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
