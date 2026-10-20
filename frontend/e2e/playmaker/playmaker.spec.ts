import { expect, test, type Page } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

/**
 * E2E fuer den Playmaker.
 *
 * Bewusst neben der Scoring-Suite: die prueft einen eigenen, empfindlichen Pfad und soll
 * nicht laenger werden, nur weil hier etwas dazukommt.
 *
 * Jeder Test legt sein eigenes Play an und raeumt es am Ende weg — die Start-Plays aus
 * V68 bleiben unangetastet.
 */

const TITEL_PREFIX = 'E2E-Playmaker'

test.beforeEach(async ({ context }) => {
  await seedAuth(context)
})

async function neuesPlay(page: Page, titel: string) {
  await page.goto('/orga/playmaker/neu')
  // Warten, bis die Kategorien da sind — vorher ist der Knopf gesperrt.
  await expect(page.getByRole('button', { name: 'Play bauen' })).toBeEnabled({ timeout: 15_000 })
  await page.getByLabel('Titel').fill(titel)
  await page.getByRole('button', { name: 'Play bauen' }).click()
  await page.waitForURL(/\/orga\/playmaker\/\d+\/bearbeiten/, { timeout: 15_000 })
}

/** Raeumt ueber die API auf — schneller und unabhaengig davon, wo das Play in der Liste steht. */
async function aufraeumen(page: Page, titel: string) {
  await page.evaluate(async (t) => {
    const auth = localStorage.getItem('auth')
    const kopf = { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` }
    const alle = await (await fetch('/api/plays', { headers: kopf })).json()
    for (const play of alle.filter((p: { title: string }) => p.title.startsWith(t))) {
      await fetch(`/api/plays/${play.id}`, { method: 'DELETE', headers: kopf })
    }
  }, titel)
}

/** Mittelpunkt eines Markers in Bildschirmkoordinaten. */
async function markerMitte(page: Page, kuerzel: string) {
  const box = await page.locator(`[data-marker="defender"][data-id="${kuerzel}"] circle`).boundingBox()
  if (!box) throw new Error(`Marker ${kuerzel} nicht gefunden`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('legt ein Play an und landet im Editor mit einem Stand', async ({ page }) => {
  const titel = `${TITEL_PREFIX} anlegen`
  await neuesPlay(page, titel)

  await expect(page.getByText('Stand 1 von 1')).toBeVisible()
  await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)

  await aufraeumen(page, titel)
})

test('zieht einen Marker und behaelt die neue Stelle', async ({ page }) => {
  const titel = `${TITEL_PREFIX} ziehen`
  await neuesPlay(page, titel)

  const vorher = await markerMitte(page, 'SS')
  await page.mouse.move(vorher.x, vorher.y)
  await page.mouse.down()
  await page.mouse.move(vorher.x - 30, vorher.y - 50, { steps: 8 })
  await page.mouse.up()

  const nachher = await markerMitte(page, 'SS')
  expect(Math.abs(nachher.x - vorher.x) + Math.abs(nachher.y - vorher.y)).toBeGreaterThan(10)

  await aufraeumen(page, titel)
})

test('legt mit "+ Stand" eine Kopie an und laesst Stand 1 unberuehrt', async ({ page }) => {
  const titel = `${TITEL_PREFIX} kopieren`
  await neuesPlay(page, titel)

  const start = await markerMitte(page, 'CF')
  await page.getByRole('button', { name: '+ Stand' }).click()
  await expect(page.getByText('Stand 2 von 2')).toBeVisible()

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 40, start.y + 40, { steps: 8 })
  await page.mouse.up()

  const inStand2 = await markerMitte(page, 'CF')
  expect(Math.abs(inStand2.x - start.x)).toBeGreaterThan(5)

  // Zurueck auf Stand 1: der CF muss dort stehen, wo er war.
  await page.getByRole('slider', { name: 'Stand' }).press('ArrowLeft')
  await expect(page.getByText('Stand 1 von 2')).toBeVisible()
  const inStand1 = await markerMitte(page, 'CF')
  expect(Math.abs(inStand1.x - start.x)).toBeLessThan(3)

  await aufraeumen(page, titel)
})

test('macht die letzte Bewegung rueckgaengig', async ({ page }) => {
  const titel = `${TITEL_PREFIX} undo`
  await neuesPlay(page, titel)

  const vorher = await markerMitte(page, '2B')
  await page.mouse.move(vorher.x, vorher.y)
  await page.mouse.down()
  await page.mouse.move(vorher.x + 35, vorher.y - 35, { steps: 8 })
  await page.mouse.up()

  await page.getByRole('button', { name: 'Rückgängig' }).click()

  const nachher = await markerMitte(page, '2B')
  expect(Math.abs(nachher.x - vorher.x)).toBeLessThan(3)
  expect(Math.abs(nachher.y - vorher.y)).toBeLessThan(3)

  await aufraeumen(page, titel)
})

test('spielt ab und laesst die Staende danach unveraendert', async ({ page }) => {
  const titel = `${TITEL_PREFIX} abspielen`
  await neuesPlay(page, titel)

  await page.getByRole('button', { name: '+ Stand' }).click()
  const start = await markerMitte(page, '1B')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x - 50, start.y - 30, { steps: 8 })
  await page.mouse.up()

  await page.getByRole('button', { name: 'Zurück' }).click()
  await page.waitForURL(/\/orga\/playmaker\/\d+$/)

  await page.getByRole('button', { name: 'Abspielen' }).click()
  await expect(page.getByText('Stand 2 von 2')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)

  await aufraeumen(page, titel)
})

test('scrollt auf kleinen Geraeten nicht', async ({ page }) => {
  const titel = `${TITEL_PREFIX} kein Scrollen`
  await neuesPlay(page, titel)

  for (const groesse of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(groesse)
    await page.waitForTimeout(200)
    const masse = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(masse.scrollHeight, `senkrecht bei ${groesse.width}`).toBeLessThanOrEqual(masse.innerHeight + 1)
    expect(masse.scrollWidth, `waagerecht bei ${groesse.width}`).toBeLessThanOrEqual(masse.innerWidth + 1)
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  await aufraeumen(page, titel)
})

test('fragt vor dem Loeschen eines Stands nach und nummeriert neu', async ({ page }) => {
  const titel = `${TITEL_PREFIX} stand loeschen`
  await neuesPlay(page, titel)

  await page.getByRole('button', { name: '+ Stand' }).click()
  await page.getByRole('button', { name: '+ Stand' }).click()
  await expect(page.getByText('Stand 3 von 3')).toBeVisible()

  await page.getByRole('button', { name: 'Stand löschen' }).click()
  await expect(page.getByText('Stand löschen?')).toBeVisible()
  await page.getByRole('button', { name: 'Löschen', exact: true }).click()

  await expect(page.getByText('Stand 2 von 2')).toBeVisible()

  await aufraeumen(page, titel)
})

test('überlebt die Pfeiltaste an beiden Enden der Zeitleiste', async ({ page }) => {
  const titel = `${TITEL_PREFIX} zeitleiste`
  await neuesPlay(page, titel)
  await page.getByRole('button', { name: '+ Stand' }).click()

  const leiste = page.getByRole('slider', { name: 'Stand' })
  await leiste.press('ArrowLeft')
  await leiste.press('ArrowLeft')
  await expect(page.getByText('Stand 1 von 2')).toBeVisible()

  await leiste.press('ArrowRight')
  await leiste.press('ArrowRight')
  await leiste.press('ArrowRight')
  await expect(page.getByText('Stand 2 von 2')).toBeVisible()

  // Nichts abgestürzt: die Marker sind noch da.
  await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)

  await aufraeumen(page, titel)
})

test('setzt einen Runner per Antippen auf Out', async ({ page }) => {
  const titel = `${TITEL_PREFIX} runner out`
  await neuesPlay(page, titel)

  await page.getByRole('button', { name: 'Runner +' }).click()
  const runner = page.locator('[data-marker="runner"]').first()
  await expect(runner).toBeVisible()

  const box = (await runner.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

  await expect(page.getByText('Out — durchgestrichen, dann weg')).toBeVisible()
  await page.getByText('Out — durchgestrichen, dann weg').click()

  await expect(page.locator('[data-marker="runner"][data-status="OUT"]')).toHaveCount(1)

  await aufraeumen(page, titel)
})

/** Wo der Ball in den Daten liegt, wenn ihn jemand haelt: genau auf seinem Halter. */
async function ballZustand(page: Page) {
  return page.evaluate(async () => {
    const auth = localStorage.getItem('auth')
    const id = location.pathname.match(/playmaker\/(\d+)/)![1]
    const play = await (await fetch(`/api/plays/${id}`, {
      headers: { Authorization: `Basic ${auth}` },
    })).json()
    return play.steps[0].markers.ball
  })
}

test('nimmt den Ball aus der Hand des Pitchers und gibt ihn einem anderen', async ({ page }) => {
  const titel = `${TITEL_PREFIX} ball werfen`
  await neuesPlay(page, titel)

  // Der Ball startet beim Pitcher — in den Daten auf dessen Koordinate.
  expect((await ballZustand(page)).holder).toBe('P')

  const ball = (await page.locator('[data-marker="ball"] circle').boundingBox())!
  const ziel = (await page.locator('[data-marker="defender"][data-id="1B"] circle').boundingBox())!

  await page.mouse.move(ball.x + ball.width / 2, ball.y + ball.height / 2)
  await page.mouse.down()
  // Der gegriffene Marker haengt 28 px ueber der Fingerkuppe, deshalb unterhalb zielen.
  await page.mouse.move(ziel.x + ziel.width / 2, ziel.y + ziel.height / 2 + 28, { steps: 10 })
  await page.mouse.up()

  await expect.poll(async () => (await ballZustand(page)).holder, { timeout: 8000 }).toBe('1B')

  await aufraeumen(page, titel)
})

test('legt den Ball frei hin, wenn kein Fielder in der Naehe ist', async ({ page }) => {
  const titel = `${TITEL_PREFIX} ball frei`
  await neuesPlay(page, titel)

  const ball = (await page.locator('[data-marker="ball"] circle').boundingBox())!
  await page.mouse.move(ball.x + ball.width / 2, ball.y + ball.height / 2)
  await page.mouse.down()
  await page.mouse.move(ball.x + 110, ball.y - 130, { steps: 10 })
  await page.mouse.up()

  await expect.poll(async () => (await ballZustand(page)).state, { timeout: 8000 }).toBe('LOOSE')
  expect((await ballZustand(page)).holder).toBeNull()

  await aufraeumen(page, titel)
})

test('nimmt einen Out per Antippen zurueck', async ({ page }) => {
  const titel = `${TITEL_PREFIX} out zurueck`
  await neuesPlay(page, titel)

  await page.getByRole('button', { name: 'Runner +' }).click()
  const runner = page.locator('[data-marker="runner"]').first()
  await expect(runner).toBeVisible()
  await runner.click()
  await page.getByText('Out — durchgestrichen, dann weg').click()
  await expect(page.locator('[data-marker="runner"][data-status="OUT"]')).toHaveCount(1)

  // Ein versehentlich ausgemachter Runner muss wieder erreichbar sein — sonst hilft nur
  // Rueckgaengig, und nach fuenf Zuegen gar nichts mehr.
  await page.locator('[data-marker="runner"]').first().click()
  await page.getByText('Läuft weiter — zurücknehmen').click()

  await expect(page.locator('[data-marker="runner"][data-status="ACTIVE"]')).toHaveCount(1)

  await aufraeumen(page, titel)
})

test('stellt die Flugbahn des Balls auf flach', async ({ page }) => {
  const titel = `${TITEL_PREFIX} flugbahn`
  await neuesPlay(page, titel)

  // locator.click() statt gerechneter Koordinaten: es wartet, bis der Marker steht.
  // Das Board misst sich beim ersten Rendern selbst, und unter Last lag der Ball beim
  // Lesen der Box noch woanders als beim Klick.
  await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)
  await page.locator('[data-marker="ball"] circle').click()

  await expect(page.getByText('Flach — Grounder oder Liner')).toBeVisible()
  await page.getByText('Flach — Grounder oder Liner').click()
  await page.getByRole('button', { name: 'Fertig' }).click()

  await expect.poll(async () => (await ballZustand(page)).trajectory, { timeout: 8000 }).toBe('GROUND')

  await aufraeumen(page, titel)
})

test('zeigt die Legende', async ({ page }) => {
  const titel = `${TITEL_PREFIX} legende`
  await neuesPlay(page, titel)
  await page.getByRole('button', { name: 'Zurück' }).click()
  await page.waitForURL(/\/orga\/playmaker\/\d+$/)

  await page.getByRole('button', { name: 'Legende' }).click()
  await expect(page.getByText('Verteidiger, mit Positionskürzel')).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()

  await aufraeumen(page, titel)
})

test('laesst ein Start-Play bearbeiten und sichern', async ({ page }) => {
  // Die Start-Plays rechnen ihre Dauer aus der Strecke und tragen deshalb Werte wie
  // 1400 oder 2200 ms. Ein Editor, der sie beim Sichern mitschickt, lief gegen eine
  // Pruefung, die nur 600/1200/2000 kannte — jede Aenderung an einem Start-Play
  // scheiterte mit 400, ohne dass man je ein eigenes Play gebaut haette.
  await page.goto('/orga/playmaker')
  await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })
  await page.getByRole('link', { name: /Grounder zum SS/ }).first().click()
  await page.waitForURL(/\/orga\/playmaker\/\d+$/)

  await page.getByRole('button', { name: 'Ändern' }).click()
  await page.waitForURL(/\/bearbeiten$/)

  const notiz = page.getByLabel('Notiz')
  const vorher = await notiz.inputValue()
  await notiz.fill('Geprüft im Editor')
  await expect(page.getByText('Gesichert')).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Zurück' }).click()
  await page.waitForURL(/\/orga\/playmaker\/\d+$/)
  await expect(page.getByText('Geprüft im Editor')).toBeVisible()

  // Start-Plays gehoeren allen. Der Test gibt die Notiz zurueck, wie er sie vorfand.
  //
  // Geprueft wird am Server, nicht am Kopf der Seite: "Gesichert" steht dort auch, bevor
  // die Entprellung ueberhaupt losgelaufen ist — der Test waere vorbei und die Seite zu,
  // bevor der PUT rausgeht.
  await page.getByRole('button', { name: 'Ändern' }).click()
  await page.waitForURL(/\/bearbeiten$/)
  await page.getByLabel('Notiz').fill(vorher)
  await expect.poll(async () => gespeicherteNotiz(page), { timeout: 10_000 }).toBe(vorher)
})

/** Die Notiz des ersten Standes, wie der Server sie kennt. */
async function gespeicherteNotiz(page: Page) {
  return page.evaluate(async () => {
    const auth = localStorage.getItem('auth')
    const id = location.pathname.match(/playmaker\/(\d+)/)![1]
    const play = await (await fetch(`/api/plays/${id}`, {
      headers: { Authorization: `Basic ${auth}` },
    })).json()
    return play.steps[0].note as string
  })
}

test('wechselt ueber das Gegenstueck auf ein anderes Play', async ({ page }) => {
  // Derselbe Route, nur eine andere id: die Seite wird NICHT neu aufgebaut. Ohne
  // Abbruchmarke und eigenen Baum je Play blieb das alte Play stehen — und der Editor
  // haette dessen Staende unter der neuen id gesichert.
  const titel = `${TITEL_PREFIX} gegenstueck`
  await page.goto('/orga/playmaker/neu')
  await expect(page.getByRole('button', { name: 'Play bauen' })).toBeEnabled({ timeout: 15_000 })
  await page.getByLabel('Titel').fill(titel)
  await page.getByRole('button', { name: 'Knapp, spätes Inning' }).click()

  const auswahl = page.getByLabel('Gegenstück')
  await expect(auswahl).toBeVisible()
  // Ein Start-Play als Gegenstueck, nie eines aus einem frueheren Lauf: zwei Plays mit
  // demselben Titel machen die Pruefung am Ende sinnlos.
  const option = auswahl.locator('option').filter({ hasNotText: TITEL_PREFIX }).nth(1)
  const gegenTitel = (await option.textContent())!.trim()
  await auswahl.selectOption(await option.getAttribute('value'))

  await page.getByRole('button', { name: 'Play bauen' }).click()
  await page.waitForURL(/\/orga\/playmaker\/\d+\/bearbeiten/, { timeout: 15_000 })
  await page.getByRole('button', { name: 'Zurück' }).click()
  await page.waitForURL(/\/orga\/playmaker\/\d+$/)

  await expect(page.getByRole('heading', { name: titel })).toBeVisible()
  await page.getByRole('link', { name: new RegExp(`Gegenstück: ${gegenTitel}`) }).click()

  await expect(page.getByRole('heading', { name: gegenTitel })).toBeVisible()
  await expect(page.getByRole('heading', { name: titel })).toHaveCount(0)

  await aufraeumen(page, titel)
})

test('findet ein Play ueber eine Notiz und sagt, warum es dasteht', async ({ page }) => {
  await page.goto('/orga/playmaker')
  await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })

  // "Foul-Gebiet" steht in keinem Titel, nur in Notizen.
  await page.getByLabel('Plays durchsuchen').fill('foul-gebiet')

  // Beide Treffer stehen auf der Seite: der beste als Hero, der zweite als Zeile. Die
  // Zeile sagt dazu, WARUM sie dasteht — der Titel enthaelt das Wort naemlich nicht.
  await expect(page.getByText('Überwurf an der 1 — wer sichert ab')).toBeVisible()
  await expect(page.getByText('Single ins RF — Backup hinter der 1')).toBeVisible()
  await expect(page.locator('.group').filter({ hasText: 'Notiz:' })).toHaveCount(1)
})

test('sagt, wenn nichts zu finden ist, ohne dass die Seite springt', async ({ page }) => {
  await page.goto('/orga/playmaker')
  await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })

  const feld = page.getByLabel('Plays durchsuchen')
  await feld.scrollIntoViewIfNeeded()
  const vorher = (await feld.boundingBox())!.y

  await feld.fill('f')
  await expect(page.getByLabel('Plays durchsuchen')).toHaveValue('f')
  const mitTreffern = (await feld.boundingBox())!.y

  await feld.fill('gibtesnicht')
  await expect(page.getByText(/Nichts zu/)).toBeVisible()
  const ohneTreffer = (await feld.boundingBox())!.y

  // Das Suchfeld darf sich beim Tippen nicht bewegen — am Handy tippt man sonst neben
  // die Zeile, sobald die Tastatur hochkommt. Gemessen waren es vorher 256 px.
  expect(Math.abs(mitTreffern - vorher)).toBeLessThanOrEqual(1)
  expect(Math.abs(ohneTreffer - vorher)).toBeLessThanOrEqual(1)

  await page.getByRole('button', { name: 'Suche leeren' }).click()
  await expect(feld).toHaveValue('')
})

test('gliedert die ungefilterte Liste nach Kategorie', async ({ page }) => {
  await page.goto('/orga/playmaker')
  await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })

  // Ohne Filter: Ueberschriften, damit einundfuenfzig Plays navigierbar bleiben.
  await expect(page.getByRole('heading', { name: /Bunt-Defense/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Rundown/ })).toBeVisible()

  // Mit Filter ist die Liste selbst schon die Antwort — dann gliedert nichts.
  const wert = await page
    .getByLabel('Kategorie')
    .locator('option', { hasText: 'Rundown' })
    .getAttribute('value')
  await page.getByLabel('Kategorie').selectOption(wert!)
  await expect(page.getByRole('heading', { name: /Bunt-Defense/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /Rundown/ })).toHaveCount(0)
})

test('sagt beim Kopieren, dass es geklappt hat, und fragt vorm Löschen', async ({ page }) => {
  const titel = `${TITEL_PREFIX} kopie-${Date.now().toString(36)}`
  await neuesPlay(page, titel)
  await page.getByRole('button', { name: 'Zurück' }).click()
  await page.waitForURL(/\/orga\/playmaker\/\d+$/)
  await page.goto('/orga/playmaker')
  await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })

  // Erst suchen: dann ist GENAU dieses Play das Hero, egal was parallel laufende Tests
  // sonst gerade anlegen. Das Hero ist die Stelle, an der es die beiden Knoepfe vorher
  // nicht gab — man musste es erst wegfiltern.
  await page.getByLabel('Plays durchsuchen').fill(titel)
  await expect(page.getByRole('button', { name: 'Play duplizieren' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Play duplizieren' }).first().click()
  await expect(page.getByText(new RegExp(`Kopie von .${titel}`))).toBeVisible({ timeout: 10_000 })

  // Loeschen fragt nach — es ist nicht rueckgaengig zu machen. Ein Toast waere zu wenig.
  await page.getByLabel('Plays durchsuchen').fill(`${titel} (Kopie)`)
  await expect(page.getByRole('button', { name: 'Play löschen' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Play löschen' }).first().click()
  await expect(page.getByText('Play löschen?')).toBeVisible()
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(page.getByText('Play löschen?')).toHaveCount(0)

  await page.getByRole('button', { name: 'Play löschen' }).first().click()
  // Der Bestaetigungsknopf heisst auch "Löschen" — im Modal, nicht in der Liste.
  await page.getByRole('button', { name: 'Löschen', exact: true }).click()
  await expect(page.getByText(/gelöscht/)).toBeVisible({ timeout: 10_000 })

  await aufraeumen(page, titel)
})

test('klappt Kategorien zu und merkt sich das', async ({ page }) => {
  await page.goto('/orga/playmaker')
  await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })

  const rundown = page.getByRole('button', { name: /^Rundown/ })
  await expect(rundown).toHaveAttribute('aria-expanded', 'true')
  await rundown.click()
  await expect(rundown).toHaveAttribute('aria-expanded', 'false')

  // Zugeklappt sind die Ueberschriften das Inhaltsverzeichnis: alles zu, Seite kurz.
  await page.getByRole('button', { name: 'Alle zu' }).click()
  const kurz = await page.evaluate(() => document.body.scrollHeight)
  await page.getByRole('button', { name: 'Alle auf' }).click()
  const lang = await page.evaluate(() => document.body.scrollHeight)
  expect(lang).toBeGreaterThan(kurz * 2)

  // Es ist eine Bequemlichkeit je Geraet — sie ueberlebt das Neuladen.
  await page.getByRole('button', { name: 'Alle zu' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: /^Rundown/ })).toHaveAttribute('aria-expanded', 'false', {
    timeout: 15_000,
  })

  // Aufraeumen, damit der naechste Test eine offene Liste vorfindet.
  await page.getByRole('button', { name: 'Alle auf' }).click()
  await expect(page.getByRole('button', { name: /^Rundown/ })).toHaveAttribute('aria-expanded', 'true')
})

test('gibt dem Feld auch quer gehalten die ganze Höhe', async ({ page }) => {
  // Quer ist der Bildschirm 390 px hoch. Ohne eigenes Raster blieb fuers Feld ein
  // 127 px hohes Band — gemessen —, in dem die Raute verschwindet. Querformat zaehlt
  // deshalb wie Desktop: Leisten nach rechts.
  const titel = `${TITEL_PREFIX} quer`
  await neuesPlay(page, titel)

  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)

  const board = (await page.locator('svg').first().boundingBox())!
  expect(board.height).toBeGreaterThan(300)
  expect(board.width / board.height).toBeLessThan(2)

  // Und es wird trotzdem nicht gescrollt.
  const scrollt = await page.evaluate(() => document.body.scrollHeight > window.innerHeight + 2)
  expect(scrollt).toBe(false)

  await page.setViewportSize({ width: 390, height: 844 })
  await aufraeumen(page, titel)
})

test('zeigt die Start-Plays aus der Migration', async ({ page }) => {
  await page.goto('/orga/playmaker')
  await expect(page.getByRole('heading', { name: 'Playmaker' })).toBeVisible()
  // Die Kategorie steht in einer <option> — sichtbar ist sie erst beim Aufklappen,
  // deshalb wird der Wert geprueft, nicht die Sichtbarkeit.
  await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })
})
