import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { PublicBogenFeed } from '@/types'

const getPublicBogenFeed = vi.fn()

vi.mock('@/api/client', () => ({
  getPublicBogenFeed: (...args: unknown[]) => getPublicBogenFeed(...args),
}))

const PublicBogenPage = (await import('./PublicBogenPage')).default

function baseFeed(overrides: Partial<PublicBogenFeed> = {}): PublicBogenFeed {
  return {
    homeTeamName: 'Köln Abbots',
    awayTeamName: 'Allstar',
    date: '2026-08-06',
    location: 'Sportpark',
    status: 'LIVE',
    currentInning: 2,
    currentSide: 'HOME',
    homeRuns: 3,
    awayRuns: 1,
    homeLineup: [{ id: 1, side: 'HOME', slot: 1, name: 'Ylvi', position: '2B', battingOrder: 1 }],
    awayLineup: [{ id: 2, side: 'AWAY', slot: 1, name: 'Weber', position: 'CF', battingOrder: 1 }],
    // slotId 2 (Weber, Gast) statt slotId 1 (Ylvi, Heim) — sonst taucht "Ylvi"
    // sowohl im Play-by-Play als auch in der Aufstellung auf und Tests, die nach
    // dem Namen suchen, finden zwei Treffer.
    homeAtBats: [],
    awayAtBats: [
      { id: 1, bogenId: 1, slotId: 2, side: 'AWAY', sequence: 1, inning: 1, result: 'SINGLE',
        outType: null, sacrificeType: null, fielderChain: null, isError: false, errorPosition: null,
        runsScored: 0, rbi: 0, baseStateAfter: null, runnerAdvances: [], createdAt: '2026-08-06T10:00:00Z' },
    ],
    stealingEvents: [],
    substitutions: [],
    inningRuns: { 1: { home: 0, away: 0 } },
    homeTotals: { runs: 3, hits: 4, errors: 0 },
    awayTotals: { runs: 1, hits: 2, errors: 1 },
    ...overrides,
  }
}

function renderAt(token = 'abc123') {
  return render(
    <MemoryRouter initialEntries={[`/live/${token}`]}>
      <Routes>
        <Route path="/live/:token" element={<PublicBogenPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicBogenPage', () => {
  beforeEach(() => {
    getPublicBogenFeed.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt die Ungültig-Meldung, wenn der Token beim ersten Laden 404 liefert', async () => {
    getPublicBogenFeed.mockRejectedValue(new Error('Nicht gefunden'))
    renderAt()

    expect(await screen.findByText('Dieser Link ist nicht mehr gültig.')).toBeInTheDocument()
  })

  it('behält den letzten Stand bei einem Netzfehler und zeigt einen Hinweis', async () => {
    vi.useFakeTimers()
    getPublicBogenFeed.mockResolvedValueOnce(baseFeed())
    renderAt()

    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByTestId('scoreboard')).toHaveTextContent('Köln Abbots')

    getPublicBogenFeed.mockRejectedValueOnce(new Error('Netzwerk down'))
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })

    expect(screen.getByText(/Verbindung unterbrochen/)).toBeInTheDocument()
    // Letzter Stand bleibt sichtbar — Seite wird nicht leer.
    expect(screen.getByTestId('scoreboard')).toHaveTextContent('Köln Abbots')
  })

  it('rendert die Aufstellung ohne Stift-Icons — Seite ist read-only', async () => {
    getPublicBogenFeed.mockResolvedValue(baseFeed())
    renderAt()

    await userEvent.click(await screen.findByText('Aufstellung'))
    expect(await screen.findByText('Ylvi')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /bearbeiten/ })).not.toBeInTheDocument()
  })

  it('zeigt beide Teamnamen sowie Datum und Ort in der Kopfzeile', async () => {
    getPublicBogenFeed.mockResolvedValue(baseFeed())
    renderAt()

    const header = await screen.findByRole('banner')
    expect(header).toHaveTextContent('Allstar')
    expect(header).toHaveTextContent('Köln Abbots')
    expect(header).toHaveTextContent('Sportpark')
  })
})
