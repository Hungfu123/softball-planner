# Backend: Liga-weite Ergebnisse (unabhängig von Spieltagen)

## Kontext

Aktuell werden Ergebnisse nur über unsere eigenen Spiele (Game-Entity, gehört zu GameDay) erfasst. Für eine vollständige Liga-Tabelle braucht man aber auch Ergebnisse zwischen anderen Teams, z.B. "Aachen vs Bottrop 5:3".

## Neue Entity: `LeagueResult`

```java
@Entity
@Table(name = "league_results")
public class LeagueResult {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @ManyToOne(fetch = EAGER)
    @JoinColumn(name = "home_team_id", nullable = false)
    private LeagueTeam homeTeam;

    @ManyToOne(fetch = EAGER)
    @JoinColumn(name = "away_team_id", nullable = false)
    private LeagueTeam awayTeam;

    @Column(nullable = false)
    private int homeScore;

    @Column(nullable = false)
    private int awayScore;

    private LocalDate date; // optional, zur Zuordnung
}
```

## DTO

```java
public record LeagueResultResponse(
    Long id,
    LeagueTeamResponse homeTeam,
    LeagueTeamResponse awayTeam,
    int homeScore,
    int awayScore,
    LocalDate date
) {}

public record CreateLeagueResultRequest(
    Long homeTeamId,
    Long awayTeamId,
    int homeScore,
    int awayScore,
    LocalDate date // optional
) {}
```

## API Endpoints

| Method | Path | Beschreibung |
|--------|------|-------------|
| GET | `/api/seasons/{seasonId}/results` | Alle Liga-Ergebnisse einer Saison |
| POST | `/api/seasons/{seasonId}/results` | Ergebnis eintragen |
| PUT | `/api/results/{resultId}` | Ergebnis bearbeiten |
| DELETE | `/api/results/{resultId}` | Ergebnis löschen |

### Validierung
- homeTeamId und awayTeamId müssen unterschiedlich sein
- Beide Teams müssen zur gleichen Season gehören
- Scores >= 0

## Standings anpassen

`GET /api/seasons/{seasonId}/standings` muss jetzt BEIDE Quellen berücksichtigen:

1. **Unsere Spiele** (Game mit opponentTeam + Score) — wie bisher
2. **Liga-Ergebnisse** (LeagueResult) — NEU

Für jedes Team:
- Spiele aus Game (für ownTeam und opponentTeam)
- Spiele aus LeagueResult (für homeTeam und awayTeam)
- Keine Doppelzählung: Wenn ein Game-Ergebnis existiert UND ein LeagueResult für die gleiche Paarung, gilt das Game-Ergebnis

### Einfachere Alternative (empfohlen für jetzt)
Da Doppelzählungen komplex sind: LeagueResult nur für Spiele nutzen die NICHT unser eigenes Team betreffen. Validierung: Weder homeTeam noch awayTeam darf ownTeam=true sein (die eigenen Ergebnisse kommen weiterhin aus Game).

## DataExport

Im SeasonExport: `List<LeagueResultExport> leagueResults`

```java
public record LeagueResultExport(
    String homeTeamName,
    String awayTeamName,
    int homeScore,
    int awayScore,
    LocalDate date
) {}
```
