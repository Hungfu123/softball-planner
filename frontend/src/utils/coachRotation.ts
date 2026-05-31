import type { CoachRotationPair } from '@/types'

export interface CoachRotationLineupRow {
  battingOrder: number
  position: string | null
  player: { name: string }
}

interface ResolvedCoachSide {
  name: string
  pos: number
}

export interface ResolvedRotation {
  pair: CoachRotationPair
  primary: ResolvedCoachSide       // steht meiste Zeit an Base
  backup: ResolvedCoachSide        // übernimmt während Primary's Warmup + Schlag
  backupCoverRange: string         // z.B. "Schlag #8 – #10"
  primaryAbSlot: string            // z.B. "#10"
}

interface RotationConfig {
  lower: number              // niedrigere Lineup-Position
  higher: number             // höhere Lineup-Position
  primaryPos: number         // wer ist Primary (= higher, mehr Zeit zum coachen)
  backupPos: number          // wer ist Backup
  backupCoverRange: string   // z.B. "#8 – #10"
  primaryAbSlot: string      // z.B. "#10"
}

const ROTATION_CONFIG: Record<CoachRotationPair, RotationConfig> = {
  POS_3_8:  { lower: 3, higher: 8,  primaryPos: 8,  backupPos: 3, backupCoverRange: '#6 – #8',  primaryAbSlot: '#8' },
  POS_4_9:  { lower: 4, higher: 9,  primaryPos: 9,  backupPos: 4, backupCoverRange: '#7 – #9',  primaryAbSlot: '#9' },
  POS_5_10: { lower: 5, higher: 10, primaryPos: 10, backupPos: 5, backupCoverRange: '#8 – #10', primaryAbSlot: '#10' },
}

export function resolveRotation(pair: CoachRotationPair, lineup: CoachRotationLineupRow[]): ResolvedRotation {
  const config = ROTATION_CONFIG[pair]
  const primaryEntry = lineup.find(e => e.battingOrder === config.primaryPos)
  const backupEntry  = lineup.find(e => e.battingOrder === config.backupPos)

  return {
    pair,
    primary: { name: primaryEntry?.player.name ?? '—', pos: config.primaryPos },
    backup:  { name: backupEntry?.player.name  ?? '—', pos: config.backupPos },
    backupCoverRange: config.backupCoverRange,
    primaryAbSlot: config.primaryAbSlot,
  }
}

export const ALL_ROTATION_PAIRS: CoachRotationPair[] = ['POS_3_8', 'POS_4_9', 'POS_5_10']

export function getPairLabel(pair: CoachRotationPair): string {
  const { lower, higher } = ROTATION_CONFIG[pair]
  return `Pos ${lower}+${higher}`
}

export function getPairPositions(pair: CoachRotationPair): [number, number] {
  const { lower, higher } = ROTATION_CONFIG[pair]
  return [lower, higher]
}

export function scoreRotationPair(pair: CoachRotationPair, lineup: CoachRotationLineupRow[]): number {
  let score = 100
  const config = ROTATION_CONFIG[pair]

  for (const pos of [config.lower, config.higher]) {
    const entry = lineup.find(e => e.battingOrder === pos)
    if (!entry) {
      score -= 40
      continue
    }
    if (entry.position === 'P') score -= 50
    if (entry.battingOrder === 4) score -= 30
  }

  if (pair !== 'POS_5_10') score -= 5

  return score
}

export function recommendRotationPair(lineup: CoachRotationLineupRow[]): CoachRotationPair {
  const scored = ALL_ROTATION_PAIRS.map(p => ({ pair: p, score: scoreRotationPair(p, lineup) }))
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.pair === 'POS_5_10') return -1
    if (b.pair === 'POS_5_10') return 1
    return 0
  })
  return scored[0].pair
}
