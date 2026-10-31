import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KAPITEL } from '../kapitel'

/* Die Saetze stehen in kapitel.ts, die Zeichnungen daneben. Geprueft wird das Kapitel. */
const GETROFFEN_KARTEN = KAPITEL[1].karten
import { HOME, FIRST_BASE } from '@/components/playmaker/board/geometry'

describe('Kapitel Du hast getroffen', () => {
  it('liefert sechs Karten mit genau diesen Pointen', () => {
    expect(GETROFFEN_KARTEN.map(k => k.pointe)).toEqual([
      'Lauf. Sofort.',
      'Foul siehst du nicht',
      'Out: gefangen',
      'Out: Wurf zur 1',
      'Out: getickt',
      'An der 1 läufst du durch',
    ])
  })

  it('schreibt in keiner Karte einen Gedankenstrich', () => {
    for (const k of GETROFFEN_KARTEN) {
      expect(k.pointe).not.toContain('—')
      expect(k.satz ?? '').not.toContain('—')
    }
  })

  /*
   * Der Kern der Foul-Karte: beide Bälle starten auf HOME und sehen beim Abflug gleich
   * aus. Erst am Ende liegt der eine innerhalb der Foul-Linie und der andere draußen.
   * Die rechte Foul-Linie läuft unter 45 Grad von HOME nach oben rechts. Fair ist das
   * Feld ZWISCHEN den beiden Linien, also alles STEILER als 45 Grad.
   */
  it('lässt die beiden Bälle gleich losfliegen und erst spät auseinandergehen', async () => {
    const { Buehne } = GETROFFEN_KARTEN[1]
    render(<Buehne lauf={0} ruhig />)

    const ort = (testid: string) => {
      const el = screen.getByTestId(testid)
      return { x: parseFloat(el.getAttribute('cx') ?? ''), y: parseFloat(el.getAttribute('cy') ?? '') }
    }

    await waitFor(() => {
      const fair = ort('ball-fair')
      const foul = ort('ball-foul')
      // Innerhalb der Linie heißt: höher als weit, von HOME aus gerechnet.
      expect(HOME.y - fair.y).toBeGreaterThan(fair.x - HOME.x)
      expect(HOME.y - foul.y).toBeLessThan(foul.x - HOME.x)
    })
  })

  /*
   * Die Durchlauf-Karte sagt ZWEI Dinge, und das zweite kostet sonst ein Out: lauf über
   * die Base hinaus (Regel 5.10.4 j), aber steh danach wieder drauf. Ein Endzustand, in
   * dem sie hinter der Base steht, erzählte nur die Hälfte.
   */
  it('läuft über die 1 hinaus und endet trotzdem auf ihr', async () => {
    const { Buehne } = GETROFFEN_KARTEN[5]
    render(<Buehne lauf={0} ruhig />)

    const ort = (testid: string) => {
      const el = screen.getByTestId(testid)
      return { x: parseFloat(el.getAttribute('cx') ?? ''), y: parseFloat(el.getAttribute('cy') ?? '') }
    }

    // Der Umkehrpunkt liegt weiter weg von Home als die Base selbst.
    const weit = ort('ueberlauf')
    expect(weit.x - HOME.x).toBeGreaterThan(FIRST_BASE.x - HOME.x)

    // Und am Ende steht sie wieder auf der Base.
    await waitFor(() => {
      const sie = ort('durchlauf-laeufer')
      expect(sie.x).toBeCloseTo(FIRST_BASE.x, 1)
      expect(sie.y).toBeCloseTo(FIRST_BASE.y, 1)
    })
  })

  it.each(GETROFFEN_KARTEN.map(k => [k.id, k.Buehne] as const))(
    'zeigt %s im Ruhig-Modus ohne Absturz',
    (_id, Buehne) => {
      const { container } = render(<Buehne lauf={0} ruhig />)
      expect(container.firstChild).not.toBeNull()
    },
  )

  it.each(GETROFFEN_KARTEN.map(k => [k.id, k.Buehne] as const))(
    'zeigt %s auch mit laufender Bewegung',
    (_id, Buehne) => {
      const { container } = render(<Buehne lauf={1} ruhig={false} />)
      expect(container.firstChild).not.toBeNull()
    },
  )
})
