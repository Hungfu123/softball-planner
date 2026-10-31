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
    expect(screen.getByText('Wohin laufe ich, wann bin ich out?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Auf der Base/ })).toHaveAttribute('href', '/spielwissen/base')
    expect(screen.getByText('Wann darf ich weiter?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Defense/ })).toHaveAttribute('href', '/orga/playmaker')
  })

  /*
   * Offense sagt in Stichworten, was drinsteht; Defense sagte bisher nichts. Eine Zeile
   * ohne Inhaltsangabe neben drei Zeilen mit einer ist eine blinde Tuer: man sieht nicht,
   * dass dahinter Bunt-Defense, Rundown und der Cut-off liegen.
   */
  it('sagt auch bei Defense in Stichworten, was dahinter liegt', () => {
    zeige()

    // Grossgeschrieben wird in CSS, im Text steht die normale Schreibweise.
    const defense = screen.getByRole('link', { name: /Defense/ })
    for (const wort of ['Cut-off', 'Bunt-Defense', 'Rundown', 'Pickoff']) {
      expect(defense.textContent).toContain(wort)
    }
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

  /*
   * Die Seite holt genau EINEN Abruf: die Kategorien, damit Defense dieselben Zeilen
   * zeigen kann wie Offense. Mehr nicht — und vor allem darf Offense nicht daran haengen.
   */
  it('ruft nur die Kategorien ab, sonst nichts unter /api', () => {
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

    expect(rufe.filter(u => u.includes('/api'))).toEqual(['/api/play-categories'])
  })

  /* Und wenn der Abruf scheitert, steht Offense trotzdem da — das ist das Versprechen. */
  it('zeigt Offense auch ohne Netz, und Defense als eine Tür', () => {
    const alt = globalThis.fetch
    globalThis.fetch = (() => Promise.reject(new Error('kein Netz im Test'))) as typeof fetch

    try {
      zeige()
    } finally {
      globalThis.fetch = alt
    }

    expect(screen.getByRole('link', { name: /In der Box/ })).toHaveAttribute('href', '/spielwissen/box')
    expect(screen.getByRole('link', { name: /Defense/ })).toHaveAttribute('href', '/orga/playmaker')
  })
})
