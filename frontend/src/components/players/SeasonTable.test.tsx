import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SeasonTable } from './SeasonTable'
import type { PlayerFormPoint } from '@/types'

function point(overrides: Partial<PlayerFormPoint> = {}): PlayerFormPoint {
  return {
    gameId: 1,
    date: '2026-04-11',
    opponent: 'Köln',
    seasonId: 5,
    seasonName: 'Ruhr Fun Liga',
    year: 2026,
    plateAppearances: 4,
    atBats: 4,
    hits: 1,
    walks: 0,
    strikeouts: 1,
    runsBattedIn: 0,
    totalBases: 1,
    timesOnBase: 1,
    stolenBases: 1,
    caughtStealing: 0,
    rollingAverage: 0.25,
    rollingOnBase: 0.25,
    rollingSlugging: 0.25,
    rollingOps: 0.5,
    rollingPlateAppearances: 4,
    provisional: true,
    ...overrides,
  }
}

function row(year: string) {
  return screen.getByText(year).closest('tr') as HTMLElement
}

describe('SeasonTable', () => {
  it('sagt, dass noch nichts gescort ist', () => {
    render(<SeasonTable points={[]} />)
    expect(screen.getByText(/Noch keine gescorten Spiele/)).toBeInTheDocument()
  })

  it('fasst die Spiele eines Jahres zusammen', () => {
    render(<SeasonTable points={[
      point({ gameId: 1, atBats: 4, hits: 2, timesOnBase: 2, plateAppearances: 4 }),
      point({ gameId: 2, atBats: 4, hits: 0, timesOnBase: 1, plateAppearances: 5 }),
    ]} />)

    const cells = row('2026').querySelectorAll('td')
    expect(cells[1].textContent).toBe('2')         // Spiele
    expect(cells[2].textContent).toBe('9')         // Plate Appearances
    expect(cells[3].textContent).toBe('.250')      // 2 Hits aus 8 ABs
  })

  it('sortiert Jahre absteigend', () => {
    const { container } = render(<SeasonTable points={[
      point({ gameId: 1, year: 2024 }),
      point({ gameId: 2, year: 2026 }),
    ]} />)

    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0].textContent).toContain('2026')
    expect(rows[1].textContent).toContain('2024')
  })

  it('rechnet OPS aus OBP und SLG des Jahres', () => {
    render(<SeasonTable points={[
      point({ atBats: 4, hits: 2, totalBases: 4, timesOnBase: 2, plateAppearances: 4 }),
    ]} />)

    // OBP .500 + SLG 1.000
    expect(within(row('2026')).getByText('1.500')).toBeInTheDocument()
  })

  it('ignoriert Spiele ohne Jahr', () => {
    const { container } = render(<SeasonTable points={[point({ year: null })]} />)
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0)
  })
})
