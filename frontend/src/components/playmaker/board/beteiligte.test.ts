import { describe, expect, test } from 'vitest'
import { beteiligte } from './beteiligte'
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
 * Ein Play zeigt neun Verteidiger, aber nur drei davon tun etwas. Wer das Play zum
 * Lernen anschaut, soll wissen, auf wen er achten muss — und das steht nicht in den
 * Daten, es steckt in ihnen: beteiligt ist, wer laeuft oder den Ball hat.
 */
describe('beteiligte', () => {
  test('nennt niemanden, wenn sich nichts bewegt', () => {
    expect(beteiligte([stand(1), stand(2)])).toEqual([])
  })

  test('nennt, wer sich bewegt', () => {
    const zweiter = stand(2, {
      defenders: POSITIONS.map(position =>
        position === 'SS'
          ? { position, x: DEFAULT_DEFENSE.SS.x + 20, y: DEFAULT_DEFENSE.SS.y }
          : { position, ...DEFAULT_DEFENSE[position] },
      ),
    })

    expect(beteiligte([stand(1), zweiter])).toEqual(['SS'])
  })

  test('nennt, wer den Ball hat, auch wenn er stehen bleibt', () => {
    const zweiter = stand(2, {
      ball: { state: 'IN_HAND', holder: '1B', x: DEFAULT_DEFENSE['1B'].x, y: DEFAULT_DEFENSE['1B'].y, trajectory: 'AIR' },
    })

    expect(beteiligte([stand(1), zweiter])).toEqual(['P', '1B'])
  })

  /* Ein Zittern von einem Fuss ist keine Bewegung — sonst steht am Ende das ganze Team da. */
  test('ueberhoert einen Schritt von unter zwei Fuss', () => {
    const zweiter = stand(2, {
      defenders: POSITIONS.map(position =>
        position === 'CF'
          ? { position, x: DEFAULT_DEFENSE.CF.x + 1.2, y: DEFAULT_DEFENSE.CF.y }
          : { position, ...DEFAULT_DEFENSE[position] },
      ),
    })

    expect(beteiligte([stand(1), zweiter])).toEqual([])
  })

  /* Die Reihenfolge ist die des Plays: wer zuerst dran ist, steht zuerst. */
  test('zaehlt in der Reihenfolge auf, in der sie drankommen', () => {
    const zweiter = stand(2, {
      ball: { state: 'IN_HAND', holder: '3B', x: DEFAULT_DEFENSE['3B'].x, y: DEFAULT_DEFENSE['3B'].y, trajectory: 'AIR' },
    })
    const dritter = stand(3, {
      defenders: POSITIONS.map(position =>
        position === '2B'
          ? { position, x: DEFAULT_DEFENSE['2B'].x + 15, y: DEFAULT_DEFENSE['2B'].y }
          : { position, ...DEFAULT_DEFENSE[position] },
      ),
      ball: { state: 'IN_HAND', holder: '3B', x: DEFAULT_DEFENSE['3B'].x, y: DEFAULT_DEFENSE['3B'].y, trajectory: 'AIR' },
    })

    expect(beteiligte([stand(1), zweiter, dritter])).toEqual(['P', '3B', '2B'])
  })
})
