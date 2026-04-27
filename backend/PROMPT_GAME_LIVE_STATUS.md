# Backend: Game Live-Status (OPEN / LIVE / ENDED)

## Kontext

Frontend-Dashboard zeigt Spiele eines Spieltags mit Status-Pills (OFFEN/LIVE/FERTIG). Aktuell hat das Backend keine Status-Info — `scoreUs/scoreThem` reichen nicht aus weil:
- Live-Game kann scoreUs gesetzt haben aber noch nicht beendet
- "Spiel beendet"-Klick wird aktuell nur in localStorage gespeichert (Frontend-only) → andere Geräte sehen falschen Status

## Änderungen

### 1. Domain `Game` — neues Feld `endedAt`

```java
public class Game {
    // … bestehende Felder …
    private Instant endedAt; // null = noch nicht beendet
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(final Instant endedAt) { this.endedAt = endedAt; }
}
```

### 2. JPA-Entity + Migration

```java
@Column(name = "ended_at")
private Instant endedAt;
```

Liquibase/Flyway Migration:
```sql
ALTER TABLE game ADD COLUMN ended_at TIMESTAMP NULL;
```

### 3. `GameResponse` — neue Felder `endedAt` + `atBatCount`

```java
public record GameResponse(
    Long id, Integer gameNumber, LeagueTeamResponse opponentTeam,
    Integer scoreUs, Integer scoreThem, Long gameDayId,
    int lineupEntryCount,
    Instant endedAt,        // NEU — null wenn nicht beendet
    long atBatCount         // NEU — Anzahl AtBats für Live-Detection
) {
    public static GameResponse from(final Game game, final long atBatCount) {
        return new GameResponse(
            game.getId(),
            game.getGameNumber(),
            game.getOpponentTeam() != null ? LeagueTeamResponse.from(game.getOpponentTeam()) : null,
            game.getScoreUs(),
            game.getScoreThem(),
            game.getGameDayId(),
            game.getLineupEntryCount(),
            game.getEndedAt(),
            atBatCount
        );
    }
}
```

### 4. Service-Layer — atBatCount via Repository

`AtBatRepository` erweitern (oder vorhandene Methode nutzen):
```java
long countByGameId(Long gameId);
```

Im Mapping (z.B. `GameMapper`) für jedes Game den Count abrufen.
Performance-Hinweis: Bei vielen Games auf einem Spieltag besser bulk-count via `JPQL select g.id, count(ab) from Game g left join AtBat ab on ab.gameId = g.id group by g.id` statt N+1.

### 5. Neue Endpoints

#### `POST /api/games/{id}/end`
Setzt `endedAt = Instant.now()`. Idempotent: wenn schon beendet → 200 OK ohne Änderung.

```java
@PostMapping("/{id}/end")
public ResponseEntity<GameResponse> endGame(@PathVariable Long id) {
    return ResponseEntity.ok(gameService.endGame(id));
}
```

#### `POST /api/games/{id}/reopen`
Setzt `endedAt = null`. Für Korrekturen.

```java
@PostMapping("/{id}/reopen")
public ResponseEntity<GameResponse> reopenGame(@PathVariable Long id) {
    return ResponseEntity.ok(gameService.reopenGame(id));
}
```

## Status-Semantik (Frontend-Logik)

| Bedingung                                  | Status   | Pill-Visual                        |
|--------------------------------------------|----------|------------------------------------|
| `endedAt != null`                          | FERTIG   | Cream-Pill mit ✓ + Result (Sieg/Niederlage/Fertig) |
| `endedAt == null && atBatCount > 0`        | LIVE     | Roter Pill mit Pulse-Dot + "▶ LIVE" |
| `endedAt == null && atBatCount == 0`       | OFFEN    | White-Tinted Pill "OFFEN" (neutral) |

## Aktueller Frontend-Stand (Pre-Backend)

Frontend hat bereits Pills für FERTIG/OFFEN. LIVE-State **noch nicht** weil `atBatCount` fehlt.
Workaround: localStorage-Flag `scoring-ended-${gameId}` für FERTIG-Detection auf gleichem Gerät.
Nach Backend-Deploy ersetzt.

## Live-Score-Update

`scoreUs`/`scoreThem` müssen während des Live-Spielens aktuell sein, damit Dashboard den Stand zeigt.

**Aktueller Stand**: `recordAtBat` schreibt `runsScored` ins AtBat. Backend muss sicherstellen dass `Game.scoreUs` daraus aufaddiert wird (oder live berechnet via `sum(atBat.runsScored)`).

**Empfehlung**: Live-Berechnung in `GameMapper`:
```java
int liveScoreUs = atBatRepository.sumRunsScoredByGameId(gameId);
```
So bleibt Score auch nach Undo/Korrektur korrekt — keine separate Spalte zu pflegen.

**Alternativ**: bei jedem `recordAtBat`/`updateLastBaseState`/`undoLastAtBat` Game-Score persistieren (mehr Schreibzugriffe, aber lesbar einfacher).

Frontend pollt Dashboard alle 30s (bei sichtbarem Tab) `GET /api/seasons/{id}/gamedays` damit Live-Score sichtbar bleibt. Bei WebSocket-Push (optional) kann Polling weg.

## Frontend-Migration (in separater PR)

- `GameResponse` Type um `endedAt: string \| null` + `atBatCount: number` erweitern
- `ScoringPage` "Spiel beenden"-Button ruft `POST /api/games/{id}/end` statt localStorage
- "Wieder öffnen"-Button → `POST /api/games/{id}/reopen`
- localStorage-Fallback `scoring-ended-${id}` entfernen
- `HeroNextGameDay` nutzt neue Felder statt localStorage-Check

## Acceptance

- [ ] Migration läuft sauber (lokal + Hetzner-prod)
- [ ] `GET /api/gamedays/{id}` liefert `endedAt` + `atBatCount` pro Game
- [ ] `POST /api/games/{id}/end` setzt Timestamp, gibt aktualisiertes GameResponse
- [ ] `POST /api/games/{id}/reopen` setzt zurück
- [ ] N+1 vermieden (atBatCount per Bulk-Query bei `getGameDay`)
- [ ] Bestehende Tests grün, neue Tests für end/reopen + Status-Logik
