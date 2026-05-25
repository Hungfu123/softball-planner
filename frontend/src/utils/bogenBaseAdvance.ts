import type { BogenBaseStateDto, AtBatResult, OutType } from '@/types'

interface AdvanceInput {
  before: BogenBaseStateDto | null
  result: AtBatResult
  outType?: OutType
  isError?: boolean
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

  // ROE: result=OUT + isError=true → Batter erreicht 1B wie Single
  if (input.result === 'OUT' && input.isError === true) {
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
    case 'HOMERUN':
    case 'INSIDE_PARK_HR': {
      // all + batter home
      const runsScored = 1 + (b1 != null ? 1 : 0) + (b2 != null ? 1 : 0) + (b3 != null ? 1 : 0)
      return {
        baseStateAfter: empty(),
        runsScored,
      }
    }
    case 'WALK':
    case 'HIT_BY_PITCH':
    case 'REACHED_ON_ERROR': {
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

/**
 * Smart-Defaults für Runner-Advance bei Grounder.
 * Logik: wenn Throw zu 1B (Batter out an 1B), Force für Runner auf 1B fällt weg → kann zu 2B.
 * Andere Bases: konservativ "bleibt".
 */
export function computeForceDefaults(
  baseState: BogenBaseStateDto,
  throwTarget: 1 | 2 | 3 | 4,
): Record<1 | 2 | 3, 1 | 2 | 3 | 4> {
  const defaults: Record<1 | 2 | 3, 1 | 2 | 3 | 4> = { 1: 1, 2: 2, 3: 3 }
  // Throw zu 1B → Runner auf 1B nicht mehr forced, aggressive Default → 2B
  if (throwTarget === 1 && baseState.firstSlotId != null) {
    defaults[1] = 2
  }
  // Throw zu 2B: rare path (typically reached only via UNASSISTED fielder at 2B).
  // Real Force-DP belongs in DOUBLE_PLAY-Path; hier nur konservativ Runner1B → 2B (safe).
  // TODO: separate Force-Out modelling for grounder mit Throw-zu-2B (Issue: P2 Edge-Cases).
  if (throwTarget === 2 && baseState.firstSlotId != null) {
    defaults[1] = 2
  }
  return defaults
}
