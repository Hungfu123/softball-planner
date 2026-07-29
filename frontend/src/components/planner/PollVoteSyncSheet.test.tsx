import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Player, GameDayVotePreview } from '@/types'

// Toast-Context stubben (Komponente zieht useToastContext aus Layout — Muster wie WhatsappVotersTab.test.tsx)
const mockShow = vi.fn()
const mockDismiss = vi.fn()
const toastStub = { show: mockShow, dismiss: mockDismiss }
vi.mock('@/components/layout/Layout', () => ({
  useToastContext: () => toastStub,
}))

// API-Client mocken
vi.mock('@/api/client', () => ({
  fetchGameDayPollVotes: vi.fn(),
  applyGameDayPollVotes: vi.fn(),
  assignVoter: vi.fn(),
  assignNewVoter: vi.fn(),
}))

import { fetchGameDayPollVotes, applyGameDayPollVotes, assignVoter } from '@/api/client'
import { PollVoteSyncSheet } from './PollVoteSyncSheet'

// Namen bewusst verschieden von preview.toAdd/toRemove (Max/Ben/Tim), sonst kollidiert
// getByText('Max') mit der gleichnamigen <option> im Zuordnungs-Select der UnknownVoterRow.
const PLAYERS: Player[] = [
  { id: 1, name: 'Erik', regular: true, defaultBattingOrder: 1, whatsappName: null },
  { id: 2, name: 'Frank', regular: true, defaultBattingOrder: 2, whatsappName: null },
  { id: 3, name: 'Georg', regular: true, defaultBattingOrder: 3, whatsappName: null },
]

const preview: GameDayVotePreview = {
  pollExists: true, sent: true, voteCount: 16, yesCount: 11,
  toAdd: [{ id: 1, name: 'Max' }, { id: 3, name: 'Tim' }],
  toRemove: [{ playerId: 2, playerName: 'Ben', warnings: ['Lineup Spiel 2 (#4, SS) wird gelöscht'] }],
  optionVoters: [
    { option: 'Ja ich will spielen', voters: ['Max M.', 'Tim T.'] },
    { option: 'Ich habe ein Auto und würde fahren', voters: ['Lisa L.'] },
    { option: 'Nein', voters: ['Ben B.'] },
  ],
  unknownVoters: ['Sandra W.'],
}

function renderSheet(props?: Partial<React.ComponentProps<typeof PollVoteSyncSheet>>) {
  return render(
    <MemoryRouter>
      <PollVoteSyncSheet
        target={{ type: 'GAME_DAY', id: 7 }}
        players={PLAYERS}
        onApplied={vi.fn()}
        onClose={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('PollVoteSyncSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('zeigt Zugänge, Abgänge und die Kaskaden-Warnung', async () => {
    vi.mocked(fetchGameDayPollVotes).mockResolvedValue(preview)
    renderSheet()

    expect(await screen.findByText('Max')).toBeInTheDocument()
    expect(screen.getByText('Ben')).toBeInTheDocument()
    expect(screen.getByText(/Lineup Spiel 2 \(#4, SS\) wird gelöscht/)).toBeInTheDocument()
  })

  it('Übernehmen schickt genau das Delta', async () => {
    vi.mocked(fetchGameDayPollVotes).mockResolvedValue(preview)
    vi.mocked(applyGameDayPollVotes).mockResolvedValue({} as never)
    const onApplied = vi.fn()
    renderSheet({ onApplied })

    await userEvent.click(await screen.findByRole('button', { name: /Übernehmen/ }))

    expect(applyGameDayPollVotes).toHaveBeenCalledWith(7, [1, 3], [2])
    expect(onApplied).toHaveBeenCalled()
  })

  it('leeres Delta deaktiviert den Übernehmen-Button', async () => {
    vi.mocked(fetchGameDayPollVotes).mockResolvedValue({ ...preview, toAdd: [], toRemove: [] })
    renderSheet()

    expect(await screen.findByText('Anwesenheit ist aktuell')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Übernehmen/ })).toBeDisabled()
  })

  it('zeigt bei nicht verbundenem WhatsApp die Fehlermeldung statt leerer Liste', async () => {
    vi.mocked(fetchGameDayPollVotes).mockRejectedValue(new Error('WhatsApp ist nicht verbunden — Stimmen konnten nicht abgerufen werden'))
    renderSheet()

    expect(await screen.findByText(/nicht verbunden/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Übernehmen/ })).toBeDisabled()
  })

  it('Abbrechen wendet nichts an', async () => {
    vi.mocked(fetchGameDayPollVotes).mockResolvedValue(preview)
    const onClose = vi.fn()
    renderSheet({ onClose })

    await userEvent.click(await screen.findByRole('button', { name: 'Abbrechen' }))

    expect(applyGameDayPollVotes).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('nach Zuordnung eines unbekannten Wählers wird die Vorschau neu geholt', async () => {
    vi.mocked(fetchGameDayPollVotes).mockResolvedValue(preview)
    vi.mocked(assignVoter).mockResolvedValue({} as never)
    renderSheet()

    await userEvent.selectOptions(await screen.findByLabelText('Spieler für Sandra W.'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Zuweisen' }))

    expect(assignVoter).toHaveBeenCalledWith('Sandra W.', 1)
    expect(fetchGameDayPollVotes).toHaveBeenCalledTimes(2)
  })
})
