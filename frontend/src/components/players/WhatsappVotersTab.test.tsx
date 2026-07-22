import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Player, UnknownVoter } from '@/types'

// Toast-Context stubben (Komponente zieht useToastContext aus Layout).
// WICHTIG: stabile Objekt-Referenz zurückgeben — sonst ändert sich bei jedem
// Re-Render die Identität von `toast`, was die `loadVoters`-useCallback (deps: [toast])
// neu erzeugt und den Lade-Effekt in eine Endlosschleife schickt.
const mockShow = vi.fn()
const mockDismiss = vi.fn()
const toastStub = { show: mockShow, dismiss: mockDismiss }
vi.mock('@/components/layout/Layout', () => ({
  useToastContext: () => toastStub,
}))

// API-Client mocken
vi.mock('@/api/client', () => ({
  getUnknownVoters: vi.fn(),
  assignVoter: vi.fn(),
  assignNewVoter: vi.fn(),
  setPlayerWhatsappName: vi.fn(),
}))

// usePlayers-Hook mocken — Komponente bekommt players + reload/setWhatsappName injiziert
const mockReloadPlayers = vi.fn()
const mockSetWhatsappName = vi.fn()
vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: () => ({
    players: PLAYERS,
    loading: false,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reorderBattingOrder: vi.fn(),
    setWhatsappName: mockSetWhatsappName,
    reload: mockReloadPlayers,
  }),
}))

import * as api from '@/api/client'
import { WhatsappVotersTab } from './WhatsappVotersTab'

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>

const PLAYERS: Player[] = [
  { id: 1, name: 'Anna Beispiel', regular: true, defaultBattingOrder: 1, whatsappName: null },
  { id: 2, name: 'Bert Muster', regular: true, defaultBattingOrder: 2, whatsappName: 'Bertman' },
]

const VOTER: UnknownVoter = { voterName: 'Chris Wähler', trainingId: 5, trainingDate: '2026-07-10' }

const PLAYER_FROM_ASSIGN: Player = { id: 1, name: 'Anna Beispiel', regular: true, defaultBattingOrder: 1, whatsappName: 'Chris Wähler' }
const PLAYER_FROM_NEW: Player = { id: 3, name: 'Chris Wähler', regular: false, defaultBattingOrder: null, whatsappName: 'Chris Wähler' }

describe('WhatsappVotersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.getUnknownVoters.mockResolvedValue([VOTER])
    mockApi.assignVoter.mockResolvedValue(PLAYER_FROM_ASSIGN)
    mockApi.assignNewVoter.mockResolvedValue(PLAYER_FROM_NEW)
    mockApi.setPlayerWhatsappName.mockResolvedValue(PLAYER_FROM_ASSIGN)
    mockSetWhatsappName.mockResolvedValue(PLAYER_FROM_ASSIGN)
  })

  it('zeigt unbekannte Wähler mit Name und Trainingsdatum', async () => {
    render(<WhatsappVotersTab />)

    expect(await screen.findByText('Chris Wähler')).toBeInTheDocument()
    expect(screen.getByText('10.07.2026')).toBeInTheDocument()
  })

  it('zeigt Empty-State wenn keine unbekannten Wähler vorhanden sind', async () => {
    mockApi.getUnknownVoters.mockResolvedValue([])

    render(<WhatsappVotersTab />)

    expect(await screen.findByText(/Keine unbekannten Wähler/i)).toBeInTheDocument()
    expect(screen.queryByText('Chris Wähler')).not.toBeInTheDocument()
  })

  it('weist einen unbekannten Wähler per "Zuweisen" einem existierenden Spieler zu und lädt neu', async () => {
    const user = userEvent.setup()
    render(<WhatsappVotersTab />)

    await screen.findByText('Chris Wähler')

    // Nach dem initialen Laden als "gesehen" markieren, um den zweiten Aufruf isoliert zu prüfen
    mockApi.getUnknownVoters.mockClear()
    mockApi.getUnknownVoters.mockResolvedValue([])

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, '1')

    const assignButton = screen.getByRole('button', { name: 'Zuweisen' })
    expect(assignButton).toBeEnabled()
    await user.click(assignButton)

    await waitFor(() => expect(mockApi.assignVoter).toHaveBeenCalledWith('Chris Wähler', 1))
    await waitFor(() => expect(mockApi.getUnknownVoters).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockReloadPlayers).toHaveBeenCalled())
    expect(mockShow).toHaveBeenCalledWith('„Chris Wähler" zugewiesen')
  })

  it('legt über "Neuer Spieler" einen Spieler an, vorbelegt mit dem Wähler-Namen', async () => {
    const user = userEvent.setup()
    render(<WhatsappVotersTab />)

    await screen.findByText('Chris Wähler')

    await user.click(screen.getByRole('button', { name: /Neuer Spieler/i }))

    expect(await screen.findByRole('heading', { name: 'Neuer Spieler' })).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    const nameInput = within(dialog).getByRole('textbox') as HTMLInputElement
    expect(nameInput.value).toBe('Chris Wähler')

    await user.click(within(dialog).getByRole('button', { name: 'Anlegen' }))

    await waitFor(() => expect(mockApi.assignNewVoter).toHaveBeenCalledWith('Chris Wähler', 'Chris Wähler'))
    await waitFor(() => expect(mockReloadPlayers).toHaveBeenCalled())
    expect(mockShow).toHaveBeenCalledWith('Chris Wähler angelegt und zugewiesen')

    // Modal schließt sich nach erfolgreichem Anlegen
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Neuer Spieler' })).not.toBeInTheDocument())
  })

  it('speichert den WhatsApp-Alias eines Spielers bei Blur', async () => {
    render(<WhatsappVotersTab />)

    // Alias wird on-demand gesetzt: erst den Trigger-Chip des Spielers ohne Alias
    // anklicken (Anna Beispiel, whatsappName: null), dann erscheint das Eingabefeld.
    fireEvent.click(await screen.findByTitle('WhatsApp-Alias für Anna Beispiel setzen'))

    const aliasInput = screen.getByPlaceholderText('WhatsApp-Name…') as HTMLInputElement
    expect(aliasInput.value).toBe('')

    fireEvent.change(aliasInput, { target: { value: 'AnnaB' } })
    fireEvent.blur(aliasInput)

    await waitFor(() => expect(mockSetWhatsappName).toHaveBeenCalledWith(1, 'AnnaB'))
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith('Alias für Anna Beispiel gespeichert'))
  })
})
