import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BOX_KARTEN } from './box'

describe('Kapitel In der Box', () => {
  it('liefert sechs Karten mit genau diesen Pointen', () => {
    expect(BOX_KARTEN.map(k => k.pointe)).toEqual([
      'Die Zone bist du',
      'Drin ist Strike',
      'Auch Strike',
      'Der Count ist ein Wettlauf',
      'Wofür ein Bunt gut ist',
      'Die Bunt-Falle',
    ])
  })

  /* Vorgabe des Betreibers: keine Gedankenstriche in sichtbarem Text. */
  it('schreibt in keiner Karte einen Gedankenstrich', () => {
    for (const k of BOX_KARTEN) {
      expect(k.pointe).not.toContain('—')
      expect(k.satz ?? '').not.toContain('—')
    }
  })

  /*
   * Der ganze Punkt der ersten Karte: die Zone klebt nicht am Boden, sondern am
   * Menschen. Waechst die Figur, waechst die Zone mit.
   */
  it('lässt die Zone mit der Figur wachsen', async () => {
    const { Buehne } = BOX_KARTEN[0]
    render(<Buehne lauf={0} ruhig={false} />)

    // motion schreibt das Attribut mit Einheit ("44px"), deshalb parseFloat.
    const hoehe = () => parseFloat(screen.getByTestId('zone').getAttribute('height') ?? '')
    const klein = hoehe()
    expect(klein).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Groß' }))

    // motion schreibt das Attribut ueber Frames, nicht im selben Tick.
    await waitFor(() => expect(hoehe()).toBeGreaterThan(klein))
  })

  /*
   * Bei abgeschalteter Bewegung laeuft keine Sequenz. Jede Buehne muss trotzdem etwas
   * zeigen, und zwar ihren Endzustand: das Bild traegt die Auskunft.
   */
  it.each(BOX_KARTEN.map(k => [k.id, k.Buehne] as const))(
    'zeigt %s im Ruhig-Modus ohne Absturz',
    (_id, Buehne) => {
      const { container } = render(<Buehne lauf={0} ruhig />)
      expect(container.firstChild).not.toBeNull()
    },
  )

  it.each(BOX_KARTEN.map(k => [k.id, k.Buehne] as const))(
    'zeigt %s auch mit laufender Bewegung',
    (_id, Buehne) => {
      const { container } = render(<Buehne lauf={1} ruhig={false} />)
      expect(container.firstChild).not.toBeNull()
    },
  )
})
