import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { KAPITEL } from './kapitel'
import KapitelSeite from './KapitelSeite'

/*
 * Eigene Datei, weil `KapitelSeite.test.tsx` `./kapitel` stellt, um das Blaettern zu
 * pruefen. Hier laufen die ECHTEN neunzehn Buehnen, eine nach der anderen durchgeblaettert.
 * Ohne das waere die Kette KAPITEL -> KapitelSeite -> Buehne nirgends zusammen geprueft,
 * und hinter der Zusage „Offense geht ohne Netz" staenden nur Attrappen.
 */
describe('Kapitelseite mit den echten Daten', () => {
  it('blättert durch jede Karte, ohne einen Abruf unter /api', async () => {
    const rufe: string[] = []
    const alt = globalThis.fetch
    globalThis.fetch = ((eingabe: RequestInfo | URL) => {
      rufe.push(String(eingabe))
      return Promise.reject(new Error('kein Netz im Test'))
    }) as typeof fetch

    try {
      for (const kapitel of KAPITEL) {
        const router = createMemoryRouter(
          [{ path: '/spielwissen/:kapitel', element: <KapitelSeite /> }],
          { initialEntries: ['/spielwissen/' + kapitel.id] },
        )
        const { unmount } = render(<RouterProvider router={router} />)

        for (const [i, karte] of kapitel.karten.entries()) {
          await waitFor(() =>
            expect(screen.getByRole('heading', { level: 3, name: karte.pointe })).toBeInTheDocument())
          if (i < kapitel.karten.length - 1) {
            fireEvent.click(screen.getByRole('button', { name: /^Weiter/ }))
          }
        }
        unmount()
      }
    } finally {
      globalThis.fetch = alt
    }

    expect(rufe.filter(u => u.includes('/api'))).toEqual([])
  })

  it('traegt neunzehn Karten in drei Kapiteln', () => {
    expect(KAPITEL.map(k => k.id)).toEqual(['box', 'getroffen', 'base'])
    expect(KAPITEL.flatMap(k => k.karten)).toHaveLength(19)
  })
})
