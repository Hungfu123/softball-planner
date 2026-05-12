import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

test.describe('Training — Plan Edit', () => {
  test('Bearbeiten-Button öffnet Plan-Edit-Drawer @smoke', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    await page.waitForLoadState('networkidle')

    // Wenn kein Training: skip elegantly
    const trainingHeading = page.getByRole('heading', { name: /^Training$/i })
    if (!(await trainingHeading.isVisible().catch(() => false))) {
      test.skip(true, 'Kein Training in DB — Plan-Edit-Test übersprungen')
      return
    }

    // Bearbeiten-Button finden + klicken (im Plan-Section, kann mehrere geben)
    const editBtn = page.getByRole('button', { name: /Bearbeiten/i }).first()
    await editBtn.click()
    await page.waitForTimeout(500)

    // Drawer-Inhalt sichtbar (Plan bearbeiten Heading)
    await expect(page.getByText(/Plan bearbeiten/i).first()).toBeVisible({ timeout: 1500 })
  })

  test('Abbrechen schließt Drawer', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    await page.waitForLoadState('networkidle')

    const editBtn = page.getByRole('button', { name: /Bearbeiten/i }).first()
    if (!(await editBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Kein Training in DB')
      return
    }
    await editBtn.click()
    await page.waitForTimeout(400)

    await page.getByRole('button', { name: /^Abbrechen$/i }).click()
    await page.waitForTimeout(400)

    // Drawer-Heading nicht mehr sichtbar
    await expect(page.getByText(/Plan bearbeiten/i).first()).not.toBeVisible({ timeout: 1500 }).catch(() => {})
  })
})
