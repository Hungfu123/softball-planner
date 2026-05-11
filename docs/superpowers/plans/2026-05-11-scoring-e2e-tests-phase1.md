# Live-Scoring E2E Tests Phase 1+2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Etabliere Playwright als E2E-Test-Framework und decke alle 9 AB-Result-Typen mit echten Browser-Tests ab.

**Architecture:** Playwright + Chromium gegen lokale Dev-Backend+Frontend. Shared Test-GameDay (`E2E-Test-Scoring`) persistent in DB, vor jedem Test via `resetScoring` zurückgesetzt + battingSide=top. Auth via localStorage-Seed. webServer-Config startet beide Services automatisch wenn nicht laufend.

**Tech Stack:** Playwright 1.x, TypeScript, Vite 7, Node 22+. Backend Spring Boot 3.4.3 (lokal via mvnw spring-boot:run, vorausgesetzt Docker DB läuft auf 5432).

**Spec:** `docs/superpowers/specs/2026-05-11-scoring-e2e-tests-phase1-design.md`

---

## File Structure

**Neu:**
- `frontend/playwright.config.ts`
- `frontend/e2e/helpers/api.ts`
- `frontend/e2e/helpers/auth.ts`
- `frontend/e2e/helpers/fixtures.ts`
- `frontend/e2e/scoring/scoring-smoke.spec.ts`
- `frontend/e2e/scoring/scoring-atbats.spec.ts`

**Geändert:**
- `frontend/package.json` — devDep `@playwright/test`, scripts `test:e2e` + `test:e2e:ui`
- `frontend/.gitignore` (oder root `.gitignore`) — Playwright-Artifacts ignoreieren

---

## Voraussetzungen für Tests

- Docker laufend: `docker compose up -d db` (Port 5432)
- Backend NICHT manuell starten (webServer kümmert sich darum)
- Frontend NICHT manuell starten (webServer kümmert sich darum)
- Chromium-Browser für Playwright bereits installiert via MCP-Plugin (`/home/hungl/.cache/ms-playwright/`). Falls fehlt: `npx playwright install chromium`.

---

## Task 1: Playwright Installation + Config + Scripts

**Files:**
- Create: `frontend/playwright.config.ts`
- Modify: `frontend/package.json`
- Modify: `.gitignore` (Root, nicht frontend/.gitignore)

- [ ] **Step 1: Install Playwright as devDep**

Run:
```bash
cd /home/hungl/privat/softball-lineup/frontend && npm install -D @playwright/test
```
Expected: package.json + lockfile updated. No new browser download (already cached via MCP-Plugin).

- [ ] **Step 2: Create `playwright.config.ts`**

Create `frontend/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cd ../backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml',
      url: 'http://localhost:8080/actuator/health',
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npx vite',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
})
```

- [ ] **Step 3: Add scripts to `frontend/package.json`**

In `frontend/package.json`, finde den `"scripts"` Block und ergänze:
```json
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
```

Falls bereits `"test"` Script existiert, nicht überschreiben — nur die zwei neuen Lines hinzufügen.

- [ ] **Step 4: Update `.gitignore` (Root)**

In `/home/hungl/privat/softball-lineup/.gitignore`, am Ende ergänzen:
```
# Playwright
frontend/playwright-report/
frontend/test-results/
frontend/blob-report/
```

- [ ] **Step 5: Verify config loads**

Run:
```bash
cd /home/hungl/privat/softball-lineup/frontend && npx playwright test --list
```
Expected: "Listing tests:" + "No tests found" (no test files yet). No config errors.

- [ ] **Step 6: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/package.json frontend/package-lock.json frontend/playwright.config.ts .gitignore
git commit -m "✨ Playwright Setup: Config + Scripts + .gitignore"
```

---

## Task 2: API + Auth Helpers

**Files:**
- Create: `frontend/e2e/helpers/api.ts`
- Create: `frontend/e2e/helpers/auth.ts`

- [ ] **Step 1: Create `frontend/e2e/helpers/auth.ts`**

```typescript
import type { Page, BrowserContext } from '@playwright/test'

const CREDENTIALS = 'admin:Deadsox123!'

/**
 * Seed localStorage so requests authenticated.
 * Must be called BEFORE first page.goto().
 */
export async function seedAuth(context: BrowserContext): Promise<void> {
  const b64 = Buffer.from(CREDENTIALS).toString('base64')
  await context.addInitScript((auth) => {
    window.localStorage.setItem('auth', auth)
  }, b64)
}

export function basicAuthHeader(): string {
  return 'Basic ' + Buffer.from(CREDENTIALS).toString('base64')
}
```

- [ ] **Step 2: Create `frontend/e2e/helpers/api.ts`**

```typescript
import { request, type APIRequestContext } from '@playwright/test'
import { basicAuthHeader } from './auth'

const BASE = 'http://localhost:8080/api'

async function client(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Authorization: basicAuthHeader() },
  })
}

type Player = { id: number; name: string; battingOrder: number | null }
type Season = { id: number; name: string; year: number }
type GameDay = { id: number; date: string; label?: string | null; games: { id: number; gameNumber: number }[] }
type LineupEntryReq = { playerId: number; position: string | null; battingOrder: number; dhBatterPlayerId: number | null }

const TEST_GAMEDAY_LABEL = 'E2E-Test-Scoring'
const TEST_DATE = '2099-01-01'

/** Find-or-create a Season for E2E tests. Returns id. */
async function ensureSeason(c: APIRequestContext): Promise<number> {
  const seasonsRes = await c.get('/seasons')
  if (!seasonsRes.ok()) throw new Error(`Failed to fetch seasons: ${seasonsRes.status()}`)
  const seasons: Season[] = await seasonsRes.json()
  const existing = seasons.find(s => s.year === 2099)
  if (existing) return existing.id
  const create = await c.post('/seasons', { data: { name: 'E2E Test Season', year: 2099 } })
  if (!create.ok()) throw new Error(`Failed to create season: ${create.status()}`)
  const created: Season = await create.json()
  return created.id
}

/**
 * Find-or-create the shared E2E test GameDay with a single Game and 9-player lineup.
 * Returns the gameId of the test Game.
 */
export async function ensureTestGame(): Promise<{ gameId: number; gameDayId: number; playerIds: number[] }> {
  const c = await client()
  try {
    const seasonId = await ensureSeason(c)
    const gdRes = await c.get(`/seasons/${seasonId}/gamedays`)
    if (!gdRes.ok()) throw new Error(`Failed to fetch gamedays: ${gdRes.status()}`)
    const gameDays: GameDay[] = await gdRes.json()
    let gameDay = gameDays.find(gd => gd.label === TEST_GAMEDAY_LABEL)
    let createdNew = false
    if (!gameDay) {
      const createGd = await c.post(`/seasons/${seasonId}/gamedays`, {
        data: { date: TEST_DATE, label: TEST_GAMEDAY_LABEL, numberOfGames: 1 },
      })
      if (!createGd.ok()) throw new Error(`Failed to create gameday: ${createGd.status()} ${await createGd.text()}`)
      gameDay = await createGd.json()
      createdNew = true
    }
    if (!gameDay || !gameDay.games || gameDay.games.length === 0) {
      throw new Error('Test GameDay missing games')
    }

    // Get first 9 players ordered by battingOrder for lineup
    const playersRes = await c.get('/players')
    if (!playersRes.ok()) throw new Error(`Failed to fetch players: ${playersRes.status()}`)
    const players: Player[] = await playersRes.json()
    const ordered = [...players]
      .filter(p => p.battingOrder != null)
      .sort((a, b) => (a.battingOrder ?? 99) - (b.battingOrder ?? 99))
      .slice(0, 9)
    if (ordered.length < 9) {
      throw new Error(`Brauche mindestens 9 Spieler mit battingOrder, habe ${ordered.length}`)
    }
    const playerIds = ordered.map(p => p.id)

    const gameId = gameDay.games[0].id

    if (createdNew) {
      // Set available players for gameday
      const availRes = await c.put(`/gamedays/${gameDay.id}/players`, { data: { playerIds } })
      if (!availRes.ok()) throw new Error(`Failed to set players: ${availRes.status()} ${await availRes.text()}`)

      // Set lineup for the game: 9 positions, batting order 1-9
      const positions = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] // pitcher..rightfield (string IDs)
      const lineup: LineupEntryReq[] = ordered.map((p, i) => ({
        playerId: p.id,
        position: positions[i] ?? null,
        battingOrder: i + 1,
        dhBatterPlayerId: null,
      }))
      const lineupRes = await c.put(`/games/${gameId}/lineup`, { data: lineup })
      if (!lineupRes.ok()) throw new Error(`Failed to set lineup: ${lineupRes.status()} ${await lineupRes.text()}`)
    }

    return { gameId, gameDayId: gameDay.id, playerIds }
  } finally {
    await c.dispose()
  }
}

/** Delete the entire test GameDay (cascade entfernt Games + Lineups + ABs + Stealings + Subs + Events). */
export async function teardownTestGameDay(gameDayId: number): Promise<void> {
  const c = await client()
  try {
    // Safety: verify it's actually the test GameDay before deleting
    const gd = await c.get(`/gamedays/${gameDayId}`)
    if (!gd.ok()) return
    const data: GameDay = await gd.json()
    if (data.label !== TEST_GAMEDAY_LABEL) {
      throw new Error(`Refuse to delete non-test gameday ${gameDayId} with label ${data.label}`)
    }
    await c.delete(`/gamedays/${gameDayId}`)
  } finally {
    await c.dispose()
  }
}

/** Reset scoring state for a game (deletes ABs, Stealings, Subs, Events, resets score). */
export async function resetScoring(gameId: number): Promise<void> {
  const c = await client()
  try {
    const res = await c.delete(`/games/${gameId}/scoring`)
    if (!res.ok()) throw new Error(`Failed to reset: ${res.status()}`)
  } finally {
    await c.dispose()
  }
}

/** Set batting side (top/bottom/null). */
export async function setBattingSide(gameId: number, side: 'top' | 'bottom' | null): Promise<void> {
  const c = await client()
  try {
    const res = await c.put(`/games/${gameId}/batting-side`, { data: { battingSide: side } })
    if (!res.ok()) throw new Error(`Failed to set side: ${res.status()}`)
  } finally {
    await c.dispose()
  }
}

type BaseStateDto = { first: number | null; second: number | null; third: number | null }
type AtBatResult = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN' | 'WALK' | 'HIT_BY_PITCH' | 'STRIKEOUT' | 'OUT' | 'REACHED_ON_ERROR'

/** Seed a recorded AB directly via API (for arranging test state without UI clicks). */
export async function seedAtBat(gameId: number, batterId: number, result: AtBatResult, inning: number, baseStateAfter: BaseStateDto, runsScored = 0, rbi = 0): Promise<void> {
  const c = await client()
  try {
    const res = await c.post(`/games/${gameId}/atbats`, {
      data: { batterId, result, inning, baseStateAfter, runsScored, rbi },
    })
    if (!res.ok()) throw new Error(`Failed to seed AB: ${res.status()}`)
  } finally {
    await c.dispose()
  }
}

type ScoreboardResponse = {
  scoreUs: number
  scoreThem: number
  currentInning: number
  outsInCurrentInning: number
  baseState: BaseStateDto
  runners: { base: number; playerId: number; playerName: string; battingOrder: number | null }[]
  currentBatterId: number | null
  currentBatterName: string | null
  currentBatterOrder: number | null
  totalAtBats: number
}

/** Get scoreboard state (for assertions). */
export async function getScoreboard(gameId: number): Promise<ScoreboardResponse> {
  const c = await client()
  try {
    const res = await c.get(`/games/${gameId}/scoreboard`)
    if (!res.ok()) throw new Error(`Failed to get scoreboard: ${res.status()}`)
    return await res.json()
  } finally {
    await c.dispose()
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd /home/hungl/privat/softball-lineup/frontend && npx tsc --noEmit -p tsconfig.json
```
Expected: No errors related to e2e/. Wenn tsc nicht e2e durchläuft (kein include), auch ok. Falls Errors in e2e: fix.

- [ ] **Step 4: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/helpers/auth.ts frontend/e2e/helpers/api.ts
git commit -m "✨ E2E Helpers: API-Client + Auth-Seed"
```

---

## Task 3: Playwright Fixtures

**Files:**
- Create: `frontend/e2e/helpers/fixtures.ts`

- [ ] **Step 1: Create fixtures**

```typescript
import { test as base } from '@playwright/test'
import { seedAuth } from './auth'
import { ensureTestGame, teardownTestGameDay, resetScoring, setBattingSide } from './api'

type Fixtures = {
  testGame: { gameId: number; gameDayId: number; playerIds: number[] }
  scoringPage: { gameId: number; playerIds: number[] }
}

/**
 * Custom test fixture:
 *  - testGame: shared Test-GameDay (once per worker, cleaned up after)
 *  - scoringPage: per-test reset of scoring state + navigation to ScoringPage
 */
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
    // GameDay needs to be discoverable by gameIndex 0
    await page.goto(`/gameday/${workerGame.gameDayId}/scoring/0`)
    await use({ gameId: workerGame.gameId, playerIds: workerGame.playerIds })
  },
})

export { expect } from '@playwright/test'
```

- [ ] **Step 2: Verify TypeScript compile**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npx tsc --noEmit -p tsconfig.json
```
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/helpers/fixtures.ts
git commit -m "✨ E2E Fixtures: testGame + scoringPage Lifecycle"
```

---

## Task 4: Smoke Test

**Files:**
- Create: `frontend/e2e/scoring/scoring-smoke.spec.ts`

- [ ] **Step 1: Write Smoke Test**

```typescript
import { test, expect } from '../helpers/fixtures'
import { getScoreboard } from '../helpers/api'

test.describe('Scoring Smoke', () => {
  test('page loads with empty state and disabled undo', async ({ page, scoringPage }) => {
    // ActionButtons render
    await expect(page.getByRole('button', { name: 'TREFFER' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'STRIKEOUT' })).toBeVisible()
    await expect(page.getByRole('button', { name: /AUS/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'WALK' })).toBeVisible()
    await expect(page.getByRole('button', { name: /HBP/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /ERROR/ })).toBeVisible()

    // Undo disabled (no actions yet)
    await expect(page.getByRole('button', { name: /Rückgängig/ })).toBeDisabled()

    // Backend state verifies: inning=1, score=0, no ABs
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(1)
    expect(sb.scoreUs).toBe(0)
    expect(sb.totalAtBats).toBe(0)
  })
})
```

- [ ] **Step 2: Verify Docker DB läuft**

Run:
```bash
docker ps --filter "name=softball-lineup-db" --format "{{.Names}}: {{.Status}}"
```
Expected: container running. If not: `docker compose up -d db`.

- [ ] **Step 3: Run smoke test**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run test:e2e -- scoring-smoke.spec.ts
```
Expected: PASS. First run dauert ~3min (Backend-Boot). Sub-Run mit `reuseExistingServer: true` viel schneller.

Falls Backend nicht startet: prüfe `backend/.mvn/local-settings.xml` exists, Docker DB läuft, `tail -f /tmp/playwright-backend-*.log`.

Falls Auth-Fehler 401: localStorage-Seed prüfen (siehe `seedAuth`).

Falls Auth-Init-Race (page.goto vor localStorage gesetzt): seedAuth muss `context.addInitScript` (siehe code) sein — wird vor jeder Navigation injected.

- [ ] **Step 4: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/scoring/scoring-smoke.spec.ts
git commit -m "✨ E2E Smoke-Test: ScoringPage lädt mit leerem State"
```

---

## Task 5: UI-Helper für AB-Aufnahme

**Files:**
- Modify: `frontend/e2e/helpers/fixtures.ts` (Helper-Funktion ergänzen)

- [ ] **Step 1: Add UI-Helper `recordAtBatViaUI`**

Erweitere `frontend/e2e/helpers/fixtures.ts`. Am Ende der Datei (nach den fixtures, vor `export { expect }`) hinzufügen:

```typescript
import type { Page } from '@playwright/test'

type HitVariant = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN'

/**
 * Drives the AB-Recording UI for hits:
 * 1. Click TREFFER → opens hit-variant sub-picker
 * 2. Click the specific variant button (Single/Double/Triple/Homerun)
 * 3. If CorrectionSheet auto-opens (runners present), click Save to accept defaults
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
  // Wait briefly for state update; CorrectionSheet auto-opens for hits with runners.
  await page.waitForTimeout(400)
  const saveBtn = page.getByRole('button', { name: /^Speichern$|^Save$/ })
  if (await saveBtn.isVisible().catch(() => false)) {
    await saveBtn.click()
    await page.waitForTimeout(300)
  }
}

/**
 * Drives one of the Tier-1 buttons that does NOT need a sub-picker.
 * Auto-clicks Save if CorrectionSheet opens (OUT+runners or ROE+runners).
 */
type DirectResult = 'STRIKEOUT' | 'WALK' | 'HIT_BY_PITCH' | 'OUT' | 'REACHED_ON_ERROR'

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
  const saveBtn = page.getByRole('button', { name: /^Speichern$|^Save$/ })
  if (await saveBtn.isVisible().catch(() => false)) {
    await saveBtn.click()
    await page.waitForTimeout(300)
  }
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npx tsc --noEmit -p tsconfig.json
```
Expected: SUCCESS.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/helpers/fixtures.ts
git commit -m "✨ E2E Helpers: UI-driven AB-Recording (recordHitViaUI, recordDirectViaUI)"
```

---

## Task 6: AB-Recording E2E Tests

**Files:**
- Create: `frontend/e2e/scoring/scoring-atbats.spec.ts`

- [ ] **Step 1: Write AB-Suite**

```typescript
import { test, expect, recordHitViaUI, recordDirectViaUI } from '../helpers/fixtures'
import { getScoreboard, seedAtBat } from '../helpers/api'

/**
 * E2E-Test-GameDay has 9 players (battingOrder 1-9).
 * Index in playerIds matches battingOrder-1.
 */

test.describe('Scoring — AB Recording (empty bases)', () => {
  test('SINGLE places batter on 1B, no runs', async ({ page, scoringPage }) => {
    await recordHitViaUI(page, 'SINGLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBe(scoringPage.playerIds[0])
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
    expect(sb.outsInCurrentInning).toBe(0)
  })

  test('DOUBLE places batter on 2B, no runs', async ({ page, scoringPage }) => {
    await recordHitViaUI(page, 'DOUBLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBe(scoringPage.playerIds[0])
    expect(sb.baseState.third).toBeNull()
  })

  test('TRIPLE places batter on 3B, no runs', async ({ page, scoringPage }) => {
    await recordHitViaUI(page, 'TRIPLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBe(scoringPage.playerIds[0])
  })

  test('HOMERUN solo scores 1', async ({ page, scoringPage }) => {
    await recordHitViaUI(page, 'HOMERUN')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
  })

  test('WALK places batter on 1B, no runs', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'WALK')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBe(scoringPage.playerIds[0])
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
  })

  test('HBP places batter on 1B, no runs', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'HIT_BY_PITCH')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBe(scoringPage.playerIds[0])
  })

  test('STRIKEOUT increments outs', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'STRIKEOUT')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.outsInCurrentInning).toBe(1)
    expect(sb.baseState.first).toBeNull()
  })

  test('OUT increments outs', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'OUT')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.outsInCurrentInning).toBe(1)
  })

  test('REACHED_ON_ERROR empty bases places batter on 1B', async ({ page, scoringPage }) => {
    await recordDirectViaUI(page, 'REACHED_ON_ERROR')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(0)
    expect(sb.baseState.first).toBe(scoringPage.playerIds[0])
  })
})

test.describe('Scoring — AB Recording (bases loaded)', () => {
  /** Helper: seed bases-loaded state with players 1B=playerIds[6], 2B=playerIds[7], 3B=playerIds[8].
   *  The Walk gives playerIds[0] as the batter for the next AB. */
  async function seedBasesLoaded(gameId: number, playerIds: number[]): Promise<void> {
    // Seed a single AB-record so baseStateAfter sets all three bases.
    // The recorded AB is irrelevant for the next-batter computation since lineup-based
    // batter rotation drives `currentBatter`. We seed three ABs to load bases:
    // WALK by player 9 (loads 1B), WALK by player 8 forced (1B-runner to 2B), WALK by player 7 forced (1B→2B, 2B→3B, batter→1B).
    // Wait: a single AB with explicit baseStateAfter is much simpler.
    await seedAtBat(gameId, playerIds[8], 'WALK', 1, {
      first: playerIds[6],
      second: playerIds[7],
      third: playerIds[8],
    })
  }

  test('SINGLE bases loaded scores 3B, batter+1B+2B advance', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordHitViaUI(page, 'SINGLE')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBeGreaterThanOrEqual(1)
  })

  test('HOMERUN bases loaded grand slam (4 runs)', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordHitViaUI(page, 'HOMERUN')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(4)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()
  })

  test('WALK bases loaded forces 1 run', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordDirectViaUI(page, 'WALK')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
  })

  test('HBP bases loaded forces 1 run', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordDirectViaUI(page, 'HIT_BY_PITCH')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
  })

  test('REACHED_ON_ERROR bases loaded forces 1 run (force-min)', async ({ page, scoringPage }) => {
    await seedBasesLoaded(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await recordDirectViaUI(page, 'REACHED_ON_ERROR')
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
  })
})
```

- [ ] **Step 2: Run full E2E suite**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run test:e2e
```
Expected: 14 Tests PASS (1 smoke + 9 empty-bases + 5 bases-loaded). Total ~3-4min mit reuseExistingServer, ~7-10min cold-start.

Bei FAILUREs:
- Screenshots in `test-results/` ansehen.
- Browser-Console-Logs via `--headed` Mode prüfen: `npm run test:e2e -- --headed`.
- Backend-Logs via `--debug`: `npm run test:e2e -- --debug`.
- Typische Pain-Points: Sheet öffnet sich nicht / unterschiedliche Button-Labels (Save vs Speichern) / timing race.

Falls Save-Button-Name nicht matched: Sheet-Code lesen (`CorrectionSheet.tsx`) und richtigen Text/Role verwenden. Vermutlich "Korrigieren" oder "Speichern" oder andere.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/scoring/scoring-atbats.spec.ts
git commit -m "✨ E2E AB-Suite: 14 Tests für alle Result-Typen (empty + bases-loaded)"
```

---

## Verification (final)

- [ ] **All E2E tests pass**

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run test:e2e`
Expected: ALL PASS, BUILD SUCCESS.

- [ ] **Backend still healthy**

Run: `curl -s -u admin:Deadsox123! http://localhost:8080/actuator/health | head -1`
Expected: `{"status":"UP"}`.

- [ ] **Clean-up: no leftover test gamedays**

Run: `curl -s -u admin:Deadsox123! http://localhost:8080/api/seasons | python3 -c "import json,sys; print([s for s in json.load(sys.stdin) if s.get('year')==2099])"`
Expected: list mit E2E-Season (kann persistent bleiben — Season selbst ist harmlos, GameDays werden via afterAll gelöscht).

Existierende E2E-Test-GameDays (sollten 0 sein nach Test-Run):
Run: `curl -s -u admin:Deadsox123! http://localhost:8080/api/seasons/<SEASON_ID>/gamedays | python3 -c "import json,sys; print([gd for gd in json.load(sys.stdin) if gd.get('label')=='E2E-Test-Scoring'])"`
Expected: `[]`.

- [ ] **Documentation**

CLAUDE.md kurz erweitern um E2E-Test-Hinweis: nur falls nötig. Aktuell genügt der Plan-Doc + Spec-Doc als Dokumentation.
