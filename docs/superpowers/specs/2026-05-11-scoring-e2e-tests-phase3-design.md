# Live-Scoring E2E Tests — Phase 3

**Datum:** 2026-05-11
**Scope:** 4 weitere Test-Suiten (Undo, Inning-Advance, Stealing, Substitution).
**Voraussetzung:** Phase 1+2 (`2026-05-11-scoring-e2e-tests-phase1-design.md`) ist gemerged.

## Problem

Phase 1+2 deckt nur AB-Recording ab. Recent Bug-Fixes (Generic Undo, Inning-Advance-Event, Force-Out 3rd-Out, In-Place Exit-Animation, Stealing-Validation) sind ungetestet. Regressionsrisiko bei jeder Service-Änderung.

## Lösung

4 neue Test-Files, gleiches Pattern wie Phase 1+2 (shared Test-GameDay, beforeEach reset, fixture-driven).

### `scoring-undo.spec.ts`

Testet generic `undoLastAction`:

| Test | Setup | Action | Assertion |
|---|---|---|---|
| `undo_emptyState_buttonDisabled` | leer | — | Rückgängig disabled |
| `undo_singleAB_deletesAB_clearsState` | 1 AB | Undo | scoreboard leer, AB-Liste leer |
| `undo_AB_alsoDeletesOrphanStealings` | AB1+AB2+STEAL-zwischen | Undo | AB1 bleibt, Stealing weg (cutoff-orphan) |
| `undo_stealingNewer_deletesOnlyStealing` | AB1, später STEAL | Undo | AB1 bleibt, Stealing weg |
| `undo_subNewer_deletesOnlySub` | AB1, später Sub | Undo (via UI Substitution-Sheet) | AB bleibt, Sub weg |
| `undo_inningAdvanceNewest_revertsScoreAndEvent` | AB inning1, NextInning(opp=2), AB inning2 | Undo (deletes AB inning2), Undo (reverts InningAdvance) | scoreThem zurück 0, currentInning=1 |
| `undo_toastAdaptive_AT_BAT` | 1 AB | Undo | Toast "Letzter At-Bat rückgängig gemacht" |
| `undo_toastAdaptive_STEALING` | 1 Stealing only | Undo | Toast "Letztes Stealing-Event ..." |
| `undo_toastAdaptive_INNING_ADVANCE` | InningAdvance | Undo | Toast "Letzter Inning-Wechsel ..." |

9 Tests. Plus visual-check via screenshot bei Bedarf.

### `scoring-inning-advance.spec.ts`

Testet `advanceInning` Backend-Event:

| Test | Action | Assertion |
|---|---|---|
| `advance_zeroOpponentRuns_noScoreChange` | 3 Outs → NextInning(0) | scoreThem=0, currentInning=2 |
| `advance_withOpponentRuns_addsToScoreThem` | NextInning(3) | scoreThem=3, currentInning=2 |
| `advance_multipleInnings_currentInningCorrect` | NextInning×3 | currentInning=4 |
| `advance_persistsAcrossReload` | NextInning(2), reload | currentInning=2, scoreThem=2 |
| `bug3_regression_undoAfterAdvanceRevertsScore` | NextInning(3), AB inning2, Undo×2 | scoreThem=0 (kein Drift), inning=1 |

5 Tests. Letzter Test = Bug #3-Regression-Schutz.

### `scoring-stealing.spec.ts`

| Test | Setup | Action | Assertion |
|---|---|---|---|
| `stolen_base_1B_to_2B` | 1B-Runner | Tap Runner → STOLEN | baseState=(null, runner, null) |
| `stolen_base_3B_to_home_scores` | 3B-Runner | Tap Runner → STOLEN | scoreUs=1, 3B leer |
| `caught_stealing_increments_outs` | 1B-Runner | Tap Runner → CAUGHT | outs=1, 1B leer |
| `wp_pb_runner_moves` | 1B-Runner | seeded WILD_PITCH via API | baseState=(null, runner, null) |

4 Tests.

### `scoring-substitution.spec.ts`

| Test | Setup | Action | Assertion |
|---|---|---|---|
| `sub_inLineup_changesCurrentBatter` | empty | Open Sub-Sheet, Out=Khang In=Bench-Player | currentBatterName changes (next AB shows substitute) |
| `sub_persistsAcrossReload` | 1 Sub | reload | Sub bleibt |
| `sub_undo_removesSub` | 1 Sub | Undo | Sub weg |

3 Tests.

**Gesamt: 21 neue Tests.**

## Implementierungs-Notes

- **UI-Driver:** Nutze Buttons aus ScoringPage. Für Substitution-Sheet + Stealing-Pill brauchen neue Helper.
- **Helpers erweitern:**
  - `recordStealingViaUI(page, runnerName, type)` — klickt Runner auf Diamond, dann STOLEN/CAUGHT.
  - `advanceInningViaUI(page, opponentRuns)` — wartet auf `halfInningOver`-State, eingibt opp-Runs, klickt Nächstes Inning.
  - `recordSubstitutionViaUI(page, playerOutName, playerInName)` — öffnet Sub-Sheet, wählt out + in, confirm.
  - `clickUndo(page): Promise<UndoResultType>` — klickt Undo, returnt aus Toast den Type.
- **Toast-Capture:** Toast erscheint nach Undo. Per `page.getByText('Letzter ...')` matchen.
- **Substitution-Bench-Player:** ensureTestGame hat 9-Spieler-Lineup. Brauchen einen Bench-Player → erweitere setup um 1 extra Player außerhalb lineup. ODER seed via API.
- **Stealing-UI:** Auf Diamond Runner-Circle klicken öffnet Sheet. `data-testid` auf Runner? Wenn nicht: per `role="button"` + Spielername. Falls keine Accessibility-Labels → ergänze sie in der Komponente (kleiner Side-Fix).

## File Structure

**Neu:**
- `frontend/e2e/scoring/scoring-undo.spec.ts`
- `frontend/e2e/scoring/scoring-inning-advance.spec.ts`
- `frontend/e2e/scoring/scoring-stealing.spec.ts`
- `frontend/e2e/scoring/scoring-substitution.spec.ts`

**Geändert:**
- `frontend/e2e/helpers/fixtures.ts` (neue UI-Helper)
- `frontend/e2e/helpers/api.ts` (eventuell: getStealingEvents, getSubstitutions, recordSubstitutionApi für Setup)
- evtl. `frontend/src/components/scoring/*.tsx` (a11y-Labels falls fehlend für Runner/Sheet-Buttons)

## Out of Scope (Phase 4+)

- Reset-Suite (kann einfach in undo.spec ergänzt werden falls nötig)
- Game-End / Walkoff (Feature-Gap, Bug #7, nicht implementiert)
- Visual-Regression (screenshot-diff)
- CI Pipeline

## Risk

- Substitution-UI ist mehrschrittig (Sheet öffnen + 2× Player auswählen + confirm). Selector-stabilität wichtig. Falls UI fragil → spec könnte Substitution via API setzen + UI nur Display testen.
- Stealing-Runner-Click hängt von Diamond-SVG ab. Falls keine clickbare Region oder Accessibility-Names → kleines UI-Fix (Side-Patch) Teil dieses Specs.
- Inning-Advance erfordert 3-Out-State zum Aktivieren der Pille. Pille selbst rendert conditional auf `halfInningOver`. Tests müssen 3 Outs erst recorden ODER via API seeden mit 3 OUT-ABs.

## Tests-Run

Total ~21 Tests × ~2s = ~45s, plus webServer-Wiederverwendung. Bei kalt-Start +1-2min Backend.
