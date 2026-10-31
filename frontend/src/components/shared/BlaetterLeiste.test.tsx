import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BlaetterLeiste } from './BlaetterLeiste'

function zeige(props: Partial<Parameters<typeof BlaetterLeiste>[0]> = {}) {
  return render(
    <MemoryRouter>
      <BlaetterLeiste
        zurueck={{ to: '/vorher' }}
        zurueckLabel="Vorheriges Play"
        stand="Play 6 von 9"
        weiter={{ to: '/nachher' }}
        fertig={{ to: '/uebersicht' }}
        {...props}
      />
    </MemoryRouter>,
  )
}

/*
 * Offense und Defense hatten dieselbe Zeile zweimal gebaut, und sie lief auseinander:
 * „Naechstes Play" hier, „Weiter" dort, am Kapitelende der Kapitelname als Beschriftung
 * — drei Formen fuer eine Handlung, drei Breiten. Jetzt gibt es die Zeile einmal.
 */
describe('Blätterleiste', () => {
  it('nennt den Weg vorwärts in beiden Ansichten gleich', () => {
    zeige()

    expect(screen.getByRole('link', { name: /^Weiter/ })).toHaveAttribute('href', '/nachher')
  })

  it('führt am Ende nicht weiter, sondern fertig', () => {
    zeige({ weiter: null })

    expect(screen.queryByRole('link', { name: /^Weiter/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fertig' })).toHaveAttribute('href', '/uebersicht')
  })

  /* Ein abgeschalteter Knopf zeigt die Richtung UND dass sie hier zu Ende ist. Ein
     leerer Platzhalter zeigte nur eine Luecke. */
  it('zeigt den Weg zurück auch dann, wenn es keinen gibt', () => {
    zeige({ zurueck: null })

    expect(screen.getByRole('button', { name: 'Vorheriges Play' })).toBeDisabled()
  })

  /* Die Offense blaettert im Zustand, die Defense per Adresse. Dieselbe Zeile traegt beides. */
  it('trägt Knöpfe genauso wie Links', () => {
    const vor = vi.fn()
    zeige({ weiter: { onClick: vor } })

    fireEvent.click(screen.getByRole('button', { name: /^Weiter/ }))

    expect(vor).toHaveBeenCalled()
  })

  it('sagt, wo man ist', () => {
    zeige()

    expect(screen.getByText('Play 6 von 9')).toBeInTheDocument()
  })
})
