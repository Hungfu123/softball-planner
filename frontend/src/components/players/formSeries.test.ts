import { describe, it, expect } from 'vitest'
import type { PlayerFormPoint } from '@/types'
import { axis, cumulativeSeries, dateRange, xFractions } from './formSeries'

function spiel(over: Partial<PlayerFormPoint>): PlayerFormPoint {
  return {
    gameId: 1, date: '2026-04-01', opponent: 'Gegner',
    seasonId: null, seasonName: null, year: 2026,
    plateAppearances: 0, atBats: 0, hits: 0, walks: 0, strikeouts: 0,
    runsBattedIn: 0, totalBases: 0, timesOnBase: 0, stolenBases: 0, caughtStealing: 0,
    rollingAverage: 0, rollingOnBase: 0, rollingSlugging: 0, rollingOps: 0,
    rollingPlateAppearances: 0, provisional: false,
    ...over,
  }
}

describe('cumulativeSeries', () => {
  it('summiert über die Spiele auf statt ein Fenster mitzuziehen', () => {
    const reihe = cumulativeSeries([
      spiel({ gameId: 1, atBats: 4, hits: 2, totalBases: 2, timesOnBase: 2, plateAppearances: 4 }),
      spiel({ gameId: 2, atBats: 4, hits: 0, totalBases: 0, timesOnBase: 0, plateAppearances: 4 }),
      spiel({ gameId: 3, atBats: 2, hits: 2, totalBases: 5, timesOnBase: 2, plateAppearances: 2 }),
    ])

    // Nach Spiel 1: 2/4. Nach Spiel 2: 2/8 — ein Nuller zieht den Schnitt herunter,
    // loescht ihn aber nicht. Nach Spiel 3: 4/10.
    expect(reihe.map(p => p.average)).toEqual([0.5, 0.25, 0.4])
    expect(reihe.map(p => p.plateAppearances)).toEqual([4, 8, 10])
    // SLG = Bases / AB, OPS = OBP + SLG
    expect(reihe[2].slugging).toBeCloseTo(7 / 10, 5)
    expect(reihe[2].onBase).toBeCloseTo(4 / 10, 5)
    expect(reihe[2].ops).toBeCloseTo(7 / 10 + 4 / 10, 5)
  })

  it('kommt ohne Schlagversuche nicht ins Rutschen', () => {
    const reihe = cumulativeSeries([
      spiel({ gameId: 1, atBats: 0, hits: 0, plateAppearances: 1, timesOnBase: 1, walks: 1 }),
    ])
    expect(reihe[0].average).toBe(0)
    expect(reihe[0].slugging).toBe(0)
    expect(reihe[0].onBase).toBe(1)
  })

  it('markiert die ersten Spiele als vorläufig, bis genug Schlagversuche stehen', () => {
    const viele = Array.from({ length: 8 }, (_, i) =>
      spiel({ gameId: i + 1, atBats: 3, hits: 1, totalBases: 1, timesOnBase: 1, plateAppearances: 3 }))
    const reihe = cumulativeSeries(viele)
    // 20 Schlagversuche sind nach dem 7. Spiel erreicht (21).
    expect(reihe.map(p => p.provisional)).toEqual([true, true, true, true, true, true, false, false])
  })

  it('rechnet nur über die übergebenen Spiele — der Zeitraum-Filter schneidet vorher', () => {
    const nurZweites = cumulativeSeries([
      spiel({ gameId: 2, atBats: 4, hits: 4, totalBases: 4, timesOnBase: 4, plateAppearances: 4 }),
    ])
    expect(nurZweites[0].average).toBe(1)
  })
})

describe('axis', () => {
  it('beginnt immer bei null, damit zwei Spieler denselben Maßstab haben', () => {
    const { guides } = axis([0.3, 0.42, 0.38])
    expect(guides[0]).toBe(0)
  })

  it('reicht bis über den Höchstwert', () => {
    const { max } = axis([0.42])
    expect(max).toBeGreaterThanOrEqual(0.42)
  })

  it('kommt mit OPS über 1.0 zurecht', () => {
    const { max, guides } = axis([1.35])
    expect(max).toBeGreaterThanOrEqual(1.35)
    expect(guides.length).toBeLessThanOrEqual(5)
    expect(guides[0]).toBe(0)
  })

  it('liefert auch ohne Werte eine brauchbare Achse', () => {
    const { max, guides } = axis([])
    expect(max).toBeGreaterThan(0)
    expect(guides[0]).toBe(0)
  })
})

describe('xFractions', () => {
  it('verteilt nach Datum, nicht nach Listenposition', () => {
    // Drei Spiele, das zweite liegt zeitlich nah am ersten.
    const x = xFractions(['2026-04-01', '2026-04-03', '2026-07-01'])
    expect(x[0]).toBe(0)
    expect(x[2]).toBe(1)
    expect(x[1]).toBeLessThan(0.1)
  })

  it('legt zwei Reihen über denselben Zeitraum übereinander', () => {
    const spanne = { from: '2026-04-01', to: '2026-07-01' }
    const a = xFractions(['2026-04-01', '2026-07-01'], spanne)
    const b = xFractions(['2026-04-01'], spanne)
    // Derselbe Tag landet in beiden Reihen an derselben Stelle.
    expect(b[0]).toBe(a[0])
  })

  it('verteilt gleichmäßig, wenn Datumsangaben fehlen', () => {
    const x = xFractions(['2026-04-01', null, '2026-07-01'])
    expect(x).toEqual([0, 0.5, 1])
  })

  it('setzt einen einzelnen Punkt in die Mitte', () => {
    expect(xFractions(['2026-04-01'])).toEqual([0.5])
  })
})

describe('dateRange', () => {
  it('spannt über beide Reihen', () => {
    const a = cumulativeSeries([spiel({ gameId: 1, date: '2026-05-01' })])
    const b = cumulativeSeries([spiel({ gameId: 2, date: '2026-03-01' })])
    expect(dateRange(a, b)).toEqual({ from: '2026-03-01', to: '2026-05-01' })
  })

  it('gibt nichts zurück, wenn kein Datum bekannt ist', () => {
    expect(dateRange(cumulativeSeries([spiel({ date: null })]))).toBeUndefined()
  })
})
