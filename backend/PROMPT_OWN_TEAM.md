# Backend: Eigenes Team automatisch bei Season-Erstellung anlegen

## Kontext

Die Liga-Tabelle (`GET /api/seasons/{seasonId}/standings`) zeigt das eigene Team nur an, wenn ein `LeagueTeam` mit `ownTeam=true` für die Saison existiert. Aktuell muss man das manuell anlegen — das soll automatisch passieren.

Die App wird vorerst nur von einem Team genutzt ("Dead Sox"). Der Team-Name ist daher hardcoded. Später kann das konfigurierbar werden.

## Änderungen

### 1. SeasonService / SeasonController: Beim Erstellen einer Season automatisch eigenes Team anlegen

Nach dem Speichern der neuen Season:

```java
LeagueTeam ownTeam = new LeagueTeam();
ownTeam.setSeason(season);
ownTeam.setName("Dead Sox");
ownTeam.setOwnTeam(true);
leagueTeamRepository.save(ownTeam);
```

### 2. Bestehende Seasons: Migration

Für alle bestehenden Seasons die noch kein `LeagueTeam` mit `ownTeam=true` haben, eins anlegen. Entweder:

**Option A: Flyway-Migration (empfohlen)**
```sql
INSERT INTO league_teams (season_id, name, own_team)
SELECT s.id, 'Dead Sox', true
FROM seasons s
WHERE NOT EXISTS (
    SELECT 1 FROM league_teams lt
    WHERE lt.season_id = s.id AND lt.own_team = true
);
```

**Option B: Manuell per SQL** — gleicher Query einmalig ausführen.

### 3. Schutz: Eigenes Team nicht löschbar

Im `DELETE /api/teams/{teamId}` Endpoint: wenn `team.isOwnTeam()` → HTTP 400 mit Fehlermeldung "Das eigene Team kann nicht gelöscht werden."

### 4. Schutz: Eigenes Team nicht als Gegner wählbar

Im `PUT /api/games/{gameId}/opponent` Endpoint: wenn die übergebene `opponentTeamId` auf ein Team mit `ownTeam=true` zeigt → HTTP 400 mit Fehlermeldung "Das eigene Team kann nicht als Gegner gesetzt werden."

Das Frontend filtert das eigene Team bereits im TeamPicker raus (`!t.ownTeam`), aber die Backend-Validierung ist trotzdem sinnvoll.

### 5. DataExport/Import

Beim Import einer Season: wenn im Export ein LeagueTeam mit `ownTeam=true` vorhanden ist, dieses importieren. Falls nicht (alter Export), automatisch eins anlegen (wie bei Season-Erstellung).
