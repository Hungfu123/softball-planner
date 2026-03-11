import type { Player } from '@/types'

interface Props {
  players: Player[]
}

export function BenchDisplay({ players }: Props) {
  if (players.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
        Bank <span className="font-mono font-normal">({players.length})</span>
      </h2>
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {players.map(p => (
          <div key={p.id} className="px-3 py-2 text-sm text-gray-600">
            {p.name}
          </div>
        ))}
      </div>
    </div>
  )
}
