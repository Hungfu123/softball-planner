# Zeit je Wochentag in Trainingsperioden — Design

**Datum:** 2026-07-20
**Status:** Design (zur Review)

## Problem

Eine `TrainingPeriod` hat aktuell **eine** gemeinsame Uhrzeit (`time`) für alle ihre
Wochentage. Trainiert ein Team Mo/Do/Sa zu unterschiedlichen Zeiten (z.B. Mo 18:00,
Do 19:00, Sa 10:00), lässt sich das nicht abbilden — beim Generieren bekommen alle
Trainings dieselbe Zeit. Einzelne Termine kann man manuell umstellen, aber das ist
mühsam und geht bei Perioden-Updates verloren. Die UI hat nur ein einziges Zeit-Feld.

## Ziel

Pro ausgewähltem Wochentag eine eigene Uhrzeit — im Datenmodell und in der UI. Neu
generierte Trainings bekommen die Zeit ihres Wochentags. Die Phase-3-WhatsApp-Kopplung
profitiert automatisch (ihr Sync-Gate nutzt `Training.time`).

## Modell

`TrainingPeriod`:
- **Neu:** `weekdayTimes: Map<Integer, String>` — Wochentag (ISO 1=Mo … 7=So) → Uhrzeit `"HH:mm"`.
  Enthält genau die Wochentage aus `weekdays`, jeder mit seiner Zeit.
- `weekdays: List<Integer>` bleibt (welche Tage).
- `time: String` (die alte generelle Zeit) — bleibt in der DB liegen, wird aber von der
  neuen Logik **nicht mehr gelesen** (kein Drop → kein `validate`-Risiko, Rollback-sicher).
- `location: String` bleibt **generell** (eine, nicht pro Tag).

Persistenz: `weekday_times` als JSONB (wie `weekdays`/`options` an anderen Entities;
ObjectMapper-Serialisierung im Mapper). Migration **V49**.

## Verhalten

- **Anlegen/Update einer Periode:** UI liefert `weekdayTimes` (je angehaktem Wochentag
  eine Zeit). Validierung: für **jeden** Wochentag in `weekdays` muss eine gültige Zeit
  (`HH:mm`) vorliegen; keine Zeit für einen nicht-ausgewählten Tag.
- **Trainings generieren** (`PeriodRhythmSync` / `TrainingService`): jedes erzeugte
  Training bekommt `weekdayTimes.get(date.getDayOfWeek().getValue())` als `time`. Bereits
  bestehende zukünftige Trainings: beim Perioden-Update auf die neue Wochentags-Zeit
  aktualisieren (analog zur bestehenden Rhythmus-Sync-Logik; Vergangenheit unangetastet).
- **Migration bestehender Perioden:** `weekday_times` wird aus der alten `time` befüllt —
  dieselbe Zeit für alle aktuellen `weekdays` der Periode. Kein Datenverlust, Verhalten
  bleibt zunächst identisch, bis der User pro Tag ändert.

## UI (Perioden-Editor)

- Statt einem Zeit-Feld: **pro angehaktem Wochentag eine Zeile "Wochentag → Zeit-Feld"**.
- Wird ein Wochentag an-/abgewählt, erscheint/verschwindet dessen Zeit-Feld. Default-Zeit
  für einen neu angehakten Tag: die zuletzt verwendete/erste vorhandene Zeit (damit man
  nicht bei Null anfängt) — reine Bequemlichkeit, überschreibbar.
- Location-Feld bleibt einmalig.

## Betroffene Komponenten

| Komponente | Änderung |
|---|---|
| `TrainingPeriod` (model) | Feld `weekdayTimes: Map<Integer,String>` |
| `TrainingPeriodEntity` + Mapper | JSONB-Spalte `weekday_times` (Map serialisieren) |
| Flyway `V49` | Spalte + Backfill aus `time` × `weekdays` |
| `PeriodRhythmSync` / `TrainingService` | Trainingszeit = `weekdayTimes[weekday]` bei Erzeugung/Update |
| `TrainingPeriodService` | Validierung (Zeit je weekday), weekdayTimes durchreichen |
| DTOs (`TrainingPeriodRequest/Response`, ggf. CreateBulk) | `weekdayTimes` statt/zusätzlich zu `time` |
| Frontend Perioden-Editor + Hook/Client + Types | pro-Wochentag-Zeit-Felder |

## Edge-Cases

- **Wochentag ohne Zeit** (weekdays enthält Tag X, aber weekdayTimes hat kein X):
  Validierungsfehler beim Speichern (400). UI verhindert das (Feld erscheint mit Auswahl).
- **Zeit für nicht-ausgewählten Tag** in weekdayTimes: ignorieren/ausfiltern (nur weekdays zählen).
- **Bestehende Trainings in der Vergangenheit:** Zeit bleibt wie war (nur Zukunft wird beim
  Update angepasst — bestehende Rhythmus-Regel „nur date ≥ today").
- **Ungültiges Zeitformat:** 400 mit klarer Meldung.

## Testing

- Mapper: `weekdayTimes` ↔ JSONB round-trip.
- Migration V49 gegen Testcontainers: Backfill korrekt (alte time für alle weekdays).
- `TrainingService`/`PeriodRhythmSync`: generiertes Training bekommt die Zeit seines
  Wochentags; verschiedene Zeiten pro Tag; Update passt zukünftige Trainings an.
- `TrainingPeriodService`: Validierung (fehlende Zeit für weekday → 400).
- Frontend: pro-Wochentag-Feld rendert/persistiert; An-/Abwählen togglet Felder.

## Nicht in Scope (YAGNI)

- Location pro Wochentag (bleibt generell).
- Entfernen der alten `time`-Spalte (bleibt liegen, ungenutzt).
- Zeit-Overrides pro einzelnem Termin über die UI hinaus (einzelnes Training manuell
  umstellen geht bereits über die bestehende Training-Bearbeitung).
