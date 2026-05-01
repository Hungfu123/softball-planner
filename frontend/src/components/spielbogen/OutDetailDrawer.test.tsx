import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OutDetailDrawer } from './OutDetailDrawer'
import type { SpielbogenSlotResponse } from '@/types'

const slots: SpielbogenSlotResponse[] = [
  { id: 1, side: 'HOME', slot: 1, name: 'Runner-1B', position: null, battingOrder: 1 },
  { id: 2, side: 'HOME', slot: 2, name: 'Runner-2B', position: null, battingOrder: 2 },
]

describe('OutDetailDrawer — Auto-Picker bei Grounder mit Runnern', () => {
  it('öffnet Runner-Advance-Picker automatisch beim Throw zu 1B mit Runnern', async () => {
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
    fireEvent.click(screen.getByLabelText('Feldposition 5 3B'))
    fireEvent.click(screen.getByText(/Wirft zu 1B/i))
    // Picker is now visible — runner names appear
    expect(screen.getByText(/Runner-1B/)).toBeInTheDocument()
    expect(screen.getByText(/Runner-2B/)).toBeInTheDocument()
  })

  it('submits Grounder mit Runner-Advance via Picker-Bestätigen', async () => {
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
    fireEvent.click(screen.getByLabelText('Feldposition 5 3B'))
    fireEvent.click(screen.getByText(/Wirft zu 1B/i))
    fireEvent.click(screen.getByText(/Bestätigen/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'OUT', outType: 'GROUNDER' })
    )
  })
})

describe('OutDetailDrawer Smart-Defaults', () => {
  it('Grounder + Runner1B → Picker öffnet sich automatisch mit default 1B → 2B', async () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={{ firstSlotId: 1, secondSlotId: null, thirdSlotId: null }}
        slots={slots}
        batterSlotId={42}
        outs={0}
      />
    )
    fireEvent.click(screen.getByLabelText('Feldposition 6 SS'))
    fireEvent.click(screen.getByText(/Wirft zu 1B/i))
    // Picker opens; default for Runner1B with throw-to-1B is "→ 2B"
    const matches = await screen.findAllByText(/→ 2B/i)
    expect(matches.length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText(/Bestätigen/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        outType: 'GROUNDER',
        baseStateAfter: expect.objectContaining({
          firstSlotId: null,
          secondSlotId: 1,
        }),
      })
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
