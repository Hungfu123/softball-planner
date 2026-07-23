# Base-Coaches in Lineup-Sets

**Datum:** 2026-07-23
**Scope:** Lineup-Sets (Gameday-Planner) — Snapshot + Anwenden

## Problem

Lineup-Sets speichern nur die Lineup-Entries (Spieler, Position, Batting-Order, DH),
**nicht** die Base-Coaches. Base-Coaches sind `GameStaff` (separates Modell, Rollen
`BASE_COACH_1ST` / `BASE_COACH_3RD`).

Beim Anwenden eines Sets schreibt das Frontend die Lineups pro Spiel via `setLineup`.
Backend-Validierung (`LineupValidator.validateNoConflictWithStaff`) wirft, wenn ein
Lineup-Spieler noch als Base-Coach eingetragen ist:
„Spieler X ist bereits als Base Coach eingeteilt". `GameStaffService.validate` prüft
zusätzlich die Gegenrichtung („Coach ist bereits im Lineup"). Dadurch scheitert das
Set-Anwenden reproduzierbar, sobald ein Base-Coach gesetzt ist und das Set denselben
Spieler ins Batting-Lineup nimmt.

## Ziel

1. Beim **Speichern** eines Sets die Base-Coaches je Spiel mit-snapshotten.
2. Beim **Anwenden** eines Sets Lineup **und** Base-Coaches aller Spiele überschreiben
   (konfliktfrei), mit **Confirm-Dialog** davor.

## Verhalten

- **Confirm immer:** Jedes Set-Anwenden zeigt vorher einen ConfirmModal:
  „Set anwenden? Lineup und Base-Coaches aller Spiele werden überschrieben."
  (Heute nur bei ungespeicherter Arbeit — neu: immer.)
- **Überschreiben:** Set = vollständiger Snapshot. Anwenden setzt Lineup + Base-Coaches
  je Spiel auf den Set-Stand. Alte Sets ohne gespeicherte Coaches → Base-Coaches werden
  **geleert** (konsistent mit „Set überschreibt"; der Confirm warnt).
- **Abwesende Spieler (Skip):** unverändert — Spiele mit Lücken bleiben unpersistierter
  Draft (bestehende Logik). Für solche Spiele werden die Base-Coaches trotzdem
  überschrieben (siehe Apply-Reihenfolge), damit der spätere manuelle Lineup-Save nicht
  am alten Coach scheitert.

## Apply-Reihenfolge (löst Henne-Ei-Konflikt)

Frontend-orchestriert (wie heute). Pro Spiel des Sets:
1. `setStaff(gameId, [])` — Base-Coaches leeren
2. `setLineup(gameId, …)` — jetzt konfliktfrei (keine Staff vorhanden)
3. `setStaff(gameId, set-Coaches)` — konfliktfrei (Set-Lineup schließt die Coaches aus,
   da der Snapshot in sich konsistent ist)

Für Skip-Spiele (Draft, kein `setLineup`): Schritt 1 + 3 trotzdem ausführen
(Coaches leeren, dann Set-Coaches setzen) — Schritt 3 validiert gegen das aktuelle
(persistierte) Lineup; da die Set-Coaches im Set-Lineup nicht batten und das aktuelle
Lineup entweder leer/alt ist, im Zweifel Schritt 3 für Skip-Spiele überspringen und nur
leeren. **Entscheidung:** für Skip-Spiele nur Schritt 1 (leeren); Set-Coaches werden beim
späteren manuellen Save nicht automatisch gesetzt — der User füllt Lücken + Coaches
manuell. (Vermeidet Validierungs-Edgecases gegen ein noch nicht persistiertes Lineup.)

Nicht atomar (3 Calls/Spiel), aber recoverbar: schlägt Schritt 3 fehl, ist Lineup gesetzt
+ Coaches leer → User setzt Coaches neu. Akzeptiert.

## Backend

### Model / Persistence
- `domain/model/LineupSetStaffEntry` — `{ Integer gameNumber, Player player, StaffRole role }`
- `LineupSet` bekommt `List<LineupSetStaffEntry> staffEntries`
- Migration `V51__lineup_set_staff.sql`:
  ```sql
  CREATE TABLE lineup_set_staff (
      id            BIGSERIAL PRIMARY KEY,
      lineup_set_id BIGINT NOT NULL REFERENCES lineup_set(id) ON DELETE CASCADE,
      game_number   INT NOT NULL,
      player_id     BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      role          VARCHAR(32) NOT NULL
  );
  CREATE INDEX idx_lineup_set_staff_set ON lineup_set_staff(lineup_set_id);
  ```
- Entity `LineupSetStaffEntity` + Mapper-Erweiterung + Spring-Repo-Anpassung
  (Set lädt/speichert Staff-Entries analog zu `lineup_set_entry`).

### Service
- `LineupSetService.snapshot(...)`: zusätzlich `GameStaff` je Spiel laden
  (`GameStaffRepository` injizieren) und als `LineupSetStaffEntry` mit `gameNumber`
  speichern.

### DTO
- `LineupSetStaffEntryResponse { gameNumber, playerId, playerName, role }`
- `LineupSetResponse` um `List<LineupSetStaffEntryResponse> staff` erweitern.

## Frontend

- `types`: `LineupSetStaffEntryResponse`; `LineupSetResponse.staff`.
- `useStaff` / API: `setStaff(gameId, [])` zum Leeren nutzbar (existiert).
- `useLineup.applySet(...)`: Signatur um `staffEntries` erweitern; pro Spiel
  Reihenfolge clear→lineup→(set-coaches) implementieren; Skip-Spiele nur leeren.
- `GameDayPlanner.handleApplySet`: **immer** `pendingApplySet` setzen (Confirm), auch ohne
  ungespeicherte Arbeit. `doApplySet` übergibt `set.staff` an `applySet`.
- `ConfirmModal`-Text auf Lineup+Coaches-Überschreiben anpassen.
- Nach Apply: Staff des aktiven Spiels neu laden (`staff.load(activeGame.id)`), damit
  die CoachSlots-Anzeige stimmt.

## Tests

- Backend: `LineupSetServiceTest` — snapshot erfasst GameStaff je Spiel; Response enthält
  Staff. (Falls kein Test existiert: neuer Mockito-Test.)
- Backend-Integration (falls vorhanden): Set mit Coaches speichern + laden round-trip.
- Frontend: manueller/E2E-Check des Apply-Flows nicht zwingend automatisiert (Planner hat
  keine E2E-Pflicht wie Scoring), aber Build + Lint grün. Optional Vitest für
  `applySet`-Reihenfolge, falls sinnvoll.

## Nicht-Ziele (YAGNI)

- Kein Backend-Apply-Endpoint (Frontend-Orchestrierung bleibt).
- Keine atomare Transaktion übers ganze Set (recoverbar akzeptiert).
- Keine Migration/Backfill alter Sets (alte Sets → Coaches leeren beim Anwenden).
- DH-Host/DH-Batter-Coach-Regeln bleiben unverändert (bereits im Snapshot über
  Lineup-Entries + Staff korrekt abgebildet).
