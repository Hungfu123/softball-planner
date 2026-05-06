import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CorrectionSheet } from './CorrectionSheet'
import type { RunnerOnBase } from '@/types'

const runner = (id: number, name: string, base: 1 | 2 | 3): RunnerOnBase => ({
  playerId: id,
  playerName: name,
  base,
  battingOrder: id,
})

describe('CorrectionSheet — Tap-Cycle Runner UX (manual context)', () => {
  it('Cycle 1B-Runner: bleibt 1B → 2B → 3B → Home → bleibt', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Anton', 1)]}
        context="manual"
        onSave={vi.fn()}
      />
    )
    const cycle = screen.getByRole('button', { name: /bleibt 1B/ })
    fireEvent.click(cycle)
    expect(screen.getByRole('button', { name: /→ 2B/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /→ 2B/ }))
    expect(screen.getByRole('button', { name: /→ 3B/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /→ 3B/ }))
    expect(screen.getByRole('button', { name: /→ Home \(Run!\)/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /→ Home \(Run!\)/ }))
    expect(screen.getByRole('button', { name: /bleibt 1B/ })).toBeInTheDocument()
  })

  it('Cycle 3B-Runner: bleibt 3B → Home → bleibt', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Carla', 3)]}
        context="manual"
        onSave={vi.fn()}
      />
    )
    const cycle = screen.getByRole('button', { name: /bleibt 3B/ })
    fireEvent.click(cycle)
    expect(screen.getByRole('button', { name: /→ Home \(Run!\)/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /→ Home \(Run!\)/ }))
    expect(screen.getByRole('button', { name: /bleibt 3B/ })).toBeInTheDocument()
  })

  it('Aus-Pill toggelt Out-Status separat vom Cycle', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Anton', 1)]}
        context="manual"
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Aus?' }))
    expect(screen.getByRole('button', { name: '✕ Aus' })).toBeInTheDocument()
    const cycle = screen.getByRole('button', { name: /bleibt 1B/ }) as HTMLButtonElement
    expect(cycle.disabled).toBe(true)
  })
})

describe('CorrectionSheet — Auto-Default +1 Base bei post-out', () => {
  it('1B-Runner: Default = "→ 2B"', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Anton', 1)]}
        context="post-out"
        onSave={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /→ 2B/ })).toBeInTheDocument()
  })

  it('2B-Runner: Default = "→ 3B"', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Berta', 2)]}
        context="post-out"
        onSave={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /→ 3B/ })).toBeInTheDocument()
  })

  it('3B-Runner: Default = "→ Home"', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Carla', 3)]}
        context="post-out"
        onSave={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /→ Home \(Run!\)/ })).toBeInTheDocument()
  })

  it('Hint-Text "Tipp auf Pille = nächste Base" sichtbar wenn Runner', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Anton', 1)]}
        context="post-out"
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText(/Tipp auf Pille = nächste Base/)).toBeInTheDocument()
  })
})

describe('CorrectionSheet — 3rd-Out Force-Play Warnung', () => {
  it('Banner sichtbar wenn outsAfter === 3', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Anton', 3)]}
        outsAfter={3}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText(/3\. Out im Inning/)).toBeInTheDocument()
    expect(screen.getByText(/zählt der Run NICHT/)).toBeInTheDocument()
  })

  it('Banner NICHT sichtbar wenn outsAfter < 3', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Anton', 3)]}
        outsAfter={2}
        onSave={vi.fn()}
      />
    )
    expect(screen.queryByText(/3\. Out im Inning/)).not.toBeInTheDocument()
  })
})
