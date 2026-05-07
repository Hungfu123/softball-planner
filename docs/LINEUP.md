# Lineup Editor

Pro Game-Eintrag der GameDay: Lineup mit max 10 Entries (Batting-Order 1..N), Field-Positions, optional EH (Extra Hitter) ohne Field, optional DH-Annotation.

Auto-Generation auch verfügbar: `docs/03-LINEUP-AUTO-GENERATE.md`.

## Routes
- `/gameday/:id` — GameDay-Detail mit Game-Tabs + Lineup-Builder pro Game

## Backend Files
- `application/LineupService.java` — CRUD, Validation
- `domain/service/LineupValidator.java` — pure Regeln
- `domain/model/LineupEntry.java`
- `adapter/in/web/GameController.java` — `POST /api/games/{id}/lineup`

## Domain-Regeln (don't break!)
- **Max 10 LineupEntries** pro Game.
- **Batting-Order sequenziell** 1..N, kein Gap.
- **Field-Positions unique** (P/C/1B/2B/3B/SS/LF/CF/RF). EH **darf** mehrfach (kein Field). `position == null` = nur batten, kein Field.
- **Players in `gameDay.availablePlayers`** — alle Lineup-Player müssen verfügbar sein.
- **Player kann NICHT** Lineup AND Base-Coach im selben Game sein.
- **DH-Annotation:**
  - **DH ist KEINE eigene `LineupEntry`** — sondern `dhBatterPlayerId` auf einem **Field**-Player-Entry
  - Max 1 DH pro Game
  - Nur valide auf Field-Position (NICHT EH, NICHT null-position)
  - DH-Batter muss ein Bench-Player sein (kein Lineup-Player)
  - DH-Batter zählt als 0.5-Game in Stats
- **Swap** (`POST /api/games/{id1}/swap/{id2}`): atomarer Swap von Lineup + Staff + Opponent + Scores zwischen zwei Games auf der **selben** GameDay.

## Frontend Files
- `components/lineup/LineupBuilder.tsx` — Drag-Drop via @dnd-kit
- `components/lineup/LineupEntryRow.tsx`
- `components/lineup/PlayerPicker.tsx`
- `components/lineup/DHAnnotationModal.tsx`
- `hooks/useLineup.ts`

## Häufige Fallstricke
- **DH-Verständnis falsch:** Code-Reviewer denken oft DH ist eigener Eintrag (wie Baseball-Convention). Hier NICHT — `dhBatterPlayerId` ist Annotation auf Field-Player.
- **Batting-Order-Gaps nach Delete:** Backend renumberiert automatisch. Frontend sollte nach API-Response neu laden.
- **Player in zwei Games gleichzeitig**: nicht verboten (verschiedene Games auf gleicher GameDay = parallele Spiele möglich, falls Liga das so mappt).
- **Cascade bei Availability-Change** siehe `docs/GAMEDAY.md`.
