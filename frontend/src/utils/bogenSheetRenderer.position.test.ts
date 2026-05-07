import { describe, it, expect } from 'vitest'
import { positionToNumber, computePositionHistoryPerSlot } from './bogenSheetRenderer'

describe('positionToNumber', () => {
  it('maps abbreviations to RFL numbers', () => {
    expect(positionToNumber('P')).toBe('1')
    expect(positionToNumber('C')).toBe('2')
    expect(positionToNumber('SS')).toBe('6')
    expect(positionToNumber('RF')).toBe('9')
  })
  it('passes through numeric strings', () => {
    expect(positionToNumber('5')).toBe('5')
  })
  it('returns null for unknown positions like EH', () => {
    expect(positionToNumber('EH')).toBeNull()
    expect(positionToNumber(null)).toBeNull()
  })
})

describe('computePositionHistoryPerSlot', () => {
  it('returns single position when no changes', () => {
    const map = computePositionHistoryPerSlot(
      [{ id: 1, position: 'P' }],
      [],
    )
    expect(map.get(1)).toEqual(['P'])
  })
  it('returns chronological history when changes exist', () => {
    const map = computePositionHistoryPerSlot(
      [{ id: 1, position: 'C' }],
      [
        { slotId: 1, inning: 3, oldPosition: 'P', newPosition: 'C', createdAt: '2026-05-07T10:00:00Z' },
      ],
    )
    expect(map.get(1)).toEqual(['P', 'C'])
  })
  it('handles multiple changes in inning order', () => {
    const map = computePositionHistoryPerSlot(
      [{ id: 1, position: 'SS' }],
      [
        { slotId: 1, inning: 5, oldPosition: 'C', newPosition: 'SS', createdAt: '2026-05-07T11:00:00Z' },
        { slotId: 1, inning: 3, oldPosition: 'P', newPosition: 'C', createdAt: '2026-05-07T10:00:00Z' },
      ],
    )
    expect(map.get(1)).toEqual(['P', 'C', 'SS'])
  })
})
