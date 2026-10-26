import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'
import { messeKontrast, bericht } from '../helpers/kontrast'

/*
 * Haelt der Dunkelmodus, was das helle Theme kann?
 *
 * Absolute Zahlen taugen hier nicht als Grenze: wie viel Text eine Seite zeigt, haengt
 * am Datenstand, und beide Themes tragen Altlasten (die Positionsbuchstaben auf dem
 * gruenen Feld im Playmaker stehen bei 2,21:1 — in HELL genauso). Gemessen wird deshalb
 * dieselbe Seite zweimal, und verglichen werden die beiden Ergebnisse:
 *
 *   1. Im Dunkeln darf nichts unsichtbar sein (< 1,6:1). Harte Grenze.
 *   2. Der Dunkelmodus darf nicht mehr AA-Verstoesse haben als das helle Theme.
 *      Altlasten faellt er damit nicht zur Last — neue aber sehr wohl.
 *
 * Umgeschaltet wird am gerenderten DOM (`data-theme` auf <html>), nicht ueber einen
 * Neuaufbau: so messen beide Durchlaeufe denselben Inhalt, und der Vergleich traegt.
 * Der Schnipsel in index.html, der das Theme vor dem ersten Paint setzt, ist hier
 * nicht im Spiel — den prueft, wer das Aufblitzen prueft.
 *
 * Die Umstellung auf Tokens laeuft noch (siehe Shim in styles/index.css). Dieser Test
 * ist ihr Netz: er sagt nach jeder umgestellten Seite, ob sie fertig ist, ohne dass man
 * 170 Dateien durchklickt.
 */

const SEITEN = [
  '/',
  '/training',
  '/players',
  '/stats',
  '/orga',
  '/kalender',
  '/konto',
  '/spielbogen',
  '/orga/playmaker',
  '/orga/playmaker/frei',
  '/counter',
]

test.describe('Kontrast in beiden Themes', () => {
  test.beforeEach(async ({ context }) => {
    await seedAuth(context)
  })

  for (const pfad of SEITEN) {
    test(`${pfad} bleibt im Dunkeln lesbar`, async ({ page }) => {
      await page.goto(pfad)
      await page.waitForLoadState('networkidle')

      // Ohne das misst man die Farbe von gestern: Karten tragen `transition-all`, und
      // getComputedStyle liefert waehrend eines Uebergangs den Zwischenwert — direkt nach
      // dem Umschalten also noch den hellen. Genau darueber bin ich hier gestolpert.
      await page.addStyleTag({
        content: '*,*::before,*::after{transition:none !important;animation:none !important}',
      })

      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
      const hell = await messeKontrast(page)

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      const dunkel = await messeKontrast(page)

      expect(
        dunkel.unsichtbar,
        `Unsichtbarer Text im Dunkelmodus auf ${pfad}:\n${bericht(dunkel.unsichtbar)}`,
      ).toHaveLength(0)

      expect(
        dunkel.aa.length,
        `Der Dunkelmodus ist auf ${pfad} schlechter als das helle Theme ` +
          `(${dunkel.aa.length} statt ${hell.aa.length} AA-Verstoesse):\n${bericht(dunkel.aa)}`,
      ).toBeLessThanOrEqual(hell.aa.length)
    })
  }
})
