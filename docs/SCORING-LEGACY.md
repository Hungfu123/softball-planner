# Old Scoring (Legacy ScoringPage)

Legacy Live-Scoring pro Game (nicht ein kompletter Bogen). Existiert parallel zum **Spielbogen** (siehe `docs/SPIELBOGEN.md`). User arbeitet primär an Spielbogen, aber Old Scoring bleibt aktiv und wird gelegentlich gepflegt.

**Route:** `/gameday/:id/scoring/:gameIndex` — gebunden an einen Game-Eintrag innerhalb einer GameDay (HOME oder AWAY je nach `Game.opponent`/`Game.homeTeam`).

## Unterschiede Spielbogen ↔ Old Scoring

| | Old Scoring (`ScoringPage`) | Spielbogen (`SpielbogenPage`) |
|---|---|---|
| Datenmodell | `Game` + `AtBat` + `BaseRunningEvent` (HOME/AWAY-Side aus Game-Kontext implizit) | `Spielbogen` + `SpielbogenSlot` + `SpielbogenAtBat` + `SpielbogenStealing` (Side explizit) |
| Lineup-Quelle | Bestehende `LineupEntry` aus GameDay | Eigenes Lineup im Wizard erfasst |
| Inning-Tracking | Frontend-State (`scoreboard.currentInning` aus AB-Liste) | Backend persistiert `currentInning`/`currentSide` |
| Side-Switch | Frontend `switchSide` (per Inning-Half) | Backend `maybeAutoSwitchSide` bei 3 Outs |
| RFL-Sheet-Export | Nein (nur Game-spezifische Stats) | Ja (`BogenSheetDrawer`, RFL-Gitter nur noch im PDF-Export — siehe `docs/SPIELBOGEN.md`) |
| Liga-Senden | Über GameDay → Standings-Berechnung | Über Spielbogen → `LeagueResult` direkt |
| Verwendung | DeadSox-eigene Spiele live tracken | RFL-Sheet erfassen (auch Gegner-Spiele) |

## Backend Files
- `application/GameScoringService.java` — recordAtBat, recordStealingEvent, undoLastAtBat, recordSubstitution. Operates on `Game.id`.
- `adapter/in/web/ScoringController.java` — REST endpoints unter `/api/games/{gameId}/scoring/*`
- `domain/model/AtBat.java`, `BaseRunningEvent.java`, `Substitution.java`
- `domain/port/out/AtBatRepository.java`, `BaseRunningEventRepository.java`, `SubstitutionRepository.java`

## Frontend Files
- `components/scoring/ScoringPage.tsx` — **monolithisch ~1970 Zeilen**. Häufige Splittungs-Kandidaten flaggen!
- `components/scoring/ActionButtons.tsx` — Tier-1 Pills (TREFFER/STRIKEOUT/AUS) + Stealing-Pill
- `components/scoring/DiamondView.tsx` — animiertes Diamond mit Runner-Bewegungen, exit-waypoints zu Home für Scorers
- `components/scoring/CorrectionSheet.tsx` — Tap-Cycle Runner-Adjustment + 3rd-Out Force-Play-Banner + Auto-Default +1-Base bei `context='post-out'`
- `hooks/useScoring.ts` — State + API-Calls

## Domain-Regeln (Old Scoring)
- **Outs zählen:** wie Spielbogen (DP=2, TP=3, K/OUT=1, Error=0).
- **Side-Switch:** Frontend-getrieben. `ScoringPage` toggle Top/Bottom; `currentInning` wird inkrementiert wenn beide Seiten gespielt.
- **Force-Out 3rd-Out-Regel** ebenfalls in `CorrectionSheet` mit Banner.
- **Auto-Open CorrectionSheet** bei OUT/SINGLE/DOUBLE/TRIPLE mit Runnern (NICHT bei 3rd-Out, NICHT bei WALK/HBP/HOMERUN).
- **Stealing-Hint** mit Color-Coded Keywords ("Tipp" navy, "Stolen Base" emerald, "Caught Stealing" red) als Help-Text.
- **`displayRunners` statt `scoreboard.runners`** verwenden — letzteres hat stale Data nach Inning-Switch (während `inningTransition` ist `displayRunners=[]`).

## Häufige Fallstricke
- **CorrectionSheet useEffect Infinite Loop**: useEffect[initial,open] loopt durch neue Array-Reference per Render. Fix: `useEffect[open]` + inline computation.
- **+2 RUNS Toast nach Inning-Switch**: stale `scoreboard.runners`. Fix: `displayRunners`.
- **3-Game-Limit V10 H2-Constraint Bug** (historisch): V10 dropte H2-named Constraint statt Postgres-named. Fix in V25 mit `DROP CONSTRAINT IF EXISTS games_game_number_check; ADD CONSTRAINT games_number_check CHECK (game_number >= 1 AND game_number <= 10)`.
- **`ScoringPage` ist riesig** (~1970 Zeilen). Refactoring überlegt aber bisher nicht angegangen — bei größeren Änderungen extracting Custom-Hooks/Sub-Components vorschlagen.

## E2E Tests — IMMER bei Feature-Änderung laufen

**Bei JEDER Änderung am Live-Scoring** (ScoringPage, GameScoringService, useScoring, CorrectionSheet, DiamondView, Inning-Advance, Undo, Stealing, Substitution, Reset, Walkoff):

```bash
docker compose up -d db
cd frontend && npm run test:e2e
```

**77 Playwright-Tests (2 skipped)** decken:
- AB-Recording alle 9 Result-Typen × empty/loaded
- Stealing (STOLEN_BASE / CAUGHT_STEALING / Out-Counter)
- Substitution (Sub-Sheet + currentBatter-Rotation + Persistenz)
- Inning-Advance (Event-Persist + Bug #3 Score-Drift-Regression)
- Undo alle 4 Action-Typen + Toast + Orphan-Cleanup
- Reset (alle State-Layer inkl. Substitutions)
- Walkoff (Banner + Undo-Cleanup)
- Multi-Inning-Scenario (Cross-Operation State-Konsistenz)
- Undo across Inning-Boundary

**Runtime ~2min.** CI läuft automatisch auf push zu master (`.github/workflows/ci.yml`), lokal vorher zur Round-Trip-Vermeidung.

**Refactor-Risk:** Live-Scoring hat viele kreuz-koppelnde Concerns. Die E2E-Suite ist das Safety-Net. Wenn Tests rot werden — **investigate before deploy**.
