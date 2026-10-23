import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MeResponse } from '@/types'

const h = vi.hoisted(() => ({ me: null as MeResponse | null, changeUsername: vi.fn(), changePassword: vi.fn() }))

vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ me: h.me, neuLaden: vi.fn() }) }))
vi.mock('@/components/layout/Layout', () => ({ useToastContext: () => ({ show: vi.fn() }) }))
// Echte setAuth/storedCredentials: hier geht es um die Kodierung im localStorage, nicht um einen Mock davon.
vi.mock('@/api/client', async importOriginal => ({
  ...(await importOriginal<typeof import('@/api/client')>()),
  changeUsername: h.changeUsername,
  changePassword: h.changePassword,
}))

import { setAuth } from '@/api/client'
import { KontoPage } from './KontoPage'

const ME: MeResponse = { username: 'anna', role: 'PLAYER', playerId: 3, playerName: 'Anna Adler', mayScore: false, passwordChanged: true }

/** Was der Browser als Basic-Header schicken würde: UTF-8-Bytes von "name:passwort". */
function abgelegt(): string {
  const bytes = Uint8Array.from(atob(localStorage.getItem('auth')!), c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function nameAendern(neu: string) {
  render(<MemoryRouter><KontoPage /></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: neu } })
  fireEvent.click(screen.getByRole('button', { name: 'Namen speichern' }))
}

beforeEach(() => {
  localStorage.clear()
  h.me = ME
  h.changeUsername.mockReset().mockImplementation(async (n: string) => ({ ...ME, username: n }))
})

describe('KontoPage Zugangsdaten nach dem Namenswechsel', () => {
  it('behält ein Passwort mit Doppelpunkt vollständig', async () => {
    setAuth('anna', 'gehei:m')
    await nameAendern('anna2')
    await waitFor(() => expect(abgelegt()).toBe('anna2:gehei:m'))
  })

  it('behält ein Passwort mit Umlaut und kodiert es als UTF-8', async () => {
    setAuth('anna', 'pässwort')
    await nameAendern('anna2')
    await waitFor(() => expect(abgelegt()).toBe('anna2:pässwort'))
  })

  it('sagt, dass eine Neuanmeldung nötig ist, wenn keine Zugangsdaten gespeichert sind', async () => {
    await nameAendern('anna2')
    expect(await screen.findByRole('alert')).toHaveTextContent(/neu an/)
  })

  it('zeigt den Namen, der erst nach dem ersten Rendern bekannt wird', () => {
    h.me = null
    const { rerender } = render(<MemoryRouter><KontoPage /></MemoryRouter>)
    expect(screen.getByLabelText('Benutzername')).toHaveValue('')
    h.me = ME
    rerender(<MemoryRouter><KontoPage /></MemoryRouter>)
    expect(screen.getByLabelText('Benutzername')).toHaveValue('anna')
  })
})
