import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LegendSheet } from './LegendSheet'
import { FARBE } from './board/farben'

/*
 * Die Legende ist der Schlüssel zu den Farben des Boards. Weicht sie ab, erklärt sie
 * ein Feld, das es nicht gibt — schlimmer als keine Legende. Deshalb steht hier die
 * Verbindung zu denselben Werten, die das Board benutzt.
 */
describe('Legende', () => {
  // Das Sheet portalt nach body, der Container der Render-Hilfe bleibt deshalb leer.
  const farben = () => {
    render(<LegendSheet onClose={vi.fn()} />)
    return [...document.body.querySelectorAll('li svg circle, li svg path')]
      .map(n => n.getAttribute('fill') ?? n.getAttribute('stroke'))
  }

  it('nennt dieselben Farben, die das Board malt', () => {
    const gesehen = farben()

    expect(gesehen).toContain(FARBE.hell) // Verteidiger und Ball
    expect(gesehen).toContain(FARBE.gut) // Runner
    expect(gesehen).toContain(FARBE.raus) // Out
  })

  it('zeigt kein Gras mehr, sondern die Buehne', () => {
    render(<LegendSheet onClose={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Legende' })).toBeInTheDocument()
    expect(farben()).not.toContain('#E6F03C')
  })
})
