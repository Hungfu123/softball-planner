import type { RunnerAdvanceEntry, RunnerAdvanceReason, AtBatResult, BogenBaseStateDto } from '@/types'

interface ComputeArgs {
  abResult: AtBatResult
  baseStateBefore: BogenBaseStateDto | null
  baseStateAfter: BogenBaseStateDto | null
}

/** Compute RunnerAdvanceEntry list from a state diff + AB-result.
 *  Pure function — no API call. Used by HitAdjustSheet onConfirm + auto for WALK/HIT_BY_PITCH. */
export function computeDefaultAdvances({ abResult, baseStateBefore, baseStateAfter }: ComputeArgs): RunnerAdvanceEntry[] {
  const before = baseStateBefore ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }
  const after = baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }
  const reason = mapReason(abResult)
  if (!reason) return []

  const beforeMap = mapSlotsToBase(before)
  const afterMap = mapSlotsToBase(after)
  const advances: RunnerAdvanceEntry[] = []
  for (const [slotId, fromBase] of beforeMap.entries()) {
    const toBase = afterMap.get(slotId) ?? 4
    if (toBase > fromBase) {
      advances.push({ slotId, fromBase, toBase, reason })
    }
  }
  return advances
}

function mapReason(r: AtBatResult): RunnerAdvanceReason | null {
  if (r === 'SINGLE' || r === 'DOUBLE' || r === 'TRIPLE' || r === 'HOMERUN') return 'HIT_PUSH'
  if (r === 'WALK') return 'BB_FORCE'
  if (r === 'HIT_BY_PITCH') return 'HBP_FORCE'
  return null
}

function mapSlotsToBase(s: BogenBaseStateDto): Map<number, number> {
  const m = new Map<number, number>()
  if (s.firstSlotId != null) m.set(s.firstSlotId, 1)
  if (s.secondSlotId != null) m.set(s.secondSlotId, 2)
  if (s.thirdSlotId != null) m.set(s.thirdSlotId, 3)
  return m
}
