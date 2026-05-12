import { test, expect, recordStealingViaUI } from '../helpers/fixtures'
import { getScoreboard, getStealingEvents, seedAtBat } from '../helpers/api'

test.describe('Scoring — Stealing', () => {
  test('STOLEN_BASE 1B-Runner moves to 2B @smoke', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBe(scoringPage.playerIds[0])
    expect(sb.scoreUs).toBe(0)
  })

  test('STOLEN_BASE 3B-Runner scores (steal of home)', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'TRIPLE', 1, {
      first: null, second: null, third: scoringPage.playerIds[0],
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
    expect(sb.baseState.third).toBeNull()
  })

  test('CAUGHT_STEALING increments outs', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordStealingViaUI(page, scoringPage.playerIds[0], 'CAUGHT_STEALING')

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(1)
    expect(sb.baseState.first).toBeNull()
  })

  test('Stealing event persisted in backend', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')

    const events = await getStealingEvents(scoringPage.gameId)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('STOLEN_BASE')
    expect(events[0].runnerId).toBe(scoringPage.playerIds[0])
  })
})
