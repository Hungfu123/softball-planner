import { describe, it, expect } from 'vitest'
import type { TrainingResponse } from '@/types'
import {
  amount, billedRows, clockLabel, endTime, fillToMax, isWinterMonth, monthLabel,
  monthTrainings, primaryHours, suggestRows, totalHours, withFrom, withHours, MAX_FORM_ROWS,
  monthOptions, defaultMonth, MONTHS_AHEAD, MONTHS_BACK,
} from './coachBilling'

let id = 0
function training(date: string, time: string | null = '19:00', cancelled = false): TrainingResponse {
  return {
    id: ++id, date, time, location: null, cancelled,
    attendeeCount: 0, periodId: 1, type: 'REGULAR', openToAll: true,
  }
}

/** September 2026: Do 3./10./17./24., Sa 5./12./19./26., Mo 7./14./21./28. */
function september(): TrainingResponse[] {
  return [
    training('2026-09-03'), training('2026-09-05', '13:00'), training('2026-09-07', '20:00'),
    training('2026-09-10'), training('2026-09-12', '13:00'), training('2026-09-14', '20:00'),
    training('2026-09-17'), training('2026-09-19', '13:00'), training('2026-09-21', '20:00'),
    training('2026-09-24'), training('2026-09-26', '13:00'), training('2026-09-28', '20:00'),
  ]
}

describe('Jahreszeit', () => {
  it('kuerzt den Donnerstag von November bis Maerz', () => {
    expect(primaryHours('2026-09')).toBe(3)
    expect(primaryHours('2026-04')).toBe(3)
    expect(primaryHours('2026-10')).toBe(3)
    expect(primaryHours('2026-11')).toBe(2)
    expect(primaryHours('2027-01')).toBe(2)
    expect(primaryHours('2027-03')).toBe(2)
    expect(isWinterMonth('2026-12')).toBe(true)
    expect(isWinterMonth('2026-05')).toBe(false)
  })
})

describe('suggestRows', () => {
  it('traegt im Sommer vier Donnerstage à drei Stunden ein — mehr braucht es nicht', () => {
    const rows = suggestRows(september(), '2026-09', 12)

    expect(totalHours(rows)).toBe(12)
    expect(billedRows(rows).map(r => [r.date, r.hours])).toEqual([
      ['2026-09-03', 3], ['2026-09-10', 3], ['2026-09-17', 3], ['2026-09-24', 3],
    ])
  })

  it('nimmt eine ganze Einheit dazu, wenn ein Donnerstag ausfaellt', () => {
    const mitAusfall = september().map(t =>
      t.date === '2026-09-17' ? { ...t, cancelled: true } : t)

    const rows = suggestRows(mitAusfall, '2026-09', 12)

    // Drei Donnerstage = 9 Stunden. Die fehlenden drei holt EIN weiterer Tag ganz,
    // nicht drei Tage mit je einer Stunde.
    expect(totalHours(rows)).toBe(12)
    expect(rows.some(r => r.date === '2026-09-17')).toBe(false)
    expect(billedRows(rows)).toHaveLength(4)
    expect(billedRows(rows).every(r => r.hours === 3)).toBe(true)
  })

  it('kommt im Winter mit zwei Stunden am Donnerstag auf dieselben zwoelf', () => {
    const januar = [
      training('2027-01-07'), training('2027-01-14'), training('2027-01-21'), training('2027-01-28'),
      training('2027-01-04', '20:00'), training('2027-01-11', '20:00'),
      training('2027-01-18', '20:00'), training('2027-01-25', '20:00'),
    ]

    const rows = suggestRows(januar, '2027-01', 12)

    // Vier Donnerstage à zwei Stunden, dazu zwei ganze Montage — nicht vier
    // angebrochene. Die Halle ist von 20 bis 22 offen, so steht es auch im Bogen.
    expect(totalHours(rows)).toBe(12)
    expect(billedRows(rows)).toHaveLength(6)
    expect(billedRows(rows).every(r => r.hours === 2)).toBe(true)
  })

  it('geht auch im Monat mit fuenf Donnerstagen nicht ueber den Deckel', () => {
    const oktober = [
      training('2026-10-01'), training('2026-10-08'), training('2026-10-15'),
      training('2026-10-22'), training('2026-10-29'),
    ]

    const rows = suggestRows(oktober, '2026-10', 12)

    expect(totalHours(rows)).toBe(12)
    // Vier volle Donnerstage, der fuenfte bleibt leer — nicht vier mal drei plus Rest.
    expect(rows.map(r => r.hours)).toEqual([3, 3, 3, 3, 0])
  })

  it('bleibt unter zwoelf, wenn der Monat zu wenige Termine hat', () => {
    const rows = suggestRows([training('2026-09-03'), training('2026-09-10')], '2026-09', 12)
    expect(totalHours(rows)).toBe(6)
  })

  it('laesst abgesagte Termine ganz weg', () => {
    const rows = suggestRows([training('2026-09-03'), training('2026-09-10', '19:00', true)], '2026-09', 12)
    expect(rows).toHaveLength(1)
  })

  it('nimmt nur den gewaehlten Monat', () => {
    const gemischt = [...september(), training('2026-08-27'), training('2026-10-01')]
    expect(monthTrainings(gemischt, '2026-09')).toHaveLength(12)
  })
})

describe('fillToMax', () => {
  it('beschreibt nie mehr als elf Zeilen', () => {
    // Zwoelf Termine, aber nur elf Zeilen auf dem Bogen.
    const viele = Array.from({ length: 12 }, (_, i) =>
      ({ trainingId: i + 1, date: `2026-09-${String(i + 1).padStart(2, '0')}`, from: '19:00', hours: 0 }))

    const rows = fillToMax(viele, 20, 2)

    expect(billedRows(rows).length).toBeLessThanOrEqual(MAX_FORM_ROWS)
  })

  it('haelt an, wenn kein Tag mehr Stunden nehmen kann', () => {
    const zweiTage = [
      { trainingId: 1, date: '2026-09-07', from: '20:00', hours: 0 },
      { trainingId: 2, date: '2026-09-05', from: '13:00', hours: 0 },
    ]
    // Zwei Tage à hoechstens drei Stunden — zwoelf sind nicht erreichbar.
    expect(totalHours(fillToMax(zweiTage, 12, 3))).toBe(6)
  })
})

describe('Zeiten und Betrag', () => {
  it('rechnet das Ende aus Beginn und Dauer', () => {
    expect(endTime('19:00', 3)).toBe('22:00')
    expect(endTime('13:00', 1)).toBe('14:00')
    expect(endTime('19:30', 2)).toBe('21:30')
    expect(endTime(null, 3)).toBeNull()
  })

  it('schreibt volle Stunden blank, wie auf dem Bogen', () => {
    expect(clockLabel('19:00')).toBe('19')
    expect(clockLabel('09:00')).toBe('9')
    expect(clockLabel('19:30')).toBe('19:30')
    expect(clockLabel(null)).toBe('')
  })

  it('multipliziert Stunden mit dem Satz', () => {
    expect(amount(12, 15)).toBe(180)
    expect(amount(7.5, 15)).toBe(112.5)
  })
})

describe('withHours', () => {
  it('aendert nur die angefasste Zeile und deckelt den Tag', () => {
    const rows = suggestRows(september(), '2026-09', 12)
    const geaendert = withHours(rows, rows[0].trainingId, 9)

    expect(geaendert[0].hours).toBe(3)
    expect(geaendert[1].hours).toBe(rows[1].hours)
  })
})

describe('monthLabel', () => {
  it('nennt den Monat so, wie er auf dem Bogen steht', () => {
    expect(monthLabel('2026-09')).toBe('September')
    expect(monthLabel('2027-03')).toBe('März')
  })
})

describe('withFrom', () => {
  it('traegt eine fehlende Startzeit nach, ohne die anderen Zeilen anzufassen', () => {
    const rows = [
      { trainingId: 1, date: '2026-01-15', from: null, hours: 2 },
      { trainingId: 2, date: '2026-01-12', from: '20:00', hours: 1 },
    ]
    const geaendert = withFrom(rows, 1, '19:00')

    expect(geaendert[0].from).toBe('19:00')
    expect(endTime(geaendert[0].from, geaendert[0].hours)).toBe('21:00')
    expect(geaendert[1].from).toBe('20:00')
  })

  it('macht aus einer geleerten Eingabe wieder "keine Zeit"', () => {
    const rows = [{ trainingId: 1, date: '2026-01-15', from: '19:00', hours: 2 }]
    expect(withFrom(rows, 1, '')[0].from).toBeNull()
  })
})

describe('monthOptions', () => {
  const heute = new Date(2026, 9, 19) // 19.10.2026

  it('reicht in die Zukunft und nicht nur zurueck', () => {
    const monate = monthOptions(heute)

    // Spaetester zuerst, der laufende Monat ist dabei.
    expect(monate[0]).toBe('2027-01')
    expect(monate).toContain('2026-10')
    expect(monate).toContain('2026-11')
    expect(monate.at(-1)).toBe('2025-10')
    expect(monate).toHaveLength(MONTHS_AHEAD + MONTHS_BACK + 1)
  })

  it('belegt den Vormonat vor, nicht den laufenden', () => {
    expect(defaultMonth(heute)).toBe('2026-09')
    expect(monthOptions(heute)).toContain(defaultMonth(heute))
  })

  it('rutscht ueber den Jahreswechsel richtig', () => {
    expect(defaultMonth(new Date(2027, 0, 5))).toBe('2026-12')
    expect(monthOptions(new Date(2026, 11, 1))[0]).toBe('2027-03')
  })
})

describe('fillToMax in ganzen Einheiten', () => {
  it('gibt dem letzten Tag nur den Rest, statt ueber den Deckel zu gehen', () => {
    const rows = [
      { trainingId: 1, date: '2027-01-07', from: '20:00', hours: 2 }, // Donnerstag
      { trainingId: 2, date: '2027-01-11', from: '20:00', hours: 0 }, // Montag
      { trainingId: 3, date: '2027-01-18', from: '20:00', hours: 0 }, // Montag
    ]
    // 2 stehen, 3 fehlen bis 5: ein ganzer Montag (2) und ein Rest (1).
    const gefuellt = fillToMax(rows, 5, 2)

    expect(totalHours(gefuellt)).toBe(5)
    expect(gefuellt.map(r => r.hours)).toEqual([2, 2, 1])
  })

  it('laesst die Donnerstage in Ruhe', () => {
    const rows = [
      { trainingId: 1, date: '2027-01-07', from: '20:00', hours: 2 },
      { trainingId: 2, date: '2027-01-11', from: '20:00', hours: 0 },
    ]
    expect(fillToMax(rows, 12, 2)[0].hours).toBe(2)
  })
})
