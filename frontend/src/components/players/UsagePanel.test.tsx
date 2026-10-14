import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UsagePanel } from './UsagePanel'
import type { PlayerUsage } from '@/types'

function usage(overrides: Partial<PlayerUsage> = {}): PlayerUsage {
  return {
    gameDaysTotal: 10,
    gameDaysAvailable: 8,
    gameDaysPlayed: 6,
    trainingsTotal: 20,
    trainingsAttended: 15,
    averageBattingOrder: 4.2,
    battingOrderCounts: { '3': 2, '4': 5, '5': 1 },
    ...overrides,
  }
}

describe('UsagePanel', () => {
  it('stellt Zusagen und Aufstellungen gegenüber', () => {
    render(<UsagePanel usage={usage()} />)

    expect(screen.getByText('8 von 10 Spieltagen')).toBeInTheDocument()
    expect(screen.getByText('6 von 10 Spieltagen')).toBeInTheDocument()
    expect(screen.getByText('80 %')).toBeInTheDocument()
  })

  it('zeigt die Training-Anwesenheit', () => {
    render(<UsagePanel usage={usage()} />)
    expect(screen.getByText('15 von 20 Trainings')).toBeInTheDocument()
  })

  it('zeigt Schnitt und Verteilung der Schlagplätze', () => {
    render(<UsagePanel usage={usage()} />)

    expect(screen.getByText('Ø 4,2')).toBeInTheDocument()
    expect(screen.getByTitle('5× auf Platz 4')).toBeInTheDocument()
  })

  it('zeigt auch die Plätze, auf denen nie geschlagen wurde', () => {
    render(<UsagePanel usage={usage({ battingOrderCounts: { '4': 5 } })} />)
    expect(screen.getByTitle('nie auf Platz 1')).toBeInTheDocument()
    expect(screen.getByTitle('5× auf Platz 4')).toBeInTheDocument()
  })

  it('lässt den Schlagplatz weg, wenn nie aufgestellt', () => {
    render(<UsagePanel usage={usage({ averageBattingOrder: null, battingOrderCounts: {} })} />)
    expect(screen.queryByText(/Schlagplatz/)).not.toBeInTheDocument()
  })

  it('sagt im Saison-Zuschnitt, warum das Training fehlt', () => {
    render(<UsagePanel usage={usage({ trainingsTotal: 0, trainingsAttended: 0 })} trainingsOutOfScope />)
    expect(screen.getByText(/Trainings gehören zu keiner Saison/)).toBeInTheDocument()
  })

  it('sagt es, wenn gar nichts erfasst ist', () => {
    render(<UsagePanel usage={usage({
      gameDaysTotal: 0, gameDaysAvailable: 0, gameDaysPlayed: 0,
      trainingsTotal: 0, trainingsAttended: 0,
      averageBattingOrder: null, battingOrderCounts: {},
    })} />)

    expect(screen.getByText(/Noch keine Spieltage/)).toBeInTheDocument()
  })

  it('blendet die Training-Zeile ohne Trainings aus', () => {
    render(<UsagePanel usage={usage({ trainingsTotal: 0, trainingsAttended: 0 })} />)
    expect(screen.queryByText('Training')).not.toBeInTheDocument()
  })
})
