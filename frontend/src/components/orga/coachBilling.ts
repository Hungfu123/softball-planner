import type { TrainingResponse } from '@/types'

/**
 * Die Zeilen des Abrechnungsbogens — eine je Trainingstermin des Monats.
 *
 * `hours = 0` heisst: steht in der Oberflaeche, kommt aber nicht auf den Bogen.
 * So bleibt jeder Termin sichtbar und anklickbar, ohne die Abrechnung aufzublaehen.
 */
export type BillingRow = {
  trainingId: number
  /** `YYYY-MM-DD` */
  date: string
  /** Startzeit des Trainings, `HH:MM`. Fehlt sie, muss die Zeit von Hand rein. */
  from: string | null
  hours: number
}

/** Der Bogen hat elf Zeilen. Mehr passt nicht drauf. */
export const MAX_FORM_ROWS = 11

/** Donnerstag (ISO) traegt das lange Training — im Sommer wie im Winter. */
export const PRIMARY_WEEKDAY = 4

/** Mehr als das traegt ein einzelner Tag nicht, auch beim Auffuellen nicht. */
export const MAX_HOURS_PER_DAY = 3

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function parse(date: string): Date {
  return new Date(date + 'T00:00:00')
}

/** ISO-Wochentag, 1 = Montag … 7 = Sonntag. */
export function isoWeekday(date: string): number {
  const day = parse(date).getDay()
  return day === 0 ? 7 : day
}

export function weekdayName(date: string): string {
  return WOCHENTAGE[parse(date).getDay()]
}

/** `2026-09` → `September`. Steht so im Feld „Monat" des Bogens. */
export function monthLabel(yearMonth: string): string {
  return MONATE[Number(yearMonth.slice(5, 7)) - 1] ?? ''
}

/**
 * Hallenzeit oder Platz: zwischen November und März ist der Donnerstag kuerzer.
 *
 * Im Sommer (April bis Oktober) reichen vier Donnerstage à drei Stunden für den
 * Monat. Im Winter sind es nur zwei Stunden, der Rest kommt über Montag und
 * Samstag dazu — deshalb genügt hier keine feste Zahl.
 */
export function isWinterMonth(yearMonth: string): boolean {
  const month = Number(yearMonth.slice(5, 7))
  return month >= 11 || month <= 3
}

export function primaryHours(yearMonth: string): number {
  return isWinterMonth(yearMonth) ? 2 : 3
}

/** `19:00` + 3 → `22:00`. Ohne Startzeit bleibt auch das Ende leer. */
export function endTime(from: string | null, hours: number): string | null {
  if (!from) return null
  const [h, m] = from.split(':').map(Number)
  if (Number.isNaN(h)) return null
  const total = h * 60 + (m || 0) + Math.round(hours * 60)
  const hh = Math.floor(total / 60) % 24
  return `${String(hh).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Auf dem Bogen stehen volle Stunden als blanke Zahl: `19`, nicht `19:00`. */
export function clockLabel(time: string | null): string {
  if (!time) return ''
  return time.endsWith(':00') ? time.slice(0, 2).replace(/^0/, '') : time
}

export function totalHours(rows: BillingRow[]): number {
  return rows.reduce((sum, row) => sum + row.hours, 0)
}

export function amount(hours: number, hourlyRate: number): number {
  return Math.round(hours * hourlyRate * 100) / 100
}

/** Was wirklich auf den Bogen kommt: Zeilen mit Stunden, chronologisch. */
export function billedRows(rows: BillingRow[]): BillingRow[] {
  return rows.filter(row => row.hours > 0)
}

/**
 * Die Termine des Monats, chronologisch, abgesagte raus.
 *
 * Abgesagt heisst nicht stattgefunden — und was nicht stattgefunden hat, wird
 * nicht abgerechnet. Die Zeile taucht deshalb gar nicht erst auf.
 */
export function monthTrainings(trainings: TrainingResponse[], yearMonth: string): TrainingResponse[] {
  return trainings
    .filter(t => t.date.startsWith(yearMonth) && !t.cancelled)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Vorschlag für den Monat: Donnerstage zuerst, dann auffüllen bis zum Deckel.
 *
 * Die Donnerstage bekommen die lange Einheit, solange der Monatsdeckel sie
 * traegt — der fünfte Donnerstag im Monat bekommt nur noch den Rest oder nichts.
 * Bleibt danach etwas übrig, weil ein Termin ausfiel oder der Winter die
 * Donnerstage kürzt, verteilt {@link fillToMax} den Rest über Montag und Samstag.
 */
export function suggestRows(trainings: TrainingResponse[], yearMonth: string, maxHours: number): BillingRow[] {
  const termine = monthTrainings(trainings, yearMonth)
  const lang = primaryHours(yearMonth)
  let vergeben = 0

  const rows: BillingRow[] = termine.map(t => {
    const row: BillingRow = { trainingId: t.id, date: t.date, from: t.time, hours: 0 }
    if (isoWeekday(t.date) !== PRIMARY_WEEKDAY) return row
    row.hours = Math.max(0, Math.min(lang, maxHours - vergeben))
    vergeben += row.hours
    return row
  })

  return fillToMax(rows, maxHours)
}

/**
 * Fehlende Stunden reihum auf die übrigen Tage verteilen, eine nach der anderen.
 *
 * Reihum statt am Stück: so wächst erst jeder Montag und Samstag um eine Stunde,
 * bevor einer von ihnen die zweite bekommt — das entspricht dem, was tatsächlich
 * passiert, wenn der Donnerstag im Winter kürzer ist. Kein Tag geht über
 * {@link MAX_HOURS_PER_DAY}, und der Bogen traegt nie mehr als {@link MAX_FORM_ROWS}
 * beschriebene Zeilen.
 */
export function fillToMax(rows: BillingRow[], maxHours: number): BillingRow[] {
  const next = rows.map(row => ({ ...row }))
  const kandidaten = next.filter(row => isoWeekday(row.date) !== PRIMARY_WEEKDAY)

  let rest = maxHours - totalHours(next)
  let bewegt = true
  while (rest > 0 && bewegt) {
    bewegt = false
    for (const row of kandidaten) {
      if (rest <= 0) break
      if (row.hours >= MAX_HOURS_PER_DAY) continue
      if (row.hours === 0 && billedRows(next).length >= MAX_FORM_ROWS) continue
      row.hours += 1
      rest -= 1
      bewegt = true
    }
  }
  return next
}

/** Stunden einer Zeile setzen, ohne die anderen anzufassen. */
export function withHours(rows: BillingRow[], trainingId: number, hours: number): BillingRow[] {
  return rows.map(row => row.trainingId === trainingId
    ? { ...row, hours: Math.max(0, Math.min(MAX_HOURS_PER_DAY, hours)) }
    : row)
}
