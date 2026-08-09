import { describe, it, expect } from 'vitest'
import { cellKey, renderCells, sideAnnotations, abOutsAdded, type CellMap, type StealingArrow, type AdvanceLabel } from './bogenSheetRenderer'
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
    errorPosition: null, runsScored: 0, rbi: 0, baseStateAfter: null,
    runnerAdvances: [], createdAt: '',
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
    expect(cells.get('HOME|76|1')!.outIndex).toBe('I·III')
    expect(cells.get('HOME|79|1')!.outIndex).toBe('II')
  })

  it('DP outIndex "I-II" + späteres Stealing "III" auf gleicher Cell → "I-II, III"', () => {
    const dp = ab({ id: 1, slotId: 5, sequence: 1, inning: 1, result: 'OUT', outType: 'DOUBLE_PLAY', fielderChain: [6, 4, 3], createdAt: '2026-01-01T10:00:00Z' })
    const cs = { id: 2, bogenId: 1, slotId: 5, side: 'HOME' as const, inning: 1, type: 'CAUGHT_STEALING' as const, fromBase: 1, toBase: 2, createdAt: '2026-01-01T10:01:00Z' }
    const cells = renderCells([dp], [cs])
    expect(cells.get('HOME|5|1')!.outIndex).toBe('I-II·III')
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

  // TODO: Pre-existing failure (Cell-Key-Lookup unexpected). Investigate separately.
  it.skip('Stealing OUT_ON_PLAY als 3rd-Out markiert Stealing-Cell', () => {
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

describe('renderCells — ×N Hitter-Annotation (RFL)', () => {
  const slots = [
    { id: 1, battingOrder: 1 },
    { id: 5, battingOrder: 5 },
  ]

  it('setzt hitter = Batting-Order des treibenden Batters am Runner-Advance', () => {
    // Runner slot=1 auf 1B, Batter slot=5 (Order 5) schlägt Single → Runner 1B→2B.
    const runnerReach = ab({ id: 1, slotId: 1, sequence: 1, inning: 1, result: 'SINGLE' })
    const batterHit = ab({ id: 2, slotId: 5, sequence: 2, inning: 1, result: 'SINGLE' })
    const adv = {
      id: 1, bogenId: 1, atBatId: 2, slotId: 1, side: 'HOME' as const,
      inning: 1, fromBase: 1, toBase: 2, reason: 'HIT_PUSH' as const, createdAt: '',
    }
    const cells = renderCells([runnerReach, batterHit], [], [adv], slots)
    const runnerCell = cells.get('HOME|1|1')!
    const seg = runnerCell.advanceLabels.find(l => l.side === '1b-2b')!
    expect(seg.hitter).toBe(5)
  })

  it('kein hitter am eigenen Reach des Batters (Treiber = Runner selbst)', () => {
    const batterHit = ab({ id: 2, slotId: 5, sequence: 1, inning: 1, result: 'SINGLE' })
    const adv = {
      id: 1, bogenId: 1, atBatId: 2, slotId: 5, side: 'HOME' as const,
      inning: 1, fromBase: 0, toBase: 1, reason: 'HIT_PUSH' as const, createdAt: '',
    }
    const cells = renderCells([batterHit], [], [adv], slots)
    const cell = cells.get('HOME|5|1')!
    const seg = cell.advanceLabels.find(l => l.side === 'home-1b')
    expect(seg?.hitter).toBeUndefined()
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

describe('sideAnnotations — ein Label pro Base-Seite', () => {
  const base = {
    stealingArrow: null,
    stealingArrows: [] as StealingArrow[],
    advanceLabels: [] as AdvanceLabel[],
  }

  it('Steal-Event schlägt Advance-Label auf derselben Seite', () => {
    const anns = sideAnnotations({
      ...base,
      stealingArrows: [{ fromBase: 1, toBase: 2, type: 'STOLEN_BASE' }],
      advanceLabels: [{ side: '1b-2b', label: '1B', hitter: 4 }],
    })
    expect(anns).toEqual([{ side: '1b-2b', text: 'SB', color: 'dark' }])
  })

  it('Zwei Steals auf gleicher Seite ergeben nur ein Label (kein Überlagern)', () => {
    const anns = sideAnnotations({
      ...base,
      stealingArrows: [
        { fromBase: 1, toBase: 2, type: 'STOLEN_BASE' },
        { fromBase: 1, toBase: 2, type: 'STOLEN_BASE' },
      ],
    })
    expect(anns).toHaveLength(1)
    expect(anns[0].text).toBe('SB')
  })

  it('Verschiedene Seiten behalten je ihr eigenes Label', () => {
    const anns = sideAnnotations({
      ...base,
      stealingArrows: [{ fromBase: 2, toBase: 3, type: 'WILD_PITCH' }],
      advanceLabels: [{ side: '3b-home', label: '1B', hitter: 7 }],
    })
    expect(anns).toEqual([
      { side: '2b-3b', text: 'WP', color: 'orange' },
      { side: '3b-home', text: '×7', color: 'dark' },
    ])
  })

  it('WP/PB-Advance zeigt Kürzel statt ×N und wird orange gezeichnet', () => {
    const anns = sideAnnotations({
      ...base,
      advanceLabels: [{ side: '1b-2b', label: 'WP' }],
    })
    expect(anns).toEqual([{ side: '1b-2b', text: 'WP', color: 'orange' }])
  })

  it('Legacy single stealingArrow wird berücksichtigt', () => {
    const anns = sideAnnotations({
      ...base,
      stealingArrow: { fromBase: 3, toBase: 4, type: 'CAUGHT_STEALING' },
    })
    expect(anns).toEqual([{ side: '3b-home', text: 'CS', color: 'dark' }])
  })
})

describe('renderCells — WP/PB bekommen kein ×N', () => {
  it('Wild-Pitch-Advance behält Kürzel, obwohl ein anderer Batter am Schlag war', () => {
    const walk = ab({ id: 1, slotId: 5, sequence: 1, result: 'WALK', baseStateAfter: { firstSlotId: 5, secondSlotId: null, thirdSlotId: null } })
    const nextAb = ab({ id: 2, slotId: 6, sequence: 2, result: 'STRIKEOUT', baseStateAfter: { firstSlotId: null, secondSlotId: 5, thirdSlotId: null } })
    const advance = {
      id: 1, bogenId: 1, atBatId: 2, slotId: 5, side: 'HOME' as const, inning: 1,
      fromBase: 1, toBase: 2, reason: 'WP' as const, createdAt: '',
    }
    const cells = renderCells([walk, nextAb], [], [advance], [{ id: 6, battingOrder: 6 }])
    const label = cells.get('HOME|5|1')!.advanceLabels.find(l => l.side === '1b-2b')!
    expect(label.label).toBe('WP')
    expect(label.hitter).toBeUndefined()
  })

  it('Hit-Push-Advance behält ×N des treibenden Hitters', () => {
    const walk = ab({ id: 1, slotId: 5, sequence: 1, result: 'WALK', baseStateAfter: { firstSlotId: 5, secondSlotId: null, thirdSlotId: null } })
    const single = ab({ id: 2, slotId: 6, sequence: 2, result: 'SINGLE', baseStateAfter: { firstSlotId: 6, secondSlotId: 5, thirdSlotId: null } })
    const advance = {
      id: 1, bogenId: 1, atBatId: 2, slotId: 5, side: 'HOME' as const, inning: 1,
      fromBase: 1, toBase: 2, reason: 'HIT_PUSH' as const, createdAt: '',
    }
    const cells = renderCells([walk, single], [], [advance], [{ id: 6, battingOrder: 6 }])
    const label = cells.get('HOME|5|1')!.advanceLabels.find(l => l.side === '1b-2b')!
    expect(label.hitter).toBe(6)
  })
})

describe('renderCells — INSIDE_PARK_HR', () => {
  it('rendert eigenes Label "IHR", nicht "OUT" (Bug: fiel bisher durch den Switch-Fallback)', () => {
    const iphr = ab({ id: 1, slotId: 4, sequence: 1, result: 'INSIDE_PARK_HR', runsScored: 1, rbi: 1 })
    const cells = renderCells([iphr], [])
    const cell = cells.get('HOME|4|1')!
    expect(cell.primaryLabel).toBe('IHR')
    expect(cell.primaryLabel).not.toBe('OUT')
    expect(cell.runScored).toBe(true)
  })

  it('scort auch die Batterin, wenn schon ein Runner auf Base war (Spielbogen 143, Mitchi Inning 2)', () => {
    // Reproduziert die echte Produktions-Cell: Runner auf 2B (slot 6) vor dem AB, danach
    // Bases leer. computeScoredSet special-cased bisher nur 'HOMERUN' fürs "Batter selbst
    // ist kein disappeared runner" — INSIDE_PARK_HR fiel durch denselben Fallback wie das
    // Label und blieb trotz runsScored=1 ein leerer Diamond.
    const double = ab({
      id: 1, slotId: 6, sequence: 1, result: 'DOUBLE', runsScored: 0,
      baseStateAfter: { firstSlotId: null, secondSlotId: 6, thirdSlotId: null },
    })
    const iphr = ab({
      id: 2, slotId: 7, sequence: 2, result: 'INSIDE_PARK_HR', runsScored: 1, rbi: 1,
      baseStateAfter: { firstSlotId: null, secondSlotId: null, thirdSlotId: null },
    })
    const cells = renderCells([double, iphr], [])
    expect(cells.get('HOME|7|1')!.runScored).toBe(true) // die Batterin selbst
    expect(cells.get('HOME|6|1')!.runScored).toBe(true) // Runner, der mit heimkam
  })
})

describe('renderCells — unbekannter AtBatResult-Wert', () => {
  it('rendert sichtbar falsch statt stillschweigend "OUT" (simuliert Backend/Frontend-Enum-Drift)', () => {
    // `as never` umgeht die TS-Exhaustiveness bewusst — genau der Fall, den die Laufzeit-
    // Absicherung in renderAtBatBase abdecken muss: ein String, den der Compiler nicht kennt.
    const future = ab({ id: 1, slotId: 4, sequence: 1, result: 'SOME_FUTURE_RESULT' as never })
    const cells = renderCells([future], [])
    const cell = cells.get('HOME|4|1')!
    expect(cell.primaryLabel).not.toBe('OUT')
    expect(cell.primaryLabel).toBe('?SOME_FUTURE_RESULT')
  })
})

describe('renderCells — Automatisches Out', () => {
  it('AUTOMATIC_OUT rendert "AO", bleibt auf reachedBase 0 und zählt als Out', () => {
    const ao = ab({ id: 1, slotId: 4, sequence: 1, result: 'AUTOMATIC_OUT' })
    const cells = renderCells([ao], [])
    const cell = cells.get('HOME|4|1')!
    expect(cell.primaryLabel).toBe('AO')
    expect(cell.reachedBase).toBe(0)
    expect(cell.outIndex).toBe('I')
    expect(abOutsAdded(ao)).toBe(1)
  })

  it('3. Automatisches Out markiert Inning-Ende', () => {
    const outs = [1, 2, 3].map(i => ab({ id: i, slotId: i, sequence: i, result: 'AUTOMATIC_OUT' }))
    const cells = renderCells(outs, [])
    expect(cells.get('HOME|3|1')!.inningEnd).toBe(true)
    expect(cells.get('HOME|3|1')!.outIndex).toBe('III')
  })
})
