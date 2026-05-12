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

})
