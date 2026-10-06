import { test, expect, type Page } from '@playwright/test'
import { seedAuth } from '../helpers/auth'
import { withApi } from '../helpers/api'

/**
 * Regression: „Team aus Liga entfernen" im Club-Sheet.
 *
 * Bug-Geschichte: Auf dem Handy (vaul-Drawer) sperrt Radix' DismissableLayer den
 * ganzen body mit pointer-events:none und gibt nur die eigene Drawer-Layer wieder
 * frei. Das ConfirmModal portalt ans body, ist aber keine Radix-Layer und erbt den
 * Lock — es blieb sichtbar, aber unantippbar („gar nicht tappen"), Klicks fielen
 * durch aufs Sheet darunter. Zusätzlich wertete vauls Outside-Dismiss den Klick
 * aufs Portal-Modal als Klick außerhalb und schloss das Sheet, bevor der
 * Button-Handler lief — Löschen wirkte also nie. Deshalb läuft dieser Test bewusst
 * im Handy-Viewport: unter 640px nutzt ResponsiveSheet den vaul-Drawer, darüber das
 * Desktop-CenterModal ohne Radix-Lock — dort trat der Bug nie auf. (devices['iPhone
 * 12'] scheidet aus, es würde WebKit erzwingen; die E2E-Suite fährt nur Chromium.)
 *
 * Serial, weil beide Szenarien dieselbe Test-Season teilen — bei fullyParallel
 * würden zwei Worker je eine Season anlegen und die Club-Fusion nach Namen
 * doppelte Liga-Zeilen erzeugen.
 */
test.describe.configure({ mode: 'serial' })

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

const YEAR = 2095
/** Zwei getrennte Clubs — je Szenario einer, damit Löschen und Abbrechen sich nicht ins Gehege kommen. */
const CLUB_DELETE = 'E2E-Liga-Weg-L'
const CLUB_KEEP = 'E2E-Liga-Weg-A'

/** Isolierte Test-Season mit je einem Gegner-Team pro Club-Name. Gibt die Season-ID zurück. */
async function seedOpponents(): Promise<number> {
  return withApi(async c => {
    const seasons: { id: number; year: number }[] = await (await c.get('/api/seasons')).json()
    let season = seasons.find(s => s.year === YEAR)
    if (!season) {
      const res = await c.post('/api/seasons', { data: { name: 'E2E Liga-Weg', year: YEAR } })
      expect(res.ok(), `Season anlegen: ${res.status()}`).toBeTruthy()
      season = await res.json()
    }
    for (const club of [CLUB_DELETE, CLUB_KEEP]) {
      const teams: { id: number; name: string }[] = await (await c.get(`/api/seasons/${season.id}/teams`)).json()
      if (teams.some(t => t.name === club)) continue
      const res = await c.post(`/api/seasons/${season.id}/teams`, { data: { name: club } })
      expect(res.ok(), `Team '${club}' anlegen: ${res.status()}`).toBeTruthy()
    }
    return season.id
  })
}

async function removeSeason(seasonId: number): Promise<void> {
  await withApi(c => c.delete(`/api/seasons/${seasonId}`))
}

async function leaguesOf(club: string): Promise<string[]> {
  return withApi(async c => {
    const dir: { clubName: string; leagues: { leagueName: string }[] }[] = await (await c.get('/api/teams/directory')).json()
    return (dir.find(d => d.clubName === club)?.leagues ?? []).map(l => l.leagueName)
  })
}

/**
 * Club-Sheet auf dem vom User beschriebenen Pfad öffnen: Gegner-Seite, Club-Kachel
 * antippen. (Der ?club=-Deep-Link ist ein anderer Weg und würde den Klick-Pfad
 * nicht absichern.) Kein Suchfeld nutzen: Das rendert erst ab >6 Clubs im
 * Verzeichnis — im CI-Seed gibt es nur unsere zwei Test-Clubs.
 */
async function openClubSheet(page: Page, club: string) {
  await page.goto('/teams')
  await page.getByRole('button', { name: new RegExp(`^${club}\\b`, 'i') }).first().click()
  // h2.font-display ist das sichtbare Sheet-Title (das vaul Drawer.Title ist sr-only)
  await expect(page.locator('h2.font-display').filter({ hasText: club })).toBeVisible()
  return page.getByRole('button', { name: new RegExp(`aus .* entfernen`, 'i') }).first()
}

test.describe('Gegner: Team aus Liga entfernen', () => {
  let seasonId: number

  test.beforeAll(async () => {
    seasonId = await seedOpponents()
  })

  test.afterAll(async () => {
    await removeSeason(seasonId)
  })

  test('Bestätigungsmodal im Club-Sheet ist antippbar und entfernt die Liga-Zeile', async ({ page, context }) => {
    await seedAuth(context)
    const removeBtn = await openClubSheet(page, CLUB_DELETE)

    // Liga-Zeile im Sheet ist vorher da
    await expect(page.getByText('Ligen (1)')).toBeVisible()

    // Trash-Button der Liga-Zeile → öffnet das ConfirmModal
    await removeBtn.click()
    const dialog = page.getByRole('dialog', { name: 'Team aus Liga entfernen' })
    await expect(dialog).toBeVisible()

    // DAS ist die Regression: der Löschen-Button muss der Hit-Target sein.
    // Liegt ein Element darüber (erbt body pointer-events:none), wirft Playwright
    // hier "intercepts pointer events" — genau der alte Bug.
    await dialog.getByRole('button', { name: 'Löschen' }).click()

    // Sheet schließt sich (onChanged → closeClubSheet), Liga-Zeile ist weg
    await expect(page.locator('h2.font-display').filter({ hasText: CLUB_DELETE })).toBeHidden()
    await expect.poll(() => leaguesOf(CLUB_DELETE)).toEqual([])
  })

  test('Abbrechen lässt sich ebenfalls antippbar bedienen und entfernt nichts', async ({ page, context }) => {
    await seedAuth(context)
    const removeBtn = await openClubSheet(page, CLUB_KEEP)

    await removeBtn.click()
    const dialog = page.getByRole('dialog', { name: 'Team aus Liga entfernen' })
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(dialog).toBeHidden()

    // Nichts entfernt — die Liga-Zeile ist noch da
    await expect(page.getByText('Ligen (1)')).toBeVisible()
    await expect.poll(() => leaguesOf(CLUB_KEEP)).toHaveLength(1)
  })

  test('X-Button und Backdrop schließen das Modal ebenfalls — und entfernen nichts', async ({ page, context }) => {
    await seedAuth(context)
    const removeBtn = await openClubSheet(page, CLUB_KEEP)

    // X-Button in der Modal-Title-Leiste
    await removeBtn.click()
    const dialog = page.getByRole('dialog', { name: 'Team aus Liga entfernen' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Schließen' }).click()
    await expect(dialog).toBeHidden()
    await expect.poll(() => leaguesOf(CLUB_KEEP)).toHaveLength(1)

    // Backdrop-Klick: Viewport-Ecke trifft immer den Portal-Wrapper (fixed inset-0),
    // das Modal ist zentriert und damit nie dort
    await removeBtn.click()
    await expect(dialog).toBeVisible()
    await page.mouse.click(5, 5)
    await expect(dialog).toBeHidden()
    await expect.poll(() => leaguesOf(CLUB_KEEP)).toHaveLength(1)
  })
})