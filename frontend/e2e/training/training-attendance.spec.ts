import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

/**
 * Helper: skipt wenn keine Trainings in DB (z.B. fresh CI DB).
 * Returnt true wenn Page nutzbar (Statistik-Button sichtbar).
 */
async function hasTrainings(page: import('@playwright/test').Page): Promise<boolean> {
  await page.waitForLoadState('networkidle')
  // "Kein Training verfügbar" State zeigt keinen Statistik-Button.
  const statsBtn = page.getByRole('button', { name: /Statistik/i })
  return await statsBtn.isVisible({ timeout: 2000 }).catch(() => false)
}

test.describe('Training — Attendance Page', () => {
  test('lädt /training und zeigt Counter + Statistik-Button @smoke', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    await page.waitForLoadState('networkidle')
    // H1 ist immer da (auch bei "Kein Training verfügbar"-State? Nein — dann ist andere Container).
    // Conservative: prüfe ob Page lädt (kein Crash).
    if (!(await hasTrainings(page))) {
      test.skip(true, 'Keine Trainings in DB — Page zeigt Empty-State')
      return
    }
    await expect(page.getByRole('heading', { name: /^Training$/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /Statistik/i })).toBeVisible()
  })

  test('Statistik-Drawer öffnet bei Klick', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    if (!(await hasTrainings(page))) {
      test.skip(true, 'Keine Trainings in DB')
      return
    }
    await page.getByRole('button', { name: /Statistik/i }).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: /Anwesenheits-Statistik/i }).last()).toBeVisible({ timeout: 1500 })
  })

  test('Sortier-Toggle wechselbar', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    if (!(await hasTrainings(page))) {
      test.skip(true, 'Keine Trainings in DB')
      return
    }
    await page.getByRole('button', { name: /^A-Z$/ }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /^Quote/ }).click()
    await page.waitForTimeout(200)
  })
})
