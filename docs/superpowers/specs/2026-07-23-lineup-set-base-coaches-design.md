# Lineup-Set = voller Gameday-Snapshot (verfügbare Spieler + Lineup + Base-Coaches)

**Datum:** 2026-07-23
**Scope:** Lineup-Sets (Gameday-Planner) — Snapshot + Anwenden

## Problem

Lineup-Sets speichern nur die Lineup-Entries (Spieler, Position, Batting-Order, DH) je
Spiel — **nicht** die Base-Coaches und **nicht** die verfügbaren Spieler (Tag-Roster).

Zwei Folgen:
1. **Base-Coach-Konflikt:** Beim Anwenden schreibt das Frontend Lineups via `setLineup`.
   `LineupValidator.validateNoConflictWithStaff` wirft, wenn ein Lineup-Spieler noch als
   Base-Coach eingetragen ist: „Spieler X ist bereits als Base Coach eingeteilt".
   `GameStaffService.validate` prüft die Gegenrichtung. → Set-Anwenden scheitert
   reproduzierbar, sobald ein Base-Coach gesetzt ist und das Set denselben Spieler ins
   Batting-Lineup nimmt.
2. **Skip:** Ist ein Set-Spieler am Gameday nicht als verfügbar eingetragen, scheitert
   `validatePlayerAvailability` — das Spiel bleibt unpersistierter Draft mit Lücke
   („Skip", `applySet` → `skipped[]`).

## Ziel

Ein Set ist der **komplette Tag-Zustand**. Speichern snapshottet, Anwenden überschreibt:
- verfügbare Spieler des Gamedays (Roster-Auswahl)
- Lineup je Spiel (bereits vorhanden)
- Base-Coaches je Spiel (neu)

Anwenden **ersetzt** alles (kein Merge), mit **Confirm-Dialog** davor. Weil das Set beim
Anwenden zuerst die verfügbaren Spieler setzt, sind danach alle Set-Spieler verfügbar →
**keine Skips mehr**, und der Base-Coach-Konflikt ist durch die Apply-Reihenfolge gelöst.

## Verhalten

- **Confirm immer:** Jedes Set-Anwenden zeigt vorher einen ConfirmModal:
  „Set anwenden? Verfügbare Spieler, Lineups und Base-Coaches des ganzen Spieltags werden
  überschrieben."
- **Überschreiben (ersetzen):**
  - Verfügbare Spieler → auf die Set-Liste gesetzt. Aktuell zusätzlich verfügbare Spieler
    fallen raus; deren Lineup/Staff/DH werden per bestehender Cascade
    (`AvailabilityService.setAvailablePlayers`) entfernt.
  - Lineup + Base-Coaches je Spiel → auf den Set-Stand gesetzt.
- **Alte Sets** (ohne gespeicherte Coaches / ohne verfügbare-Spieler-Liste): Coaches
  werden geleert; als verfügbare Spieler wird die Vereinigung aller im Set verwendeten
  Spieler (Lineup + DH) genommen (siehe Snapshot-Fallback), damit das Anwenden nicht
  fehlschlägt.

## Apply-Reihenfolge (löst Konflikt + Skip)

Frontend-orchestriert (wie heute). Einmalig für den Gameday, dann pro Spiel:

0. `setAvailablePlayers(gameDayId, set.availablePlayerIds)` — Roster setzen. Cascade räumt
   entfernte Spieler aus allen Spielen (Lineup/Staff/DH). Danach sind alle Set-Spieler
   verfügbar.
Pro Spiel des Sets:
1. `setStaff(gameId, [])` — Base-Coaches leeren
2. `setLineup(gameId, …)` — konfliktfrei (keine Staff, alle Spieler verfügbar)
3. `setStaff(gameId, set-Coaches)` — konfliktfrei (Set-Lineup schließt die Coaches aus)

Weil Schritt 0 alle Set-Spieler verfügbar macht, entfällt die Skip-Sonderbehandlung —
Lineups persistieren vollständig. Der bestehende Skip-Pfad bleibt als Sicherheitsnetz
(falls ein Set-Spieler global gelöscht wurde).

Nicht atomar (mehrere Calls), aber recoverbar. Reihenfolge 0→1→2→3 ist zwingend.

## Backend

### Model / Persistence
- `domain/model/LineupSetStaffEntry` — `{ Integer gameNumber, Player player, StaffRole role }`
- `LineupSet` bekommt:
  - `List<LineupSetStaffEntry> staffEntries`
  - `List<Long> availablePlayerIds` (Snapshot der Gameday-Verfügbaren)
- Migration `V51__lineup_set_staff_and_available.sql`:
  ```sql
  CREATE TABLE lineup_set_staff (
      id            BIGSERIAL PRIMARY KEY,
      lineup_set_id BIGINT NOT NULL REFERENCES lineup_set(id) ON DELETE CASCADE,
      game_number   INT NOT NULL,
      player_id     BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      role          VARCHAR(32) NOT NULL
  );
  CREATE INDEX idx_lineup_set_staff_set ON lineup_set_staff(lineup_set_id);

  CREATE TABLE lineup_set_available_player (
      id            BIGSERIAL PRIMARY KEY,
      lineup_set_id BIGINT NOT NULL REFERENCES lineup_set(id) ON DELETE CASCADE,
      player_id     BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE
  );
  CREATE INDEX idx_lineup_set_avail_set ON lineup_set_available_player(lineup_set_id);
  ```
- Entities `LineupSetStaffEntity` + `LineupSetAvailablePlayerEntity`, Mapper-Erweiterung,
  Spring-Repo/Adapter laden+speichern die neuen Kind-Listen analog `lineup_set_entry`.

### Service
- `LineupSetService.snapshot(...)`:
  - zusätzlich `GameStaff` je Spiel laden (`GameStaffRepository` injizieren) → StaffEntries
  - `availablePlayerIds` = `GameDay.availablePlayers` (via `GameDayRepository`/vorhandene
    Quelle). Fallback (leer) = Vereinigung aller Lineup-/DH-Spieler des Snapshots.

### DTO
- `LineupSetStaffEntryResponse { gameNumber, playerId, playerName, role }`
- `LineupSetResponse` erweitern:
  - `List<LineupSetStaffEntryResponse> staff`
  - `List<Long> availablePlayerIds` (oder Liste mit id+name für Anzeige)

## Frontend

- `types`: `LineupSetStaffEntryResponse`; `LineupSetResponse.staff` + `.availablePlayerIds`.
- `GameDayPlanner.doApplySet`:
  1. `gameDay.setAvailablePlayers(set.availablePlayerIds)` (löst Cascade + reload)
  2. `lineup.applySet(set.entries, set.staff, games, availablePlayers)` mit neuer
     Reihenfolge clear→lineup→coaches je Spiel
  3. aktives Spiel: `staff.load(activeGame.id)` neu laden
- `GameDayPlanner.handleApplySet`: **immer** Confirm (`pendingApplySet` setzen), auch ohne
  ungespeicherte Arbeit.
- `useLineup.applySet(...)`: Signatur um `staffEntries` erweitern; pro Spiel
  clear→lineup→set-coaches. (Available-Players-Schritt liegt im Planner davor.)
- `ConfirmModal`-Text: „Verfügbare Spieler, Lineups und Base-Coaches des ganzen Spieltags
  werden überschrieben."

## Tests

- Backend: `LineupSetServiceTest` — snapshot erfasst GameStaff + availablePlayerIds je
  Gameday; Response enthält beides. Round-trip (save+load) der neuen Kind-Listen.
- Frontend: Build + Lint grün. Optional Vitest für `applySet`-Reihenfolge.
- Manuell: Set mit Coaches + Teil-Roster speichern, Roster ändern, Set anwenden →
  Roster + Lineup + Coaches wiederhergestellt, kein Konflikt, keine Skips.

## Nicht-Ziele (YAGNI)

- Kein Backend-Apply-Endpoint (Frontend-Orchestrierung bleibt).
- Keine atomare Transaktion übers ganze Set (recoverbar akzeptiert).
- Kein Backfill alter Sets (Fallback beim Anwenden greift).
- DH-Host/DH-Batter-Coach-Regeln unverändert.
