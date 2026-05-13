import type { Player } from '@/types'
import { Check } from 'lucide-react'
import type { PlayerAttendanceStats } from '@/hooks/useAttendanceStats'

type Props = {
  players: Player[]
  presentIds: Set<number>
  onToggle: (playerId: number) => void
  stats?: Map<number, PlayerAttendanceStats>
}

export function AttendanceList({ players, presentIds, onToggle, stats }: Props) {
  return (
    <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden">
      {players.map(p => {
        const present = presentIds.has(p.id)
        const s = stats?.get(p.id)?.last3Months
        return (
          <button
            key={p.id}
            type="button"
            aria-label={`${p.name} Anwesenheit togglen`}
            aria-pressed={present}
            onClick={() => onToggle(p.id)}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0 cursor-pointer hover:bg-cream-50 active:bg-cream-100 transition-colors"
          >
            <span
              data-attendance-icon
              data-present={present ? 'true' : 'false'}
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                present
                  ? 'bg-navy-800 text-white'
                  : 'border-2 border-cream-400 bg-white'
              }`}
            >
              {present && <Check size={16} strokeWidth={3} />}
            </span>
            <span data-player-name className="flex-1 text-left text-navy-900 font-medium">{p.name}</span>
            {s && s.total > 0 && (
              <span
                className="font-display tabular-nums text-xs text-gray-400 shrink-0"
                title={`${s.attended} Trainings · letzte 3 Monate`}
              >
                {s.attended}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
