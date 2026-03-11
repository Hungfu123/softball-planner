# Backend - Architektur und Aufbau

## Tech Stack
- Spring Boot 3.4.3 (Java 21)
- Spring Data JPA / Hibernate
- H2 Datenbank (file-basiert: ./data/softball)
- Bean Validation (jakarta.validation)
- SLF4J Logging (in Services + ExceptionHandler)
- Port: 8080
- CORS erlaubt: http://localhost:5173

---

## Projektstruktur

```
backend/src/main/java/com/softball/
|
|-- SoftballLineupApplication.java        # Spring Boot Einstiegspunkt
|
|-- config/
|   |-- CorsConfig.java                  # CORS fuer localhost:5173
|   +-- GlobalExceptionHandler.java      # Zentrale Fehlerbehandlung (404, 400) + Logging
|
|-- entity/                               # JPA Entities (DB-Tabellen)
|   |-- Player.java                       # id, name
|   |-- Season.java                       # id, name, year -> hat n GameDays
|   |-- GameDay.java                      # id, date, label, location -> hat 3 Games + n verfuegbare Spieler
|   |-- Game.java                         # id, gameNumber (1-3), opponentTeam (LeagueTeam), scoreUs, scoreThem -> hat n LineupEntries + n Staff
|   |-- LeagueTeam.java                   # id, season, name, ownTeam
|   |-- LineupEntry.java                  # id, player, position (enum), battingOrder (1-10), dhBatterPlayer (optional)
|   |-- GameStaff.java                    # id, player, role (enum: BASE_COACH_1ST/3RD)
|   |-- Position.java                     # Enum: P, C, 1B, 2B, 3B, SS, LF, CF, RF, EH
|   |-- StaffRole.java                    # Enum: BASE_COACH_1ST, BASE_COACH_3RD
|   |-- LeagueResult.java                 # id, season, homeTeam, awayTeam, homeScore, awayScore, date
|   +-- Car.java                          # id, gameDay, driver (Player), totalSeats, direction
|
|-- repository/                           # Spring Data JPA Repositories
|   |-- PlayerRepository.java             # Standard CRUD
|   |-- SeasonRepository.java             # + findByIdWithGameDaysAndGames (Fetch Join)
|   |-- GameDayRepository.java            # + findBySeasonId, findByIdWithPlayers, findByIdWithGames
|   |-- GameRepository.java               # + findByGameDayIdOrderByGameNumberAsc, findByOpponentTeam_Id, findBySeasonIdWithScores
|   |-- LeagueTeamRepository.java         # + findBySeason_Id, findBySeason_IdAndNameIgnoreCase
|   |-- LineupEntryRepository.java        # + findByGameId, deleteByGameId
|   |-- GameStaffRepository.java          # + findByGameId, deleteByGameId
|   |-- LeagueResultRepository.java       # + findBySeason_Id, findByHomeTeam_IdOrAwayTeam_Id
|   +-- CarRepository.java               # + findByGameDay_Id, deleteByGameDay_Id
|
|-- dto/                                  # Data Transfer Objects (Records)
|   |-- CreatePlayerRequest.java          # record(@NotBlank name)
|   |-- CreateSeasonRequest.java          # record(@NotBlank name, @NotNull year)
|   |-- CreateGameDayRequest.java         # record(@NotNull date, label, location)
|   |-- SetAvailablePlayersRequest.java   # record(@NotEmpty playerIds)
|   |-- LineupEntryRequest.java           # record(@NotNull playerId, position?, @NotNull battingOrder, dhBatterPlayerId)
|   |-- GameStaffRequest.java             # record(@NotNull playerId, @NotBlank role)
|   |-- PlayerResponse.java              # record(id, name)
|   |-- SeasonResponse.java              # record(id, name, year)
|   |-- GameResponse.java                # record(id, gameNumber, opponentTeam, scoreUs, scoreThem, gameDayId)
|   |-- LeagueTeamResponse.java         # record(id, name, ownTeam)
|   |-- CreateLeagueTeamRequest.java     # record(@NotBlank name, ownTeam)
|   |-- UpdateGameRequest.java           # record(opponentTeamId)
|   |-- SetGameScoreRequest.java         # record(scoreUs, scoreThem)
|   |-- StandingsEntry.java             # record(team, games, wins, losses, ties, winPct, runsScored, runsAgainst, runDiff)
|   |-- GameDayResponse.java             # record(id, date, label, location, seasonId, availablePlayers, games)
|   |-- LineupEntryResponse.java         # record(id, player, position, battingOrder, dhBatterPlayer)
|   |-- GameStaffResponse.java           # record(id, player, role)
|   |-- GameDayPlayerStats.java          # record(playerId, playerName, gameCount, positions[])
|   |-- SeasonPlayerStats.java           # record(playerId, playerName, totalGames, positionCounts{})
|   |-- DataExport.java                  # Komplett-Export/Import Format
|   |-- CarResponse.java                # record(id, driver, totalSeats, direction, gameDayId)
|   |-- CreateCarRequest.java           # record(@NotNull driverPlayerId, totalSeats, direction)
|   |-- UpdateCarRequest.java           # record(totalSeats?, direction?)
|   |-- LeagueResultResponse.java      # record(id, homeTeam, awayTeam, homeScore, awayScore, date)
|   +-- CreateLeagueResultRequest.java # record(@NotNull homeTeamId, awayTeamId, @Min(0) homeScore, awayScore, date?)
|
|-- exception/
|   |-- ResourceNotFoundException.java    # -> 404
|   +-- LineupValidationException.java    # -> 400
|
|-- service/                              # Business-Logik (SOLID: eine Verantwortung pro Service)
|   |-- PlayerService.java               # CRUD fuer Spieler
|   |-- SeasonService.java               # CRUD fuer Saisons
|   |-- GameDayService.java              # Spieltage CRUD + Stats (delegiert Verfuegbarkeit an AvailabilityService)
|   |-- AvailabilityService.java         # Spieler-Verfuegbarkeit setzen + Cascade-Bereinigung
|   |-- GameService.java                 # Gegner, Score, Swap (keine Lineup/Staff-Logik)
|   |-- LineupService.java               # Lineup setzen/laden + Validierung
|   |-- GameStaffService.java            # Staff (Base Coaches) setzen/laden + Validierung
|   |-- StatsService.java                # Saison-Statistik berechnen
|   |-- DataExportService.java           # Export aller Daten (nur lesen)
|   |-- DataImportService.java           # Import aller Daten (nur schreiben)
|   |-- CarService.java                 # Cars verwalten + Validierung
|   |-- LeagueTeamService.java         # Teams CRUD, Standings berechnen
|   +-- LeagueResultService.java       # Liga-Ergebnisse CRUD + Validierung
|
+-- controller/                           # REST Endpoints
    |-- PlayerController.java             # /api/players
    |-- SeasonController.java             # /api/seasons
    |-- GameDayController.java            # /api/seasons/{id}/gamedays + /api/gamedays/{id}
    |-- GameController.java               # /api/games/{id}/lineup + /api/games/{id}/staff
    |-- DataExportController.java         # /api/data/export + /api/data/import
    |-- CarController.java               # /api/gamedays/{id}/cars + /api/cars/{id}
    |-- LeagueTeamController.java       # /api/seasons/{id}/teams + /api/teams/{id} + /api/seasons/{id}/standings
    +-- LeagueResultController.java    # /api/seasons/{id}/results + /api/results/{id}
```

---

## Datenmodell (ER-Diagramm)

```
+----------+       +-----------+       +----------+
| Season   |1----n>| GameDay   |1----3>| Game     |
|----------|       |-----------|       |----------|
| id       |       | id        |       | id       |
| name     |       | date      |       | gameNumber|
| year     |       | label     |       | opponent |
+----------+       | location  |       | TeamId   |
  |                | seasonId  |       | scoreUs  |
  | 1:n            +-----------+       | scoreThem|
  v                                    | gameDayId|
+------------+                         +----------+
| LeagueTeam |                              |
|------------|                              |
| id         |<-----------------------------+
| seasonId   |    (opponentTeam, nullable)
| name       |
| ownTeam    |
+------------+
                   +-----------+          |    |
                        |                 |    |
                        | n:m             |    |
                        v                 |    |
                   +----------+           |    |
                   | Player   |           |    |
                   |----------|           |    |
                   | id       |<----------+----+
                   | name     |           |    |
                   +----------+           |    |
                        ^                 |    |
                        |                 |    |
                        | (dhBatterPlayer)|    |
                        |                 |    |
                   +----+-------+    +----+--------+
                   |            |    |             |
                   v            |    v             v
         +----------------+    |    |    +------------+
         | LineupEntry    |    |    |    | GameStaff  |
         |----------------|    |    |    |------------|
         | id             |    |    |    | id         |
         | gameId         |----+    +--->| gameId     |
         | playerId       |              | playerId   |
         | position (enum)|              | role (enum)|
         | battingOrder   |              +------------+
         | dhBatterPlayerId|  (optional, nullable)
         +----------------+
```

### Beziehungen
- Season 1:n GameDay (kaskadiertes Loeschen)
- Season 1:n LeagueTeam (kaskadiertes Loeschen)
- GameDay n:m Player (verfuegbare Spieler, Join-Table game_day_players)
- GameDay 1:3 Game (automatisch beim Anlegen erzeugt)
- GameDay 1:n Car (Fahrgemeinschaften, kaskadiertes Loeschen)
- Game n:1 LeagueTeam (opponentTeam, nullable)
- Game 1:n LineupEntry (max 10: Batting Order 1-10)
- Game 1:n GameStaff (max 2: BASE_COACH_1ST, BASE_COACH_3RD)
- LineupEntry n:1 Player (dhBatterPlayer, optional — Bankspieler der fuer den Feldspieler schlaegt)
- Season 1:n LeagueResult (kaskadiertes Loeschen)
- LeagueResult n:1 LeagueTeam (homeTeam + awayTeam, beide EAGER)
- Car n:1 Player (driver)

### Unique Constraints
- GameDay: (season_id, date) - kein doppelter Spieltag pro Saison
- LineupEntry: (game_id, batting_order) + (game_id, player_id)
- GameStaff: (game_id, role) + (game_id, player_id)
- Car: (game_day_id, driver_id) - ein Spieler kann nur einmal Fahrer pro Spieltag sein
- LeagueTeam: (season_id, name) - eindeutiger Teamname pro Saison

---

## DH-Modell (Designated Hitter)

DH ist **keine eigene Position**, sondern ein Attribut auf einem Feldspieler-Eintrag.

### Konzept
- Ein Feldspieler (z.B. SS) kann einen `dhBatterPlayer` zugewiesen bekommen
- Der DH-Batter ist ein Spieler von der Bank, der fuer diesen Feldspieler schlaegt
- Der DH-Batter bekommt keinen eigenen Lineup-Eintrag (keine eigene battingOrder)
- Der DH-Batter zaehlt als 0.5 Spiel in den Statistiken

### Validierungsregeln
- `dhBatterPlayerId` nur bei Feldpositionen erlaubt (nicht bei EH)
- DH-Batter darf nicht selbst im Lineup sein (ist Bankspieler)
- DH-Batter muss am Spieltag als verfuegbar markiert sein
- Maximal 1 DH-Batter pro Lineup

### Beispiel
```json
PUT /api/games/1/lineup
[
  { "playerId": 1, "position": "SS", "battingOrder": 1, "dhBatterPlayerId": 5 },
  { "playerId": 2, "position": "P",  "battingOrder": 2 },
  { "playerId": 3, "position": "CF", "battingOrder": 3 }
]
```
Hier spielt Spieler 5 (von der Bank) als DH-Batter fuer Spieler 1 (SS).

---

## Enums

### Position
| Wert | Display | Gewichtung | Feldposition? |
|------|---------|------------|---------------|
| P, C, SS, LF, CF, RF | gleich | 1.0 (volles Spiel) | ja |
| FIRST_BASE | 1B | 1.0 | ja |
| SECOND_BASE | 2B | 1.0 | ja |
| THIRD_BASE | 3B | 1.0 | ja |
| EH | EH | 0.5 (halbes Spiel) | nein |
| null | null | 1.0 (volles Spiel) | nein |

Position darf null sein — Spieler ist in der Schlagreihenfolge, aber Position noch nicht zugewiesen.
Spieler ohne Position zaehlen als volles Spiel in den Stats, tauchen aber nicht in positionCounts auf.
DH-Batter (ueber `dhBatterPlayer`) zaehlt als 0.5 Spiel in den Statistiken.

### StaffRole
- `BASE_COACH_1ST` - 1st Base Coach
- `BASE_COACH_3RD` - 3rd Base Coach

---

## REST API Endpoints

### Players - /api/players
| Methode | URL               | Body                  | Response           |
|---------|-------------------|-----------------------|--------------------|
| GET     | /api/players      | -                     | PlayerResponse[]   |
| POST    | /api/players      | { name }              | PlayerResponse (201)|
| PUT     | /api/players/{id} | { name }              | PlayerResponse     |
| DELETE  | /api/players/{id} | -                     | 204                |

### Seasons - /api/seasons
| Methode | URL                      | Body             | Response              |
|---------|--------------------------|------------------|-----------------------|
| GET     | /api/seasons             | -                | SeasonResponse[]      |
| POST    | /api/seasons             | { name, year }   | SeasonResponse (201)  |
| PUT     | /api/seasons/{id}        | { name, year }   | SeasonResponse        |
| DELETE  | /api/seasons/{id}        | -                | 204                   |
| GET     | /api/seasons/{id}/stats  | -                | SeasonPlayerStats[]   |

### Game Days - /api/seasons/{seasonId}/gamedays + /api/gamedays/{id}
| Methode | URL                              | Body                      | Response             |
|---------|----------------------------------|---------------------------|----------------------|
| GET     | /api/seasons/{sid}/gamedays      | -                         | GameDayResponse[]    |
| POST    | /api/seasons/{sid}/gamedays      | { date, label, location } | GameDayResponse (201)|
| GET     | /api/gamedays/{id}               | -                         | GameDayResponse      |
| PUT     | /api/gamedays/{id}               | { date?, label?, location? } | GameDayResponse    |
| PUT     | /api/gamedays/{id}/players       | { playerIds: [] }         | GameDayResponse      |
| GET     | /api/gamedays/{id}/stats         | -                         | GameDayPlayerStats[] |
| DELETE  | /api/gamedays/{id}               | -                         | 204                  |

### Games - /api/games/{id}
| Methode | URL                              | Body                                                         | Response              |
|---------|----------------------------------|--------------------------------------------------------------|-----------------------|
| GET     | /api/games/{id}/lineup           | -                                                            | LineupEntryResponse[] |
| PUT     | /api/games/{id}/lineup           | [{ playerId, position, battingOrder, dhBatterPlayerId? }]    | LineupEntryResponse[] |
| PUT     | /api/games/{id}/opponent         | { opponentTeamId }                                           | GameResponse          |
| PUT     | /api/games/{id}/score            | { scoreUs, scoreThem }                                       | GameResponse          |
| GET     | /api/games/{id}/staff            | -                                                            | GameStaffResponse[]   |
| PUT     | /api/games/{id}/staff            | [{ playerId, role }]                                         | GameStaffResponse[]   |
| POST    | /api/games/{id1}/swap/{id2}      | -                                                            | GameResponse[2]       |

### League Teams - /api/seasons/{seasonId}/teams + /api/teams/{id}
| Methode | URL                              | Body                    | Response               |
|---------|----------------------------------|-------------------------|------------------------|
| GET     | /api/seasons/{sid}/teams         | -                       | LeagueTeamResponse[]   |
| POST    | /api/seasons/{sid}/teams         | { name, ownTeam? }      | LeagueTeamResponse (201)|
| PUT     | /api/teams/{id}                  | { name, ownTeam? }      | LeagueTeamResponse     |
| DELETE  | /api/teams/{id}                  | -                       | 204                    |
| GET     | /api/seasons/{sid}/standings     | -                       | StandingsEntry[]       |

### League Results - /api/seasons/{seasonId}/results + /api/results/{id}
| Methode | URL                              | Body                                                    | Response               |
|---------|----------------------------------|---------------------------------------------------------|------------------------|
| GET     | /api/seasons/{sid}/results       | -                                                       | LeagueResultResponse[] |
| POST    | /api/seasons/{sid}/results       | { homeTeamId, awayTeamId, homeScore, awayScore, date? } | LeagueResultResponse (201)|
| PUT     | /api/results/{id}                | { homeTeamId, awayTeamId, homeScore, awayScore, date? } | LeagueResultResponse   |
| DELETE  | /api/results/{id}                | -                                                       | 204                    |

### Cars (Fahrgemeinschaften) - /api/gamedays/{gameDayId}/cars + /api/cars/{id}
| Methode | URL                                    | Body                                         | Response        |
|---------|----------------------------------------|----------------------------------------------|-----------------|
| GET     | /api/gamedays/{gdId}/cars              | -                                            | CarResponse[]   |
| POST    | /api/gamedays/{gdId}/cars              | { driverPlayerId, totalSeats, direction }    | CarResponse (201)|
| PUT     | /api/gamedays/{gdId}/cars/{carId}      | { totalSeats?, direction? }                  | CarResponse     |
| DELETE  | /api/cars/{carId}                      | -                                            | 204             |

### Daten Export/Import - /api/data
| Methode | URL              | Body        | Response       |
|---------|------------------|-------------|----------------|
| GET     | /api/data/export | -           | DataExport     |
| POST    | /api/data/import | DataExport  | 201            |

---

## Business-Validierung

### Lineup-Validierung (LineupService)
- Max 10 Spieler pro Game (9 Feld + optional EH)
- Keine doppelten Spieler im selben Game
- Keine doppelte Batting Order
- Batting Order muss sequenziell sein (1, 2, 3, ...)
- Position darf null sein (Spieler ohne Position = nur Schlagreihenfolge)
- Wenn Position gesetzt: muss gueltig sein (P, C, 1B, 2B, 3B, SS, LF, CF, RF, EH)
- Keine doppelten Feldpositionen (EH darf mehrfach vorkommen, null wird ignoriert)
- DH-Batter nur bei Feldpositionen erlaubt (nicht bei EH, nicht bei null)
- DH-Batter darf nicht selbst im Lineup sein
- Maximal 1 DH-Batter pro Lineup
- DH-Batter muss am Spieltag verfuegbar sein
- Spieler darf nicht gleichzeitig als Base Coach eingetragen sein
- Spieler muss am Spieltag als verfuegbar markiert sein

### Car-Validierung
- Fahrer muss in den availablePlayers des GameDay sein
- Fahrer darf nicht schon Fahrer eines anderen Autos am selben GameDay sein
- totalSeats >= 2, <= 9

### LeagueTeam-Validierung
- Name darf nicht leer sein
- Name muss in der Season eindeutig sein (case-insensitive)

### Score-Validierung (GameService)
- scoreUs und scoreThem muessen beide gesetzt oder beide null sein
- Scores >= 0

### Opponent-Validierung (GameService)
- opponentTeamId muss existieren (sonst 404)
- Team darf nicht das eigene Team sein (ownTeam=true -> 400)
- Team muss zur selben Saison gehoeren wie das Game (sonst 400)
- null setzt den Gegner zurueck

### LeagueResult-Validierung (LeagueResultService)
- homeTeamId und awayTeamId muessen unterschiedlich sein
- Beide Teams muessen zur selben Season gehoeren
- Weder homeTeam noch awayTeam darf ownTeam=true sein (eigene Ergebnisse kommen aus Game)
- Scores >= 0

### Team-Loeschung Cascade
- Eigenes Team (ownTeam=true) kann nicht geloescht werden (400)
- Wenn ein Team geloescht wird: alle Games mit diesem Team als Gegner -> opponentTeam auf null
- Wenn ein Team geloescht wird: alle LeagueResults wo das Team beteiligt ist -> loeschen

### Season-Erstellung
- Beim Erstellen einer Season wird automatisch ein eigenes Team "Dead Sox" (ownTeam=true) angelegt
- Der Name ist vorerst hardcoded (SeasonService.OWN_TEAM_NAME), spaeter konfigurierbar

### Cascade bei Spieler-Entfernung (AvailabilityService.setAvailablePlayers)
Wenn ein Spieler aus der Verfuegbarkeitsliste entfernt wird, wird er automatisch aus allen Games des Spieltags bereinigt:
- LineupEntry loeschen wo der Spieler eingetragen ist
- dhBatterPlayer auf null setzen wo der Spieler als DH-Batter zugewiesen war
- GameStaff loeschen wo der Spieler als Coach eingetragen ist
- Batting Order der verbleibenden Lineup-Eintraege pro Game neu durchnummerieren (keine Luecken)
- Wenn der Spieler Fahrer eines Autos ist: ganzes Auto loeschen

### Swap-Validierung (POST /api/games/{id1}/swap/{id2})
- Beide gameIds muessen existieren (sonst 404)
- gameId1 ≠ gameId2 (sonst 400)
- Beide Games muessen zum selben GameDay gehoeren (sonst 400)
- Tauscht atomar: Lineup-Eintraege, Staff-Eintraege, Opponent-Team und Scores

### Staff-Validierung (GameStaffService)
- Max 2 Base Coaches pro Game
- Keine doppelten Spieler
- Keine doppelte Rolle
- Rolle muss gueltig sein (BASE_COACH_1ST, BASE_COACH_3RD)
- Spieler darf nicht gleichzeitig im Lineup sein

---

## Fehlerbehandlung (GlobalExceptionHandler)

| Exception                    | HTTP Status | Wann                          |
|------------------------------|-------------|-------------------------------|
| ResourceNotFoundException    | 404         | Spieler/Saison/Spieltag/Game nicht gefunden |
| LineupValidationException    | 400         | Business-Validierung fehlgeschlagen |
| IllegalArgumentException     | 400         | Ungueltige Argumente          |
| MethodArgumentNotValidException | 400      | Bean Validation (@NotBlank etc.) |

Alle Exceptions werden als WARN geloggt (SLF4J).

Response-Format:
```json
{ "error": "Fehlermeldung", "timestamp": "2026-03-06T16:00:00Z" }
```

---

## Logging

Sinnvolles Logging an wichtigen Stellen (SLF4J):

| Klasse | Level | Was wird geloggt |
|--------|-------|------------------|
| GlobalExceptionHandler | WARN | Alle abgefangenen Fehler (404, 400, Validierung) |
| GameDayService | INFO | Spieltag erstellen, Loeschen |
| AvailabilityService | INFO | Spieler setzen, Cascade-Bereinigung |
| LineupService | INFO | Lineup setzen (Game-ID, Anzahl Eintraege) |
| GameStaffService | INFO | Staff setzen (Game-ID, Anzahl Eintraege) |
| GameService | INFO | Swap Games |
| DataExportService | INFO | Export Start + Ende mit Anzahlen |
| DataImportService | INFO | Import Start + Ende mit Anzahlen |

Kein Logging in einfachen Gettern — Fehler dort werden ueber den ExceptionHandler geloggt.

---

## Response-Formate (DTOs)

### GameDayResponse
```json
{
  "id": 1,
  "date": "2026-03-15",
  "label": "Spieltag 1",
  "location": "Berlin Tegel",
  "seasonId": 1,
  "availablePlayers": [
    { "id": 1, "name": "Max" },
    { "id": 2, "name": "Lisa" }
  ],
  "games": [
    { "id": 1, "gameNumber": 1, "opponentTeam": { "id": 1, "name": "Berlin Bears", "ownTeam": false }, "scoreUs": 12, "scoreThem": 8, "gameDayId": 1 },
    { "id": 2, "gameNumber": 2, "opponentTeam": null, "scoreUs": null, "scoreThem": null, "gameDayId": 1 },
    { "id": 3, "gameNumber": 3, "opponentTeam": null, "scoreUs": null, "scoreThem": null, "gameDayId": 1 }
  ]
}
```

### LineupEntryResponse
```json
{
  "id": 1,
  "player": { "id": 1, "name": "Max" },
  "position": "SS",
  "battingOrder": 1,
  "dhBatterPlayer": { "id": 5, "name": "Tom" }
}
```
`dhBatterPlayer` ist `null` wenn kein DH-Batter zugewiesen ist.

### GameDayPlayerStats (Live-Zaehler)
```json
{
  "playerId": 1,
  "playerName": "Max",
  "gameCount": 1.5,
  "positions": [
    { "gameNumber": 1, "position": "SS" },
    { "gameNumber": 2, "position": "EH" }
  ]
}
```
DH-Batter tauchen ebenfalls in den Stats auf mit Position "DH" und 0.5 Spielgewichtung.

### SeasonPlayerStats
```json
{
  "playerId": 1,
  "playerName": "Max",
  "totalGames": 4.5,
  "positionCounts": { "SS": 3, "EH": 1, "DH": 1 }
}
```

### CarResponse
```json
{
  "id": 1,
  "driver": { "id": 5, "name": "Hung" },
  "totalSeats": 5,
  "direction": "both",
  "gameDayId": 10
}
```
`direction` ist "both", "there" oder "back".

### LeagueTeamResponse
```json
{ "id": 1, "name": "Dead Sox", "ownTeam": true }
```

### StandingsEntry
```json
{
  "team": { "id": 1, "name": "Dead Sox", "ownTeam": true },
  "games": 6,
  "wins": 5,
  "losses": 1,
  "ties": 0,
  "winPct": 0.833,
  "runsScored": 72,
  "runsAgainst": 41,
  "runDiff": 31
}
```
Sortierung: Win% absteigend, dann runDiff absteigend.
Berechnung aus zwei Quellen:
1. **Eigene Spiele (Game):** ownTeam sieht alle Games mit Gegner+Score. Andere Teams: nur Games wo sie als Gegner eingetragen sind (Scores invertiert).
2. **Liga-Ergebnisse (LeagueResult):** Nur zwischen Nicht-ownTeam Teams. Jedes Team sieht Spiele wo es home oder away ist.

### LeagueResultResponse
```json
{
  "id": 1,
  "homeTeam": { "id": 2, "name": "Aachen Barons", "ownTeam": false },
  "awayTeam": { "id": 3, "name": "Bottrop Bulls", "ownTeam": false },
  "homeScore": 8,
  "awayScore": 2,
  "date": "2026-03-15"
}
```
Nur fuer Spiele zwischen Nicht-ownTeam Teams. Eigene Ergebnisse kommen aus Game.

### DataExport (Export/Import)
```json
{
  "players": [
    { "id": 1, "name": "Max" },
    { "id": 2, "name": "Lisa" }
  ],
  "seasons": [
    {
      "id": 1, "name": "Saison 2026", "year": 2026,
      "gameDays": [
        {
          "date": "2026-03-15", "label": "Spieltag 1", "location": "Berlin Tegel",
          "availablePlayerIds": [1, 2],
          "games": [
            {
              "gameNumber": 1, "opponentTeamName": "Berlin Bears",
              "scoreUs": 12, "scoreThem": 8,
              "lineup": [
                { "playerId": 1, "position": "SS", "battingOrder": 1, "dhBatterPlayerId": 5 },
                { "playerId": 2, "position": "EH", "battingOrder": 2, "dhBatterPlayerId": null }
              ],
              "staff": [
                { "playerId": 3, "role": "BASE_COACH_1ST" }
              ]
            }
          ],
          "cars": [
            { "driverPlayerId": 1, "totalSeats": 5, "direction": "both" }
          ]
        }
      ],
      "leagueResults": [
        { "homeTeamName": "Aachen Barons", "awayTeamName": "Bottrop Bulls", "homeScore": 8, "awayScore": 2, "date": "2026-03-15" }
      ]
    }
  ]
}
```
Beim Import werden LeagueTeams automatisch aus den `opponentTeamName`-Werten erstellt.

---

## Service-Uebersicht

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              CONTROLLER-SCHICHT                                  │
│  PlayerCtrl  SeasonCtrl  GameDayCtrl  GameCtrl  CarCtrl  LeagueTeamCtrl  DataExportCtrl
└──────┬──────────┬────────────┬───────────┬─────────┬──────────┬──────────────┬───┘
       │          │            │           │         │          │              │
       v          v            v           v         v          v              v
┌──────────┐ ┌────────┐ ┌──────────┐ ┌──────────────────────────┐ ┌────────┐ ┌────────────────────────┐
│Player    │ │Season  │ │GameDay   │ │  GameCtrl nutzt 3 Services│ │Car     │ │DataExport / DataImport │
│Service   │ │Service │ │Service   │ │                          │ │Service │ │Service     Service     │
│          │ │        │ │          │ │  GameService             │ │        │ │                        │
│          │ │        │ │ create() │ │    updateOpponent()      │ │        │ │  exportAll()           │
│          │ │        │ │ update() │ │    setScore()            │ │        │ │  importAll()           │
│          │ │        │ │ delete() │ │    swapGames()           │ │        │ │                        │
│          │ │        │ │ getStats │ │                          │ │        │ └────────────────────────┘
│          │ │        │ │          │ │  LineupService           │ │        │
│          │ │        │ │ delegiert│ │    getLineup()           │ │        │ ┌────────────────────────┐
│          │ │        │ │ an:      │ │    setLineup() + Validierung       │ │LeagueTeamService       │
│          │ │        │ │          │ │                          │ │        │ │  CRUD, Standings       │
│          │ │        │ │Availabil.│ │  GameStaffService        │ │        │ └────────────────────────┘
│          │ │        │ │Service   │ │    getStaff()            │ │        │
│          │ │        │ │          │ │    setStaff() + Validierung         │ ┌────────────────────────┐
│          │ │        │ │          │ │                          │ │        │ │StatsService            │
│          │ │        │ │          │ └──────────────────────────┘ │        │ │  Saison-Stats          │
└──────────┘ └────────┘ └──────────┘                              └────────┘ └────────────────────────┘
       │          │            │                   │                  │              │
       v          v            v                   v                  v              v
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              REPOSITORY-SCHICHT                                      │
│  PlayerRepo  SeasonRepo  GameDayRepo  GameRepo  LineupEntryRepo  GameStaffRepo       │
│  CarRepo  LeagueTeamRepo                                                             │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Service-Abhaengigkeiten

```
PlayerService ──> PlayerRepository

SeasonService ──> SeasonRepository

GameDayService ──> GameDayRepository
               ──> LineupEntryRepository (fuer Stats)
               ──> SeasonService
               ──> AvailabilityService (delegiert Verfuegbarkeit)

AvailabilityService ──> GameDayRepository
                    ──> PlayerRepository
                    ──> LineupEntryRepository
                    ──> GameStaffRepository
                    ──> CarRepository

GameService ──> GameRepository
            ──> LineupEntryRepository (fuer Swap)
            ──> GameStaffRepository (fuer Swap)
            ──> LeagueTeamService

LineupService ──> GameRepository
              ──> LineupEntryRepository
              ──> GameStaffRepository (Conflict-Check)
              ──> PlayerRepository

GameStaffService ──> GameRepository
                 ──> GameStaffRepository
                 ──> LineupEntryRepository (Conflict-Check)
                 ──> PlayerRepository

CarService ──> CarRepository
           ──> GameDayRepository
           ──> PlayerRepository

LeagueTeamService ──> LeagueTeamRepository
                  ──> GameRepository
                  ──> LeagueResultRepository
                  ──> SeasonService

LeagueResultService ──> LeagueResultRepository
                    ──> LeagueTeamService
                    ──> SeasonService

StatsService ──> SeasonRepository
             ──> LineupEntryRepository

DataExportService ──> PlayerRepository, SeasonRepository, GameDayRepository,
                      LineupEntryRepository, GameStaffRepository, CarRepository,
                      LeagueResultRepository (nur lesen)

DataImportService ──> alle 9 Repositories (nur schreiben)
```

### Ablauf: Spieltag planen (typischer Workflow)

```
1. Saison anlegen
   POST /api/seasons { name, year }
   └──> SeasonService.create()
        └──> seasonRepository.save()

2. Spieltag anlegen (erzeugt automatisch 3 Games)
   POST /api/seasons/{id}/gamedays { date, label, location }
   └──> GameDayService.create()
        ├──> seasonService.findById()
        ├──> new GameDay + 3x new Game
        └──> gameDayRepository.save()

3. Verfuegbare Spieler eintragen
   PUT /api/gamedays/{id}/players { playerIds: [1, 2, 3, ...] }
   └──> GameDayService.setAvailablePlayers()
        └──> AvailabilityService.setAvailablePlayers()
             ├──> playerRepository.findAllById()
             ├──> cascadeRemovePlayers() (falls Spieler entfernt)
             └──> gameDayRepository.save()

4. Lineup pro Game setzen (3x fuer jedes Game)
   PUT /api/games/{id}/lineup [{ playerId, position, battingOrder, dhBatterPlayerId? }, ...]
   └──> LineupService.setLineup()
        ├──> validate()
        │    ├──> Max 10 Spieler?
        │    ├──> Keine doppelten Spieler?
        │    ├──> Batting Order sequenziell?
        │    ├──> Positionen gueltig?
        │    ├──> Keine doppelten Feldpositionen?
        │    ├──> DH-Batter nur fuer Feldspieler?
        │    ├──> DH-Batter nicht im Lineup?
        │    ├──> Max 1 DH-Batter?
        │    ├──> DH-Batter verfuegbar?
        │    ├──> Nicht gleichzeitig Coach?
        │    └──> Spieler verfuegbar am Spieltag?
        ├──> lineupEntryRepository.deleteByGameId()
        └──> lineupEntryRepository.save() (pro Eintrag)

5. Base Coaches setzen (optional pro Game)
   PUT /api/games/{id}/staff [{ playerId, role }, ...]
   └──> GameStaffService.setStaff()
        ├──> validate()
        │    ├──> Max 2 Coaches?
        │    ├──> Keine doppelten Spieler/Rollen?
        │    ├──> Rollen gueltig?
        │    └──> Nicht gleichzeitig im Lineup?
        ├──> gameStaffRepository.deleteByGameId()
        └──> gameStaffRepository.save() (pro Eintrag)

6. Live-Zaehler abrufen (nach jedem Lineup-Update)
   GET /api/gamedays/{id}/stats
   └──> GameDayService.getStats()
        ├──> Alle verfuegbaren Spieler laden
        ├──> Alle 3 Games + deren Lineups laden
        ├──> Pro Spieler: Einsaetze zaehlen
        │    ├──> Feldposition = 1.0 Spiel
        │    ├──> EH = 0.5 Spiel
        │    └──> DH-Batter = 0.5 Spiel
        └──> Sortiert nach gameCount aufsteigend
             (wenigste Einsaetze zuerst = wer muss noch spielen)
```

### Stats-Berechnung im Detail

```
Beispiel: Spieltag mit 3 Games, Max spielt in Game 1 + 2, Tom ist DH-Batter in Game 3

  Game 1: Max = SS  (1.0)    Lisa = EH (0.5)    Tom = nicht dabei (0.0)
  Game 2: Max = P   (1.0)    Lisa = CF (1.0)    Tom = EH          (0.5)
  Game 3: Max = -   (0.0)    Lisa = -  (0.0)    Tom = DH-Batter   (0.5)
  ─────────────────────────────────────────────────────────────────────
  Summe:  Max = 2.0           Lisa = 1.5          Tom = 1.0

  Sortierung (aufsteigend): Tom (1.0) -> Lisa (1.5) -> Max (2.0)

  Ergebnis fuer Max:
  {
    "playerName": "Max",
    "gameCount": 2.0,
    "positions": [
      { "gameNumber": 1, "position": "SS" },
      { "gameNumber": 2, "position": "P" }
    ]
  }

  Ergebnis fuer Tom (DH-Batter):
  {
    "playerName": "Tom",
    "gameCount": 1.0,
    "positions": [
      { "gameNumber": 2, "position": "EH" },
      { "gameNumber": 3, "position": "DH" }
    ]
  }
```

### Saison-Stats (ueber alle Spieltage)

```
  Spieltag 1: Max = 2.0   Lisa = 1.5
  Spieltag 2: Max = 1.0   Lisa = 2.5
  ──────────────────────────────────────
  Saison:     Max = 3.0   Lisa = 4.0

  Sortierung (absteigend): Lisa (4.0) -> Max (3.0)
  + positionCounts: { "SS": 2, "P": 1, "EH": 1, "DH": 1 }
```

---

## Migration zu PostgreSQL

### 1. Daten exportieren (mit H2)
```bash
curl http://localhost:8080/api/data/export > backup.json
```

### 2. pom.xml anpassen
```xml
<!-- H2 nur noch fuer Tests -->
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>

<!-- PostgreSQL hinzufuegen -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

### 3. application.properties anpassen
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/softball
spring.datasource.username=softball
spring.datasource.password=deinpasswort
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.hibernate.ddl-auto=update
```

### 4. PostgreSQL Datenbank anlegen
```bash
sudo -u postgres psql
CREATE USER softball WITH PASSWORD 'deinpasswort';
CREATE DATABASE softball OWNER softball;
```

### 5. App starten und Daten importieren
```bash
mvn spring-boot:run -s settings-local.xml
curl -X POST http://localhost:8080/api/data/import \
  -H "Content-Type: application/json" -d @backup.json
```

Hibernate erstellt die Tabellen automatisch. IDs werden neu vergeben, Referenzen intern korrekt gemappt. Statistiken funktionieren sofort, da sie live berechnet werden.

---

## Tests (82 Tests)

### Unit Tests (14)
| Klasse | Tests | Testet |
|--------|-------|--------|
| PlayerServiceTest | 7 | CRUD, ResourceNotFoundException |
| GameDayServiceTest | 5 | Erstellen mit 3 Games + Location, Stats (EH=0.5, DH-Batter=0.5, Sortierung) |
| StatsServiceTest | 2 | Saison-Aggregation, leere Saison |

### Integration Tests (68)
| Klasse | Tests | Testet |
|--------|-------|--------|
| PlayerIntegrationTest | 3 | REST CRUD ueber MockMvc |
| GameDayIntegrationTest | 6 | Create, Update, Spieler setzen, Stats, Delete, Opponent |
| LineupIntegrationTest | 27 | Set/Get Lineup+Staff, Replace, DH-Batter, Swap, Cascade, Nullable Position, Validierung |
| CarIntegrationTest | 7 | CRUD Cars, Cascade bei Fahrer-Entfernung, Validierung |
| LeagueTeamIntegrationTest | 15 | CRUD Teams, Standings, Score, Cascade, Cross-Season, OwnTeam-Schutz, Auto-Create |
| SeasonStatsIntegrationTest | 2 | Saison-Stats ueber mehrere Spieltage |
| LeagueResultIntegrationTest | 6 | CRUD, Standings mit LeagueResults, Validierung, Cascade, Cross-Season |
| DataExportIntegrationTest | 2 | Export->Import Round-Trip, leere DB |

### Maven Testaufruf
```bash
mvn test -s settings-local.xml
```
