import { describe, it, expect } from 'vitest'
import { nextTrainingOn, coupledSendDate, coupledSendDates } from './pollSchedule'

const trainings = [
  { date: '2026-07-27', cancelled: false }, // Montag
  { date: '2026-08-01', cancelled: false }, // Samstag
  { date: '2026-08-03', cancelled: false }, // Montag
]

describe('pollSchedule', () => {
  it('findet nächstes Training am Wochentag', () => {
    const today = new Date(2026, 6, 25) // 25.07.2026 (Sa)
    const d = nextTrainingOn('MONDAY', trainings, [], today)
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(6) // Juli
    expect(d?.getDate()).toBe(27)
  })

  it('Versand = Vortag des Trainings zur Uhrzeit', () => {
    const today = new Date(2026, 6, 25)
    const d = coupledSendDate('MONDAY', '09:00', trainings, [], today)
    expect(d?.getDate()).toBe(26) // Sonntag, Vortag
    expect(d?.getHours()).toBe(9)
  })

  it('coupledSendDates liefert die Versandtermine aller kommenden Trainings', () => {
    const today = new Date(2026, 6, 25) // 25.07.2026 (Sa)
    const ds = coupledSendDates('MONDAY', '09:00', trainings, [], today)
    expect(ds.map(d => d.getDate())).toEqual([26, 2]) // Vortage von 27.07. und 03.08.
    expect(ds[0].getHours()).toBe(9)
  })

  it('coupledSendDates ohne Training am Wochentag -> leer', () => {
    expect(coupledSendDates('WEDNESDAY', '09:00', trainings, [], new Date(2026, 6, 25))).toEqual([])
  })

  it('kein Training am Wochentag -> null', () => {
    const today = new Date(2026, 6, 25)
    expect(coupledSendDate('WEDNESDAY', '09:00', trainings, [], today)).toBeNull()
  })

  it('überspringt abgesagte + skipDates', () => {
    const today = new Date(2026, 6, 25)
    const withCancel = [{ date: '2026-07-27', cancelled: true }, ...trainings.slice(1)]
    const d = nextTrainingOn('MONDAY', withCancel, [], today)
    expect(d?.getDate()).toBe(3) // 03.08. statt 27.07.
  })
})
