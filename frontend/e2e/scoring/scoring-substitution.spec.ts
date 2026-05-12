import { test, expect, recordSubstitutionViaUI } from '../helpers/fixtures'
import { getScoreboard, getSubstitutions } from '../helpers/api'

test.describe('Scoring — Substitution', () => {
  test('Sub persists to backend with correct playerOut/In/inning @smoke', async ({ page, scoringPage }) => {
    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)

    const subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(1)
    expect(subs[0].playerOutId).toBe(scoringPage.playerIds[0])
    expect(subs[0].playerInId).toBe(scoringPage.benchPlayerId)
    expect(subs[0].inning).toBe(1)
  })

  test('Sub persists across page reload', async ({ page, scoringPage }) => {
    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)
    await page.reload()
    await page.waitForTimeout(500)

    const subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(1)
  })

  test('Sub changes currentBatter to substitute', async ({ page, scoringPage }) => {
    const before = await getScoreboard(scoringPage.gameId)
    expect(before.currentBatterId).toBe(scoringPage.playerIds[0])

    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)

    const after = await getScoreboard(scoringPage.gameId)
    expect(after.currentBatterId).toBe(scoringPage.benchPlayerId)
  })
})
