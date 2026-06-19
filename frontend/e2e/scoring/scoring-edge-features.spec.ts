import { test, expect, recordHitViaUI, recordDirectViaUI, clickUndo } from '../helpers/fixtures'
import { getBattingStats, getScoreboard, seedAtBat } from '../helpers/api'

test.describe('Scoring — Edge Features', () => {
  test('Overthrow: alle Runner +1 Base, 3B-Runner scort', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    // Setup: bases loaded
    await seedAtBat(scoringPage.gameId, ids[0], 'WALK', 1, {
      first: ids[6], second: ids[7], third: ids[8],
    })
    await page.reload()
    await page.waitForTimeout(500)

    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBe(ids[6])
    expect(sb.baseState.second).toBe(ids[7])
    expect(sb.baseState.third).toBe(ids[8])

    // Click Overthrow
    await page.getByRole('button', { name: /^Overthrow$/i }).click()
    await page.waitForTimeout(500)

    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)                    // 3B-Runner scort
    expect(sb.baseState.first).toBeNull()         // 1B war besetzt von Walker → leer
    expect(sb.baseState.second).toBe(ids[6])      // 1B → 2B
    expect(sb.baseState.third).toBe(ids[7])       // 2B → 3B
  })

  test('3rd-Out OUT: kein CorrectionSheet, Runner scort nicht, Inning endet', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    // Setup: 2 Outs in Inning 1 + Runner auf 3B
    await seedAtBat(scoringPage.gameId, ids[0], 'OUT', 1, { first: null, second: null, third: null })
    await seedAtBat(scoringPage.gameId, ids[1], 'OUT', 1, { first: null, second: null, third: null })
    await seedAtBat(scoringPage.gameId, ids[2], 'TRIPLE', 1, { first: null, second: null, third: ids[2] })
    await page.reload()
    await page.waitForTimeout(500)

    // Verifizieren: outsInCurrentInning=2, Runner auf 3B
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(2)
    expect(sb.baseState.third).toBe(ids[2])

    // OUT recorden → 3. Out. Inning vorbei: KEIN Sheet, kein Run für den 3B-Runner.
    await page.getByRole('button', { name: /^AUS\b/ }).click()
    await page.waitForTimeout(500)

    // Sheet öffnet NICHT
    await expect(page.getByText(/3\. Out im Inning/i)).toBeHidden()

    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(3)
    expect(sb.scoreUs).toBe(0)
  })

  test('Stats nach Undo: Player-Stats werden revertet', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    // Seed 3 ABs für ids[0]: SINGLE, OUT, HOMERUN
    await seedAtBat(scoringPage.gameId, ids[0], 'SINGLE', 1, { first: ids[0], second: null, third: null })
    await seedAtBat(scoringPage.gameId, ids[0], 'OUT', 1, { first: ids[0], second: null, third: null })
    await seedAtBat(scoringPage.gameId, ids[0], 'HOMERUN', 1, { first: null, second: null, third: null }, 1, 1)

    let stats = await getBattingStats(scoringPage.gameId)
    let p = stats.find(s => s.playerId === ids[0])!
    expect(p.plateAppearances).toBe(3)
    expect(p.atBats).toBe(3)
    expect(p.hits).toBe(2)
    expect(p.homeRuns).toBe(1)
    expect(p.outs).toBe(1)
    expect(Number(p.battingAverage)).toBeCloseTo(0.667, 3) // 2/3

    // Reload + Undo (löscht den letzten AB = HOMERUN)
    await page.reload()
    await page.waitForTimeout(500)
    await clickUndo(page)
    await page.waitForTimeout(500)

    stats = await getBattingStats(scoringPage.gameId)
    p = stats.find(s => s.playerId === ids[0])!
    expect(p.plateAppearances).toBe(2)
    expect(p.atBats).toBe(2)
    expect(p.hits).toBe(1)             // HR weg
    expect(p.homeRuns).toBe(0)
    expect(p.outs).toBe(1)
    expect(Number(p.battingAverage)).toBeCloseTo(0.500, 3) // 1/2

    // Noch ein Undo → OUT weg
    await clickUndo(page)
    await page.waitForTimeout(500)

    stats = await getBattingStats(scoringPage.gameId)
    p = stats.find(s => s.playerId === ids[0])!
    expect(p.plateAppearances).toBe(1)
    expect(p.atBats).toBe(1)
    expect(p.hits).toBe(1)
    expect(p.outs).toBe(0)
    expect(Number(p.battingAverage)).toBeCloseTo(1.000, 3) // 1/1
  })
})
