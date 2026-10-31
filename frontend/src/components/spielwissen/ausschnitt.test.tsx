import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KAPITEL } from './kapitel'
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
const DIAMANT = {
  x: THIRD_BASE.x,
  y: SECOND_BASE.y,
  w: FIRST_BASE.x - THIRD_BASE.x,
  h: HOME.y - SECOND_BASE.y,
}

function anteil(svg: SVGSVGElement) {
  const [, , w] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number)
  return DIAMANT.w / w
}

describe('Ausschnitte der Bühne', () => {
  const base = KAPITEL.find(k => k.id === 'base')!

  it.each(base.karten)('Karte base/$id zeigt den Diamanten gross', karte => {
    const { container, unmount } = render(<karte.Buehne lauf={0} ruhig />)
    const svg = container.querySelector('svg')!
    const teil = anteil(svg as SVGSVGElement)
    unmount()

    expect(teil).toBeGreaterThan(0.6)
  })

  /* Und was die Karten zeichnen, liegt drin: ein Ausschnitt, der den Ball abschneidet,
     ist kein engerer Ausschnitt, sondern ein kaputtes Bild. */
  it.each(base.karten)('Karte base/$id schneidet nichts ab', karte => {
    const { container, unmount } = render(<karte.Buehne lauf={0} ruhig />)
    const svg = container.querySelector('svg')!
    const [x, y, w, h] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number)
    const kreise = [...svg.querySelectorAll('circle, ellipse')].map(e => ({
      cx: Number(e.getAttribute('cx') ?? 0),
      cy: Number(e.getAttribute('cy') ?? 0),
      r: Number(e.getAttribute('r') ?? e.getAttribute('rx') ?? 0),
    }))
    unmount()

    const draussen = kreise.filter(
      k => k.cx !== 0 && (k.cx - k.r < x || k.cx + k.r > x + w || k.cy - k.r < y || k.cy + k.r > y + h),
    )
    expect(draussen).toEqual([])
  })
})
