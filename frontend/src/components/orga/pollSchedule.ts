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
  return upcomingTrainingsOn(weekday, trainings, skipDates, today)[0] ?? null
}

/** Alle gültigen Trainings am Wochentag ab heute, chronologisch. */
export function upcomingTrainingsOn(
  weekday: Weekday, trainings: TrainingLite[], skipDates: string[], today: Date,
): Date[] {
  const target = WEEKDAY_JS[weekday]
  const skip = new Set(skipDates)
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return trainings
    .filter(t => !t.cancelled && !skip.has(t.date))
    .map(t => new Date(t.date + 'T00:00:00'))
    .filter(d => d.getDay() === target && d >= todayMid)
    .sort((a, b) => a.getTime() - b.getTime())
}

/** Versandzeitpunkt zu einem Training = Vortag zur Umfrage-Uhrzeit. */
export function sendDateFor(trainingDate: Date, timeHHmm: string): Date {
  const [h, m] = timeHHmm.split(':').map(Number)
  return new Date(trainingDate.getFullYear(), trainingDate.getMonth(), trainingDate.getDate() - 1, h, m, 0, 0)
}

/** Versandzeitpunkt einer Trainingsumfrage = Vortag des nächsten Trainings zur Uhrzeit. null = kein Training. */
export function coupledSendDate(
  weekday: Weekday, timeHHmm: string, trainings: TrainingLite[], skipDates: string[], today: Date,
): Date | null {
  const t = nextTrainingOn(weekday, trainings, skipDates, today)
  return t ? sendDateFor(t, timeHHmm) : null
}

/** Versandzeitpunkte der nächsten Trainings am Wochentag, chronologisch. */
export function coupledSendDates(
  weekday: Weekday, timeHHmm: string, trainings: TrainingLite[], skipDates: string[], today: Date,
): Date[] {
  return upcomingTrainingsOn(weekday, trainings, skipDates, today).map(t => sendDateFor(t, timeHHmm))
}
