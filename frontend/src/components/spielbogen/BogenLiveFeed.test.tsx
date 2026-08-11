import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
    const scoreboard = within(screen.getByTestId('scoreboard'))
    expect(scoreboard.getByText('Köln Abbots')).toBeInTheDocument()
    expect(scoreboard.getByText('Allstar')).toBeInTheDocument()
  })

  it('zeigt R/H/E beider Teams in der Linescore', () => {
    render(<BogenLiveFeed {...base} />)
    const away = screen.getByTestId('linescore-row-AWAY')
    expect(away).toHaveTextContent('1')
    expect(away).toHaveTextContent('2')
    const home = screen.getByTestId('linescore-row-HOME')
    expect(home).toHaveTextContent('4')
  })

  it('rendert Ereigniszeilen des offenen Halbinnings', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByText('Krosaki')).toBeInTheDocument()
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

  it('zeigt den Zwischenstand je Halbinning — Away zuerst, wie Scoreboard und Linescore', () => {
    render(<BogenLiveFeed {...base} />)
    // 2. Inning HOME: scoreAfter { home: 3, away: 1 } → Away zuerst
    expect(screen.getByText('1 : 3')).toBeInTheDocument()
    // 1. Inning AWAY: scoreAfter { home: 0, away: 1 }
    expect(screen.getByText('1 : 0')).toBeInTheDocument()
    expect(screen.queryByText('3 : 1')).not.toBeInTheDocument()
  })

  it('beschriftet den Zwischenstand mit den vollen Teamnamen, weil das Scoreboard längst weggescrollt ist', () => {
    render(<BogenLiveFeed {...base} />)
    const divider = within(screen.getByTestId('divider-half-2-HOME'))
    expect(divider.getByText('Allstar')).toBeInTheDocument()
    expect(divider.getByText('1 : 3')).toBeInTheDocument()
    expect(divider.getByText('Köln Abbots')).toBeInTheDocument()
  })

  it('ordnet die Teamnamen im Divider wie im Scoreboard — Away links vom Score, Home rechts', () => {
    render(<BogenLiveFeed {...base} />)
    const divider = screen.getByTestId('divider-half-2-HOME')
    const names = within(divider).getAllByText(/^(Allstar|Köln Abbots)$/).map(el => el.textContent)
    expect(names).toEqual(['Allstar', 'Köln Abbots'])
  })

  it('beschriftet Top/Btm als Wort statt als Dreieck, damit es nicht wie ein Fold-Control wirkt', () => {
    render(<BogenLiveFeed {...base} />)
    // Scoreboard-Meta-Zeile: currentSide HOME → Btm
    const scoreboard = within(screen.getByTestId('scoreboard'))
    expect(scoreboard.getByText(/↓ Btm/)).toBeInTheDocument()
    expect(scoreboard.queryByText(/▲|▼/)).not.toBeInTheDocument()
    // Gruppenheader: erste Gruppe ist HOME → Btm, zweite ist AWAY → Top
    expect(screen.getByText('↓ Btm')).toBeInTheDocument()
    expect(screen.getByText('↑ Top')).toBeInTheDocument()
    expect(screen.queryByText('▲')).not.toBeInTheDocument()
    expect(screen.queryByText('▼')).not.toBeInTheDocument()
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

  it('zeigt ein torloses Extra-Inning trotzdem als Linescore-Spalte', () => {
    // Regression: die Spalten kamen nur aus den inningRuns-Keys. Ein 8. Inning ohne Run
    // erzeugt keinen Key — die Linescore endete bei 7, während der Feed schon
    // "8. Inning" zeigte und das Sprungziel fehlte.
    render(<BogenLiveFeed {...base} currentInning={8} />)
    expect(screen.getByTestId('linescore-cell-8-AWAY')).toBeInTheDocument()
    expect(screen.getByTestId('linescore-cell-8-HOME')).toBeInTheDocument()
    expect(screen.queryByTestId('linescore-cell-9-AWAY')).not.toBeInTheDocument()
  })

  it('behält die 7 Regel-Innings, auch wenn früher abgebrochen wird', () => {
    render(<BogenLiveFeed {...base} currentInning={3} />)
    expect(screen.getByTestId('linescore-cell-7-HOME')).toBeInTheDocument()
    expect(screen.queryByTestId('linescore-cell-8-HOME')).not.toBeInTheDocument()
  })

  describe('Halbinnings ein-/ausklappen', () => {
    it('öffnet standardmäßig nur das neueste Halbinning, ältere sind eingeklappt', () => {
      render(<BogenLiveFeed {...base} />)
      expect(screen.getByTestId('toggle-half-2-HOME')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('toggle-half-1-AWAY')).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByText('Krosaki')).toBeInTheDocument()
      expect(screen.queryByText('Grounder 6-3')).not.toBeInTheDocument()
    })

    it('klappt ein Halbinning per Klick auf den ganzen Header auf und wieder zu', async () => {
      render(<BogenLiveFeed {...base} />)
      const toggle = screen.getByTestId('toggle-half-1-AWAY')

      await userEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('Grounder 6-3')).toBeInTheDocument()

      await userEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('Grounder 6-3')).not.toBeInTheDocument()
    })

    it('zeigt bei eingeklapptem Halbinning trotzdem den Divider und die erzielten Runs', () => {
      render(<BogenLiveFeed {...base} />)
      // 1. Inning AWAY ist per Default eingeklappt, hat laut inningRuns 1 Run erzielt
      expect(screen.queryByText('Grounder 6-3')).not.toBeInTheDocument()
      expect(screen.getByTestId('divider-half-1-AWAY')).toBeInTheDocument()
      expect(screen.getByTestId('runs-half-1-AWAY')).toHaveTextContent('1 Run')
    })

    it('zeigt keine Run-Zahl, wenn im eingeklappten Halbinning nichts erzielt wurde', () => {
      const scorelessFeed: HalfInning[] = [
        { inning: 2, side: 'HOME', scoreAfter: { home: 0, away: 0 }, events: [] },
        { inning: 1, side: 'AWAY', scoreAfter: { home: 0, away: 0 }, events: [] },
      ]
      render(
        <BogenLiveFeed
          {...base}
          feed={scorelessFeed}
          inningRuns={{ 1: { home: 0, away: 0 }, 2: { home: 0, away: 0 } }}
        />
      )
      expect(screen.queryByTestId('runs-half-1-AWAY')).not.toBeInTheDocument()
    })

    it('klappt beim Sprung über die Linescore ein eingeklapptes Ziel auf', async () => {
      const scrollIntoView = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})

      render(<BogenLiveFeed {...base} />)
      expect(screen.getByTestId('toggle-half-1-AWAY')).toHaveAttribute('aria-expanded', 'false')

      await userEvent.click(screen.getByTestId('linescore-cell-1-AWAY'))

      expect(screen.getByTestId('toggle-half-1-AWAY')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('Grounder 6-3')).toBeInTheDocument()
      expect(scrollIntoView).toHaveBeenCalled()
    })
  })
})
