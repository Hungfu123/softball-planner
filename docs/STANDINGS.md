# Standings / Liga-Tabelle

Liga-Tabelle aggregiert aus zwei Quellen:
1. **Eigene Spiele** (`Game` rows in `GameDay`) wo ownTeam = "Dead Sox" beteiligt.
2. **`LeagueResult` rows** für Spiele zwischen anderen Teams (non-ownTeam vs non-ownTeam).

## Routes
- `/league` — Tabellen-View (Saison-spezifisch)
- Manuelle LeagueResult-Eingabe für Fremdspiele
- Auto-Senden via Spielbogen → `registerSpielbogenLeagueResult`

## Backend Files
- `application/LeagueTeamService.java` — Team-CRUD
- `application/LeagueResultService.java` — Result-CRUD (manuell)
- `application/SpielbogenScoringService.registerSpielbogenLeagueResult` — auto-konvertiert Spielbogen → LeagueResult
- `domain/service/StandingsCalculator.java` — pure Berechnung
- `domain/model/LeagueTeam.java`, `LeagueResult.java`

## Domain-Regeln
- **ownTeam-Regel:**
  - `ownTeam` ("Dead Sox") **kann nicht gelöscht** werden
  - `ownTeam` **kann NIEMALS** in `LeagueResult` als Team-A oder Team-B vorkommen (eigene Spiele werden über `Game` getrackt)
  - Validation in `LeagueResultService` blockt das.
- **Spielbogen-Auto-Konversion:**
  - Spielbogen mit `homeTeam=ownTeam` ODER `awayTeam=ownTeam` → wird zu `Game` in zugehöriger GameDay
  - Spielbogen ohne ownTeam → wird zu `LeagueResult`
  - Genau einmal — `bogen.leagueResultId` verhindert Doppelung
- **Standings-Berechnung** (`StandingsCalculator`):
  - Pro Team: Wins, Losses, Ties, RunsFor, RunsAgainst, Diff
  - Sort: Wins desc → Diff desc → Team-Name asc

## Frontend Files
- `components/league/LeaguePage.tsx`
- `components/league/StandingsTable.tsx`
- `components/league/LeagueResultsForm.tsx`
- `hooks/useLeague.ts` o.ä.

## Häufige Fallstricke
- **Spielbogen-Liga-Senden geht nicht zweimal**: `bogen.leagueResultId` schützt vor Doppelung. Wenn Senden fehlschlägt mit "already registered" → Bogen wurde bereits gesendet, prüfe `LeagueResult` für entsprechende Zeile.
- **ownTeam in LeagueResult**: Backend wirft `BusinessValidationException`. UI muss Auswahl von ownTeam in Result-Form blocken.
- **Saison-Filter**: Standings sind saison-spezifisch. `Game.gameDay.season` und `LeagueResult.season` müssen matchen.
