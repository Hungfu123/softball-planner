import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { BuehnenProps } from './kapitel'

/*
 * Die echten Kapitel entstehen erst in den Kartendateien. Hier stehen drei gestellte,
 * damit die Seite fuer sich geprueft werden kann: getestet wird das Blaettern und der
 * Umgang mit einer Adresse, die es nicht gibt, nicht der Inhalt der Karten.
 */
function Attrappe({ lauf }: BuehnenProps) {
  return <div data-testid="buehne" data-lauf={String(lauf)} />
}

const karte = (id: string, pointe: string) => ({ id, stichwort: pointe.split(' ')[0], pointe, Buehne: Attrappe })

vi.mock('./kapitel', async (echt) => {
  const modul = await echt<typeof import('./kapitel')>()
  const KAPITEL = [
    { id: 'box', titel: 'In der Box', frage: 'Was zählt als Strike?', karten: [karte('zone', 'Die Zone bist du'), karte('drin', 'Drin ist Strike')] },
    { id: 'getroffen', titel: 'Du hast getroffen', frage: 'Wohin laufe ich, wann bin ich out?', karten: [karte('lauf', 'Lauf. Sofort.')] },
    { id: 'base', titel: 'Auf der Base', frage: 'Wann darf ich weiter?', karten: [karte('sicher', 'Die Base ist sicher')] },
  ]
  return { ...modul, KAPITEL, findeKapitel: (id: string | undefined) => KAPITEL.find(k => k.id === id) }
})

const { default: KapitelSeite } = await import('./KapitelSeite')
const { default: SpielwissenHome } = await import('./SpielwissenHome')

function zeige(pfad: string) {
  const router = createMemoryRouter(
    [
      { path: '/spielwissen', element: <SpielwissenHome /> },
      { path: '/spielwissen/:kapitel', element: <KapitelSeite /> },
    ],
    { initialEntries: [pfad] },
  )
  return render(<RouterProvider router={router} />)
}

describe('Kapitelseite', () => {
  it('zeigt Titel, Frage und jede Karte des Kapitels', () => {
    zeige('/spielwissen/box')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('In der Box')
    expect(screen.getByText('Was zählt als Strike?')).toBeInTheDocument()
    expect(screen.getByText('Die Zone bist du')).toBeInTheDocument()
    expect(screen.getByText('Drin ist Strike')).toBeInTheDocument()
    expect(screen.getAllByTestId('buehne')).toHaveLength(2)
  })

  /* Die Kapitel folgen dem zeitlichen Ablauf eines At-Bats. Wer durch ist, geht weiter. */
  it('führt am Ende ins nächste Kapitel', () => {
    zeige('/spielwissen/box')

    expect(screen.getByRole('link', { name: /Du hast getroffen/ }))
      .toHaveAttribute('href', '/spielwissen/getroffen')
  })

  it('bietet im letzten Kapitel keinen Weiter-Link, sondern zurück zur Übersicht', () => {
    zeige('/spielwissen/base')

    expect(screen.queryByRole('link', { name: /In der Box|Du hast getroffen/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Übersicht/ })).toHaveAttribute('href', '/spielwissen')
  })

  /*
   * Die Adresse steht jedem offen. Ein Tippfehler darf keine leere Seite ergeben, auf der
   * man nicht merkt, dass man falsch ist.
   */
  it('schickt ein unbekanntes Kapitel zurück auf die Übersicht', () => {
    zeige('/spielwissen/quatsch')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Spielwissen')
    expect(screen.getByRole('link', { name: /In der Box/ })).toBeInTheDocument()
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
      zeige('/spielwissen/box')
    } finally {
      globalThis.fetch = alt
    }

    expect(rufe.filter(u => u.includes('/api'))).toEqual([])
  })
})
