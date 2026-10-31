import type { PlayMarkers } from './types'

/**
 * Wie lange ein Uebergang dauert — aus der Bewegung gerechnet, nicht aus einem Feld.
 *
 * **Warum nicht `durationMs`:** bei der Haelfte aller Staende stand dort der Vorgabewert
 * 1200 ms. Ein Flip von P zur 1 dauerte damit genauso lang wie ein Relay ueber das halbe
 * Feld, und gemessen flog der Ball im Mittel mit 29 Fuss je Sekunde — ein Drittel eines
 * echten Wurfs. Genau das liess die Plays mechanisch aussehen: nicht die Kurve, sondern
 * dass jede Strecke dieselbe Zeit bekam.
 *
 * **Die Geschwindigkeiten sind etwas unter echt, aber im richtigen Verhaeltnis
 * zueinander.** Ein harter Infield-Wurf liegt bei rund 95 ft/s, ein schneller Laeufer bei
 * rund 21 ft/s. Hier stehen 80 und 18: langsam genug, dass man dem Ball folgen kann,
 * schnell genug, dass ein Wurf wie ein Wurf aussieht — und das Verhaeltnis von viereinhalb
 * zu eins bleibt, damit der Ball vor dem Laeufer ankommt, wo er das auch in echt taete.
 *
 * Der Stand dauert so lange, wie das **langsamste** Stueck braucht. Der Ball ist dann
 * frueher da und wartet; das ist der Sinn eines Wurfs.
 */
const BALL_FT_PRO_S = 80
const MENSCH_FT_PRO_S = 18

/** Kuerzer wirkt wie ein Sprung, laenger wie Stillstand. */
export const KUERZESTE_MS = 400
export const LAENGSTE_MS = 2400

const weg = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * Lesezeit fuer einen Stand, der nichts bewegt.
 *
 * Es gibt Staende, die nichts zeigen, sondern etwas sagen — „Alternative: faellt der
 * Ball, trotzdem Out". Mit der Untergrenze von 0,4 s blitzten sie auf und der Satz war
 * weg, bevor man ihn gelesen hatte. Rund 25 ms je Zeichen plus eine halbe Sekunde
 * Anlauf; die Obergrenze des Standes gilt weiter.
 */
const LESEN_MS_JE_ZEICHEN = 25
const LESEN_GRUND_MS = 500

export function dauerMs(von: PlayMarkers, nach: PlayMarkers, notiz?: string | null): number {
  const ballSekunden = weg(von.ball, nach.ball) / BALL_FT_PRO_S

  let menschWeg = 0
  for (const ziel of nach.defenders) {
    const start = von.defenders.find(d => d.position === ziel.position)
    if (start) menschWeg = Math.max(menschWeg, weg(start, ziel))
  }
  for (const ziel of nach.runners) {
    const start = von.runners.find(r => r.id === ziel.id)
    if (start) menschWeg = Math.max(menschWeg, weg(start, ziel))
  }

  const sekunden = Math.max(ballSekunden, menschWeg / MENSCH_FT_PRO_S)
  const ms = Math.round((sekunden * 1000) / 100) * 100

  // Bewegt sich nichts, traegt der Satz den Stand — dann zaehlt die Lesezeit.
  const steht = ballSekunden === 0 && menschWeg === 0
  const lesen = steht && notiz ? LESEN_GRUND_MS + notiz.length * LESEN_MS_JE_ZEICHEN : 0

  return Math.min(LAENGSTE_MS, Math.max(KUERZESTE_MS, ms, lesen))
}

/**
 * Wie weit der Ball ist, wenn der Stand zu `t` durch ist.
 *
 * **Der Ball hat seine eigene Uhr.** Ein Stand dauert so lange wie sein langsamstes
 * Stueck, meist ein Laeufer; der Wurf darueber zu strecken war der eigentliche Fehler an
 * der alten Animation. Gemessen flog der Ball dadurch im Mittel mit 32 Fuss je Sekunde,
 * auch nachdem die Dauer aus der Strecke kam — er schwebte neben dem Laeufer her, statt
 * anzukommen und zu warten.
 *
 * Jetzt ist er fertig, wenn er fertig waere, und liegt den Rest des Standes im
 * Handschuh. Genau das macht einen Wurf lesbar: der Ball ist vor dem Laeufer da.
 */
export function ballAnteil(von: PlayMarkers, nach: PlayMarkers, t: number): number {
  const ballSekunden = weg(von.ball, nach.ball) / BALL_FT_PRO_S
  if (ballSekunden <= 0) return 1

  const standSekunden = dauerMs(von, nach) / 1000
  return Math.min(1, (t * standSekunden) / ballSekunden)
}
