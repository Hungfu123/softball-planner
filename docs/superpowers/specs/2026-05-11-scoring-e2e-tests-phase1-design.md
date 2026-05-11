# Live-Scoring E2E Tests — Phase 1 + 2

**Datum:** 2026-05-11
**Scope:** Playwright Setup + AB-Recording-Suite. Phases 3+ separat.
**Stack:** React 19 + Vite + TypeScript Frontend, Spring Boot Backend.

## Problem

Legacy Live-Scoring (`ScoringPage` Route `/gameday/:id/scoring/:gameIndex`) wurde wiederholt gefixt (Undo-Refactor, ROE-Fix, Inning-Advance-Event, 4 Quick-Win-Bugs). Aktuell **keine E2E-Tests** — Regressionen werden nur durch manuelle Smoke-Tests gefangen. User will "richtige E2E-Tests, gucken ob was komisch aussieht".

Bestehende Test-Infra: Vitest + RTL (Unit/Component-Tests in `frontend/src/**/*.test.tsx`). Backend hat 553 JUnit + Testcontainers-Integration-Tests. **Keine browser-driven E2E-Layer.**

## Lösung

Playwright als E2E-Framework hinzufügen. Phase 1 = Setup + Smoke-Test. Phase 2 = AB-Recording-Suite (alle 9 Result-Types inkl. Edge-Cases).

Phases 3+ (Stealing, Subs, Inning-Advance, Undo, Reset, Game-End) als Follow-Up-Specs.

## Architektur

### Test-Framework

**Playwright** (`@playwright/test`). Echter Chromium-Browser (headless im CI, headed lokal optional). Direkter HTTP-Treffer aufs lokal-laufende Backend.

**Begründung:** Schon via MCP genutzt (Browser installiert). Best-in-class für Browser-driven Tests + Visual-Regression (für später). Native screenshot/trace-Support.

### Test-Isolation (Approach B — Shared Test GameDay)

Pro Spec-File (`describe` block):
- **`beforeAll`** — Helper `setupTestGame()` ruft `GET /api/gamedays` → sucht GameDay mit Name "E2E-Test-Scoring". Wenn nicht vorhanden: erstellt via API (Season → GameDay → Game → Lineup mit 9 Test-Spielern). Speichert `gameId` in spec-level Variable.
- **`afterAll`** — Helper `teardownTestGame()` löscht GameDay (Cascade entfernt Game + Lineup + ABs + Stealings + Subs + Events).
- **`beforeEach`** — `POST /api/games/{id}/scoring` `DELETE` (existing `resetScoring`-Endpoint) plus `PUT /api/games/{id}/batting-side {battingSide: 'top'}` damit Tests konsistent starten.

Tests laufen **sequenziell** (Playwright default per worker). Parallel-Mode disabled — Shared Game.

### Auth-Handling

Playwright `beforeAll` setzt LocalStorage:
```ts
await page.context().addInitScript(() => {
  localStorage.setItem('auth', btoa('admin:Deadsox123!'))
})
```

Plus API-Calls in Helpers nutzen Basic-Auth-Header direkt.

### webServer Config

`playwright.config.ts` startet automatisch:
- Backend: `cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml` (Port 8080, healthcheck `/actuator/health`)
- Frontend: `cd frontend && npx vite` (Port 5173)

Beide nur wenn nicht bereits laufend (Playwright reuseExistingServer).

**Docker DB Dependency:** User muss `docker compose up -d db` vorher laufen lassen. Doku im README.

Sobald Tests durch: webServer wird heruntergefahren.

### File Structure

```
frontend/
├── e2e/
│   ├── helpers/
│   │   ├── api.ts              # API-Helpers (createGameDay, recordAtBat, getScoreboard, resetGame, ...)
│   │   ├── auth.ts             # LocalStorage-Auth-Setup
│   │   └── fixtures.ts         # Playwright test extends (page mit auth + cleanup)
│   └── scoring/
│       ├── scoring-smoke.spec.ts      # Phase 1: Smoke
│       └── scoring-atbats.spec.ts     # Phase 2: AB results
├── playwright.config.ts
└── package.json                # neue scripts: test:e2e, test:e2e:ui
```

## Phase 1: Setup + Smoke-Test

### Setup-Tasks

1. **Dev-Dependency:** `npm install -D @playwright/test`. Chromium-Browser bereits installiert (via MCP-Plugin früher).
2. **playwright.config.ts** — webServer für Backend + Frontend, baseURL `http://localhost:5173`, testDir `e2e`, projects: chromium.
3. **`.gitignore`** ergänzen: `playwright-report/`, `test-results/`, `e2e/.auth/`
4. **package.json** scripts: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`.
5. **Helpers schreiben** (`api.ts`, `auth.ts`, `fixtures.ts`).
6. **Smoke-Test** (`scoring-smoke.spec.ts`): 1 Test der nach Login zur ScoringPage navigiert + checked dass ActionButtons rendert.

### Smoke-Test Assertions

- Page lädt (`<button>TREFFER</button>` sichtbar)
- Inning zeigt 1 (kein Event, kein AB)
- Score 0–0 sichtbar
- Rückgängig-Button disabled

## Phase 2: AB-Recording-Suite

### Test-Cases

Pro Result-Type ein Test mit drei Setups (empty bases, 1B-runner, bases-loaded):

| Test | Setup | Action | Assertions |
|---|---|---|---|
| `single_emptyBases_placesBatterOn1B` | leer | SINGLE | baseState=(batter, null, null), scoreUs=0 |
| `single_1BRunner_advancesRunnerAnd1B` | 1B=Alice | SINGLE | baseState=(batter, Alice, null), scoreUs=0 |
| `single_basesLoaded_3BScores` | A/B/C loaded | SINGLE → Korrektur-Sheet Save Default | baseState=(batter, A, B), scoreUs=1 |
| `double_emptyBases_placesBatterOn2B` | leer | DOUBLE | baseState=(null, batter, null), scoreUs=0 |
| `double_basesLoaded_scoresTwo` | loaded | DOUBLE → Korrektur Save | baseState=(null, batter, A), scoreUs=2 |
| `triple_basesLoaded_clearsBases` | loaded | TRIPLE → Korrektur Save | baseState=(null, null, batter), scoreUs=3 |
| `homerun_emptyBases_scoresOne` | leer | HOMERUN | baseState=empty, scoreUs=1 |
| `homerun_basesLoaded_grandSlam` | loaded | HOMERUN | baseState=empty, scoreUs=4 |
| `walk_emptyBases_placesBatterOn1B` | leer | WALK | baseState=(batter, null, null), scoreUs=0 |
| `walk_basesLoaded_forcesRun` | loaded | WALK | baseState=(batter, A, B), scoreUs=1 |
| `hbp_basesLoaded_forcesRun` | loaded | HBP | baseState=(batter, A, B), scoreUs=1 |
| `strikeout_incrementsOuts` | leer | STRIKEOUT | outsInCurrent=1 |
| `out_incrementsOuts` | leer | AUS | outsInCurrent=1 |
| `roe_emptyBases_placesBatterOn1B` | leer | ERROR | baseState=(batter, null, null), scoreUs=0 |
| `roe_basesLoaded_forcesRun` | loaded | ERROR → Korrektur Save (Default = force-min) | baseState=(batter, A, B), scoreUs=1 |

15 Tests. Cover alle Result-Types + alle Force-Min-Pfade.

### Helpers

`recordAtBatViaUI(page, result)` — klickt Action-Button. Bei SINGLE/DOUBLE/TRIPLE öffnet Sub-Picker, dann klickt entsprechenden Hit-Type. Bei OUT+Runnern öffnet Korrektur-Sheet → "Save" (Default-Belegung akzeptieren).

`seedBaseState(gameId, state)` — direkt via API: 1 AB recorded mit `baseStateAfter`. Setup-Shortcut für bases-loaded ohne mehrere UI-Klicks.

### Assertion-Strategy

Nach jedem Test-Step:
1. **UI:** baseState via SVG-Diamond-Snapshot (`data-testid` Attribute auf Bases) oder via direkten Lese vom rendered Component-State.
2. **Backend:** `GET /api/games/{id}/scoreboard` und assert response.

Both-Layer-Assertion fängt Frontend-Backend-Drift.

## Test-Data

**Test-Player:** Lineup nutzt 9 erste Spieler aus `GET /api/players` sortiert nach battingOrder. Diese Spieler müssen existieren (sind sie — Dead-Sox Stammspieler).

**GameDay-Name:** `"E2E-Test-Scoring"`. Date: feste Future-Date z.B. `2099-01-01` damit kein Konflikt mit echten Spieltagen.

**Cleanup-Safety:** afterAll prüft den Namen explizit bevor delete — verhindert Catastrophe.

## CI Integration

Phase 1 nur lokal lauffähig (User-driven). CI in Follow-Up wenn stable.

## Out of Scope (Phase 3+)

- Stealing E2E
- Substitution E2E
- Inning-Advance E2E (mit Score-Drift-Regression-Check)
- Undo E2E (4 Action-Typen, Orphan-Cleanup, Toast-Text)
- Reset E2E
- Game-End E2E (Walkoff, Regulation-Over)
- Visual-Regression (screenshot-diffing)
- CI-Pipeline-Integration
- Spielbogen E2E (eigener Pfad)

## Test-Run

Lokal:
```bash
docker compose up -d db
cd frontend && npm run test:e2e              # headless
cd frontend && npm run test:e2e:ui           # UI mode
```

Backend + Frontend starten via `playwright.config.ts webServer`. ~1min start-up. ~30s pro Test (15 Tests = ~7-8min total).

## Files

**Neu:**
- `frontend/playwright.config.ts`
- `frontend/e2e/helpers/api.ts`
- `frontend/e2e/helpers/auth.ts`
- `frontend/e2e/helpers/fixtures.ts`
- `frontend/e2e/scoring/scoring-smoke.spec.ts`
- `frontend/e2e/scoring/scoring-atbats.spec.ts`

**Geändert:**
- `frontend/package.json` (devDep + scripts)
- `frontend/.gitignore` (Playwright artifacts)
- `CLAUDE.md` (kurz Erwähnung in "Tests" section)

## Tests

Tests testen sich selbst (sind die Tests). Smoke-Test in Phase 1 ist Self-Verify.
