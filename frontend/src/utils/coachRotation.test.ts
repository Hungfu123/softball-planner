import { describe, it, expect } from 'vitest'
import type { CoachRotationLineupRow } from './coachRotation'
import {
  resolveRotation,
  scoreRotationPair,
  recommendRotationPair,
  getPairLabel,
  getPairPositions,
} from './coachRotation'

function makeEntry(battingOrder: number, name: string, position: string | null = 'LF'): CoachRotationLineupRow {
  return { battingOrder, position, player: { name } }
}

const fullLineup: CoachRotationLineupRow[] = [
  makeEntry(1, 'Khang', 'EH'),
  makeEntry(2, 'Hung', 'CF'),
  makeEntry(3, 'Yuki', 'SS'),
  makeEntry(4, 'Mitchi', 'LF'),
  makeEntry(5, 'Mike', '3B'),
  makeEntry(6, 'Miriam', 'C'),
  makeEntry(7, 'Martin', '1B'),
  makeEntry(8, 'Madita', 'P'),
  makeEntry(9, 'Vivi', '2B'),
  makeEntry(10, 'Tristan', 'RF'),
]

describe('resolveRotation', () => {
  it('POS_5_10 maps Primary=Tristan (Pos 10), Backup=Mike (Pos 5)', () => {
    const r = resolveRotation('POS_5_10', fullLineup)
    expect(r.primary.name).toBe('Tristan')
    expect(r.primary.pos).toBe(10)
    expect(r.backup.name).toBe('Mike')
    expect(r.backup.pos).toBe(5)
    expect(r.backupCoverRange).toBe('#8–#10')
    expect(r.primaryAbSlot).toBe('#10')
  })

  it('POS_4_9 maps Primary=Vivi (Pos 9), Backup=Mitchi (Pos 4)', () => {
    const r = resolveRotation('POS_4_9', fullLineup)
    expect(r.primary.name).toBe('Vivi')
    expect(r.primary.pos).toBe(9)
    expect(r.backup.name).toBe('Mitchi')
    expect(r.backup.pos).toBe(4)
    expect(r.backupCoverRange).toBe('#7–#9')
    expect(r.primaryAbSlot).toBe('#9')
  })

  it('POS_3_8 maps Primary=Madita (Pos 8), Backup=Yuki (Pos 3)', () => {
    const r = resolveRotation('POS_3_8', fullLineup)
    expect(r.primary.name).toBe('Madita')
    expect(r.primary.pos).toBe(8)
    expect(r.backup.name).toBe('Yuki')
    expect(r.backup.pos).toBe(3)
    expect(r.backupCoverRange).toBe('#6–#8')
  })

  it('returns em-dash when position not in lineup', () => {
    const r = resolveRotation('POS_5_10', fullLineup.slice(0, 8))
    expect(r.primary.name).toBe('—')
  })
})

describe('scoreRotationPair', () => {
  it('POS_5_10 has highest score for default Trier-Lineup', () => {
    expect(scoreRotationPair('POS_5_10', fullLineup))
      .toBeGreaterThan(scoreRotationPair('POS_3_8', fullLineup))
    expect(scoreRotationPair('POS_5_10', fullLineup))
      .toBeGreaterThan(scoreRotationPair('POS_4_9', fullLineup))
  })

  it('penalizes Pitcher on coach position', () => {
    expect(scoreRotationPair('POS_3_8', fullLineup)).toBeLessThanOrEqual(50)
  })

  it('penalizes cleanup hitter on Pos 4', () => {
    expect(scoreRotationPair('POS_4_9', fullLineup)).toBeLessThanOrEqual(70)
  })

  it('penalizes wrap pairs by 5', () => {
    const noPitcher = fullLineup.map(e => e.position === 'P' ? { ...e, position: 'LF' } : e)
    expect(scoreRotationPair('POS_5_10', noPitcher))
      .toBeGreaterThan(scoreRotationPair('POS_3_8', noPitcher))
  })
})

describe('recommendRotationPair', () => {
  it('recommends POS_5_10 for default Trier-Lineup', () => {
    expect(recommendRotationPair(fullLineup)).toBe('POS_5_10')
  })
})

describe('getPairLabel', () => {
  it('formats label correctly', () => {
    expect(getPairLabel('POS_5_10')).toBe('Pos 5+10')
    expect(getPairLabel('POS_3_8')).toBe('Pos 3+8')
    expect(getPairLabel('POS_4_9')).toBe('Pos 4+9')
  })
})

describe('getPairPositions', () => {
  it('returns [lower, higher] positions', () => {
    expect(getPairPositions('POS_5_10')).toEqual([5, 10])
    expect(getPairPositions('POS_4_9')).toEqual([4, 9])
    expect(getPairPositions('POS_3_8')).toEqual([3, 8])
  })
})
