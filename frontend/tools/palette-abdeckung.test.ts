import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/*
 * Wer passt auf den Shim auf?
 *
 * Der Dunkelmodus deutet rund 3.770 feste Paletten-Klassen um — aufgezählt von Hand, in
 * index.css. Genau das ist seine Schwäche: eine Klasse, die ich nicht aufgezählt habe,
 * behält still ihren hellen Wert. Man sieht es erst, wenn jemand hinschaut, und in einer
 * Dev-Datenbank ohne Daten rendern die betroffenen Karten oft gar nicht.
 *
 * In einer Nacht sind mir so sieben Lecks durchgerutscht, jedes nach einem „jetzt ist es
 * vollständig": die hover:-Varianten, die `fill-*`-Klassen (in SVG malt fill, nicht
 * color), dreizehn von sechzehn Alpha-Stufen, der Fensterhintergrund, und zuletzt
 * `text-gray-950` — ausgerechnet auf Kartenüberschriften.
 *
 * Dieser Test dreht die Beweislast um. Jede Paletten-Klasse, die die App benutzt, muss
 * entweder im Dunkel-Block umgedeutet sein ODER hier unten mit einem Grund stehen.
 * Nichts darf einfach durchfallen.
 *
 * Er misst keine Farben — das tun die Playwright-Specs in e2e/theme. Er prüft nur, dass
 * niemand vergessen wurde.
 */

/*
 * Die Datei liegt in tools/ und nicht in src/: sie liest echte Dateien, und src/ wird mit
 * den Browser-Typen uebersetzt — dort gibt es kein node:fs. Der Weg ueber Vite (`?raw`)
 * scheidet aus, weil vitest mit `css: false` laeuft und CSS-Importe zu einem leeren
 * String werden; der Test waere dann gruen, ohne irgendetwas gelesen zu haben.
 */
const WURZEL = join(import.meta.dirname, '..', 'src')
const CSS_PFAD = join(WURZEL, 'styles', 'index.css')

/** Klassen, die im Dunkeln bewusst bleiben, wie sie sind. Jede Zeile braucht einen Grund. */
const UNVERAENDERT: { muster: RegExp; grund: string }[] = [
  {
    muster: /^(?:[\w-]+:)*(?:text|fill|stroke|decoration|placeholder)-white(?:\/\d+)?$/,
    grund: 'Weiss ist im Dunkeln schon richtig',
  },
  {
    muster: /^(?:[\w-]+:)*(?:text|fill|stroke|placeholder)-cream-\d+(?:\/\d+)?$/,
    grund: 'Cream als Schrift sitzt auf dunklem Grund — dort gehoert sie hin',
  },
  {
    muster: /^(?:[\w-]+:)*(?:text|fill|stroke|placeholder)-navy-(?:50|100|200|300)(?:\/\d+)?$/,
    grund: 'Helle Navy-Stufen sind Schrift AUF dunklem Grund',
  },
  {
    muster: /^(?:[\w-]+:)*(?:text|fill|stroke)-gray-(?:100|200|300)(?:\/\d+)?$/,
    grund: 'Helle Graustufen sind Schrift auf dunklem Grund',
  },
  {
    muster: /^(?:[\w-]+:)*(?:text|fill|stroke)-(?:softball-red|amber|emerald|rose|sky|blue|green|yellow|teal|orange|zinc|slate)-(?:100|200|300|400)(?:\/\d+)?$/,
    grund: 'Helle Status-Stufen tragen schon auf dunklem Grund',
  },
  {
    muster: /^(?:[\w-]+:)*bg-zinc-(?:300|400)$/,
    grund: 'Silber der Medaillen-Plakette — eine Materialfarbe, kein Theme-Wert',
  },
  {
    muster: /^(?:[\w-]+:)*ring-(?:softball-red|amber|emerald|sky|rose)-(?:100|200|300)(?:\/\d+)?$/,
    grund: 'Heller Fokus-/Signalring, auf dunklem Grund sichtbar',
  },
  {
    muster: /^(?:[\w-]+:)*(?:bg|border|divide|ring|from|to|via)-white\/\d+$/,
    grund: 'Heller Schleier auf dunklem Grund — das Gegenteil des Problems',
  },
  {
    muster: /^(?:[\w-]+:)*(?:bg|border|divide|ring|from|to|via)-cream-50\/\d+$/,
    grund: 'Cream mit Deckkraft ist ein heller Schleier auf der Buehne — und die ist in beiden Themes navy',
  },
  {
    muster: /^(?:[\w-]+:)*(?:bg|border|divide|ring)-black(?:\/\d+)?$/,
    grund: 'Schwarz als Verdunklung wirkt in beiden Themes gleich',
  },
  {
    muster: /^(?:[\w-]+:)*border-white$/,
    grund: 'Weisser Rand auf dunklem Grund',
  },
  {
    muster: /^(?:[\w-]+:)*(?:border|ring|divide)-cream-\d+\/\d+$/,
    grund: 'Cream mit Deckung als Linie auf dunklem Grund',
  },
  {
    muster: /^(?:[\w-]+:)*(?:bg|border|ring|from|to|via)-(?:softball-red|amber|emerald|rose|sky|blue|green|yellow|orange|purple|indigo|teal)-(?:400|500|600|700|800|900|950)(?:\/\d+)?$/,
    grund: 'Gesaettigte Flaeche: Farbe IST die Aussage und bleibt in beiden Themes',
  },
  {
    muster: /^(?:[\w-]+:)*bg-(?:navy-950|gray-(?:400|500|600|700|800|900|950))(?:\/\d+)?$/,
    grund: 'Dunkle Flaeche mit heller Schrift — im Dunkeln unveraendert richtig',
  },
  {
    muster: /^(?:[\w-]+:)*ring-(?:navy-(?:50|100|200|300)|cream-\d+)(?:\/\d+)?$/,
    grund: 'Heller Fokusring, auf dunklem Grund sichtbar',
  },
]

const PALETTE =
  '(?:cream|navy|gray|white|black|softball-red|amber|emerald|sky|rose|blue|green|red|yellow|orange|purple|indigo|teal|slate|zinc)'
const KLASSE = new RegExp(
  `(?<![\\w:-])((?:hover:|focus:|focus-visible:|active:|group-hover:|peer-hover:|disabled:)?` +
    `(?:bg|text|border|fill|stroke|divide|ring|placeholder|decoration)-${PALETTE}(?:-\\d{1,3})?(?:\\/\\d{1,3})?)`,
  'g',
)

function tsxDateien(verzeichnis: string, gesammelt: string[] = []): string[] {
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag)
    if (statSync(pfad).isDirectory()) tsxDateien(pfad, gesammelt)
    else if (eintrag.endsWith('.tsx') && !eintrag.endsWith('.test.tsx')) gesammelt.push(pfad)
  }
  return gesammelt
}

const QUELLEN: [pfad: string, inhalt: string][] = tsxDateien(WURZEL).map(p => [
  p.slice(WURZEL.length + 1),
  readFileSync(p, 'utf-8'),
])

describe('Paletten-Abdeckung im Dunkelmodus', () => {
  it('deutet jede benutzte Paletten-Klasse um — oder nennt den Grund, warum nicht', () => {
    const css = readFileSync(CSS_PFAD, 'utf-8')
    // Dass ueberhaupt etwas gelesen wurde, muss der Test selbst wissen — sonst waere er
    // bei einer leeren Datei still gruen und haette nichts geprueft.
    expect(css.length, 'index.css konnte nicht gelesen werden').toBeGreaterThan(1000)
    const dunkel = css.slice(css.indexOf('@media not print'))
    expect(dunkel.length, 'Der Dunkel-Block wurde in index.css nicht gefunden').toBeGreaterThan(1000)
    const umgedeutet = new Set(
      [...dunkel.matchAll(/\.((?:[a-z-]+\\:)*[a-z-]+-[a-z0-9]+(?:-\d{1,3})?(?:\\\/\d{1,3})?)/g)].map(m =>
        m[1].replace(/\\/g, ''),
      ),
    )

    const benutzt = new Map<string, string[]>()
    for (const [pfad, inhalt] of QUELLEN) {
      for (const treffer of inhalt.matchAll(KLASSE)) {
        const k = treffer[1]
        const liste = benutzt.get(k) ?? []
        if (!liste.includes(pfad)) liste.push(pfad)
        benutzt.set(k, liste)
      }
    }

    const durchgefallen = [...benutzt.entries()]
      .filter(([k]) => !umgedeutet.has(k) && !UNVERAENDERT.some(u => u.muster.test(k)))
      .map(([k, dateien]) => `  ${k}  —  ${dateien.slice(0, 2).join(', ')}${dateien.length > 2 ? ` (+${dateien.length - 2})` : ''}`)

    expect(
      durchgefallen,
      'Diese Paletten-Klassen behalten im Dunkelmodus still ihren hellen Wert.\n' +
        'Entweder in styles/index.css unter [data-theme="dark"] umdeuten, oder hier in\n' +
        'UNVERAENDERT eintragen — mit einem Grund, der erklaert, warum sie bleiben darf:\n\n' +
        durchgefallen.join('\n') +
        '\n',
    ).toEqual([])
  })

  it('traegt keine Gruende mit sich, die niemand mehr braucht', () => {
    const inhalt = QUELLEN.map(([, i]) => i).join('\n')
    const benutzt = new Set([...inhalt.matchAll(KLASSE)].map(m => m[1]))
    const tote = UNVERAENDERT.filter(u => ![...benutzt].some(k => u.muster.test(k))).map(u => u.grund)
    expect(tote, `Diese Ausnahmen greifen auf keine benutzte Klasse mehr:\n${tote.join('\n')}`).toEqual([])
  })
})
