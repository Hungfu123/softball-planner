import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, RequireAuth, useAuth } from './AuthProvider'
import { UNAUTHORIZED_EVENT } from '@/api/client'
import type { MeResponse } from '@/types'

const ICH: MeResponse = {
  username: 'hung',
  role: 'SUPERADMIN',
  playerId: 7,
  playerName: 'Hung',
  mayScore: true,
  passwordChanged: true,
}

type Antwort = { ok: boolean; status: number; json?: () => Promise<unknown> }

function ok(me: MeResponse = ICH): Antwort {
  return { ok: true, status: 200, json: async () => me }
}
const fehler = (status: number): Antwort => ({ ok: false, status })

function Inhalt() {
  const { me, logout } = useAuth()
  return (
    <div>
      <p>Geschützter Inhalt</p>
      <p data-testid="me">{me ? `${me.username}|${me.role}|${me.playerName}` : 'kein me'}</p>
      <button onClick={logout}>Abmelden</button>
    </div>
  )
}

function renderGated() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RequireAuth>
          <Inhalt />
        </RequireAuth>
      </AuthProvider>
    </MemoryRouter>,
  )
}

const maske = () => screen.queryByRole('button', { name: 'Ready Up' })
const inhalt = () => screen.queryByText('Geschützter Inhalt')
const pruefung = () => screen.queryByRole('status', { name: 'Anmeldung wird geprüft' })

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function anmelden(benutzer: string, passwort: string) {
  fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: benutzer } })
  fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: passwort } })
  fireEvent.click(screen.getByRole('button', { name: 'Ready Up' }))
}

function aufrufe(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    method: (init as RequestInit | undefined)?.method ?? 'GET',
    auth: ((init as RequestInit | undefined)?.headers as Record<string, string> | undefined)?.Authorization,
  }))
}

describe('Anmeldung — Formular', () => {
  it('zeigt ohne Zugangsdaten die Maske und fragt den Server gar nicht erst', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderGated()

    expect(maske()).toBeInTheDocument()
    expect(inhalt()).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('schickt den eingegebenen Benutzernamen, nicht admin und nicht hung', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ ...ICH, username: 'maria' }))
    vi.stubGlobal('fetch', fetchMock)
    renderGated()

    anmelden('maria', 'geheim')

    expect(await screen.findByText('Geschützter Inhalt')).toBeInTheDocument()
    const erwartet = 'Basic ' + btoa('maria:geheim')
    expect(aufrufe(fetchMock)).toEqual([
      { url: '/api/auth/login', method: 'POST', auth: erwartet },
    ])
    expect(localStorage.getItem('auth')).toBe(btoa('maria:geheim'))
  })

  it('kodiert Umlaute als UTF-8, damit der Server sie so liest', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()))
    renderGated()

    anmelden('jörg', 'pässwort')
    await screen.findByText('Geschützter Inhalt')

    const bytes = new TextEncoder().encode('jörg:pässwort')
    expect(localStorage.getItem('auth')).toBe(btoa(String.fromCharCode(...bytes)))
  })

  it('stellt die Auskunft des Servers als Ganzes bereit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()))
    renderGated()

    anmelden('hung', 'geheim')

    expect(await screen.findByTestId('me')).toHaveTextContent('hung|SUPERADMIN|Hung')
  })

  it('lässt bei einem Serverfehler nicht durch und verwirft die Zugangsdaten', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fehler(500)))
    renderGated()

    anmelden('hung', 'geheim')

    expect(await screen.findByText(/500/)).toBeInTheDocument()
    expect(inhalt()).not.toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBeNull()
  })

  it('nennt den Statuscode, damit man ihn melden kann', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fehler(503)))
    renderGated()
    anmelden('hung', 'geheim')
    expect(await screen.findByText(/503/)).toBeInTheDocument()
  })

  it('unterscheidet falsche Zugangsdaten vom Serverfehler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fehler(401)))
    renderGated()

    anmelden('hung', 'falsch')

    expect(await screen.findByText('Benutzername oder Passwort falsch')).toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBeNull()
  })

  it('meldet einen nicht erreichbaren Server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    renderGated()

    anmelden('hung', 'geheim')

    expect(await screen.findByText('Server nicht erreichbar')).toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBeNull()
  })

  it('lässt den jüngsten Anmeldeversuch gewinnen', async () => {
    // Zweimal getippt, weil der erste Versuch hängt: die verspätete 401 des ersten
    // Versuchs darf den zweiten, erfolgreichen nicht wieder abmelden.
    let erste!: (a: Antwort) => void
    const ersteAntwort = new Promise<Antwort>(res => {
      erste = res
    })
    const fetchMock = vi.fn().mockReturnValueOnce(ersteAntwort).mockResolvedValue(ok())
    vi.stubGlobal('fetch', fetchMock)
    renderGated()

    anmelden('hung', 'erstes')
    expect(inhalt()).not.toBeInTheDocument()
    anmelden('hung', 'zweites')
    expect(await screen.findByText('Geschützter Inhalt')).toBeInTheDocument()

    await act(async () => {
      erste(fehler(401))
      await ersteAntwort
    })

    expect(screen.getByText('Geschützter Inhalt')).toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBe(btoa('hung:zweites'))
  })
})

describe('Seitenaufbau mit gespeicherten Zugangsdaten', () => {
  beforeEach(() => {
    localStorage.setItem('auth', btoa('hung:geheim'))
  })

  it('prüft gegen /api/me und zeigt solange den Ladezustand, weder Maske noch Inhalt', async () => {
    let antworten!: (a: Antwort) => void
    const fetchMock = vi.fn().mockReturnValue(new Promise<Antwort>(res => (antworten = res)))
    vi.stubGlobal('fetch', fetchMock)
    renderGated()

    expect(pruefung()).toBeInTheDocument()
    expect(maske()).not.toBeInTheDocument()
    expect(inhalt()).not.toBeInTheDocument()

    await act(async () => antworten(ok()))

    expect(await screen.findByText('Geschützter Inhalt')).toBeInTheDocument()
    expect(pruefung()).not.toBeInTheDocument()
    expect(screen.getByTestId('me')).toHaveTextContent('hung|SUPERADMIN|Hung')
  })

  it('ruft /api/me und nie den Anmelde-Handschlag (der setzt lastLoginAt)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', fetchMock)
    renderGated()
    await screen.findByText('Geschützter Inhalt')

    expect(aufrufe(fetchMock)).toEqual([
      { url: '/api/me', method: 'GET', auth: 'Basic ' + btoa('hung:geheim') },
    ])
  })

  it('Deploy-Tag: alte Zugangsdaten werden mit 401 abgelehnt, dann kommt die Maske', async () => {
    let antworten!: (a: Antwort) => void
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Antwort>(res => (antworten = res))))
    renderGated()

    // Vor der Antwort ist die Maske NICHT da — sonst wäre der Test auch grün, wenn sie immer erschiene.
    expect(maske()).not.toBeInTheDocument()

    await act(async () => antworten(fehler(401)))

    expect(await screen.findByRole('button', { name: 'Ready Up' })).toBeInTheDocument()
    expect(inhalt()).not.toBeInTheDocument()
    expect(pruefung()).not.toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBeNull()
  })

  it('Gegenrichtung: gültige Zugangsdaten führen nie über die Maske', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()))
    renderGated()

    expect(maske()).not.toBeInTheDocument()
    expect(await screen.findByText('Geschützter Inhalt')).toBeInTheDocument()
    expect(maske()).not.toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBe(btoa('hung:geheim'))
  })

  it('bleibt bei Netzfehler angemeldet und behält die Zugangsdaten (PWA offline)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    renderGated()

    expect(await screen.findByText('Geschützter Inhalt')).toBeInTheDocument()
    expect(maske()).not.toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBe(btoa('hung:geheim'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('me')).toHaveTextContent('kein me')
  })

  it('bleibt auch bei einem Serverfehler 500 angemeldet: nur 401 meldet ab', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fehler(500)))
    renderGated()

    expect(await screen.findByText('Geschützter Inhalt')).toBeInTheDocument()
    expect(localStorage.getItem('auth')).not.toBeNull()
  })
})

describe('401 mitten in der Sitzung', () => {
  it('führt zurück zur Maske, ohne die Seite neu zu laden', async () => {
    localStorage.setItem('auth', btoa('hung:geheim'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()))
    renderGated()
    await screen.findByText('Geschützter Inhalt')

    act(() => {
      localStorage.removeItem('auth')
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    })

    expect(await screen.findByRole('button', { name: 'Ready Up' })).toBeInTheDocument()
    expect(inhalt()).not.toBeInTheDocument()
  })

  it('lässt eine späte Prüfantwort die Abmeldung nicht rückgängig machen', async () => {
    localStorage.setItem('auth', btoa('hung:geheim'))
    let antworten!: (a: Antwort) => void
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Antwort>(res => (antworten = res))))
    renderGated()

    act(() => {
      localStorage.removeItem('auth')
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    })
    await act(async () => antworten(ok()))

    expect(await screen.findByRole('button', { name: 'Ready Up' })).toBeInTheDocument()
    expect(inhalt()).not.toBeInTheDocument()
  })
})

describe('Abmelden', () => {
  it('meldet ab und löscht die Zugangsdaten', async () => {
    localStorage.setItem('auth', btoa('hung:geheim'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()))
    renderGated()
    await screen.findByText('Geschützter Inhalt')

    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }))

    await waitFor(() => expect(maske()).toBeInTheDocument())
    expect(inhalt()).not.toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBeNull()
  })
})
