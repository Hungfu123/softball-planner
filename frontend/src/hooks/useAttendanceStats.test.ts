import { describe, it, expect } from 'vitest'
import { computeAttendanceStats, filterByWeekday, isoWeekday } from './useAttendanceStats'

const NOW = new Date('2026-05-12T12:00:00Z')

function training(id: number, daysAgo: number) {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return { id, date: d.toISOString().slice(0, 10) }
}

describe('computeAttendanceStats', () => {
  it('returns 0/0 wenn keine Trainings', () => {
    const stats = computeAttendanceStats({ trainings: [], attendance: new Map(), playerId: 1, now: NOW })
    expect(stats.last3Months.attended).toBe(0)
    expect(stats.last3Months.total).toBe(0)
    expect(stats.last3Months.percentage).toBe(0)
    expect(stats.lastYear.attended).toBe(0)
    expect(stats.lastYear.total).toBe(0)
  })

  it('zählt Trainings nur innerhalb 3-Monats-Fenster (90 Tage)', () => {
    const trainings = [training(1, 30), training(2, 60), training(3, 89), training(4, 91), training(5, 200)]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    att.set(2, new Map([[1, false]]))
    att.set(3, new Map([[1, true]]))
    att.set(4, new Map([[1, true]]))
    att.set(5, new Map([[1, true]]))
    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.last3Months.total).toBe(3)
    expect(stats.last3Months.attended).toBe(2)
    expect(stats.last3Months.percentage).toBe(67)
  })

  it('zählt Trainings innerhalb 365-Tage-Fenster', () => {
    const trainings = [training(1, 30), training(2, 200), training(3, 360), training(4, 370)]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    att.set(2, new Map([[1, true]]))
    att.set(3, new Map([[1, true]]))
    att.set(4, new Map([[1, true]]))
    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.lastYear.total).toBe(3)
    expect(stats.lastYear.attended).toBe(3)
    expect(stats.lastYear.percentage).toBe(100)
  })

  it('ignoriert cancelled Trainings', () => {
    const trainings = [training(1, 10), { ...training(2, 20), cancelled: true }, training(3, 30)]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    att.set(2, new Map([[1, true]]))
    att.set(3, new Map([[1, false]]))
    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.last3Months.total).toBe(2)
    expect(stats.last3Months.attended).toBe(1)
  })

  it('missing attendance-entry zählt als nicht-anwesend', () => {
    const trainings = [training(1, 10), training(2, 20), training(3, 30)]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.last3Months.total).toBe(3)
    expect(stats.last3Months.attended).toBe(1)
    expect(stats.last3Months.percentage).toBe(33)
  })

  it('arbeitet cross-season', () => {
    const trainings = [training(1, 10), training(2, 30), training(3, 60)]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    att.set(2, new Map([[1, true]]))
    att.set(3, new Map([[1, true]]))
    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.last3Months.total).toBe(3)
    expect(stats.last3Months.attended).toBe(3)
  })

  it('rundet Prozent korrekt', () => {
    const trainings = [training(1, 5), training(2, 10), training(3, 15)]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    att.set(2, new Map([[1, true]]))
    att.set(3, new Map([[1, false]]))
    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.last3Months.percentage).toBe(67)
  })
})

describe('Wochentag-Filter (ein Tag traegt P/C, Rest Basic)', () => {
  // 2026-05-04 Mo, 2026-05-06 Mi, 2026-05-11 Mo
  const trainings = [
    { id: 1, date: '2026-05-04' },
    { id: 2, date: '2026-05-06' },
    { id: 3, date: '2026-05-11' },
  ]
  const att = new Map<number, Map<number, boolean>>([
    [1, new Map([[1, true]])],
    [2, new Map([[1, true]])],
    [3, new Map([[1, false]])],
  ])

  it('isoWeekday liefert 1 für Montag und 7 für Sonntag', () => {
    expect(isoWeekday('2026-05-04')).toBe(1)
    expect(isoWeekday('2026-05-10')).toBe(7)
  })

  it('filterByWeekday wirft die ausgeschlossenen Tage raus', () => {
    expect(filterByWeekday(trainings, [1]).map(t => t.id)).toEqual([2])
    expect(filterByWeekday(trainings, []).map(t => t.id)).toEqual([1, 2, 3])
  })

  it('computeAttendanceStats zählt ohne den ausgeschlossenen Tag nur den Rest', () => {
    const all = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(all.last3Months.total).toBe(3)
    expect(all.last3Months.attended).toBe(2)

    const basicOnly = computeAttendanceStats({
      trainings, attendance: att, playerId: 1, now: NOW, excludeWeekdays: [1],
    })
    expect(basicOnly.last3Months.total).toBe(1)
    expect(basicOnly.last3Months.attended).toBe(1)
    expect(basicOnly.last3Months.percentage).toBe(100)
  })
})
