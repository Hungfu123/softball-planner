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

/**
 * Mittelpunkt eines Markers in Bildschirmkoordinaten.
 *
 * Erst WARTEN, dann messen. `boundingBox()` fragt den Stand in genau diesem Augenblick ab
 * und gibt `null` zurueck, wenn das Feld noch nicht gezeichnet ist — ohne zu warten. Unter
 * Last in der CI traf das regelmaessig zu und meldete „Marker SS nicht gefunden", als waere
 * der Marker weg; da war er nur noch nicht da. Der Griff selbst war nie das Problem.
 */
async function markerMitte(page: Page, kuerzel: string) {
  const marker = page.locator(`[data-marker="defender"][data-id="${kuerzel}"] circle`)
  await marker.waitFor({ state: 'visible' })
  const box = await marker.boundingBox()
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
  // Die Zeile „Stand 2 von 2" gibt es nicht mehr — gezaehlt wird am Haken der Liste:
  // der laufende Stand traegt aria-current, und am Ende ist das der zweite.
  await expect(page.locator('li:nth-child(2) [aria-current="step"]')).toBeVisible({ timeout: 10_000 })
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

  const ball = (await page.locator('[data-marker="ball"] circle:first-of-type').boundingBox())!
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

  // Erst wenn alle neun stehen, hat sich das Board selbst gemessen — vorher liegt der
  // Ball beim Lesen der Box noch woanders als beim Zugriff, und unter Last war genau das
  // der Grund, aus dem dieser Test gelegentlich allein rot wurde.
  await expect(page.locator('[data-marker="defender"]')).toHaveCount(9)
  const ball = (await page.locator('[data-marker="ball"] circle:first-of-type').boundingBox())!
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
  await page.locator('[data-marker="ball"] circle:first-of-type').click()

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

test('blaettert am Rechner mit den Pfeiltasten', async ({ page }) => {
  // Dieselbe Taste tut in den Karten des Spielwissens dasselbe. Sie blaettert PLAYS,
  // nicht Staende — einzelne Staende waehlt man in der Liste daneben.
  await page.goto('/orga/playmaker')
  await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })

  await page.locator('a[href^="/orga/playmaker/"]').filter({ hasNotText: 'Freies Feld' }).first().click()
  await page.waitForURL(/\/orga\/playmaker\/\d+$/)
  // Erst wenn die Leiste steht, kennt die Seite ihre Nachbarn — die Liste kommt aus einem
  // zweiten Abruf. Vorher gedrueckt, passiert zu Recht nichts.
  const leiste = page.getByText(/Play \d+ von \d+/)
  await expect(leiste).toBeVisible({ timeout: 15_000 })
  const erstes = page.url()
  const stand = await leiste.textContent()

  await page.keyboard.press('ArrowRight')
  // Auf die LEISTE warten, nicht auf die Adresse: die Adresse steht einen Wimpernschlag
  // frueher als die Seite, und wer in diesem Moment zurueckdrueckt, drueckt noch gegen
  // die Nachbarn des alten Plays. Ein Mensch sieht erst das neue Play.
  await expect.poll(() => leiste.textContent(), { timeout: 5000 }).not.toBe(stand)
  expect(page.url()).not.toBe(erstes)

  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => page.url(), { timeout: 5000 }).toBe(erstes)
})

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

  // Beide Treffer stehen als Zeile auf der Seite, und jede sagt dazu, WARUM sie dasteht —
  // der Titel enthaelt das Wort naemlich nicht. Frueher war der beste Treffer ein grosses
  // Feld oben und trug den Grund nicht mit; seit das Feld weg ist, sind es zwei Zeilen
  // und zwei Begruendungen.
  await expect(page.getByText('Überwurf an der 1 — wer sichert ab')).toBeVisible()
  await expect(page.getByText('Single ins RF — Backup hinter der 1')).toBeVisible()
  await expect(page.locator('.group').filter({ hasText: 'Notiz:' })).toHaveCount(2)
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

  // Mit Filter ist die Seite ein KAPITEL: eine Ueberschrift, naemlich die des Kapitels,
  // und darunter nur dessen Plays. Keine Gliederung — die hat nichts mehr zu gliedern.
  const wert = await page
    .getByLabel('Kategorie')
    .locator('option', { hasText: 'Rundown' })
    .getAttribute('value')
  await page.getByLabel('Kategorie').selectOption(wert!)
  await expect(page.getByRole('heading', { name: /Bunt-Defense/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /Rundown/ })).toHaveCount(1)
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
  // Die Ueberschrift heisst „Defense" — unter dem Wort kommen die Spieler aus dem
  // Spielwissen her. „Playmaker" steht nur noch klein darueber als Name der Werkbank.
  // Erst wenn die Plays da sind, steht die Seite — vorher zeigt sie „Plays werden
  // geladen …" und hat ueberhaupt keine Ueberschrift. Dieselbe Geduld wie unten.
  // `exact`, sonst faengt der Name auch „Bunt-Defense" und „Steal-Defense & Pickoff" —
  // die Kategorie-Ueberschriften derselben Seite.
  await expect(page.getByRole('heading', { name: 'Defense', exact: true })).toBeVisible({ timeout: 15_000 })
  // Die Kategorie steht in einer <option> — sichtbar ist sie erst beim Aufklappen,
  // deshalb wird der Wert geprueft, nicht die Sichtbarkeit.
  await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })
})

test('zeigt "Ändern" auch bei langem Titel am Handy', async ({ page }) => {
  // Das Hochformat-Raster hatte keine definierte Spalte: sie wuchs auf die breiteste
  // Inhaltsbreite, der Titel schob Legende, Ändern und Outs aus dem Bild, und
  // overflow-hidden schnitt sie ab. Gemessen: Kopfzeile bis x=596 bei 390 px Bildschirm.
  const titel = `${TITEL_PREFIX} ein sehr langer Titel, der die Kopfzeile sprengt`
  await neuesPlay(page, titel)
  await page.getByRole('button', { name: 'Zurück' }).click()
  await page.waitForURL(/\/orga\/playmaker\/\d+$/)

  await page.setViewportSize({ width: 390, height: 844 })
  const aendern = page.getByRole('button', { name: 'Ändern' })
  await expect(aendern).toBeVisible()

  // Gemessen wird gegen den BILDSCHIRM, nicht gegen die Kopfzeile: die war beim Fehler
  // selbst zu breit, der Knopf lag brav in ihr drin — nur eben neben dem Bild. Gepollt,
  // weil das Umstellen der Fenstergroesse die Seite neu aufbaut.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find(e => e.textContent?.trim() === 'Ändern')
          if (!b) return null
          return Math.round(b.getBoundingClientRect().right - window.innerWidth)
        }),
      { timeout: 10_000 },
    )
    .toBeLessThanOrEqual(0)

  await aufraeumen(page, titel)
})

test('ändert Titel und Kategorie eines bestehenden Plays', async ({ page }) => {
  // Ging vorher gar nicht: der Editor schickte Titel, Kategorie, Lage und Gegenstück
  // beim Sichern unverändert mit — änderbar waren sie nur im Anlege-Dialog.
  const titel = `${TITEL_PREFIX} umbenennen-${Date.now().toString(36)}`
  await neuesPlay(page, titel)

  await page.getByRole('button', { name: `${titel} ändern` }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Play ändern' })).toBeVisible()

  const neuerTitel = `${titel} geändert`
  await page.getByLabel('Titel').fill(neuerTitel)
  const kategorie = page.getByLabel('Kategorie')
  await expect(kategorie.locator('option')).not.toHaveCount(1, { timeout: 15_000 })
  const zielwert = await kategorie.locator('option', { hasText: 'Rundown' }).getAttribute('value')
  await kategorie.selectOption(zielwert!)
  await page.getByRole('button', { name: 'Übernehmen' }).click()

  await expect(page.getByRole('heading', { level: 2, name: 'Play ändern' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: `${neuerTitel} ändern` })).toBeVisible()

  // Und es steht auch wirklich so auf dem Server — samt neuer Kategorie.
  const gespeichert = await page.evaluate(async () => {
    const auth = localStorage.getItem('auth')
    const id = location.pathname.match(/playmaker\/(\d+)/)![1]
    const p = await (await fetch(`/api/plays/${id}`, { headers: { Authorization: `Basic ${auth}` } })).json()
    return { title: p.title as string, categoryId: p.categoryId as number }
  })
  expect(gespeichert.title).toBe(neuerTitel)
  expect(String(gespeichert.categoryId)).toBe(zielwert)

  // Eine Standänderung danach darf die neuen Stammdaten nicht überschreiben.
  await page.getByRole('button', { name: 'Runner +' }).click()
  await expect(page.getByText('Gesichert')).toBeVisible({ timeout: 10_000 })
  const danach = await page.evaluate(async () => {
    const auth = localStorage.getItem('auth')
    const id = location.pathname.match(/playmaker\/(\d+)/)![1]
    const p = await (await fetch(`/api/plays/${id}`, { headers: { Authorization: `Basic ${auth}` } })).json()
    return p.title as string
  })
  expect(danach).toBe(neuerTitel)

  await aufraeumen(page, titel)
})
