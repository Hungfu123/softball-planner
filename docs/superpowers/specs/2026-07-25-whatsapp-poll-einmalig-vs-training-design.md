# WhatsApp-Umfrage: Einmalig/Nachricht vs. Trainingsumfrage

**Datum:** 2026-07-25
**Status:** Design (zur Review)

## Problem

Das aktuelle Umfrage-Modell erzwingt Trainings-Kopplung: **jede** Umfrage/Nachricht hat
`weekday` (Trainingstag) + `send_time` und wird automatisch 1 Tag vor dem nächsten Training
verschickt. Es gibt keinen Weg, eine Umfrage/Nachricht **einmalig** und **ohne Trainingsbezug**
zu verschicken.

Zusätzlich ist die UI missverständlich:
- Das Feld heißt „Trainingstag", aber Nutzer lesen es als „Sendetag". Der tatsächliche
  Versandtag (1 Tag vorher) wird nirgends angezeigt.
- Wählt man einen Wochentag ohne Training (z.B. Mittwoch, wo Trainings Mo/Do/Sa sind),
  pausiert der Poll still — ohne Hinweis.
- Die Karten-Anzeige „Nächster Versand" (`nextSend`, `WhatsappPollPage.tsx:62`) rechnet noch
  mit der alten Semantik (zeigt den *Trainings*tag zur Sende-Uhrzeit statt den echten Versandtag
  am Vortag) und ignoriert, ob überhaupt ein Training existiert → sie ist bereits falsch.

## Ziel

Ein Haken **„Trainingsumfrage"** schaltet zwei Modi um:
- **an** (wiederkehrend, an Training gekoppelt): heutiges Verhalten + klarer Versandtag-Hinweis.
- **aus** (einmalig, default): Datum + Uhrzeit, sendet **einmal**, kein Trainingsbezug, keine
  Anwesenheits-Buchung.

Gilt für Umfrage **und** Nachricht (orthogonal zum bestehenden „Nur Nachricht"-Umschalter).

## Modell (Backend)

### Domain `WhatsappPoll`
Neue Felder:
- `boolean trainingCoupled` (default `false`)
- `LocalDate sendDate` (nullable, nur einmalig)

`weekday` (`DayOfWeek`) wird **nullable** (nur bei `trainingCoupled=true` gesetzt).
`time`/`enabled`/`skipDates`/`lastSent*` unverändert.

### Entity `WhatsappPollEntity`
- `weekday` (`@Column(length=10)`) → `nullable = true`
- neu `@Column(name="training_coupled", nullable=false) boolean trainingCoupled = false`
- neu `@Column(name="send_date") LocalDate sendDate`
- Spalte für Sende-Uhrzeit heißt bereits `send_time` (bleibt).

### Flyway `V52__whatsapp_poll_one_off.sql`
```sql
ALTER TABLE whatsapp_polls ADD COLUMN training_coupled boolean NOT NULL DEFAULT true;
ALTER TABLE whatsapp_polls ADD COLUMN send_date date;
ALTER TABLE whatsapp_polls ALTER COLUMN weekday DROP NOT NULL;
-- Bestehende 4 Polls sind Trainings-Polls → training_coupled=true (via DEFAULT gesetzt).
ALTER TABLE whatsapp_polls ALTER COLUMN training_coupled DROP DEFAULT;
```
Bestehende Zeilen behalten `weekday` + `training_coupled=true` → Verhalten unverändert.

### DTOs `adapter/dto/`
- **`WhatsappPollRequest`**: `weekday` verliert `@NotNull` (jetzt nullable), neu
  `boolean trainingCoupled`, `LocalDate sendDate`. Cross-Field-Validierung (siehe unten) in
  `WhatsappPollService`, nicht per Bean-Annotation (bedingte Pflichtfelder).
- **`WhatsappPollResponse`**: neu `trainingCoupled`, `sendDate` durchreichen.

### Validierung (`WhatsappPollService`, wirft `BusinessValidationException`)
- `trainingCoupled=true` → `weekday != null` erforderlich; `sendDate` wird ignoriert/genullt.
- `trainingCoupled=false` → `sendDate != null` erforderlich; `weekday` wird genullt.
- `time` in beiden Fällen Pflicht (unverändert).
- Vergangenheits-Check (`sendDate`+`time` < jetzt) NICHT hart im Backend — das Frontend warnt;
  ein einmaliger Poll mit Zeitpunkt in der Vergangenheit feuert schlicht nie (kein Schaden).

## Verhalten (Scheduler)

`WhatsappPollScheduler.tick` verzweigt je Modus:

- **`trainingCoupled=true`** → unverändert: `CoupledPollTargetResolver.resolve` +
  `PollDueEvaluator.isDue` (Vortag des Ziel-Trainings, Dedup via `lastSentTrainingId`).
- **`trainingCoupled=false`** → neue Regel `PollDueEvaluator.isDueOneOff(poll, now)`:
  fällig wenn `poll.enabled` **und** `now.toLocalDate() == sendDate` **und**
  `now.hour==time.hour && now.minute==time.minute` **und** `lastSentAt == null`.
  Beim Senden: `lastSentAt` + `lastSentMessageId` stempeln (KEIN `lastSentTrainingId`).
  → feuert genau einmal, danach nie wieder (`lastSentAt != null`).

`WhatsappPollService.sendNow` („Jetzt testen"): Training nur auflösen wenn `trainingCoupled`,
sonst nur senden + `lastSentMessageId` stempeln.

### Anwesenheits-Sync — keine Änderung
`PollVoteSyncService.sync` überspringt bereits jeden Poll mit `lastSentTrainingId == null`
(Zeile 105). Einmalige Polls setzen das nie → werden automatisch ignoriert. Kein Code nötig.

## Frontend

### Editor `PollEditor` (Erstellen + Bearbeiten, gleiche Komponente)
- Neuer Haken **„Trainingsumfrage"** (`trainingCoupled`), **default aus** bei neuer Umfrage
  (`blankDraft`).
- Ersetzt den bisherigen Haken „Automatisch senden — an den Trainingstag gekoppelt".
- **an**: Felder **Trainingstag** (`weekday`) + **Sende-Uhrzeit (am Vortag)** (`time`).
  - Beim Anschalten `weekday` auf einen **echten** Trainingstag der Saison vorbelegen
    (frühestes kommendes Training), damit der Hinweis sofort gültig ist.
  - Live-Hinweis unter den Feldern:
    - Training vorhanden → `→ Wird <Vortag>, TT.MM. um HH:MM gesendet` (neutral)
    - kein Training am Wochentag → `⚠ Kein <Wochentag>-Training in der Saison — sendet nie`
      (Warnfarbe, amber/red)
- **aus**: Felder **Datum** (`sendDate`, `<input type=date>`, default morgen) + **Uhrzeit**
  (`time`, default 18:00).
  - Live-Hinweis: `→ Wird am TT.MM. um HH:MM einmalig gesendet`
  - Warnung wenn Zeitpunkt in der Vergangenheit: `⚠ Zeitpunkt liegt in der Vergangenheit`

### Karte `PollCard`
- **Trainingsumfrage**: „Nächster Versand" **korrekt** via gemeinsamem Helfer (Vortag des
  nächsten echten Trainings). Kein passendes Training → „Pausiert — kein Training".
  Badge „Training".
- **Einmalig, noch nicht gesendet**: „Geplant: TT.MM. · HH:MM". Badge „Einmalig".
- **Einmalig, gesendet** (`lastSentAt != null`): „Gesendet am TT.MM." — bleibt als Historie
  stehen (kein Auto-Löschen). Löschen weiterhin über ⋮-Menü.
- „Aktiv/Pausiert"-Badge nur bei Trainingsumfragen relevant.

### Pausieren (Ersatz für den entfallenen `enabled`-Haken im Editor)
`enabled` bleibt im Modell. Steuerung wandert ins **⋮-Menü der Karte** als
„Pausieren" / „Fortsetzen" (nur sinnvoll für Trainingsumfragen). Kein Feature verloren,
Editor bleibt auf den einen Modus-Haken reduziert. Neue Hook-Methode
`useWhatsappPoll` → `setEnabled(id, enabled)` (nutzt bestehendes `updatePoll`).

### Gemeinsamer Versand-Helfer
Neue reine Funktion (Frontend), genutzt von Karte **und** Editor — ersetzt das fehlerhafte
`nextSend`:
```
coupledSendPreview(weekday, timeHHmm, trainings, skipDates, today)
  → { sendDate: Date, trainingDate: Date } | { pausedNoTraining: true }
```
Spiegelt `CoupledPollTargetResolver`: frühestes nicht-abgesagtes Training am `weekday` mit
Datum ≥ heute und nicht in `skipDates`, Versand = Trainingsdatum − 1 Tag @ `time`.
Fachlogik bleibt im Backend maßgeblich (Scheduler); dieser Helfer ist **nur Anzeige/Vorschau**.

### Datenquelle Trainings
`WhatsappPollPage` lädt zusätzlich `getTrainings()` (bestehende API, `TrainingResponse[]` mit
`date`/`cancelled`) in `useWhatsappPoll` oder lokal. Nur `date`+`cancelled` werden gebraucht.

### Types `frontend/src/types/index.ts`
`WhatsappPollResponse` + `WhatsappPollRequest`: `weekday` → `Weekday | null`, neu
`trainingCoupled: boolean`, `sendDate: string | null` (ISO-Datum).

## Nicht-Ziele (YAGNI)
- Keine wiederkehrenden Nicht-Trainings-Umfragen (nur einmalig oder trainingsgekoppelt).
- Keine mehrfache Zeitplanung / Wiederholung einmaliger Polls.
- Keine Anwesenheits-Buchung für einmalige Polls.
- Keine neuen REST-Endpoints (CRUD deckt die neuen Felder ab).

## Tests
- **Backend**
  - `PollDueEvaluatorTest`: `isDueOneOff` — fällig genau bei sendDate@time & `lastSentAt==null`;
    nicht fällig danach; nicht fällig bei falscher Minute/Datum.
  - `WhatsappPollSchedulerTest`: einmaliger Poll sendet 1×, kein `lastSentTrainingId`; nach
    Versand kein erneuter Versand.
  - `WhatsappPollServiceTest`: Validierung (coupled ohne weekday → 400; einmalig ohne sendDate
    → 400); `sendNow` löst Training nur bei coupled auf.
  - Migration/Mapping: Round-Trip coupled + einmalig (Mapper/Adapter).
- **Frontend**
  - Helfer `coupledSendPreview`: Versandtag = Vortag; kein Training → pausiert.
  - `PollEditor`: Haken schaltet Felder um; Hinweise erscheinen; Vergangenheits-Warnung.
