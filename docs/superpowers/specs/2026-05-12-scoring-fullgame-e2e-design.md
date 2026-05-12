# Live-Scoring: Full-Game-Playthrough E2E

**Datum:** 2026-05-12
**Scope:** 1 neue E2E-Spec mit 2 langen Scenario-Tests die ein komplettes Spiel durchspielen.

## Problem

Einzelne E2E-Suiten (atbats, stealing, sub, undo, inning-advance, reset, walkoff) decken isolierte Operationen ab. **Keine** Suite verifiziert ein komplettes Spiel von Inning 1 bis Game-End mit gemischten Events + Undo-Pfaden + State-Konsistenz über mehrere Innings.

Risk: Sequenz-Bugs (z.B. nach 3. Inning crash, currentInning-Drift nach Undo-Sequence, Sub-Cascade über Innings) bleiben unentdeckt.

## Lösung

Neue Spec `scoring-fullgame.spec.ts` mit 2 langen Scenario-Tests:

### Test 1: Full 7-Inning-Game ohne Undo (Happy Path)

Spielt 7 komplette Innings (top+bottom) durch via UI:
- Inning 1 top: 3 unsere ABs (SINGLE, OUT, OUT, OUT → 3 outs)
- Advance mit opp-Runs=1
- Inning 2 top: HOMERUN bases-loaded (Grand Slam via vorher 3 Walks für Bases-Loaded? oder via API seed) → simpler: 1 AB Walk + 2 OUTs+OUT
- Advance mit opp-Runs=0
- Inning 3-7: vereinfachte Patterns (jeweils 3 OUTs + opp-Runs)
- Letzter Out im Inning 7 → gameOver=true (regulation-over wenn nicht tied) ODER manuell Beenden

Assertions: scoreUs am Ende = sum aller AB-Runs, scoreThem = sum aller opp-runs, currentInning=7, banner sichtbar.

### Test 2: Mid-Game Mixed-Events + Undo-Sequenz

Realistischer "schief gelaufen"-Path:
- Inning 1: AB1 SINGLE, AB2 stealing-base, AB3 DOUBLE → Runner scort, AB4 OUT, AB5 OUT, AB6 OUT
- Advance Inning 2 opp=1
- Inning 2: AB1 SINGLE, Sub Spieler → Bench, AB2 (sub) HOMERUN bases-loaded ??? bench-batter recorded as batter via lineup-rotation
- Realisitscher: Sub Spieler1, AB2 (sub batter) WALK, AB3 OUT, AB4 OUT, AB5 OUT
- Inning 3: 3 OUTs
- Inning 4: 1 SINGLE + 2 OUTs + Undo (löscht 2. OUT), 2 OUTs

Verifiziert: 
- Sub persistiert über mehrere Innings
- Undo mitten in Inning 4 löscht korrekt
- currentBatter rotates korrekt nach Undo
- Backend-Snapshot am Ende konsistent

Assertions schrittweise + final-state-check.

## Realisierung

**Helper-Wiederverwendung:** Alle existierenden Helper (`recordHitViaUI`, `recordDirectViaUI`, `advanceInningViaUI`, `recordStealingViaUI`, `recordSubstitutionViaUI`, `clickUndo`) sind ausreichend. Keine neuen Helper nötig.

**Performance:** 2 Tests × ~40 UI-Aktionen × ~1s = ~80s pro Test = ~3min gesamt. Akzeptabel als Smoke-Layer.

**Robustheit:** Lange Sequenzen sind flaky-prone. `actionTimeout` in playwright.config.ts ist 10s, sollte ausreichen. Falls flaky → einzelne waitForTimeout-Calls erhöhen.

## Out of Scope

- Multi-Game-Sequenzen (mehrere Games hintereinander)
- Spielbogen-Pfad
- Backup/Restore-Pfade

## Files

**Neu:**
- `frontend/e2e/scoring/scoring-fullgame.spec.ts`
