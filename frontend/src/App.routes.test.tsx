import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { routes } from './App'

/**
 * Jede Route der App, abgemeldet durchgegangen. Fängt genau die Regression ab,
 * die der Umbau auf RequireAuth pro Route ermöglicht: eine Route, die ihr Gate
 * verliert (öffentlich wird) oder eine, die fälschlich hinter das Gate rutscht
 * (der Zähler soll ohne Login funktionieren).
 */
const PROTECTED_PATHS = [
  '/',
  '/kalender',
  '/training',
  '/players',
  '/stats',
  '/spielbogen',
  '/spielbogen/new',
  '/orga',
  '/orga/einladungen',
  '/orga/aufbau',
  '/orga/whatsapp-umfrage',
  '/gameday/1',
  '/gameday/1/export',
  '/gameday/1/scoring/0',
  '/spielbogen/1',
]

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('Routing: Auth-Gate pro Route (abgemeldet)', () => {
  it.each(PROTECTED_PATHS)('%s zeigt die Login-Seite statt der eigentlichen Seite', (path) => {
    renderAt(path)

    expect(screen.getByLabelText('Passwort')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ready Up' })).toBeInTheDocument()
    // Layout (Nav) und lazy-geladene Seiten (Suspense-Fallback) dürfen ohne
    // Anmeldung nirgends anspringen — RequireAuth muss vor beiden greifen.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Lade Daten' })).not.toBeInTheDocument()
  })

  it('/counter zeigt den Zähler ohne Login', async () => {
    renderAt('/counter')

    expect(await screen.findByRole('img', { name: 'Ball: 0 von 3' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Passwort')).not.toBeInTheDocument()
  })
})
