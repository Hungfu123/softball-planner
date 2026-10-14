import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FormChart } from './FormChart'
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

describe('FormChart', () => {
  it('sagt, dass noch nichts gescort ist', () => {
    render(<FormChart points={[]} />)
    expect(screen.getByText(/Noch nichts gescort/)).toBeInTheDocument()
  })

  it('zeigt standardmäßig den letzten Wert der Kurve', () => {
    render(<FormChart points={[
      point({ gameId: 1, rollingAverage: 0.25 }),
      point({ gameId: 2, rollingAverage: 0.412, rollingPlateAppearances: 20, provisional: false }),
    ]} />)

    // Quoten ohne führende Null, wie auf dem Spielbogen.
    expect(screen.getByText('.412')).toBeInTheDocument()
    expect(screen.getByText(/AVG über die letzten 20 Schlagversuche/)).toBeInTheDocument()
  })

  it('zeigt beim Antippen eines Punktes dessen Spiel', () => {
    const { container } = render(<FormChart points={[
      point({ gameId: 1, hits: 2, atBats: 3, opponent: 'Münster' }),
      point({ gameId: 2 }),
    ]} />)

    const hitAreas = container.querySelectorAll('rect')
    fireEvent.pointerEnter(hitAreas[0])

    expect(screen.getByText(/vs Münster · 2 von 3/)).toBeInTheDocument()
  })

  it('beschriftet die Kurve für Screenreader', () => {
    render(<FormChart points={[point(), point({ gameId: 2, rollingAverage: 0.5 })]} />)
    expect(screen.getByRole('img', { name: /Schlagdurchschnitt über 2 Spiele, zuletzt .500/ })).toBeInTheDocument()
  })

  it('schaltet die Kurve auf eine andere Kennzahl um', () => {
    render(<FormChart points={[
      point({ gameId: 1 }),
      point({ gameId: 2, rollingAverage: 0.3, rollingOps: 0.845, rollingPlateAppearances: 20, provisional: false }),
    ]} />)

    fireEvent.click(screen.getByRole('button', { name: 'OPS' }))

    expect(screen.getByText('.845')).toBeInTheDocument()
    expect(screen.getByText(/OPS über die letzten 20 Schlagversuche/)).toBeInTheDocument()
  })
})
