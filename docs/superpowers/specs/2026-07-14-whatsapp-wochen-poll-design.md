# WhatsApp Training-Polls — Design

**Datum:** 2026-07-14
**Status:** Approved (Brainstorming)

## Ziel

Mehrere wiederkehrende native WhatsApp-Polls automatisch in die Team-Gruppe(n)
senden — je Training eine eigene wöchentliche Abstimmung ("Wer kommt zum Training
morgen?"). Konfigurierbar im Orga-Bereich. Fire-and-forget — Antworten bleiben in
WhatsApp, kein Rücklauf in die App.

**Beispiel-Woche (3 Trainings):**
- Di 18:00 — "Wer kommt zum Training morgen?"
- Do 18:00 — "Wer kommt zum Training morgen?"
- Sa 10:00 — "Wer kommt zum P/C oder Basic Training morgen?"

Jede läuft eigenständig wöchentlich auf ihrem Wochentag.

## Entscheidungen (aus Brainstorming)

- **Sende-Weg:** Inoffizieller WhatsApp-Client (whatsapp-web.js). Offizielle Meta
  Cloud API kann keine Gruppen/Polls. Sperr-Risiko der Nummer akzeptiert (geringes
  Volumen).
- **Rücklauf:** Keiner. Nur senden.
- **Modell:** **Liste** wiederkehrender Polls (nicht eine Single-Config). Jeder Poll
  hat eigenen Wochentag + Uhrzeit, Titel, Optionen, Ziel-Gruppe.
- **Konto:** Genau ein gekoppeltes Absender-Konto — globales Setup, einmalig.
  **Einzige harte Voraussetzung** fürs Senden.
- **Kopplung: QR** (kein Pairing-Code). App zeigt QR (`/qr`), User scannt am Handy
  (WhatsApp → Verknüpfte Geräte). Die **Rufnummer wird NICHT eingetippt** — sie kommt
  nach dem Scan automatisch aus `/status` und wird nur angezeigt ("verbunden als …").
  Session persistent im Volume, Restart braucht keine neue Kopplung.
- **Ziel-Gruppe:** Über stabile `groupId` (chatId `…@g.us`), NICHT über Anzeigenamen
  (fragil). User wählt im Dropdown per Name, App speichert die ID. Gruppe pro Poll
  wählbar (meist dieselbe Team-Gruppe).
- **Trigger:** Fester Wochentag + Uhrzeit je Poll (Spring-Scheduler). Unabhängig von
  GameDays.
- **Absage / Aussetzen:** Je Poll eine Liste **Aussetz-Daten**. Fällt ein Training
  aus, trägt man das konkrete Datum bei der betroffenen Abstimmung ein → an dem Tag
  wird nicht gesendet. Aktiv-Toggle pro Poll für lange Pausen (Winterpause).
- **Speichern ≠ Senden:** Poll-Speichern löst NIE einen Send aus. Nur der Scheduler
  zum konfigurierten Zeitpunkt (oder manueller "Jetzt testen"-Button je Poll).
- **Antwortoptionen:** Frei editierbare Liste (add/remove), vorbefüllt Ja/Nein/Vielleicht.
- **Single-Team:** Ein Konto, aber beliebig viele Polls.

## Datenmodell — zwei Ebenen

**Ebene 1 — Konto (global):**
- Kopplung + Session lebt im Node-Dienst (Volume). App speichert hier nichts —
  liest nur Status/Nummer über `/status`. Keine Rufnummer-Eingabe.

**Ebene 2 — Polls (Liste):** je Eintrag
- `groupId` + `groupName` (Ziel)
- `title`
- `options: List<String>`
- `weekday: DayOfWeek`
- `time: LocalTime`
- `enabled: bool`
- `skipDates: List<LocalDate>` (Aussetz-Daten)
- `lastSentAt: LocalDateTime` (Dedup-Guard)

## Architektur — vier Teile

### 1. Node WhatsApp-Sidecar (neuer Dienst)

Eigener Node-Dienst, weil Java/Spring keinen WhatsApp-Web-Client betreiben kann.

- Basis: `whatsapp-web.js` (nutzt WhatsApp Web unter der Haube)
- Hält die Session persistent, QR-Kopplung an die Absender-Nummer
- Session-Auth in einem Docker-Volume persistiert → QR nicht bei jedem Restart nötig
- HTTP-API, nur interne Docker-Netz erreichbar, geschützt per Shared-Token:
  - `GET /status` → `{connected: bool, number?: string, needsQr: bool}`
  - `GET /qr` → aktueller QR-Code (Data-URL/String) für Erst-Kopplung
  - `GET /groups` → `[{id, name}]` aller Gruppen des gekoppelten Kontos (für Dropdown)
  - `POST /send-poll` `{groupId, title, options[]}` → sendet native Poll, `{sent: bool}`
- Läuft als eigener Container in Docker Compose (lokal + prod auf VPS)

### 2. Backend (Spring, Onion-Architektur)

**Domain:**
- `WhatsappPoll` (Model, POJO): siehe Datenmodell Ebene 2
- Port `WhatsappPollRepository` (findAll, findById, save, delete)
- Port `WhatsappSender` (out) — Abstraktion des Node-Dienstes: `sendPoll`, `status`,
  `qr`, `listGroups`. Domain kennt kein HTTP.

**Adapter (out):**
- JPA-Entity + Mapper + `WhatsappPollRepositoryAdapter` (implementiert Port)
- `WhatsappSenderHttpAdapter` (implementiert `WhatsappSender`) — HTTP-Client zum
  Node-Dienst, URL/Token aus Env (`WHATSAPP_SERVICE_URL`, `WHATSAPP_SERVICE_TOKEN`)

**Application:**
- `WhatsappPollService` — CRUD der Poll-Liste, Skip-Datum add/remove, "send now"
  (delegiert an Sender), Status/Groups/QR durchreichen
- `WhatsappPollScheduler` — `@Scheduled` (jede Minute). Über ALLE `enabled` Polls
  iterieren; prüfen: aktueller Wochentag+Minute == `weekday`+`time` &&
  heutiges Datum NICHT in `skipDates`. Guard gegen Doppel-Send über `lastSentAt`
  (nicht am selben Tag erneut). Wenn Match → senden, `lastSentAt` stempeln.
  `@EnableScheduling` auf einer Config-Klasse aktivieren.

**Adapter (in/web):**
- `WhatsappPollController`:
  - Konto/Setup unter `/api/orga/whatsapp` — `GET /status`, `GET /qr`, `GET /groups`
  - Polls unter `/api/orga/whatsapp/polls`:
    - `GET /` → alle Polls
    - `POST /` → neuen Poll anlegen
    - `PUT /{id}` → Poll bearbeiten (kein Send)
    - `DELETE /{id}` → Poll löschen
    - `POST /{id}/send-now` → sofort senden (Test), rate-limited
    - `POST /{id}/skip-dates` / `DELETE /{id}/skip-dates/{date}` → Aussetz-Datum verwalten

**Flyway:** `V43__create_whatsapp_polls.sql` — Poll-Tabelle. `options` + `skipDates`
als JSON/Text-Spalte oder Join-Tabelle (bestehendes List-Muster im Repo prüfen, z.B.
wie `Invitation.guestTeams` persistiert wird).

### 3. Frontend

- Orga-Kachel in `OrgaHome.tsx` (Muster wie Einladungen/Aufbau) → Route
  `/orga/whatsapp-umfrage` in `App.tsx`
- Neue Seite `WhatsappPollPage`:
  - **Konto-Status** oben (grün "verbunden als …" / QR-Anzeige bei needsQr).
    Alles Poll-Bezogene disabled solange nicht verbunden.
  - **Poll-Liste:** Karten je Poll (Titel, Wochentag+Zeit, Gruppe, aktiv-Badge,
    nächster Send / Aussetz-Daten), Hover-Reveal Edit/Delete, "Jetzt testen"
  - **Poll-Editor** (Modal/Form): Gruppen-Dropdown (lädt `/groups`), Titel,
    Antwortoptionen (dynamische Liste add/remove), Wochentag-Dropdown, Uhrzeit,
    Aktiv-Switch, Aussetz-Daten (Datepicker-Liste add/remove)
  - "+ Neue Abstimmung"
- Hook `useWhatsappPoll` — Polls CRUD, Konto-Status/Groups/QR, send-now, skip-dates
- Konventionen: Modals für Bestätigung ("Jetzt testen wirklich senden?" / Delete),
  Dark-Navy-Hover, Hover-Reveal Edit/Delete, custom Icons, deutsche Labels
- **Visuelle Umsetzung mit `frontend-design`-Skill** — Skill bei der Frontend-Task
  im Implementierungs-Plan ziehen. Aesthetik im Rahmen bestehender App-Konventionen
  (navy, Card, font-display), aber mit der Design-Sorgfalt des Skills.

### 4. Deployment

- Node-Dienst als Service in `docker-compose.yml` (lokal + prod)
- Docker-Volume für WhatsApp-Session-Persistenz
- Backend-Env: `WHATSAPP_SERVICE_URL` (intern, z.B. `http://whatsapp:3000`),
  `WHATSAPP_SERVICE_TOKEN`
- Erst-Kopplung: QR über Orga-UI scannen (einmalig, danach Session persistent)
- `docs/deployment.md` + `.env`-Doku erweitern

## Fehlerbehandlung

- Node-Dienst nicht erreichbar → `send-now`/`status` liefern klaren Fehler in UI
  ("WhatsApp-Dienst offline"), Scheduler loggt WARN und stempelt `lastSentAt` NICHT
- Nicht gekoppelt (needsQr) → UI zeigt QR, Senden blockiert
- Gruppe nicht mehr vorhanden (ID ungültig) → Node liefert Fehler, UI warnt
- Kurzfristige Absage nach Sendezeit → Poll ist schon raus; bewusste Grenze des
  Auto-Modells (Aussetz-Datum muss vor Sendezeit eingetragen sein)

## Sperr-Risiko-Minimierung

- Niedriges Auto-Volumen (paar Polls/Woche)
- "Jetzt testen" rate-limited (z.B. max alle paar Minuten)
- Kein Massen-Versand, keine Fremd-Nummern

## Testing

- Backend: `WhatsappPollScheduler`-Logik unit-testbar mit gemocktem Clock/Sender
  (Wochentag+Zeit-Match, skipDates-Guard, lastSentAt-Dedup, mehrere Polls) — kein
  echtes WhatsApp
- `WhatsappPollService` CRUD gegen Testcontainers-DB
- `WhatsappSender` im Test gemockt (kein echter Node-Dienst)
- Node-Dienst: manueller Smoke-Test (QR koppeln, Test-Poll in eine Testgruppe)

## Offene Punkte (in Plan klären)

- Scheduler-Verhalten bei Node-Ausfall zur Sendezeit (Retry-Fenster vs. einmal, dann
  nächste Woche)
- `options` + `skipDates` Persistenz: JSON-Spalte vs. Join-Tabelle (Repo-Muster prüfen)
- Genaues Rate-Limit für "Jetzt testen"
- whatsapp-web.js Versions-/Wartungsrisiko (bricht bei WhatsApp-Web-Änderungen)
