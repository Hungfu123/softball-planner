import type { PlayStep, PositionCode } from './types'

/** So nah am Ball steht nur, wer ihn gerade hat oder gleich bekommt. */
const AM_BALL = 9

/**
 * Die Kette, durch die der Ball geht.
 *
 * Ein Play zeigt immer neun Verteidiger. Wer zuschaut, um es zu lernen, soll wissen, auf
 * wen er achten muss — und das ist, **wer den Ball abgibt oder bekommt**.
 *
 * **Mitlaufen zaehlt ausdruecklich nicht.** Zuerst stand hier „wer laeuft oder den Ball
 * hat", und das war richtig gedacht und falsch gemessen: seit jeder Wurf abgesichert
 * wird, bewegen sich in den meisten Plays sechs oder sieben Leute. Im Schnitt standen
 * 4,2 Namen in der Zeile und bis zu sieben Ringe im Bild — eine Markierung, die fast
 * jeden trifft, markiert niemanden. Mit der Ballkette sind es 1,9 Namen, hoechstens drei.
 *
 * Abgeleitet und nicht gepflegt: ein Feld dafuer muesste jemand bei jeder Aenderung
 * nachziehen, und ein vergessenes Feld sagt dann etwas Falsches.
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
     */
    if (step.markers.ball.holder !== vorher.ball.holder && step.markers.ball.holder) {
      // Beide zaehlen — aber nur bei einer echten Uebergabe von Hand zu Hand. Laesst
      // einer los und der Ball fliegt (holder wird null), ist das der Pitch oder der
      // Schlag; der Pitcher gehoert nicht in die Kette, nur weil er angefangen hat.
      merke(vorher.ball.holder)
      merke(step.markers.ball.holder)
    }

    /*
     * Beim Relay haelt niemand den Ball: er fliegt vom RF zum 2B und weiter, und in den
     * Staenden dazwischen steht er als fliegend direkt neben dem Mann, der ihn gleich
     * hat. Zaehlte nur der Besitzwechsel, stuende unter einem Relay ein einziger Name.
     */
    if (!step.markers.ball.holder) {
      const dran = step.markers.defenders.find(
        f => Math.hypot(f.x - step.markers.ball.x, f.y - step.markers.ball.y) <= AM_BALL,
      )
      if (dran) merke(dran.position)
    }
  })

  return gesehen
}

/** Weniger ist Standhalten, nicht Laufen. Zwei Fuss sind etwa eine Schrittlaenge. */
const SCHRITT = 2

/**
 * Wer in diesem Play ueberhaupt etwas tut — Ballkette UND alle, die laufen.
 *
 * Das ist die weitere Frage als {@link beteiligte}: dort geht es um die drei Namen, auf
 * die man beim Zuschauen achtet, hier darum, ob ein Play fuer **meine Position** etwas
 * enthaelt. Wer hinter die Base laeuft, steht nicht in der Kette, lernt aber genau hier
 * seinen Weg.
 */
export function mitwirkende(steps: PlayStep[]): PositionCode[] {
  const gesehen = new Set<PositionCode>(beteiligte(steps))

  steps.forEach((step, i) => {
    if (i === 0) return
    const vorher = steps[i - 1].markers
    for (const jetzt of step.markers.defenders) {
      const davor = vorher.defenders.find(d => d.position === jetzt.position)
      if (davor && Math.hypot(jetzt.x - davor.x, jetzt.y - davor.y) >= SCHRITT) {
        gesehen.add(jetzt.position)
      }
    }
  })

  return [...gesehen]
}
