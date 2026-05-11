# Legacy Live-Scoring (ScoringPage): Generic Last-Action Undo

**Datum:** 2026-05-11
**Scope:** `GameScoringService` — Backend-only (Endpoint + Service-Methode)
**Route betroffen:** `/gameday/:id/scoring/:gameIndex` (legacy `ScoringPage`)
**Spielbogen:** nicht betroffen (eigener Pfad).

## Problem

User berichtet:
1. "Scoring wurde nicht richtig mitgezählt" — Score-Anzeige im Scoreboard inkonsistent nach mehreren ABs + Correction + Undo.
2. "Rückgängig-Button war auch nicht so richtig" — Undo entfernt nicht alle Effekte der letzten Aktion. Stealing-only Aktionen lassen sich gar nicht undoen.

Undo soll die **letzte User-Aktion** zurücknehmen — egal ob AB, Stealing oder Substitution.

## Aktions-Inventar

Welche User-Aktionen mutieren scoring-relevanten Zustand?

| # | Aktion | API | DB-Effekt |
|---|---|---|---|
| 1 | TREFFER / STRIKEOUT / AUS / ROE / Walk / HBP / HR | `recordAtBat` | append `AtBat` |
| 2 | Stealing (SB / CS / WP / PB / OUT_ON_PLAY) | `recordStealingEvent` | append `BaseRunningEvent` |
| 3 | Korrektur-Sheet (Runner-Cycle + Force-Out) | `updateLastBaseState` + ggf. `recordStealingEvent` | mutiert letzten `AtBat` **in-place** + appendet OUT_ON_PLAY |
| 4 | Overthrow | `updateLastBaseState` | mutiert letzten `AtBat` in-place |
| 5 | Substitution | `addSubstitution` | append `Substitution` |
| 6 | Score-Manual-Edit (Gegner-Score) | `setGameScore` | mutiert `game.scoreUs/scoreThem` |

Append-only (1, 2, 5) lassen sich exakt undoen via Row-Delete. In-place (3, 4, 6) haben keine History → nicht direkt undobar.

## Root Cause (Status quo)

`GameScoringService.undoLastAtBat` (backend `application/GameScoringService.java:87`) löscht ausschließlich den letzten `AtBat`. Daraus folgen:

### Bug A — Orphan Stealing-Events
Stealings nach dem letzten AB bleiben in der DB. `getScoreboard` (line 182-227) foldet alle Stealings mit `createdAt >= last.createdAt` in BaseState + Score. Nach Undo zeigt `last` auf den vorigen AB → orphan Stealings vom gelöschten AB werden weiterhin gefoldet → Score zu hoch, Phantom-Runner.

### Bug B — Geister-Outs aus Correction-Sheet
`CorrectionSheet.onSave` (frontend `components/scoring/ScoringPage.tsx:931-938`) persistiert pro Runner-Out **ein** `OUT_ON_PLAY` Stealing-Event. `getScoreboard.runnerOuts` (line 167-171) zählt sie in `outsInCurrentInning`. Undo des AB lässt diese stehen → Geister-Outs im Inning.

### Bug C — Stealing-only Aktionen nicht undobar
Wenn User SB/CS/WP/PB ohne folgenden AB tappt, gibt es keinen Pfad zum Zurücknehmen. Toast "Letzte Aktion rückgängig gemacht" lügt.

### Bug D — Substitutions nicht undobar
Versehentliche Substitution lässt sich nicht rückgängig machen — User muss manuell Sub-Liste editieren.

## Lösung — Approach A (Pragmatic Last-Event-By-Timestamp)

Neuer Endpoint `POST /api/games/{gameId}/scoring/undo` (oder erweitere bestehenden — siehe "Migration").

Service-Methode `GameScoringService.undoLastAction(Long gameId)`:

```
1. Lade gameId. Falls nicht existiert → ResourceNotFoundException.

2. Ermittle jüngste Aktion pro Typ (alle nullable):
   newestAB        = atBatRepository.findLastByGameId(gameId)
                     .map(AtBat::getCreatedAt).orElse(null)
   newestStealing  = stealingRepository.findByGameIdOrderByIdAsc(gameId)
                     .stream().map(BaseRunningEvent::getCreatedAt)
                     .filter(Objects::nonNull).max(Instant::compareTo).orElse(null)
   newestSub       = substitutionRepository.findByGameId(gameId)
                     .stream().map(Substitution::getCreatedAt)
                     .filter(Objects::nonNull).max(Instant::compareTo).orElse(null)

3. Falls alle null → return UndoResult.NOTHING_TO_UNDO (oder no-op).

4. Wähle den jüngsten Timestamp; dispatch:

   a) AB ist jüngster:
      - cutoff = max(AB.createdAt) der priorABs (alle außer last) oder EPOCH.
      - Lösche alle Stealings mit createdAt > cutoff (orphan + Correction-OUT_ON_PLAY).
      - Lösche last AB.
      - Logger INFO: "Undo AB id=X, stealingsRemoved=N"

   b) Stealing ist jüngster:
      - Finde Stealing mit max(createdAt).
      - Lösche per ID.
      - Logger INFO: "Undo Stealing id=X"

   c) Substitution ist jüngster:
      - Finde Sub mit max(createdAt).
      - Lösche per ID.
      - Logger INFO: "Undo Sub id=X"

5. Return UndoResult{ type: "AT_BAT"|"STEALING"|"SUBSTITUTION"|"NONE", removedId }.
```

Score-Rollback nicht nötig: `scoreUs` wird in `getScoreboard` jeden Call neu aus AB-Liste + Stealing-Fold berechnet. Nach Delete recomputed automatisch.

### Voraussetzung — `createdAt` auf Substitution

`Substitution` braucht zwingend ein `createdAt`-Feld (oder ein anderes monotones Ordering). Falls bereits vorhanden → ok. Falls nicht → Flyway-Migration:

```sql
ALTER TABLE substitution ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
UPDATE substitution SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE substitution ALTER COLUMN created_at SET NOT NULL;
```

Java: `Substitution.createdAt` mit `@PrePersist` setzen. **Vor Implementation prüfen**.

### Migration des Frontend

`frontend/src/hooks/useScoring.ts`:
- `undo` Callback ruft neuen Endpoint `POST /api/games/{id}/scoring/undo` statt `undoLastAtBat`.
- Type für Return: `UndoResult { type: 'AT_BAT' | 'STEALING' | 'SUBSTITUTION' | 'NONE', removedId: number | null }`.

`frontend/src/components/scoring/ScoringPage.tsx`:
- `handleUndo`-Button: enabled wenn **mindestens eine** Aktion existiert (`atBats.length > 0 || stealingEvents.length > 0 || substitutions.length > 0`), nicht nur `atBats.length > 0`.
- Toast-Text adaptiv basierend auf `UndoResult.type`:
  - `AT_BAT` → "Letzter At-Bat rückgängig gemacht"
  - `STEALING` → "Letztes Stealing-Event rückgängig gemacht"
  - `SUBSTITUTION` → "Letzte Substitution rückgängig gemacht"
  - `NONE` → "Nichts zum Rückgängigmachen"

Alter Endpoint `POST /api/games/{id}/scoring/undo-last-atbat` bleibt zunächst bestehen (Backward-Compat), wird aber von neuem Endpoint genutzt. Nach Frontend-Migration kann er entfernt werden — separater Cleanup-Spec.

## Trade-offs

| Aktion | Direkt undobar mit A? |
|---|---|
| AB (1) | ✅ + orphan Stealings + Korrektur-OUT_ON_PLAY |
| Stealing (2) | ✅ (wenn jünger als letzter AB) |
| Korrektur (3) | ⚠️ indirekt — Undo löscht **AB komplett** (User verliert Korrektur + AB) |
| Overthrow (4) | ⚠️ indirekt — wie Korrektur |
| Substitution (5) | ✅ |
| Score-Manual-Edit (6) | ❌ — separater Reset-Button bestehend |

Korrektur/Overthrow undobar nur durch AB-Komplett-Delete. Akzeptabel weil: User cycled fast immer Korrektur direkt nach AB. Fehler → ein Undo wirft beides, neu eingeben.

## Tests

Backend-Tests in `GameScoringServiceTest` (oder `LiveScoringIntegrationTest`):

```
1. undo_lastABIsNewest_deletesABAndOrphanStealings
   Setup: AB1, AB2, dann STOLEN_BASE
   Act: undoLastAction
   Assert: result.type=AT_BAT, AB-Liste=[AB1], Stealings leer

2. undo_lastABIsNewest_deletesCorrectionOutEvents
   Setup: AB1, AB2 + 2× OUT_ON_PLAY (Correction-Outs nach AB2)
   Act: undoLastAction
   Assert: result.type=AT_BAT, AB-Liste=[AB1], Stealings leer

3. undo_stealingIsNewest_deletesOnlyStealing
   Setup: AB1, dann STOLEN_BASE (Stealing createdAt > AB1.createdAt)
   Act: undoLastAction
   Assert: result.type=STEALING, AB-Liste=[AB1], Stealings leer

4. undo_substitutionIsNewest_deletesOnlySub
   Setup: AB1, dann Substitution
   Act: undoLastAction
   Assert: result.type=SUBSTITUTION, AB-Liste=[AB1], Subs leer

5. undo_keepsStealingsBeforeLastAB
   Setup: AB1, STOLEN_BASE, AB2 (AB2 ist jüngster)
   Act: undoLastAction
   Assert: result.type=AT_BAT, AB-Liste=[AB1], Stealings=[STOLEN_BASE]
           (STOLEN_BASE bleibt — gehört chronologisch zu AB1!)

6. undo_emptyGame_returnsNone
   Setup: keine ABs, Stealings, Subs
   Act: undoLastAction
   Assert: result.type=NONE, kein Throw

7. undo_singleABNoOthers_deletesAB
   Setup: AB1 only
   Act: undoLastAction
   Assert: result.type=AT_BAT, AB-Liste leer

8. undo_singleStealingNoAB_deletesStealing
   Setup: keine ABs, ein STOLEN_BASE
   Act: undoLastAction
   Assert: result.type=STEALING, Stealings leer

9. undo_chronologyTieBreaker
   Edge: AB.createdAt == Stealing.createdAt (sehr unwahrscheinlich, aber test)
   Verhalten: AB hat Vorrang (deterministisch via if-else-order in dispatch).
```

## Frontend-Verifikation (manuell)

```
1. Lineup + Game.
2. AB1 = SINGLE → Runner 1B.
3. STOLEN_BASE 1B-Runner → 2B.
4. AB2 = OUT mit Force-Out via Correction → AB2-runsScored mutiert + 1× OUT_ON_PLAY.
5. Substitution X→Y.
6. AB3 = DOUBLE → Runner scort.

Erwartete Werte: scoreUs=1, outs=2, BaseState=(null, Batter, null), Subs=[X→Y].

Undo 1: löscht AB3 + dessen orphan Stealings (keine) → scoreUs=0, outs=2, BaseState=(null, Runner-vom-Steal, null).
Undo 2: jüngstes ist Sub (Sub createdAt > AB2.createdAt) → Sub weg.
Undo 3: jüngstes ist AB2 (mit OUT_ON_PLAY orphan) → AB2 + OUT_ON_PLAY weg. State zurück: scoreUs=0, outs=0, Runner auf 2B (vom Steal).
Undo 4: jüngstes ist STOLEN_BASE → Runner zurück auf 1B.
Undo 5: jüngstes ist AB1 → AB-Liste leer.
Undo 6: nothing-to-undo Toast.
```

## API-Surface

### Neuer Endpoint
```
POST /api/games/{gameId}/scoring/undo
Response 200: { "type": "AT_BAT" | "STEALING" | "SUBSTITUTION" | "NONE",
                "removedId": number | null }
Response 404: Game nicht gefunden.
```

### Bestehender Endpoint
`POST /api/games/{gameId}/scoring/undo-last-atbat` bleibt zunächst — internal delegate auf `undoLastAction` mit Filter "nur wenn AT_BAT", oder ungenutzt. Cleanup-Decision separater Spec.

## Dateien

**Geändert:**
- `backend/src/main/java/com/softball/application/GameScoringService.java`
  - Neue Methode `undoLastAction(Long gameId): UndoResult`.
  - `undoLastAtBat` evtl. deprecated (durch neue Methode abgedeckt).
- `backend/src/main/java/com/softball/adapter/in/web/ScoringController.java`
  - Neuer Endpoint `POST /scoring/undo`.
- `backend/src/main/java/com/softball/adapter/dto/UndoResultResponse.java` — neuer Record.
- `frontend/src/api/client.ts` — neue Funktion `undoLastAction(gameId)`.
- `frontend/src/hooks/useScoring.ts` — `undo` ruft neuen Endpoint, gibt `UndoResult` zurück.
- `frontend/src/components/scoring/ScoringPage.tsx` — `handleUndo` Toast-Text adaptiv, Disable-Condition erweitert.
- `frontend/src/types/index.ts` — `UndoResult`-Type.

**Tests (neu/erweitert):**
- `backend/src/test/java/com/softball/application/GameScoringServiceTest.java` — 9 Cases (siehe oben).

**Bedingt (vor Implementation prüfen):**
- `domain/model/Substitution.java` — `createdAt`-Feld.
- `adapter/out/persistence/entity/SubstitutionEntity.java` — Mapping.
- `db/migration/V{n}__substitution_created_at.sql` — falls Feld fehlt.

## Out of Scope

- Score-Manual-Edit (6) Undo — separater Reset-Button bestehend.
- Korrektur/Overthrow als eigene undobare Aktion (Approach C/Snapshot) — bei Bedarf separater Spec.
- Spielbogen — schon korrekt.
- ScoringPage-Refactor (2033 Zeilen) — Out of Scope.
