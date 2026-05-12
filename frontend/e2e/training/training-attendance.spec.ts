import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

// Note: scoringPage-Fixture is overkill für Training-Tests. Use plain `test` + auth-seed.
test.describe('Training — Attendance Page', () => {
  test('lädt /training und zeigt Counter + Statistik-Button @smoke', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /^Training$/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /Statistik/i })).toBeVisible()
  })

  test('Statistik-Drawer öffnet bei Klick', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /Statistik/i }).click()
    await page.waitForTimeout(500)
    // Drawer rendert Title 2x (sr-only Drawer.Title + sichtbares h2). Visible one prüfen.
    await expect(page.getByRole('heading', { name: /Anwesenheits-Statistik/i }).last()).toBeVisible({ timeout: 1500 })
  })

  test('Sortier-Toggle wechselbar', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /^A-Z$/ }).click()
    await page.waitForTimeout(200)
    // Toggle wieder zu Quote
    await page.getByRole('button', { name: /^Quote/ }).click()
    await page.waitForTimeout(200)
  })
})
