# Legacy Live-Scoring: Inning-Advance als persistiertes Event

**Datum:** 2026-05-11
**Scope:** Backend + Frontend, neue Entity + Migration + Undo-Erweiterung
**Route betroffen:** `/gameday/:id/scoring/:gameIndex` (legacy `ScoringPage`)

## Problem

Der "Nächstes Inning"-Workflow im legacy Live-Scoring hat zwei zusammenhängende Bugs:

### A1 — Inning-Regression bei Undo
`inningOverride` ist transient Frontend-State (`useState<number | null>`). Nach Inning-Advance-Klick wird Override auf N+1 gesetzt, sobald erster AB im neuen Inning recorded ist (`serverInning >= inningOverride`) → useEffect resettet Override. Wenn User danach den AB undoed, fällt `serverInning` zurück auf N → displayInning zeigt wieder N, obwohl Inning-Advance intent war.

### A2 — Score-Drift bei Undo (Critical)
`handleNextInning` schreibt Gegner-Runs direkt in `game.scoreThem` via `setGameScore(scoreUs, scoreThem + opponentRunsThisInning)`. Beim Undo des AB im neuen Inning werden die addierten Gegner-Runs **nicht** rückgängig gemacht → permanenter Score-Drift.

## Lösung (Approach A — Event-Source Inning-Advances)

Inning-Advance wird ein persistiertes Event mit Created-At-Timestamp. `undoLastAction` erweitert um Event als 4. Action-Typ. Event speichert sowohl Inning-Übergang als auch addierte Gegner-Runs, sodass Undo beides revertet.

## Data Model

### Neue Entity `InningAdvanceEvent`

```
inning_advance_events:
  id              BIGINT PRIMARY KEY
  game_id         BIGINT NOT NULL (FK games)
  to_inning       INT NOT NULL CHECK (to_inning >= 2)
  opponent_runs   INT NOT NULL DEFAULT 0 CHECK (opponent_runs >= 0)
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  created_by      VARCHAR(64) NOT NULL DEFAULT 'unknown'
```

**Semantik:** Ein Event repräsentiert den Übergang in `to_inning` (neue Inning-Nummer). `opponent_runs` ist die in vorherigem Inning eingegebene Gegner-Run-Anzahl.

### Game-Feld

Kein neues Feld auf `Game`. `currentInning` wird weiterhin live berechnet:

```
currentInning = max(
  last AtBat.inning ODER 1,
  max(InningAdvanceEvent.toInning) ODER 1
)
```

So bleibt Backend-Logik einfach + AB-driven für die meisten Cases.

## API Changes

### Neuer Endpoint
```
POST /api/games/{gameId}/scoring/next-inning
Body: { "opponentRuns": int }   // 0 erlaubt
Response 201: InningAdvanceEventResponse { id, toInning, opponentRuns, createdAt }
```

Backend-Logik:
1. Compute current display inning via existing logic.
2. Validate `opponentRuns >= 0`.
3. Persist `InningAdvanceEvent(gameId, toInning = current+1, opponentRuns)`.
4. Update `game.scoreThem += opponentRuns`. Save game.
5. Return event response.

### Bestehender Endpoint `POST /scoring/undo` erweitert

`undoLastAction` bekommt 4. Action-Typ. Logik:
1. Aktuelle 3 Action-Typen (AB / Stealing / Sub) wie bisher.
2. Zusätzlich: `newestEvent = max(InningAdvanceEvent.createdAt)`.
3. Wenn `newestEvent` jüngster überhaupt:
   - Lade Event.
   - `game.scoreThem -= event.opponentRuns` (clamp >= 0).
   - Delete Event.
   - Save game.
   - Return `UndoResult{type: INNING_ADVANCE, removedId: event.id}`.

`UndoResultResponse.UndoType` Enum erweitert: `AT_BAT, STEALING, SUBSTITUTION, INNING_ADVANCE, NONE`.

## Backend Changes

### Neue Files
- `domain/model/InningAdvanceEvent.java` — Domain model.
- `domain/port/out/InningAdvanceEventRepository.java` — Port.
- `adapter/out/persistence/entity/InningAdvanceEventEntity.java` — JPA entity.
- `adapter/out/persistence/mapper/InningAdvanceEventMapper.java` — Mapper.
- `adapter/out/persistence/repository/SpringInningAdvanceEventRepository.java` — Spring-Repo.
- `adapter/out/persistence/adapter/InningAdvanceEventRepositoryAdapter.java` — Port-Implementation.
- `adapter/dto/InningAdvanceEventResponse.java` — Response DTO.
- `adapter/dto/NextInningRequest.java` — Request DTO (mit `opponentRuns: int`).
- `db/migration/V30__create_inning_advance_events.sql` — Migration.

### Geänderte Files
- `application/GameScoringService.java`:
  - Neue Methode `advanceInning(Long gameId, int opponentRuns): InningAdvanceEventResponse`.
  - `undoLastAction` erweitert um Event-Branch.
  - `getScoreboard.currentInning` aktualisiert: `max(lastAB.inning, lastEvent.toInning, 1)`.
- `adapter/in/web/ScoringController.java`:
  - Neuer Endpoint `POST /scoring/next-inning`.
- `adapter/dto/UndoResultResponse.java`:
  - `UndoType` Enum: `INNING_ADVANCE` ergänzen.
  - Static factory `inningAdvance(Long id)`.

## Frontend Changes

### `frontend/src/types/index.ts`
- Erweitern: `UndoResultType` um `'INNING_ADVANCE'`.
- Neuer Type: `InningAdvanceEventResponse { id: number; toInning: number; opponentRuns: number; createdAt: string }`.

### `frontend/src/api/client.ts`
Neue Funktion:
```typescript
export const advanceInning = (gameId: number, opponentRuns: number) =>
  request<InningAdvanceEventResponse>(`/games/${gameId}/scoring/next-inning`, {
    method: 'POST',
    body: JSON.stringify({ opponentRuns }),
  })
```

### `frontend/src/components/scoring/ScoringPage.tsx`
- `handleNextInning` umgebaut:
  - Statt `api.setGameScore(...) + setInningOverride(displayInning+1)`:
    - Parse `opponentRunsThisInning` → number (default 0).
    - Call `api.advanceInning(gameId, runs)`.
    - `reload()` — backend `getScoreboard.currentInning` reflektiert neue Inning-Nummer.
  - `inningOverride`-State entfernen (nicht mehr nötig).
  - `displayInning = scoreboard.currentInning` direkt.
  - `inningTransition` Logik überflüssig (keine Override-Phase mehr). Display-Outs/Runners direkt aus scoreboard.

- `handleUndo`-Toast erweitert um `'INNING_ADVANCE'` → "Letzter Inning-Wechsel rückgängig gemacht".

- `useScoring`-Hook: keine Änderung (undo ruft schon `undoLastAction`).

## Migration Strategy

Bestehende `game.scoreThem` ist authoritative für historische Spiele (lump sum aller Gegner-Runs). Migration V30 erstellt nur die neue Tabelle, **keine Daten-Migration** für scoreThem. Existierende Games haben keine Events; ihre scoreThem bleibt erhalten.

Neue Games (post-migration): scoreThem-Updates kommen aus zwei Quellen:
- Manueller Score-Edit (Gegner-Score-Button) — direkt `setGameScore` (unverändert).
- Inning-Advance mit opponentRuns > 0 — über neuen Endpoint.

`game.scoreThem` bleibt single source of truth für Anzeige. Events sind reine Audit/Undo-Log.

## Tests

Backend `GameScoringServiceTest`:
1. `advanceInning_creates_event_and_updates_scoreThem`
2. `advanceInning_with_zero_runs_does_not_change_scoreThem`
3. `undoLastAction_inningAdvanceIsNewest_revertsScoreAndDeletesEvent`
4. `undoLastAction_inningAdvanceIsNewest_butStealingLater_doesNothing` (Stealing wins)
5. `undoLastAction_multipleInningAdvances_undosLastOnly`
6. `getScoreboard_currentInning_reflectsLastEvent` (advance to inning 3 ohne AB → currentInning=3)

Frontend manueller Smoke-Test:
1. AB 3 Outs in Inning 1 → Pille zeigen.
2. Gegner-Runs "2" eingeben + "Nächstes Inning" → scoreThem +2, currentInning=2.
3. AB in Inning 2 → currentInning bleibt 2.
4. Undo → AB weg, currentInning bleibt 2 (Event noch da).
5. Undo → Event weg, scoreThem -2, currentInning=1.
6. Undo → AB-Liste weiter abbauen.

## Out of Scope

- Manueller Score-Edit (Gegner-Score-Button) bleibt direkt-`setGameScore` ohne Event-Tracking. Begründung: User-Korrekturen sind explizit, kein Inning-Bezug. Undo via Manual-Reset.
- Walkoff/Mercy-Rule (Bug #7) — separate Feature.
- Eigene-Score-Anzeige bleibt readonly (Commit `cb753e5`).

## Commit-Plan

1. `📝 Spec: Inning-Advance als persistiertes Event` (dieser Doc).
2. `✨ Migration V30: inning_advance_events Tabelle`.
3. `✨ InningAdvanceEvent Domain + Entity + Mapper + Repository (Port + Adapter)`.
4. `✨ DTO: InningAdvanceEventResponse + NextInningRequest, UndoType.INNING_ADVANCE`.
5. `✨ GameScoringService.advanceInning + getScoreboard currentInning aus Event`.
6. `✨ undoLastAction: INNING_ADVANCE-Branch + Score-Revert`.
7. `✨ ScoringController: POST /scoring/next-inning Endpoint`.
8. `✨ Types + API-Client: advanceInning + InningAdvanceEvent + UndoResultType erweitert`.
9. `🔧 ScoringPage: handleNextInning ruft Backend-Endpoint, inningOverride entfernt, Toast erweitert`.

Tests jeweils im selben Commit wo Service-Logik geändert wird (5, 6).
