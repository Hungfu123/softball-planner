import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OutDetailDrawer } from './OutDetailDrawer'
import type { SpielbogenSlotResponse } from '@/types'

const slots: SpielbogenSlotResponse[] = [
  { id: 1, side: 'HOME', slot: 1, name: 'Runner-1B', position: null, battingOrder: 1 },
  { id: 2, side: 'HOME', slot: 2, name: 'Runner-2B', position: null, battingOrder: 2 },
]

describe('OutDetailDrawer — Multi-Base-Advance bei Grounder', () => {
  it('zeigt Runner-Advance-editieren Option bei Grounder-Out wenn Runner auf Base', async () => {
    const onSubmit = vi.fn()
    render(<OutDetailDrawer
      open={true}
      onClose={() => {}}
      onSubmit={onSubmit}
      baseStateAfter={{ firstSlotId: 1, secondSlotId: 2, thirdSlotId: null }}
      slots={slots}
      batterSlotId={99}
      outs={0}
    />)
    // Tap auf Position 5 (3B) for Grounder
    const fielderBtn = screen.getByRole('button', { name: /5/i })
    fireEvent.click(fielderBtn)
    // Edit-Runner-Advance Button visible
    expect(screen.getByText(/Runner-Advance editieren/i)).toBeInTheDocument()
  })

  it('öffnet Runner-Advance-Picker nach Klick auf editieren', async () => {
    const onSubmit = vi.fn()
    render(<OutDetailDrawer
      open={true}
      onClose={() => {}}
      onSubmit={onSubmit}
      baseStateAfter={{ firstSlotId: 1, secondSlotId: 2, thirdSlotId: null }}
      slots={slots}
      batterSlotId={99}
      outs={0}
    />)
    // Tap auf Position 5 (3B) for Grounder
    const fielderBtn = screen.getByRole('button', { name: /5/i })
    fireEvent.click(fielderBtn)
    // Click the edit advance button
    const editBtn = screen.getByText(/Runner-Advance editieren/i)
    fireEvent.click(editBtn)
    // Should show the RunnerAdvancePickerView with runner names
    expect(screen.getByText(/Runner-1B/)).toBeInTheDocument()
    expect(screen.getByText(/Runner-2B/)).toBeInTheDocument()
  })

  it('submits mit angepassten Advances nach Bestätigen', async () => {
    const onSubmit = vi.fn()
    render(<OutDetailDrawer
      open={true}
      onClose={() => {}}
      onSubmit={onSubmit}
      baseStateAfter={{ firstSlotId: 1, secondSlotId: null, thirdSlotId: null }}
      slots={slots}
      batterSlotId={99}
      outs={0}
    />)
    // Select fielder 5
    const fielderBtn = screen.getByRole('button', { name: /5/i })
    fireEvent.click(fielderBtn)
    // Click edit advance
    fireEvent.click(screen.getByText(/Runner-Advance editieren/i))
    // Confirm with default (runner stays)
    const confirmBtn = screen.getByText(/Bestätigen/i)
    fireEvent.click(confirmBtn)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'OUT', outType: 'GROUNDER' })
    )
  })
})

describe('OutDetailDrawer Error/ROE', () => {
  it('Error E5 submit: result=OUT + isError=true + errorPosition=5, ohne baseStateAfter', () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={{ firstSlotId: null, secondSlotId: null, thirdSlotId: null }}
        slots={slots}
        batterSlotId={1}
        outs={0}
      />
    )
    fireEvent.click(screen.getByLabelText('Feldposition 5 3B'))
    fireEvent.click(screen.getByText(/Sicher an 1B durch Fehler \(E5\)/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'OUT',
        isError: true,
        errorPosition: 5,
      })
    )
  })
})

describe('OutDetailDrawer FlyOut + 2 Outs', () => {
  const flyOutSlots: SpielbogenSlotResponse[] = [
    { id: 1, side: 'HOME', slot: 1, name: 'A', position: null, battingOrder: 1 },
  ]

  it('mit 2 outs + Runner3B-Tag-Up: kein Run, weil Catch das Inning beendet', async () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={{ firstSlotId: null, secondSlotId: null, thirdSlotId: 1 }}
        slots={flyOutSlots}
        batterSlotId={1}
        outs={2}
      />
    )
    fireEvent.click(screen.getByLabelText('Feldposition 8 CF'))
    // Tag-up runner: cycle from "bleibt" → 4 (Home). 3B has cycle: 3 → 4 (one click).
    const runnerBtn = await screen.findByText(/auf 3B/i)
    fireEvent.click(runnerBtn) // cycles 3 → 4 (Home)
    fireEvent.click(screen.getByText(/Bestätigen/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'OUT',
        outType: 'FLY',
        runsScored: 0,
        rbi: 0,
      })
    )
  })

  it('mit 1 out + Runner3B-Tag-Up: Run zählt (Sac Fly möglich)', async () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={{ firstSlotId: null, secondSlotId: null, thirdSlotId: 1 }}
        slots={flyOutSlots}
        batterSlotId={1}
        outs={1}
      />
    )
    fireEvent.click(screen.getByLabelText('Feldposition 8 CF'))
    fireEvent.click(await screen.findByText(/auf 3B/i)) // 3 → 4 (Home)
    fireEvent.click(screen.getByText(/Bestätigen/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'OUT',
        outType: 'FLY',
        runsScored: 1,
        rbi: 1,
      })
    )
  })
})
