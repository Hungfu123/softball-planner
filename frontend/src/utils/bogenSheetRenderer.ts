import type {
  SpielbogenAtBatResponse,
  SpielbogenStealingResponse,
  SpielbogenRunnerAdvanceResponse,
  RunnerAdvanceReason,
  AtBatResult,
  BogenSide,
  BogenBaseStateDto,
} from '@/types'

export interface AdvanceLabel {
  side: 'home-1b' | '1b-2b' | '2b-3b' | '3b-home'
  label: string
}

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
  /** Advance-Labels pro Basepfad — zeigen Grund warum ein Runner vorgerückt ist. */
  advanceLabels: AdvanceLabel[]
}

export type CellMap = Map<string, CellNotation>

export function cellKey(side: BogenSide, slotId: number, inning: number): string {
  return `${side}|${slotId}|${inning}`
}

export function renderCells(
  atBats: SpielbogenAtBatResponse[],
  stealings: SpielbogenStealingResponse[],
  runnerAdvances: SpielbogenRunnerAdvanceResponse[] = [],
): CellMap {
  const cells: CellMap = new Map()
  const sorted = [...atBats].sort((a, b) => a.sequence - b.sequence)
  const scoredSet = computeScoredSet(sorted)
  // Backfill per AB: für ABs ohne Records → synthesize aus baseStateAfter-Diffs.
  // Walk-Chain berücksichtigt ALL ABs für prevAfter, emit nur für AB-IDs ohne Records.
  const abIdsWithRecords = new Set(runnerAdvances.map(r => r.atBatId))
  const synthAdvances = synthesizeAdvances(sorted, abIdsWithRecords)
  const effectiveAdvances = [...runnerAdvances, ...synthAdvances]
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
        advanceLabels: existing.advanceLabels,
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
        advanceLabels: [],
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
    // CS / OUT_ON_PLAY = Runner-Out beim Versuch. Reach update auf fromBase
    // (Runner war dort vor dem Out-Versuch), aber NICHT auf toBase (er hat's nicht geschafft).
    const isOutEvent = st.type === 'CAUGHT_STEALING' || st.type === 'OUT_ON_PLAY'
    if (isOutEvent) {
      if (st.fromBase > existing.reachedBase) {
        existing.reachedBase = st.fromBase
      }
    } else {
      if (st.toBase === 4 && existing.reachedBase < 4) {
        existing.reachedBase = 4
        existing.runScored = true
      } else if (st.toBase > existing.reachedBase) {
        existing.reachedBase = st.toBase
      }
    }
    // Inning-End-Marker auch bei Stealing-induzierten 3rd-Outs auf Stealing-Cell anwenden
    if (inningEndKeys.has(key)) existing.inningEnd = true
    // Out-Index aus computeCellOutIndices übernehmen (kombiniert AB-Outs + Stealing-Outs)
    const cellOut = cellOutIdxMap.get(key) ?? null
    if (cellOut) existing.outIndex = cellOut
    cells.set(key, existing)
  }

  for (const adv of effectiveAdvances) {
    const ab = atBats.find(a => a.id === adv.atBatId)
    if (!ab) continue
    const label = reasonToLabel(adv.reason, ab.result, ab.fielderChain, ab.outType)
    const key = cellKey(adv.side, adv.slotId, adv.inning)
    const cell = cells.get(key)
    if (!cell) continue
    // Update reachedBase: runner's cell reflects max base reached this inning
    // (including pushes via subsequent ABs). Diamond-fill grows accordingly.
    if (adv.toBase === 4 && cell.reachedBase < 4) {
      cell.reachedBase = 4
      cell.runScored = true
    } else if (adv.toBase > cell.reachedBase) {
      cell.reachedBase = adv.toBase
    }
    // Side-annotation: alle traversierten Seiten bekommen Label (Multi-Hop in einer AB → mehrere Labels).
    const sides = fromToTraversedSides(adv.fromBase, adv.toBase)
    for (const side of sides) cell.advanceLabels.push({ side, label })
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
    advanceLabels: [],
  }
}

/** Synthesize RunnerAdvance-Records aus AB-baseStateAfter-Diffs (für alte Bögen ohne Records). */
function synthesizeAdvances(sortedAtBats: SpielbogenAtBatResponse[], skipAbIds: Set<number> = new Set()): SpielbogenRunnerAdvanceResponse[] {
  const result: SpielbogenRunnerAdvanceResponse[] = []
  const bySide: Record<BogenSide, SpielbogenAtBatResponse[]> = { HOME: [], AWAY: [] }
  for (const ab of sortedAtBats) bySide[ab.side].push(ab)
  for (const side of ['HOME', 'AWAY'] as BogenSide[]) {
    let prevAfter: BogenBaseStateDto | null = null
    let prevInning = -1
    for (const ab of bySide[side]) {
      const before: BogenBaseStateDto | null = ab.inning !== prevInning ? null : prevAfter
      const after = ab.baseStateAfter ?? null
      const reason = ab.isError ? 'ERROR' : mapResultToReason(ab.result)
      // Walk-Chain immer durchlaufen, aber nur emittieren wenn AB nicht in skipAbIds.
      if (reason && before && after && !skipAbIds.has(ab.id)) {
        const beforeMap = baseStateToMap(before)
        const afterMap = baseStateToMap(after)
        for (const [slotId, fromBase] of beforeMap.entries()) {
          const toBase = afterMap.get(slotId) ?? 4
          if (toBase > fromBase) {
            result.push({
              id: -result.length - 1,
              bogenId: ab.bogenId ?? 0,
              atBatId: ab.id,
              slotId,
              side: ab.side,
              inning: ab.inning,
              fromBase,
              toBase,
              reason,
              createdAt: ab.createdAt,
            })
          }
        }
      }
      prevAfter = after
      prevInning = ab.inning
    }
  }
  return result
}

function mapResultToReason(r: AtBatResult): RunnerAdvanceReason | null {
  if (r === 'SINGLE' || r === 'DOUBLE' || r === 'TRIPLE' || r === 'HOMERUN') return 'HIT_PUSH'
  if (r === 'WALK') return 'BB_FORCE'
  if (r === 'HIT_BY_PITCH') return 'HBP_FORCE'
  if (r === 'OUT' || r === 'STRIKEOUT') return 'FIELDERS_CHOICE' // Productive Out (Runner advance)
  return null
}

function baseStateToMap(s: BogenBaseStateDto): Map<number, number> {
  const m = new Map<number, number>()
  if (s.firstSlotId != null) m.set(s.firstSlotId, 1)
  if (s.secondSlotId != null) m.set(s.secondSlotId, 2)
  if (s.thirdSlotId != null) m.set(s.thirdSlotId, 3)
  return m
}

function reasonToLabel(reason: RunnerAdvanceReason, abResult?: AtBatResult, abFielderChain?: number[] | null, abOutType?: string | null): string {
  switch (reason) {
    case 'HIT_PUSH':
      if (abResult === 'SINGLE') return '1B'
      if (abResult === 'DOUBLE') return '2B'
      if (abResult === 'TRIPLE') return '3B'
      if (abResult === 'HOMERUN') return 'HR'
      return 'H'
    case 'BB_FORCE': return 'BB'
    case 'HBP_FORCE': return 'HBP'
    case 'FIELDERS_CHOICE':
      if (!abFielderChain || abFielderChain.length === 0) return 'FC'
      // Fly-Out: F-Prefix (z.B. F8). Grounder/anderer Out: chain (z.B. 5-3).
      if (abOutType === 'FLY' && abFielderChain.length === 1) return `F${abFielderChain[0]}`
      return abFielderChain.join('-')
    case 'ERROR':
      return abFielderChain && abFielderChain.length > 0 ? `E${abFielderChain[0]}` : 'E'
    case 'SAC': return 'SAC'
    case 'WP': return 'WP'
    case 'PB': return 'PB'
  }
}

function fromToTraversedSides(fromBase: number, toBase: number): AdvanceLabel['side'][] {
  if (toBase <= fromBase) return []
  const sides: AdvanceLabel['side'][] = []
  for (let b = fromBase; b < toBase; b++) {
    if (b === 0) sides.push('home-1b')
    else if (b === 1) sides.push('1b-2b')
    else if (b === 2) sides.push('2b-3b')
    else if (b === 3) sides.push('3b-home')
  }
  // Batter Homerun (0→4) → eigenes AB-Label, kein Side-Label.
  if (fromBase === 0 && toBase >= 4) return []
  return sides
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
    const first = ab.fielderChain[0]
    const isOutfieldOrigin = first === 7 || first === 8 || first === 9
    if (ab.outType === 'DOUBLE_PLAY') {
      // Fly+DP behält "F"-Prefix damit Reader sieht: Fly + Throw, nicht Grounder.
      const prefix = isOutfieldOrigin && ab.fielderChain.length > 1 ? 'F' : ''
      return `${prefix}${chain} DP`
    }
    if (ab.outType === 'TRIPLE_PLAY') {
      const prefix = isOutfieldOrigin && ab.fielderChain.length > 1 ? 'F' : ''
      return `${prefix}${chain} TP`
    }
    if (ab.outType === 'FLY' && ab.fielderChain.length === 1) return `F${ab.fielderChain[0]}`
    if (ab.outType === 'FOUL' && ab.fielderChain.length === 1) return `f${ab.fielderChain[0]}`
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

const POSITION_NUMBER_MAP: Record<string, string> = {
  P: '1',
  C: '2',
  '1B': '3',
  '2B': '4',
  '3B': '5',
  SS: '6',
  LF: '7',
  CF: '8',
  RF: '9',
}

export function positionToNumber(pos: string | null | undefined): string | null {
  if (!pos) return null
  if (POSITION_NUMBER_MAP[pos]) return POSITION_NUMBER_MAP[pos]
  if (/^[1-9]$/.test(pos)) return pos
  return null
}

export function positionDisplay(pos: string | null | undefined): string {
  if (!pos) return '—'
  const num = positionToNumber(pos)
  return num ?? pos
}

export function computePositionHistoryPerSlot(
  slots: { id: number; position: string | null }[],
  changes: { slotId: number; inning: number; oldPosition: string | null; newPosition: string | null; createdAt: string }[],
): Map<number, string[]> {
  const result = new Map<number, string[]>()
  const sortedChanges = [...changes].sort((a, b) =>
    a.inning !== b.inning ? a.inning - b.inning : a.createdAt.localeCompare(b.createdAt),
  )
  const grouped = new Map<number, typeof sortedChanges>()
  for (const c of sortedChanges) {
    const arr = grouped.get(c.slotId) ?? []
    arr.push(c)
    grouped.set(c.slotId, arr)
  }
  for (const slot of slots) {
    const slotChanges = grouped.get(slot.id) ?? []
    if (slotChanges.length === 0) {
      result.set(slot.id, [slot.position ?? ''].filter(Boolean))
      continue
    }
    const list: string[] = []
    list.push(slotChanges[0].oldPosition ?? '')
    for (const c of slotChanges) list.push(c.newPosition ?? '')
    result.set(slot.id, list.filter(s => s !== ''))
  }
  return result
}
