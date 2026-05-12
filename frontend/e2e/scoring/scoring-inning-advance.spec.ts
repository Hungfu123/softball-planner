import { test, expect, advanceInningViaUI, recordDirectViaUI, clickUndo } from '../helpers/fixtures'
import { getScoreboard, seedAtBat } from '../helpers/api'

test.describe('Scoring — Inning-Advance', () => {
  async function seedThreeOuts(gameId: number, playerIds: number[]): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await seedAtBat(gameId, playerIds[i], 'OUT', 1, { first: null, second: null, third: null })
    }
  }

  test('advance with zero opponent runs increments currentInning', async ({ page, scoringPage }) => {
    await seedThreeOuts(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)

    await advanceInningViaUI(page, 0)

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(0)
  })

  test('advance with opponent runs adds to scoreThem @smoke', async ({ page, scoringPage }) => {
    await seedThreeOuts(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)

    await advanceInningViaUI(page, 3)

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(3)
  })

  test('bug3 regression — undo after advance reverts scoreThem @smoke', async ({ page, scoringPage }) => {
    await seedThreeOuts(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await advanceInningViaUI(page, 3)
    await recordDirectViaUI(page, 'WALK')

    await clickUndo(page)
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreThem).toBe(3)
    expect(sb.currentInning).toBe(2)

    await clickUndo(page)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreThem).toBe(0)
    expect(sb.currentInning).toBe(1)
  })

})
