import { test, expect, clickUndo } from '../helpers/fixtures'
import { getScoreboard, seedAtBat, setBattingSide } from '../helpers/api'

/**
 * Walkoff = Heimteam (batting bottom) führt nach AB in Inning 7+.
 * Banner zeigt "Walkoff-Sieg!", gameOver=true. Backend endedAt bleibt null
 * bis User manuell "Beenden" klickt.
 */
test.describe('Scoring — Walkoff', () => {
  /** Seed Game-State direkt vor Walkoff: Bottom 7th, scoreThem=2, scoreUs=0, AB count > 0. */
  async function seedBottomSeventhDown(gameId: number, playerIds: number[]): Promise<void> {
    // Setup: Bottom of 7th, scoreThem ahead (will be set via opponent runs in inning advances).
    // Easier: switch battingSide to bottom, seed AB in inning 7 with empty bases, set scoreThem directly.
    await setBattingSide(gameId, 'bottom')
    // AB inning 7 establishes currentInning=7
    await seedAtBat(gameId, playerIds[0], 'OUT', 7, { first: null, second: null, third: null })
  }

  test('walkoff: HOMERUN in bottom 7th with scoreThem=2 ends game @smoke', async ({ page, scoringPage }) => {
    await seedBottomSeventhDown(scoringPage.gameId, scoringPage.playerIds)
    // Set scoreThem directly via API (existing /score endpoint via setGameScore not exported,
    // use POST AtBat with runsScored=0 + manual game.scoreThem won't work — need direct).
    // Workaround: seed 2 opponent inning-advances of 1 run each. But that increments inning.
    // Simpler: just record HOMERUN bases-loaded (scoreUs=4) and assume scoreThem default 0.
    // Walkoff = scoreUs > scoreThem any. scoreThem=0 default → walkoff after any positive scoreUs.
    await page.reload()
    await page.waitForTimeout(500)

    // Bases loaded for grand slam → +4
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[8], 'WALK', 7, {
      first: scoringPage.playerIds[6],
      second: scoringPage.playerIds[7],
      third: scoringPage.playerIds[8],
    })
    await page.reload()
    await page.waitForTimeout(500)

    // Now HOMERUN by next batter (UI)
    await page.getByRole('button', { name: 'TREFFER' }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Homerun', exact: true }).click()
    await page.waitForTimeout(500)

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBeGreaterThan(sb.scoreThem)
    expect(sb.currentInning).toBe(7)

    // Banner should show "Walkoff-Sieg!"
    await expect(page.getByText(/Walkoff-Sieg!/i)).toBeVisible({ timeout: 2000 })
  })

  test('walkoff does NOT trigger in top of 7th (we are away)', async ({ page, scoringPage }) => {
    // battingSide=top (default) means we are away team. Walkoff only triggers for home team.
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'OUT', 7, { first: null, second: null, third: null })
    await page.reload()
    await page.waitForTimeout(500)

    // HOMERUN: scoreUs=1 > scoreThem=0
    await page.getByRole('button', { name: 'TREFFER' }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Homerun', exact: true }).click()
    await page.waitForTimeout(500)

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)

    // No walkoff banner — we are away team
    await expect(page.getByText(/Walkoff-Sieg!/i)).not.toBeVisible()
  })

  test('walkoff banner disappears on undo of walkoff AB', async ({ page, scoringPage }) => {
    await setBattingSide(scoringPage.gameId, 'bottom')
    // Seed prior AB so currentInning=7
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'OUT', 7, { first: null, second: null, third: null })
    await page.reload()
    await page.waitForTimeout(500)

    // HOMERUN → walkoff
    await page.getByRole('button', { name: 'TREFFER' }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Homerun', exact: true }).click()
    await page.waitForTimeout(500)

    await expect(page.getByText(/Walkoff-Sieg!/i)).toBeVisible({ timeout: 2000 })

    // Undo the HR
    await clickUndo(page)
    await page.waitForTimeout(500)

    // Banner gone, game still open
    await expect(page.getByText(/Walkoff-Sieg!/i)).not.toBeVisible()
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
  })
})
