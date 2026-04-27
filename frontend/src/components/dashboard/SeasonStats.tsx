import type { SeasonPlayerStats } from '@/types'

export function SeasonStats({ stats }: { stats: SeasonPlayerStats[] }) {
  const maxGames = Math.max(...stats.map(s => s.totalGames), 1)

  function topPosition(counts: Record<string, number>): string {
    const entries = Object.entries(counts)
    if (entries.length === 0) return '—'
    entries.sort((a, b) => b[1] - a[1])
    return entries.map(([pos, count]) => `${pos} (${count}x)`).join(', ')
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-950 mb-4">Saison-Statistik</h2>
      <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-300 bg-cream-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Spieler</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Spiele</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Positionen</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.playerId} className="border-b border-cream-200 last:border-0 hover:bg-cream-100">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{s.playerName}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-navy-800 rounded-full"
                          style={{ width: `${(s.totalGames / maxGames) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono font-semibold text-gray-900 w-8 text-right">
                        {s.totalGames}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{topPosition(s.positionCounts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
