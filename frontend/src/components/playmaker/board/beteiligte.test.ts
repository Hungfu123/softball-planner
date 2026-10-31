import { describe, expect, test } from 'vitest'
import { beteiligte, mitwirkende } from './beteiligte'
import { DEFAULT_DEFENSE, POSITIONS } from './geometry'
import type { PlayStep } from './types'

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

/*
 * Ein Play zeigt neun Verteidiger. Wer zuschaut, soll wissen, auf wen er achten muss —
 * und das ist, wer den Ball abgibt oder bekommt. Mitlaufen zaehlt NICHT: seit jeder Wurf
 * abgesichert wird, bewegen sich in den meisten Plays sechs oder sieben Leute, und eine
 * Liste mit sieben Namen sagt dasselbe wie keine.
 */
describe('beteiligte', () => {
  test('nennt niemanden, wenn sich nichts bewegt', () => {
    expect(beteiligte([stand(1), stand(2)])).toEqual([])
  })

  test('nennt NICHT, wer nur laeuft — der sichert ab, er fuehrt das Play nicht', () => {
    const zweiter = stand(2, {
      defenders: POSITIONS.map(position =>
        position === 'SS'
          ? { position, x: DEFAULT_DEFENSE.SS.x + 20, y: DEFAULT_DEFENSE.SS.y }
          : { position, ...DEFAULT_DEFENSE[position] },
      ),
    })

    expect(beteiligte([stand(1), zweiter])).toEqual([])
  })

  test('nennt, wer den Ball hat, auch wenn er stehen bleibt', () => {
    const zweiter = stand(2, {
      ball: { state: 'IN_HAND', holder: '1B', x: DEFAULT_DEFENSE['1B'].x, y: DEFAULT_DEFENSE['1B'].y, trajectory: 'AIR' },
    })

    expect(beteiligte([stand(1), zweiter])).toEqual(['P', '1B'])
  })

  test('bleibt kurz: eine Kette aus drei Namen, nicht das halbe Team', () => {
    const zweiter = stand(2, {
      ball: { state: 'IN_HAND', holder: 'SS', x: DEFAULT_DEFENSE.SS.x, y: DEFAULT_DEFENSE.SS.y, trajectory: 'AIR' },
    })
    const dritter = stand(3, {
      // Fuenf Leute laufen mit, nur zwei haben den Ball.
      defenders: POSITIONS.map(position =>
        ['LF', 'CF', 'RF', '3B', '2B'].includes(position)
          ? { position, x: DEFAULT_DEFENSE[position].x + 20, y: DEFAULT_DEFENSE[position].y }
          : { position, ...DEFAULT_DEFENSE[position] },
      ),
      ball: { state: 'IN_HAND', holder: '1B', x: DEFAULT_DEFENSE['1B'].x, y: DEFAULT_DEFENSE['1B'].y, trajectory: 'AIR' },
    })

    expect(beteiligte([stand(1), zweiter, dritter])).toEqual(['P', 'SS', '1B'])
  })

  /*
   * Beim Relay haelt niemand den Ball: er fliegt vom RF zum 2B und weiter zum SS, und in
   * den Staenden dazwischen steht er als fliegend neben dem Mann, der ihn gleich hat.
   * Zaehlte nur der Besitzwechsel, stuende unter einem Relay ein einziger Name.
   */
  test('zaehlt auch, wer den fliegenden Ball bei sich hat', () => {
    const beiRF = stand(2, {
      ball: { state: 'IN_FLIGHT', holder: null, x: DEFAULT_DEFENSE.RF.x, y: DEFAULT_DEFENSE.RF.y, trajectory: 'AIR' },
    })
    const beim2B = stand(3, {
      ball: { state: 'IN_FLIGHT', holder: null, x: DEFAULT_DEFENSE['2B'].x + 2, y: DEFAULT_DEFENSE['2B'].y, trajectory: 'AIR' },
    })

    expect(beteiligte([stand(1), beiRF, beim2B])).toEqual(['RF', '2B'])
  })

  /* Die Reihenfolge ist die des Plays: wer zuerst dran ist, steht zuerst. */
  test('zaehlt in der Reihenfolge auf, in der sie drankommen', () => {
    const zweiter = stand(2, {
      ball: { state: 'IN_HAND', holder: '3B', x: DEFAULT_DEFENSE['3B'].x, y: DEFAULT_DEFENSE['3B'].y, trajectory: 'AIR' },
    })
    const dritter = stand(3, {
      ball: { state: 'IN_HAND', holder: '2B', x: DEFAULT_DEFENSE['2B'].x, y: DEFAULT_DEFENSE['2B'].y, trajectory: 'AIR' },
    })

    expect(beteiligte([stand(1), zweiter, dritter])).toEqual(['P', '3B', '2B'])
  })
})

/*
 * Fuer den Filter „zeig mir Plays, in denen mein Platz etwas tut" ist Mitlaufen genug:
 * wer hinter die Base geht, steht nicht in der Ballkette, lernt aber genau dort seinen
 * Weg. Deshalb eine zweite, weitere Frage neben `beteiligte`.
 */
describe('mitwirkende', () => {
  test('nimmt die Ballkette UND alle, die laufen', () => {
    const zweiter = stand(2, {
      defenders: POSITIONS.map(position =>
        position === 'RF'
          ? { position, x: DEFAULT_DEFENSE.RF.x - 30, y: DEFAULT_DEFENSE.RF.y + 40 }
          : { position, ...DEFAULT_DEFENSE[position] },
      ),
      ball: { state: 'IN_HAND', holder: '1B', x: DEFAULT_DEFENSE['1B'].x, y: DEFAULT_DEFENSE['1B'].y, trajectory: 'AIR' },
    })

    const kette = beteiligte([stand(1), zweiter])
    const alle = mitwirkende([stand(1), zweiter])

    expect(kette).not.toContain('RF')
    expect(alle).toContain('RF')
    expect(alle).toContain('1B')
  })

  test('nennt niemanden, wenn niemand etwas tut', () => {
    expect(mitwirkende([stand(1), stand(2)])).toEqual([])
  })
})
