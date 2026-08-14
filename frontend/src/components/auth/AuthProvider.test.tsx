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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }))
    const user = userEvent.setup()
    renderGated()

    await user.type(screen.getByLabelText('Passwort'), 'geheim')
    await user.click(screen.getByRole('button', { name: 'Ready Up' }))

    expect(await screen.findByText('Geschützter Inhalt')).toBeInTheDocument()
    expect(localStorage.getItem('auth')).toBe(btoa('admin:geheim'))
  })

  it('meldet ein falsches Passwort und verwirft die Zugangsdaten', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }))
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
