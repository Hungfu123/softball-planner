import type { Player } from '@/types'

interface Props {
  players: Player[]
}

export function BenchDisplay({ players }: Props) {
  if (players.length === 0) return null

  return (
    <div>
      <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900 mb-2 pb-1.5 border-b border-cream-200 flex items-center gap-2">
        <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
        Bank <span className="font-display font-bold text-gray-400 text-[11px]">{players.length}</span>
      </h2>
      <div className="bg-cream-50 border border-cream-300 rounded-xl shadow-sm divide-y divide-cream-200">
        {players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2.5 px-3 py-2">
            <span className="font-display text-[11px] font-extrabold text-gray-400 w-5 text-right tabular-nums">{i + 1}</span>
            <span className="font-medium text-[13px] text-gray-700 truncate">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
