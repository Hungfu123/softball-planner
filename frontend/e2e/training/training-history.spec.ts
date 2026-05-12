import { test, expect } from '../helpers/fixtures'
import { seedAuth } from '../helpers/auth'

test.describe('Training — History-Matrix', () => {
  test('Stats-Drawer Tab "Matrix" zeigt Cross-Training-Matrix', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    await page.waitForLoadState('networkidle')

    const trainingHeading = page.getByRole('heading', { name: /^Training$/i })
    if (!(await trainingHeading.isVisible().catch(() => false))) {
      test.skip(true, 'Kein Training — Matrix-Test übersprungen')
      return
    }

    // Stats-Drawer öffnen
    await page.getByRole('button', { name: /Statistik/i }).click()
    await page.waitForTimeout(400)

    // Tab Matrix
    await page.getByRole('button', { name: /^Matrix$/i }).click()
    await page.waitForTimeout(300)

    // Tabelle vorhanden (Spalten-Header "Spieler")
    await expect(page.getByText(/^Spieler$/i).first()).toBeVisible({ timeout: 1500 })
  })
})
