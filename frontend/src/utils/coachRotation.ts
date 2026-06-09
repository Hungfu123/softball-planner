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
  reversed: boolean                // Richtung umgedreht (Primary = niedrigerer Slot)
  primary: ResolvedCoachSide       // steht meiste Zeit an Base
  backup: ResolvedCoachSide        // übernimmt während Primary's Warmup + Schlag
  backupCoverRange: string         // z.B. "#8 – #10" (Schlag-Fenster, das Backup abdeckt)
  primaryAbSlot: string            // z.B. "#10"
}

interface RotationConfig {
  lower: number              // niedrigere Lineup-Position
  higher: number             // höhere Lineup-Position
}

const ROTATION_CONFIG: Record<CoachRotationPair, RotationConfig> = {
  POS_1_6:  { lower: 1, higher: 6 },
  POS_2_7:  { lower: 2, higher: 7 },
  POS_3_8:  { lower: 3, higher: 8 },
  POS_4_9:  { lower: 4, higher: 9 },
  POS_5_10: { lower: 5, higher: 10 },
}

/** Schlag-Slots [primary-2, primary-1, primary], in 1..n umgebrochen (wrap über Inning-Grenze).
 *  Contiguous → "#6–#8", sonst Liste "#9, #10, #1". */
function coverRange(primaryPos: number, n: number): string {
  if (n < 1) return `#${primaryPos}`
  const slots = [primaryPos - 2, primaryPos - 1, primaryPos].map(s => ((s - 1 + n) % n) + 1)
  const contiguous = slots[1] === slots[0] + 1 && slots[2] === slots[1] + 1
  return contiguous ? `#${slots[0]}–#${slots[2]}` : slots.map(s => `#${s}`).join(', ')
}

export function resolveRotation(
  pair: CoachRotationPair,
  lineup: CoachRotationLineupRow[],
  reversed = false,
): ResolvedRotation {
  const { lower, higher } = ROTATION_CONFIG[pair]
  // Default: Primary = höherer Slot (längste Pause bis nächster Schlag). Reversed dreht das um.
  const primaryPos = reversed ? lower : higher
  const backupPos = reversed ? higher : lower
  const primaryEntry = lineup.find(e => e.battingOrder === primaryPos)
  const backupEntry = lineup.find(e => e.battingOrder === backupPos)

  return {
    pair,
    reversed,
    primary: { name: primaryEntry?.player.name ?? '—', pos: primaryPos },
    backup:  { name: backupEntry?.player.name  ?? '—', pos: backupPos },
    backupCoverRange: coverRange(primaryPos, lineup.length),
    primaryAbSlot: `#${primaryPos}`,
  }
}

export const ALL_ROTATION_PAIRS: CoachRotationPair[] = ['POS_1_6', 'POS_2_7', 'POS_3_8', 'POS_4_9', 'POS_5_10']

/** Paare, deren beide Positionen im Lineup existieren (höhere Position ≤ Spieleranzahl).
 *  9 Spieler → POS_1_6…POS_4_9 (POS_5_10 braucht Position 10). */
export function validRotationPairs(lineup: CoachRotationLineupRow[]): CoachRotationPair[] {
  return ALL_ROTATION_PAIRS.filter(p => ROTATION_CONFIG[p].higher <= lineup.length)
}

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
    // Leadoff/Table-Setter (#1, #2) nicht ins Coaching ziehen → nur manuell wählbar, nie empfohlen
    if (entry.battingOrder <= 2) score -= 40
  }

  if (pair !== 'POS_5_10') score -= 5

  return score
}

export function recommendRotationPair(lineup: CoachRotationLineupRow[]): CoachRotationPair {
  const valid = validRotationPairs(lineup)
  const pool = valid.length > 0 ? valid : ALL_ROTATION_PAIRS
  const scored = pool.map(p => ({ pair: p, score: scoreRotationPair(p, lineup) }))
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.pair === 'POS_5_10') return -1
    if (b.pair === 'POS_5_10') return 1
    return 0
  })
  return scored[0].pair
}
