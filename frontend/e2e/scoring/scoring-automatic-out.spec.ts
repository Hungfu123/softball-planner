import { test, expect } from '../helpers/fixtures'
import { getScoreboard } from '../helpers/api'

test.describe('Scoring — Automatisches Aus', () => {
  test('Outs-Tap + Confirm bucht einen persistierten Out @smoke', async ({ page, scoringPage }) => {
    await page.getByRole('button', { name: 'Automatisches Aus' }).click()
    await page.getByRole('button', { name: 'Ja, Aus buchen' }).click()

    await expect.poll(async () => (await getScoreboard(scoringPage.gameId)).outsInCurrentInning).toBe(1)

    // überlebt Reload (persistiert)
    await page.reload()
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(1)
  })

  test('Drittes Aus sperrt Batter-Buttons', async ({ page, scoringPage }) => {
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Automatisches Aus' }).click()
      await page.getByRole('button', { name: 'Ja, Aus buchen' }).click()
      await expect.poll(async () => (await getScoreboard(scoringPage.gameId)).outsInCurrentInning).toBe(i + 1)
    }
    // Batter-Buttons disabled bei halfInningOver
    await expect(page.getByRole('button', { name: 'AUS', exact: false }).first()).toBeDisabled()
  })
})
