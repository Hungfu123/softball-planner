# GameDay + Availability

Ein **GameDay** = ein Spieltag mit 1-3 (max ~10 nach V25) Games (Doubleheader/Tripleheader). Hat einen Pool von **availablePlayers** für den Tag. Lineups, Staff, Cars werden pro Game gepflegt.

## Routes
- `/gameday/:id` — Detail-Page mit Verfügbarkeit + Game-Tabs + Lineup pro Game
- `/gameday/:id/scoring/:gameIndex` — Old Scoring für ein Game
- `/gameday/:id/export` — PDF-Export aller Lineups

## Backend Files
- `application/GameDayService.java` — CRUD, Date, Location
- `application/AvailabilityService.java` — `setAvailablePlayers` mit **Cascade** (extracted aus GameDayService um SOLID-Sünde zu fixen)
- `application/GameService.java` — Game-CRUD pro GameDay
- `application/GameStaffService.java` — Base Coaches, Scorer
- `application/CarService.java` — Carpool

## Domain-Regeln
- **Max 10 Games** pro GameDay (V25 lockerte 1..3 auf 1..10 für Tournaments).
- **availablePlayers** ist der Pool — alle Lineup-Player müssen drin sein.
- **Cascade bei `setAvailablePlayers`:** Player wird aus availablePlayers entfernt:
  - **Lineup-Entries** des Players in allen Games dieser GameDay → gelöscht
  - **`dhBatterPlayerId`** wo der Player DH war → genullt
  - **Staff-Entries** (Base Coach, Scorer) wo der Player → gelöscht
  - **Cars** wo der Player Driver war → gelöscht (Passengers bleiben aber Auto wird gelöscht)
  - **Batting-Order** wird renumberiert nach Lineup-Delete
- **Atomare Operation:** alle Cascade-Schritte in einer Transaktion. Failure → kompletter Rollback.

## Frontend Files
- `components/gameday/GameDayPage.tsx`
- `components/gameday/AvailabilityList.tsx`
- `components/gameday/GameTabs.tsx`
- `components/gameday/CarpoolPanel.tsx`
- `components/planner/GameDayPlanner.tsx` — Multi-GameDay Planner
- `hooks/useGameDay.ts`

## Häufige Fallstricke
- **Player aus availablePlayers entfernen löscht Daten**: Cascade ist destruktiv. Confirm-Modal vor Remove zeigen, evtl. Auswirkungen ankündigen ("Olaf war in Game 1 Lineup auf 3B + Driver in Carpool — entfernen löscht beides").
- **Kein Test mockt DB**: Tests via Testcontainers mit echtem Postgres. Cascade-Verhalten daher echt getestet.
- **`AvailabilityService` aus `GameDayService` extracted**: Falls Cascade-Logik wachsen soll, weiter in eigenen Service halten (SOLID single-responsibility).
- **Carpool-Driver-Delete**: Auto wird komplett gelöscht (nicht nur Driver-Reference). Passenger sind dann aber ohne Mitfahrgelegenheit. Frontend sollte warnen.
