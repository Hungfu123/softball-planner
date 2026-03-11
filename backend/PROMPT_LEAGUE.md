# Backend: League Teams & Game Results

## Überblick

Teams werden pro Saison als `LeagueTeam` verwaltet. Das `opponent` Feld in `Game` wechselt von String zu einer Referenz auf `LeagueTeam`. Zusätzlich kommen Score-Felder auf `Game` für Spielergebnisse.

## 1. Neue Entity: `LeagueTeam`

```java
@Entity
@Table(name = "league_teams",
    uniqueConstraints = @UniqueConstraint(columnNames = {"season_id", "name"}))
public class LeagueTeam {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Column(nullable = false)
    private String name;

    // true = das eigene Team (max 1 pro Season)
    private boolean ownTeam = false;
}
```

## 2. Entity `Game` ändern

### Opponent: String → LeagueTeam Referenz

```java
// ALT:
// private String opponent;

// NEU:
@ManyToOne(fetch = EAGER)
@JoinColumn(name = "opponent_team_id")
private LeagueTeam opponentTeam; // nullable — kein Gegner zugewiesen
```

### Score-Felder hinzufügen

```java
private Integer scoreUs;    // nullable — noch kein Ergebnis
private Integer scoreThem;  // nullable
```

### Migration der bestehenden Daten
- Für jedes Game mit einem nicht-leeren `opponent` String:
  1. LeagueTeam mit dem Namen suchen/erstellen (in der Season des GameDay)
  2. `opponentTeam` setzen
- Danach `opponent` String-Spalte entfernen

## 3. DTOs anpassen

### GameResponse erweitern
```java
public record GameResponse(
    Long id,
    int gameNumber,
    LeagueTeamResponse opponentTeam,  // war: String opponent
    Integer scoreUs,                   // NEU
    Integer scoreThem,                 // NEU
    Long gameDayId
) {}
```

### LeagueTeamResponse (neu)
```java
public record LeagueTeamResponse(
    Long id,
    String name,
    boolean ownTeam
) {}
```

### UpdateGameRequest anpassen
```java
// ALT: opponent String
// NEU:
public record UpdateGameRequest(
    Long opponentTeamId  // nullable — null entfernt den Gegner
) {}
```

### SetGameScoreRequest (neu)
```java
public record SetGameScoreRequest(
    Integer scoreUs,    // nullable — null löscht das Ergebnis
    Integer scoreThem
) {}
```

## 4. API Endpoints

### LeagueTeam CRUD

| Method | Path | Beschreibung |
|--------|------|-------------|
| GET | `/api/seasons/{seasonId}/teams` | Alle Teams einer Saison |
| POST | `/api/seasons/{seasonId}/teams` | Team erstellen |
| PUT | `/api/teams/{teamId}` | Team umbenennen |
| DELETE | `/api/teams/{teamId}` | Team löschen |

#### POST /api/seasons/{seasonId}/teams
Request:
```json
{ "name": "Bömmelbros" }
```
Response:
```json
{ "id": 1, "name": "Bömmelbros", "ownTeam": false }
```

Validierung:
- Name darf nicht leer sein
- Name muss in der Season eindeutig sein (case-insensitive)

#### DELETE /api/teams/{teamId}
- Wenn ein Team gelöscht wird: alle Games die dieses Team als Gegner haben → opponentTeam auf null setzen
- Response: 204

### Opponent setzen (bestehender Endpoint anpassen)

#### PUT /api/games/{gameId}/opponent
Request:
```json
{ "opponentTeamId": 1 }
```
oder zum Entfernen:
```json
{ "opponentTeamId": null }
```
Response: aktualisiertes GameResponse

### Score setzen (neuer Endpoint)

#### PUT /api/games/{gameId}/score
Request:
```json
{ "scoreUs": 12, "scoreThem": 8 }
```
oder zum Löschen:
```json
{ "scoreUs": null, "scoreThem": null }
```
Response: aktualisiertes GameResponse

Validierung:
- Beide Felder müssen entweder gesetzt oder beide null sein
- Scores >= 0

### Liga-Tabelle berechnen (neuer Endpoint)

#### GET /api/seasons/{seasonId}/standings
Response:
```json
[
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
  },
  {
    "team": { "id": 2, "name": "Bömmelbros", "ownTeam": false },
    "games": 0,
    "wins": 0,
    "losses": 0,
    "ties": 0,
    "winPct": 0.0,
    "runsScored": 0,
    "runsAgainst": 0,
    "runDiff": 0
  }
]
```

Berechnung für das eigene Team (ownTeam=true):
- Aus allen Games die einen Gegner UND Score haben
- Win: scoreUs > scoreThem
- Loss: scoreUs < scoreThem
- Tie: scoreUs == scoreThem
- RS = Summe aller scoreUs
- RA = Summe aller scoreThem

Berechnung für andere Teams:
- Aus allen Games wo das Team als opponentTeam gesetzt ist UND Score vorhanden
- Win/Loss ist invertiert (scoreThem > scoreUs = Win für den Gegner)
- RS = Summe aller scoreThem (aus Sicht des Gegners)
- RA = Summe aller scoreUs

Sortierung: Win% absteigend, dann runDiff absteigend

## 5. Season Entity erweitern

In `Season.java`:
```java
@OneToMany(mappedBy = "season", cascade = CascadeType.ALL, orphanRemoval = true)
@JsonIgnore
private List<LeagueTeam> leagueTeams = new ArrayList<>();
```

## 6. DataExport erweitern

### LeagueTeam im Export
```java
public record LeagueTeamExport(
    String name,
    boolean ownTeam
) {}
```

Im SeasonExport: `List<LeagueTeamExport> leagueTeams`

### Game Export erweitern
- `opponentTeamName` (String, statt opponent)
- `scoreUs` (Integer, nullable)
- `scoreThem` (Integer, nullable)

Beim Import: opponentTeamName → LeagueTeam suchen/erstellen

## 7. Swap-Endpoint anpassen

`POST /api/games/{id1}/swap/{id2}` — muss jetzt auch `opponentTeam`, `scoreUs`, `scoreThem` mittauschen (statt nur opponent String).
