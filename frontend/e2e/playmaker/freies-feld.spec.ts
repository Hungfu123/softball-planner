import { expect, test, type Page } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

/**
 * E2E fuer das freie Feld.
 *
 * Eigene Datei: es legt nichts im Katalog an und braucht deshalb weder Aufraeumen noch
 * die Helfer der Play-Suite. Was es dafuer braucht, hat keine andere Seite — den Beweis,
 * dass es ohne Netz funktioniert.
 */

test.beforeEach(async ({ context, page }) => {
  await seedAuth(context)
  await page.goto('/orga/playmaker/frei')
  // Jeder Test faengt am leeren Feld an: der Stand liegt sonst noch vom letzten im Geraet.
  await page.evaluate(() => {
    try {
      localStorage.removeItem('playmaker-freies-feld')
    } catch {
      /* gesperrter Speicher: dann ist ohnehin nichts zu loeschen */
    }
  })
  await page.reload()
  await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)
})

/** Den Ball um einen Bildschirm-Versatz ziehen. */
async function ziehe(page: Page, dx: number, dy: number) {
  const b = (await page.locator('[data-marker="ball"] circle').boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + dx, b.y + dy, { steps: 12 })
  await page.mouse.up()
}

const ballbahnen = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('path')].filter(
        p => (p.getAttribute('stroke') || '').toUpperCase() === '#E6F03C',
      ).length,
  )

test('startet mit Standardaufstellung, Ball an Home und ohne Runner', async ({ page }) => {
  await expect(page.locator('[data-marker="runner"]')).toHaveCount(0)
  expect(await ballbahnen(page)).toBe(0)

  const ball = await page.evaluate(() => {
    const c = document.querySelector('[data-marker="ball"] circle')!
    return { x: Math.round(Number(c.getAttribute('cx'))), y: Math.round(Number(c.getAttribute('cy'))) }
  })
  // Home liegt bei (155, 218) — nicht beim Pitcher wie in einem Play.
  expect(ball).toEqual({ x: 155, y: 218 })
})

test('setzt Runner per Antippen der Base und nimmt sie wieder weg', async ({ page }) => {
  await page.getByRole('button', { name: 'Runner auf 1' }).click()
  await page.getByRole('button', { name: 'Runner auf 3' }).click()
  await expect(page.locator('[data-marker="runner"]')).toHaveCount(2)

  await page.getByRole('button', { name: 'Runner auf 1' }).click()
  await expect(page.locator('[data-marker="runner"]')).toHaveCount(1)
})

test('zieht den Ball und zeichnet die Bahn dorthin', async ({ page }) => {
  await ziehe(page, -70, -160)

  await expect.poll(() => ballbahnen(page), { timeout: 8000 }).toBe(1)

  // Die Bahn endet am Ball, nicht irgendwo.
  const passt = await page.evaluate(() => {
    const bahn = [...document.querySelectorAll('path')].find(
      p => (p.getAttribute('stroke') || '').toUpperCase() === '#E6F03C',
    )!
    const m = bahn.getAttribute('d')!.match(/Q[-\d.]+,[-\d.]+ ([-\d.]+),([-\d.]+)/)!
    const c = document.querySelector('[data-marker="ball"] circle')!
    return (
      Math.hypot(Number(m[1]) - Number(c.getAttribute('cx')), Number(m[2]) - Number(c.getAttribute('cy'))) < 1
    )
  })
  expect(passt).toBe(true)
})

test('zeigt beim zweiten Wurf die Kette aus zwei Bahnen', async ({ page }) => {
  await ziehe(page, -60, -140)
  await expect.poll(() => ballbahnen(page), { timeout: 8000 }).toBe(1)

  await ziehe(page, 90, 60)
  await expect.poll(() => ballbahnen(page), { timeout: 8000 }).toBe(2)
})

test('behält den Stand über das Neuladen hinweg', async ({ page }) => {
  await page.getByRole('button', { name: 'Runner auf 2' }).click()
  await ziehe(page, -60, -140)
  await expect.poll(() => ballbahnen(page), { timeout: 8000 }).toBe(1)

  await page.reload()
  await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)

  // Nicht gespeichert heisst: nicht im Katalog. Nicht: weg beim Zumachen.
  await expect(page.locator('[data-marker="runner"]')).toHaveCount(1)
  expect(await ballbahnen(page)).toBe(1)
})

test('fragt vor dem Zurücksetzen und stellt dann die Standardaufstellung her', async ({ page }) => {
  await page.getByRole('button', { name: 'Runner auf 1' }).click()
  await page.getByRole('button', { name: 'Runner auf 2' }).click()
  await expect(page.locator('[data-marker="runner"]')).toHaveCount(2)

  await page.getByRole('button', { name: 'Zurücksetzen' }).click()
  await expect(page.getByText('Feld zurücksetzen?')).toBeVisible()
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(page.locator('[data-marker="runner"]')).toHaveCount(2)

  await page.getByRole('button', { name: 'Zurücksetzen' }).click()
  await page.getByRole('button', { name: 'Zurücksetzen', exact: true }).last().click()
  await expect(page.locator('[data-marker="runner"]')).toHaveCount(0)

  // Und es ist umkehrbar, falls der Finger schneller war als der Kopf.
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.locator('[data-marker="runner"]')).toHaveCount(2)
})

test('funktioniert ohne Netz', async ({ page, context }) => {
  // Das ist der Kern: in der Pause am Platz gibt es kein WLAN. Die Seite darf gar kein
  // /api brauchen — auch nicht beim ersten Aufmachen.
  const apiAufrufe: string[] = []
  // Nur echte API-Pfade. Ein Muster wie '**/api/**' trifft im Dev-Server auch das Modul
  // /src/api/client.ts — dann startet die App gar nicht erst, und der Test prueft nichts
  // ausser sich selbst.
  await context.route(
    url => url.pathname.startsWith('/api/'),
    route => {
      apiAufrufe.push(route.request().url())
      return route.abort()
    },
  )

  await page.goto('/orga/playmaker/frei')
  await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)

  await page.getByRole('button', { name: 'Runner auf 1' }).click()
  await expect(page.locator('[data-marker="runner"]')).toHaveCount(1)
  await ziehe(page, -70, -150)
  await expect.poll(() => ballbahnen(page), { timeout: 8000 }).toBe(1)

  expect(apiAufrufe).toEqual([])
})
