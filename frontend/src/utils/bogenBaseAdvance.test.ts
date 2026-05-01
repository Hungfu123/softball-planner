import { describe, it, expect } from 'vitest'
import { computeBaseStateAdvance } from './bogenBaseAdvance'

describe('computeBaseStateAdvance — isError (ROE)', () => {
  it('Error mit leeren Bases: Batter zu 1B', () => {
    const r = computeBaseStateAdvance({
      before: { firstSlotId: null, secondSlotId: null, thirdSlotId: null },
      result: 'OUT',
      isError: true,
      batterSlotId: 42,
    })
    expect(r.baseStateAfter).toEqual({ firstSlotId: 42, secondSlotId: null, thirdSlotId: null })
    expect(r.runsScored).toBe(0)
  })

  it('Error mit Runner1B: Runner zu 2B, Batter zu 1B (wie Single)', () => {
    const r = computeBaseStateAdvance({
      before: { firstSlotId: 7, secondSlotId: null, thirdSlotId: null },
      result: 'OUT',
      isError: true,
      batterSlotId: 42,
    })
    expect(r.baseStateAfter).toEqual({ firstSlotId: 42, secondSlotId: 7, thirdSlotId: null })
    expect(r.runsScored).toBe(0)
  })

  it('Error mit Runner3B: Runner scored, Batter zu 1B', () => {
    const r = computeBaseStateAdvance({
      before: { firstSlotId: null, secondSlotId: null, thirdSlotId: 9 },
      result: 'OUT',
      isError: true,
      batterSlotId: 42,
    })
    expect(r.baseStateAfter).toEqual({ firstSlotId: 42, secondSlotId: null, thirdSlotId: null })
    expect(r.runsScored).toBe(1)
  })

  it('OUT ohne isError bleibt unverändert (Runner stays put)', () => {
    const r = computeBaseStateAdvance({
      before: { firstSlotId: 7, secondSlotId: null, thirdSlotId: null },
      result: 'OUT',
      isError: false,
      batterSlotId: 42,
    })
    expect(r.baseStateAfter).toEqual({ firstSlotId: 7, secondSlotId: null, thirdSlotId: null })
    expect(r.runsScored).toBe(0)
  })
})
