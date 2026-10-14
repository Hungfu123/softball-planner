import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameLog } from './GameLog'
import type { PlayerFormPoint } from '@/types'

function point(overrides: Partial<PlayerFormPoint> = {}): PlayerFormPoint {
  return {
    gameId: 1,
    date: '2026-04-11',
    opponent: 'Köln Blue Abbots',
    seasonId: 5,
    seasonName: 'Ruhr Fun Liga',
    year: 2026,
    plateAppearances: 3,
    atBats: 3,
    hits: 2,
    walks: 0,
    strikeouts: 1,
    runsBattedIn: 1,
    totalBases: 3,
    timesOnBase: 2,
    stolenBases: 0,
    caughtStealing: 0,
    rollingAverage: 0.333,
    rollingOnBase: 0.4,
    rollingSlugging: 0.5,
    rollingOps: 0.9,
    rollingPlateAppearances: 12,
    provisional: true,
    ...overrides,
  }
}

describe('GameLog', () => {
  it('sagt, dass noch nichts gescort ist', () => {
    render(<GameLog points={[]} />)
    expect(screen.getByText(/Noch keine gescorten Spiele/)).toBeInTheDocument()
  })

  it('zeigt das jüngste Spiel oben', () => {
    const { container } = render(<GameLog points={[
      point({ gameId: 1, date: '2026-04-11', opponent: 'Köln' }),
      point({ gameId: 2, date: '2026-06-20', opponent: 'Münster' }),
    ]} />)

    const rows = container.querySelectorAll('li')
    expect(rows[0].textContent).toContain('Münster')
    expect(rows[0].textContent).toContain('20.06.')
  })

  it('schreibt die Trefferquote des Abends aus', () => {
    render(<GameLog points={[point({ hits: 2, atBats: 3 })]} />)
    expect(screen.getByText('2 von 3')).toBeInTheDocument()
  })

  it('nennt RBI, Walks, Strikeouts und Steals daneben', () => {
    render(<GameLog points={[point({ runsBattedIn: 2, walks: 1, strikeouts: 1, stolenBases: 3 })]} />)
    expect(screen.getByText('2 RBI · 1 BB · 1 K · 3 SB')).toBeInTheDocument()
  })

  it('lässt leere Zusätze weg', () => {
    render(<GameLog points={[point({ runsBattedIn: 0, walks: 0, strikeouts: 0, stolenBases: 0 })]} />)
    expect(screen.queryByText(/RBI/)).not.toBeInTheDocument()
  })

  it('zeigt höchstens acht Spiele und sagt wie viele es sind', () => {
    const points = Array.from({ length: 12 }, (_, i) => point({ gameId: i + 1 }))
    const { container } = render(<GameLog points={points} />)

    expect(container.querySelectorAll('li')).toHaveLength(8)
    expect(screen.getByText(/8 jüngsten von 12 Spielen/)).toBeInTheDocument()
  })
})
