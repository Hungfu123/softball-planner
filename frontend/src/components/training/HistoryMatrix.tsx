import type { Player } from '@/types'

type Training = { id: number; date: string; cancelled?: boolean }

type Props = {
  players: Player[]
  trainings: Training[]
  attendance: Map<number, Map<number, boolean>>
}

export function HistoryMatrix({ players, trainings, attendance }: Props) {
  const sortedTrainings = [...trainings].filter(t => !t.cancelled).sort((a, b) => a.date.localeCompare(b.date))
  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name))

  if (sortedTrainings.length === 0) {
    return (
      <div className="bg-white border border-cream-300 rounded-xl p-6 text-center text-sm text-navy-600">
        Keine Trainings vorhanden.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white border border-cream-300 rounded-xl">
      <table className="text-xs tabular-nums w-full">
        <thead className="bg-cream-100">
          <tr>
            <th className="sticky left-0 bg-cream-100 px-3 py-2 text-left font-semibold text-navy-900 z-10">Spieler</th>
            {sortedTrainings.map(t => (
              <th key={t.id} className="px-2 py-2 text-navy-700 font-medium whitespace-nowrap">
                {new Date(t.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map(p => (
            <tr key={p.id} className="border-t border-cream-200">
              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-navy-800 z-10 whitespace-nowrap">{p.name}</td>
              {sortedTrainings.map(t => {
                const present = attendance.get(t.id)?.get(p.id) === true
                return (
                  <td
                    key={t.id}
                    data-attendance={present ? 'true' : 'false'}
                    className="px-2 py-2 text-center"
                  >
                    {present ? <span className="text-navy-800 font-bold">✓</span> : <span className="text-navy-300">·</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
