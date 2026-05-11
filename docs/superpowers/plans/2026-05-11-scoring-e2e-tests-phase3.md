# Scoring E2E Tests Phase 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 21 E2E-Tests für Undo, Inning-Advance, Stealing, Substitution Flows der legacy ScoringPage.

**Architecture:** Erweitert Phase-1+2 Test-Infrastruktur (Playwright + Shared Test-GameDay-Fixture) um neue UI-Helpers für Multi-Step-Flows (Sub-Sheet, Stealing-Sheet, NextInning-Pille, Undo) und Setup für Bench-Player. 4 neue Test-Suites, gleiches beforeEach-Pattern: resetScoring + battingSide=top, navigate to scoring page.

**Tech Stack:** Playwright 1.59+, TypeScript, Vite 7, Spring Boot 3.4.3 backend.

**Spec:** `docs/superpowers/specs/2026-05-11-scoring-e2e-tests-phase3-design.md`

---

## File Structure

**Neu:**
- `frontend/e2e/scoring/scoring-stealing.spec.ts`
- `frontend/e2e/scoring/scoring-substitution.spec.ts`
- `frontend/e2e/scoring/scoring-inning-advance.spec.ts`
- `frontend/e2e/scoring/scoring-undo.spec.ts`

**Geändert:**
- `frontend/e2e/helpers/api.ts` — add `getStealingEvents`, `getSubstitutions`, `getInningAdvanceEvents`, extend `ensureTestGame` mit Bench-Player.
- `frontend/e2e/helpers/fixtures.ts` — add `recordStealingViaUI`, `recordSubstitutionViaUI`, `advanceInningViaUI`, `clickUndo`.

---

## Voraussetzungen

- Phase 1+2 gemerged (state nach commit `3c9a809`).
- Docker DB läuft: `docker compose up -d db`.
- Lokales Backend kann gestartet werden (Playwright webServer übernimmt).
- DB hat mindestens **10 Spieler** mit `defaultBattingOrder != null` (Phase 1+2 brauchte 9 — wir erweitern um 1 Bench).

---

## Task 1: Helper-Erweiterungen

**Files:**
- Modify: `frontend/e2e/helpers/api.ts`
- Modify: `frontend/e2e/helpers/fixtures.ts`

- [ ] **Step 1: Add API getters in `api.ts`**

Am Ende von `frontend/e2e/helpers/api.ts` ergänzen (nach `getScoreboard`):

```typescript
type StealingEvent = { id: number; runnerId: number; runnerName: string; type: 'STOLEN_BASE' | 'CAUGHT_STEALING' | 'OUT_ON_PLAY' | 'WILD_PITCH' | 'PASSED_BALL'; inning: number }

export async function getStealingEvents(gameId: number): Promise<StealingEvent[]> {
  const c = await client()
  try {
    const res = await c.get(`/games/${gameId}/stealing-events`)
    if (!res.ok()) throw new Error(`getStealingEvents failed: ${res.status()}`)
    return await res.json()
  } finally { await c.dispose() }
}

type Substitution = { id: number; playerOutId: number; playerInId: number; inning: number }

export async function getSubstitutions(gameId: number): Promise<Substitution[]> {
  const c = await client()
  try {
    const res = await c.get(`/games/${gameId}/substitutions`)
    if (!res.ok()) throw new Error(`getSubstitutions failed: ${res.status()}`)
    return await res.json()
  } finally { await c.dispose() }
}
```

- [ ] **Step 2: Extend `ensureTestGame` to include Bench-Player**

Find `ensureTestGame` in `api.ts`. Find this section:

```typescript
    const ordered = [...players]
      .filter(p => p.defaultBattingOrder != null)
      .sort((a, b) => (a.defaultBattingOrder ?? 99) - (b.defaultBattingOrder ?? 99))
      .slice(0, 9)
    if (ordered.length < 9) {
      throw new Error(`Brauche mindestens 9 Spieler mit battingOrder, habe ${ordered.length}`)
    }
    const playerIds = ordered.map(p => p.id)
```

Replace with:

```typescript
    const ordered = [...players]
      .filter(p => p.defaultBattingOrder != null)
      .sort((a, b) => (a.defaultBattingOrder ?? 99) - (b.defaultBattingOrder ?? 99))
      .slice(0, 10) // 9 in lineup + 1 bench
    if (ordered.length < 10) {
      throw new Error(`Brauche mindestens 10 Spieler mit defaultBattingOrder, habe ${ordered.length}`)
    }
    const playerIds = ordered.slice(0, 9).map(p => p.id)
    const benchPlayerId = ordered[9].id
    const allAvailableIds = [...playerIds, benchPlayerId]
```

Then find the `setAvailablePlayers` call:

```typescript
      const availRes = await c.put(`/gamedays/${gameDay.id}/players`, { data: { playerIds } })
```

Replace with:

```typescript
      const availRes = await c.put(`/gamedays/${gameDay.id}/players`, { data: { playerIds: allAvailableIds } })
```

Finally update the return signature. Find:

```typescript
export async function ensureTestGame(): Promise<{ gameId: number; gameDayId: number; playerIds: number[] }> {
```

Replace with:

```typescript
export async function ensureTestGame(): Promise<{ gameId: number; gameDayId: number; playerIds: number[]; benchPlayerId: number }> {
```

And the final return — find:

```typescript
    return { gameId, gameDayId: gameDay.id, playerIds }
```

Replace with:

```typescript
    return { gameId, gameDayId: gameDay.id, playerIds, benchPlayerId }
```

Also extend the fetch-existing branch: when GameDay exists (createdNew=false), still need to compute `benchPlayerId`. Add right before `return`:

```typescript
    // benchPlayerId always derived from ordered[9] regardless of createdNew
```

(The variable is already in scope from earlier — no extra change needed since `ordered` is computed in both branches.)

- [ ] **Step 3: Player-Name resolver helper in `api.ts`**

Append after `getSubstitutions`:

```typescript
export async function getPlayerName(playerId: number): Promise<string> {
  const c = await client()
  try {
    const res = await c.get('/players')
    if (!res.ok()) throw new Error(`getPlayer failed: ${res.status()}`)
    const all: Array<{ id: number; name: string }> = await res.json()
    const p = all.find(x => x.id === playerId)
    if (!p) throw new Error(`Player ${playerId} nicht gefunden`)
    return p.name
  } finally { await c.dispose() }
}
```

- [ ] **Step 4: Update fixture type + scoringPage in `fixtures.ts`**

In `frontend/e2e/helpers/fixtures.ts`, find the `Fixtures` type:

```typescript
type Fixtures = {
  testGame: { gameId: number; gameDayId: number; playerIds: number[] }
  scoringPage: { gameId: number; playerIds: number[] }
}
```

Replace with:

```typescript
type Fixtures = {
  testGame: { gameId: number; gameDayId: number; playerIds: number[]; benchPlayerId: number }
  scoringPage: { gameId: number; gameDayId: number; playerIds: number[]; benchPlayerId: number }
}
```

Find the `scoringPage` fixture body:

```typescript
  scoringPage: async ({ page, context, workerGame }, use) => {
    await seedAuth(context)
    await resetScoring(workerGame.gameId)
    await setBattingSide(workerGame.gameId, 'top')
    await page.goto(`/gameday/${workerGame.gameDayId}/scoring/0`)
    await use({ gameId: workerGame.gameId, playerIds: workerGame.playerIds })
  },
```

Replace with:

```typescript
  scoringPage: async ({ page, context, workerGame }, use) => {
    await seedAuth(context)
    await resetScoring(workerGame.gameId)
    await setBattingSide(workerGame.gameId, 'top')
    await page.goto(`/gameday/${workerGame.gameDayId}/scoring/0`)
    await use({
      gameId: workerGame.gameId,
      gameDayId: workerGame.gameDayId,
      playerIds: workerGame.playerIds,
      benchPlayerId: workerGame.benchPlayerId,
    })
  },
```

- [ ] **Step 5: Add UI helpers to `fixtures.ts`**

Am Ende der Datei (vor `export { expect }`) ergänzen:

```typescript
import { getPlayerName } from './api'

/**
 * Tap a runner on the diamond → opens Stealing-Sheet → click variant.
 * runnerName must match the visible name on the SVG runner (truncated to 7 chars + ellipsis).
 */
export async function recordStealingViaUI(page: Page, runnerPlayerId: number, type: 'STOLEN_BASE' | 'CAUGHT_STEALING'): Promise<void> {
  const name = await getPlayerName(runnerPlayerId)
  // SVG <text> with truncated name. Click the parent <g> to trigger onRunnerTap.
  const displayName = name.length > 7 ? name.slice(0, 6) + '…' : name
  await page.locator('svg').getByText(displayName, { exact: true }).first().click()
  await page.waitForTimeout(300)
  const label = type === 'STOLEN_BASE' ? /Stolen Base/i : /Caught Stealing/i
  await page.getByRole('button', { name: label }).click()
  await page.waitForTimeout(300)
}

/**
 * Open Lineup-Sheet → Wechseln → click playerOut + playerIn → Bestätigen.
 */
export async function recordSubstitutionViaUI(page: Page, playerOutId: number, playerInId: number): Promise<void> {
  const outName = await getPlayerName(playerOutId)
  const inName = await getPlayerName(playerInId)
  await page.getByRole('button', { name: /Komplette Aufstellung anzeigen/i }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: /^Wechseln$/i }).click()
  await page.waitForTimeout(200)
  // Sub-Sheet has 2 grids — playerOut (active) and playerIn (bench).
  // Both rendered as buttons with the player name. Use first match per name.
  await page.getByRole('button', { name: new RegExp(`^${escapeRegex(outName)}$`), exact: false }).first().click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: new RegExp(`^${escapeRegex(inName)}$`), exact: false }).first().click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: /✓\s*Bestätigen/i }).click()
  await page.waitForTimeout(400)
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Click the half-inning-over Pille → fill opponentRuns input → click "Nächstes Inning starten".
 * Requires halfInningOver=true (3 outs accumulated).
 */
export async function advanceInningViaUI(page: Page, opponentRuns: number): Promise<void> {
  // Input field has placeholder "0" and label text "Runs vom Gegner in diesem Inning"
  if (opponentRuns > 0) {
    const input = page.locator('input[type="number"][placeholder="0"]').first()
    await input.fill(String(opponentRuns))
  }
  await page.getByRole('button', { name: /Nächstes Inning starten/i }).click()
  await page.waitForTimeout(400)
}

/** Click Rückgängig button. Wait for toast/state-update. */
export async function clickUndo(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Rückgängig$/i }).click()
  await page.waitForTimeout(500)
}
```

- [ ] **Step 6: TypeScript-Check**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npx tsc --noEmit -p tsconfig.json
```
Expected: SUCCESS.

- [ ] **Step 7: Run Phase 1+2 tests to confirm helpers backward-compat**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run test:e2e -- scoring-smoke.spec.ts scoring-atbats.spec.ts
```
Expected: 15/15 PASS. Bench-Player-Setup darf bestehende Tests nicht brechen.

Falls vorhandene Test-GameDay existiert (von Phase 1+2 runs) und kein bench player: tests pass because they don't use bench. Aber `ensureTestGame` setzt diesmal availablePlayers neu wenn createdNew — bei reuse wird nicht neu gesetzt. Edge: alte GameDay hat nur 9 available — Sub-Tests dann fail. Mitigation: in Step 8 alten Test-GameDay löschen vor Run.

- [ ] **Step 8: Clean any stale test gameday before first phase-3 run**

```bash
curl -s -u admin:Deadsox123! 'http://localhost:8080/api/seasons' | python3 -c "
import json, sys, urllib.request, base64
seasons = json.load(sys.stdin)
test_season = next((s for s in seasons if s.get('year') == 2099), None)
if not test_season:
    print('No test season — nothing to clean')
else:
    req = urllib.request.Request(f'http://localhost:8080/api/seasons/{test_season[\"id\"]}/gamedays')
    req.add_header('Authorization', 'Basic ' + base64.b64encode(b'admin:Deadsox123!').decode())
    gds = json.loads(urllib.request.urlopen(req).read())
    for gd in gds:
        if gd.get('label') == 'E2E-Test-Scoring':
            del_req = urllib.request.Request(f'http://localhost:8080/api/gamedays/{gd[\"id\"]}', method='DELETE')
            del_req.add_header('Authorization', 'Basic ' + base64.b64encode(b'admin:Deadsox123!').decode())
            urllib.request.urlopen(del_req)
            print(f'Deleted gameday {gd[\"id\"]}')
"
```
(Schluckt Python-Output. Wenn Backend nicht läuft: erst starten oder skip — nächster `ensureTestGame`-Call macht eh neu.)

- [ ] **Step 9: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/helpers/api.ts frontend/e2e/helpers/fixtures.ts
git commit -m "✨ E2E Helpers Phase 3: Bench-Player + UI-Drivers (Stealing/Sub/InningAdvance/Undo)"
```

---

## Task 2: Stealing Suite

**Files:**
- Create: `frontend/e2e/scoring/scoring-stealing.spec.ts`

- [ ] **Step 1: Write Stealing tests**

```typescript
import { test, expect, recordStealingViaUI } from '../helpers/fixtures'
import { getScoreboard, getStealingEvents, seedAtBat } from '../helpers/api'

test.describe('Scoring — Stealing', () => {
  test('STOLEN_BASE 1B-Runner moves to 2B', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBe(scoringPage.playerIds[0])
    expect(sb.scoreUs).toBe(0)
  })

  test('STOLEN_BASE 3B-Runner scores (steal of home)', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'TRIPLE', 1, {
      first: null, second: null, third: scoringPage.playerIds[0],
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
    expect(sb.baseState.third).toBeNull()
  })

  test('CAUGHT_STEALING increments outs', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordStealingViaUI(page, scoringPage.playerIds[0], 'CAUGHT_STEALING')

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(1)
    expect(sb.baseState.first).toBeNull()
  })

  test('Stealing event persisted in backend', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)

    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')

    const events = await getStealingEvents(scoringPage.gameId)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('STOLEN_BASE')
    expect(events[0].runnerId).toBe(scoringPage.playerIds[0])
  })
})
```

- [ ] **Step 2: Run**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run test:e2e -- scoring-stealing.spec.ts
```
Expected: 4/4 PASS.

Bei Failures:
- Wenn Runner-Click nicht funkt: Selector-Strategie anpassen. SVG `<text>` direkt anklickbar wenn `pointer-events` nicht disabled. Probiere `page.locator('text', { hasText: displayName }).click({ force: true })` oder via `data-testid`.
- Wenn Name truncation falsch (z.B. Player heißt "Khang" = 5 chars, kein Truncate): Helper-Logik in `recordStealingViaUI` anpassen.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/scoring/scoring-stealing.spec.ts
git commit -m "✨ E2E Stealing-Suite: STOLEN_BASE + CAUGHT_STEALING + Persistence (4 Tests)"
```

---

## Task 3: Substitution Suite

**Files:**
- Create: `frontend/e2e/scoring/scoring-substitution.spec.ts`

- [ ] **Step 1: Write Sub tests**

```typescript
import { test, expect, recordSubstitutionViaUI } from '../helpers/fixtures'
import { getScoreboard, getSubstitutions } from '../helpers/api'

test.describe('Scoring — Substitution', () => {
  test('Sub persists to backend with correct playerOut/In/inning', async ({ page, scoringPage }) => {
    // PlayerIds[0] is leadoff (Khang). Bench replaces.
    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)

    const subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(1)
    expect(subs[0].playerOutId).toBe(scoringPage.playerIds[0])
    expect(subs[0].playerInId).toBe(scoringPage.benchPlayerId)
    expect(subs[0].inning).toBe(1)
  })

  test('Sub persists across page reload', async ({ page, scoringPage }) => {
    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)
    await page.reload()
    await page.waitForTimeout(500)

    const subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(1)
  })

  test('Sub changes currentBatter to substitute', async ({ page, scoringPage }) => {
    // Leadoff is Khang (playerIds[0]). Sub Khang → bench-player.
    const before = await getScoreboard(scoringPage.gameId)
    expect(before.currentBatterId).toBe(scoringPage.playerIds[0])

    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)

    const after = await getScoreboard(scoringPage.gameId)
    expect(after.currentBatterId).toBe(scoringPage.benchPlayerId)
  })
})
```

- [ ] **Step 2: Run**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run test:e2e -- scoring-substitution.spec.ts
```
Expected: 3/3 PASS.

Bei Sub-Sheet Player-Button Mehrdeutigkeit: Sub-Sheet zeigt aktive Spieler links + Bench rechts. Wenn beide Bereiche denselben Namen haben (unmöglich da unique players), würde first() falsch sein. Aber Aktive ≠ Bench, daher first() = aktive (out). Zweiter Klick = bench (in).

Falls Drawer-Animations vor Click rendern: erhöhe waitForTimeout zu 500ms.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/scoring/scoring-substitution.spec.ts
git commit -m "✨ E2E Substitution-Suite: Sub-Sheet UI-Flow (3 Tests)"
```

---

## Task 4: Inning-Advance Suite

**Files:**
- Create: `frontend/e2e/scoring/scoring-inning-advance.spec.ts`

- [ ] **Step 1: Write Inning-Advance tests**

```typescript
import { test, expect, advanceInningViaUI, recordDirectViaUI, clickUndo } from '../helpers/fixtures'
import { getScoreboard, seedAtBat } from '../helpers/api'

test.describe('Scoring — Inning-Advance', () => {
  /** Seed 3 OUT-ABs so halfInningOver=true and the Pille appears. */
  async function seedThreeOuts(gameId: number, playerIds: number[]): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await seedAtBat(gameId, playerIds[i], 'OUT', 1, { first: null, second: null, third: null })
    }
  }

  test('advance with zero opponent runs increments currentInning', async ({ page, scoringPage }) => {
    await seedThreeOuts(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)

    await advanceInningViaUI(page, 0)

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(0)
  })

  test('advance with opponent runs adds to scoreThem', async ({ page, scoringPage }) => {
    await seedThreeOuts(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)

    await advanceInningViaUI(page, 3)

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(3)
  })

  test('advance persists across reload', async ({ page, scoringPage }) => {
    await seedThreeOuts(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await advanceInningViaUI(page, 2)
    await page.reload()
    await page.waitForTimeout(500)

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(2)
  })

  test('bug3 regression — undo after advance reverts scoreThem', async ({ page, scoringPage }) => {
    // Setup: 3 outs inning 1, advance with 3 opponent runs, record 1 AB inning 2
    await seedThreeOuts(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await advanceInningViaUI(page, 3)
    // After advance: currentInning=2, scoreThem=3
    await recordDirectViaUI(page, 'WALK')
    // After WALK: AB inning 2 recorded

    // Undo 1: deletes the WALK AB
    await clickUndo(page)
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreThem).toBe(3) // Still 3 — AB undo doesn't affect opponent runs
    expect(sb.currentInning).toBe(2) // Inning advance event still present

    // Undo 2: deletes the InningAdvance event
    await clickUndo(page)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreThem).toBe(0) // Reverted!
    expect(sb.currentInning).toBe(1)
  })

  test('multiple advances stack currentInning', async ({ page, scoringPage }) => {
    await seedThreeOuts(scoringPage.gameId, scoringPage.playerIds)
    await page.reload()
    await page.waitForTimeout(500)
    await advanceInningViaUI(page, 0)
    // Now in inning 2, but no outs. Seed 3 more outs in inning 2.
    for (let i = 0; i < 3; i++) {
      await seedAtBat(scoringPage.gameId, scoringPage.playerIds[i], 'OUT', 2, { first: null, second: null, third: null })
    }
    await page.reload()
    await page.waitForTimeout(500)
    await advanceInningViaUI(page, 0)

    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(3)
  })
})
```

- [ ] **Step 2: Run**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run test:e2e -- scoring-inning-advance.spec.ts
```
Expected: 5/5 PASS.

Key Test: `bug3_regression_*` — wenn der fail't, ist Bug #3 zurückgekehrt.

Falls Pille nicht erscheint: `halfInningOver` braucht `displayOuts >= 3`. Backend `outsInCurrentInning` = sum(AB-outs + Stealing-Outs). 3 OUT-ABs → outs=3 ✓.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/scoring/scoring-inning-advance.spec.ts
git commit -m "✨ E2E Inning-Advance-Suite: + Bug #3 Regression-Schutz (5 Tests)"
```

---

## Task 5: Undo Suite

**Files:**
- Create: `frontend/e2e/scoring/scoring-undo.spec.ts`

- [ ] **Step 1: Write Undo tests**

```typescript
import {
  test, expect,
  clickUndo, recordHitViaUI, recordDirectViaUI, recordStealingViaUI, recordSubstitutionViaUI, advanceInningViaUI,
} from '../helpers/fixtures'
import { getScoreboard, getStealingEvents, getSubstitutions, seedAtBat, resetScoring } from '../helpers/api'

test.describe('Scoring — Undo', () => {
  test('undo button disabled when no actions', async ({ page, scoringPage: _sp }) => {
    await expect(page.getByRole('button', { name: /^Rückgängig$/i })).toBeDisabled()
  })

  test('undo single AB clears state', async ({ page, scoringPage }) => {
    await recordHitViaUI(page, 'SINGLE')
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.totalAtBats).toBe(1)

    await clickUndo(page)

    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.totalAtBats).toBe(0)
    expect(sb.baseState.first).toBeNull()
  })

  test('undo AB also deletes orphan stealings (cutoff cleanup)', async ({ page, scoringPage }) => {
    // Seed AB1, then Stealing (orphan to AB2 once it exists), then AB2
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    // Steal between AB1 and AB2 (becomes orphan to AB2)
    await page.reload()
    await page.waitForTimeout(500)
    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')
    // Now record AB2
    await recordHitViaUI(page, 'SINGLE')

    let stealings = await getStealingEvents(scoringPage.gameId)
    expect(stealings).toHaveLength(1)

    await clickUndo(page) // undoes AB2 + orphan cleanup
    stealings = await getStealingEvents(scoringPage.gameId)
    // Orphan steal between AB1 and AB2 gets deleted (cutoff = AB1.createdAt, steal > cutoff)
    expect(stealings).toHaveLength(0)
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.totalAtBats).toBe(1) // AB1 bleibt
  })

  test('undo stealing-only deletes only stealing', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)
    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')

    await clickUndo(page)
    const stealings = await getStealingEvents(scoringPage.gameId)
    expect(stealings).toHaveLength(0)
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.totalAtBats).toBe(1) // AB1 bleibt
  })

  test('undo substitution-only deletes only sub', async ({ page, scoringPage }) => {
    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)
    let subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(1)

    await clickUndo(page)
    subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(0)
  })

  test('undo inning-advance reverts score and event', async ({ page, scoringPage }) => {
    for (let i = 0; i < 3; i++) {
      await seedAtBat(scoringPage.gameId, scoringPage.playerIds[i], 'OUT', 1, { first: null, second: null, third: null })
    }
    await page.reload()
    await page.waitForTimeout(500)
    await advanceInningViaUI(page, 2)
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreThem).toBe(2)
    expect(sb.currentInning).toBe(2)

    await clickUndo(page)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreThem).toBe(0)
    expect(sb.currentInning).toBe(1)
  })

  test('toast adaptive: AT_BAT', async ({ page, scoringPage: _sp }) => {
    await recordHitViaUI(page, 'SINGLE')
    await clickUndo(page)
    await expect(page.getByText(/Letzter At-Bat rückgängig gemacht/i)).toBeVisible()
  })

  test('toast adaptive: STEALING', async ({ page, scoringPage }) => {
    await seedAtBat(scoringPage.gameId, scoringPage.playerIds[0], 'SINGLE', 1, {
      first: scoringPage.playerIds[0], second: null, third: null,
    })
    await page.reload()
    await page.waitForTimeout(500)
    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')
    await clickUndo(page)
    await expect(page.getByText(/Letztes Stealing-Event rückgängig gemacht/i)).toBeVisible()
  })

  test('toast adaptive: INNING_ADVANCE', async ({ page, scoringPage }) => {
    for (let i = 0; i < 3; i++) {
      await seedAtBat(scoringPage.gameId, scoringPage.playerIds[i], 'OUT', 1, { first: null, second: null, third: null })
    }
    await page.reload()
    await page.waitForTimeout(500)
    await advanceInningViaUI(page, 0)
    await clickUndo(page)
    await expect(page.getByText(/Letzter Inning-Wechsel rückgängig gemacht/i)).toBeVisible()
  })
})

// Suppress unused-var warning for fixture-only-touched tests
void resetScoring
```

- [ ] **Step 2: Run**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run test:e2e -- scoring-undo.spec.ts
```
Expected: 9/9 PASS.

Wenn Toast schon disappeared bevor `expect(page.getByText(...)).toBeVisible()` greift: erhöhe `clickUndo` waitForTimeout auf 200ms NACH click, dann assert direkt. Oder nutze `toBeVisible({ timeout: 1500 })`.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/scoring/scoring-undo.spec.ts
git commit -m "✨ E2E Undo-Suite: alle 4 Undo-Typen + Toast + Disabled-State (9 Tests)"
```

---

## Task 6: Final Run + Verify

**Files:** keine

- [ ] **Step 1: Run full E2E suite**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run test:e2e
```
Expected: **36/36 PASS** (15 von Phase 1+2 + 21 neue).

Total runtime ~2-3min (Backend warm).

- [ ] **Step 2: Falls Tests flaky: stabilize**

Häufige Patterns:
- `await page.waitForLoadState('networkidle')` nach `page.reload()` statt fixem timeout.
- `await page.getByRole('button', { name: ... }).first()` wenn mehrere Matches.
- Drawer/Sheet animations: `await drawer.waitFor({ state: 'visible' })` vor Klicks.

Falls 1-2 Tests sporadisch fail: in jeweiligem Test inline-fix, separater Commit `🐛 E2E ...: stabilize <test>`.

- [ ] **Step 3: Backend full test suite läuft weiterhin**

```bash
cd /home/hungl/privat/softball-lineup/backend && ./mvnw -s .mvn/local-settings.xml test 2>&1 | tail -8
```
Expected: 553+/553+ PASS. Diese Tests haben nichts geändert backend-seitig.

- [ ] **Step 4: Clean-up Check**

Nach Test-Run sollte keine GameDay mit Label "E2E-Test-Scoring" mehr existieren (afterAll löscht).

```bash
curl -s -u admin:Deadsox123! 'http://localhost:8080/api/seasons' | python3 -c "
import json, sys
print([s for s in json.load(sys.stdin) if s.get('year') == 2099])
"
```
Expected: Season exists (harmlos), aber zugehörige GameDays leer.

---

## Verification (final)

- [ ] **All 36 E2E tests pass**
- [ ] **Backend 553+ tests still pass**
- [ ] **Frontend `npm run build` clean**
- [ ] **`grep -rn "E2E-Test-Scoring" frontend/src/` returnt 0 matches** (Test-Data nicht in Prod-Code geleaked)
