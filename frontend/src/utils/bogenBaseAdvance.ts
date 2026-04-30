import type { BogenBaseStateDto, AtBatResult, OutType } from '@/types'

interface AdvanceInput {
  before: BogenBaseStateDto | null
  result: AtBatResult
  outType?: OutType
  batterSlotId: number
}

interface AdvanceResult {
  baseStateAfter: BogenBaseStateDto
  runsScored: number
}

const empty = (): BogenBaseStateDto => ({ firstSlotId: null, secondSlotId: null, thirdSlotId: null })

export function computeBaseStateAdvance(input: AdvanceInput): AdvanceResult {
  const before = input.before ?? empty()
  const { firstSlotId: b1, secondSlotId: b2, thirdSlotId: b3 } = before
  const batter = input.batterSlotId

  switch (input.result) {
    case 'SINGLE': {
      // 3B → home; 2B → 3B; 1B → 2B; batter → 1B
      const runsScored = b3 != null ? 1 : 0
      return {
        baseStateAfter: {
          firstSlotId: batter,
          secondSlotId: b1,
          thirdSlotId: b2,
        },
        runsScored,
      }
    }
    case 'DOUBLE': {
      // 3B home, 2B home, 1B → 3B, batter → 2B
      const runsScored = (b3 != null ? 1 : 0) + (b2 != null ? 1 : 0)
      return {
        baseStateAfter: { firstSlotId: null, secondSlotId: batter, thirdSlotId: b1 },
        runsScored,
      }
    }
    case 'TRIPLE': {
      // all home, batter → 3B
      const runsScored = (b1 != null ? 1 : 0) + (b2 != null ? 1 : 0) + (b3 != null ? 1 : 0)
      return {
        baseStateAfter: { firstSlotId: null, secondSlotId: null, thirdSlotId: batter },
        runsScored,
      }
    }
    case 'HOMERUN': {
      // all + batter home
      const runsScored = 1 + (b1 != null ? 1 : 0) + (b2 != null ? 1 : 0) + (b3 != null ? 1 : 0)
      return {
        baseStateAfter: empty(),
        runsScored,
      }
    }
    case 'WALK':
    case 'HIT_BY_PITCH': {
      // Force-advance only consecutive runners
      let newB1 = batter
      let newB2 = b2
      let newB3 = b3
      let runsScored = 0
      if (b1 != null) {
        // 1B occupied — push runner forward
        if (b2 != null) {
          // 2B also occupied — push to 3B
          if (b3 != null) {
            // 3B also occupied — runner scores
            runsScored = 1
          }
          newB3 = b2
          newB2 = b1
        } else {
          // 2B empty — 1B runner goes to 2B, 3B unchanged
          newB3 = b3
          newB2 = b1
        }
        newB1 = batter
      } else {
        newB1 = batter
        newB2 = b2
        newB3 = b3
      }
      return { baseStateAfter: { firstSlotId: newB1, secondSlotId: newB2, thirdSlotId: newB3 }, runsScored }
    }
    case 'STRIKEOUT':
    case 'OUT': {
      // Standard DP: 1B runner forced at 2B (most common DP scenario)
      if (input.outType === 'DOUBLE_PLAY') {
        return {
          baseStateAfter: { ...before, firstSlotId: null },
          runsScored: 0,
        }
      }
      // Triple Play: clear all runners
      if (input.outType === 'TRIPLE_PLAY') {
        return {
          baseStateAfter: { firstSlotId: null, secondSlotId: null, thirdSlotId: null },
          runsScored: 0,
        }
      }
      return { baseStateAfter: before, runsScored: 0 }
    }
  }
}
