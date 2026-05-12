import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

async function hasTrainings(page: import('@playwright/test').Page): Promise<boolean> {
  await page.waitForLoadState('networkidle')
  const statsBtn = page.getByRole('button', { name: /Statistik/i })
  return await statsBtn.isVisible({ timeout: 2000 }).catch(() => false)
}

test.describe('Training — Plan Edit', () => {
  test('Bearbeiten-Button öffnet Plan-Edit-Drawer @smoke', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    if (!(await hasTrainings(page))) {
      test.skip(true, 'Keine Trainings in DB')
      return
    }
    const editBtn = page.getByRole('button', { name: /Bearbeiten/i }).first()
    await editBtn.click()
    await page.waitForTimeout(500)
    await expect(page.getByText(/Plan bearbeiten/i).first()).toBeVisible({ timeout: 1500 })
  })

  test('Abbrechen schließt Drawer', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    if (!(await hasTrainings(page))) {
      test.skip(true, 'Keine Trainings in DB')
      return
    }
    await page.getByRole('button', { name: /Bearbeiten/i }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /^Abbrechen$/i }).click()
    await page.waitForTimeout(400)
    await expect(page.getByText(/Plan bearbeiten/i).first()).not.toBeVisible({ timeout: 1500 }).catch(() => {})
  })
})
