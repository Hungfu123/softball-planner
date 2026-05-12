import { test, expect, recordHitViaUI, recordDirectViaUI } from '../helpers/fixtures'
import { getScoreboard, seedAtBat } from '../helpers/api'

test.describe('Scoring — AB Recording (empty bases)', () => {
  test('SINGLE places batter on 1B, no runs @smoke', async ({ page, scoringPage }) => {
    await recordHitViaUI(page, 'SINGLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBe(scoringPage.playerIds[0])
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
    expect(sb.outsInCurrentInning).toBe(0)
  })

  test('DOUBLE places batter on 2B, no runs', async ({ page, scoringPage }) => {
    await recordHitViaUI(page, 'DOUBLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBe(scoringPage.playerIds[0])
    expect(sb.baseState.third).toBeNull()
  })

  test('TRIPLE places batter on 3B, no runs', async ({ page, scoringPage }) => {
    await recordHitViaUI(page, 'TRIPLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBe(scoringPage.playerIds[0])
  })

  test('HOMERUN solo scores 1', async ({ page, scoringPage }) => {
    await recordHitViaUI(page, 'HOMERUN')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
  })

  test('WALK places batter on 1B, no runs', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'WALK')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBe(scoringPage.playerIds[0])
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
  })

  test('HBP places batter on 1B, no runs', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'HIT_BY_PITCH')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBe(scoringPage.playerIds[0])
  })

  test('STRIKEOUT increments outs', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'STRIKEOUT')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.outsInCurrentInning).toBe(1)
    expect(sb.baseState.first).toBeNull()
  })

  test('OUT increments outs', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'OUT')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.outsInCurrentInning).toBe(1)
  })

  test('REACHED_ON_ERROR empty bases places batter on 1B', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'REACHED_ON_ERROR')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBe(scoringPage.playerIds[0])
  })
})

test.describe('Scoring — AB Recording (bases loaded)', () => {
  /** Loads 1B=playerIds[6], 2B=playerIds[7], 3B=playerIds[8] via seeded AB. */
  async function seedBasesLoaded(gameId: number, playerIds: number[]): Promise<void> {
    await seedAtBat(gameId, playerIds[8], 'WALK', 1, {
      first: playerIds[6],
      second: playerIds[7],
      third: playerIds[8],
    })
  }

  test('HOMERUN bases loaded grand slam (4 runs) @smoke', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordHitViaUI(page, 'HOMERUN')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(4)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
  })

  test('WALK bases loaded forces 1 run', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordDirectViaUI(page, 'WALK')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
  })

  test('HBP bases loaded forces 1 run', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordDirectViaUI(page, 'HIT_BY_PITCH')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
  })

  test('REACHED_ON_ERROR bases loaded forces 1 run (force-min)', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordDirectViaUI(page, 'REACHED_ON_ERROR')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
  })

  test('SINGLE bases loaded scores 3B-Runner', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordHitViaUI(page, 'SINGLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBeGreaterThanOrEqual(1)
  })
})
