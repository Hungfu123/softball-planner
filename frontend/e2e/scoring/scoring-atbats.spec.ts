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

  test('STRIKEOUT increments outs', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'STRIKEOUT')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.outsInCurrentInning).toBe(1)
    expect(sb.baseState.first).toBeNull()
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

  test('REACHED_ON_ERROR bases loaded forces 1 run (force-min)', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordDirectViaUI(page, 'REACHED_ON_ERROR')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
  })

  /** Runner nur auf 3B — der Fall, der NICHT geforced ist: Batter geht bei ROE
   *  auf 1B, der Runner auf 3B steht frei. Deadball/Overthrow entscheidet der
   *  Scorer über das Korrektur-Sheet. */
  async function seedRunnerOnThird(gameId: number, playerIds: number[]): Promise<void> {
    await seedAtBat(gameId, playerIds[8], 'TRIPLE', 1, {
      first: null,
      second: null,
      third: playerIds[8],
    })
  }

  test('REACHED_ON_ERROR mit Runner auf 3B: Default laesst ihn stehen (kein Force)', async ({ page, scoringPage }) => {
    await seedRunnerOnThird(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordDirectViaUI(page, 'REACHED_ON_ERROR')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.third).toBe(scoringPage.playerIds[8])
    expect(sb.baseState.first).not.toBeNull()
  })

  test('REACHED_ON_ERROR mit Runner auf 3B: ueber Korrigieren nach Home zaehlt als Run', async ({ page, scoringPage }) => {
    await seedRunnerOnThird(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)

    await page.getByRole('button', { name: /^ERROR\b/ }).click()
    await page.waitForTimeout(400)

    // Korrektur-Sheet muss aufgehen — sonst gibt es keinen Weg, den Runner zu schicken.
    const cycle = page.getByRole('button', { name: 'bleibt 3B', exact: true })
    await expect(cycle).toBeVisible()
    await cycle.click()
    await expect(page.getByRole('button', { name: '→ Home (Run!)', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '✓ Passt', exact: true }).click()
    await page.waitForTimeout(600)

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
    expect(sb.baseState.third).toBeNull()
    expect(sb.baseState.first).toBe(scoringPage.playerIds[0])
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
