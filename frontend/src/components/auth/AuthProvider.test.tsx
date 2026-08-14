import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './AuthProvider'

function renderGated() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RequireAuth>
          <div>Geschützter Inhalt</div>
        </RequireAuth>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function anmelden(passwort: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Passwort'), passwort)
  await user.click(screen.getByRole('button', { name: 'Ready Up' }))
}

describe('RequireAuth — Serverfehler', () => {
  it('lässt bei einem Serverfehler nicht durch und verwirft die Zugangsdaten', async () => {
    // Nur ein erfolgreicher Status zählt als angemeldet. Sonst landet man auf einem
    // Dashboard, dessen sämtliche API-Aufrufe scheitern.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    renderGated()

    await anmelden('geheim')

    expect(await screen.findByText(/500/)).toBeInTheDocument()
    expect(screen.queryByText('Geschützter Inhalt')).not.toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBeNull()
  })

  it('nennt den Statuscode, damit man ihn melden kann', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    renderGated()

    await anmelden('geheim')

    expect(await screen.findByText(/503/)).toBeInTheDocument()
  })

  it('unterscheidet ein falsches Passwort weiterhin vom Serverfehler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    renderGated()

    await anmelden('falsch')

    expect(await screen.findByText('Falsches Passwort')).toBeInTheDocument()
  })
})

describe('RequireAuth — überholte Anmeldung', () => {
  it('lässt eine späte Antwort eine neuere erfolgreiche Anmeldung nicht überschreiben', async () => {
    // Zweimal getippt, weil der erste Versuch hängt: die verspätete 401 des ersten
    // Versuchs darf den zweiten, erfolgreichen nicht wieder abmelden.
    let ersteAntwortAusloesen!: (wert: { ok: boolean; status: number }) => void
    const ersteAntwort = new Promise<{ ok: boolean; status: number }>(res => {
      ersteAntwortAusloesen = res
    })

    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(ersteAntwort)
      .mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    renderGated()

    await anmelden('erstesPasswort')
    expect(screen.queryByText('Geschützter Inhalt')).not.toBeInTheDocument()

    await anmelden('zweitesPasswort')
    expect(await screen.findByText('Geschützter Inhalt')).toBeInTheDocument()

    ersteAntwortAusloesen({ ok: false, status: 401 })
    await ersteAntwort

    expect(screen.getByText('Geschützter Inhalt')).toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBe(btoa('admin:erstesPasswortzweitesPasswort'))
  })
})

describe('RequireAuth', () => {
  it('zeigt ohne Anmeldung die Login-Seite statt der Kinder', () => {
    renderGated()
    expect(screen.queryByText('Geschützter Inhalt')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Passwort')).toBeInTheDocument()
  })

  it('zeigt die Kinder, wenn bereits Zugangsdaten hinterlegt sind', () => {
    localStorage.setItem('auth', btoa('admin:geheim'))
    renderGated()
    expect(screen.getByText('Geschützter Inhalt')).toBeInTheDocument()
  })

  it('lässt nach erfolgreicher Anmeldung durch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    const user = userEvent.setup()
    renderGated()

    await user.type(screen.getByLabelText('Passwort'), 'geheim')
    await user.click(screen.getByRole('button', { name: 'Ready Up' }))

    expect(await screen.findByText('Geschützter Inhalt')).toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBe(btoa('admin:geheim'))
  })

  it('meldet ein falsches Passwort und verwirft die Zugangsdaten', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const user = userEvent.setup()
    renderGated()

    await user.type(screen.getByLabelText('Passwort'), 'falsch')
    await user.click(screen.getByRole('button', { name: 'Ready Up' }))

    expect(await screen.findByText('Falsches Passwort')).toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBeNull()
  })

  it('meldet einen nicht erreichbaren Server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const user = userEvent.setup()
    renderGated()

    await user.type(screen.getByLabelText('Passwort'), 'geheim')
    await user.click(screen.getByRole('button', { name: 'Ready Up' }))

    expect(await screen.findByText('Server nicht erreichbar')).toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBeNull()
  })
})
