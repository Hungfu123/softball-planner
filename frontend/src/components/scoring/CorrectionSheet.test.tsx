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

describe('CorrectionSheet — Tap-Cycle Runner UX', () => {
  it('Cycle 1B-Runner: bleibt 1B → 2B → 3B → Home → bleibt', () => {
    const onSave = vi.fn()
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Anton', 1)]}
        onSave={onSave}
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

  it('Cycle 3B-Runner: bleibt 3B → Home → bleibt (kein 1B/2B)', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Carla', 3)]}
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
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Aus?' }))
    // Aus-Pill aktiv → Label wechselt zu "✕ Aus"
    expect(screen.getByRole('button', { name: '✕ Aus' })).toBeInTheDocument()
    // Cycle-Button noch da (zeigt original-bleibt) aber disabled
    const cycle = screen.getByRole('button', { name: /bleibt 1B/ }) as HTMLButtonElement
    expect(cycle.disabled).toBe(true)
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

describe('CorrectionSheet — Quick-Action Tag-up Home', () => {
  it('Tag-up-Button sichtbar nur wenn 3B-Runner + post-out', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Carla', 3)]}
        context="post-out"
        onSave={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /3B → Home/ })).toBeInTheDocument()
  })

  it('Tag-up-Button NICHT sichtbar ohne 3B-Runner', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Anton', 1)]}
        context="post-out"
        onSave={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /3B → Home/ })).not.toBeInTheDocument()
  })

  it('Tap auf Tag-up setzt nur 3B-Runner auf Home', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Anton', 1), runner(3, 'Carla', 3)]}
        context="post-out"
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /3B → Home/ }))
    // Anton bleibt auf 1B
    expect(screen.getByRole('button', { name: /bleibt 1B/ })).toBeInTheDocument()
    // Carla scort → Cycle-Label "→ Home (Run!)"
    expect(screen.getByRole('button', { name: /→ Home \(Run!\)/ })).toBeInTheDocument()
  })

  it('Quick-Action "Alle +1 Base" rückt alle Runner einen weiter', () => {
    render(
      <CorrectionSheet
        open
        onClose={() => {}}
        runners={[runner(1, 'Anton', 1), runner(2, 'Berta', 2)]}
        context="post-out"
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Alle \+1 Base/ }))
    expect(screen.getByRole('button', { name: /→ 2B/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /→ 3B/ })).toBeInTheDocument()
  })
})
