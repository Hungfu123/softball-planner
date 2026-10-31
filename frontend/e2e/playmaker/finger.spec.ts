import { expect, test, type Page } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

/**
 * Bedienung mit dem FINGER, nicht mit der Maus.
 *
 * Eigene Datei, weil sie einen eigenen Browser-Kontext braucht: echte Touch-Ereignisse
 * gibt es nur mit `hasTouch`. Ohne das laesst sich ein Finger nicht nachbauen —
 * selbstgebaute Pointer-Ereignisse scheitern an setPointerCapture, weil die erfundene
 * Zeiger-Nummer nicht existiert. Das sah einmal aus wie "Ziehen am Handy kaputt" und war
 * nur das Messwerkzeug.
 *
 * Geprueft wird hoch UND quer: quer greift ein anderes Raster (Leisten nach rechts), und
 * die Umrechnung von Bildschirm- in Feldkoordinaten haengt daran.
 */

// Nur der Touch-Kontext, nicht das ganze Geraeteprofil: devices['iPhone 13'] zoege
// WebKit mit, und dann prueft der Test den Browser statt die App.
test.use({ hasTouch: true })

test.beforeEach(async ({ context }) => {
  await seedAuth(context)
})

/**
 * Einen Marker mit dem FINGER ziehen — echte Touch-Ereignisse ueber CDP.
 *
 * page.mouse bleibt auch in einem Touch-Kontext eine Maus (pointerType 'mouse'), und
 * page.touchscreen kann nur tippen. Nur Input.dispatchTouchEvent erzeugt einen Zeiger,
 * den der Browser als Finger fuehrt — und nur dann traegt setPointerCapture, an dem jeder
 * nachgebaute Zug scheitert.
 */
async function fingerZug(page: Page, sel: string, dx: number, dy: number) {
  const box = (await page.locator(sel).boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + (dx * i) / 10, y: y + (dy * i) / 10 }],
    })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

const ballStelle = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector('[data-marker="ball"] circle:first-of-type')!
    return { x: Math.round(Number(c.getAttribute('cx'))), y: Math.round(Number(c.getAttribute('cy'))) }
  })

for (const lage of [
  { n: 'hochkant', w: 390, h: 844 },
  { n: 'quer', w: 844, h: 390 },
]) {
  test(`freies Feld: Base antippen und Ball ziehen (${lage.n})`, async ({ page }) => {
    await page.setViewportSize({ width: lage.w, height: lage.h })
    await page.goto('/orga/playmaker/frei')
    await page.evaluate(() => {
      try {
        localStorage.removeItem('playmaker-freies-feld')
      } catch {
        /* gesperrt */
      }
    })
    await page.reload()
    await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)

    // Base antippen setzt einen Runner.
    const base = page.getByRole('button', { name: 'Runner auf 2' })
    const bb = (await base.boundingBox())!
    await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2)
    await expect(page.locator('[data-marker="runner"]')).toHaveCount(1)

    // Ball ziehen.
    const vorher = await ballStelle(page)
    await fingerZug(page, '[data-marker="ball"] circle:first-of-type', -60, -120)
    await expect.poll(async () => (await ballStelle(page)).y, { timeout: 8000 }).toBeLessThan(vorher.y - 5)
  })

  test(`Editor: Verteidiger mit dem Finger verschieben (${lage.n})`, async ({ page }) => {
    await page.setViewportSize({ width: lage.w, height: lage.h })
    await page.goto('/orga/playmaker')
    await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })
    const id = await page.evaluate(async () => {
      const auth = localStorage.getItem('auth')
      const alle = await (await fetch('/api/plays', { headers: { Authorization: `Basic ${auth}` } })).json()
      return alle.find((p: { title: string }) => p.title.startsWith('Standard-Aufstellung'))?.id ?? alle[0].id
    })
    await page.goto(`/orga/playmaker/${id}/bearbeiten`)
    await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)

    const stelle = () =>
      page.evaluate(() => {
        const c = document.querySelector('[data-marker="defender"][data-id="SS"] circle')!
        return { x: Math.round(Number(c.getAttribute('cx'))), y: Math.round(Number(c.getAttribute('cy'))) }
      })
    const vorher = await stelle()
    await fingerZug(page, '[data-marker="defender"][data-id="SS"] circle', 40, -40)

    await expect
      .poll(async () => {
        const n = await stelle()
        return Math.hypot(n.x - vorher.x, n.y - vorher.y)
      }, { timeout: 8000 })
      .toBeGreaterThan(3)
  })
}
