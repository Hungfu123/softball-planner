# Training-Period = Trainingsrhythmus — Design

**Datum:** 2026-06-19
**Status:** Freigegeben (Design), Implementierung ausstehend

## Problem

Eine `TrainingPeriod` ist aktuell nur ein Container: `id, name, startDate, endDate`.
Die Wochentage ("trainieren Di + Do") werden beim Bulk-Anlegen (`POST /trainings/bulk`)
einmalig abgefragt, zum Generieren der Einzeltermine benutzt und danach **weggeworfen** —
sie werden nirgends gespeichert.

Folge: Eine bestehende Period zeigt nur Name + Zeitraum. Man sieht **nicht**, an welchen
Wochentagen trainiert wird, und man kann den Rhythmus **nicht bearbeiten**. Will man den
Rhythmus ändern, muss man heute einzelne Trainings oder die ganze Period löschen und neu anlegen.

## Ziel

Die Period wird zum erstklassigen Träger des **Trainingsrhythmus**: "Wir trainieren
Di + Do, 18:00, im Park — von Zeitraum X bis Y." Dieser Rhythmus ist sichtbar und editierbar.
Beim Speichern werden die Einzeltermine an den Rhythmus angeglichen.

## Datenmodell

`TrainingPeriod` erhält drei neue Felder, durchgereicht durch alle Onion-Schichten:

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `weekdays` | Liste von 1–7 (Mo=1 … So=7) | Wochentage des Rhythmus |
| `time` | String, nullable | Default-Uhrzeit für erzeugte Termine (z.B. "18:00") |
| `location` | String, nullable | Default-Ort für erzeugte Termine |

**Speicherung:** Neue Spalten auf `training_periods`:
- `weekdays VARCHAR` — CSV der Wochentage, z.B. `"2,4"` (nullable für Alt-Daten)
- `time VARCHAR` (nullable)
- `location VARCHAR` (nullable)

Neue Flyway-Migration `V39__add_period_rhythm.sql` (nächste freie Nummer; aktuell höchste = V38).
`ddl-auto=validate` muss grün bleiben.

**Schichten:**
- Entity: `TrainingPeriodEntity` — 3 Spalten, `weekdays` als String.
- Mapper: parst CSV ↔ `List<Integer>` beim Übersetzen Entity ↔ Domain.
- Domain: `TrainingPeriod` — `List<Integer> weekdays`, `String time`, `String location`.
- DTO: `TrainingPeriodResponse` um die 3 Felder erweitert; neues `UpdateTrainingPeriodRequest(name, startDate, endDate, weekdays, time, location)`.
- Frontend-Type: `TrainingPeriodResponse` (`frontend/src/types/index.ts`) um `weekdays:number[], time?:string, location?:string`.

## Sync-Verhalten (Kern)

Beim Anlegen **oder** Bearbeiten einer Period werden die Einzeltermine (`Training`-Rows mit
`period_id`) im Zeitraum an den Rhythmus angeglichen — **ausschließlich zukünftige Termine**
(`date >= heute`):

1. **Wochentag dazugekommen** → für jeden passenden Tag im Zeitraum mit `date >= heute`, an dem
   noch kein Termin existiert, neuen `Training` anlegen (mit `time`/`location` der Period,
   `autoFillRegularPlayers` wie im bestehenden Bulk-Flow).
2. **Wochentag entfernt** → künftige Termine (`date >= heute`) an diesem Wochentag im Zeitraum löschen.
3. **Vergangene Termine** (`date < heute`) werden **nie** angefasst — schützt Anwesenheits-
   und Trainingsplan-Historie automatisch.
4. **Schutz vor Datenverlust:** Soll ein künftiger Termin gelöscht werden, der bereits erfasste
   Anwesenheit hat, blockiert das Backend nicht stumm. Stattdessen liefert die Vorschau/der Flow
   die Anzahl betroffener Termine inkl. "davon mit Anwesenheit", und das Frontend zeigt eine
   Lösch-Bestätigung (dark-backdrop ConfirmModal). Erst nach Bestätigung wird gelöscht.

Zeit/Ort der Period gelten als Defaults für **neu erzeugte** Termine. Bestehende Termine behalten
ihre eigene Zeit/Ort (kein Überschreiben beim Sync).

## Backward-Compatibility

Bestehende Periods haben `weekdays = NULL`. Beim Laden:
- Wenn `weekdays` leer/NULL ist, werden die Wochentage aus den vorhandenen Terminen der Period
  abgeleitet (distinct `dayOfWeek` der zugehörigen `Training`-Rows) und so im Bearbeiten-Formular
  vorausgefüllt/angezeigt.
- Erstes Speichern persistiert die Wochentage dann explizit.

So funktionieren Alt-Periods ohne Daten-Migration weiter und zeigen trotzdem ihren Rhythmus.

## Frontend

- **Bulk-Anlegen-Maske:** bleibt, persistiert künftig zusätzlich `weekdays/time/location` auf der
  (auto-erzeugten) Period statt sie zu verwerfen.
- **Neues Period-Bearbeiten-Modal:** dark backdrop, Stil wie bestehende Modals.
  Felder: Wochentag-Picker (Mo–So Toggle-Buttons), Zeit, Ort, Zeitraum (Start/Ende).
  "Speichern" → Update-Endpoint → Sync. Bei zu löschenden Terminen mit Anwesenheit:
  ConfirmModal mit Anzahl.
- **Period-Liste:** Wochentage als Chips anzeigen (z.B. "Di · Do").
- Logik (Sync, Diff, Anwesenheits-Zählung) liegt im **Backend-Service**; Frontend ist nur Formular
  + Anzeige (Projekt-Konvention).

## Backend-API

- `PUT /api/trainings/periods/{id}` wird von "nur Rename" auf vollwertiges Update erweitert
  (akzeptiert `UpdateTrainingPeriodRequest`) und triggert den Sync.
- `GET /api/trainings/periods` liefert die neuen Felder (inkl. abgeleiteter Wochentage bei Alt-Daten).
- **Kein** Extra-Vorschau-Endpoint. Das Frontend berechnet die Diff-Anzeige (anzulegende/zu
  löschende künftige Termine) aus den bereits geladenen Trainings + neuem Rhythmus selbst,
  um die ConfirmModal-Zahlen zu zeigen. Das Backend synct autoritativ beim `PUT` (verlässt sich
  nicht auf die Frontend-Diff). Die "davon mit Anwesenheit"-Zahl ergibt sich aus dem schon
  vorhandenen `attendeeCount` der `TrainingResponse`.

## SOLID / Architektur

- Sync-Logik als eigene, fokussierte Methode/Klasse — nicht `TrainingPeriodService` aufblähen.
  Kandidat: ein `PeriodRhythmSyncService` (Application-Layer) oder eine Domain-Hilfe, die aus
  (Rhythmus, Zeitraum, heute, bestehende Termine) die Diff (anzulegen/zu löschen) berechnet.
  Diff-Berechnung ist reine Logik → testbar ohne DB.
- Schichtregel: Domain kennt kein Spring/JPA. CSV-Parsing im Mapper (Adapter), nicht im Domain-Model.

## Tests

- **Domain/Unit:** Diff-Berechnung — Wochentag dazu (legt nur fehlende künftige an), Wochentag raus
  (löscht nur künftige), Vergangenheit unangetastet, leere Wochentage.
- **Integration (`TrainingPeriodService`, Testcontainers):** Update einer Period synct Termine korrekt;
  Anwesenheits-Zählung für Bestätigung stimmt; Alt-Period ohne `weekdays` leitet Wochentage ab.
- **Migration:** `validate` grün; CSV-Spalte mappt korrekt.
- Frontend: `npm run build` (Typecheck).

## Nicht im Scope (YAGNI)

- Mehrere unterschiedliche Rhythmen pro Period (nur eine Wochentag-Menge).
- Pro-Termin abweichende Zeit/Ort über das Period-Modal (Einzeltermin-Edit existiert separat).
- Überschreiben bestehender Termin-Zeit/Ort beim Rhythmus-Update.
