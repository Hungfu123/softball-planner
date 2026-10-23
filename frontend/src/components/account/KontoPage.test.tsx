import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MeResponse } from '@/types'

const h = vi.hoisted(() => ({
  me: null as MeResponse | null,
  neuLaden: vi.fn(),
  show: vi.fn(),
  changeUsername: vi.fn(),
  changePassword: vi.fn(),
  setAuth: vi.fn(),
  stored: vi.fn(),
}))

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ me: h.me, neuLaden: h.neuLaden }),
}))
vi.mock('@/components/layout/Layout', () => ({ useToastContext: () => ({ show: h.show }) }))
vi.mock('@/api/client', () => ({
  changeUsername: h.changeUsername,
  changePassword: h.changePassword,
  setAuth: h.setAuth,
  storedCredentials: h.stored,
}))

import { KontoPage } from './KontoPage'

const ME: MeResponse = { username: 'anna', role: 'PLAYER', playerId: 3, playerName: 'Anna Adler', mayScore: false, passwordChanged: true }

function zeige() {
  return render(<MemoryRouter><KontoPage /></MemoryRouter>)
}

beforeEach(() => {
  h.me = ME
  Object.values(h).forEach(v => typeof v === 'function' && 'mockReset' in v && (v as ReturnType<typeof vi.fn>).mockReset())
  h.stored.mockReturnValue({ username: 'anna', password: 'altes-passwort' })
})

describe('KontoPage', () => {
  it('ändert den Benutzernamen und legt die Zugangsdaten unter dem neuen Namen neu ab', async () => {
    h.changeUsername.mockResolvedValue({ ...ME, username: 'anna2' })
    zeige()
    fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: 'anna2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Namen speichern' }))
    await waitFor(() => expect(h.changeUsername).toHaveBeenCalledWith('anna2'))
    // Ohne den Tausch lehnte der Server die nächste Anfrage mit dem alten Namen ab.
    await waitFor(() => expect(h.setAuth).toHaveBeenCalledWith('anna2', 'altes-passwort'))
    expect(h.neuLaden).toHaveBeenCalled()
  })

  it('zeigt die deutsche Meldung, wenn der Name vergeben ist', async () => {
    h.changeUsername.mockRejectedValue(new Error("Der Benutzername 'bert' ist schon vergeben."))
    zeige()
    fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: 'bert' } })
    fireEvent.click(screen.getByRole('button', { name: 'Namen speichern' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Der Benutzername 'bert' ist schon vergeben.")
    expect(h.setAuth).not.toHaveBeenCalled()
  })

  it('fordert zum Passwortwechsel auf, solange passwordChanged false ist', () => {
    h.me = { ...ME, passwordChanged: false }
    zeige()
    expect(screen.getByRole('status')).toHaveTextContent(/Startpasswort/)
  })

  it('zeigt keine Aufforderung, wenn das Passwort schon gewechselt ist', () => {
    zeige()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('ändert das Passwort und legt die Zugangsdaten mit dem neuen Passwort neu ab', async () => {
    h.changePassword.mockResolvedValue(ME)
    zeige()
    fireEvent.change(screen.getByLabelText('Aktuelles Passwort'), { target: { value: 'altes-passwort' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'neues-passwort' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort wiederholen'), { target: { value: 'neues-passwort' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort ändern' }))
    await waitFor(() => expect(h.changePassword).toHaveBeenCalledWith('altes-passwort', 'neues-passwort'))
    await waitFor(() => expect(h.setAuth).toHaveBeenCalledWith('anna', 'neues-passwort'))
  })

  it('schickt nichts los, wenn die Wiederholung abweicht, und sagt warum', () => {
    zeige()
    fireEvent.change(screen.getByLabelText('Aktuelles Passwort'), { target: { value: 'altes-passwort' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'neues-passwort' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort wiederholen'), { target: { value: 'anderes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort ändern' }))
    expect(h.changePassword).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/stimmen nicht überein/)
  })

  it('verlangt mindestens acht Zeichen, bevor der Server gefragt wird', () => {
    zeige()
    fireEvent.change(screen.getByLabelText('Aktuelles Passwort'), { target: { value: 'altes-passwort' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'kurz' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort wiederholen'), { target: { value: 'kurz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort ändern' }))
    expect(h.changePassword).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/mindestens 8 Zeichen/)
  })
})
