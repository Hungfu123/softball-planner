import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { GameDayResponse } from '@/types'

vi.mock('@/api/client', () => ({
  getGameDay: vi.fn(),
  getGameDayLineups: vi.fn(),
  getSeasons: vi.fn(),
}))
vi.mock('@/utils/pdfExport', () => ({ generatePdf: vi.fn() }))

import * as api from '@/api/client'
import { LineupSheet } from './LineupSheet'

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>

function spieltag(extra: Partial<GameDayResponse>): GameDayResponse {
  return {
    id: 1, date: '2099-06-20', label: 'Spieltag', location: null, seasonId: 1,
    availablePlayers: [],
    games: [{
      id: 10, gameNumber: 1, opponentTeam: null, scoreUs: null, scoreThem: null,
      gameDayId: 1, lineupEntryCount: 0,
    }],
    ...extra,
  }
}

function rendern() {
  return render(
    <MemoryRouter initialEntries={['/gameday/1/export']}>
      <Routes><Route path="/gameday/:id/export" element={<LineupSheet />} /></Routes>
    </MemoryRouter>,
  )
}

describe('LineupSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.getGameDayLineups.mockResolvedValue({ lineups: {}, staff: {}, substitutions: {} })
    mockApi.getSeasons.mockResolvedValue([])
  })

  it('sagt vor der Freigabe, dass die Aufstellung noch nicht steht', async () => {
    mockApi.getGameDay.mockResolvedValue(spieltag({ lineupsReleasedAt: null }))
    rendern()
    expect(await screen.findByText('Die Aufstellung steht noch nicht. Sobald sie steht, findest du sie hier.')).toBeInTheDocument()
    expect(screen.queryByText('Kein Lineup')).not.toBeInTheDocument()
  })

  it('sagt bei einem vergangenen, leeren, nie freigegebenen Spieltag „Kein Lineup"', async () => {
    mockApi.getGameDay.mockResolvedValue(spieltag({ date: '2000-06-20', lineupsReleasedAt: null }))
    rendern()
    expect(await screen.findByText('Kein Lineup')).toBeInTheDocument()
    expect(screen.queryByText(/steht noch nicht/)).not.toBeInTheDocument()
  })

  it('bleibt nach der Freigabe bei „Kein Lineup", wenn nichts eingetragen ist', async () => {
    mockApi.getGameDay.mockResolvedValue(spieltag({ lineupsReleasedAt: '2099-01-01T08:00:00' }))
    rendern()
    expect(await screen.findByText('Kein Lineup')).toBeInTheDocument()
    expect(screen.queryByText(/steht noch nicht/)).not.toBeInTheDocument()
  })
})
