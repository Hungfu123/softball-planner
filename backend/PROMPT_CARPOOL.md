# Backend Cleanup: Carpool vereinfachen

Das Carpool-Feature wurde im Frontend vereinfacht. Equipment-Tracking und Mitfahrer-Zuordnung wurden entfernt. Bitte folgende Änderungen im Backend durchführen:

## 1. Entfernen

### CarPassenger komplett löschen
- `entity/CarPassenger.java` — löschen
- `repository/CarPassengerRepository.java` — löschen
- `dto/SetCarPassengersRequest.java` — löschen
- `CarController`: den `PUT /api/cars/{carId}/passengers` Endpoint entfernen
- `CarService`: die `setPassengers()` Methode entfernen, alle Referenzen auf CarPassengerRepository entfernen

### Equipment aus Car entfernen
- `entity/Car.java`: das `equipment` Feld (ElementCollection + car_equipment Tabelle) entfernen, auch das `passengers` OneToMany Feld entfernen
- `dto/CarResponse.java`: `equipment` und `passengers` Felder entfernen
- `dto/UpdateCarRequest.java`: `equipment` Feld entfernen
- `CarService.updateCar()`: equipment-Update-Logik entfernen

## 2. Vereinfachtes Datenmodell

### Entity: `Car`
- `id` (Long, auto-generated)
- `gameDay` (ManyToOne → GameDay)
- `driver` (ManyToOne → Player)
- `totalSeats` (int, min 2, max 9)
- `direction` (String: "both", "there", "back")

### DTO: `CarResponse`
```json
{
  "id": 1,
  "driver": { "id": 5, "name": "Hung" },
  "totalSeats": 5,
  "direction": "both",
  "gameDayId": 10
}
```

## 3. Verbleibende Endpoints

| Method | Path | Beschreibung |
|--------|------|-------------|
| GET | `/api/gamedays/{gameDayId}/cars` | Alle Autos eines Spieltags |
| POST | `/api/gamedays/{gameDayId}/cars` | Auto anlegen |
| PUT | `/api/gamedays/{gameDayId}/cars/{carId}` | Auto bearbeiten (totalSeats, direction) |
| DELETE | `/api/cars/{carId}` | Auto löschen |

## 4. GameDay → Car Cascade FEHLT

`GameDay.java` hat aktuell **kein** `@OneToMany` zu Car. Wenn ein GameDay gelöscht wird, bleiben Cars als Waisen in der DB.

Fix: In `GameDay.java` hinzufügen:
```java
@OneToMany(mappedBy = "gameDay", cascade = CascadeType.ALL, orphanRemoval = true)
@JsonIgnore
private List<Car> cars = new ArrayList<>();
```

## 5. DataExport erweitern

Cars sind aktuell **nicht** im Export/Import enthalten. Bitte ergänzen:

### DataExport.java
Im `GameDayExport` Record ein neues Feld:
```java
List<CarExport> cars
```

Neues Record:
```java
public record CarExport(
    Long driverPlayerId,
    int totalSeats,
    String direction
) {}
```

### DataExportService.java
- Export: Cars pro GameDay mit exportieren
- Import: Cars pro GameDay mit importieren

## 6. Cascade bei Spieler-Entfernung

Wenn ein Spieler aus den availablePlayers eines GameDay entfernt wird und dieser Spieler Fahrer eines Autos ist: das Auto löschen. Prüfen ob das in `GameDayService` schon passiert, wenn nicht ergänzen.
