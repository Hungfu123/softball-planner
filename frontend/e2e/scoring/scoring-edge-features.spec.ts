import { test, expect, recordHitViaUI, recordDirectViaUI, clickUndo, clickOverthrow } from '../helpers/fixtures'
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
    await clickOverthrow(page)

    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)                    // 3B-Runner scort
    expect(sb.baseState.first).toBeNull()         // 1B war besetzt von Walker → leer
    expect(sb.baseState.second).toBe(ids[6])      // 1B → 2B
    expect(sb.baseState.third).toBe(ids[7])       // 2B → 3B
  })

  test('Overthrow nur mit Runner auf 3B: 1 Run, Bases danach leer', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    await seedAtBat(scoringPage.gameId, ids[8], 'TRIPLE', 1, { first: null, second: null, third: ids[8] })
    await page.reload()
    await page.waitForTimeout(500)

    await clickOverthrow(page)

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
  })

  test('ERROR dann Overthrow: Runner von 3B scort und der Run zaehlt beim Laeufer', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    // Runner auf 3B (hat sich den Triple selbst erarbeitet) — nicht geforced.
    await seedAtBat(scoringPage.gameId, ids[8], 'TRIPLE', 1, { first: null, second: null, third: ids[8] })
    await page.reload()
    await page.waitForTimeout(500)

    // ERROR: Batter auf 1B, Runner auf 3B bleibt stehen (kein Force).
    await recordDirectViaUI(page, 'REACHED_ON_ERROR')
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.third).toBe(ids[8])

    // Overthrow auf denselben Spielzug: alle Runner +1 → 3B scort.
    await clickOverthrow(page)

    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
    expect(sb.baseState.third).toBeNull()

    // Der Run muss dem Laeufer gutgeschrieben werden, nicht dem Batter.
    const stats = await getBattingStats(scoringPage.gameId)
    const runner = stats.find(p => p.playerId === ids[8])
    expect(runner?.runs).toBe(1)
  })

  test('ERROR + Overthrow + Undo: Run verschwindet und Laeufer steht wieder auf 3B', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    await seedAtBat(scoringPage.gameId, ids[8], 'TRIPLE', 1, { first: null, second: null, third: ids[8] })
    await page.reload()
    await page.waitForTimeout(500)

    await recordDirectViaUI(page, 'REACHED_ON_ERROR')
    await clickOverthrow(page)

    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
    let stats = await getBattingStats(scoringPage.gameId)
    expect(stats.find(p => p.playerId === ids[8])?.runs).toBe(1)

    // Undo muss den Overthrow-Run mitnehmen und den Laeufer zuruecksetzen.
    await clickUndo(page)
    await page.waitForTimeout(600)

    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.third).toBe(ids[8])
    expect(sb.baseState.first).toBeNull()

    stats = await getBattingStats(scoringPage.gameId)
    expect(stats.find(p => p.playerId === ids[8])?.runs).toBe(0)
    // Das ROE-At-Bat ist weg — der Batter darf keinen ROE mehr in den Stats haben.
    const roeTotal = stats.reduce((n, p) => n + p.reachedOnError, 0)
    expect(roeTotal).toBe(0)
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

  test('Runner-Out auf Hit als 3. Out → Inning-Wechsel-Pille erscheint (deferred-correction reload)', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    // Setup: 2 Outs in Inning 1 + Runner auf 1B.
    await seedAtBat(scoringPage.gameId, ids[5], 'OUT', 1, { first: null, second: null, third: null })
    await seedAtBat(scoringPage.gameId, ids[6], 'OUT', 1, { first: null, second: null, third: null })
    await seedAtBat(scoringPage.gameId, ids[0], 'SINGLE', 1, { first: ids[0], second: null, third: null })
    await page.reload()
    await page.waitForTimeout(500)

    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(2)
    expect(sb.baseState.first).toBe(ids[0])

    // SINGLE recorden → auto-CorrectionSheet (deferred pendingHit-Path).
    // Einen Runner als Aus markieren = 3. Out (Batter erreicht Base, Runner geht aus).
    await page.getByRole('button', { name: 'TREFFER' }).click()
    await page.getByRole('button', { name: 'Single', exact: true }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Aus?', exact: true }).first().click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: '✓ Passt', exact: true }).click()
    await page.waitForTimeout(700)

    // Backend persistiert den Runner-Out korrekt → 3 Outs.
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(3)

    // UI muss den 3. Out sehen → Inning-Wechsel-Pille sichtbar.
    // Bug: deferred-Path lud scoreboard nach dem Runner-Out nicht neu → Pille blieb aus.
    await expect(page.getByRole('button', { name: /Nächstes Inning starten/i })).toBeVisible()
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
