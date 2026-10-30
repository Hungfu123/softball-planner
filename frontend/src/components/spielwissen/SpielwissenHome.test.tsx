import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SpielwissenHome from './SpielwissenHome'

function zeige() {
  return render(
    <MemoryRouter>
      <SpielwissenHome />
    </MemoryRouter>,
  )
}

describe('Spielwissen-Uebersicht', () => {
  /*
   * Die oberste Ebene ist der Schnitt, in dem ein Softballer denkt: Offense gegen
   * Defense. Defense fuehrt ohne Zwischenseite in die bestehende Play-Uebersicht.
   */
  it('bietet Offense mit seinen drei Fragen und Defense', () => {
    zeige()

    expect(screen.getByRole('link', { name: /In der Box/ })).toHaveAttribute('href', '/spielwissen/box')
    expect(screen.getByText('Was zählt als Strike?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Du hast getroffen/ })).toHaveAttribute('href', '/spielwissen/getroffen')
    expect(screen.getByText('Wohin laufe ich, wann bin ich raus?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Auf der Base/ })).toHaveAttribute('href', '/spielwissen/base')
    expect(screen.getByText('Wann darf ich weiter?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Defense/ })).toHaveAttribute('href', '/orga/playmaker')
  })

  /*
   * Wer vor dem Spiel etwas sucht, sucht eine Frage, keine Ordnungszahl. Die Nummern
   * stehen deshalb nirgends.
   */
  it('nennt keine Kapitelnummern', () => {
    zeige()

    expect(screen.queryByText(/Kapitel \d/)).not.toBeInTheDocument()
  })

  /* Vorgabe des Betreibers: keine Gedankenstriche in sichtbarem Text. */
  it('schreibt keinen Gedankenstrich in sichtbaren Text', () => {
    const { container } = zeige()

    expect(container.textContent).not.toContain('—')
  })

  /* Offense muss ohne Netz gehen. Ein einziger Abruf hier braeche das Versprechen. */
  it('ruft nichts unter /api ab', () => {
    const rufe: string[] = []
    const alt = globalThis.fetch
    globalThis.fetch = ((eingabe: RequestInfo | URL) => {
      rufe.push(String(eingabe))
      return Promise.reject(new Error('kein Netz im Test'))
    }) as typeof fetch

    try {
      zeige()
    } finally {
      globalThis.fetch = alt
    }

    expect(rufe.filter(u => u.includes('/api'))).toEqual([])
  })
})
