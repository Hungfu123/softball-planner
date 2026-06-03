import { test, expect, request } from '@playwright/test'
import { seedAuth, basicAuthHeader } from '../helpers/auth'

/**
 * Dieser Test REGENERIERT (= löscht + erstellt) einen Plan. Liefe er parallel auf
 * derselben "aktuellen" Trainingseinheit wie plan-edit-swap / plan-edit, würde sein
 * DELETE deren gerade editierten Plan wegräumen (→ 404). Deshalb arbeitet er auf einer
 * EIGENEN, weit in der Zukunft liegenden Trainingseinheit, die er per API anlegt und
 * im Switcher auswählt — vollständige Isolation, race-frei trotz fullyParallel.
 */
const ISO_DATE = '2090-03-15'
const DISPLAY_DATE = '15.03.2090'

/** Legt die dedizierte Trainingseinheit an (idempotent — find-or-create). */
async function ensureDedicatedTraining(): Promise<void> {
  const ctx = await request.newContext({
    baseURL: 'http://localhost:8080',
    extraHTTPHeaders: { Authorization: basicAuthHeader() },
  })
  try {
    const res = await ctx.get('/api/trainings')
    const list: Array<{ date: string }> = res.ok() ? await res.json() : []
    if (!list.some(t => t.date === ISO_DATE)) {
      await ctx.post('/api/trainings', { data: { date: ISO_DATE } })
    }
  } finally {
    await ctx.dispose()
  }
}

/**
 * Helper: skipt wenn keine Trainings in DB (z.B. fresh CI DB).
 * Returnt true wenn Page nutzbar (Statistik-Button sichtbar).
 */
async function hasTrainings(page: import('@playwright/test').Page): Promise<boolean> {
  await page.waitForLoadState('networkidle')
  const statsBtn = page.getByRole('button', { name: /Statistik/i })
  return await statsBtn.isVisible({ timeout: 2000 }).catch(() => false)
}

/**
 * Öffnet den Generate-Drawer — egal ob bereits ein Plan existiert
 * (3-Dot-Menu → "Neu generieren") oder noch keiner ("Plan generieren"-Btn).
 * Wartet auf das Drawer-Header-Element als Anchor.
 */
async function openGenerateDrawer(page: import('@playwright/test').Page): Promise<void> {
  const menuBtn = page.getByRole('button', { name: /Plan-Aktionen/i })
  if (await menuBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await menuBtn.click()
    // Warte bis Menu-Item "Neu generieren" erscheint, bevor wir klicken.
    const menuItem = page.getByRole('button', { name: /^Neu generieren$/i })
    await menuItem.waitFor({ state: 'visible', timeout: 2000 })
    await menuItem.click()
  } else {
    await page.getByRole('button', { name: /Plan generieren/i }).first().click()
  }
  // Drawer-Header als sichtbarer Anchor abwarten.
  await page.getByText(/Plan neu generieren/i).first().waitFor({ state: 'visible', timeout: 3000 })
}

test.describe('Trainingsplan — Dual Group', () => {
  test('Generate-Plan mit Anfängergruppe rendert Hauptgruppe + Anfänger Sections', async ({ page, context }) => {
    await seedAuth(context)
    await ensureDedicatedTraining()
    await page.goto('/training')
    if (!(await hasTrainings(page))) {
      test.skip(true, 'Keine Trainings in DB — Dual-Group-Test übersprungen')
      return
    }

    // Auf die EIGENE Trainingseinheit wechseln (Isolation gegen parallele Plan-Specs).
    await page.getByRole('button', { name: /Training wechseln/i }).click()
    await page.getByRole('button', { name: /^Anstehend/i }).click()
    await page.getByRole('button', { name: new RegExp(DISPLAY_DATE) }).click()
    await page.waitForTimeout(300)

    // Plan-Tab auf Mobile aktivieren falls vorhanden.
    const planTab = page.getByRole('tab', { name: /Plan/i })
    if (await planTab.isVisible({ timeout: 500 }).catch(() => false)) {
      await planTab.click()
      await page.waitForTimeout(200)
    }

    await openGenerateDrawer(page)

    // Drawer ist sichtbar
    const drawerHeader = page.getByText(/Plan neu generieren/i).first()
    await expect(drawerHeader).toBeVisible({ timeout: 2000 })

    // Drawer-Scope (dialog) — innerhalb dieses Containers operieren wir.
    const drawer = page.getByRole('dialog')

    // Toggle "Mit Anfängergruppe?"-Checkbox FRÜH, damit der zweite Counter erscheint und
    // wir gezielt den Spieler-Counter ansprechen können (kein Index-Drift).
    const beginnerToggle = drawer.getByRole('checkbox')
    await beginnerToggle.check()
    await page.waitForTimeout(150)

    // Spieler-Anzahl hochsetzen auf >= 8 (Defaults niedrig wenn nur 3 anwesend).
    // Der erste "+"-Button im Drawer ist der Spieler-Counter.
    const plusButtons = drawer.locator('button', { hasText: '+' })
    for (let i = 0; i < 8; i++) {
      await plusButtons.first().click()
      await page.waitForTimeout(40)
    }

    // Anfänger-Anzahl-Input auf 4 setzen
    const beginnerInput = drawer.locator('input[type="number"]').first()
    await beginnerInput.fill('4')
    await page.waitForTimeout(150)

    // Schwerpunkt wählen (Backend validiert @NotBlank focus).
    // INFIELD_DEFENSE hat advanced-Drills → triggert Stations-Block (Voraussetzung für
    // dual-group MAIN/BEGINNER-Split). WERFEN hätte nur sequentielle Drills, kein Split.
    // .last() = HAUPT-Focus ("Schwerpunkte"): bei aktivierter Anfängergruppe rendert der
    // "Focus Anfänger (optional)"-Selektor mit denselben Buttons DAVOR → .first() wäre der
    // Anfänger-Focus und liesse den Haupt-focus leer (→ @NotBlank 400).
    await drawer.getByRole('button', { name: /Infield Defense/i }).last().click()
    await page.waitForTimeout(150)

    // Dauer explizit auf 180 min — der MAIN/BEGINNER-Split braucht genug Zeit für
    // parallele Skill-Stations. Kürzere Dauer (z.B. 90) erzeugt KEINE BEGINNER-Sections.
    // (Vorher hing der Test am trainingsspezifischen Dauer-Default — fragil.)
    await drawer.getByRole('button', { name: '180 min' }).click()
    await page.waitForTimeout(150)

    // Submit-Button im Footer (eindeutig im Drawer-Scope).
    const submitBtn = drawer.getByRole('button', { name: /Generieren|Generiere/i })

    // Submit + warte auf generate-POST in einem Schritt (Race-Condition vermeiden).
    const [generateResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/training-plans/generate') && res.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      submitBtn.click(),
    ])
    expect(generateResponse.status()).toBe(201)

    // Plan-View Header-Render. Bei dual-group erscheint "Hauptgruppe" + "Anfänger".
    await expect(page.getByText(/Hauptgruppe/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/^Anfänger$/i).first()).toBeVisible({ timeout: 5_000 })
  })
})
