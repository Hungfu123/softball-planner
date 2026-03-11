# Aufgabe: Doppelte Spieltage am selben Datum verhindern

## Problem
Wenn man einen neuen Spieltag erstellt mit einem Datum, das in derselben Saison schon existiert, kommt ein `DataIntegrityViolationException` (HTTP 500). Es gibt einen Unique-Constraint auf `(season_id, date)` in der `game_days`-Tabelle.

Stattdessen soll eine saubere Fehlermeldung (HTTP 400) zurückgegeben werden.

## Was zu tun ist

### 1. `GameDayRepository.java` — Query-Methode hinzufügen

Füge eine JPQL-basierte exists-Query hinzu (Spring Data derived queries funktionieren hier NICHT, weil `season` eine Relation ist und kein einfaches Feld):

```java
@Query("SELECT COUNT(gd) > 0 FROM GameDay gd WHERE gd.season.id = :seasonId AND gd.date = :date")
boolean existsBySeasonAndDate(@Param("seasonId") Long seasonId, @Param("date") LocalDate date);
```

Benötigte Imports: `java.time.LocalDate`, `org.springframework.data.repository.query.Param`

### 2. `GameDayService.create()` — Prüfung VOR dem Speichern

In der `create`-Methode, nach dem Log aber VOR dem `seasonService.findById()`:

```java
if (gameDayRepository.existsBySeasonAndDate(seasonId, date)) {
    throw new IllegalArgumentException("Es gibt bereits einen Spieltag am " + date + " in dieser Saison");
}
```

### 3. `GameDayService.update()` — Prüfung bei Datumsänderung

In der `update`-Methode, wenn sich das Datum ändert:

```java
if (date != null && !date.equals(gameDay.getDate())) {
    if (gameDayRepository.existsBySeasonAndDate(gameDay.getSeason().getId(), date)) {
        throw new IllegalArgumentException("Es gibt bereits einen Spieltag am " + date + " in dieser Saison");
    }
    gameDay.setDate(date);
}
```

(Ersetze den bestehenden `if (date != null)` Block)

### Keine weiteren Änderungen nötig

- `GlobalExceptionHandler` fängt `IllegalArgumentException` bereits ab und gibt HTTP 400 mit `{ "error": "..." }` zurück
- Das Frontend zeigt den Fehler bereits als Toast an (`catch (e) { toast.show(e.message, 'error') }`)

## Betroffene Dateien
- `src/main/java/com/softball/repository/GameDayRepository.java`
- `src/main/java/com/softball/service/GameDayService.java`
