import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { GameDayResponse } from '@/types'

// Diese Suite deckt Punkt 1 des UX-Reviews ab: nach "Übernehmen" im WhatsApp-Stimmen-Sheet
// muss der Planner Lineup/Staff genauso aufräumen wie beim manuellen Anwesend-Modal
// (handleSetAvailablePlayers). Regression: onApplied lud vorher nur gameDay + Poll-Status
// neu, ohne lineup.removeUnavailable/invalidateCache/staff.load/refreshStats — das alte
// Lineup blieb im Grid sichtbar, obwohl die DB den Spieler bereits entfernt hatte.

const mockLineup = {
  entries: [] as unknown[],
  substitutions: [] as unknown[],
  saving: false,
  hasChanges: false,
  hasEmptySlots: false,
  activeGameId: null as number | null,
  load: vi.fn().mockResolvedValue(undefined),
  addPlayer: vi.fn(),
  removePlayer: vi.fn(),
  setPosition: vi.fn(),
  setDhBatter: vi.fn(),
  moveUp: vi.fn(),
  moveDown: vi.fn(),
  reorder: vi.fn(),
  replacePlayer: vi.fn(),
  swapEntries: vi.fn(),
  save: vi.fn(),
  importEntries: vi.fn(),
  clearAll: vi.fn(),
  removeUnavailable: vi.fn(),
  applySuggestion: vi.fn(),
  applySet: vi.fn(),
  fillEmptySlot: vi.fn(),
  saveAllGames: vi.fn().mockResolvedValue([]),
  hasUnsavedWork: vi.fn(() => false),
  invalidateCache: vi.fn(),
  addSubstitution: vi.fn(),
  removeSubstitution: vi.fn(),
  revert: vi.fn(),
}

const mockStaff = {
  staff: [] as unknown[],
  loaded: true,
  load: vi.fn().mockResolvedValue(undefined),
  save: vi.fn(),
}

const mockRefreshStats = vi.fn().mockResolvedValue(undefined)
const mockSetAvailablePlayers = vi.fn().mockResolvedValue(undefined)
const mockSetGameDay = vi.fn()

let gameDay: GameDayResponse

vi.mock('@/hooks/useGameDay', () => ({
  useGameDay: () => ({
    gameDay,
    setGameDay: mockSetGameDay,
    stats: [],
    loading: false,
    refreshStats: mockRefreshStats,
    setAvailablePlayers: mockSetAvailablePlayers,
    reload: vi.fn(),
  }),
}))
vi.mock('@/hooks/useLineup', () => ({ useLineup: () => mockLineup }))
vi.mock('@/hooks/useStaff', () => ({ useStaff: () => mockStaff }))
vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: () => ({
    players: [], loading: false, create: vi.fn(), update: vi.fn(), remove: vi.fn(),
    reorderBattingOrder: vi.fn(), setWhatsappName: vi.fn(), reload: vi.fn(),
  }),
}))
vi.mock('@/hooks/useLineupSets', () => ({
  useLineupSets: () => ({ sets: [], loading: false, reload: vi.fn(), create: vi.fn(), rename: vi.fn(), remove: vi.fn() }),
}))
vi.mock('@/components/layout/Layout', () => ({
  useToastContext: () => ({ show: vi.fn(), dismiss: vi.fn() }),
}))

// Alle Kind-Komponenten des Planners stubben — nur das Zusammenspiel der Callbacks in
// GameDayPlanner selbst ist Gegenstand dieser Suite. AvailablePlayersModal/PollVoteSyncSheet/
// PollSyncToolbarButton bleiben minimal interaktiv (Buttons), damit die beiden Übernahme-Wege
// über echte Klicks ausgelöst werden können.
vi.mock('./GameTabs', () => ({ GameTabs: ({ rightSlot }: { rightSlot?: unknown }) => <>{rightSlot as never}</> }))
vi.mock('./LineupEditor', () => ({ LineupEditor: () => null }))
vi.mock('./LineupSetBar', () => ({
  LineupSetBar: ({ onApply }: { onApply: (set: unknown) => void }) => (
    <button onClick={() => onApply({
      id: 5, gameDayId: 1, name: 'Set A', entries: [], staff: [], availablePlayerIds: [1],
    })}>apply-set</button>
  ),
}))
vi.mock('./SaveSetModal', () => ({ SaveSetModal: () => null }))
vi.mock('./PlayerPool', () => ({ PlayerPool: () => null }))
vi.mock('./FieldView', () => ({ FieldView: () => null }))
vi.mock('./FieldPositionAssignSheet', () => ({ FieldPositionAssignSheet: () => null }))
vi.mock('./CoachSlots', () => ({ CoachSlots: () => null }))
vi.mock('./BenchDisplay', () => ({ BenchDisplay: () => null }))
vi.mock('./SaveButton', () => ({ SaveButton: () => null }))
vi.mock('./AvailablePlayersModal', () => ({
  AvailablePlayersModal: ({ onSave }: { onSave: (ids: number[]) => void }) => (
    <button onClick={() => onSave([1])}>manual-apply</button>
  ),
}))
vi.mock('./CopyLineupModal', () => ({ CopyLineupModal: () => null }))
vi.mock('./SubstitutionEditor', () => ({ SubstitutionEditor: () => null }))
vi.mock('./PollVoteSyncSheet', () => ({
  PollVoteSyncSheet: ({ onApplied }: { onApplied: () => void | Promise<void> }) => (
    <button onClick={() => onApplied()}>poll-apply</button>
  ),
}))
vi.mock('./PollSyncToolbarButton', () => ({
  PollSyncToolbarButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick}>open-poll-sync</button>
  ),
}))
vi.mock('@/components/dashboard/EditGameDayModal', () => ({ EditGameDayModal: () => null }))
vi.mock('@/utils/pdfExport', () => ({
  generatePdf: vi.fn(), generateLineupWithFieldPdf: vi.fn(), generateSignatureListPdf: vi.fn(),
}))
vi.mock('./GameDayPlannerSkeleton', () => ({ GameDayPlannerSkeleton: () => <div>Lädt…</div> }))

vi.mock('@/api/client', () => ({
  getGameDay: vi.fn(),
  getGameDayStats: vi.fn().mockResolvedValue([]),
  getGameDays: vi.fn().mockResolvedValue([]),
  getSeason: vi.fn().mockResolvedValue(null),
  getGameDayPollVotes: vi.fn().mockResolvedValue(null),
  getTrainingPeriods: vi.fn().mockResolvedValue([]),
  getTrainingStats: vi.fn().mockResolvedValue([]),
  getSeasonBattingStats: vi.fn().mockResolvedValue([]),
  getYearBattingStats: vi.fn().mockResolvedValue([]),
  setAvailablePlayers: vi.fn(),
  deleteGameDay: vi.fn(),
  suggestLineup: vi.fn(),
  suggestAllLineups: vi.fn(),
  undoAllLineups: vi.fn(),
  getGameDayLineups: vi.fn(),
}))

import { getGameDay } from '@/api/client'
import { GameDayPlanner } from './GameDayPlanner'

function renderPlanner() {
  const router = createMemoryRouter(
    [{ path: '/gameday/:id', element: <GameDayPlanner /> }],
    { initialEntries: ['/gameday/1'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('GameDayPlanner — Übernahme-Wege bleiben synchron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLineup.load.mockResolvedValue(undefined)
    mockStaff.load.mockResolvedValue(undefined)
    mockRefreshStats.mockResolvedValue(undefined)
    mockSetAvailablePlayers.mockResolvedValue(undefined)
    gameDay = {
      id: 1,
      date: '2026-08-01',
      label: 'Spieltag',
      location: null,
      seasonId: 9,
      availablePlayers: [
        { id: 1, name: 'Erik', regular: true, defaultBattingOrder: 1, whatsappName: null },
        { id: 2, name: 'Frank', regular: true, defaultBattingOrder: 2, whatsappName: null },
      ],
      games: [{
        id: 100, gameNumber: 1, opponentTeam: null, scoreUs: null, scoreThem: null,
        gameDayId: 1, lineupEntryCount: 0,
      }],
    }
  })

  it('WhatsApp-Übernahme räumt Lineup/Staff auf wie das manuelle Anwesend-Modal', async () => {
    const updated: GameDayResponse = {
      ...gameDay,
      availablePlayers: [{ id: 1, name: 'Erik', regular: true, defaultBattingOrder: 1, whatsappName: null }],
    }
    vi.mocked(getGameDay).mockResolvedValue(updated)

    renderPlanner()
    await userEvent.click((await screen.findAllByText('open-poll-sync'))[0])
    await userEvent.click(await screen.findByText('poll-apply'))

    expect(getGameDay).toHaveBeenCalledWith(1)
    expect(mockLineup.removeUnavailable).toHaveBeenCalledWith(new Set([1]))
    expect(mockLineup.invalidateCache).toHaveBeenCalled()
    expect(mockStaff.load).toHaveBeenCalledWith(100)
    expect(mockRefreshStats).toHaveBeenCalled()
  })

  it('manuelles Anwesend-Speichern räumt weiterhin identisch auf (Referenzverhalten)', async () => {
    renderPlanner()
    await userEvent.click((await screen.findAllByTitle('Wer ist am Spieltag dabei?'))[0])
    await userEvent.click(await screen.findByText('manual-apply'))

    expect(mockSetAvailablePlayers).toHaveBeenCalledWith([1])
    expect(mockLineup.removeUnavailable).toHaveBeenCalledWith(new Set([1]))
    expect(mockLineup.invalidateCache).toHaveBeenCalled()
    expect(mockStaff.load).toHaveBeenCalledWith(100)
    expect(mockRefreshStats).toHaveBeenCalled()
  })

  it('Set anwenden lädt den Spieltag neu, weil die Freigabe-Leiste ihren Stand daraus liest', async () => {
    mockLineup.applySet.mockResolvedValue({ skipped: [], skippedCoaches: [] })
    const reloaded: GameDayResponse = {
      ...gameDay,
      games: [{ ...gameDay.games[0], lineupEntryCount: 9 }],
    }
    vi.mocked(getGameDay).mockResolvedValue(reloaded)

    renderPlanner()
    await userEvent.click((await screen.findAllByText('apply-set'))[0])
    await userEvent.click(await screen.findByText('Ja, anwenden'))

    await waitFor(() => expect(mockSetGameDay).toHaveBeenCalledWith(reloaded))
    expect(getGameDay).toHaveBeenCalledWith(1)
    // Nach dem Schreiben der Aufstellungen, nicht davor.
    expect(vi.mocked(getGameDay).mock.invocationCallOrder[0])
      .toBeGreaterThan(mockLineup.applySet.mock.invocationCallOrder[0])
  })
})
