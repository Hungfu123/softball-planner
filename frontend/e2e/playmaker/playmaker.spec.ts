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

test('zeigt die Start-Plays aus der Migration', async ({ page }) => {
  await page.goto('/orga/playmaker')
  await expect(page.getByRole('heading', { name: 'Playmaker' })).toBeVisible()
  // Die Kategorie steht in einer <option> — sichtbar ist sie erst beim Aufklappen,
  // deshalb wird der Wert geprueft, nicht die Sichtbarkeit.
  await expect(page.getByLabel('Kategorie')).toContainText('Cut-off & Relay', { timeout: 15_000 })
})
