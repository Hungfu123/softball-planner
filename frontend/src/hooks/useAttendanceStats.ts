import { useMemo } from 'react'

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
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function computeAttendanceStats({ trainings, attendance, playerId, now = new Date() }: Args): PlayerAttendanceStats {
  const cutoff3M = new Date(now.getTime() - 90 * MS_PER_DAY)
  const cutoff1Y = new Date(now.getTime() - 365 * MS_PER_DAY)

  const in3M = { attended: 0, total: 0 }
  const in1Y = { attended: 0, total: 0 }

  for (const t of trainings) {
    if (t.cancelled) continue
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

export function useAttendanceStats(args: Args): PlayerAttendanceStats {
  const { trainings, attendance, playerId, now } = args
  return useMemo(
    () => computeAttendanceStats({ trainings, attendance, playerId, now }),
    [trainings, attendance, playerId, now],
  )
}
