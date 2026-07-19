# WhatsApp-Umfrage an Trainingstag koppeln — Design

**Datum:** 2026-07-20
**Status:** Design (zur Review)

## Problem

WhatsApp-Trainingsumfragen haben aktuell eine eigene Wochentag+Zeit-Konfiguration,
komplett getrennt von den Trainingsperioden. Die Zuordnung Umfrage → Training beim
Anwesenheits-Sync läuft über ein 7-Tage-Datumsfenster (`TargetTrainingResolver`).

Das erzeugt zwei Schwächen:

1. **Kein Auto-Abstellen.** Fällt ein Trainingstag aus der Periode (ab Oktober z.B. nur
   noch Mo + Sa statt Mo/Do/Sa), muss die Do-Umfrage manuell deaktiviert werden.
2. **Fragile Zuordnung.** Mehrere Umfragen im selben Datumsfenster mappen auf dasselbe
   nächste Training; die Zuordnung wird bei jedem Sync neu geraten und kann sich
   verschieben. Bei Absagen ist unklar, welches Training gemeint ist.

## Ziel

Der bestehende **Automatik-Schalter** (`enabled`, „automatisch jede Woche senden")
**bedeutet ab jetzt: an den Trainingstag gekoppelt** — es gibt keinen separaten Toggle.
Eine automatisch gesendete Umfrage ist per Definition immer eine Trainingsumfrage.

Ist die Automatik an, folgt die Umfrage den Trainingstagen der aktiven Periode, sendet
1 Tag vorher, synct am Trainingstag, und ist **fest** an ein konkretes Training gebunden
(nicht mehr geraten). Fällt der Trainingstag weg, verschwindet die Umfrage automatisch.

Der User steuert nur noch: **Trainings-Wochentag + Sende-Uhrzeit + Automatik an**.

## Modell

### Umfrage-Felder

**Neu:**
- `last_sent_training_id` (BIGINT, nullable, FK → trainings, ON DELETE SET NULL) — das
  konkrete Training, für das die letzte Sendung war (feste Kopplung).

**Kein neues Toggle-Feld.** Der vorhandene `enabled` = „Automatik / gekoppelt".

Bestehende Felder im Automatik-Modus umgedeutet:
- `weekday` = **Trainings-Wochentag** (Mo/Do/Sa), an dem trainiert wird (nicht der Sendetag).
- `send_time` = **Sende-Uhrzeit am Vortag**.
- `skip_dates` = Absage-Termine (bleibt, wird respektiert).

Migration: `V48__whatsapp_poll_last_sent_training.sql` (nur die neue Spalte + FK).

### Verhalten: Automatik AUS (`enabled = false`)

- Umfrage ist **inaktiv**: kein Auto-Senden, kein Sync.
- Nur manuelles **„Jetzt senden"** (send-now) zum Testen bleibt möglich (koppelt ebenfalls
  ans nächste gültige Training, s.u.).

Der alte ungekoppelte Auto-Sende-Modus (senden zur eigenen Wochentag+Zeit **ohne**
Trainingsbezug) **entfällt** — Automatik heißt immer gekoppelt.

### Verhalten: Automatik AN (`enabled = true`, = gekoppelt)

**Zieltraining bestimmen** (die eine Quelle der Wahrheit):

> Das **nächste gültige Training** am Wochentag `weekday` (Datum ≥ heute, frühestes zuerst).
> Gültig = nicht abgesagt (`training.cancelled == false`) **und** das Datum nicht in den
> `skip_dates` der Umfrage.

**Senden** (`WhatsappPollScheduler` / `PollDueEvaluator`):
- Sende-Zeitpunkt = **(Zieltraining-Datum − 1 Tag)** um `send_time`.
- Nur senden, wenn ein gültiges Zieltraining existiert (impliziert: Wochentag liegt in der
  aktiven Periode → **Auto-Abstellen**, wenn nicht).
- Beim Senden: `last_sent_message_id`, `last_sent_at` **und `last_sent_training_id` = Zieltraining.id**
  speichern → **feste Kopplung**.
- Dedup: max. 1 Sendung pro Zieltraining (über `last_sent_training_id`, statt „schon heute gesendet").

**Sync** (`PollVoteSyncService`):
- Zieltraining = **`last_sent_training_id` direkt** (kein Neu-Berechnen, kein `TargetTrainingResolver`).
- Gate: erst ab **Trainingsstart (`training.time`) + 1 Stunde** am Trainingstag.
- Ist das Training inzwischen abgesagt → kein Sync.
- Rest (Stimmen holen, spiegeln/additiv, Anwesenheit buchen) unverändert.

### Feste Kopplung — warum safe

```
Mittwoch, send_time:  Umfrage raus  →  speichert last_sent_training_id = #123 (Do 20.7.)
Donnerstag, start+1h: Sync          →  bucht auf genau #123
```

Zwischen Senden und Syncen kann die Zuordnung nicht verrutschen — sie ist beim Senden
festgenagelt. Eine gesendete Umfrage kann nie auf ein anderes/falsches Training rutschen.

### Absage-Handling

- **Vor dem Senden abgesagt** (Training cancelled oder Datum in skip_dates): Zieltraining
  ist das nächste *gültige* → Umfrage sendet 1 Tag vor **dem**, nie vor dem abgesagten.
- **Nach dem Senden abgesagt**: `last_sent_training_id` zeigt aufs abgesagte Training →
  Sync erkennt `cancelled` → bucht nicht. Keine Fehlbuchung.

## Betroffene Komponenten

| Komponente | Änderung |
|---|---|
| `WhatsappPoll` (model/entity/mapper) | Feld `lastSentTrainingId` |
| Flyway `V48` | Spalte + FK |
| Domain-Service (neu) `CoupledPollTargetResolver` | nächstes gültiges Training am Wochentag (cancelled + skipDates) |
| `PollDueEvaluator` / `WhatsappPollScheduler` | Automatik-Sende-Pfad (Vortag des Zieltrainings, Training-ID speichern, Dedup über Training-ID) |
| `WhatsappPollService` (send-now) | koppelt ebenfalls (Training-ID speichern) |
| `PollVoteSyncService` | Automatik-Sync nutzt `lastSentTrainingId` direkt, Gate start+1h |
| DTOs (`WhatsappPollResponse`) | ggf. `lastSentTrainingId`/Ziel-Info für UI-Anzeige |
| Frontend `WhatsappPollPage` / `useWhatsappPoll` | `weekday`-Label = „Trainingstag", `send_time` = „Sende-Uhrzeit (Vortag)", Hinweistext dass Automatik = an Training gekoppelt |

`TrainingRepository`: Abfrage „künftige Trainings nach Datum sortiert" — vorhandenes
`findAllByOrderByDateDesc` umgekehrt nutzbar oder in der Domain filtern/sortieren.

## Edge-Cases

- **Kein Training am Wochentag in Sicht** (Wochentag nicht in Periode / keine künftigen
  Trainings): kein Zieltraining → nicht senden (Auto-Abstellen). Kein Fehler.
- **Automatik mitten in der Woche umgelegt**: greift ab der nächsten Sende-/Sync-Bewertung;
  keine rückwirkende Aktion.
- **Mehrere gültige Trainings am selben Wochentag in Zukunft**: immer das **nächste** (frühestes Datum ≥ heute).
- **Zieltraining verschoben** (Datum geändert) nach dem Senden: `last_sent_training_id`
  bleibt gültig (bindet an die ID, nicht ans Datum) → Sync bucht weiterhin korrekt.
- **`send_time` am Zieltraining-Vortag schon vorbei** beim Aktivieren: kein Nachsenden für
  dieses Training (Dedup); greift ab dem nächsten Zyklus.
- **Bestehende Umfragen bei Migration**: `enabled=true` bedeutet ab jetzt gekoppelt; deren
  `weekday` wird als Trainingstag interpretiert. Der User pflegt die 3 vorhandenen
  Trainingsumfragen (Mo/Do/Sa) entsprechend.

## Testing

- `CoupledPollTargetResolver`: nächstes gültiges Training am Wochentag; überspringt
  cancelled + skipDates; leer wenn keins.
- `PollDueEvaluator` Automatik: sendet am (Zieltraining−1) zur send_time; nicht wenn kein
  Zieltraining; Dedup über `last_sent_training_id`.
- `PollVoteSyncService` Automatik: nutzt `lastSentTrainingId`; Gate start+1h; kein Sync bei
  cancelled.
- Frontend: Labels/Hinweistext; Persistenz unverändert.

## Nicht in Scope (YAGNI)

- Separater „an Training koppeln"-Toggle (Automatik = gekoppelt).
- Ungekoppelter Auto-Sende-Modus (entfällt).
- Trainings-**Endzeit** als Feld (Sync bleibt Start + 1h fix).
- Konfigurierbarer Sende-Vorlauf (fix 1 Tag) / Sync-Versatz (fix +1h).
- Auto-Erzeugen von Umfragen aus der Periode (Umfragen bleiben manuell angelegt; nur die
  Terminierung koppelt).
