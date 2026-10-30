import { describe, expect, test } from 'vitest'
import { ballAnteil, dauerMs, KUERZESTE_MS, LAENGSTE_MS } from './tempo'
import { DEFAULT_DEFENSE, POSITIONS } from './geometry'
import type { PlayMarkers } from './types'

function stand(over: Partial<PlayMarkers> = {}): PlayMarkers {
  return {
    defenders: POSITIONS.map(position => ({ position, ...DEFAULT_DEFENSE[position] })),
    runners: [],
    ball: { state: 'IN_HAND', holder: 'P', x: DEFAULT_DEFENSE.P.x, y: DEFAULT_DEFENSE.P.y, trajectory: 'AIR' },
    ...over,
  }
}

function ballBei(x: number, y: number): PlayMarkers {
  return stand({ ball: { state: 'IN_FLIGHT', holder: null, x, y, trajectory: 'AIR' } })
}

/*
 * Die Dauer eines Uebergangs stand frueher im Feld durationMs, und bei der Haelfte aller
 * Staende stand dort der Vorgabewert 1,2 s — ein kurzer Flip zur 1 dauerte also genauso
 * lang wie ein Relay ueber das halbe Feld. Gemessen flog der Ball dadurch mit 29 Fuss je
 * Sekunde, ein Drittel eines echten Wurfs. Jetzt kommt die Dauer aus der Strecke.
 */
describe('dauerMs', () => {
  const P = DEFAULT_DEFENSE.P

  test('laesst einen langen Wurf laenger dauern als einen kurzen', () => {
    const kurz = dauerMs(stand(), ballBei(P.x + 20, P.y))
    const lang = dauerMs(stand(), ballBei(P.x + 120, P.y))

    expect(lang).toBeGreaterThan(kurz)
  })

  test('braucht fuer einen stehenden Stand die kuerzeste Zeit', () => {
    expect(dauerMs(stand(), stand())).toBe(KUERZESTE_MS)
  })

  test('deckelt auch den Wurf ueber das ganze Feld', () => {
    expect(dauerMs(stand(), ballBei(P.x + 400, P.y))).toBe(LAENGSTE_MS)
  })

  /*
   * Menschen sind langsamer als Baelle. Laeuft jemand dieselbe Strecke, die der Ball
   * fliegt, dauert der Stand so lange, wie der LANGSAMERE braucht — sonst steht der
   * Laeufer am Ziel, bevor er losgelaufen ist.
   */
  test('richtet sich nach dem Langsamsten im Bild', () => {
    const weg = 60
    const nurBall = dauerMs(stand(), ballBei(P.x + weg, P.y))
    const mitLaeufer = dauerMs(
      stand({ runners: [{ id: 'r1', x: 100, y: 200, status: 'ACTIVE' }] }),
      stand({
        runners: [{ id: 'r1', x: 100 + weg, y: 200, status: 'ACTIVE' }],
        ball: { state: 'IN_FLIGHT', holder: null, x: P.x + weg, y: P.y, trajectory: 'AIR' },
      }),
    )

    expect(mitLaeufer).toBeGreaterThan(nurBall)
  })

  /* Im Zehner-Raster, damit die Zahlen nicht zufaellig aussehen. */
  test('rundet auf glatte Zehntelsekunden', () => {
    expect(dauerMs(stand(), ballBei(P.x + 73, P.y)) % 100).toBe(0)
  })
})

/*
 * Der Ball und die Menschen teilen sich einen Stand, brauchen aber nicht gleich lang.
 * Vorher wurde der Wurf ueber die ganze Dauer gestreckt: wer dreissig Fuss warf,
 * waehrend jemand sechzig lief, sah einen Ball, der schwebte. Jetzt kommt der Ball an,
 * wenn er ankaeme, und liegt den Rest des Standes im Handschuh.
 */
describe('ballAnteil', () => {
  const P = DEFAULT_DEFENSE.P
  const ruht = stand()

  test('ist bei einem Ball, der laenger braucht als alle Laeufer, der Takt selbst', () => {
    const weit = ballBei(P.x + 160, P.y)

    expect(ballAnteil(ruht, weit, 0.5)).toBeCloseTo(0.5, 2)
  })

  test('ist schon durch, wenn der Ball kurz fliegt und jemand weit laeuft', () => {
    const von = stand({ runners: [{ id: 'r1', x: 100, y: 200, status: 'ACTIVE' }] })
    const nach = stand({
      runners: [{ id: 'r1', x: 100, y: 140, status: 'ACTIVE' }],
      ball: { state: 'IN_FLIGHT', holder: null, x: P.x + 20, y: P.y, trajectory: 'AIR' },
    })

    expect(ballAnteil(von, nach, 0.5)).toBe(1)
  })

  test('bleibt bei einem ruhenden Ball ganz vorn, statt durch null zu teilen', () => {
    expect(ballAnteil(ruht, ruht, 0.3)).toBe(1)
  })
})
