import type { Player } from '@/types'
import type { PlayerAttendanceStats } from '@/hooks/useAttendanceStats'

type SortBy = 'quote' | 'alpha'

type Props = {
  players: Player[]
  stats: Map<number, PlayerAttendanceStats>
  presentIds: Set<number>
  onToggle: (playerId: number) => void
  sortBy: SortBy
}

function colorClass(percentage: number, present: boolean): { icon: string; name: string; quote: string } {
  if (percentage >= 70) return {
    icon: present ? 'bg-navy-800' : 'border-2 border-navy-400',
    name: 'text-navy-900 font-semibold',
    quote: 'text-navy-700',
  }
  if (percentage < 30) return {
    icon: present ? 'bg-softball-red-500' : 'border-2 border-softball-red-300',
    name: 'text-softball-red-700',
    quote: 'text-softball-red-500',
  }
  return {
    icon: present ? 'bg-navy-600' : 'border-2 border-cream-400',
    name: 'text-navy-800',
    quote: 'text-navy-600',
  }
}

export function AttendanceList({ players, stats, presentIds, onToggle, sortBy }: Props) {
  const sorted = [...players].sort((a, b) => {
    if (sortBy === 'alpha') return a.name.localeCompare(b.name)
    const qA = stats.get(a.id)?.last3Months.percentage ?? 0
    const qB = stats.get(b.id)?.last3Months.percentage ?? 0
    if (qA !== qB) return qB - qA
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden">
      {sorted.map(p => {
        const s = stats.get(p.id) ?? { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }
        const present = presentIds.has(p.id)
        const colors = colorClass(s.last3Months.percentage, present)
        return (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0">
            <button
              type="button"
              aria-label={`${p.name} Anwesenheit togglen`}
              onClick={() => onToggle(p.id)}
              className="w-11 h-11 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
            >
              <span
                data-attendance-icon
                data-present={present ? 'true' : 'false'}
                className={`w-6 h-6 rounded-full ${colors.icon}`}
              />
            </button>
            <span data-player-name className={`flex-1 ${colors.name}`}>{p.name}</span>
            <span className={`text-sm tabular-nums ${colors.quote}`}>
              <span className="font-semibold">3M {s.last3Months.percentage}%</span>
              <span className="text-xs ml-2 opacity-70">J {s.lastYear.percentage}%</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
