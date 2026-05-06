import { describe, it, expect } from 'vitest'
import { cellKey, renderCells, type CellMap } from './bogenSheetRenderer'
import type { SpielbogenAtBatResponse } from '@/types'

describe('cellKey', () => {
  it('joins side, slot, inning with pipes', () => {
    expect(cellKey('HOME', 7, 3)).toBe('HOME|7|3')
  })
})

function ab(o: Partial<SpielbogenAtBatResponse>): SpielbogenAtBatResponse {
  return {
    id: 1, bogenId: 1, slotId: 1, side: 'HOME', sequence: 1, inning: 1,
    result: 'SINGLE', outType: null, fielderChain: null, isError: null,
    errorPosition: null, runsScored: 0, rbi: 0, baseStateAfter: null, createdAt: '',
    ...o,
    sacrificeType: o.sacrificeType ?? null,
  }
}

describe('renderCells — outIndex multi-event', () => {
  it('Cell mit AB-Out (I) + späterem Stealing-Out (III) zeigt "I, III"', () => {
    // Tim slot=76: AB seq 4 K (1st out), Stealing OUT_ON_PLAY auf seinem Slot (3rd out)
    const tim_k = ab({ id: 1, slotId: 76, sequence: 4, inning: 1, result: 'STRIKEOUT', createdAt: '2026-01-01T10:00:00Z' })
    const andrea_out = ab({ id: 2, slotId: 79, sequence: 7, inning: 1, result: 'OUT', outType: 'GROUNDER', fielderChain: [6, 3], createdAt: '2026-01-01T10:01:00Z' })
    const cs = { id: 1, bogenId: 1, slotId: 76, side: 'HOME' as const, inning: 1, type: 'OUT_ON_PLAY' as const, fromBase: 2, toBase: 3, createdAt: '2026-01-01T10:02:00Z' }
    const cells = renderCells([tim_k, andrea_out], [cs])
    expect(cells.get('HOME|76|1')!.outIndex).toBe('I, III')
    expect(cells.get('HOME|79|1')!.outIndex).toBe('II')
  })

  it('DP outIndex "I-II" + späteres Stealing "III" auf gleicher Cell → "I-II, III"', () => {
    const dp = ab({ id: 1, slotId: 5, sequence: 1, inning: 1, result: 'OUT', outType: 'DOUBLE_PLAY', fielderChain: [6, 4, 3], createdAt: '2026-01-01T10:00:00Z' })
    const cs = { id: 2, bogenId: 1, slotId: 5, side: 'HOME' as const, inning: 1, type: 'CAUGHT_STEALING' as const, fromBase: 1, toBase: 2, createdAt: '2026-01-01T10:01:00Z' }
    const cells = renderCells([dp], [cs])
    expect(cells.get('HOME|5|1')!.outIndex).toBe('I-II, III')
  })
})

describe('renderCells — inningEnd-Marker', () => {
  it('markiert NUR Cell des AB der outs auf 3 hebt', () => {
    // Inning 2: Tim K (out 1), other ABs no out, Pascal DP (outs 2-3 → 3rd out)
    const tim = ab({ id: 1, slotId: 4, sequence: 10, inning: 2, result: 'STRIKEOUT' })
    const reach1 = ab({ id: 2, slotId: 6, sequence: 11, inning: 2, result: 'SINGLE' })
    const reach2 = ab({ id: 3, slotId: 7, sequence: 12, inning: 2, result: 'SINGLE' })
    const pascal = ab({ id: 4, slotId: 5, sequence: 20, inning: 2, result: 'OUT', outType: 'DOUBLE_PLAY', fielderChain: [6, 4, 3] })
    const cells = renderCells([tim, reach1, reach2, pascal], [])
    expect(cells.get('HOME|4|2')!.inningEnd).toBe(false)
    expect(cells.get('HOME|6|2')!.inningEnd).toBe(false)
    expect(cells.get('HOME|7|2')!.inningEnd).toBe(false)
    expect(cells.get('HOME|5|2')!.inningEnd).toBe(true)
  })

  it('markiert nicht wenn Inning <3 outs hat (laufendes Inning)', () => {
    const tim = ab({ id: 1, slotId: 4, sequence: 10, inning: 2, result: 'STRIKEOUT' })
    const cells = renderCells([tim], [])
    expect(cells.get('HOME|4|2')!.inningEnd).toBe(false)
  })

  it('Stealing OUT_ON_PLAY als 3rd-Out markiert Stealing-Cell', () => {
    const ab1 = ab({ id: 1, slotId: 4, sequence: 10, inning: 2, result: 'STRIKEOUT', createdAt: '2026-01-01T10:00:00Z' })
    const ab2 = ab({ id: 2, slotId: 5, sequence: 11, inning: 2, result: 'STRIKEOUT', createdAt: '2026-01-01T10:01:00Z' })
    const cs = { id: 1, bogenId: 1, slotId: 6, side: 'HOME' as const, inning: 2, type: 'CAUGHT_STEALING' as const, fromBase: 1, toBase: 2, createdAt: '2026-01-01T10:02:00Z' }
    const cells = renderCells([ab1, ab2], [cs])
    expect(cells.get('HOME|4|2')!.inningEnd).toBe(false)
    expect(cells.get('HOME|5|2')!.inningEnd).toBe(false)
    expect(cells.get('HOME|6|2')!.inningEnd).toBe(true)
  })

  it('Sequence-basiert: ignoriert createdAt-Zeitstempel-Verschiebung durch correctLastAtBat', () => {
    // Tim K wurde corrected → createdAt updated zu "later" als Pascal DP.
    // Aber sequence bleibt korrekt: Tim seq=10 vor Pascal seq=20.
    // Marker muss Pascal kriegen, nicht Tim.
    const tim = ab({ id: 1, slotId: 4, sequence: 10, inning: 2, result: 'STRIKEOUT', createdAt: '2026-01-01T11:00:00Z' })
    const pascal = ab({ id: 2, slotId: 5, sequence: 20, inning: 2, result: 'OUT', outType: 'DOUBLE_PLAY', fielderChain: [6, 4, 3], createdAt: '2026-01-01T10:00:00Z' })
    const cells = renderCells([tim, pascal], [])
    expect(cells.get('HOME|4|2')!.inningEnd).toBe(false)
    expect(cells.get('HOME|5|2')!.inningEnd).toBe(true)
  })
})

describe("renderCells — Fielder's Choice", () => {
  it("labels FC + chain, batter on 1B counts as reach=1", () => {
    const fc = ab({
      slotId: 5, result: 'OUT', outType: 'FIELDERS_CHOICE',
      fielderChain: [6, 4],
      baseStateAfter: { firstSlotId: 5, secondSlotId: null, thirdSlotId: null },
    })
    const cells: CellMap = renderCells([fc], [])
    const cell = cells.get('HOME|5|1')!
    expect(cell.primaryLabel).toBe('FC 6-4')
    expect(cell.reachedBase).toBe(1)
    expect(cell.outIndex).toBe('I')
  })
})

describe('renderCells — Wild Pitch / Passed Ball', () => {
  it("attaches WP arrow to the runner's cell with correct toBase", () => {
    const walk = ab({ slotId: 7, result: 'WALK', baseStateAfter: { firstSlotId: 7, secondSlotId: null, thirdSlotId: null } })
    const wp = { id: 1, bogenId: 1, slotId: 7, side: 'HOME' as const, inning: 1, type: 'WILD_PITCH' as const, fromBase: 1, toBase: 2, createdAt: '' }
    const cells = renderCells([walk], [wp])
    const cell = cells.get('HOME|7|1')!
    expect(cell.stealingArrow?.type).toBe('WILD_PITCH')
    expect(cell.reachedBase).toBe(2)
  })

  it('PB advancing to home marks runScored', () => {
    const walk = ab({ slotId: 7, result: 'WALK', baseStateAfter: { firstSlotId: null, secondSlotId: null, thirdSlotId: 7 } })
    const pb = { id: 1, bogenId: 1, slotId: 7, side: 'HOME' as const, inning: 1, type: 'PASSED_BALL' as const, fromBase: 3, toBase: 4, createdAt: '' }
    const cells = renderCells([walk], [pb])
    const cell = cells.get('HOME|7|1')!
    expect(cell.runScored).toBe(true)
    expect(cell.reachedBase).toBe(4)
  })
})

describe('renderCells — Sacrifice', () => {
  it('Sac Fly suffix is "SF"', () => {
    const sf = ab({ slotId: 3, result: 'OUT', outType: 'FLY', sacrificeType: 'FLY', fielderChain: [8], rbi: 1 })
    const cells = renderCells([sf], [])
    expect(cells.get('HOME|3|1')!.primaryLabel).toBe('F8 SF')
  })

  it('Sac Bunt suffix is "SH"', () => {
    const sh = ab({ slotId: 3, result: 'OUT', outType: 'GROUNDER', sacrificeType: 'BUNT', fielderChain: [1, 3] })
    const cells = renderCells([sh], [])
    expect(cells.get('HOME|3|1')!.primaryLabel).toBe('1-3 SH')
  })
})
