import {
  test, expect,
  clickUndo, recordHitViaUI, recordStealingViaUI, recordSubstitutionViaUI, advanceInningViaUI,
} from '../helpers/fixtures'
import { getScoreboard, getStealingEvents, getSubstitutions, seedAtBat } from '../helpers/api'

test.describe('Scoring — Undo', () => {
  test('undo button disabled when no actions', async ({ page, scoringPage }) => {
    void scoringPage
    await expect(page.getByRole('button', { name: /^Rückgängig$/i })).toBeDisabled()
  })

  test('undo single AB clears state', async ({ page, scoringPage }) => {
    await recordHitViaUI(page, 'SINGLE')
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.totalAtBats).toBe(1)

    await clickUndo(page)

    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.totalAtBats).toBe(0)
    expect(sb.baseState.first).toBeNull()
  })

  test('undo AB also deletes orphan stealings (cutoff cleanup)', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)
    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')
    await recordHitViaUI(page, 'SINGLE')

    let stealings = await getStealingEvents(scoringPage.gameId)
    expect(stealings).toHaveLength(1)

    await clickUndo(page)
    stealings = await getStealingEvents(scoringPage.gameId)
    expect(stealings).toHaveLength(0)
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.totalAtBats).toBe(1)
  })

  test('undo stealing-only deletes only stealing', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)
    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')

    await clickUndo(page)
    const stealings = await getStealingEvents(scoringPage.gameId)
    expect(stealings).toHaveLength(0)
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.totalAtBats).toBe(1)
  })

  test('undo substitution-only deletes only sub', async ({ page, scoringPage }) => {
    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)
    let subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(1)

    await clickUndo(page)
    subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(0)
  })

  test('undo inning-advance reverts score and event', async ({ page, scoringPage }) => {
    for (let i = 0; i < 3; i++) {
      await seedAtBat(scoringPage.gameId, scoringPage.playerIds[i], 'OUT', 1, { first: null, second: null, third: null })
    }
    await page.reload()
    await page.waitForTimeout(500)
    await advanceInningViaUI(page, 2)
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreThem).toBe(2)
    expect(sb.currentInning).toBe(2)

    await clickUndo(page)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreThem).toBe(0)
    expect(sb.currentInning).toBe(1)
  })

  test('toast adaptive: AT_BAT', async ({ page, scoringPage }) => {
    void scoringPage
    await recordHitViaUI(page, 'SINGLE')
    await clickUndo(page)
    await expect(page.getByText(/Letzter At-Bat rückgängig gemacht/i)).toBeVisible({ timeout: 1500 })
  })

  test('toast adaptive: STEALING', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)
    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')
    await clickUndo(page)
    await expect(page.getByText(/Letztes Stealing-Event rückgängig gemacht/i)).toBeVisible({ timeout: 1500 })
  })

  test('toast adaptive: INNING_ADVANCE', async ({ page, scoringPage }) => {
    for (let i = 0; i < 3; i++) {
      await seedAtBat(scoringPage.gameId, scoringPage.playerIds[i], 'OUT', 1, { first: null, second: null, third: null })
    }
    await page.reload()
    await page.waitForTimeout(500)
    await advanceInningViaUI(page, 0)
    await clickUndo(page)
    await expect(page.getByText(/Letzter Inning-Wechsel rückgängig gemacht/i)).toBeVisible({ timeout: 1500 })
  })
})
