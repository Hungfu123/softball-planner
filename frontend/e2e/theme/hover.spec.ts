import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'
import { messeHover, bericht } from '../helpers/kontrast'

/*
 * Derselbe Vergleich wie in kontrast.spec.ts, aber mit dem Zeiger auf den Elementen.
 *
 * Nötig, weil der Hover im Dunkeln nicht einfach dieselbe Farbe wie der Ruhezustand
 * sein darf: `bg-cream-50 hover:bg-cream-100` stünde sonst nach dem Umdeuten auf
 * derselben Fläche — der Hover wäre weg. Im Hellen ging er nach UNTEN (hell → dunkel),
 * im Dunkeln muss er nach OBEN. Dieser Test prüft nur die Lesbarkeit; dass die
 * Bewegung überhaupt stattfindet, steht als Zahl im Kommentar der CSS-Schicht.
 *
 * Weniger Routen als beim Ruhe-Prüfer: jedes Element wird einzeln angefahren, das
 * kostet Zeit. Genommen sind die vier mit den meisten anfassbaren Zeilen.
 */

const SEITEN = ['/', '/training', '/players', '/orga']

test.describe('Kontrast unter dem Zeiger', () => {
  test.beforeEach(async ({ context }) => {
    await seedAuth(context)
  })

  for (const pfad of SEITEN) {
    test(`${pfad} bleibt im Dunkeln auch beim Überfahren lesbar`, async ({ page }) => {
      await page.goto(pfad)
      await page.waitForLoadState('networkidle')
      // Siehe kontrast.spec.ts: während eines Übergangs liefert getComputedStyle den
      // Zwischenwert — beim Hover wäre das die Farbe von VOR dem Überfahren.
      await page.addStyleTag({
        content: '*,*::before,*::after{transition:none !important;animation:none !important}',
      })

      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
      const hell = await messeHover(page)

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      const dunkel = await messeHover(page)

      expect(
        dunkel.unsichtbar,
        `Unsichtbarer Text unter dem Zeiger auf ${pfad}:\n${bericht(dunkel.unsichtbar)}`,
      ).toHaveLength(0)

      expect(
        dunkel.aa.length,
        `Der Dunkelmodus ist unter dem Zeiger auf ${pfad} schlechter als das helle Theme ` +
          `(${dunkel.aa.length} statt ${hell.aa.length} AA-Verstoesse):\n${bericht(dunkel.aa)}`,
      ).toBeLessThanOrEqual(hell.aa.length)
    })
  }
})
