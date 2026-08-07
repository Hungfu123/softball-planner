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
  AUTOMATIC_OUT: 'Automatisches Out',
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

/** Kurzlabel fürs Score-Divider — ohne sichtbares Scoreboard muss die Zeile selbst
 *  sagen, welche Zahl zu welchem Team gehört. Bei Mehrwortnamen ("Köln Abbots")
 *  ist meist das letzte Wort der eigentliche Teamname; sonst das ganze Wort. */
export function teamAbbreviation(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const word = words[words.length - 1] ?? ''
  return word.slice(0, 3).toUpperCase()
}

/** Einzige Quelle für "erzielt ein Steal einen Run" — muss die Backend-Regel
 *  (BogenScoreCalculator.stealingScoresRun) exakt spiegeln, sonst widerspricht
 *  der Feed dem Score, den er selbst zeigt. Nur SB/WP/PB bis toBase===Home zählt;
 *  CAUGHT_STEALING und OUT_ON_PLAY sind Outs, auch bei toBase===4. */
function stealingScoresRun(st: SpielbogenStealingResponse): boolean {
  return st.toBase === 4 && (
    st.type === 'STOLEN_BASE' || st.type === 'WILD_PITCH' || st.type === 'PASSED_BALL'
  )
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
    const scoresRun = stealingScoresRun(st)
    events.push({
      key: `st-${st.id}`,
      inning: st.inning,
      side: st.side,
      createdAt: st.createdAt,
      who: nameOf(st.slotId),
      what: stealLabel(st),
      rbi: 0,
      scored: scoresRun,
      minor: !scoresRun,
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
  // Schlüssel, den At-Bats, Steals und Subs gemeinsam haben. Numerisch vergleichen,
  // nicht lexikalisch: Jackson serialisiert Instant ohne Bruchteil, wenn er null ist
  // ("...:00Z" vs. "...:00.500Z"), und "." sortiert lexikalisch vor "Z".
  events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

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

  // Gruppenreihenfolge bleibt neueste-zuerst (die laufende Halbinning oben), aber
  // innerhalb einer Gruppe soll sich ein Inning wie ein Inning lesen: erster Batter
  // oben. Da group.events durch die vorsortierte (neueste-zuerst) Liste befüllt wurde,
  // reicht ein Reverse pro Gruppe für die chronologische Reihenfolge.
  for (const group of result) {
    group.events.reverse()
  }

  // Zwischenstand nach jeder Halbinning: Away hat zu diesem Zeitpunkt Inning 1..N
  // gespielt, Home aber erst 1..N-1, solange die Home-Halbinning von N noch nicht
  // dran war (also für eine AWAY-Gruppe). Für eine HOME-Gruppe ist auch Home schon
  // bei N angekommen.
  for (const group of result) {
    let home = 0
    let away = 0
    const homeCutoff = group.side === 'HOME' ? group.inning : group.inning - 1
    for (const [inningKey, runs] of Object.entries(input.inningRuns)) {
      const inningNumber = Number(inningKey)
      if (inningNumber <= group.inning) away += runs.away
      if (inningNumber <= homeCutoff) home += runs.home
    }
    group.scoreAfter = { home, away }
  }

  return result
}
