# WhatsApp Wochen-Poll — Design

**Datum:** 2026-07-14
**Status:** Approved (Brainstorming)

## Ziel

Wöchentlich automatisch eine native WhatsApp-Poll ("Wer kommt Sonntag?") in die
Team-Gruppe senden. Konfigurierbar im Orga-Bereich der App: Absender-Konto,
Ziel-Gruppe, Poll-Titel, Antwortoptionen, Wochentag + Uhrzeit, Aktiv-Schalter.
Fire-and-forget — Antworten bleiben in WhatsApp, kein Rücklauf in die App.

## Entscheidungen (aus Brainstorming)

- **Sende-Weg:** Inoffizieller WhatsApp-Client (whatsapp-web.js). Offizielle Meta
  Cloud API kann keine Gruppen/Polls. Sperr-Risiko der Nummer akzeptiert (gering
  bei 1 Send/Woche).
- **Rücklauf:** Keiner. Nur senden.
- **Trigger:** Fester Wochentag + Uhrzeit (Spring-Scheduler). Unabhängig von GameDays.
- **Nummer:** = gekoppeltes Absender-Konto (per QR). Nur Anzeige/Zuordnung.
- **Ziel-Gruppe:** Über stabile `groupId` (chatId `…@g.us`), NICHT über Anzeigenamen
  (fragil). User wählt im Dropdown per Name, App speichert die ID.
- **Aussetzen:** Manueller "Diese Woche aussetzen"-Button (skippt nächsten Send
  einmal). Aktiv-Toggle aus für lange Pausen (Winterpause).
- **Speichern ≠ Senden:** Config-Speichern löst NIE einen Send aus. Nur der
  Scheduler zum konfigurierten Zeitpunkt (oder manueller "Jetzt testen"-Button).
- **Antwortoptionen:** Frei editierbare Liste (add/remove), vorbefüllt Ja/Nein/Vielleicht.
- **Single-Team:** Genau eine Config-Row (wie Rest der App single-team).

## Architektur — vier Teile

### 1. Node WhatsApp-Sidecar (neuer Dienst)

Eigener Node-Dienst, weil Java/Spring keinen WhatsApp-Web-Client betreiben kann.

- Basis: `whatsapp-web.js` (nutzt WhatsApp Web unter der Haube)
- Hält die Session persistent, QR-Kopplung an die Absender-Nummer
- Session-Auth in einem Docker-Volume persistiert → QR nicht bei jedem Restart nötig
- HTTP-API, nur auf localhost/interne Docker-Netz erreichbar, geschützt per Shared-Token:
  - `GET /status` → `{connected: bool, number?: string, needsQr: bool}`
  - `GET /qr` → aktueller QR-Code (Data-URL/String) für Erst-Kopplung
  - `GET /groups` → `[{id, name}]` aller Gruppen des gekoppelten Kontos (für Dropdown)
  - `POST /send-poll` `{groupId, title, options[]}` → sendet native Poll, `{sent: bool}`
- Läuft als eigener Container in Docker Compose (lokal + prod auf VPS)

### 2. Backend (Spring, Onion-Architektur)

**Domain:**
- `WhatsappPollConfig` (Model, POJO): `senderNumber`, `groupId`, `groupName`,
  `pollTitle`, `options: List<String>`, `weekday: DayOfWeek`, `time: LocalTime`,
  `enabled: bool`, `skipNextSend: bool`, `lastSentAt: LocalDateTime`
- Port `WhatsappPollConfigRepository` (get/save single row)
- Port `WhatsappSender` (out) — Abstraktion des Node-Dienstes: `sendPoll`, `status`,
  `qr`, `listGroups`. Domain kennt kein HTTP.

**Adapter (out):**
- JPA-Entity + Mapper + `WhatsappPollConfigRepositoryAdapter` (implementiert Port)
- `WhatsappSenderHttpAdapter` (implementiert `WhatsappSender`) — HTTP-Client zum
  Node-Dienst, URL/Token aus Env (`WHATSAPP_SERVICE_URL`, `WHATSAPP_SERVICE_TOKEN`)

**Application:**
- `WhatsappPollConfigService` — CRUD der einen Config, "skip next" setzen/löschen,
  "send now" (delegiert an Sender), Status/Groups/QR durchreichen
- `WhatsappPollScheduler` — `@Scheduled` (jede Minute). Prüft: `enabled` &&
  aktueller Wochentag+Minute == `weekday`+`time`. Guard gegen Doppel-Send über
  `lastSentAt` (nicht in derselben Minute/Tag erneut). Wenn `skipNextSend` gesetzt:
  einmal skippen, Flag zurücksetzen, NICHT senden. Sonst senden, `lastSentAt` stempeln.
  `@EnableScheduling` auf einer Config-Klasse aktivieren.

**Adapter (in/web):**
- `WhatsappPollController` `/api/orga/whatsapp-poll`:
  - `GET /` → Config
  - `PUT /` → Config speichern (kein Send)
  - `GET /status` → Node-Status
  - `GET /qr` → QR für Kopplung
  - `GET /groups` → Gruppenliste für Dropdown
  - `POST /send-now` → sofort senden (Test), rate-limited
  - `POST /skip-next` → skipNextSend = true

**Flyway:** `V43__create_whatsapp_poll_config.sql` — 1 Tabelle. `options` als
JSON/Text-Spalte oder Join-Tabelle (analog bestehender List-Felder im Projekt prüfen).

### 3. Frontend

- Orga-Kachel in `OrgaHome.tsx` (Muster wie Einladungen/Aufbau) → Route
  `/orga/whatsapp-umfrage` in `App.tsx`
- Neue Seite `WhatsappPollPage`:
  - **Verbindungs-Status** (grün "verbunden als …" / QR-Anzeige bei needsQr)
  - **Config-Formular:** Gruppen-Dropdown (lädt `/groups`, disabled wenn nicht
    verbunden), Poll-Titel, Antwortoptionen (dynamische Liste add/remove),
    Wochentag-Dropdown, Uhrzeit, Aktiv-Switch
  - Buttons: **Speichern**, **Jetzt testen**, **Diese Woche aussetzen**
    (zeigt Status wenn skip aktiv), Anzeige `lastSentAt`
- Hook `useWhatsappPoll` — Config laden/speichern, Status/Groups/QR, send-now, skip
- Konventionen: Modals für Bestätigung ("Jetzt testen wirklich senden?"),
  Dark-Navy-Hover, custom Icons, deutsche Labels
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
  (Retry nächste Minute im Zeitfenster — oder bewusst nur einmal versuchen, siehe offen)
- Nicht gekoppelt (needsQr) → UI zeigt QR, Senden blockiert
- Gruppe nicht mehr vorhanden (ID ungültig) → Node liefert Fehler, UI warnt

## Sperr-Risiko-Minimierung

- Nur 1 automatischer Send/Woche
- "Jetzt testen" rate-limited (z.B. max alle paar Minuten)
- Kein Massen-Versand, keine Fremd-Nummern

## Testing

- Backend: `WhatsappPollScheduler`-Logik unit-testbar mit gemocktem Clock/Sender
  (Zeit-Match, skipNextSend-Guard, lastSentAt-Dedup) — kein echtes WhatsApp
- `WhatsappPollConfigService` CRUD gegen Testcontainers-DB
- `WhatsappSender` im Test gemockt (kein echter Node-Dienst)
- Node-Dienst: manueller Smoke-Test (QR koppeln, Test-Poll in eine Testgruppe)

## Offene Punkte (in Plan klären)

- Scheduler-Retry-Verhalten bei Node-Ausfall zur Sendezeit (einmal vs. Fenster)
- `options`-Persistenz: JSON-Spalte vs. Join-Tabelle (bestehende Muster im Repo prüfen)
- Genaues Rate-Limit für "Jetzt testen"
- whatsapp-web.js Versions-/Wartungsrisiko (bricht bei WhatsApp-Web-Änderungen)
