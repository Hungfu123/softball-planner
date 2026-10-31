import { test, expect } from '@playwright/test'
import { seedAuth, seedDashboardSaison } from '../helpers/auth'
import { messeKontrast, bericht, helleFlaechenOhneDunkleTinte, bloeckeOhneRand } from '../helpers/kontrast'

/*
 * Haelt der Dunkelmodus, was das helle Theme kann?
 *
 * Absolute Zahlen taugen hier nicht als Grenze: wie viel Text eine Seite zeigt, haengt
 * am Datenstand, und beide Themes tragen Altlasten. Gemessen wird deshalb
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
  // Seit dem 27.10.2026 getrennt: `/` ist die eigene Startseite, die Werkbank liegt hier.
  // Beide gehoeren gemessen — die Hero-Karte steht nur noch auf dieser.
  '/spielbetrieb',
  '/training',
  '/players',
  '/players/1',
  '/gameday/1',
  // Das alte Live-Scoring. Lief bisher in keiner Messung mit — und genau dort standen
  // die Base-Beschriftungen als dunkles Grau auf dunklem Feld.
  // Grenze, die man kennen muss: hier wird nur der EINSTIEG gemessen (der Dialog
  // "Wer schlägt zuerst?" liegt darüber). Das Feld mit Runnern und die Vollbild-
  // Blitzer (K!, HR!, HBP) brauchen einen gesetzten Spielstand und kommen hier nicht
  // vor; die wurden von Hand über die Test-Fixture gemessen (dunkel 9 Befunde gegen
  // hell 10, also nicht schlechter).
  '/gameday/1/scoring/0',
  '/stats',
  '/orga',
  '/orga/accounts',
  '/orga/einladungen',
  '/orga/whatsapp-umfrage',
  '/orga/trainerabrechnung',
  '/teams',
  '/teams/spiele',
  '/kalender',
  '/konto',
  '/spielbogen',
  '/orga/playmaker',
  // Das Play selbst, nicht nur der Katalog: hier liegen Buehne, Titel, "Achte auf" und
  // die Knopfleiste uebereinander, und hier faellt auf, wenn eine davon im Dunkeln die
  // Farbe des Grundes traegt. Setzt voraus, dass Play 1 in der Datenbank steht — ohne
  // das zeigt die Seite ihren Leerzustand und die Messung geht ins Leere statt rot.
  '/orga/playmaker/1',
  '/orga/playmaker/frei',
  // Die Spielwissen-Buehnen sind in BEIDEN Themes navy. Genau deshalb gehoeren sie hier
  // hinein: was auf ihnen eine Paletten-Klasse traegt, deutet der Shim im Dunkeln um und
  // dreht Aussagen herum, die fest sein sollen. Der Paletten-Waechter sieht das nicht,
  // er prueft Abdeckung, nicht Lesbarkeit.
  '/spielwissen',
  '/spielwissen/box',
  '/counter',
]

/*
 * Die Anmeldemaske ist die erste Seite, die jeder sieht — und die einzige, die niemand
 * angemeldet zu Gesicht bekommt. Sie fiel deshalb aus jeder Messung heraus. Sie ist in
 * beiden Themes dunkel gebaut, der Vergleich hell/dunkel sagt hier also nichts; geprüft
 * wird, was absolut gilt.
 */
test('Die Anmeldemaske bleibt lesbar', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.addStyleTag({
    content: '*,*::before,*::after{transition:none !important;animation:none !important}',
  })
  await expect(page.getByRole('button', { name: 'Ready Up' })).toBeVisible()

  for (const theme of ['hell', 'dunkel'] as const) {
    await page.evaluate(t => {
      if (t === 'dunkel') document.documentElement.setAttribute('data-theme', 'dark')
      else document.documentElement.removeAttribute('data-theme')
    }, theme)
    const m = await messeKontrast(page)
    expect(m.unsichtbar, `Unsichtbarer Text auf der Anmeldemaske (${theme}):\n${bericht(m.unsichtbar)}`).toHaveLength(0)
    expect(
      m.aa,
      `Die Anmeldemaske unterschreitet AA (${theme}) — sie ist der erste Kontakt, ` +
        `dort gibt es keine Altlasten zu dulden:\n${bericht(m.aa)}`,
    ).toHaveLength(0)
  }

  expect(await helleFlaechenOhneDunkleTinte(page)).toHaveLength(0)
})

test.describe('Kontrast in beiden Themes', () => {
  test.beforeEach(async ({ context }) => {
    await seedAuth(context)
    // Sonst zeigt `/` nur den Leerzustand und die Hero-Karte wird nie gemessen.
    await seedDashboardSaison(context)
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

      const randlos = await bloeckeOhneRand(page)
      expect(
        randlos,
        `Bloecke ohne Rand im Dunkelmodus auf ${pfad} — sie geben sich mit Rundung oder ` +
          `Schatten als eigene Karte aus, tragen aber die Farbe dessen, worauf sie liegen:\n` +
          randlos.map(b => `    ${b.wo} ${b.gross} ${b.farbe} auf ${b.dahinter} = ${b.kontrast}:1`).join('\n'),
      ).toHaveLength(0)

      const hell_geblieben = await helleFlaechenOhneDunkleTinte(page)
      expect(
        hell_geblieben,
        `Helle Flächen im Dunkelmodus auf ${pfad} — ohne dunkle Schrift darauf ist das ` +
          `keine Umkehrung, sondern eine vergessene Fläche:\n` +
          hell_geblieben.map(f => `    ${f.wo} ${f.gross} ${f.farbe} / Schrift ${f.tinte}`).join('\n'),
      ).toHaveLength(0)

      expect(
        dunkel.aa.length,
        `Der Dunkelmodus ist auf ${pfad} schlechter als das helle Theme ` +
          `(${dunkel.aa.length} statt ${hell.aa.length} AA-Verstoesse):\n${bericht(dunkel.aa)}`,
      ).toBeLessThanOrEqual(hell.aa.length)
    })
  }
})
