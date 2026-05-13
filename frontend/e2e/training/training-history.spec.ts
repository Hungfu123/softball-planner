import { test, expect } from '../helpers/fixtures'
import { seedAuth } from '../helpers/auth'

async function hasTrainings(page: import('@playwright/test').Page): Promise<boolean> {
  await page.waitForLoadState('networkidle')
  const statsBtn = page.getByRole('button', { name: /Statistik/i })
  return await statsBtn.isVisible({ timeout: 2000 }).catch(() => false)
}

test.describe('Training — History-Matrix', () => {
  test('Stats-Drawer Tab "Matrix" zeigt Cross-Training-Matrix', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    if (!(await hasTrainings(page))) {
      test.skip(true, 'Keine Trainings in DB — Matrix-Test übersprungen')
      return
    }

    // Stats-Drawer öffnen
    await page.getByRole('button', { name: /Statistik/i }).click()
    await page.waitForTimeout(400)

    // Tab Matrix
    await page.getByRole('button', { name: /^Matrix$/i }).click()
    await page.waitForTimeout(300)

    // Matrix-Tabelle vorhanden — irgendein th oder Datum-Header
    await expect(page.locator('table th').first()).toBeVisible({ timeout: 1500 })
  })
})
