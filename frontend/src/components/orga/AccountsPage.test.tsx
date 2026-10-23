import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { BulkCreateResult, MeResponse, Player, UserAccount } from '@/types'

const h = vi.hoisted(() => ({
  me: null as MeResponse | null,
  show: vi.fn(),
  getPlayers: vi.fn(),
  getUsers: vi.fn(),
  createUser: vi.fn(),
  bulkCreateUsers: vi.fn(),
  resetUserPassword: vi.fn(),
  setUserRole: vi.fn(),
  setUserMayScore: vi.fn(),
  setUserLocked: vi.fn(),
  deleteUser: vi.fn(),
}))

vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ me: h.me }) }))
vi.mock('@/components/layout/Layout', () => ({ useToastContext: () => ({ show: h.show }) }))
vi.mock('@/api/client', () => ({
  getPlayers: h.getPlayers,
  getUsers: h.getUsers,
  createUser: h.createUser,
  bulkCreateUsers: h.bulkCreateUsers,
  resetUserPassword: h.resetUserPassword,
  setUserRole: h.setUserRole,
  setUserMayScore: h.setUserMayScore,
  setUserLocked: h.setUserLocked,
  deleteUser: h.deleteUser,
}))

import { AccountsPage } from './AccountsPage'

const ADMIN: MeResponse = { username: 'anna', role: 'ADMIN', playerId: 1, playerName: 'Anna Adler', mayScore: false, passwordChanged: true }
const SUPER: MeResponse = { ...ADMIN, username: 'hung', role: 'SUPERADMIN' }

const spieler = (id: number, name: string): Player => ({ id, name, regular: true, defaultBattingOrder: null })
const konto = (id: number, playerId: number | null, name: string | null, extra: Partial<UserAccount> = {}): UserAccount => ({
  id, playerId, playerName: name, username: (name ?? 'ohne').toLowerCase(), role: 'PLAYER', mayScore: false,
  locked: false, passwordChanged: true, createdAt: '2026-10-01T10:00:00Z', lastLoginAt: null, lastSeenAt: null, ...extra,
})

const PLAYERS = [spieler(1, 'Anna'), spieler(2, 'Bert'), spieler(3, 'Cora')]

function zeige() {
  return render(<MemoryRouter><AccountsPage /></MemoryRouter>)
}
const zeile = (name: string) => screen.getByRole('listitem', { name })

beforeEach(() => {
  Object.values(h).forEach(v => typeof v === 'function' && (v as ReturnType<typeof vi.fn>).mockReset())
  h.me = ADMIN
  h.getPlayers.mockResolvedValue(PLAYERS)
  h.getUsers.mockResolvedValue([konto(10, 1, 'Anna'), konto(11, 2, 'Bert')])
})

describe('AccountsPage', () => {
  it('zeigt Spieler mit und ohne Account', async () => {
    zeige()
    expect(await screen.findByRole('listitem', { name: 'Anna' })).toBeInTheDocument()
    expect(within(zeile('Anna')).getByText('anna')).toBeInTheDocument()
    expect(within(zeile('Cora')).getByText(/Noch kein Account/)).toBeInTheDocument()
    expect(within(zeile('Cora')).getByRole('button', { name: 'Account anlegen' })).toBeInTheDocument()
    expect(within(zeile('Anna')).queryByRole('button', { name: 'Account anlegen' })).toBeNull()
  })

  it('legt für einen Spieler ohne Account einen an, ohne ein Passwort zu fragen', async () => {
    h.createUser.mockResolvedValue(konto(12, 3, 'Cora'))
    zeige()
    await screen.findByRole('listitem', { name: 'Cora' })
    expect(screen.queryByLabelText(/Passwort/)).toBeNull()
    fireEvent.click(within(zeile('Cora')).getByRole('button', { name: 'Account anlegen' }))
    await waitFor(() => expect(h.createUser).toHaveBeenCalledWith(3))
    expect(await within(zeile('Cora')).findByText('cora')).toBeInTheDocument()
  })

  it('fragt vor dem Löschen in einem Modal nach und löscht erst nach der Bestätigung', async () => {
    h.deleteUser.mockResolvedValue(undefined)
    zeige()
    await screen.findByRole('listitem', { name: 'Bert' })
    fireEvent.click(within(zeile('Bert')).getByRole('button', { name: 'Account löschen' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(/bert/)
    expect(h.deleteUser).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))
    await waitFor(() => expect(h.deleteUser).toHaveBeenCalledWith(11))
    expect(await within(zeile('Bert')).findByText(/Noch kein Account/)).toBeInTheDocument()
  })

  it('löscht nicht, wenn das Modal abgebrochen wird', async () => {
    zeige()
    await screen.findByRole('listitem', { name: 'Bert' })
    fireEvent.click(within(zeile('Bert')).getByRole('button', { name: 'Account löschen' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Abbrechen' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(h.deleteUser).not.toHaveBeenCalled()
  })

  it('setzt das Passwort erst nach Bestätigung zurück und sagt, auf welches', async () => {
    h.resetUserPassword.mockResolvedValue(konto(11, 2, 'Bert', { passwordChanged: false }))
    zeige()
    await screen.findByRole('listitem', { name: 'Bert' })
    fireEvent.click(within(zeile('Bert')).getByRole('button', { name: 'Passwort zurücksetzen' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(/verteilte Passwort/)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Zurücksetzen' }))
    await waitFor(() => expect(h.resetUserPassword).toHaveBeenCalledWith(11))
  })

  it('schaltet das Scorer-Recht um', async () => {
    h.setUserMayScore.mockResolvedValue(konto(11, 2, 'Bert', { mayScore: true }))
    zeige()
    await screen.findByRole('listitem', { name: 'Bert' })
    fireEvent.click(within(zeile('Bert')).getByRole('checkbox', { name: 'Darf scoren' }))
    await waitFor(() => expect(h.setUserMayScore).toHaveBeenCalledWith(11, true))
    await waitFor(() => expect(within(zeile('Bert')).getByRole('checkbox', { name: 'Darf scoren' })).toBeChecked())
  })

  it('sperrt und entsperrt', async () => {
    h.setUserLocked.mockResolvedValue(konto(11, 2, 'Bert', { locked: true }))
    zeige()
    await screen.findByRole('listitem', { name: 'Bert' })
    fireEvent.click(within(zeile('Bert')).getByRole('button', { name: 'Sperren' }))
    await waitFor(() => expect(h.setUserLocked).toHaveBeenCalledWith(11, true))
    expect(await within(zeile('Bert')).findByRole('button', { name: 'Entsperren' })).toBeInTheDocument()
  })

  it('zeigt die Rollenwahl dem Superadmin', async () => {
    h.me = SUPER
    zeige()
    await screen.findByRole('listitem', { name: 'Bert' })
    expect(within(zeile('Bert')).getByRole('combobox', { name: 'Rolle' })).toBeInTheDocument()
  })

  it('zeigt die Rollenwahl einem Admin nicht, sondern nur die Rolle als Text', async () => {
    h.me = ADMIN
    zeige()
    await screen.findByRole('listitem', { name: 'Bert' })
    expect(screen.queryByRole('combobox', { name: 'Rolle' })).toBeNull()
    expect(within(zeile('Bert')).getByText('Spieler')).toBeInTheDocument()
  })

  it('ändert die Rolle über die Auswahl', async () => {
    h.me = SUPER
    h.setUserRole.mockResolvedValue(konto(11, 2, 'Bert', { role: 'ADMIN' }))
    zeige()
    await screen.findByRole('listitem', { name: 'Bert' })
    fireEvent.change(within(zeile('Bert')).getByRole('combobox', { name: 'Rolle' }), { target: { value: 'ADMIN' } })
    await waitFor(() => expect(h.setUserRole).toHaveBeenCalledWith(11, 'ADMIN'))
  })

  it('kündigt bei der Massenanlage an, was passieren wird, und ruft noch nichts auf', async () => {
    zeige()
    await screen.findByRole('listitem', { name: 'Cora' })
    fireEvent.click(screen.getByRole('button', { name: 'Accounts für alle aktiven Spieler anlegen' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(/1 aktiver Spieler ohne Account/)
    expect(dialog).toHaveTextContent(/verteilte Passwort/)
    expect(dialog).toHaveTextContent(/übersprungen/)
    expect(h.bulkCreateUsers).not.toHaveBeenCalled()
  })

  it('zeigt nach der Massenanlage, was angelegt und was übersprungen wurde', async () => {
    const ergebnis: BulkCreateResult = {
      created: [{ accountId: 12, playerId: 3, playerName: 'Cora', username: 'cora' }],
      skipped: [{ playerId: 4, playerName: 'Dora', reason: "Der Benutzername 'dora' ist schon vergeben." }],
    }
    h.bulkCreateUsers.mockResolvedValue(ergebnis)
    zeige()
    await screen.findByRole('listitem', { name: 'Cora' })
    fireEvent.click(screen.getByRole('button', { name: 'Accounts für alle aktiven Spieler anlegen' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Anlegen' }))
    const bericht = await screen.findByRole('region', { name: 'Ergebnis der Massenanlage' })
    expect(bericht).toHaveTextContent('1 angelegt')
    expect(bericht).toHaveTextContent('1 übersprungen')
    expect(bericht).toHaveTextContent('Dora')
    expect(bericht).toHaveTextContent("Der Benutzername 'dora' ist schon vergeben.")
  })

  it('lädt nach der Massenanlage die Liste neu', async () => {
    h.bulkCreateUsers.mockResolvedValue({ created: [], skipped: [] })
    zeige()
    await screen.findByRole('listitem', { name: 'Cora' })
    fireEvent.click(screen.getByRole('button', { name: 'Accounts für alle aktiven Spieler anlegen' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Anlegen' }))
    await waitFor(() => expect(h.getUsers).toHaveBeenCalledTimes(2))
  })

  it('bietet die Massenanlage nicht an, wenn alle schon einen Account haben', async () => {
    h.getUsers.mockResolvedValue([konto(10, 1, 'Anna'), konto(11, 2, 'Bert'), konto(12, 3, 'Cora')])
    zeige()
    await screen.findByRole('listitem', { name: 'Cora' })
    expect(screen.queryByRole('button', { name: 'Accounts für alle aktiven Spieler anlegen' })).toBeNull()
  })

  it('meldet einen Fehler des Servers als Toast', async () => {
    h.deleteUser.mockRejectedValue(new Error('Du kannst dich nicht selbst löschen.'))
    zeige()
    await screen.findByRole('listitem', { name: 'Bert' })
    fireEvent.click(within(zeile('Bert')).getByRole('button', { name: 'Account löschen' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Löschen' }))
    await waitFor(() => expect(h.show).toHaveBeenCalledWith('Du kannst dich nicht selbst löschen.', 'error'))
  })
})
