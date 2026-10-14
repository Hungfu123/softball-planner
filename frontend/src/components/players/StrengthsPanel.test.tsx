import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { StrengthsPanel } from './StrengthsPanel'
import type { PlayerBattingStatsResponse } from '@/types'

function stats(overrides: Partial<PlayerBattingStatsResponse> & { playerId: number }): PlayerBattingStatsResponse {
  return {
    playerName: 'Spieler',
    plateAppearances: 100,
    atBats: 90,
    hits: 27,
    singles: 20,
    doubles: 5,
    triples: 1,
    homeRuns: 1,
    runs: 10,
    walks: 10,
    hitByPitch: 0,
    strikeouts: 20,
    outs: 40,
    reachedOnError: 3,
    stolenBases: 10,
    caughtStealing: 2,
    pickoffs: 0,
    runsBattedIn: 12,
    totalBases: 37,
    battingAverage: 0.3,
    onBasePct: 0.37,
    sluggingPct: 0.411,
    ops: 0.781,
    qualified: true,
    ...overrides,
  }
}

/** Die Zeile einer Kennzahl samt ihrer Zahlen. */
function row(label: string) {
  return screen.getByText(label).closest('li') as HTMLElement
}

describe('StrengthsPanel', () => {
  it('stellt jede Kennzahl gegen den Schnitt des übrigen Kaders', () => {
    render(<StrengthsPanel playerId={1} allTime={[
      stats({ playerId: 1, battingAverage: 0.4 }),
      stats({ playerId: 2, battingAverage: 0.2 }),
      stats({ playerId: 3, battingAverage: 0.2 }),
    ]} />)

    // Eigener Wert .400, Teamschnitt .200 → ein Plus von .200 nach oben.
    expect(within(row('AVG')).getByText('.400')).toBeInTheDocument()
    expect(within(row('AVG')).getByText('↑ .200')).toBeInTheDocument()
  })

  it('wertet weniger Strikeouts als Stärke', () => {
    render(<StrengthsPanel playerId={1} allTime={[
      stats({ playerId: 1, strikeouts: 10 }),
      stats({ playerId: 2, strikeouts: 30 }),
    ]} />)

    const delta = within(row('Strikeout-Quote')).getByText('↓ 20 %')
    expect(delta.className).toContain('emerald')
  })

  it('wertet mehr Strikeouts als Schwäche', () => {
    render(<StrengthsPanel playerId={1} allTime={[
      stats({ playerId: 1, strikeouts: 40 }),
      stats({ playerId: 2, strikeouts: 20 }),
    ]} />)

    const delta = within(row('Strikeout-Quote')).getByText('↑ 20 %')
    expect(delta.className).toContain('softball-red')
  })

  it('misst Steals je Auftritt, nicht in Rohzahlen', () => {
    // Gleiche Quote, doppelt so viele Auftritte — kein Unterschied zum Team.
    render(<StrengthsPanel playerId={1} allTime={[
      stats({ playerId: 1, plateAppearances: 50, stolenBases: 5 }),
      stats({ playerId: 2, plateAppearances: 100, stolenBases: 10 }),
    ]} />)

    expect(within(row('Steal-Quote')).getByText('wie das Team')).toBeInTheDocument()
  })

  it('lässt unqualifizierte Mini-Stichproben aus dem Schnitt', () => {
    render(<StrengthsPanel playerId={1} allTime={[
      stats({ playerId: 1, battingAverage: 0.3 }),
      stats({ playerId: 2, battingAverage: 0.3 }),
      stats({ playerId: 3, battingAverage: 1.0, qualified: false, plateAppearances: 2, atBats: 2 }),
    ]} />)

    expect(within(row('AVG')).getByText('wie das Team')).toBeInTheDocument()
  })

  it('sagt es, wenn der Vergleich keine Grundlage hat', () => {
    render(<StrengthsPanel playerId={1} allTime={[stats({ playerId: 1, plateAppearances: 0 })]} />)
    expect(screen.getByText(/fehlen gescorte Spiele/)).toBeInTheDocument()
  })
})
