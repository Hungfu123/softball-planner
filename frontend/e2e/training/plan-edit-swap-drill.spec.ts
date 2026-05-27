import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'

/**
 * E2E: Manual Drill-Swap im Plan-Edit-Drawer.
 *
 * Flow:
 *   1. Plan-Edit-Drawer öffnen
 *   2. Eine DRILL-Section finden (anhand des "Drill tauschen"-Buttons → drillId != null)
 *   3. Section ausklappen, unique userNote eintragen, Plan speichern (so dass userNote persistiert)
 *   4. Drawer erneut öffnen, gleiche Section ausklappen, Drill-Titel vorher merken
 *   5. Swap-Pencil klicken → DrillPickerModal öffnet sich
 *   6. Einen anderen Drill auswählen
 *   7. Assert: userNote bleibt erhalten (Server preserved), Drill-Titel hat sich geändert
 */

async function hasTrainings(page: import('@playwright/test').Page): Promise<boolean> {
  await page.waitForLoadState('networkidle')
  const statsBtn = page.getByRole('button', { name: /Statistik/i })
  return await statsBtn.isVisible({ timeout: 2000 }).catch(() => false)
}

async function hasPlanContent(page: import('@playwright/test').Page): Promise<boolean> {
  return await page.getByRole('button', { name: /Plan-Aktionen/i }).isVisible({ timeout: 1500 }).catch(() => false)
}

async function openPlanEdit(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: /Plan-Aktionen/i }).click()
  await page.waitForTimeout(200)
  await page.getByText(/^Bearbeiten$/i).first().click()
  // Drawer-Header als Anchor abwarten
  await page.getByText(/Plan bearbeiten/i).first().waitFor({ state: 'visible', timeout: 3000 })
}

async function activatePlanTabIfMobile(page: import('@playwright/test').Page): Promise<void> {
  const planTab = page.getByRole('tab', { name: /Plan/i })
  if (await planTab.isVisible({ timeout: 500 }).catch(() => false)) {
    await planTab.click()
    await page.waitForTimeout(200)
  }
}

test.describe('Trainingsplan — Manual Drill-Swap', () => {
  test('swap drill in section keeps userNotes, replaces drill-meta', async ({ page, context }) => {
    await seedAuth(context)
    await page.goto('/training')
    if (!(await hasTrainings(page))) {
      test.skip(true, 'Keine Trainings in DB — Swap-Test übersprungen')
      return
    }

    await activatePlanTabIfMobile(page)

    if (!(await hasPlanContent(page))) {
      test.skip(true, 'Kein Plan in DB — Swap-Test braucht existierenden Plan')
      return
    }

    // ─── Phase 1: userNote eintragen + Plan speichern ──────────────────────
    await openPlanEdit(page)

    // Finde alle Swap-Pencil-Buttons (nur DRILL-Sections mit drillId haben den).
    const swapButtons = page.getByRole('button', { name: /^Drill tauschen$/i })
    const swapCount = await swapButtons.count()
    if (swapCount === 0) {
      test.skip(true, 'Plan enthält keine DRILL-Section mit drillId — Swap nicht möglich')
      return
    }

    // Erste DRILL-Section: das Card-Element ist der gemeinsame Ancestor von
    // Swap-Pencil + Section-Header-Button + Userotes-Textarea.
    // Wir nutzen den Header-Button (aria-expanded) als Anchor zur Section-Card.
    const firstSwapBtn = swapButtons.first()
    // Click in dieser Section auf den Section-Header-Button (mit aria-expanded), um auszuklappen.
    // Das Card-Wrapper-DIV ist der closest gemeinsame Parent — wir nehmen einfach ein xpath ancestor.
    const sectionCard = firstSwapBtn.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
    await expect(sectionCard).toBeVisible()

    // Section ausklappen
    const expandBtn = sectionCard.getByRole('button', { name: /ausklappen|einklappen/i }).first()
    // Falls aria-expanded=false, klicken; sonst skippen.
    const isExpanded = await expandBtn.getAttribute('aria-expanded')
    if (isExpanded === 'false') {
      await expandBtn.click()
      await page.waitForTimeout(250)
    }

    // userNote eintragen — eindeutig über Date.now()
    const uniqueNote = `E2E-NOTE-${Date.now()}`
    const userNoteTextarea = sectionCard.getByPlaceholder(/heute Fokus/i)
    await expect(userNoteTextarea).toBeVisible({ timeout: 2000 })
    await userNoteTextarea.fill(uniqueNote)
    await page.waitForTimeout(150)

    // Plan speichern (PUT /training-plans/{id})
    const [saveResponse] = await Promise.all([
      page.waitForResponse(
        (res) => /\/training-plans\/\d+$/.test(res.url()) && res.request().method() === 'PUT',
        { timeout: 10_000 },
      ),
      page.getByRole('button', { name: /^Speichern$/i }).click(),
    ])
    expect(saveResponse.status()).toBeLessThan(300)

    // Drawer schließt sich nach Save
    await page.waitForTimeout(500)

    // ─── Phase 2: Drawer wieder öffnen, Drill-Titel merken, swap ────────────
    await openPlanEdit(page)

    // Wieder erste DRILL-Section finden (Reihenfolge bleibt, Index stabil).
    const swapButtons2 = page.getByRole('button', { name: /^Drill tauschen$/i })
    const firstSwapBtn2 = swapButtons2.first()
    const sectionCard2 = firstSwapBtn2.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
    await expect(sectionCard2).toBeVisible()

    // Section ausklappen, damit wir userNote + Titel sehen.
    const expandBtn2 = sectionCard2.getByRole('button', { name: /ausklappen|einklappen/i }).first()
    const isExpanded2 = await expandBtn2.getAttribute('aria-expanded')
    if (isExpanded2 === 'false') {
      await expandBtn2.click()
      await page.waitForTimeout(250)
    }

    // Titel-Input (erstes <input type="text"> in der Card; nicht-textfields haben inputMode=numeric)
    const titleInput = sectionCard2.locator('input[type="text"]').first()
    const titleBefore = (await titleInput.inputValue()).trim()
    expect(titleBefore.length).toBeGreaterThan(0)

    // userNote sollte persistiert sein
    const userNoteTextarea2 = sectionCard2.getByPlaceholder(/heute Fokus/i)
    await expect(userNoteTextarea2).toHaveValue(uniqueNote)

    // Swap-Pencil klicken → DrillPickerModal öffnet sich (nested ResponsiveSheet)
    await firstSwapBtn2.click()
    await page.waitForTimeout(300)

    // Drill-Picker-Header als Anchor
    await expect(page.getByText(/Drill hinzufügen/i).first()).toBeVisible({ timeout: 2000 })

    // Picker-Scope: nested dialog with "Drill hinzufügen"
    const pickerDrawer = page.getByRole('dialog').filter({ hasText: 'Drill hinzufügen' })

    // Drill-Namen via span-spezifischem Locator extrahieren — robuster als innerText-parsing.
    // Struktur: <button class="flex-1 text-left"><div><span class="text-sm font-medium text-navy-900">{Name + Badges}</span>…</div>…</button>
    // Die Name-Span ist die erste <span> mit text-sm font-medium.
    const drillButtons = pickerDrawer.locator('button.flex-1.text-left')
    const drillCount = await drillButtons.count()
    expect(drillCount, 'Drill-Picker zeigt keine Einträge').toBeGreaterThan(0)

    // Iteriere via getAttribute('textContent') auf der inner span; falls Badge-Spans drinnen sind,
    // sind das Text-Knoten direkt im äußeren span. Wir nehmen den ersten Text-Node via JS evaluate.
    let clickedDrillName: string | null = null
    for (let i = 0; i < drillCount; i++) {
      const btn = drillButtons.nth(i)
      // Drill-Name = erster Text-Node der span.text-navy-900 (Badges sind eigene Kinder-Spans).
      const drillName = await btn.locator('span.text-navy-900').first().evaluate((el) => {
        const textNodes = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => (n.textContent ?? '').trim())
          .filter((s) => s.length > 0)
        return textNodes.join(' ').trim()
      })
      if (drillName && drillName !== titleBefore) {
        const [patchResponse] = await Promise.all([
          page.waitForResponse(
            (res) =>
              /\/training-plans\/\d+\/sections\/\d+$/.test(res.url()) &&
              res.request().method() === 'PATCH',
            { timeout: 10_000 },
          ),
          btn.click(),
        ])
        expect(patchResponse.status()).toBeLessThan(300)
        clickedDrillName = drillName
        break
      }
    }
    expect(clickedDrillName, 'Konnte keinen alternativen Drill im Picker finden').not.toBeNull()

    // Picker schließt sich. Section wird mit neuem Drill geupdated.
    // ─── Assertions ─────────────────────────────────────────────────────────
    // Section-Card neu locaten (React-Re-Render kann Node-Identity ändern).
    const swapButtons3 = page.getByRole('button', { name: /^Drill tauschen$/i })
    const sectionCard3 = swapButtons3.first().locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')

    // Falls die Section nach State-Reset eingeklappt ist: ausklappen.
    const expandBtn3 = sectionCard3.getByRole('button', { name: /ausklappen|einklappen/i }).first()
    const isExpanded3 = await expandBtn3.getAttribute('aria-expanded')
    if (isExpanded3 === 'false') {
      await expandBtn3.click()
      await page.waitForTimeout(200)
    }

    // Titel hat sich geändert — exakt der ausgewählte Drill-Name.
    const titleInputAfter = sectionCard3.locator('input[type="text"]').first()
    await expect(titleInputAfter).toHaveValue(clickedDrillName!, { timeout: 3000 })

    // userNote ist preserved (Server-Side-Preservation via patchPlanSection funktioniert).
    const userNoteAfter = sectionCard3.getByPlaceholder(/heute Fokus/i)
    await expect(userNoteAfter).toHaveValue(uniqueNote)
  })
})
