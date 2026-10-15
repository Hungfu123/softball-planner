export type AttendanceWindow = {
  attended: number
  total: number
  percentage: number
}

export type PlayerAttendanceStats = {
  last3Months: AttendanceWindow
  lastYear: AttendanceWindow
}

type Args = {
  trainings: { id: number; date: string; cancelled?: boolean }[]
  attendance: Map<number, Map<number, boolean>>
  playerId: number
  now?: Date
  /** ISO-Wochentage (1 = Mo … 7 = So), die nicht mitzählen — einer trägt P/C, Rest Basic. */
  excludeWeekdays?: number[]
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** ISO-Wochentag (1 = Mo … 7 = So) eines `YYYY-MM-DD`-Datums. */
export function isoWeekday(date: string): number {
  const d = new Date(date + 'T00:00:00')
  const js = d.getDay() // 0 = So
  return js === 0 ? 7 : js
}

/** Trainings ohne die ausgeschlossenen Wochentage (abgesagte bleiben unverändert enthalten). */
export function filterByWeekday<T extends { date: string }>(trainings: T[], excludeWeekdays: number[]): T[] {
  if (excludeWeekdays.length === 0) return trainings
  const excluded = new Set(excludeWeekdays)
  return trainings.filter(t => !excluded.has(isoWeekday(t.date)))
}

export function computeAttendanceStats({ trainings, attendance, playerId, now = new Date(), excludeWeekdays = [] }: Args): PlayerAttendanceStats {
  const excluded = new Set(excludeWeekdays)
  const cutoff3M = new Date(now.getTime() - 90 * MS_PER_DAY)
  const cutoff1Y = new Date(now.getTime() - 365 * MS_PER_DAY)

  const in3M = { attended: 0, total: 0 }
  const in1Y = { attended: 0, total: 0 }

  for (const t of trainings) {
    if (t.cancelled) continue
    if (excluded.has(isoWeekday(t.date))) continue
    const tDate = new Date(t.date)
    if (Number.isNaN(tDate.getTime())) continue
    const inThreeMonths = tDate >= cutoff3M
    const inYear = tDate >= cutoff1Y
    if (!inYear) continue

    const present = attendance.get(t.id)?.get(playerId) === true
    if (inThreeMonths) {
      in3M.total += 1
      if (present) in3M.attended += 1
    }
    in1Y.total += 1
    if (present) in1Y.attended += 1
  }

  return {
    last3Months: {
      attended: in3M.attended,
      total: in3M.total,
      percentage: in3M.total === 0 ? 0 : Math.round((in3M.attended / in3M.total) * 100),
    },
    lastYear: {
      attended: in1Y.attended,
      total: in1Y.total,
      percentage: in1Y.total === 0 ? 0 : Math.round((in1Y.attended / in1Y.total) * 100),
    },
  }
}
