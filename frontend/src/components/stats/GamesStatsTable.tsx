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
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
        Keine Einsatz-Daten in diesem Zeitraum.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Spieler</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 w-32">Spiele</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Positionen</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.playerId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{s.playerName}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-navy-800 rounded-full"
                        style={{ width: `${(s.totalGames / maxGames) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono font-semibold text-gray-900 w-10 text-right tabular-nums">
                      {s.totalGames}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{topPositions(s.positionCounts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
