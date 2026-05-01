import type {
  SpielbogenAtBatResponse,
  SpielbogenStealingResponse,
  BogenSide,
  BogenBaseStateDto,
} from '@/types'

export interface CellNotation {
  primaryLabel: string
  labels: string[]
  runScored: boolean
  outIndex: number | null
  rbi: number
  reachedBase: number
  stealingArrow: { fromBase: number; toBase: number; type: string } | null
  abCount: number
}

export type CellMap = Map<string, CellNotation>

export function cellKey(side: BogenSide, slotId: number, inning: number): string {
  return `${side}|${slotId}|${inning}`
}

export function renderCells(
  atBats: SpielbogenAtBatResponse[],
  stealings: SpielbogenStealingResponse[]
): CellMap {
  const cells: CellMap = new Map()
  const sorted = [...atBats].sort((a, b) => a.sequence - b.sequence)
  const scoredSet = computeScoredSet(sorted)
  const outIdxMap = computeOutIndices(sorted)

  for (const ab of sorted) {
    const key = cellKey(ab.side, ab.slotId, ab.inning)
    const single = renderAtBat(ab)
    const scored = scoredSet.has(`${ab.side}|${ab.slotId}|${ab.inning}`)
    const outIdx = outIdxMap.get(ab.id) ?? null
    const reach = scored ? 4 : reachedBaseForAtBat(ab)
    const existing = cells.get(key)
    if (existing) {
      cells.set(key, {
        primaryLabel: single.label,
        labels: [...existing.labels, single.label],
        runScored: existing.runScored || scored,
        outIndex: outIdx ?? existing.outIndex,
        rbi: existing.rbi + (ab.rbi ?? 0),
        reachedBase: Math.max(existing.reachedBase, reach),
        stealingArrow: existing.stealingArrow,
        abCount: existing.abCount + 1,
      })
    } else {
      cells.set(key, {
        primaryLabel: single.label,
        labels: [single.label],
        runScored: scored,
        outIndex: outIdx,
        rbi: ab.rbi ?? 0,
        reachedBase: reach,
        stealingArrow: null,
        abCount: 1,
      })
    }
  }

  for (const st of stealings) {
    const key = cellKey(st.side, st.slotId, st.inning)
    const existing = cells.get(key) ?? emptyCell()
    existing.stealingArrow = { fromBase: st.fromBase, toBase: st.toBase, type: st.type }
    if (st.toBase === 4 && existing.reachedBase < 4) {
      existing.reachedBase = 4
      existing.runScored = true
    } else if (st.toBase > existing.reachedBase) {
      existing.reachedBase = st.toBase
    }
    cells.set(key, existing)
  }

  return cells
}

function emptyCell(): CellNotation {
  return {
    primaryLabel: '',
    labels: [],
    runScored: false,
    outIndex: null,
    rbi: 0,
    reachedBase: 0,
    stealingArrow: null,
    abCount: 0,
  }
}

function reachedBaseForAtBat(ab: SpielbogenAtBatResponse): number {
  if (ab.isError) return 1
  switch (ab.result) {
    case 'SINGLE': return 1
    case 'WALK': return 1
    case 'HIT_BY_PITCH': return 1
    case 'DOUBLE': return 2
    case 'TRIPLE': return 3
    case 'HOMERUN': return 4
    case 'STRIKEOUT': return 0
    case 'OUT':
      // FORCE_OUT/TAG_OUT can mean a runner was out while the batter reached 1B (FC).
      // We check baseStateAfter: if the batter ended up on a base, mark reach accordingly.
      if (ab.baseStateAfter) {
        if (ab.baseStateAfter.firstSlotId === ab.slotId) return 1
        if (ab.baseStateAfter.secondSlotId === ab.slotId) return 2
        if (ab.baseStateAfter.thirdSlotId === ab.slotId) return 3
      }
      return 0
  }
  return 0
}

function renderAtBat(ab: SpielbogenAtBatResponse): { label: string } {
  if (ab.isError && ab.errorPosition != null) return { label: `E${ab.errorPosition}` }
  switch (ab.result) {
    case 'SINGLE': return { label: '1B' }
    case 'DOUBLE': return { label: '2B' }
    case 'TRIPLE': return { label: '3B' }
    case 'HOMERUN': return { label: 'HR' }
    case 'WALK': return { label: 'BB' }
    case 'HIT_BY_PITCH': return { label: 'HP' }
    case 'STRIKEOUT': return { label: 'K' }
    case 'OUT': return { label: renderOut(ab) }
  }
}

function renderOut(ab: SpielbogenAtBatResponse): string {
  if (!ab.outType) return 'OUT'
  if (ab.fielderChain && ab.fielderChain.length > 0) {
    const chain = ab.fielderChain.join('-')
    if (ab.outType === 'DOUBLE_PLAY') return `${chain} DP`
    if (ab.outType === 'TRIPLE_PLAY') return `${chain} TP`
    if (ab.outType === 'FLY' && ab.fielderChain.length === 1) return `F${ab.fielderChain[0]}`
    return chain
  }
  switch (ab.outType) {
    case 'GROUNDER': return 'GO'
    case 'FLY': return 'FO'
    case 'FOUL': return 'FOUL'
    case 'UNASSISTED': return 'U'
    case 'DOUBLE_PLAY': return 'DP'
    case 'TRIPLE_PLAY': return 'TP'
    case 'FORCE_OUT': return 'FO'
    case 'TAG_OUT': return 'TO'
  }
  return 'OUT'
}

function basesInOrder(s: BogenBaseStateDto | null | undefined): number[] {
  if (!s) return []
  const out: number[] = []
  if (s.thirdSlotId != null) out.push(s.thirdSlotId)
  if (s.secondSlotId != null) out.push(s.secondSlotId)
  if (s.firstSlotId != null) out.push(s.firstSlotId)
  return out
}

/**
 * Walks each side+inning in sequence order, comparing the prior base state
 * against `baseStateAfter` of each AB. Disappeared runners either scored or
 * got out; we credit `ab.runsScored` of them as scored (highest base first),
 * which matches RFL convention. HOMERUN additionally credits the batter.
 */
function computeScoredSet(sortedAtBats: SpielbogenAtBatResponse[]): Set<string> {
  const scored = new Set<string>()
  const groups = new Map<string, SpielbogenAtBatResponse[]>()
  for (const ab of sortedAtBats) {
    const k = `${ab.side}|${ab.inning}`
    const arr = groups.get(k) ?? []
    arr.push(ab)
    groups.set(k, arr)
  }
  for (const arr of groups.values()) {
    let prev: BogenBaseStateDto | null = null
    for (const ab of arr) {
      const prevRunners = basesInOrder(prev)
      const currSet = new Set(basesInOrder(ab.baseStateAfter))
      const disappeared = prevRunners.filter(s => !currSet.has(s))
      const runs = ab.runsScored ?? 0
      if (ab.result === 'HOMERUN') {
        scored.add(`${ab.side}|${ab.slotId}|${ab.inning}`)
        for (const sid of disappeared) {
          scored.add(`${ab.side}|${sid}|${ab.inning}`)
        }
      } else if (runs > 0) {
        for (let i = 0; i < Math.min(runs, disappeared.length); i++) {
          scored.add(`${ab.side}|${disappeared[i]}|${ab.inning}`)
        }
      }
      prev = ab.baseStateAfter
    }
  }
  return scored
}

function computeOutIndices(sortedAtBats: SpielbogenAtBatResponse[]): Map<number, number> {
  const result = new Map<number, number>()
  const groups = new Map<string, SpielbogenAtBatResponse[]>()
  for (const ab of sortedAtBats) {
    const k = `${ab.side}|${ab.inning}`
    const arr = groups.get(k) ?? []
    arr.push(ab)
    groups.set(k, arr)
  }
  for (const arr of groups.values()) {
    let outs = 0
    for (const ab of arr) {
      if (ab.isError) continue
      if (ab.result === 'STRIKEOUT') {
        outs += 1
        if (outs <= 3) result.set(ab.id, outs)
      } else if (ab.result === 'OUT') {
        if (ab.outType === 'DOUBLE_PLAY') outs += 2
        else if (ab.outType === 'TRIPLE_PLAY') outs += 3
        else outs += 1
        if (outs <= 3) result.set(ab.id, outs)
      }
    }
  }
  return result
}
