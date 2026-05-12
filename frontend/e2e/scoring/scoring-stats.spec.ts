import { test, expect } from '../helpers/fixtures'
import { getBattingStats, seedAtBat } from '../helpers/api'

/**
 * Verifiziert dass batting-stats korrekt aus AtBats berechnet werden.
 * Per Player deterministisch via seedAtBat (überspringt Lineup-Rotation).
 */
test.describe('Scoring — Batting Stats', () => {
  test('mixed events: SINGLE + WALK + HOMERUN + OUT + STRIKEOUT für 1 Batter @smoke', async ({ scoringPage }) => {
    const playerId = scoringPage.playerIds[0]

    // 5 ABs für playerIds[0] mit unterschiedlichen Results
    await seedAtBat(scoringPage.gameId, playerId, 'SINGLE', 1, { first: playerId, second: null, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, playerId, 'WALK', 1, { first: playerId, second: null, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, playerId, 'HOMERUN', 1, { first: null, second: null, third: null }, 1, 1)
    await seedAtBat(scoringPage.gameId, playerId, 'OUT', 1, { first: null, second: null, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, playerId, 'STRIKEOUT', 1, { first: null, second: null, third: null }, 0, 0)

    const stats = await getBattingStats(scoringPage.gameId)
    const p = stats.find(s => s.playerId === playerId)
    expect(p).toBeDefined()
    expect(p!.plateAppearances).toBe(5)
    // AB = PA minus Walks und HBP (Standard MLB Rule)
    expect(p!.atBats).toBe(4)
    expect(p!.hits).toBe(2)             // SINGLE + HOMERUN
    expect(p!.singles).toBe(1)
    expect(p!.doubles).toBe(0)
    expect(p!.triples).toBe(0)
    expect(p!.homeRuns).toBe(1)
    expect(p!.walks).toBe(1)
    expect(p!.hitByPitch).toBe(0)
    expect(p!.strikeouts).toBe(1)
    expect(p!.outs).toBe(1)
    expect(p!.reachedOnError).toBe(0)
    expect(p!.totalBases).toBe(5)        // 1 (SINGLE) + 4 (HR)
    expect(p!.runsBattedIn).toBe(1)
    // BA = hits/AB = 2/4 = .500
    expect(Number(p!.battingAverage)).toBeCloseTo(0.500, 3)
    // OBP = (H + BB + HBP) / PA = (2 + 1 + 0) / 5 = .600
    expect(Number(p!.onBasePct)).toBeCloseTo(0.600, 3)
    // SLG = TB / AB = 5 / 4 = 1.250
    expect(Number(p!.sluggingPct)).toBeCloseTo(1.250, 3)
    // OPS = OBP + SLG = 0.600 + 1.250 = 1.850
    expect(Number(p!.ops)).toBeCloseTo(1.850, 3)
  })

  test('REACHED_ON_ERROR: zählt als AB aber NICHT als Hit (BA-Penalty)', async ({ scoringPage }) => {
    const playerId = scoringPage.playerIds[0]

    // 4 ABs: 2 ROE + 2 OUT
    await seedAtBat(scoringPage.gameId, playerId, 'REACHED_ON_ERROR', 1, { first: playerId, second: null, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, playerId, 'REACHED_ON_ERROR', 1, { first: playerId, second: null, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, playerId, 'OUT', 1, { first: null, second: null, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, playerId, 'OUT', 1, { first: null, second: null, third: null }, 0, 0)

    const stats = await getBattingStats(scoringPage.gameId)
    const p = stats.find(s => s.playerId === playerId)!
    expect(p.plateAppearances).toBe(4)
    expect(p.atBats).toBe(4)              // ROE counts as AB
    expect(p.hits).toBe(0)                // ROE NOT a hit
    expect(p.reachedOnError).toBe(2)
    expect(p.outs).toBe(2)
    expect(p.totalBases).toBe(0)
    // BA = 0/4 = .000 (ROE penalty)
    expect(Number(p.battingAverage)).toBeCloseTo(0.000, 3)
    // OBP = (0 + 0 + 0) / 4 = .000 (ROE not in numerator)
    expect(Number(p.onBasePct)).toBeCloseTo(0.000, 3)
  })

  test('HBP zählt als PA aber NICHT als AB', async ({ scoringPage }) => {
    const playerId = scoringPage.playerIds[0]

    await seedAtBat(scoringPage.gameId, playerId, 'HIT_BY_PITCH', 1, { first: playerId, second: null, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, playerId, 'SINGLE', 1, { first: playerId, second: null, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, playerId, 'OUT', 1, { first: null, second: null, third: null }, 0, 0)

    const stats = await getBattingStats(scoringPage.gameId)
    const p = stats.find(s => s.playerId === playerId)!
    expect(p.plateAppearances).toBe(3)
    expect(p.atBats).toBe(2)              // HBP exempt from AB
    expect(p.hits).toBe(1)
    expect(p.hitByPitch).toBe(1)
    // BA = 1/2 = .500
    expect(Number(p.battingAverage)).toBeCloseTo(0.500, 3)
    // OBP = (1 + 0 + 1) / 3 = .667
    expect(Number(p.onBasePct)).toBeCloseTo(0.667, 3)
  })

  test('TRIPLE: 3 totalBases + RBI nur wenn Runner scort', async ({ scoringPage }) => {
    const playerId = scoringPage.playerIds[0]

    // TRIPLE mit 2 RBI (bases-loaded → 2 runners scoren, batter auf 3B)
    await seedAtBat(scoringPage.gameId, playerId, 'TRIPLE', 1, { first: null, second: null, third: playerId }, 2, 2)

    const stats = await getBattingStats(scoringPage.gameId)
    const p = stats.find(s => s.playerId === playerId)!
    expect(p.triples).toBe(1)
    expect(p.hits).toBe(1)
    expect(p.totalBases).toBe(3)
    expect(p.runsBattedIn).toBe(2)
    expect(Number(p.sluggingPct)).toBeCloseTo(3.000, 3) // 3/1
  })
})
