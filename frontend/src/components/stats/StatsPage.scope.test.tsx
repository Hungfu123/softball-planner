import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Diese Tests meinen den Blick des Trainers — der Reiter Einsätze gehoert ihm.
vi.mock('@/hooks/useRolle', () => ({ useRolle: () => ({ istAdmin: true }) }))

// Jede API-Funktion liefert eine leere Liste: reicht, um Hinweis und leere Tabelle zu unterscheiden.
vi.mock('@/api/client', () => ({
  getAllGameDays: vi.fn(() => Promise.resolve([])),
  getAllTimeAwards: vi.fn(() => Promise.resolve([])),
  getAllTimeBattingStats: vi.fn(() => Promise.resolve([])),
  getAllTimeStats: vi.fn(() => Promise.resolve([])),
  getDistinctYears: vi.fn(() => Promise.resolve([])),
  getGame: vi.fn(() => Promise.resolve([])),
  getGameBattingStats: vi.fn(() => Promise.resolve([])),
  getGameDayAwards: vi.fn(() => Promise.resolve([])),
  getGameDayBattingStats: vi.fn(() => Promise.resolve([])),
  getOpponentBattingOverview: vi.fn(() => Promise.resolve([])),
  getOpponentBattingStats: vi.fn(() => Promise.resolve([])),
  getSeasonAwards: vi.fn(() => Promise.resolve([])),
  getSeasonBattingStats: vi.fn(() => Promise.resolve([])),
  getSeasons: vi.fn(() => Promise.resolve([])),
  getSeasonStats: vi.fn(() => Promise.resolve([])),
  getYearAwards: vi.fn(() => Promise.resolve([])),
  getYearBattingStats: vi.fn(() => Promise.resolve([])),
  getYearSeasons: vi.fn(() => Promise.resolve([])),
  getYearStats: vi.fn(() => Promise.resolve([])),
}))

import { StatsPage } from './StatsPage'

const NOTICE = /Einsätze zählt ganze Spiele/
const TABLE = 'Keine Einsatz-Daten in diesem Zeitraum.'

describe('StatsPage: Einsätze je Zeitraum', () => {
  it.each(['game', 'gameDay', 'opponent'])('zeigt bei Zeitraum %s den Hinweis statt der Tabelle', async scope => {
    render(<MemoryRouter initialEntries={[`/stats?view=games&scope=${scope}`]}><StatsPage /></MemoryRouter>)

    expect(await screen.findByText(NOTICE)).toBeInTheDocument()
    expect(screen.queryByText(TABLE)).not.toBeInTheDocument()
  })

  it.each(['season', 'year', 'allTime'])('zeigt bei Zeitraum %s die Tabelle statt des Hinweises', async scope => {
    render(<MemoryRouter initialEntries={[`/stats?view=games&scope=${scope}`]}><StatsPage /></MemoryRouter>)

    expect(await screen.findByText(TABLE)).toBeInTheDocument()
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
  })

  it('behandelt einen unbekannten view-Wert wie Schlagen', async () => {
    render(<MemoryRouter initialEntries={['/stats?view=foo&scope=year']}><StatsPage /></MemoryRouter>)

    await screen.findByRole('link', { name: 'Schlagen' })
    expect(screen.queryByText(TABLE)).not.toBeInTheDocument()
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
  })
})
