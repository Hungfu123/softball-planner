import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KAPITEL } from '../kapitel'

/* Die Saetze stehen in kapitel.ts, die Zeichnungen daneben. Geprueft wird das Kapitel. */
const BASE_KARTEN = KAPITEL[2].karten
import { FIRST_BASE } from '@/components/playmaker/board/geometry'

describe('Kapitel Auf der Base', () => {
  it('liefert fünf Karten mit genau diesen Pointen', () => {
    expect(BASE_KARTEN.map(k => k.pointe)).toEqual([
      'Die Base ist sicher',
      'Los erst beim Release',
      'Wild Pitch',
      'Steal',
      'Fly gefangen: erst zurück',
    ])
  })

  it('schreibt in keiner Karte einen Gedankenstrich', () => {
    for (const k of BASE_KARTEN) {
      expect(k.pointe).not.toContain('—')
      expect(k.satz ?? '').not.toContain('—')
    }
  })

  /*
   * Kein Leadoff: solange der Ball in der Hand der Pitcherin ist, steht die Läuferin
   * auf der Base. Erst nach dem Abwurf darf sie weg. Die Karte zeigt beides, und der
   * Test hält fest, dass der frühe Start wirklich zurückgeholt wird.
   */
  it('lässt die Läuferin erst los, wenn der Ball die Hand verlässt', async () => {
    const { Buehne } = BASE_KARTEN[1]
    render(<Buehne lauf={0} ruhig />)

    const x = () => parseFloat(screen.getByTestId('laeufer-frueh').getAttribute('cx') ?? '')

    // Ruhig-Modus zeigt den Endzustand: die zu früh gestartete Läuferin steht wieder
    // auf ihrer Base.
    await waitFor(() => expect(x()).toBeCloseTo(FIRST_BASE.x, 1))
  })

  it('zeigt bei Wild Pitch, dass der Ball am Catcher vorbeigeht', () => {
    const { Buehne } = BASE_KARTEN[2]
    render(<Buehne lauf={0} ruhig />)

    expect(screen.getByTestId('ball-wild')).toBeInTheDocument()
  })

  it.each(BASE_KARTEN.map(k => [k.id, k.Buehne] as const))(
    'zeigt %s im Ruhig-Modus ohne Absturz',
    (_id, Buehne) => {
      const { container } = render(<Buehne lauf={0} ruhig />)
      expect(container.firstChild).not.toBeNull()
    },
  )

  it.each(BASE_KARTEN.map(k => [k.id, k.Buehne] as const))(
    'zeigt %s auch mit laufender Bewegung',
    (_id, Buehne) => {
      const { container } = render(<Buehne lauf={1} ruhig={false} />)
      expect(container.firstChild).not.toBeNull()
    },
  )

  /* Die Tag-up-Karte ist der Zwilling von "Raus: gefangen" und erklärt sich am Ablauf. */
  it('lässt sich die Tag-up-Karte Schritt für Schritt durchtippen', async () => {
    const { Buehne } = BASE_KARTEN[4]
    render(<Buehne lauf={0} ruhig={false} />)

    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }))

    await waitFor(() => expect(screen.getByTestId('tagup-schritt')).toHaveTextContent('2'))
  })
})
