import { describe, it, expect } from 'vitest'
import { computeDefaultAdvances } from './runnerAdvanceDefaults'

describe('computeDefaultAdvances', () => {
  it('Single with empty bases produces no advances', () => {
    const advances = computeDefaultAdvances({
      abResult: 'SINGLE',
      baseStateBefore: { firstSlotId: null, secondSlotId: null, thirdSlotId: null },
      baseStateAfter: { firstSlotId: 100, secondSlotId: null, thirdSlotId: null },
    })
    expect(advances).toEqual([])
  })

  it('Single + runner on 2B advances to 3B yields HIT_PUSH 2->3', () => {
    const advances = computeDefaultAdvances({
      abResult: 'SINGLE',
      baseStateBefore: { firstSlotId: null, secondSlotId: 200, thirdSlotId: null },
      baseStateAfter: { firstSlotId: 100, secondSlotId: null, thirdSlotId: 200 },
    })
    expect(advances).toEqual([
      { slotId: 200, fromBase: 2, toBase: 3, reason: 'HIT_PUSH' },
    ])
  })

  it('WALK + runner on 1B yields BB_FORCE 1->2', () => {
    const advances = computeDefaultAdvances({
      abResult: 'WALK',
      baseStateBefore: { firstSlotId: 200, secondSlotId: null, thirdSlotId: null },
      baseStateAfter: { firstSlotId: 100, secondSlotId: 200, thirdSlotId: null },
    })
    expect(advances).toEqual([
      { slotId: 200, fromBase: 1, toBase: 2, reason: 'BB_FORCE' },
    ])
  })

  it('WALK bases-loaded yields 3 BB_FORCE advances and runner home', () => {
    const advances = computeDefaultAdvances({
      abResult: 'WALK',
      baseStateBefore: { firstSlotId: 200, secondSlotId: 201, thirdSlotId: 202 },
      baseStateAfter: { firstSlotId: 100, secondSlotId: 200, thirdSlotId: 201 },
    })
    expect(advances).toEqual(
      expect.arrayContaining([
        { slotId: 200, fromBase: 1, toBase: 2, reason: 'BB_FORCE' },
        { slotId: 201, fromBase: 2, toBase: 3, reason: 'BB_FORCE' },
        { slotId: 202, fromBase: 3, toBase: 4, reason: 'BB_FORCE' },
      ])
    )
    expect(advances).toHaveLength(3)
  })
})
