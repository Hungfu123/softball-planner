import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { PlayerFormPoint, PlayerBattingStatsResponse, PlayerUsage, SeasonPlayerStats } from '@/types'

const rolle = vi.hoisted(() => ({ istAdmin: true }))
vi.mock('@/hooks/useRolle', () => ({
  useRolle: () => ({ me: null, istAdmin: rolle.istAdmin, istSuperadmin: rolle.istAdmin, darfScoren: rolle.istAdmin }),
}))

vi.mock('@/components/layout/Layout', () => ({
  useToastContext: () => ({ show: vi.fn(), dismiss: vi.fn() }),
}))

vi.mock('@/api/client', () => ({
  getPlayer: vi.fn(),
  getPlayerBattingTimeline: vi.fn(),
  getPlayerUsage: vi.fn(),
  getAllTimeStats: vi.fn(),
  getAllTimeBattingStats: vi.fn(),
  getYearStats: vi.fn(),
  getYearBattingStats: vi.fn(),
  getSeasonStats: vi.fn(),
  getSeasonBattingStats: vi.fn(),
  updatePlayer: vi.fn(),
  updatePlayerPositions: vi.fn(),
}))

import * as api from '@/api/client'
import { PlayerProfilePage } from './PlayerProfilePage'

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>

function point(year: number, gameId: number): PlayerFormPoint {
  return {
    gameId, date: `${year}-05-11`, opponent: 'Köln', seasonId: year, seasonName: `Liga ${year}`, year,
    plateAppearances: 3, atBats: 3, hits: 1, walks: 0, strikeouts: 1, runsBattedIn: 0,
    totalBases: 1, timesOnBase: 1, stolenBases: 0, caughtStealing: 0,
    rollingAverage: 0.333, rollingOnBase: 0.333, rollingSlugging: 0.333, rollingOps: 0.666,
    rollingPlateAppearances: 3, provisional: true,
  }
}

function usage(gameDaysTotal: number): PlayerUsage {
  return {
    gameDaysTotal, gameDaysAvailable: gameDaysTotal, gameDaysPlayed: gameDaysTotal,
    trainingsTotal: 0, trainingsAttended: 0, averageBattingOrder: null, battingOrderCounts: {},
  }
}

function gameStats(totalGames: number): SeasonPlayerStats {
  return { playerId: 1, playerName: 'Mia', totalGames, positionCounts: { SS: totalGames } } as SeasonPlayerStats
}

function battingStats(average: number): PlayerBattingStatsResponse[] {
  return [
    { playerId: 1, playerName: 'Mia', plateAppearances: 20, atBats: 20, hits: 6, singles: 6, doubles: 0,
      triples: 0, homeRuns: 0, runs: 2, walks: 0, hitByPitch: 0, strikeouts: 4, outs: 14, reachedOnError: 0,
      stolenBases: 0, caughtStealing: 0, pickoffs: 0, runsBattedIn: 2, totalBases: 6,
      battingAverage: average, onBasePct: average, sluggingPct: average, ops: average * 2, qualified: true },
    { playerId: 2, playerName: 'Rest', plateAppearances: 20, atBats: 20, hits: 4, singles: 4, doubles: 0,
      triples: 0, homeRuns: 0, runs: 1, walks: 0, hitByPitch: 0, strikeouts: 4, outs: 16, reachedOnError: 0,
      stolenBases: 0, caughtStealing: 0, pickoffs: 0, runsBattedIn: 1, totalBases: 4,
      battingAverage: 0.2, onBasePct: 0.2, sluggingPct: 0.2, ops: 0.4, qualified: true },
  ]
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/players/1']}>
      <Routes>
        <Route path="/players/:id" element={<PlayerProfilePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Der Zeitraum hängt an einer nativen Auswahl — Werte sind `all`, `year:…`, `season:…`. */
function selectScope(value: string) {
  fireEvent.change(screen.getByLabelText('Zeitraum wählen'), { target: { value } })
}

describe('PlayerProfilePage — Zeitraum-Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.getPlayer.mockResolvedValue({
      id: 1, name: 'Mia', regular: true, archived: false,
      primaryPosition: 'SS', secondaryPosition: null, tertiaryPosition: null,
    })
    mockApi.getPlayerBattingTimeline.mockResolvedValue([point(2025, 1), point(2026, 2)])
    mockApi.getPlayerUsage.mockResolvedValue(usage(20))
    mockApi.getAllTimeStats.mockResolvedValue([gameStats(20)])
    mockApi.getAllTimeBattingStats.mockResolvedValue(battingStats(0.3))
    mockApi.getYearStats.mockResolvedValue([gameStats(7)])
    mockApi.getYearBattingStats.mockResolvedValue(battingStats(0.5))
    mockApi.getSeasonStats.mockResolvedValue([gameStats(4)])
    mockApi.getSeasonBattingStats.mockResolvedValue(battingStats(0.6))
  })

  it('startet über alles', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/20 Spiele insgesamt/)).toBeInTheDocument())
    expect(mockApi.getPlayerUsage).toHaveBeenCalledWith(1)
    expect(mockApi.getYearBattingStats).not.toHaveBeenCalled()
  })

  it('lädt Teamvergleich, Einsatz und gespielte Positionen für das gewählte Jahr nach', async () => {
    mockApi.getPlayerUsage.mockImplementation((_id: number, scope?: { year?: number }) =>
      Promise.resolve(usage(scope?.year === 2026 ? 9 : 20)))
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Zeitraum wählen')).toBeInTheDocument())

    selectScope('year:2026')

    await waitFor(() => {
      expect(mockApi.getYearBattingStats).toHaveBeenCalledWith(2026)
      expect(mockApi.getYearStats).toHaveBeenCalledWith(2026)
      expect(mockApi.getPlayerUsage).toHaveBeenCalledWith(1, { year: 2026 })
    })
    // Zugesagt und aufgestellt stehen beide auf 9 — beide Zeilen müssen umspringen.
    await waitFor(() => expect(screen.getAllByText('9 von 9 Spieltagen')).toHaveLength(2))
  })

  it('schaltet auf eine einzelne Saison um', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Zeitraum wählen')).toBeInTheDocument())

    selectScope('season:2026')

    await waitFor(() => {
      expect(mockApi.getSeasonBattingStats).toHaveBeenCalledWith(2026)
      expect(mockApi.getSeasonStats).toHaveBeenCalledWith(2026)
      expect(mockApi.getPlayerUsage).toHaveBeenCalledWith(1, { seasonId: 2026 })
    })
    await waitFor(() => expect(screen.getByText(/4 Spiele/)).toBeInTheDocument())
  })

  it('bietet Jahre und Saisons getrennt an', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Zeitraum wählen')).toBeInTheDocument())

    const options = [...screen.getByLabelText('Zeitraum wählen').querySelectorAll('option')]
      .map(o => o.value)
    expect(options).toEqual(['all', 'year:2026', 'year:2025', 'season:2026', 'season:2025'])
  })

  it('kehrt zu allem zurück, ohne neu zu laden', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Zeitraum wählen')).toBeInTheDocument())

    selectScope('year:2026')
    await waitFor(() => expect(mockApi.getYearStats).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }))

    await waitFor(() => expect(screen.getByText(/20 Spiele insgesamt/)).toBeInTheDocument())
    expect(mockApi.getPlayer).toHaveBeenCalledTimes(1)
  })
})
