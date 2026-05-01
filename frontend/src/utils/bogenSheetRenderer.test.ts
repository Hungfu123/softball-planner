import { describe, it, expect } from 'vitest'
import { cellKey, renderCells, type CellMap } from './bogenSheetRenderer'
import type { SpielbogenAtBatResponse } from '@/types'

describe('cellKey', () => {
  it('joins side, slot, inning with pipes', () => {
    expect(cellKey('HOME', 7, 3)).toBe('HOME|7|3')
  })
})

function ab(o: Partial<SpielbogenAtBatResponse>): SpielbogenAtBatResponse {
  return {
    id: 1, bogenId: 1, slotId: 1, side: 'HOME', sequence: 1, inning: 1,
    result: 'SINGLE', outType: null, fielderChain: null, isError: null,
    errorPosition: null, runsScored: 0, rbi: 0, baseStateAfter: null, createdAt: '',
    ...o,
  }
}

describe("renderCells — Fielder's Choice", () => {
  it("labels FC + chain, batter on 1B counts as reach=1", () => {
    const fc = ab({
      slotId: 5, result: 'OUT', outType: 'FIELDERS_CHOICE',
      fielderChain: [6, 4],
      baseStateAfter: { firstSlotId: 5, secondSlotId: null, thirdSlotId: null },
    })
    const cells: CellMap = renderCells([fc], [])
    const cell = cells.get('HOME|5|1')!
    expect(cell.primaryLabel).toBe('FC 6-4')
    expect(cell.reachedBase).toBe(1)
    expect(cell.outIndex).toBe('I')
  })
})

describe('renderCells — Wild Pitch / Passed Ball', () => {
  it("attaches WP arrow to the runner's cell with correct toBase", () => {
    const walk = ab({ slotId: 7, result: 'WALK', baseStateAfter: { firstSlotId: 7, secondSlotId: null, thirdSlotId: null } })
    const wp = { id: 1, bogenId: 1, slotId: 7, side: 'HOME' as const, inning: 1, type: 'WILD_PITCH' as const, fromBase: 1, toBase: 2, createdAt: '' }
    const cells = renderCells([walk], [wp])
    const cell = cells.get('HOME|7|1')!
    expect(cell.stealingArrow?.type).toBe('WILD_PITCH')
    expect(cell.reachedBase).toBe(2)
  })

  it('PB advancing to home marks runScored', () => {
    const walk = ab({ slotId: 7, result: 'WALK', baseStateAfter: { firstSlotId: null, secondSlotId: null, thirdSlotId: 7 } })
    const pb = { id: 1, bogenId: 1, slotId: 7, side: 'HOME' as const, inning: 1, type: 'PASSED_BALL' as const, fromBase: 3, toBase: 4, createdAt: '' }
    const cells = renderCells([walk], [pb])
    const cell = cells.get('HOME|7|1')!
    expect(cell.runScored).toBe(true)
    expect(cell.reachedBase).toBe(4)
  })
})
