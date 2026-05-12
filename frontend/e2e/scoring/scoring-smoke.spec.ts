import { test, expect } from '../helpers/fixtures'
import { getScoreboard } from '../helpers/api'

test.describe('Scoring Smoke', () => {
  test('page loads with empty state and disabled undo @smoke', async ({ page, scoringPage }) => {
    await expect(page.getByRole('button', { name: 'TREFFER' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'STRIKEOUT' })).toBeVisible()
    await expect(page.getByRole('button', { name: /AUS/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'WALK' })).toBeVisible()
    await expect(page.getByRole('button', { name: /HBP/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /ERROR/ })).toBeVisible()

    await expect(page.getByRole('button', { name: /Rückgängig/ })).toBeDisabled()

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(1)
    expect(sb.scoreUs).toBe(0)
    expect(sb.totalAtBats).toBe(0)
  })
})
