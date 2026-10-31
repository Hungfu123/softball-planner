import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LernZeile } from './LernZeile'

function zeige(props: Partial<Parameters<typeof LernZeile>[0]> = {}) {
  return render(
    <MemoryRouter>
      <LernZeile to="/spielwissen/box" titel="In der Box" satz="Was zählt als Strike?" {...props} />
    </MemoryRouter>,
  )
}

/*
 * Dieselbe Zeile fuer alles, was man sich aussucht, um es zu lernen: ein Kapitel der
 * Offense, eine Kategorie der Defense, ein Play darin. Vorher waren es zwei Sprachen —
 * gerundete Karten mit Kante im Spielwissen, randlose Zeilen mit Trennstrich im Kapitel.
 */
describe('Lernzeile', () => {
  it('ist EIN Link, nicht zwei', () => {
    zeige({ bild: <svg data-testid="vorschau" /> })

    const treffer = screen.getAllByRole('link')
    expect(treffer).toHaveLength(1)
    expect(treffer[0]).toHaveAttribute('href', '/spielwissen/box')
    expect(screen.getByTestId('vorschau')).toBeInTheDocument()
  })

  it('nennt Titel und Frage', () => {
    zeige()

    expect(screen.getByRole('link')).toHaveTextContent('In der Box')
    expect(screen.getByText('Was zählt als Strike?')).toBeInTheDocument()
  })

  /* Die Stufe gehoert dem Kapitel; ein Play darin hat keine und zeigt auch keine. */
  it('zeigt die Stufe nur, wenn es eine gibt', () => {
    const { rerender } = zeige({ stufe: 2 })
    expect(screen.getByText('Stufe 2 von 3')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <LernZeile to="/x" titel="Ohne" satz="Satz" />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/Stufe \d von 3/)).toBeNull()
  })

  it('trägt Stichworte und eine Marke', () => {
    zeige({ worte: ['Zone', 'Count'], marke: 'Knapp' })

    expect(screen.getByText('Zone · Count')).toBeInTheDocument()
    expect(screen.getByText('Knapp')).toBeInTheDocument()
  })
})
