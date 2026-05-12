import { test, expect, recordSubstitutionViaUI } from '../helpers/fixtures'
import {
  getScoreboard,
  getStealingEvents,
  getSubstitutions,
  resetScoring,
  seedAtBat,
} from '../helpers/api'

test.describe('Scoring — Reset', () => {
  test('reset clears Substitutions (Symmetry-Bug regression) @smoke', async ({ page, scoringPage }) => {
    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)
    let subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(1)

    await resetScoring(scoringPage.gameId)

    subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(0)
  })

  test('reset clears all scoring state at once', async ({ page, scoringPage }) => {
    // Setup: AB + Stealing + Sub via API (Stealing seeded post-AB)
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)
    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)

    const sbBefore = await getScoreboard(scoringPage.gameId)
    expect(sbBefore.totalAtBats).toBe(1)
    const subsBefore = await getSubstitutions(scoringPage.gameId)
    expect(subsBefore).toHaveLength(1)

    await resetScoring(scoringPage.gameId)

    const sbAfter = await getScoreboard(scoringPage.gameId)
    expect(sbAfter.totalAtBats).toBe(0)
    expect(sbAfter.scoreUs).toBe(0)
    expect(sbAfter.scoreThem).toBe(0)
    expect(sbAfter.currentInning).toBe(1)
    expect(sbAfter.outsInCurrentInning).toBe(0)

    const stealings = await getStealingEvents(scoringPage.gameId)
    expect(stealings).toHaveLength(0)

    const subsAfter = await getSubstitutions(scoringPage.gameId)
    expect(subsAfter).toHaveLength(0)
  })
})
