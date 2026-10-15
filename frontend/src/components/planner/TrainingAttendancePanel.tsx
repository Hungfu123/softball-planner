import type { Player, TrainingStatsResponse } from '@/types'
import { WeekdayFilter } from '@/components/shared/WeekdayFilter'
import { PITCHER_CATCHER_WEEKDAY } from '@/utils/trainingWeekday'
import { trainingYearFilterLabel, trainingYearTitle } from '@/utils/trainingYear'

type Props = {
  stats: TrainingStatsResponse[]
  availablePlayers: Player[]
  /** Ausgeschlossene Wochentage (ISO 1 = Mo … 7 = So) — einer davon ist P/C-Training. */
  excludedWeekdays: number[]
  onToggleWeekday: (weekday: number) => void
  /** Spieltag — bestimmt, welches Trainingsjahr in der Ueberschrift steht. */
  gameDayDate: string
}

/**
 * Trainings-Teilnahmen der verfügbaren Spieler als Balkenliste.
 * Der Chip blendet das P/C-Training aus der Zählung aus (Backend rechnet neu).
 */
export function TrainingAttendancePanel({ stats, availablePlayers, excludedWeekdays, onToggleWeekday, gameDayDate }: Props) {
  const availableIds = new Set(availablePlayers.map(p => p.id))
  const filtered = stats
    .filter(s => availableIds.has(s.playerId))
    .sort((a, b) => b.attended - a.attended)
  const maxAttended = Math.max(...filtered.map(s => s.attended), 1)
  const withoutPitcherCatcher = excludedWeekdays.includes(PITCHER_CATCHER_WEEKDAY)

  return (
    <div>
      <h2 className="flex items-center gap-2 mb-2 pb-1.5 xl:mb-1 xl:pb-0.5 border-b border-cream-200 font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900">
        <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
        Training
        <span
          className="ml-auto font-display text-[10px] tracking-widest uppercase text-gray-500 font-bold"
          title={trainingYearTitle(gameDayDate)}
        >
          {withoutPitcherCatcher
            ? `Basic · ${trainingYearFilterLabel(gameDayDate)}`
            : trainingYearFilterLabel(gameDayDate)}
        </span>
      </h2>
      <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden p-3 xl:p-1.5 space-y-1.5 xl:space-y-0">
        <div className="flex items-center gap-2 pb-1 xl:pb-0">
          <span className="font-display text-[9px] font-bold tracking-widest uppercase text-navy-500">
            Trainingstage
          </span>
          <WeekdayFilter
            weekdays={[PITCHER_CATCHER_WEEKDAY]}
            excluded={excludedWeekdays}
            onToggle={onToggleWeekday}
          />
          <span className="text-[9px] text-gray-400 truncate">{withoutPitcherCatcher ? 'nur Basic' : 'inkl. P/C'}</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Keine Trainingsdaten.</p>
        ) : (
          // Balken liegt IN der Zeile, nicht daneben: gleiche Information,
          // halbe Höhe. Auf der Werkbank zweispaltig.
          <div className="space-y-0.5 xl:grid xl:grid-cols-2 xl:gap-x-3 xl:gap-y-0 xl:space-y-0">
          {filtered.map(s => {
            const barWidth = Math.round((s.attended / maxAttended) * 100)
            return (
              <div key={s.playerId} className="relative flex items-center gap-2 overflow-hidden rounded px-1.5 py-1 xl:py-0">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 rounded bg-navy-200"
                  style={{ width: `${barWidth}%` }}
                />
                <span className="relative flex-1 min-w-0 truncate text-xs font-medium text-navy-900">
                  {s.playerName}
                </span>
                <span className="relative font-display text-[11px] font-bold tabular-nums text-gray-500">
                  {s.attended}
                </span>
              </div>
            )
          })}
          </div>
        )}
      </div>
    </div>
  )
}
