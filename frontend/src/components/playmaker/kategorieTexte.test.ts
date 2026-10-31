import { describe, expect, it } from 'vitest'
import { kategorieSatz, kategorieStufe, playStufe } from './kategorieTexte'
import { DEFAULT_DEFENSE, POSITIONS } from './board/geometry'
import type { Play, PlayStep } from './board/types'

function stand(ordinal: number, over: Partial<PlayStep['markers']> = {}): PlayStep {
  return {
    ordinal,
    durationMs: 1200,
    note: null,
    outs: 0,
    markers: {
      defenders: POSITIONS.map(position => ({ position, ...DEFAULT_DEFENSE[position] })),
      runners: [],
      ball: { state: 'IN_HAND', holder: 'P', x: DEFAULT_DEFENSE.P.x, y: DEFAULT_DEFENSE.P.y, trajectory: 'AIR' },
      ...over,
    },
  }
}

function play(steps: PlayStep[]): Play {
  return { id: 1, title: 'x', categoryId: 1, gameState: 'ANY', gameStateNote: null, counterpartPlayId: null, steps }
}

const beiPosition = (ordinal: number, pos: keyof typeof DEFAULT_DEFENSE, runner = 0) =>
  stand(ordinal, {
    ball: { state: 'IN_HAND', holder: pos, x: DEFAULT_DEFENSE[pos].x, y: DEFAULT_DEFENSE[pos].y, trajectory: 'AIR' },
    runners: Array.from({ length: runner }, (_, i) => ({ id: `r${i}`, x: 100, y: 150, status: 'ACTIVE' as const })),
  })

describe('kategorieStufe', () => {
  it('folgt der Sortierung, die der Trainer setzt', () => {
    expect(kategorieStufe(10)).toBe(1)
    expect(kategorieStufe(40)).toBe(2)
    expect(kategorieStufe(80)).toBe(3)
  })
})

describe('kategorieSatz', () => {
  it('hat für jede bekannte Kategorie einen Satz und sonst einen allgemeinen', () => {
    expect(kategorieSatz('Rundown')).toMatch(/Bases/)
    expect(kategorieSatz('Was Neues')).toMatch(/Wer steht wo/)
  })
})

/*
 * Schwer ist ein Play, wenn viele den Ball anfassen und viele Runner unterwegs sind.
 * Beides steht in den Staenden, also wird es gerechnet statt gepflegt.
 */
describe('playStufe', () => {
  it('nennt einen kurzen Wurf ohne Runner leicht', () => {
    expect(playStufe(play([stand(1), beiPosition(2, '1B')]))).toBe(1)
  })

  it('steigt mit der Länge der Kette', () => {
    const kurz = play([stand(1), beiPosition(2, 'SS')])
    const lang = play([stand(1), beiPosition(2, 'SS'), beiPosition(3, '2B'), beiPosition(4, '1B')])

    expect(playStufe(lang)).toBeGreaterThan(playStufe(kurz))
  })

  it('steigt mit der Zahl der Runner', () => {
    const ohne = play([stand(1), beiPosition(2, 'SS')])
    const mitDreien = play([stand(1), beiPosition(2, 'SS', 3)])

    expect(playStufe(mitDreien)).toBeGreaterThan(playStufe(ohne))
  })
})
