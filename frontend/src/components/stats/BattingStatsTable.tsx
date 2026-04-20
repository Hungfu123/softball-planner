import { useMemo, useState } from 'react'
import type { PlayerBattingStatsResponse } from '@/types'

interface Props {
  stats: PlayerBattingStatsResponse[]
  onOpenGlossary?: () => void
}

const MIN_AB_DEFAULT = 5

export function BattingStatsTable({ stats, onOpenGlossary }: Props) {
  const [showDetails, setShowDetails] = useState(false)
  const [includeLowAB, setIncludeLowAB] = useState(false)

  const filtered = useMemo(() => {
    return includeLowAB ? stats : stats.filter(s => s.atBats >= MIN_AB_DEFAULT)
  }, [stats, includeLowAB])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const bDiff = Number(b.battingAverage) - Number(a.battingAverage)
      if (bDiff !== 0) return bDiff
      return b.hits - a.hits || a.playerName.localeCompare(b.playerName)
    })
  }, [filtered])

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
          {showDetails ? '▲ Weniger' : '▼ Mehr Details'}
        </button>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={includeLowAB}
            onChange={e => setIncludeLowAB(e.target.checked)}
            className="rounded"
          />
          Auch Spieler mit &lt; {MIN_AB_DEFAULT} Schlag
        </label>
        {filtered.length < stats.length && (
          <span className="text-xs text-gray-500 ml-auto">
            {stats.length - filtered.length} versteckt (zu wenig Daten)
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Spieler</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Schlag</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Treffer</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Quote</th>
                {showDetails && (
                  <>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600">Walks</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600">Strikeouts</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600">Homeruns</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600">Steals</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-help" onClick={onOpenGlossary} title="Auf-Base-Quote (OBP)">
                      OBP <span className="text-[10px] text-gray-400">ⓘ</span>
                    </th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-help" onClick={onOpenGlossary} title="Schlagstärke (SLG)">
                      SLG <span className="text-[10px] text-gray-400">ⓘ</span>
                    </th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-help" onClick={onOpenGlossary} title="OBP + SLG = Gesamtstärke">
                      OPS <span className="text-[10px] text-gray-400">ⓘ</span>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => {
                const baPct = Math.round(Number(s.battingAverage) * 100)
                const barWidth = Math.round((Number(s.battingAverage) / maxBA) * 100)
                return (
                  <tr key={s.playerId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-900">{s.playerName}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{s.atBats}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                      {showDetails ? `${s.singles}/${s.doubles}/${s.triples}/${s.homeRuns}` : s.hits}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="font-mono font-semibold text-gray-900 w-10 text-right tabular-nums">{baPct} %</span>
                      </div>
                    </td>
                    {showDetails && (
                      <>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{s.walks}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{s.strikeouts}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{s.homeRuns}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{s.stolenBases}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatPct(Number(s.onBasePct))}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatDec(Number(s.sluggingPct))}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 font-semibold">{formatDec(Number(s.ops))}</td>
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
