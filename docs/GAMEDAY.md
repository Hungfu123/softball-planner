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
- `application/GameDayVoteSyncService.java` — Vorschau + Apply der WhatsApp-Spieltag-Umfrage (siehe unten)

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

## WhatsApp-Spieltag-Umfrage

Ein `WhatsappPoll` im Modus `GAME_DAY` ist per `game_day_id` an genau einen Spieltag gekoppelt (Unique-Index `uq_poll_game_day` — **max. eine Umfrage pro Spieltag**, sonst wäre unklar, wessen `lastSentMessageId` beim Stimmen-Abruf gilt).

- **Versand:** einmalig, über denselben Pfad wie `ONE_OFF` (`PollDueEvaluator.isDueOneOff`) am `sendDate`. Vorbelegung im Editor: Spieltag − 7 Tage, auf heute geklemmt (Backend lehnt ein `sendDate` in der Vergangenheit ab). Nach dem Versand kein erneuter Versand (`lastSentAt`-Guard).
- **Position-1-Regel:** die **erste** Antwortoption der Vorlage zählt als „anwesend" — rein positionsbasiert, keine Textheuristik (`domain/service/GameDayVoteMirror`). Beide mitgelieferten Vorlagen (Auswärtsspiel: Mehrfachauswahl mit Auto-Option; Heimspieltag: Einzelauswahl mit Aufbau/Catering-Option) legen die Ja-Option deshalb bewusst auf Position 1. Stimmt ein Spieler unter zwei WhatsApp-Namen ab (Alias-Konflikt), gewinnt ein Ja.
- **Speicherung:** Stimmen landen wie bei Trainings-Umfragen in `whatsapp_synced_vote` (jetzt mit `game_day_id` statt nur `training_id`), damit unbekannte WhatsApp-Namen später einem Spieler zugeordnet werden können.
- **Drei Endpoints** (`GameDayVoteSyncService`), **nie automatische Übernahme**:
  - `POST /api/gamedays/{id}/poll-votes/fetch` — holt aktuelle Stimmen vom Sidecar, persistiert sie und liefert eine Vorschau (Delta + Kaskaden-Warnungen, s.u.)
  - `GET /api/gamedays/{id}/poll-votes` — nur die zuletzt gespeicherten Stimmen, kein neuer Abruf
  - `POST /api/gamedays/{id}/poll-votes/apply` — schreibt ein Delta `{add, remove}` gegen den **aktuellen** Stand von `availablePlayers` (nicht gegen den Stand zur Zeit der Vorschau, falls parallel in einem anderen Tab geändert wurde)
- **Apply schreibt ausschließlich über `AvailabilityService.setAvailablePlayers`** — dort hängt die destruktive Cascade (siehe oben: Lineup-Entries, DH-Zuordnung, Staff-Entries, Batting-Order-Renumbering). `GameDayVoteSyncService` selbst schreibt nie direkt in `availablePlayers`.
- **Unbekannte Wähler** (WhatsApp-Name ohne zugeordneten Spieler) werden im Vorschau-Modal (`components/planner/PollVoteSyncSheet.tsx`) inline einem Spieler zugeordnet oder als neuer Spieler angelegt — geteilte `UnknownVoterRow`-Komponente, auch von der Trainings-Umfrage genutzt.

## Frontend Files
- `components/gameday/GameDayPage.tsx`
- `components/gameday/AvailabilityList.tsx`
- `components/gameday/GameTabs.tsx`
- `components/gameday/CarpoolPanel.tsx`
- `components/planner/GameDayPlanner.tsx` — Multi-GameDay Planner, enthält `PollSyncToolbarButton` neben „Anwesend (N)"
- `components/planner/PollVoteSyncSheet.tsx` — Vorschau-Modal (Bilanz, Delta, unbekannte Wähler)
- `hooks/useGameDay.ts`

## Häufige Fallstricke
- **Player aus availablePlayers entfernen löscht Daten**: Cascade ist destruktiv. Confirm-Modal vor Remove zeigen, evtl. Auswirkungen ankündigen ("Olaf war in Game 1 Lineup auf 3B + Driver in Carpool — entfernen löscht beides").
- **Kein Test mockt DB**: Tests via Testcontainers mit echtem Postgres. Cascade-Verhalten daher echt getestet.
- **`AvailabilityService` aus `GameDayService` extracted**: Falls Cascade-Logik wachsen soll, weiter in eigenen Service halten (SOLID single-responsibility).
- **Carpool-Driver-Delete**: Auto wird komplett gelöscht (nicht nur Driver-Reference). Passenger sind dann aber ohne Mitfahrgelegenheit. Frontend sollte warnen.
- **Spieltag-Umfrage übernimmt nie automatisch**: `fetch` speichert Stimmen und zeigt sie an, ändert `availablePlayers` aber nicht. Erst der explizite `apply`-Call im Vorschau-Modal löst die Cascade aus — dieselbe Vorsicht gilt hier wie beim manuellen Entfernen aus `availablePlayers`.
