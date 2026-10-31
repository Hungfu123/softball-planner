import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KAPITEL } from './kapitel'
import { AUSSCHNITTE } from './buehne'
import { HOME, FIRST_BASE, SECOND_BASE, THIRD_BASE } from '@/components/playmaker/board/geometry'

/**
 * **Wie gross steht der Diamant im Bild?**
 *
 * Die Karten des Kapitels „Auf der Base" zeigen alle dieselbe Sache: jemand steht auf
 * einer Base und laeuft zur naechsten. Sie nahmen dafuer den weiten Infield-Ausschnitt,
 * der beide Foul-Linien bis weit ins Aus mitnimmt — gebraucht fuer den Foul-Ball einer
 * anderen Karte, hier aber nur Gras. Der Diamant fuellte damit 41 Prozent der Breite,
 * und am Handy kam die Hoehe als gewachsener Rand noch dazu: eine kleine Zeichnung in
 * einer grossen Flaeche, also genau das, was auf der Offense-Seite schon einmal falsch
 * war.
 *
 * Gemessen wird der Diamant, nicht die Zeichnung: er ist auf jeder dieser Karten da und
 * laesst sich aus der Geometrie ausrechnen. Zwei Drittel der Breite sind die Grenze —
 * mehr hiesse, die Foul-Linien aus dem Bild zu schneiden.
 */
const DIAMANT_KASTEN = {
  x: THIRD_BASE.x,
  y: SECOND_BASE.y,
  w: FIRST_BASE.x - THIRD_BASE.x,
  h: HOME.y - SECOND_BASE.y,
}

const viewBox = (a: { x: number; y: number; w: number; h: number }) => `${a.x} ${a.y} ${a.w} ${a.h}`

/*
 * Nur die Feld-Ausschnitte, nicht jede Zeichnung: eine Karte, die ihre eigene Buehne
 * malt (die Schlagzone, der Fuss in der Box), legt ihre Formen bewusst an den Rand und
 * darueber hinaus. Die Regel gilt dem Feld.
 */
const KASTEN = Object.values(AUSSCHNITTE).map(viewBox)
const feldSvgs = (c: HTMLElement) =>
  [...c.querySelectorAll('svg')].filter(s => KASTEN.includes(s.getAttribute('viewBox') ?? ''))

function anteil(svg: SVGSVGElement) {
  const [, , w] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number)
  return DIAMANT_KASTEN.w / w
}

/*
 * Die Karten, die den Diamanten zeigen — das ganze Kapitel „Auf der Base" und vier
 * weitere. Gemessen wurde jede einzeln: ihr Inhalt passt in den engeren Ausschnitt.
 * NICHT dabei ist „Foul siehst du nicht": der Foul-Ball fliegt bis x=230 und braucht
 * die Weite, fuer die der Infield-Ausschnitt ueberhaupt da ist.
 */
const DIAMANT = ['base/sicher', 'base/force', 'base/release', 'base/wild-pitch', 'base/steal', 'base/tag-up',
  'box/dritter-strike', 'box/bunt-wofuer', 'getroffen/wurf-zur-eins']
/* „Der Count ist ein Wettlauf" nimmt denselben Ausschnitt, zeigt ihn aber erst am Ende
   des Laufs (Walk oder Out). Im Anfangsbild gibt es ihn nicht, also nichts zu messen. */

const karten = KAPITEL.flatMap(k => k.karten.map(karte => ({ weg: `${k.id}/${karte.id}`, karte })))

describe('Ausschnitte der Bühne', () => {
  it.each(karten.filter(x => DIAMANT.includes(x.weg)))('Karte $weg zeigt den Diamanten gross', ({ karte }) => {
    const { container, unmount } = render(<karte.Buehne lauf={0} ruhig />)
    const felder = feldSvgs(container).filter(s => s.getAttribute('viewBox') === viewBox(AUSSCHNITTE.diamant))
    const teile = felder.map(s => anteil(s as SVGSVGElement))
    unmount()

    expect(teile.length).toBeGreaterThan(0)
    for (const teil of teile) expect(teil).toBeGreaterThan(0.6)
  })

  /* Und was die Karten zeichnen, liegt drin: ein Ausschnitt, der den Ball abschneidet,
     ist kein engerer Ausschnitt, sondern ein kaputtes Bild. Das gilt fuer alle Karten,
     nicht nur fuer die engeren. */
  it.each(karten)('Karte $weg schneidet nichts ab', ({ karte }) => {
    const { container, unmount } = render(<karte.Buehne lauf={0} ruhig />)
    const draussen: unknown[] = []
    for (const svg of feldSvgs(container)) {
      const [x, y, w, h] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number)
      for (const e of svg.querySelectorAll('circle, ellipse')) {
        /* Liegt die Form in einer verschobenen Gruppe, sind ihre Zahlen relativ zu der
           Gruppe. Die rechnet dieser Test nicht nach. */
        if (e.closest('g[transform], g[style*="transform"]')) continue
        const cx = Number(e.getAttribute('cx') ?? 0)
        const cy = Number(e.getAttribute('cy') ?? 0)
        const r = Number(e.getAttribute('r') ?? e.getAttribute('rx') ?? 0)
        if (cx === 0) continue
        if (cx - r < x || cx + r > x + w || cy - r < y || cy + r > y + h) draussen.push(`${cx}/${cy}`)
      }
    }
    unmount()

    expect(draussen).toEqual([])
  })
})
