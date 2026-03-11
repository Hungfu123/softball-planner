# Backend: Position im Lineup nullable machen

## Kontext

Aktuell ist `position` in `LineupEntry` ein Pflichtfeld (`nullable = false`). Das Frontend will aber Spieler in der Schlagreihenfolge speichern, BEVOR alle Positionen zugewiesen sind. Z.B. Spieler ins Lineup aufnehmen, Batting Order festlegen, Positionen erst kurz vor dem Spiel zuweisen.

## Änderungen

### 1. Entity: `LineupEntry`

```java
// Vorher:
@Column(nullable = false)
private String position;

// Nachher:
@Column(nullable = true)
private String position; // null = noch nicht zugewiesen
```

### 2. DTO: Request

```java
// Im Request-DTO (z.B. SetLineupRequest oder inline record):
// position darf null sein
String position // nullable, kein @NotBlank
```

### 3. DTO: Response

`LineupEntryResponse.position` wird `String` (nullable):

```java
public record LineupEntryResponse(
    Long id,
    PlayerResponse player,
    String position,        // kann null sein
    int battingOrder,
    PlayerResponse dhBatterPlayer
) {}
```

### 4. Validierung anpassen

- `position` darf null sein
- Wenn position gesetzt ist, muss sie ein gültiger Wert sein (P, C, 1B, 2B, 3B, SS, LF, CF, RF, EH)
- DH-Regel: dhBatterPlayerId darf nur gesetzt sein wenn position eine Feldposition ist (nicht null, nicht EH)
- Batting Order bleibt Pflicht (1-basiert, durchgehend)

### 5. Flyway Migration

```sql
ALTER TABLE lineup_entries ALTER COLUMN position DROP NOT NULL;
```

### 6. Standings/Stats

Position-basierte Statistiken (z.B. positionCounts in SeasonPlayerStats) sollen Einträge mit `position = null` ignorieren. Spieler ohne Position zählen aber trotzdem als "im Spiel" für `totalGames` / `gameCount`.

## Frontend erwartet

```json
// PUT /api/games/{gameId}/lineup
[
  { "playerId": 1, "position": "P", "battingOrder": 1, "dhBatterPlayerId": null },
  { "playerId": 2, "position": null, "battingOrder": 2, "dhBatterPlayerId": null }
]

// GET Response: gleiche Struktur, position kann null sein
```
