# Legacy Live-Scoring (ScoringPage): Undo + Score-Count Fix

**Datum:** 2026-05-11
**Scope:** `GameScoringService.undoLastAtBat` — Backend-only
**Route betroffen:** `/gameday/:id/scoring/:gameIndex` (legacy `ScoringPage`)
**Spielbogen:** nicht betroffen (eigener `SpielbogenScoringService.undoLast` mit korrekter Logik seit commit `ca7303b`)

## Problem

User berichtet:
1. "Scoring wurde nicht richtig mitgezählt" — Score-Anzeige im Scoreboard inkonsistent nach mehreren ABs + Correction + Undo.
2. "Rückgängig-Button war auch nicht so richtig" — Undo entfernt nicht alle Effekte der letzten Aktion.

## Root Cause

### Bug A — Orphan Stealing-Events
`GameScoringService.undoLastAtBat` (backend `application/GameScoringService.java:87`) löscht ausschließlich den letzten `AtBat`. `BaseRunningEvent`-Datensätze (Types: `STOLEN_BASE`, `CAUGHT_STEALING`, `OUT_ON_PLAY`, `WILD_PITCH`, `PASSED_BALL`), die nach diesem AB erzeugt wurden, bleiben in der Datenbank.

`GameScoringService.getScoreboard` (line 182-227) foldet **alle** Stealings mit `createdAt >= last.createdAt` in BaseState + Score. Nach Undo zeigt `last` auf den vorigen AB, dessen `createdAt` älter ist als die orphan Stealings → diese werden weiterhin gefoldet.

Effekte:
- Score bleibt zu hoch, falls ein orphan `STOLEN_BASE` einen Runner auf Home cascadet hat.
- BaseState zeigt Phantom-Runner (gestohlene Base bleibt belegt).

### Bug B — Geister-Outs aus Correction-Sheet
`CorrectionSheet.onSave` (frontend `components/scoring/ScoringPage.tsx:931-938`) persistiert pro Runner-Out **ein** `OUT_ON_PLAY` Stealing-Event:

```typescript
for (const runnerId of outsFromRunners) {
  await api.recordStealingEvent(currentGame.id, {
    runnerId,
    type: outEventType, // 'OUT_ON_PLAY' bei post-out, 'CAUGHT_STEALING' bei manual
    inning: currentInning,
  })
}
```

`getScoreboard.runnerOuts` (line 167-171) zählt diese in `outsInCurrentInning`. Nach Undo des AB bleiben sie und erhöhen weiterhin den Out-Counter im Inning.

Beispiel-Szenario:
- Runner auf 1B + 2B, Batter OUT, Correction Sheet → 1B-Runner Force-Out auf 2B (zusätzliches `OUT_ON_PLAY`).
- Outs in DB: 1 AB-Out + 1 Stealing-OUT_ON_PLAY = 2 Outs.
- Undo → AB weg, OUT_ON_PLAY bleibt → 1 Geister-Out im Inning.

### Bug C — Toast-Wording
`handleUndo` (ScoringPage.tsx:353) zeigt `"Letzte Aktion rückgängig gemacht"`. Stealing-only Aktionen (z.B. ein einzelner `STOLEN_BASE` ohne danach folgenden AB) lassen sich aktuell nicht undoen. **Nicht im Scope dieses Fixes** — wird im "Trade-off"-Abschnitt akzeptiert.

## Lösung (Approach A — Mirror Spielbogen-Pattern)

Erweitere `GameScoringService.undoLastAtBat`:

1. Hole `lastAB` via `atBatRepository.findLastByGameId(gameId)`. Wenn leer → return (no-op).
2. Bestimme `cutoff`:
   - `allABs = atBatRepository.findByGameIdOrderBySequenceAsc(gameId)`
   - `priorABs = allABs.stream().filter(ab -> !ab.getId().equals(lastAB.getId()))`
   - `cutoff = priorABs.map(AtBat::getCreatedAt).filter(Objects::nonNull).max(Instant::compareTo).orElse(Instant.EPOCH)`
3. Hole alle Stealings für das Game, filter `e.getCreatedAt() != null && e.getCreatedAt().isAfter(cutoff)`.
4. Lösche jedes gefilterte Stealing-Event via `stealingRepository.deleteById`.
5. Logger INFO mit Game-ID + AB-ID + Anzahl gelöschter Stealings.
6. Lösche `lastAB` via `atBatRepository.deleteById(lastAB.getId())`.

**Score-Rollback nicht nötig:** `scoreUs` in Legacy wird bei jedem `getScoreboard`-Call neu aus `sum(AtBat.runsScored)` + Stealing-Fold berechnet (line 154). Nach Delete recomputed automatisch. (Spielbogen muss `homeRuns`/`awayRuns` aktiv rollbacken, weil persistiert — Legacy nicht.)

**Side/Inning-Revert nicht nötig:** Legacy hat keinen Auto-Switch im Backend. `currentInning` ergibt sich aus AB-Liste im `getScoreboard`.

## Trade-offs

| | Mirror (gewählt) | Generic last-action | Hybrid mit Stealing-Tile |
|---|---|---|---|
| Bug A | ✅ | ✅ | ✅ |
| Bug B | ✅ | ✅ | ✅ |
| Bug C | ❌ | ✅ | ✅ |
| Blast-Radius | minimal (1 Methode) | mittel (neuer Endpoint, useScoring-Refactor) | groß (UI-Komponenten) |
| Risiko | sehr niedrig (validiert in Spielbogen) | Cascade-Risiken | UI in 2033-Zeilen-Page einfügen |

**Empfehlung Mirror:** Bug C ist randständig (User undoed primär AB-Aktionen). Falls später relevant → separater Spec-Eintrag.

## Tests

Neuer/erweiterter Backend-Test (`GameScoringServiceTest` oder `LiveScoringIntegrationTest` je nach bestehender Struktur):

```
1. undo_deletesLastAtBat_andOrphanStealings
   Setup: AB1 (Game, batter, SINGLE), AB2 (OUT), danach 1× STOLEN_BASE (runner)
   Act:   undoLastAtBat(gameId)
   Assert:
     - atBatRepository.findByGameId hat nur AB1
     - stealingRepository.findByGameId leer

2. undo_deletesCorrectionOutEvents
   Setup: AB1 (DOUBLE, runner auf 1B+2B), AB2 (OUT)
          + 2× OUT_ON_PLAY (Runner-Outs aus Correction)
   Act:   undoLastAtBat(gameId)
   Assert:
     - atBatRepository.findByGameId hat nur AB1
     - stealingRepository.findByGameId leer (OUT_ON_PLAYs entfernt)

3. undo_keepsStealingsBeforeLastAB
   Setup: AB1, STOLEN_BASE (zw. AB1 und AB2), AB2
   Act:   undoLastAtBat(gameId)
   Assert:
     - atBatRepository.findByGameId hat nur AB1
     - stealingRepository.findByGameId hat 1× STOLEN_BASE (bleibt — gehört zu AB1)

4. undo_emptyGame_noop
   Setup: Game ohne ABs
   Act:   undoLastAtBat(gameId)
   Assert: kein Throw, keine State-Änderung

5. undo_singleAtBat_deletesAllStealings
   Setup: AB1, danach 2× STOLEN_BASE
   Act:   undoLastAtBat(gameId)
   Assert:
     - atBatRepository leer
     - stealingRepository leer (cutoff = EPOCH, beide Stealings gelöscht)
```

Cutoff-Bestimmung explizit getestet via Cases 1, 3, 5.

## Frontend-Verifikation (manuell)

```
1. Lineup erstellen, Game offen.
2. AB1 = SINGLE → Runner auf 1B.
3. STOLEN_BASE für 1B-Runner → Runner auf 2B.
4. AB2 = OUT mit Force-Out via Correction (zusätzlicher Runner-Out).
5. AB3 = DOUBLE → Runner scort.

Erwartete Scoreboard-Werte:
  scoreUs = 1, outsInCurrentInning = 2, BaseState = (null, Batter, null)

Undo (löscht AB3 + Stealings nach AB2):
  scoreUs = 0, outsInCurrentInning = 2, BaseState = (null, Runner, null)
  AB-Liste = [AB1, AB2]

Undo (löscht AB2 + OUT_ON_PLAY-Stealings):
  scoreUs = 0, outsInCurrentInning = 0, BaseState = (null, Runner, null)
  AB-Liste = [AB1], Stealings = [STOLEN_BASE]
  (STOLEN_BASE bleibt — gehört zu AB1!)

Undo (löscht AB1 + STOLEN_BASE):
  AB-Liste leer, Stealings leer, Scoreboard reset.
```

Vor-Test: bestehende Bug reproduzieren MIT bestehender Implementation → User-Reproduktion bestätigen → Fix anwenden → grün.

## Out of Scope

- Bug C (Stealing-only Undo). Falls User später meldet → separater Fix.
- `resetScoring`-Verhalten (löscht ohnehin alles, kein Bug).
- Spielbogen — schon korrekt.
- UI-Änderungen an `ScoringPage.tsx` (2033 Zeilen, kein Refactor in diesem Scope).

## Dateien

**Geändert:**
- `backend/src/main/java/com/softball/application/GameScoringService.java` — `undoLastAtBat` erweitert.

**Neu/Erweitert (Tests):**
- `backend/src/test/java/com/softball/application/GameScoringServiceTest.java` (falls existent erweitern, sonst neu).

**Keine Änderungen:**
- Frontend (`ScoringPage.tsx`, `useScoring.ts`, `CorrectionSheet.tsx`).
- DTOs, Controller, Repository-Interfaces.
