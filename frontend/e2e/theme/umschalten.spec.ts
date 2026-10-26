import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

/*
 * Der Schalter selbst. Der Kontrast-Prüfer setzt `data-theme` von Hand am DOM — er
 * würde also auch dann grün bleiben, wenn der Knopf im Konto gar nichts täte.
 *
 * Geprüft wird die Kette, die der Mensch benutzt: klicken, hinsehen, neu laden, und
 * auf einer anderen Seite immer noch dunkel. Der letzte Schritt ist der wichtigste —
 * die Wahl liegt im localStorage und wird vor dem ersten Paint von einem Schnipsel in
 * index.html gesetzt. Bricht der, blitzt beim Laden die helle Seite auf.
 */
test.describe('Der Umschalter im Konto', () => {
  test.beforeEach(async ({ context }) => {
    await seedAuth(context)
  })

  test('schaltet um, merkt es sich und gilt auf der ganzen App', async ({ page }) => {
    await page.goto('/konto')
    await page.waitForLoadState('networkidle')

    const wurzel = page.locator('html')
    await expect(wurzel).not.toHaveAttribute('data-theme', 'dark')

    await page.getByRole('button', { name: 'Dunkel' }).click()
    await expect(wurzel).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Dunkel' })).toHaveAttribute('aria-pressed', 'true')

    // Überlebt das Neuladen — und zwar schon vor dem ersten Paint.
    await page.reload()
    await expect(wurzel).toHaveAttribute('data-theme', 'dark')

    // Und gilt nicht nur auf der Seite, auf der man geklickt hat.
    await page.goto('/training')
    await expect(wurzel).toHaveAttribute('data-theme', 'dark')

    await page.goto('/konto')
    await page.getByRole('button', { name: 'Hell' }).click()
    await expect(wurzel).not.toHaveAttribute('data-theme', 'dark')
  })

  test('blitzt beim Laden nicht hell auf', async ({ page }) => {
    await page.goto('/konto')
    await page.getByRole('button', { name: 'Dunkel' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    // Das Attribut muss stehen, BEVOR React läuft. Am bereits geladenen Dokument ist
    // der Beweis nicht mehr zu holen — also ein zweites Dokument im selben Kontext
    // (gleicher localStorage) und dort der früheste Zeitpunkt, an dem man messen kann:
    // readyState "interactive". React hat dann noch nichts getan.
    const seite = await page.context().newPage()
    await seite.addInitScript(() => {
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'interactive') {
          ;(window as unknown as { __themeFrueh?: string | null }).__themeFrueh =
            document.documentElement.getAttribute('data-theme')
        }
      })
    })
    await seite.goto('/training')
    const fruehesAttribut = await seite.evaluate(
      () => (window as unknown as { __themeFrueh?: string | null }).__themeFrueh ?? null,
    )
    expect(fruehesAttribut).toBe('dark')
    await seite.close()
  })
})

/*
 * Ohne eigene Wahl entscheidet das Gerät. Wer sein Handy auf dunkel gestellt hat, hat
 * damit schon gesagt, was er will. Die eigene Wahl schlägt das System — sonst wäre der
 * Schalter im Konto eine Attrappe, sobald jemand sein System umstellt.
 */
test.describe('Ohne eigene Wahl entscheidet das Gerät', () => {
  test.use({ colorScheme: 'dark' })

  test('dunkles System heißt dunkle App — schon vor dem ersten Zeichnen', async ({ context }) => {
    await seedAuth(context)
    const page = await context.newPage()
    await page.addInitScript(() => {
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'interactive') {
          ;(window as unknown as { __frueh?: string | null }).__frueh =
            document.documentElement.getAttribute('data-theme')
        }
      })
    })
    await page.goto('/training')
    expect(
      await page.evaluate(() => (window as unknown as { __frueh?: string | null }).__frueh ?? null),
    ).toBe('dark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('die eigene Wahl schlägt das System und bleibt', async ({ context }) => {
    await seedAuth(context)
    const page = await context.newPage()
    await page.goto('/konto')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.getByRole('button', { name: 'Hell' }).click()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark')

    // Neu laden: das System sagt weiterhin dunkel, die Wahl sagt hell. Die Wahl gewinnt.
    await page.reload()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark')
  })
})
