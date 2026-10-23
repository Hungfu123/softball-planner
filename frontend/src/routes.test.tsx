import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { routes } from './routes'
import type { MeResponse } from '@/types'

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
  '/players/1',
  '/stats',
  '/spielbogen',
  '/spielbogen/new',
  '/orga',
  '/orga/einladungen',
  '/orga/whatsapp-umfrage',
  '/gameday/1',
  '/gameday/1/export',
  '/gameday/1/scoring/0',
  '/spielbogen/1',
  '/nichtvorhanden',
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

describe('Routing: Auth-Gate pro Route (angemeldet)', () => {
  beforeEach(() => {
    localStorage.setItem('auth', btoa('hung:x'))
    // Die Standalone-Route lädt beim Mounten echte Daten nach — ohne Netz im Test
    // würde das als unbehandelte Rejection auffallen. Die Promise bleibt bewusst
    // offen, die Seite zeigt einfach weiter ihren Lade-Zustand, den wir prüfen wollen.
    // Einzige Ausnahme: /api/me, die Pruefung der gespeicherten Zugangsdaten beim Seitenaufbau.
    const me = { username: 'hung', role: 'SUPERADMIN', playerId: null, playerName: null, mayScore: true, passwordChanged: true }
    vi.stubGlobal('fetch', vi.fn((url: string) =>
      String(url) === '/api/me'
        ? Promise.resolve({ ok: true, status: 200, json: async () => me })
        : new Promise(() => {}),
    ))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('/orga (Layout-Zweig) zeigt die Seite, nicht den Login', async () => {
    renderAt('/orga')

    expect(await screen.findByRole('navigation')).toBeInTheDocument()
    expect(screen.queryByLabelText('Passwort')).not.toBeInTheDocument()
  })

  it('/gameday/1/export (eigenständige Top-Level-Route) zeigt die Seite, nicht den Login', async () => {
    renderAt('/gameday/1/export')

    expect(await screen.findByRole('status', { name: 'Lade Daten' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Passwort')).not.toBeInTheDocument()
  })

  it('schickt ein altes Lesezeichen auf /orga/aufbau zurück aufs Dashboard', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/orga/aufbau'] })
    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>,
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('/nichtvorhanden (unbekannte Route) leitet angemeldet aufs Dashboard um', async () => {
    renderAt('/nichtvorhanden')

    expect(await screen.findByRole('navigation')).toBeInTheDocument()
    expect(screen.queryByLabelText('Passwort')).not.toBeInTheDocument()
  })
})

/**
 * Die Oberfläche versteckt, das Backend verbietet. Jeder Sperr-Test hat sein Gegenstück: derselbe
 * Pfad mit Admin kommt durch. Ohne das wäre „Spieler wird zurückgeschickt" auch grün, wenn
 * RequireRole jeden überall zurückschickte.
 */
describe('Routing: Rollen', () => {
  const konto = (role: MeResponse['role'], mayScore = false): MeResponse => ({
    username: 'x', role, playerId: 5, playerName: 'X', mayScore, passwordChanged: true,
  })

  function stubMe(me: MeResponse) {
    localStorage.setItem('auth', btoa('x:x'))
    vi.stubGlobal('fetch', vi.fn((url: string) =>
      String(url) === '/api/me'
        ? Promise.resolve({ ok: true, status: 200, json: async () => me })
        : new Promise(() => {}),
    ))
  }

  /** Rendert und wartet, bis /api/me beantwortet und die Weiterleitung (falls eine kommt) gelaufen ist. */
  async function oeffne(pfad: string, me: MeResponse) {
    stubMe(me)
    const router = createMemoryRouter(routes, { initialEntries: [pfad] })
    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>,
    )
    await screen.findByRole('navigation').catch(() => {})
    await act(async () => { await new Promise(r => setTimeout(r, 20)) })
    return router
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const NUR_ADMIN = ['/players', '/training', '/orga', '/spielbogen', '/spielbogen/new', '/orga/trainerabrechnung', '/orga/einladungen', '/orga/whatsapp-umfrage', '/spielbogen/1']

  it.each(NUR_ADMIN)('schickt einen Spieler von %s zurück aufs Dashboard', async pfad => {
    const router = await oeffne(pfad, konto('PLAYER'))
    expect(router.state.location.pathname).toBe('/')
  })

  it.each(NUR_ADMIN)('lässt einen Admin auf %s durch', async pfad => {
    const router = await oeffne(pfad, konto('ADMIN'))
    expect(router.state.location.pathname).toBe(pfad)
  })

  it.each(['/stats', '/kalender', '/players/5', '/teams', '/gameday/1/export'])('lässt einen Spieler auf %s', async pfad => {
    const router = await oeffne(pfad, konto('PLAYER'))
    expect(router.state.location.pathname).toBe(pfad)
  })

  it('sperrt die Scoring-Route für einen Spieler ohne Scorer-Recht', async () => {
    const router = await oeffne('/gameday/1/scoring/0', konto('PLAYER', false))
    expect(router.state.location.pathname).toBe('/')
  })

  it('lässt einen Spieler mit Scorer-Recht auf die Scoring-Route', async () => {
    const router = await oeffne('/gameday/1/scoring/0', konto('PLAYER', true))
    expect(router.state.location.pathname).toBe('/gameday/1/scoring/0')
  })

  it.each(['ADMIN', 'SUPERADMIN'] as const)('lässt %s ohne Scorer-Flag auf die Scoring-Route', async role => {
    const router = await oeffne('/gameday/1/scoring/0', konto(role, false))
    expect(router.state.location.pathname).toBe('/gameday/1/scoring/0')
  })
})
