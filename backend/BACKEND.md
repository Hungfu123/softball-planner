# Backend — Softball Lineup Planner

Spring Boot REST API fuer den Softball Lineup Planner.

## Tech Stack

- Java 21, Spring Boot 3.4.3, Spring Data JPA
- H2 embedded (file-basiert, persistiert zwischen Neustarts)
- Keine Authentifizierung (lokale Nutzung)

## Starten

```bash
cd backend
./mvnw spring-boot:run
```

Laeuft auf `http://localhost:8080`.

> Hinweis: `~/.m2/settings.xml` zeigt auf Corporate Nexus. Fuer private Builds:
> `./mvnw spring-boot:run -s .mvn/local-settings.xml`

## Datenmodell

```
Player        — id, name (global, saisonuebergreifend)
Season        — id, name, year
GameDay       — id, seasonId, date, label, location, availablePlayers[]
Game          — id, gameDayId, gameNumber, opponent
LineupEntry   — id, gameId, playerId, position, battingOrder, dhBatterPlayerId
GameStaff     — id, gameId, playerId, role
```

### Beziehungen
- Season 1:n GameDay
- GameDay n:m Player (verfuegbare Spieler)
- GameDay 1:n Game (automatisch beim Erstellen angelegt)
- Game 1:n LineupEntry (max 10)
- Game 1:n GameStaff (max 2: BASE_COACH_1ST, BASE_COACH_3RD)

### Positionen
- Feld: P, C, 1B, 2B, 3B, SS, LF, CF, RF
- Extra: EH (Extra Hitter)
- DH: Annotation auf Feldspieler-Entry (dhBatterPlayerId)

## API Endpoints

### Players `/api/players`

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| GET | `/api/players` | Alle Spieler |
| POST | `/api/players` | Spieler anlegen `{ name }` |
| PUT | `/api/players/{id}` | Spieler umbenennen `{ name }` |
| DELETE | `/api/players/{id}` | Spieler loeschen |

### Seasons `/api/seasons`

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| GET | `/api/seasons` | Alle Saisons |
| POST | `/api/seasons` | Saison anlegen `{ name, year }` |
| PUT | `/api/seasons/{id}` | Saison bearbeiten `{ name, year }` |
| DELETE | `/api/seasons/{id}` | Saison loeschen (kaskadiert) |
| GET | `/api/seasons/{id}/stats` | Saison-Statistiken |

### Game Days

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| GET | `/api/seasons/{seasonId}/gamedays` | Spieltage einer Saison |
| POST | `/api/seasons/{seasonId}/gamedays` | Spieltag anlegen `{ date, label, location }` |
| GET | `/api/gamedays/{id}` | Einzelnen Spieltag laden |
| PUT | `/api/gamedays/{id}` | Spieltag bearbeiten `{ date, label, location }` |
| DELETE | `/api/gamedays/{id}` | Spieltag loeschen (kaskadiert) |
| PUT | `/api/gamedays/{id}/players` | Verfuegbare Spieler setzen `{ playerIds }` |
| GET | `/api/gamedays/{id}/stats` | Spieltag-Statistiken |

### Games `/api/games`

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| PUT | `/api/games/{id}/opponent` | Gegner setzen `{ opponent }` |
| GET | `/api/games/{id}/lineup` | Lineup laden |
| PUT | `/api/games/{id}/lineup` | Lineup speichern `[{ playerId, position, battingOrder, dhBatterPlayerId }]` |
| GET | `/api/games/{id}/staff` | Staff laden |
| PUT | `/api/games/{id}/staff` | Staff setzen `[{ playerId, role }]` |
| POST | `/api/games/{id1}/swap/{id2}` | Lineups zweier Spiele tauschen (atomar) |

### Data Export/Import `/api/data`

| Methode | Endpoint | Beschreibung |
|---------|----------|-------------|
| GET | `/api/data/export` | Gesamte DB als JSON |
| POST | `/api/data/import` | JSON-Backup importieren |

## Validierungen

- Max 10 Spieler pro Lineup
- Keine doppelten Spieler oder Positionen im Lineup
- Feldpositionen nur einmal vergebar (EH darf mehrfach)
- Batting Order muss sequenziell sein (1, 2, 3, ...)
- Max 1 DH pro Lineup, nur fuer Feldspieler
- DH-Batter darf nicht selbst im Lineup sein
- Max 2 Coaches, keine doppelten Rollen
- Spieler duerfen nicht gleichzeitig Lineup + Staff sein
- Spieler muessen am Spieltag verfuegbar sein
- Swap nur zwischen Spielen desselben Spieltags
