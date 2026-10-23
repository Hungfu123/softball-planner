import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { GameDayResponse, SeasonPlayerStats, PlayerBattingStatsResponse } from '@/types'

// Toast-Context stubben (Dashboard zieht useToastContext aus Layout)
const rolle = vi.hoisted(() => ({ istAdmin: true }))
vi.mock('@/hooks/useRolle', () => ({
  useRolle: () => ({ me: null, istAdmin: rolle.istAdmin, istSuperadmin: rolle.istAdmin, darfScoren: rolle.istAdmin }),
}))

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
  getSeasonAwards: vi.fn(),
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
    rolle.istAdmin = true
    localStorage.clear()
    vi.clearAllMocks()
    mockApi.getSeasons.mockResolvedValue([SEASON])
    mockApi.getSeasonStats.mockResolvedValue([] as SeasonPlayerStats[])
    mockApi.getSeasonBattingStats.mockResolvedValue([] as PlayerBattingStatsResponse[])
    mockApi.getGameDayWeather.mockResolvedValue(null)
    mockApi.getGameDayAwards.mockResolvedValue([])
    mockApi.getSeasonAwards.mockResolvedValue([])
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

  describe('Rollen', () => {
    // In drei Tagen: das Wetter wird nur für Spieltage von heute bis +16 Tage angefragt.
    const heute = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)

    it('zeigt einem Spieler keine Anlegen-, Bearbeiten- oder Löschen-Knöpfe und fragt kein Wetter an', async () => {
      rolle.istAdmin = false
      mockApi.getGameDays.mockResolvedValue([gameDay(10, heute), gameDay(11, '2999-01-01')])

      render(<MemoryRouter><Dashboard /></MemoryRouter>)

      await waitFor(() => expect(screen.getByText(/Anstehend/)).toBeInTheDocument())
      await waitFor(() => expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument())
      expect(screen.queryByText(/Neuer Spieltag/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Spieltag bearbeiten')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Spieltag löschen')).not.toBeInTheDocument()
      expect(screen.queryByText(/Lineup verwalten/)).not.toBeInTheDocument()
      expect(mockApi.getGameDayWeather).not.toHaveBeenCalled()
      // Keine Fläche, die klickbar aussieht und es nicht ist.
      expect(document.querySelector('div[class*="hover:border-navy-400"]')).toBeNull()
      expect(document.querySelector('a[href^="/gameday/"]')).toBeNull()
    })

    it('gegenprobe: derselbe Zustand gibt einem Admin Anlegen, Bearbeiten, Löschen und Lineup und fragt das Wetter an', async () => {
      rolle.istAdmin = true
      mockApi.getGameDays.mockResolvedValue([gameDay(10, heute), gameDay(11, '2999-01-01')])

      render(<MemoryRouter><Dashboard /></MemoryRouter>)

      expect(await screen.findByLabelText('Spieltag bearbeiten')).toBeInTheDocument()
      expect(document.querySelector('div[class*="hover:border-navy-400"]')).not.toBeNull()
      expect(screen.getAllByText(/Neuer Spieltag/).length).toBeGreaterThan(0)
      expect(screen.getByLabelText('Spieltag löschen')).toBeInTheDocument()
      expect(screen.getByText(/Lineup verwalten/)).toBeInTheDocument()
      await waitFor(() => expect(mockApi.getGameDayWeather).toHaveBeenCalledWith(10))
    })

    it('sagt einem Spieler ohne Saison, dass keine angelegt ist, statt Anlegen anzubieten', async () => {
      rolle.istAdmin = false
      mockApi.getSeasons.mockResolvedValue([])

      render(<MemoryRouter><Dashboard /></MemoryRouter>)

      expect(await screen.findByText(/noch keine Saison angelegt/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /erstellen/i })).not.toBeInTheDocument()
    })
  })
})
