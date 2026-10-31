import { expect, test, type Page } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

/**
 * Offense und Defense sind **dieselbe Ansicht**.
 *
 * Nebeneinander gehalten fiel es sofort auf: das Play nimmt den ganzen Bildschirm, die
 * Karte war ein Ausschnitt in der Mitte einer cremefarbenen Seite — mit Kopfleiste
 * darueber, Rand darum und Leere darunter. Dieselbe Sache, zwei Ansichten.
 *
 * Gemessen wird der **Anteil am Bildschirm**, nicht eine Pixelzahl: die Buehnen haben
 * verschiedene Seitenverhaeltnisse und ein breites Bild kann am Handy nie so hoch werden
 * wie ein schmales. Der Anteil sagt, ob die Flaeche benutzt wird.
 */

test.beforeEach(async ({ context }) => {
  await seedAuth(context)
})

/** Der Anteil der Buehne an der Bildschirmhoehe, in Prozent. */
async function buehnenanteil(page: Page, waehler: string): Promise<number> {
  return page.evaluate(w => {
    const el = document.querySelector(w)
    if (!el) return 0
    return (el.getBoundingClientRect().height / window.innerHeight) * 100
  }, waehler)
}

test.describe('Kapitel im Spielwissen', () => {
  test('fuellt den Bildschirm wie ein Play', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 })
    await page.goto('/spielwissen/box')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/In der Box/i)

    // Kein Scrollen: die Seite ist eine Blaetter-Ansicht, kein Dokument.
    const scrollt = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight + 1,
    )
    expect(scrollt).toBe(false)

    // Gemessen wird die ZEICHNUNG, nicht ihr Kasten: ein Kasten im `1fr` ist immer hoch,
    // auch wenn ein Bildchen darin schwebt.
    const anteil = await buehnenanteil(page, '[data-buehne] svg')
    expect(anteil).toBeGreaterThan(45)
  })

  test('zeigt oben die Kopfleiste eines Plays: zurueck, Titel, nichts darueber', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 })
    await page.goto('/spielwissen/box')

    // Keine App-Navigation darueber: dieselbe Entscheidung wie beim Play. Die Seite
    // fuellt den Bildschirm per h-dvh, darueber passt keine Kopfleiste mehr.
    await expect(page.getByRole('navigation')).toHaveCount(0)

    const kopf = page.getByRole('banner')
    const kasten = await kopf.boundingBox()
    expect(kasten?.y).toBeLessThanOrEqual(1)
    expect(kasten?.height ?? 0).toBeLessThanOrEqual(56)
    await expect(kopf.getByRole('link', { name: /Zurück/i })).toBeVisible()
  })
})
