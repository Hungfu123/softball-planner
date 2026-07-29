import type { Weekday } from '@/types'

export type TrainingLite = { date: string; cancelled: boolean }

export const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: 'MONDAY', label: 'Montag', short: 'Mo' },
  { value: 'TUESDAY', label: 'Dienstag', short: 'Di' },
  { value: 'WEDNESDAY', label: 'Mittwoch', short: 'Mi' },
  { value: 'THURSDAY', label: 'Donnerstag', short: 'Do' },
  { value: 'FRIDAY', label: 'Freitag', short: 'Fr' },
  { value: 'SATURDAY', label: 'Samstag', short: 'Sa' },
  { value: 'SUNDAY', label: 'Sonntag', short: 'So' },
]

// Lokales Datum als ISO (YYYY-MM-DD) — bewusst nicht toISOString() (UTC → Off-by-one nahe Mitternacht).
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function todayIso(): string {
  return isoDate(new Date())
}
export function tomorrowIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return isoDate(d)
}

const WEEKDAY_JS: Record<Weekday, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
}

/** Nächstes gültiges Training am Wochentag: nicht abgesagt, Datum >= heute, nicht in skipDates. */
export function nextTrainingOn(
  weekday: Weekday, trainings: TrainingLite[], skipDates: string[], today: Date,
): Date | null {
  const target = WEEKDAY_JS[weekday]
  const skip = new Set(skipDates)
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const hits = trainings
    .filter(t => !t.cancelled && !skip.has(t.date))
    .map(t => new Date(t.date + 'T00:00:00'))
    .filter(d => d.getDay() === target && d >= todayMid)
    .sort((a, b) => a.getTime() - b.getTime())
  return hits.length ? hits[0] : null
}

/** Versandzeitpunkt einer Trainingsumfrage = Vortag des nächsten Trainings zur Uhrzeit. null = kein Training. */
export function coupledSendDate(
  weekday: Weekday, timeHHmm: string, trainings: TrainingLite[], skipDates: string[], today: Date,
): Date | null {
  const t = nextTrainingOn(weekday, trainings, skipDates, today)
  if (!t) return null
  const [h, m] = timeHHmm.split(':').map(Number)
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1, h, m, 0, 0)
}
