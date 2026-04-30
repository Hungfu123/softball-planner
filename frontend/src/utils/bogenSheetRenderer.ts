import type { SpielbogenAtBatResponse, SpielbogenStealingResponse, BogenSide } from '@/types'

export interface CellNotation {
  label: string
  runScored: boolean
  stealingArrow: { fromBase: number; toBase: number; type: string } | null
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

  for (const ab of atBats) {
    const key = cellKey(ab.side, ab.slotId, ab.inning)
    const notation = renderAtBat(ab)
    const existing = cells.get(key)
    if (existing) {
      cells.set(key, {
        label: existing.label + ' / ' + notation.label,
        runScored: existing.runScored || notation.runScored,
        stealingArrow: existing.stealingArrow ?? notation.stealingArrow,
      })
    } else {
      cells.set(key, notation)
    }
  }

  for (const st of stealings) {
    const key = cellKey(st.side, st.slotId, st.inning)
    const existing = cells.get(key) ?? { label: '', runScored: false, stealingArrow: null }
    existing.stealingArrow = { fromBase: st.fromBase, toBase: st.toBase, type: st.type }
    cells.set(key, existing)
  }

  return cells
}

function renderAtBat(ab: SpielbogenAtBatResponse): CellNotation {
  const runScored = (ab.runsScored ?? 0) > 0
  if (ab.isError && ab.errorPosition != null) {
    return { label: `E${ab.errorPosition}`, runScored, stealingArrow: null }
  }
  switch (ab.result) {
    case 'SINGLE': return { label: '1B', runScored, stealingArrow: null }
    case 'DOUBLE': return { label: '2B', runScored, stealingArrow: null }
    case 'TRIPLE': return { label: '3B', runScored, stealingArrow: null }
    case 'HOMERUN': return { label: 'HR', runScored: true, stealingArrow: null }
    case 'WALK': return { label: 'BB', runScored, stealingArrow: null }
    case 'HIT_BY_PITCH': return { label: 'HP', runScored, stealingArrow: null }
    case 'STRIKEOUT': return { label: 'K', runScored: false, stealingArrow: null }
    case 'OUT': return { label: renderOut(ab), runScored: false, stealingArrow: null }
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
}
