import type { PlayStep, PositionCode } from './types'

/** Weniger ist Standhalten, nicht Laufen. Zwei Fuss sind etwa eine Schrittlaenge. */
const SCHRITT = 2

/**
 * Wer in diesem Play etwas tut.
 *
 * Ein Play zeigt immer neun Verteidiger, aber nur drei oder vier davon haben eine
 * Aufgabe. Wer zuschaut, um es zu lernen, soll wissen, auf wen er achten muss — und das
 * steht nirgends als Feld, es steckt in den Staenden: **beteiligt ist, wer laeuft oder
 * den Ball hat.**
 *
 * Abgeleitet und nicht gepflegt, aus zwei Gruenden. Ein Feld dafuer muesste jemand bei
 * jeder Aenderung nachziehen, und ein vergessenes Feld sagt dann etwas Falsches. Und die
 * Daten wissen es ohnehin: ein Verteidiger, der sich ueber das ganze Play keinen Schritt
 * bewegt und den Ball nie beruehrt, steht im Bild, aber nicht im Spiel.
 *
 * Die Reihenfolge ist die des Plays: wer zuerst drankommt, steht zuerst.
 */
export function beteiligte(steps: PlayStep[]): PositionCode[] {
  const gesehen: PositionCode[] = []
  const merke = (position: PositionCode | null | undefined) => {
    if (position && !gesehen.includes(position)) gesehen.push(position)
  }

  steps.forEach((step, i) => {
    if (i === 0) return

    const vorher = steps[i - 1].markers
    /*
     * Wechselt der Ball den Besitzer, zaehlen BEIDE: der ihn abgibt und der ihn bekommt.
     * Der Pitcher, der ihn nur haelt und nie wirft, zaehlt dagegen nicht — sonst stuende
     * er unter „achte auf" in jedem Play, auch in denen, in denen er nichts tut.
     *
     * Erst der Ball, dann die Laeufer: im selben Stand ist der Wurf das Ereignis.
     */
    if (step.markers.ball.holder !== vorher.ball.holder) {
      merke(vorher.ball.holder)
      merke(step.markers.ball.holder)
    }

    for (const jetzt of step.markers.defenders) {
      const davor = vorher.defenders.find(d => d.position === jetzt.position)
      if (!davor) continue
      if (Math.hypot(jetzt.x - davor.x, jetzt.y - davor.y) >= SCHRITT) merke(jetzt.position)
    }
  })

  return gesehen
}
