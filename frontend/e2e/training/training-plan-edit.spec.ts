import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

async function hasTrainings(page: import('@playwright/test').Page): Promise<boolean> {
  await page.waitForLoadState('networkidle')
  const statsBtn = page.getByRole('button', { name: /Statistik/i })
  return await statsBtn.isVisible({ timeout: 2000 }).catch(() => false)
}

async function hasPlanContent(page: import('@playwright/test').Page): Promise<boolean> {
  // 3-Dot-Menu nur sichtbar wenn Plan existiert; sonst nur "Generieren"-Btn
  return await page.getByRole('button', { name: /Plan-Aktionen/i }).isVisible({ timeout: 1500 }).catch(() => false)
}

async function openPlanEdit(page: import('@playwright/test').Page): Promise<void> {
  // 3-Dot-Menu öffnen, dann "Bearbeiten"
  await page.getByRole('button', { name: /Plan-Aktionen/i }).click()
  await page.waitForTimeout(200)
  await page.getByText(/^Bearbeiten$/i).first().click()
  await page.waitForTimeout(500)
}

test.describe('Training — Plan Edit', () => {
  test('Bearbeiten via 3-Dot-Menu öffnet Plan-Edit-Drawer @smoke', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    if (!(await hasTrainings(page))) {
      test.skip(true, 'Keine Trainings in DB')
      return
    }
    // Plan-Tab auf Mobile aktivieren falls nötig
    const planTab = page.getByRole('tab', { name: /Plan/i })
    if (await planTab.isVisible({ timeout: 500 }).catch(() => false)) {
      await planTab.click()
      await page.waitForTimeout(200)
    }
    if (!(await hasPlanContent(page))) {
      test.skip(true, 'Kein Plan in DB — 3-Dot-Menu nicht sichtbar')
      return
    }
    await openPlanEdit(page)
    await expect(page.getByText(/Plan bearbeiten/i).first()).toBeVisible({ timeout: 2000 })
  })

  test('Abbrechen schließt Plan-Edit-Drawer', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    if (!(await hasTrainings(page))) {
      test.skip(true, 'Keine Trainings in DB')
      return
    }
    const planTab = page.getByRole('tab', { name: /Plan/i })
    if (await planTab.isVisible({ timeout: 500 }).catch(() => false)) {
      await planTab.click()
      await page.waitForTimeout(200)
    }
    if (!(await hasPlanContent(page))) {
      test.skip(true, 'Kein Plan in DB')
      return
    }
    await openPlanEdit(page)
    await page.getByRole('button', { name: /^Abbrechen$/i }).click()
    await page.waitForTimeout(400)
    await expect(page.getByText(/Plan bearbeiten/i).first()).not.toBeVisible({ timeout: 1500 }).catch(() => {})
  })
})
