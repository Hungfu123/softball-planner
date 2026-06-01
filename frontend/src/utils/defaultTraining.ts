export interface SelectableTraining {
  id: number
  /** ISO date `yyyy-mm-dd` */
  date: string
  cancelled: boolean
}

/**
 * Default-Training für die Training-Seite: das nächste anstehende Training,
 * wobei ein Training HEUTE als anstehend zählt. Gibt es keins mehr in der
 * Zukunft, fällt es auf das letzte vergangene zurück.
 *
 * Vergleich bewusst auf Datums-Ebene (ISO-String-Vergleich), NICHT mit
 * Uhrzeit: `new Date("2026-06-01")` ergäbe UTC-Mitternacht und würde gegen
 * `new Date()` (inkl. aktueller Uhrzeit) immer als "vergangen" gelten —
 * dadurch wurde das heutige Training übersprungen.
 */
export function pickDefaultTrainingId(
  trainings: SelectableTraining[],
  todayStr: string,
): number | null {
  const active = trainings
    .filter(t => !t.cancelled)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = active.find(t => t.date >= todayStr)
  return upcoming?.id ?? active[active.length - 1]?.id ?? null
}
