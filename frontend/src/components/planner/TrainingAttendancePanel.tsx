import type { Player, TrainingStatsResponse } from '@/types'
import { WeekdayFilter } from '@/components/shared/WeekdayFilter'

type Props = {
  stats: TrainingStatsResponse[]
  availablePlayers: Player[]
  /** Ausgeschlossene Wochentage (ISO 1 = Mo … 7 = So) — Montag ist P/C-Training. */
  excludedWeekdays: number[]
  onToggleWeekday: (weekday: number) => void
}

/**
 * Trainings-Teilnahmen der verfügbaren Spieler als Balkenliste.
 * Der Mo-Chip blendet das P/C-Training aus der Zählung aus (Backend rechnet neu).
 */
export function TrainingAttendancePanel({ stats, availablePlayers, excludedWeekdays, onToggleWeekday }: Props) {
  const availableIds = new Set(availablePlayers.map(p => p.id))
  const filtered = stats
    .filter(s => availableIds.has(s.playerId))
    .sort((a, b) => b.attended - a.attended)
  const maxAttended = Math.max(...filtered.map(s => s.attended), 1)
  const withoutMonday = excludedWeekdays.includes(1)

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-cream-200">
        <span className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900">
          Training
        </span>
        <span className="ml-auto font-display text-[10px] tracking-widest uppercase text-gray-500 font-bold">
          {withoutMonday ? 'Basic · 3 Monate' : 'Letzte 3 Monate'}
        </span>
      </div>
      <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden p-3 space-y-1.5">
        <div className="flex items-center gap-2 pb-1">
          <span className="font-display text-[9px] font-bold tracking-widest uppercase text-navy-500">
            Trainingstage
          </span>
          <WeekdayFilter
            weekdays={[1]}
            excluded={excludedWeekdays}
            onToggle={onToggleWeekday}
          />
          <span className="text-[9px] text-gray-400 truncate">{withoutMonday ? 'nur Basic' : 'inkl. P/C'}</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Keine Trainingsdaten.</p>
        ) : (
          filtered.map(s => {
            const barWidth = Math.round((s.attended / maxAttended) * 100)
            return (
              <div key={s.playerId} className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-900 w-16 truncate">
                  {s.playerName}
                </span>
                <div className="flex-1 h-4 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-navy-800"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-[10px] font-display tabular-nums text-gray-500 w-6 text-right shrink-0">
                  {s.attended}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
