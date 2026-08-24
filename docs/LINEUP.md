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

## Lineup-Sets (Varianten je Spieltag)
- Snapshot des ganzen Spieltags: Verfügbare Spieler + Lineups aller Games + Base-Coaches.
- `POST /api/gamedays/{id}/lineup-sets` neu anlegen, `PUT /api/lineup-sets/{id}` **mit aktuellem Stand überschreiben** (ID, Name und Sortierung bleiben), `PATCH` umbenennen, `DELETE` löschen.
- Frontend: `LineupSetBar` (Pills + ⋯-Menü mit Überschreiben/Umbenennen/Löschen), `useLineupSets`. Überschreiben speichert erst alle Game-Lineups, dann snapshotet das Backend — gleiche Reihenfolge wie "Als Set speichern".
- **Coach-Rotation ist Teil des Sets** (seit V57, Tabelle `lineup_set_game_rotation`, eine Zeile je `game_number` mit 1B/3B-Pair + reversed-Flag). `captureCurrentState` liest sie von den Games mit, `applySet` schreibt sie per `setCoachRotation` zurück. Zeilen ohne Rotation werden nicht gespeichert; **Alt-Sets (vor V57) haben keine Zeilen → Rotation wird beim Anwenden geleert**, statt die des vorher geladenen Sets zu erben.
- Der Planner zieht nach `applySet` `getGameDay` neu — sonst zeigen die 1B/3B-Badges im Lineup den alten Stand, u. a. weil `GameStaffService.setStaff` die Rotation serverseitig löscht, sobald ein Coach-Slot besetzt wird.

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
- **Fehlermeldung zu einem fremden Tab:** "Lineup speichern" persistiert ALLE Games des Spieltags (`saveAllGames`), nicht nur den offenen Tab. Validierungsfehler werden deshalb mit `Spiel {n}: …` geprefixt und nennen Spielernamen (Name-Map aus `LineupService.playerNamesFor`), sonst ist die Meldung im UI nicht zuordenbar.
- **DH-Batter vs. Base Coach:** der DH-Batter schlägt und darf nicht coachen. Der Planner räumt den Coach-Slot beim Setzen des DH automatisch frei (`handleSetDhBatter`), analog zu `handleAddPlayer` — sonst kommt der Konflikt erst als 400 beim Speichern.
