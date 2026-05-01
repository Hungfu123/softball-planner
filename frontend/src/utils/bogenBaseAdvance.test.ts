import { describe, it, expect } from 'vitest'
import { computeBaseStateAdvance, computeForceDefaults } from './bogenBaseAdvance'

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

describe('computeForceDefaults', () => {
  it('Runner1B + Throw zu 1B (Force weg): default 1B → 2B', () => {
    const r = computeForceDefaults(
      { firstSlotId: 7, secondSlotId: null, thirdSlotId: null },
      1,
    )
    expect(r).toEqual({ 1: 2, 2: 2, 3: 3 })
  })

  it('Runner2B + Throw zu 1B: 2B bleibt', () => {
    const r = computeForceDefaults(
      { firstSlotId: null, secondSlotId: 8, thirdSlotId: null },
      1,
    )
    expect(r).toEqual({ 1: 1, 2: 2, 3: 3 })
  })

  it('Runner3B + Throw zu 1B: 3B bleibt', () => {
    const r = computeForceDefaults(
      { firstSlotId: null, secondSlotId: null, thirdSlotId: 9 },
      1,
    )
    expect(r).toEqual({ 1: 1, 2: 2, 3: 3 })
  })

  it('Runner1B+2B + Throw zu 1B: 1B → 2B (force weg, kann advancen)', () => {
    const r = computeForceDefaults(
      { firstSlotId: 7, secondSlotId: 8, thirdSlotId: null },
      1,
    )
    expect(r).toEqual({ 1: 2, 2: 2, 3: 3 })
  })

  it('Bases loaded + Throw zu 1B: Runner1B → 2B', () => {
    const r = computeForceDefaults(
      { firstSlotId: 7, secondSlotId: 8, thirdSlotId: 9 },
      1,
    )
    expect(r).toEqual({ 1: 2, 2: 2, 3: 3 })
  })

  it('Throw zu 2B (Force greift): 1B → 2B (forced)', () => {
    const r = computeForceDefaults(
      { firstSlotId: 7, secondSlotId: null, thirdSlotId: null },
      2,
    )
    expect(r).toEqual({ 1: 2, 2: 2, 3: 3 })
  })
})
