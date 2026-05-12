import { test, expect, recordHitViaUI, recordStealingViaUI } from '../helpers/fixtures'
import { getScoreboard, seedAtBat } from '../helpers/api'

/**
 * Hitting-Szenarien mit Runnern auf verschiedenen Bases.
 * Verifiziert advanceBases-Logic + Score-Computation in komplexen States.
 */
test.describe('Scoring — Hitting Scenarios', () => {
  test('DOUBLE mit 1B-Runner: Batter auf 2B, 1B-Runner auf 3B, kein Score', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    // Seed: 1B = ids[0]
    await seedAtBat(scoringPage.gameId, ids[0], 'SINGLE', 1, { first: ids[0], second: null, third: null })
    await page.reload()
    await page.waitForTimeout(500)

    await recordHitViaUI(page, 'DOUBLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).not.toBeNull() // Batter auf 2B
    expect(sb.baseState.third).toBe(ids[0])    // 1B-Runner → 3B
  })

  test('TRIPLE bases-loaded: alle 3 Runner scoren, Batter auf 3B', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    await seedAtBat(scoringPage.gameId, ids[0], 'WALK', 1, {
      first: ids[6], second: ids[7], third: ids[8],
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordHitViaUI(page, 'TRIPLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(3) // alle drei Runner scoren
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).not.toBeNull() // Batter
  })

  test('HOMERUN mit 1B+2B besetzt: 3 Runs (Batter + 2 Runners)', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    await seedAtBat(scoringPage.gameId, ids[0], 'WALK', 1, {
      first: ids[7], second: ids[8], third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordHitViaUI(page, 'HOMERUN')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(3)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
  })

  test('SINGLE mit Runner 3B: 3B-Runner scort home (3B → home)', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    await seedAtBat(scoringPage.gameId, ids[0], 'TRIPLE', 1, { first: null, second: null, third: ids[8] })
    await page.reload()
    await page.waitForTimeout(500)

    await recordHitViaUI(page, 'SINGLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1) // 3B scort
    expect(sb.baseState.first).not.toBeNull() // Batter auf 1B
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
  })

  test('DOUBLE mit Runner 2B+3B: beide scoren, Batter 2B, 1B-Runner... gibt es nicht hier', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    await seedAtBat(scoringPage.gameId, ids[0], 'WALK', 1, { first: null, second: ids[7], third: ids[8] })
    await page.reload()
    await page.waitForTimeout(500)

    await recordHitViaUI(page, 'DOUBLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(2) // 2B + 3B scoren
    expect(sb.baseState.second).not.toBeNull() // Batter auf 2B
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.third).toBeNull()
  })

  test('Steal-Cascade: 1B-Steal mit 2B besetzt → 2B-Runner forced auf 3B', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    // Setup: 1B=ids[0], 2B=ids[1]
    await seedAtBat(scoringPage.gameId, ids[2], 'WALK', 1, { first: ids[0], second: ids[1], third: null })
    await page.reload()
    await page.waitForTimeout(500)

    // ids[0] (1B) stiehlt 2B → Cascade: ids[1] (2B) wird auf 3B verdrängt
    await recordStealingViaUI(page, ids[0], 'STOLEN_BASE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBe(ids[0]) // 1B-Runner → 2B
    expect(sb.baseState.third).toBe(ids[1])  // 2B-Runner cascade → 3B
    expect(sb.scoreUs).toBe(0)
  })

  test('Steal-Cascade Maximum: 1B-Steal mit 2B+3B besetzt → 3B-Runner scort', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    await seedAtBat(scoringPage.gameId, ids[2], 'WALK', 1, { first: ids[0], second: ids[1], third: ids[6] })
    await page.reload()
    await page.waitForTimeout(500)

    await recordStealingViaUI(page, ids[0], 'STOLEN_BASE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)  // 3B-Runner scort via Cascade
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBe(ids[0])
    expect(sb.baseState.third).toBe(ids[1])
  })

  test('Double-Steal: 2 separate STOLEN_BASE-Events in einem Inning', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    // Setup: 1B+2B besetzt
    await seedAtBat(scoringPage.gameId, ids[2], 'WALK', 1, { first: ids[0], second: ids[1], third: null })
    await page.reload()
    await page.waitForTimeout(500)

    // Erste Steal: ids[0] 1B→2B (Cascade: ids[1] 2B→3B)
    await recordStealingViaUI(page, ids[0], 'STOLEN_BASE')
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.baseState.second).toBe(ids[0])
    expect(sb.baseState.third).toBe(ids[1])

    // Zweite Steal: ids[1] 3B→home
    await recordStealingViaUI(page, ids[1], 'STOLEN_BASE')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
    expect(sb.baseState.third).toBeNull()
    expect(sb.baseState.second).toBe(ids[0])  // ids[0] bleibt auf 2B
  })

  test('SINGLE bases-loaded: 3B-Runner scort, andere advancen', async ({ page, scoringPage }) => {
    const ids = scoringPage.playerIds
    await seedAtBat(scoringPage.gameId, ids[0], 'WALK', 1, {
      first: ids[6], second: ids[7], third: ids[8],
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordHitViaUI(page, 'SINGLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1) // 3B-Runner scort
    expect(sb.baseState.first).not.toBeNull()  // Batter
    expect(sb.baseState.second).toBe(ids[6])   // 1B → 2B
    expect(sb.baseState.third).toBe(ids[7])    // 2B → 3B
  })
})
