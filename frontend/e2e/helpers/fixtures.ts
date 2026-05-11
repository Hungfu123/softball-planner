import { test as base } from '@playwright/test'
import { seedAuth } from './auth'
import { ensureTestGame, teardownTestGameDay, resetScoring, setBattingSide, clearSubstitutions } from './api'

type Fixtures = {
  testGame: { gameId: number; gameDayId: number; playerIds: number[]; benchPlayerId: number }
  scoringPage: { gameId: number; gameDayId: number; playerIds: number[]; benchPlayerId: number }
}

export const test = base.extend<Fixtures, { workerGame: Awaited<ReturnType<typeof ensureTestGame>> }>({
  workerGame: [
    async ({}, use) => {
      const game = await ensureTestGame()
      await use(game)
      await teardownTestGameDay(game.gameDayId)
    },
    { scope: 'worker' },
  ],

  testGame: async ({ workerGame }, use) => {
    await use(workerGame)
  },

  scoringPage: async ({ page, context, workerGame }, use) => {
    await seedAuth(context)
    await resetScoring(workerGame.gameId)
    // resetScoring lässt Substitutions stehen — explizit clearen, sonst Cross-Test-Pollution.
    await clearSubstitutions(workerGame.gameId)
    await setBattingSide(workerGame.gameId, 'top')
    await page.goto(`/gameday/${workerGame.gameDayId}/scoring/0`)
    await use({
      gameId: workerGame.gameId,
      gameDayId: workerGame.gameDayId,
      playerIds: workerGame.playerIds,
      benchPlayerId: workerGame.benchPlayerId,
    })
  },
})

import type { Page } from '@playwright/test'

type HitVariant = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN'

/**
 * UI-driven AB recording for hits.
 * Clicks TREFFER, selects variant, dismisses CorrectionSheet with defaults if open.
 */
export async function recordHitViaUI(page: Page, variant: HitVariant): Promise<void> {
  await page.getByRole('button', { name: 'TREFFER' }).click()
  const labelMap: Record<HitVariant, string> = {
    SINGLE: 'Single',
    DOUBLE: 'Double',
    TRIPLE: 'Triple',
    HOMERUN: 'Homerun',
  }
  await page.getByRole('button', { name: labelMap[variant], exact: true }).click()
  await page.waitForTimeout(400)
  await dismissCorrectionSheetIfOpen(page)
}

type DirectResult = 'STRIKEOUT' | 'WALK' | 'HIT_BY_PITCH' | 'OUT' | 'REACHED_ON_ERROR'

/**
 * UI-driven AB recording for non-hits (direct Tier-1/2 buttons).
 */
export async function recordDirectViaUI(page: Page, result: DirectResult): Promise<void> {
  // Accessible name includes optional subtitle span — match label as prefix/word.
  // STRIKEOUT/WALK: exact. AUS: "AUS Grounder / Fly". HBP: "HBP Hit-by-Pitch".
  // ERROR: "ERROR Reached on Error".
  const buttonLabels: Record<DirectResult, RegExp> = {
    STRIKEOUT: /^STRIKEOUT$/,
    WALK: /^WALK$/,
    HIT_BY_PITCH: /^HBP\b/,
    OUT: /^AUS\b/,
    REACHED_ON_ERROR: /^ERROR\b/,
  }
  await page.getByRole('button', { name: buttonLabels[result] }).click()
  await page.waitForTimeout(400)
  await dismissCorrectionSheetIfOpen(page)
}

/**
 * If a CorrectionSheet is open, click its primary Save button.
 * Real label from CorrectionSheet.tsx is "✓ Passt"; other candidates are fallbacks.
 */
async function dismissCorrectionSheetIfOpen(page: Page): Promise<void> {
  const candidates = ['✓ Passt', 'Passt', 'Speichern', 'Save', 'Übernehmen', 'OK', 'Bestätigen']
  for (const label of candidates) {
    const btn = page.getByRole('button', { name: label, exact: true })
    const count = await btn.count().catch(() => 0)
    if (count > 0 && await btn.first().isVisible().catch(() => false)) {
      await btn.first().click()
      await page.waitForTimeout(300)
      return
    }
  }
  // No sheet open — nothing to dismiss
}

import { getPlayerName } from './api'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Tap a runner on the diamond → opens Stealing-Sheet → click variant.
 *
 * The runner is a `<motion.g>` whose `<text>` child has `pointer-events-none`.
 * We locate the runner's `<text>` then click its parent `<g>` with `force: true`
 * because framer-motion keyframe animation keeps the element "unstable".
 */
export async function recordStealingViaUI(page: Page, runnerPlayerId: number, type: 'STOLEN_BASE' | 'CAUGHT_STEALING'): Promise<void> {
  const name = await getPlayerName(runnerPlayerId)
  const displayName = name.length > 7 ? name.slice(0, 6) + '…' : name
  // Wait for any in-flight animation to roughly settle.
  await page.waitForTimeout(800)
  // The runner <text> sits inside a <motion.g>; the <g> is the click target.
  const runnerGroup = page.locator('svg g').filter({ hasText: displayName }).first()
  await runnerGroup.click({ force: true })
  await page.waitForTimeout(300)
  const label = type === 'STOLEN_BASE' ? /Stolen Base/i : /Caught Stealing/i
  await page.getByRole('button', { name: label }).click()
  await page.waitForTimeout(500)
}

/**
 * Open Lineup-Sheet → Wechseln → click playerOut + playerIn → Bestätigen.
 */
export async function recordSubstitutionViaUI(page: Page, playerOutId: number, playerInId: number): Promise<void> {
  const outName = await getPlayerName(playerOutId)
  const inName = await getPlayerName(playerInId)
  await page.getByRole('button', { name: /Komplette Aufstellung anzeigen/i }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /^Wechseln$/i }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: new RegExp(`^${escapeRegex(outName)}$`) }).first().click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: new RegExp(`^${escapeRegex(inName)}$`) }).first().click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: /✓\s*Bestätigen/i }).click()
  await page.waitForTimeout(500)
}

/**
 * Click "Nächstes Inning starten" Pille mit opponentRuns.
 * Requires halfInningOver=true (3 outs in current inning).
 */
export async function advanceInningViaUI(page: Page, opponentRuns: number): Promise<void> {
  if (opponentRuns > 0) {
    const input = page.locator('input[type="number"][placeholder="0"]').first()
    await input.fill(String(opponentRuns))
  }
  await page.getByRole('button', { name: /Nächstes Inning starten/i }).click()
  await page.waitForTimeout(500)
}

/** Click Rückgängig button. */
export async function clickUndo(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Rückgängig$/i }).click()
  await page.waitForTimeout(500)
}

export { expect } from '@playwright/test'
