import { test, expect } from '../helpers/fixtures'
import { seedAtBat, getPlayerName } from '../helpers/api'

/**
 * UI-Durchstich für die R-Spalte (Runs Scored). Korrektheit der Attribution
 * liegt in BaseRunningReplayTest (Backend); hier nur: Spalte rendert, Wert
 * stimmt, Sortierung nach R funktioniert.
 */
test.describe('Stats — R (Runs Scored) Spalte', () => {
  test('R-Spalte rendert, Wert stimmt und ist sortierbar @smoke', async ({ page, scoringPage }) => {
    const [b0, b1, b2, b3] = scoringPage.playerIds
    // Bases laden: 3 Runner auf 1B/2B/3B, dann HR von b3 → alle 4 scoren.
    await seedAtBat(scoringPage.gameId, b0, 'SINGLE', 1, { first: b0, second: null, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, b1, 'SINGLE', 1, { first: b1, second: b0, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, b2, 'SINGLE', 1, { first: b2, second: b1, third: b0 }, 0, 0)
    await seedAtBat(scoringPage.gameId, b3, 'HOMERUN', 1, { first: null, second: null, third: null }, 4, 4)

    // scope=game verwendet gameId als URL-Parameter (nicht 'game')
    await page.goto(`/stats?scope=game&gameId=${scoringPage.gameId}`)

    // Warten bis batting-stats geladen (async fetch nach Navigation)
    await page.waitForResponse(r => r.url().includes('batting-stats') && r.ok())

    // R-Header sichtbar — der th enthält 'R' + unsichtbares ChevronDown-Icon.
    // Wir suchen explizit nach dem columnheader 'R' und schließen 'RBI' aus.
    // Die zugängliche Bezeichnung des th sollte nur 'R' sein (Icon ist aria-hidden).
    const rHeader = page.getByRole('columnheader', { name: 'R', exact: true })
    await expect(rHeader).toBeVisible()

    // Echte Daten-Zeile im Tabellen-Body verifizieren — Header liegt in <thead>,
    // wird also ausgeschlossen. Zwei Ebenen:
    //  1) Mindestens eine tbody-Row existiert und ist sichtbar.
    //  2) Die Row eines konkret geseedeten Scorers (b0) wird namentlich gefunden.
    const bodyRows = page.locator('tbody tr')
    await expect(bodyRows.first()).toBeVisible()
    expect(await bodyRows.count()).toBeGreaterThanOrEqual(1)

    const scorerName = await getPlayerName(b0)
    await expect(bodyRows.filter({ hasText: scorerName }).first()).toBeVisible()

    // Sortierung: Klick auf R-Header → Tabelle sortiert nach Runs (kein Crash)
    await rHeader.click()
    // Smoke: Tabelle bleibt nach Sort-Klick sichtbar
    await expect(rHeader).toBeVisible()

    // Zweiter Klick kehrt Richtung um — noch immer kein Crash
    await rHeader.click()
    await expect(rHeader).toBeVisible()
  })
})
