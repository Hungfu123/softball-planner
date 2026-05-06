import type {
  SpielbogenAtBatResponse,
  SpielbogenStealingResponse,
  BogenSide,
  BogenBaseStateDto,
} from '@/types'

export interface StealingArrow {
  fromBase: number
  toBase: number
  type: string
}

export interface CellNotation {
  primaryLabel: string
  labels: string[]
  runScored: boolean
  outIndex: string | null
  rbi: number
  reachedBase: number
  /** Erster Stealing-Arrow (für Backwards-Compat). Bei Multi-AB-Cells im Wrap-Around mehrere möglich → siehe stealingArrows. */
  stealingArrow: StealingArrow | null
  /** Alle Stealing-Arrows der Cell — Wrap-Around Inning kann mehrere haben. */
  stealingArrows: StealingArrow[]
  abCount: number
  /** RFL-Konvention: kleiner Slash am Cell-Border markiert wo das 3. Out fiel.
   *  Hilft Scorekeeper zu sehen wer im nächsten Inning die Lineup-Reihenfolge fortsetzt. */
  inningEnd: boolean
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
  const cellOutIdxMap = computeCellOutIndices(sorted, stealings)
  const inningEndKeys = computeInningEndKeys(sorted, stealings)

  for (const ab of sorted) {
    const key = cellKey(ab.side, ab.slotId, ab.inning)
    const single = renderAtBat(ab)
    const scored = scoredSet.has(`${ab.side}|${ab.slotId}|${ab.inning}`)
    const outIdx = cellOutIdxMap.get(key) ?? null
    const reach = scored ? 4 : reachedBaseForAtBat(ab)
    const existing = cells.get(key)
    const cellEnds = inningEndKeys.has(key)
    if (existing) {
      cells.set(key, {
        primaryLabel: single.label,
        labels: [...existing.labels, single.label],
        runScored: existing.runScored || scored,
        outIndex: outIdx ?? existing.outIndex,
        rbi: existing.rbi + (ab.rbi ?? 0),
        reachedBase: Math.max(existing.reachedBase, reach),
        stealingArrow: existing.stealingArrow,
        stealingArrows: existing.stealingArrows,
        abCount: existing.abCount + 1,
        inningEnd: existing.inningEnd || cellEnds,
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
        stealingArrows: [],
        abCount: 1,
        inningEnd: cellEnds,
      })
    }
  }

  for (const st of stealings) {
    const key = cellKey(st.side, st.slotId, st.inning)
    const existing = cells.get(key) ?? emptyCell()
    const arrow: StealingArrow = { fromBase: st.fromBase, toBase: st.toBase, type: st.type }
    existing.stealingArrows = [...existing.stealingArrows, arrow]
    // First arrow stays als primaryLabel-equivalent für legacy single-arrow rendering
    if (existing.stealingArrow == null) existing.stealingArrow = arrow
    if (st.toBase === 4 && existing.reachedBase < 4) {
      existing.reachedBase = 4
      existing.runScored = true
    } else if (st.toBase > existing.reachedBase) {
      existing.reachedBase = st.toBase
    }
    // Inning-End-Marker auch bei Stealing-induzierten 3rd-Outs auf Stealing-Cell anwenden
    if (inningEndKeys.has(key)) existing.inningEnd = true
    // Out-Index aus computeCellOutIndices übernehmen (kombiniert AB-Outs + Stealing-Outs)
    const cellOut = cellOutIdxMap.get(key) ?? null
    if (cellOut) existing.outIndex = cellOut
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
    stealingArrows: [],
    abCount: 0,
    inningEnd: false,
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
  const base = renderAtBatBase(ab)
  if (ab.sacrificeType === 'FLY') return { label: `${base} SF` }
  if (ab.sacrificeType === 'BUNT') return { label: `${base} SH` }
  return { label: base }
}

function renderAtBatBase(ab: SpielbogenAtBatResponse): string {
  if (ab.isError && ab.errorPosition != null) return `E${ab.errorPosition}`
  switch (ab.result) {
    case 'SINGLE': return '1B'
    case 'DOUBLE': return '2B'
    case 'TRIPLE': return '3B'
    case 'HOMERUN': return 'HR'
    case 'WALK': return 'BB'
    case 'HIT_BY_PITCH': return 'HP'
    case 'STRIKEOUT': return 'K'
    case 'OUT': return renderOut(ab)
  }
  return 'OUT'
}

function renderOut(ab: SpielbogenAtBatResponse): string {
  if (!ab.outType) return 'OUT'
  const chain = ab.fielderChain && ab.fielderChain.length > 0 ? ab.fielderChain.join('-') : ''
  if (ab.outType === 'FIELDERS_CHOICE') return chain ? `FC ${chain}` : 'FC'
  if (ab.fielderChain && ab.fielderChain.length > 0) {
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

/**
 * Returns map cellKey → display roman label combinining ALL outs auf der Cell.
 * Format: einzelner Out "I", DP "I-II", TP "I-III", multi-events "I, III"
 * (z.B. AB-Out + späterer Stealing-Out auf gleichem Slot).
 * Berücksichtigt sowohl AB-Outs als auch Stealing-Outs (CS/OUT_ON_PLAY).
 */
function computeCellOutIndices(
  sortedAtBats: SpielbogenAtBatResponse[],
  stealings: SpielbogenStealingResponse[]
): Map<string, string> {
  // Sammle alle Out-Events mit sortKey für deterministische Out-Numerierung
  type Evt = { side: BogenSide; inning: number; slotId: number; outsAdded: number; sortKey: number }
  const events: Evt[] = []
  for (const ab of sortedAtBats) {
    if (ab.isError) continue
    let added = 0
    if (ab.result === 'STRIKEOUT') added = 1
    else if (ab.result === 'OUT') {
      if (ab.outType === 'DOUBLE_PLAY') added = 2
      else if (ab.outType === 'TRIPLE_PLAY') added = 3
      else added = 1
    }
    if (added > 0) {
      events.push({ side: ab.side, inning: ab.inning, slotId: ab.slotId, outsAdded: added, sortKey: ab.sequence })
    }
  }
  const abByCreated = [...sortedAtBats].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return ta - tb
  })
  for (const st of stealings) {
    if (st.type !== 'CAUGHT_STEALING' && st.type !== 'OUT_ON_PLAY') continue
    const stTime = st.createdAt ? new Date(st.createdAt).getTime() : 0
    let priorSeq = 0
    for (const ab of abByCreated) {
      if (ab.side !== st.side || ab.inning !== st.inning) continue
      const abTime = ab.createdAt ? new Date(ab.createdAt).getTime() : 0
      if (abTime <= stTime) priorSeq = ab.sequence
      else break
    }
    events.push({ side: st.side, inning: st.inning, slotId: st.slotId, outsAdded: 1, sortKey: priorSeq + 0.5 })
  }

  // Gruppiere nach side+inning, walke in sortKey-Reihenfolge, zähle Outs hoch
  const groups = new Map<string, Evt[]>()
  for (const e of events) {
    const k = `${e.side}|${e.inning}`
    const arr = groups.get(k) ?? []
    arr.push(e)
    groups.set(k, arr)
  }
  // Per-cell-Labels gesammelt — multiple Events auf gleicher Cell → join mit ", "
  const cellLabels = new Map<string, string[]>()
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.sortKey - b.sortKey)
    let outs = 0
    for (const e of arr) {
      const startOut = outs + 1
      const endOut = outs + e.outsAdded
      outs += e.outsAdded
      const k = cellKey(e.side, e.slotId, e.inning)
      let label: string | null = null
      if (endOut <= 3) {
        label = e.outsAdded === 1 ? roman(startOut) : `${roman(startOut)}-${roman(endOut)}`
      } else if (startOut <= 3) {
        label = startOut === 3 ? roman(3) : `${roman(startOut)}-${roman(Math.min(endOut, 3))}`
      }
      if (label) {
        const arr2 = cellLabels.get(k) ?? []
        arr2.push(label)
        cellLabels.set(k, arr2)
      }
    }
  }
  const result = new Map<string, string>()
  for (const [k, arr] of cellLabels) {
    // Kompakter Separator '·' (statt ', ') um Cell-Platz zu sparen
    result.set(k, arr.join('·'))
  }
  return result
}

/**
 * Returns Set of cellKeys where the 3rd out fell — RFL-Konvention markiert das
 * mit kleinem Slash am Cell-Border (Scorekeeper-Hilfe für nächste Inning-Lineup).
 * Berücksichtigt sowohl AB-Outs (Strikeout/Out/DP/TP) als auch Stealing-Outs (CS/OUT_ON_PLAY).
 */
function computeInningEndKeys(
  sortedAtBats: SpielbogenAtBatResponse[],
  stealings: SpielbogenStealingResponse[]
): Set<string> {
  const result = new Set<string>()
  // Combine + sort all events by inning + sequence-equivalent
  type Evt = { side: BogenSide; inning: number; slotId: number; outsAdded: number; sortKey: number }
  const events: Evt[] = []
  // ABs: nutze sequence als sortKey — matched computeOutIndices.
  // createdAt wäre falsch weil correctLastAtBat den Timestamp aktualisiert
  // und dann corrected ABs ans Ende rutschen würden.
  for (const ab of sortedAtBats) {
    if (ab.isError) continue
    let added = 0
    if (ab.result === 'STRIKEOUT') added = 1
    else if (ab.result === 'OUT') {
      if (ab.outType === 'DOUBLE_PLAY') added = 2
      else if (ab.outType === 'TRIPLE_PLAY') added = 3
      else added = 1
    }
    if (added > 0) {
      events.push({ side: ab.side, inning: ab.inning, slotId: ab.slotId, outsAdded: added, sortKey: ab.sequence })
    }
  }
  // Stealing-Outs (CS / OUT_ON_PLAY) — keine sequence vorhanden, daher
  // via createdAt zur nächsten AB-sequence interpolieren. Approximation:
  // sortKey = sequence der letzten AB ≤ stealing-createdAt + 0.5 (zwischen ABs).
  // Vereinfacht: nutze stealing-createdAt vs AB-createdAt.
  const abByCreated = [...sortedAtBats].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return ta - tb
  })
  for (const st of stealings) {
    if (st.type !== 'CAUGHT_STEALING' && st.type !== 'OUT_ON_PLAY') continue
    const stTime = st.createdAt ? new Date(st.createdAt).getTime() : 0
    // Find last AB (same side+inning) with createdAt <= stTime → use its sequence + 0.5
    let priorSeq = 0
    for (const ab of abByCreated) {
      if (ab.side !== st.side || ab.inning !== st.inning) continue
      const abTime = ab.createdAt ? new Date(ab.createdAt).getTime() : 0
      if (abTime <= stTime) priorSeq = ab.sequence
      else break
    }
    events.push({ side: st.side, inning: st.inning, slotId: st.slotId, outsAdded: 1, sortKey: priorSeq + 0.5 })
  }
  // Group by side+inning, walk in sortKey order, find the event that pushes outs to >=3
  const groups = new Map<string, Evt[]>()
  for (const e of events) {
    const k = `${e.side}|${e.inning}`
    const arr = groups.get(k) ?? []
    arr.push(e)
    groups.set(k, arr)
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.sortKey - b.sortKey)
    let outs = 0
    for (const e of arr) {
      const before = outs
      outs += e.outsAdded
      if (before < 3 && outs >= 3) {
        result.add(cellKey(e.side, e.slotId, e.inning))
        break
      }
    }
  }
  return result
}

function roman(n: number): string {
  return n === 1 ? 'I' : n === 2 ? 'II' : n === 3 ? 'III' : ''
}
