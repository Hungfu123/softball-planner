import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BogenLiveFeed } from './BogenLiveFeed'
import type { HalfInning } from '@/utils/bogenFeed'

const feed: HalfInning[] = [
  {
    inning: 2, side: 'HOME', scoreAfter: { home: 3, away: 1 },
    events: [
      { key: 'a', inning: 2, side: 'HOME', createdAt: '2026-08-06T10:05:00Z',
        who: 'Krosaki', what: 'Single', rbi: 0, scored: false, minor: false },
      { key: 'b', inning: 2, side: 'HOME', createdAt: '2026-08-06T10:04:00Z',
        who: 'Juli', what: 'Walk', rbi: 2, scored: true, minor: false },
      { key: 'c', inning: 2, side: 'HOME', createdAt: '2026-08-06T10:03:00Z',
        who: 'Rauf', what: 'stiehlt 2nd', rbi: 0, scored: false, minor: true },
    ],
  },
  {
    inning: 1, side: 'AWAY', scoreAfter: { home: 0, away: 1 },
    events: [
      { key: 'd', inning: 1, side: 'AWAY', createdAt: '2026-08-06T10:00:00Z',
        who: 'Weber', what: 'Grounder 6-3', rbi: 0, scored: false, minor: false },
    ],
  },
]

const base = {
  homeTeamName: 'Köln Abbots',
  awayTeamName: 'Allstar',
  status: 'LIVE' as const,
  currentInning: 2,
  currentSide: 'HOME' as const,
  homeRuns: 3,
  awayRuns: 1,
  inningRuns: { 1: { home: 0, away: 1 }, 2: { home: 3, away: 0 } },
  homeTotals: { runs: 3, hits: 4, errors: 0 },
  awayTotals: { runs: 1, hits: 2, errors: 1 },
  feed,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BogenLiveFeed', () => {
  it('zeigt beide Teams mit Stand', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByText('Köln Abbots')).toBeInTheDocument()
    expect(screen.getByText('Allstar')).toBeInTheDocument()
  })

  it('zeigt R/H/E beider Teams in der Linescore', () => {
    render(<BogenLiveFeed {...base} />)
    const away = screen.getByTestId('linescore-row-AWAY')
    expect(away).toHaveTextContent('1')
    expect(away).toHaveTextContent('2')
    const home = screen.getByTestId('linescore-row-HOME')
    expect(home).toHaveTextContent('4')
  })

  it('rendert Ereigniszeilen', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByText('Krosaki')).toBeInTheDocument()
    expect(screen.getByText('Grounder 6-3')).toBeInTheDocument()
  })

  it('hebt nur Run-Zeilen hervor', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByTestId('event-b')).toHaveAttribute('data-scored', 'true')
    expect(screen.getByTestId('event-a')).toHaveAttribute('data-scored', 'false')
  })

  it('zeigt das RBI-Tag nur wenn RBI > 0', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByText('+2 RBI')).toBeInTheDocument()
    expect(screen.queryByText('+0 RBI')).not.toBeInTheDocument()
  })

  it('dimmt Steals und Subs', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByTestId('event-c')).toHaveAttribute('data-minor', 'true')
  })

  it('zeigt den Zwischenstand je Halbinning', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByText('3 : 1')).toBeInTheDocument()
  })

  it('springt beim Klick auf eine gespielte Inning-Zelle', async () => {
    const scrollIntoView = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})

    render(<BogenLiveFeed {...base} />)
    await userEvent.click(screen.getByTestId('linescore-cell-1-AWAY'))

    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('macht noch nicht gespielte Innings nicht anklickbar', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByTestId('linescore-cell-6-HOME')).toBeDisabled()
  })

  it('zeigt einen Hinweis, solange das Spiel nicht gestartet ist', () => {
    render(<BogenLiveFeed {...base} status="DRAFT" feed={[]} />)
    expect(screen.getByText(/noch nicht gestartet/i)).toBeInTheDocument()
  })

  it('zeigt einen Hinweis bei laufendem Spiel ohne Ereignisse', () => {
    render(<BogenLiveFeed {...base} status="LIVE" feed={[]} />)
    expect(screen.getByText(/noch nichts passiert/i)).toBeInTheDocument()
  })

  it('zeigt den Endstand-Hinweis bei beendetem Spiel', () => {
    render(<BogenLiveFeed {...base} status="DONE" />)
    expect(screen.getByText(/endstand/i)).toBeInTheDocument()
  })
})
