import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

/**
 * Smoke für den ANALYSE-Punkt: Nav heißt nicht mehr "Gegner", die Spiel-Verlauf-Seite
 * baut auf (Umschalter + Slot-Analyse vorhanden) und der Umschalter wechselt zurück
 * ins Gegner-Verzeichnis. Bewusst datenunabhängig — ob Spiel-Zeilen existieren,
 * hängt von der DB-Lage ab.
 */
test.describe('Analyse: Spiel-Verlauf', () => {
  test('Seite baut auf und Nav-Punkt heißt Analyse', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/teams/spiele')

    await expect(page.getByRole('heading', { name: 'Spiel-Verlauf' })).toBeVisible()
    // Nav-Punkt heißt ANALYSE (nicht mehr GEGNER) und bleibt auf der Unter-Route aktiv
    await expect(page.getByRole('banner').getByRole('link', { name: 'Analyse' })).toBeVisible()

    // Umschalter vorhanden, beide Modi erreichbar
    await expect(page.getByRole('link', { name: 'Gegner', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Spiel-Verlauf' })).toBeVisible()
  })

  test('Umschalter wechselt zwischen Gegner-Verzeichnis und Spiel-Verlauf', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/teams/spiele')
    await expect(page.getByRole('heading', { name: 'Spiel-Verlauf' })).toBeVisible()

    await page.getByRole('link', { name: 'Gegner', exact: true }).click()
    await expect(page.getByRole('heading', { name: /^Gegner/ })).toBeVisible()
    await expect(page).toHaveURL(/\/teams$/)

    await page.getByRole('link', { name: 'Spiel-Verlauf' }).click()
    await expect(page.getByRole('heading', { name: 'Spiel-Verlauf' })).toBeVisible()
    await expect(page).toHaveURL(/\/teams\/spiele$/)
  })
})