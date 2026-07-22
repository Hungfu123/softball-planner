# Automatisches Aus — Legacy Scoring

**Datum:** 2026-07-22
**Scope:** Legacy `ScoringPage` (nicht Spielbogen)

## Problem

Beim Softball gilt eine Frauen-Mindestquote im Lineup. Fehlt eine Frau (z.B. nur 1 statt
2), bekommt das Team ein **automatisches Aus** zugesprochen. Dieses Aus ist **nicht** dem
gerade schlagenden Batter zugerechnet — es ist ein freies Out, das im aktuellen Inning
mitzählt. Beim 3. Aus endet das Half-Inning wie gewohnt.

Aktuell existiert nur eine **cosmetic** Geste: Tap auf die Outs-Dots oben rechts
(`ScoringPage.tsx:714`) erhöht einen lokalen `extraOuts`-State. Der ist frontend-only, geht
bei Reload verloren, zählt **nicht** in `halfInningOver` und beendet daher kein Inning.

## Ziel

Die bestehende Outs-Dot-Geste zu einem **echten, persistierten, undo-baren** automatischen
Aus umbauen. Backend ist Source-of-Truth (wie beim restlichen Legacy-Scoring).

## Verhalten

- Tap auf die Outs-Dots (oben rechts im Live-State-Strip) → **Confirm-Modal**
  (Projekt-Konvention: Modal statt `confirm()`).
- Bestätigen → `POST /api/games/{gameId}/scoring/automatic-out` → Scoreboard reload.
- Das Auto-Aus zählt in `outsInCurrentInning` des aktuellen Innings.
- Batting-Order rotiert **nicht** (kein Batter zugerechnet, current batter bleibt).
- Bei 3 Aus sperren die Batter-Buttons (`halfInningOver`), der bestehende „Wechsel"-Flow
  (`handleNextInning`) beendet das Half-Inning. → „2 Outs + Tap = Inning beendet" ergibt sich
  automatisch, kein Sonder-Code.
- Rücknahme über den bestehenden **Undo-Button** (chronologisch, wie AtBat/Stealing/Sub/InningAdvance).
- Bei bereits 3 Aus im aktuellen Inning: kein weiteres Auto-Aus (Frontend deaktiviert Tap;
  Backend wirft `BusinessValidationException` als Defense-in-Depth).

## Datenmodell-Entscheidung

Neues Event **`AutomaticOutEvent`** — 1:1 nach dem Muster von `InningAdvanceEvent`
(kein Player, kein Base-State, nur `game`, `inning`, `createdAt`, `createdBy`).

**Verworfen:** Wiederverwendung von `BaseRunningEvent`. Das bräuchte einen nullable `runner`
(aktuell non-null angenommen) und würde fragilen Stealing-Display-Code (`StealingEventResponse.from`,
Base-State-Fold) anfassen. Eigenes Event ist sauberer und risikoärmer.

## Backend (Onion — alle Schichten)

### Domain
- `domain/model/AutomaticOutEvent.java` — `{Long id, Game game, Integer inning, Instant createdAt, String createdBy}`
- `domain/port/out/AutomaticOutEventRepository.java` — `save`, `findByGameIdOrderByCreatedAtAsc`,
  `findByGameId`, `deleteById`

### Adapter / Persistence
- `entity/AutomaticOutEventEntity.java` — JPA, FK auf game
- `mapper/AutomaticOutEventMapper.java` — entity ↔ model
- `repository/SpringAutomaticOutEventRepository.java` — `JpaRepository`
- `adapter/AutomaticOutEventRepositoryAdapter.java` — implementiert Port

### Migration
- `V50__automatic_out_event.sql`
  ```sql
  CREATE TABLE automatic_out_event (
      id         BIGSERIAL PRIMARY KEY,
      game_id    BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      inning     INT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by VARCHAR(255)
  );
  CREATE INDEX idx_auto_out_game ON automatic_out_event(game_id);
  ```
  (Tabellen-/Spaltennamen an bestehende `inning_advance_event`-Migration angleichen.)

### GameScoringService
- **`recordAutomaticOut(Long gameId)`**: aktuelles Inning per `max(lastAB-Inning, lastEvent-Inning)`
  (gleiche Logik wie `advanceInning`/`getScoreboard`). Vorher `outsInCurrent` prüfen: `>= 3`
  → `BusinessValidationException`. Sonst Event speichern. INFO-Log.
- **`getScoreboard`**: `outsInCurrent = atBatOuts + runnerOuts + autoOuts`, wobei `autoOuts` =
  Anzahl `AutomaticOutEvent` mit `inning == currentInning`.
- **`undoLastAction`**: `AutomaticOutEvent` als 5. chronologischen Kandidaten in die
  `max(createdAt)`-Vergleichskette aufnehmen; neuer `UndoType.AUTOMATIC_OUT`.
- **`deleteCurrentInning`**: Auto-Aus-Events des aktuellen Innings mitlöschen.
- **`resetScoring`**: alle Auto-Aus-Events des Games mitlöschen.

### DTO / Controller
- `UndoResultResponse`: `UndoType.AUTOMATIC_OUT` + Factory `automaticOut(Long id)`.
- `ScoringController`: `POST /api/games/{gameId}/scoring/automatic-out` → `recordAutomaticOut`.

## Frontend

- `api/client.ts`: `recordAutomaticOut(gameId: number)`.
- `useScoring.ts`: `recordAutomaticOut` Wrapper → `reload()`.
- `types`: `UndoResult`-Union um `'AUTOMATIC_OUT'`; Undo-Toast-Text
  („Letztes automatisches Aus rückgängig gemacht").
- `ScoringPage.tsx`:
  - `extraOuts`-State + `totalOuts` + `setExtraOuts`-Aufrufe **entfernen**. Outs-Dots zeigen
    `displayOuts` (jetzt inkl. Auto-Aus vom Backend).
  - Outs-Strip-Button (`:713`): `onClick` öffnet neuen `ConfirmModal` statt `setExtraOuts`.
    Disabled/no-op wenn `halfInningOver`.
  - `ConfirmModal`: Titel „Automatisches Aus?", Text „Wird als Aus im aktuellen Inning
    gezählt (nicht dem Batter zugerechnet)." → Bestätigen ruft `recordAutomaticOut`.
  - Undo-Handler: `'AUTOMATIC_OUT'`-Toast ergänzen.

## Tests

### Backend (`GameScoringServiceTest` o.ä.)
- Auto-Aus buchen → `outsInCurrentInning` +1, Batting-Order unverändert.
- 3. Auto-Aus → `outsInCurrentInning == 3`.
- Auto-Aus bei bereits 3 Outs → `BusinessValidationException`.
- Undo entfernt jüngstes Auto-Aus (chronologisch korrekt vs. AtBat).
- `deleteCurrentInning` / `resetScoring` löschen Auto-Aus-Events.

### E2E (Playwright) — **Pflicht bei Scoring-Änderung**
- Neuer Case: Auto-Aus-Tap + Confirm → Out-Dot füllt sich; 3. Aus sperrt Batter-Buttons; Undo.
- **Komplette 43er-Suite** laufen lassen: `docker compose up -d db && cd frontend && npm run test:e2e`.

## Nicht-Ziele (YAGNI)

- Kein separater Auto-Aus-Button unten (User will die Outs-Dots oben nutzen).
- Kein Lineup-Slot-Modell für Auto-Aus (Batting-Order bleibt unberührt).
- Keine Spielbogen-Integration (nur Legacy-Scoring).
