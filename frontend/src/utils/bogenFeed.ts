import type {
  BogenSide,
  SpielbogenAtBatResponse,
  SpielbogenSlotResponse,
  SpielbogenStealingResponse,
  SpielbogenSubstitutionResponse,
} from '@/types'

export interface FeedEvent {
  key: string
  inning: number
  side: BogenSide
  createdAt: string
  who: string
  what: string
  rbi: number
  scored: boolean
  minor: boolean
}

export interface HalfInning {
  inning: number
  side: BogenSide
  events: FeedEvent[]
  scoreAfter: { home: number; away: number }
}

export interface FeedInput {
  homeLineup: SpielbogenSlotResponse[]
  awayLineup: SpielbogenSlotResponse[]
  homeAtBats: SpielbogenAtBatResponse[]
  awayAtBats: SpielbogenAtBatResponse[]
  stealingEvents: SpielbogenStealingResponse[]
  substitutions: SpielbogenSubstitutionResponse[]
  inningRuns: Record<number, { home: number; away: number }>
}

const RESULT_DE: Record<string, string> = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  TRIPLE: 'Triple',
  HOMERUN: 'Homerun',
  INSIDE_PARK_HR: 'Park-HR',
  WALK: 'Walk',
  HIT_BY_PITCH: 'Hit-by-Pitch',
  STRIKEOUT: 'Strikeout',
  OUT: 'Aus',
  REACHED_ON_ERROR: 'Reached on Error',
}

const OUT_TYPE_DE: Record<string, string> = {
  GROUNDER: 'Grounder',
  FLY: 'Fly',
  FOUL: 'Foul',
  UNASSISTED: 'Unassisted',
  DOUBLE_PLAY: 'Double Play',
  TRIPLE_PLAY: 'Triple Play',
  FORCE_OUT: 'Force Out',
  TAG_OUT: 'Tag Out',
  FIELDERS_CHOICE: "Fielder's Choice",
}

const BASE_DE: Record<number, string> = { 2: '2nd', 3: '3rd', 4: 'Home' }

export function halfInningId(inning: number, side: BogenSide): string {
  return `half-${inning}-${side}`
}

function atBatLabel(ab: SpielbogenAtBatResponse): string {
  if (ab.sacrificeType) {
    return ab.sacrificeType === 'BUNT' ? 'Sac Bunt' : 'Sac Fly'
  }

  if (ab.outType) {
    const name = OUT_TYPE_DE[ab.outType] ?? RESULT_DE[ab.result] ?? ab.result
    const chain = ab.fielderChain ?? []
    if (ab.outType === 'FLY' && chain.length === 1) return `${name} F${chain[0]}`
    if (chain.length > 0) return `${name} ${chain.join('-')}`
    return name
  }

  return RESULT_DE[ab.result] ?? ab.result
}

function stealLabel(st: SpielbogenStealingResponse): string {
  switch (st.type) {
    case 'STOLEN_BASE': return `stiehlt ${BASE_DE[st.toBase ?? 0] ?? st.toBase}`
    case 'CAUGHT_STEALING': return 'beim Klau gefangen'
    case 'OUT_ON_PLAY': return 'Aus beim Vorrücken'
    case 'WILD_PITCH': return 'Wild Pitch'
    case 'PASSED_BALL': return 'Passed Ball'
    default: return st.type
  }
}

export function buildFeed(input: FeedInput): HalfInning[] {
  const nameBySlotId = new Map<number, string>()
  for (const s of [...input.homeLineup, ...input.awayLineup]) {
    if (s.id != null) nameBySlotId.set(s.id, s.name)
  }
  const nameOf = (slotId: number | null | undefined) =>
    (slotId != null ? nameBySlotId.get(slotId) : undefined) ?? '—'

  const events: FeedEvent[] = []

  for (const ab of [...input.homeAtBats, ...input.awayAtBats]) {
    events.push({
      key: `ab-${ab.id}`,
      inning: ab.inning,
      side: ab.side,
      createdAt: ab.createdAt,
      who: nameOf(ab.slotId),
      what: atBatLabel(ab),
      rbi: ab.rbi ?? 0,
      scored: (ab.runsScored ?? 0) > 0,
      minor: false,
    })
  }

  for (const st of input.stealingEvents) {
    events.push({
      key: `st-${st.id}`,
      inning: st.inning,
      side: st.side,
      createdAt: st.createdAt,
      who: nameOf(st.slotId),
      what: stealLabel(st),
      rbi: 0,
      scored: false,
      minor: true,
    })
  }

  for (const sub of input.substitutions) {
    events.push({
      key: `sub-${sub.id}`,
      inning: sub.inning,
      side: sub.side,
      createdAt: sub.createdAt,
      who: 'Sub',
      what: `${sub.playerInName} für ${sub.playerOutName}`,
      rbi: 0,
      scored: false,
      minor: true,
    })
  }

  // Neueste zuerst — über alle Typen hinweg über createdAt, der einzige
  // Schlüssel, den At-Bats, Steals und Subs gemeinsam haben.
  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const groups = new Map<string, HalfInning>()
  const order: string[] = []
  for (const ev of events) {
    const id = halfInningId(ev.inning, ev.side)
    let group = groups.get(id)
    if (!group) {
      group = { inning: ev.inning, side: ev.side, events: [], scoreAfter: { home: 0, away: 0 } }
      groups.set(id, group)
      order.push(id)
    }
    group.events.push(ev)
  }

  const result = order.map(id => groups.get(id)!)

  // Zwischenstand nach jeder Halbinning: alle Runs bis einschließlich dieser Inning.
  for (const group of result) {
    let home = 0
    let away = 0
    for (const [inningKey, runs] of Object.entries(input.inningRuns)) {
      if (Number(inningKey) <= group.inning) {
        home += runs.home
        away += runs.away
      }
    }
    group.scoreAfter = { home, away }
  }

  return result
}
