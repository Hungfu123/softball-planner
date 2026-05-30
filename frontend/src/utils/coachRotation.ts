import type { CoachRotationPair } from '@/types'

export interface CoachRotationLineupRow {
  battingOrder: number
  position: string | null
  player: { name: string }
}

interface ResolvedCoachSide {
  name: string
  pos: number
  range: string
  warmup: string
}

export interface ResolvedRotation {
  pair: CoachRotationPair
  higher: ResolvedCoachSide
  lower: ResolvedCoachSide
}

interface RotationConfig {
  lower: number
  higher: number
  lowerRange: string
  higherRange: string
  lowerWarmup: string
  higherWarmup: string
}

const ROTATION_CONFIG: Record<CoachRotationPair, RotationConfig> = {
  POS_3_8:  { lower: 3, higher: 8,  lowerRange: '4–8',  higherRange: '9–10, 1–3', lowerWarmup: '#1–#2', higherWarmup: '#6–#7' },
  POS_4_9:  { lower: 4, higher: 9,  lowerRange: '5–9',  higherRange: '10, 1–4',   lowerWarmup: '#2–#3', higherWarmup: '#7–#8' },
  POS_5_10: { lower: 5, higher: 10, lowerRange: '6–10', higherRange: '1–5',       lowerWarmup: '#3–#4', higherWarmup: '#8–#9' },
}

export function resolveRotation(pair: CoachRotationPair, lineup: CoachRotationLineupRow[]): ResolvedRotation {
  const config = ROTATION_CONFIG[pair]
  const higherEntry = lineup.find(e => e.battingOrder === config.higher)
  const lowerEntry  = lineup.find(e => e.battingOrder === config.lower)

  return {
    pair,
    higher: {
      name: higherEntry?.player.name ?? '—',
      pos: config.higher,
      range: config.higherRange,
      warmup: config.higherWarmup,
    },
    lower: {
      name: lowerEntry?.player.name ?? '—',
      pos: config.lower,
      range: config.lowerRange,
      warmup: config.lowerWarmup,
    },
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
