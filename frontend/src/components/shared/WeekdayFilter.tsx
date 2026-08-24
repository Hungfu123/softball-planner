/** ISO-Wochentage: 1 = Montag … 7 = Sonntag. */
const LABELS: Record<number, string> = {
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
  6: 'Sa',
  7: 'So',
}

/** Montag ist P/C-Training, alle anderen Tage Basic — Hinweis am Chip. */
const HINTS: Record<number, string> = {
  1: 'Montag (P/C)',
}

type Props = {
  /** Wochentage, die in den Daten vorkommen (ISO 1–7) — sonst gibt es nichts zu filtern. */
  weekdays: number[]
  /** Aktuell ausgeschlossene Wochentage. */
  excluded: number[]
  onToggle: (weekday: number) => void
  className?: string
}

/**
 * Wochentag-Chips zum Ein-/Ausblenden von Trainingstagen in Anwesenheits-Zahlen.
 * Aktiv (dunkel) = zählt mit, ausgegraut = ausgeschlossen.
 */
export function WeekdayFilter({ weekdays, excluded, onToggle, className = '' }: Props) {
  const days = [...new Set(weekdays)].sort((a, b) => a - b)
  if (days.length === 0) return null

  const excludedSet = new Set(excluded)

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`} role="group" aria-label="Trainingstage filtern">
      {days.map(day => {
        const active = !excludedSet.has(day)
        return (
          <button
            key={day}
            type="button"
            onClick={() => onToggle(day)}
            aria-pressed={active}
            aria-label={`${HINTS[day] ?? LABELS[day]} ${active ? 'ausblenden' : 'einblenden'}`}
            title={`${HINTS[day] ?? LABELS[day]} ${active ? 'ausblenden' : 'einblenden'}`}
            className={`font-display px-2 py-1 text-[10px] font-bold tracking-wider uppercase rounded-md border cursor-pointer transition-colors ${
              active
                ? 'bg-navy-800 text-white border-navy-800'
                : 'bg-cream-100 text-gray-400 border-cream-300 line-through hover:border-navy-400'
            }`}
          >
            {LABELS[day]}
          </button>
        )
      })}
    </div>
  )
}
