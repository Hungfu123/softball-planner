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

export { expect } from '@playwright/test'
