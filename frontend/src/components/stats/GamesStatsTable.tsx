import type { SeasonPlayerStats } from '@/types'

interface Props {
  stats: SeasonPlayerStats[]
}

export function GamesStatsTable({ stats }: Props) {
  const maxGames = Math.max(...stats.map(s => s.totalGames), 1)

  function topPositions(counts: Record<string, number>): string {
    const entries = Object.entries(counts)
    if (entries.length === 0) return '—'
    entries.sort((a, b) => b[1] - a[1])
    return entries.map(([pos, count]) => `${pos} (${count}×)`).join(', ')
  }

  if (stats.length === 0) {
    return (
      <div className="bg-cream-50 border border-cream-300 rounded-2xl p-12 text-center text-gray-500">
        Keine Einsatz-Daten in diesem Zeitraum.
      </div>
    )
  }

  return (
    <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-900 text-white">
              <th className="text-left px-4 py-2.5 font-bold text-[11px] uppercase tracking-wider">Spieler</th>
              <th className="text-right px-4 py-2.5 font-bold text-[11px] uppercase tracking-wider w-32">Spiele</th>
              <th className="text-left px-4 py-2.5 font-bold text-[11px] uppercase tracking-wider">Positionen</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, idx) => (
              <tr
                key={s.playerId}
                className={`border-b border-cream-200 last:border-0 transition-colors hover:bg-softball-red-50/40 ${
                  idx % 2 === 1 ? 'bg-cream-100/70' : 'bg-cream-50'
                }`}
              >
                <td className="px-4 py-2 font-semibold text-navy-900">{s.playerName}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-softball-red-600 rounded-full"
                        style={{ width: `${(s.totalGames / maxGames) * 100}%` }}
                      />
                    </div>
                    <span className="font-bold text-navy-900 w-10 text-right tabular-nums">
                      {s.totalGames}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-600 text-xs">{topPositions(s.positionCounts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
