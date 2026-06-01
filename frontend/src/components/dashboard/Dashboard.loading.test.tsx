import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { GameDayResponse, SeasonPlayerStats, PlayerBattingStatsResponse } from '@/types'

// Toast-Context stubben (Dashboard zieht useToastContext aus Layout)
vi.mock('@/components/layout/Layout', () => ({
  useToastContext: () => ({ show: vi.fn(), dismiss: vi.fn() }),
}))

// API-Client mocken
vi.mock('@/api/client', () => ({
  getSeasons: vi.fn(),
  getGameDays: vi.fn(),
  getSeasonStats: vi.fn(),
  getSeasonBattingStats: vi.fn(),
  getGameDayWeather: vi.fn(),
  getGameDayAwards: vi.fn(),
  createSeason: vi.fn(),
  updateSeason: vi.fn(),
  deleteSeason: vi.fn(),
  createGameDay: vi.fn(),
  deleteGameDay: vi.fn(),
}))

import * as api from '@/api/client'
import { Dashboard } from './Dashboard'

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>

const SEASON = { id: 1, name: 'Saison 2026', year: 2026 }

function gameDay(id: number, date: string): GameDayResponse {
  return { id, date, label: 'Spieltag', location: null, seasonId: 1, availablePlayers: [], games: [] }
}

describe('Dashboard — Loading-State beim Laden der Spieltage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockApi.getSeasons.mockResolvedValue([SEASON])
    mockApi.getSeasonStats.mockResolvedValue([] as SeasonPlayerStats[])
    mockApi.getSeasonBattingStats.mockResolvedValue([] as PlayerBattingStatsResponse[])
    mockApi.getGameDayWeather.mockResolvedValue(null)
    mockApi.getGameDayAwards.mockResolvedValue([])
  })

  it('zeigt KEINEN "Noch kein Spieltag"-Empty-State während die Spieltage laden, sondern einen Loading-State', async () => {
    // getGameDays bleibt pending bis wir manuell auflösen
    let resolveGd: (v: GameDayResponse[]) => void = () => {}
    mockApi.getGameDays.mockReturnValue(new Promise<GameDayResponse[]>(r => { resolveGd = r }))

    render(<MemoryRouter><Dashboard /></MemoryRouter>)

    // Saisons geladen → Saison selektiert → getGameDays angestoßen (noch pending)
    await waitFor(() => expect(mockApi.getGameDays).toHaveBeenCalledWith(1))

    // Während pending: KEIN Empty-State, aber ein Loading-Indikator
    expect(screen.queryByText(/Noch kein Spieltag/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument()

    // Auflösen mit LEERER Liste → jetzt echt-leer
    resolveGd([])

    // Nach Laden: Loading weg, Empty-State erscheint (geladen & leer ≠ ladend)
    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument()
      expect(screen.getByText(/Noch kein Spieltag/i)).toBeInTheDocument()
    })
  })

  it('zeigt nach dem Laden die Spieltage statt Empty-State', async () => {
    mockApi.getGameDays.mockResolvedValue([gameDay(10, '2026-06-01')])

    render(<MemoryRouter><Dashboard /></MemoryRouter>)

    await waitFor(() => expect(mockApi.getGameDays).toHaveBeenCalledWith(1))
    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument()
      expect(screen.queryByText(/Noch kein Spieltag/i)).not.toBeInTheDocument()
    })
  })
})
