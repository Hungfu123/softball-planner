# Design: WhatsApp-Poll-Stimmen → Trainings-Anwesenheit synchronisieren

**Datum:** 2026-07-16
**Status:** Design (freigegeben) — bereit für Implementierungsplan
**Bezug:** Umsetzung des Konzepts [`2026-07-14-whatsapp-vote-attendance-sync-concept.md`](2026-07-14-whatsapp-vote-attendance-sync-concept.md). Erweitert das WhatsApp-Umfragen-Feature um Rücklauf in die Trainings-Anwesenheit.

## Ziel

„Ja"-Stimmen der wöchentlichen Auto-Umfrage („Wer kommt morgen zum Training?") werden automatisch als **anwesend** in die Trainings-Anwesenheit geschrieben. Zuordnung Wähler→Spieler über den WhatsApp-Push-Namen. Unbekannte Namen werden gemeldet und auf der Spieler-Seite zugeordnet.

## Festgelegte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Sync-Auslöser | **Hybrid**: bekannte Wähler auto → anwesend; unbekannte → Badge/Meldung, kein manuelles Übernehmen im Alltag |
| Alias-Modell | **Ein** WhatsApp-Name pro Spieler, überschreibbar (kein Alias-Liste) |
| Anwesend-Erkennung | Wähler hat Option **„Ja"** (case-insensitive) gewählt |
| Training-Zuordnung | Über **Datum aufgelöst** (kein explizites Koppeln) |
| Unbekannte Wähler | Immer **zuweisen** (bestehender Spieler) oder **neuer Spieler** — kein „Ignorieren" |
| Sync-Zeitpunkt | Zur **Trainingszeit**, abgeleitet aus `Training.time` (ergibt 20:00 werktags / 14:00 Sa) |
| Zusätzlich | **Test-Button** für sofortigen Sync ohne Zeit-Gate |

## 1. Datenmodell

### Änderungen an bestehenden Modellen
- `Player.whatsappName` — `String`, nullable. Genau ein WhatsApp-Name, überschreibbar.
- `WhatsappPoll.lastSentMessageId` — `String`, nullable. Message-ID des zuletzt gesendeten Polls (zum Abfragen der Stimmen).

### Neue Tabelle `whatsapp_synced_vote`
Persistiert gesyncte Stimmen (der Sidecar-Store ist volatil — Neustart = leer). Diese Tabelle ist die Quelle für Anwesenheits-Buchung, Badge und spätere Zuordnung.

| Spalte | Typ | Bemerkung |
|---|---|---|
| `id` | PK | |
| `training_id` | FK → training | aufgelöstes Ziel-Training |
| `voter_name` | varchar | WhatsApp-Push-Name des Wählers |
| `player_id` | FK → player, nullable | `null` = unbekannter Wähler |
| `present` | boolean | „Ja" gewählt |

Unique-Constraint: `(training_id, voter_name)` — Re-Sync/Umwählen aktualisiert dieselbe Zeile (Upsert).

### Migrations
- `V45__player_whatsapp_name.sql` — `ALTER TABLE <player> ADD COLUMN whatsapp_name VARCHAR(255)`
- `V46__whatsapp_poll_last_message.sql` — `ALTER TABLE whatsapp_polls ADD COLUMN last_sent_message_id VARCHAR(255)`
- `V47__whatsapp_synced_vote.sql` — neue Tabelle inkl. Unique-Constraint

> Tabellennamen (`player` vs `players`) vor Migration verifizieren.

## 2. Datumsabgleich (Ziel-Training auflösen)

Poll wird vom `WhatsappPollScheduler` an seinem Weekday gesendet, `lastSentAt` wird gestempelt.

**Ziel-Training** = nächstes Training mit:
- `date >= lastSentAt.toLocalDate()`
- `cancelled == false`
- innerhalb von **7 Tagen** nach Sendedatum
- bei mehreren: das mit kleinstem `date`

Kein Treffer (kein Training / abgesagt / außerhalb Fenster) → **skip**, kein Fehler. Deckt „morgen zum Training" ab (Poll abends → Training am Folgetag).

## 3. Sidecar (`whatsapp-service/server.js`)

- **`vote_update`-Listener** → In-Memory-Store `{ pollMsgId: { voterWid: { name, options[] } } }`. Umwählen überschreibt den Voter-Eintrag (letzter Stand zählt). Push-Name via `client.getContactById(voterWid)` → `pushname ?? name ?? number`.
- **`send-poll`** gibt die Message-ID zurück: `{ sent: true, pollMessageId: msg.id._serialized }` (nur wenn ein Poll gesendet wurde, nicht bei reiner Nachricht).
- **Neue Route `GET /poll-votes/:msgId`** → `[{ voterName, options: string[] }]` aus dem Store.

Store volatil → Persistenz liegt im Backend (Abschnitt 1). Nach Sidecar-Neustart vor dem nächsten Sync gehen nur noch nicht gepullte Stimmen verloren; bereits persistierte bleiben.

## 4. Backend

### Port-Erweiterung `WhatsappSender`
- `sendPoll(...)` gibt künftig `String` zurück (die `pollMessageId`, `null` bei reiner Nachricht). Adapter parst `pollMessageId` aus der Sidecar-Antwort.
- Neue Methode `List<WhatsappVote> fetchVotes(String msgId)` → ruft `GET /poll-votes/:msgId`. `WhatsappVote` = Domain-Record `{ voterName, options }`.

### Scheduler-Anpassung `WhatsappPollScheduler`
Nach erfolgreichem Senden: `poll.setLastSentMessageId(id)` zusätzlich zu `lastSentAt`.

### Neuer `PollVoteSyncService` (application)
Eigener `@Scheduled`-Tick (jede Minute, `Europe/Berlin`) — **getrennt vom Poll-Sender** (Single-Responsibility). Je enabled Poll mit `lastSentMessageId`:
1. Ziel-Training auflösen (Abschnitt 2). Keins → skip.
2. Zeit-Gate: nur wenn `heute == training.date` **und** `jetzt >= training.time`. Läuft ab Trainingsstart idempotent weiter (fängt Nachzügler).
   - `Training.time` ist freies `VARCHAR` (keine `TIME`-Spalte) → String→`LocalTime` **defensiv parsen** (erwartet `"HH:mm"`). Unparsebar/leer → Gate überspringen und ganztägig syncen (nicht crashen), WARN loggen.
   - Trainingszeiten kommen aus der DB pro Training (`training.time`, generiert aus `TrainingPeriod.time`). Der Sync ist unabhängig davon, **wie** die Zeit gesetzt wurde (3 Perioden vs. spätere Per-Weekday-Zeiten pro Periode = eigenes Feature „B", nicht Teil dieser Spec).
3. `fetchVotes(lastSentMessageId)` vom Sidecar.
4. Je Wähler:
   - `present = options` enthält „ja" (case-insensitive, getrimmt).
   - Match `player.whatsappName == voterName`.
   - Upsert `whatsapp_synced_vote(training, voterName, playerId|null, present)`.
   - **Match + present** → `TrainingAttendance.present = true` (nur setzen; niemals manuell/anders Gesetztes auf `false` zurücksetzen).

### Zuordnungs-Logik (application)
`assignVoter(voterName, playerId)` bzw. `createPlayerFromVoter(voterName, name)`:
1. `player.whatsappName = voterName` (überschreibt vorhandenen).
2. Alle `synced_vote` mit diesem `voter_name` und `player_id == null` → `player_id` setzen; bei `present` → Anwesenheit buchen.
3. Badge für betroffene Trainings verschwindet automatisch (keine `player_id == null`-Zeilen mehr).

Funktioniert auch ohne erneuten Sidecar-Pull, da `voter_name` persistiert ist.

### Endpoints (adapter/in/web)
- `POST /api/whatsapp/sync` — Test-Button: triggert `PollVoteSyncService` sofort, ohne Zeit-Gate.
- `GET /api/whatsapp/unknown-voters` — Liste unbekannter Wähler `[{ voterName, trainingId, trainingDate }]` (für Tab + Badge).
- `POST /api/whatsapp/assign` — `{ voterName, playerId }` → zuweisen.
- `POST /api/whatsapp/assign-new` — `{ voterName, playerName }` → neuen Spieler anlegen + zuweisen.
- `PUT /api/players/{id}/whatsapp-name` — `{ whatsappName }` (proaktive Pflege im Tab).

## 5. Frontend

### Player-Page: neuer Tab „WhatsApp"
- **Alias-Pflege:** je Spieler ein editierbares `whatsappName`-Feld.
- **Sektion „Unbekannte Wähler":** Liste unmatchter Namen; je Zeile:
  - [Zuweisen zu Spieler ▾] — Dropdown bestehender Spieler → `POST /assign`.
  - [Neuer Spieler] — Name-Eingabe (nur Name nötig) → `POST /assign-new`.
- **Test-Button** „Jetzt syncen" → `POST /sync`.

### Training-Page: Badge
Wenn `synced_vote` mit `player_id == null` für dieses Training existiert → Badge „⚠️ N unbekannte Wähler" mit Link zum WhatsApp-Tab.

## 6. Voraussetzungen / Grenzen

- Poll muss **nicht-anonym** sein, sonst liefert `vote_update` keine Wähler-Infos.
- Vote-Reading hängt an inoffiziellem `whatsapp-web.js` — kann bei WhatsApp-Web-Änderungen brechen.
- Namensgleichheit (zwei Wähler gleicher Push-Name) → mehrdeutig; selten, über Zuweisung handhabbar.
- Nicht-Spieler in der Gruppe bleiben „unbekannt", bis zugewiesen (kein Ignorieren).

## 7. Umsetzungs-Reihenfolge (phasenweise)

1. **Datenmodell:** `Player.whatsappName` + `WhatsappPoll.lastSentMessageId` + Tabelle `whatsapp_synced_vote` (Migrations, Entities, Mapper, Repos/Adapter). Player-Tab-UI zur Alias-Pflege.
2. **Sidecar:** `send-poll` gibt Message-ID; `vote_update`-Store; `GET /poll-votes/:msgId`. `WhatsappSender` erweitern (Rückgabe-ID + `fetchVotes`); Scheduler stempelt `lastSentMessageId`.
3. **Sync:** `PollVoteSyncService` + Datumsauflösung + Zeit-Gate + Anwesenheits-Buchung. Test-Endpoint + Button.
4. **Unbekannte:** `unknown-voters`-Endpoint, Player-Tab-Sektion + Zuweisung/Neuer-Spieler, Training-Badge.

## 8. Tests

- **PollDueEvaluator-analog:** Datumsauflösung (Grenzfälle: kein Training, abgesagt, außerhalb 7-Tage-Fenster, mehrere Kandidaten).
- **PollVoteSyncService:** Zeit-Gate (vor/nach `training.time`), „Ja"-Erkennung, Match/No-Match, Idempotenz (Umwählen), kein Zurücksetzen manuell gesetzter Anwesenheit.
- **Zuordnung:** Zuweisen re-matcht bestehende `synced_vote`-Zeilen + bucht Anwesenheit; neuer Spieler.
- Sidecar: manuell/leichtgewichtig (kein Java-Testrahmen).
