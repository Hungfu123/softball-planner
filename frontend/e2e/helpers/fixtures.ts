import { test as base } from '@playwright/test'
import { seedAuth } from './auth'
import { ensureTestGame, teardownTestGameDay, resetScoring, setBattingSide } from './api'

type Fixtures = {
  testGame: { gameId: number; gameDayId: number; playerIds: number[] }
  scoringPage: { gameId: number; playerIds: number[] }
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
    await setBattingSide(workerGame.gameId, 'top')
    await page.goto(`/gameday/${workerGame.gameDayId}/scoring/0`)
    await use({ gameId: workerGame.gameId, playerIds: workerGame.playerIds })
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
  const buttonLabels: Record<DirectResult, RegExp> = {
    STRIKEOUT: /^STRIKEOUT$/,
    WALK: /^WALK$/,
    HIT_BY_PITCH: /^HBP$/,
    OUT: /^AUS$/,
    REACHED_ON_ERROR: /^ERROR$/,
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

export { expect } from '@playwright/test'
