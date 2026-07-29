# WhatsApp Spieltag-Umfrage — Design

**Datum:** 2026-07-29
**Status:** Approved (Brainstorming)

## Ziel

Pro Spieltag eine WhatsApp-Umfrage anlegen, die automatisch 7 Tage vorher rausgeht, und
deren Ja-Stimmen per Knopfdruck in die Anwesenheitsliste (`GameDay.availablePlayers`) des
Spieltags übernommen werden — inklusive Rücknahme, wenn jemand seine Stimme zurückzieht.

Analog zu den bestehenden Trainings-Polls, aber:

- **einmaliger Versand** (Ort/Gegner wechseln pro Spieltag, kein Wochenrhythmus)
- **Ziel ist ein GameDay**, nicht ein Training
- **zwei Vorlagen**: Auswärtsspiel (Mehrfachauswahl, mit Auto-Option) und Heimspieltag
  (Einzelauswahl, mit Aufbau/Catering-Option)

## Bestand (Ausgangslage)

- `whatsapp_polls`: `training_coupled` (boolean) unterscheidet Trainings-Poll (Wochentag →
  nächstes Training via `CoupledPollTargetResolver`) von einmaligem Poll (`send_date`).
- `PollDueEvaluator.isDue` (gekoppelt, Vortag des Trainings) / `isDueOneOff` (genau am
  `sendDate` ab Uhrzeit, 1×, Same-Day-Catch-up).
- `PollVoteSyncService` bucht Stimmen in `training_attendance`; `whatsapp_synced_vote`
  (V47) speichert pro Voter `training_id`, `voter_name`, `player_id`, `present`.
- Unbekannte Voter (`player_id IS NULL`) werden im WhatsApp-Tab der Spielerverwaltung
  (`WhatsappVotersTab`) einem Spieler zugeordnet (`VoterAssignmentService`).
- `VotePresenceEvaluator.isPresent` matcht hart auf den String `"ja"`.
- `AvailabilityService.setAvailablePlayers` räumt beim Entfernen eines Spielers
  kaskadierend auf: Lineup-Einträge löschen, `dhBatterPlayer` nullen, Staff-Einträge
  löschen, Batting-Order neu nummerieren. **Destruktiv.**
- Kein Carpool-Feature im Backend (CLAUDE.md ist da veraltet) — Auto-Stimmen können nur
  angezeigt, nicht in Fahrten geschrieben werden.
- `GameDay` hat kein Heim/Auswärts-Flag, nur `date`, `label`, `location`. Die Vorlage
  wählt man daher selbst im Editor.

## Datenmodell

### Migration V53

`whatsapp_polls` — boolean wird durch dreiwertigen Modus ersetzt, Spieltag-Link neu:

```sql
ALTER TABLE whatsapp_polls ADD COLUMN mode VARCHAR(12);
UPDATE whatsapp_polls SET mode = CASE WHEN training_coupled THEN 'TRAINING' ELSE 'ONE_OFF' END;
ALTER TABLE whatsapp_polls ALTER COLUMN mode SET NOT NULL;
ALTER TABLE whatsapp_polls DROP COLUMN training_coupled;
ALTER TABLE whatsapp_polls ADD COLUMN game_day_id BIGINT
    REFERENCES game_days(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX uq_poll_game_day ON whatsapp_polls (game_day_id)
    WHERE game_day_id IS NOT NULL;
```

Der Unique-Index erzwingt **max. eine Umfrage pro Spieltag** — bei zwei Polls wäre
unklar, dessen `lastSentMessageId` der Stimmen-Abruf verwenden soll.

`ON DELETE CASCADE`: Wird ein Spieltag gelöscht, verschwindet seine Umfrage mit — ein
Spieltag-Poll ohne Spieltag hätte kein gültiges Ziel.

`whatsapp_synced_vote` — generalisiert auf zwei Ziel-Typen:

```sql
ALTER TABLE whatsapp_synced_vote ALTER COLUMN training_id DROP NOT NULL;
ALTER TABLE whatsapp_synced_vote ADD COLUMN game_day_id BIGINT
    REFERENCES game_days(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_synced_vote ADD CONSTRAINT chk_vote_target
    CHECK ((training_id IS NULL) <> (game_day_id IS NULL));
CREATE UNIQUE INDEX uq_synced_vote_gameday ON whatsapp_synced_vote (game_day_id, voter_name);
```

Die bestehende `uq_synced_vote (training_id, voter_name)` bleibt; Postgres behandelt
NULL-Werte in Unique-Constraints als verschieden, Spieltag-Zeilen kollidieren also nicht.

**Gespeichert wird jede Stimme, genau wie beim Training** — pro Voter eine Zeile mit
`present` = „hat die erste Option gewählt". Der Abruf macht Upsert (bestehende
`upsertVote`-Logik, nur mit `gameDayId` statt `trainingId`), kein Löschen. Damit braucht es
keinen neuen Löschpfad, und unbekannte WhatsApp-Namen werden auch von Nein-Wählern gelernt:
Alias einmal zuordnen, gilt für alle künftigen Umfragen.

Nicht gespeichert werden die **einzelnen gewählten Optionen** — „Fährt"/„Hilft" kommt live
aus dem Fetch ins Vorschau-Modal, dafür braucht es keine Spalte.

Zweck der Persistenz ist allein die Zuordnung unbekannter WhatsApp-Namen. Die
Mirror-Berechnung arbeitet immer auf dem **Live-Fetch**, nie auf der DB.

### Domain

- Neues Enum `PollMode { TRAINING, ONE_OFF, GAME_DAY }` in `domain/model`.
- `WhatsappPoll`: `boolean trainingCoupled` → `PollMode mode`, neu `Long gameDayId`.
- `SyncedVote`: neu `Long gameDayId`.

`mode`-Semantik:

| mode       | Ziel              | Versand                                   | Anwesenheit                |
|------------|-------------------|-------------------------------------------|----------------------------|
| `TRAINING` | nächstes Training | Vortag zur Uhrzeit, wiederkehrend         | automatisch (Scheduler)    |
| `ONE_OFF`  | —                 | 1× am `sendDate`                          | keine                      |
| `GAME_DAY` | `gameDayId`       | 1× am `sendDate` (= Spieltag − 7 Tage)    | manuell per Vorschau-Modal |

## Versand

`GAME_DAY` nutzt denselben Fälligkeitspfad wie `ONE_OFF` (`PollDueEvaluator.isDueOneOff`):
genau am `sendDate` ab Uhrzeit, gesperrt sobald `lastSentAt` gesetzt, Same-Day-Catch-up
gegen verpasste Scheduler-Minuten.

Unterschiede zu `ONE_OFF`:

- **`lastSentMessageId` wird immer gestempelt**, auch bei „Jetzt senden". Ohne Message-ID
  kann `fetchVotes` die Stimmen nicht holen, und ein Testversand soll direkt syncbar sein.
  `lastSentAt` bleibt bei „Jetzt senden" wie bisher leer, damit der geplante Versand
  danach noch feuert (er überschreibt dann die Message-ID).
- `enabled` immer `true` (kein Pausieren, wie bei `ONE_OFF`).
- `weekday` und `skipDates` unbenutzt.

`PollVoteSyncService` prüft heute `poll.isTrainingCoupled()` und muss nach der Umstellung
auf `mode == TRAINING` prüfen — Spieltag-Polls dürfen dort nie durchlaufen (sie würden
sonst auf `lastSentTrainingId` Trainings-Anwesenheit buchen).

Validierung in `WhatsappPollService.validate` für `GAME_DAY`: `gameDayId`, `sendDate` und
`time` sind Pflicht; `weekday` wird auf `null` gesetzt; `enabled` auf `true`.
Ein `sendDate` in der Vergangenheit wird **abgelehnt** — `isDueOneOff` feuert nur genau an
diesem Datum, ein vergangenes Datum würde also stillschweigend nie senden (relevant, wenn
der Spieltag weniger als 7 Tage entfernt ist und die Vorbelegung in der Vergangenheit
läge; der Editor klemmt die Vorbelegung deshalb auf heute).
Modus-Wechsel `GAME_DAY` → anderer Modus verwirft `gameDayId` und die Sendehistorie
(gleiche Regel wie der bestehende `coupled → einmalig`-Wechsel).

## Stimmen → Anwesenheit

Kein automatischer Sync. Die Kaskade in `setAvailablePlayers` löscht Lineup-Einträge und
Base-Coach-Zuweisungen — das darf nur nach Bestätigung passieren. Daher zwei Endpoints:

- `POST /api/gamedays/{id}/poll-votes/fetch` — holt Stimmen via
  `sender.fetchVotes(poll.lastSentMessageId)`, macht Upsert in `whatsapp_synced_vote` und
  liefert die Vorschau einschließlich der nur-live vorhandenen Fährt-/Hilft-Listen.
  Schreibt **nicht** in `availablePlayers`. POST statt GET, weil der Abruf persistiert.
- `GET /api/gamedays/{id}/poll-votes` — liest nur die gespeicherten Stimmen (für das
  Badge „unbekannte Wähler" ohne WhatsApp-Abfrage).
- `POST /api/gamedays/{id}/poll-votes/apply` — nimmt das Delta aus der Vorschau
  (`{ add: [playerId], remove: [playerId] }`), rechnet es auf die **aktuelle**
  Anwesenheitsliste und gibt das Ergebnis an `AvailabilityService.setAvailablePlayers`
  (Kaskade damit korrekt und ohne Duplikat-Logik). Delta statt Vollliste, damit
  Änderungen, die zwischen Abruf und Übernahme in einem anderen Tab passiert sind, nicht
  überschrieben werden.

Vor dem Abruf prüft der Service `sender.status().connected`. `fetchVotes` schluckt heute
jeden Fehler und liefert eine leere Liste
(`WhatsappSenderHttpAdapter.fetchVotes()`) — „niemand hat abgestimmt" und „Sidecar nicht
erreichbar" wären sonst nicht unterscheidbar. Bei fehlender Verbindung gibt es eine
Fehlermeldung statt einer leeren Vorschau. Ein echter leerer Fetch ist harmlos: der Mirror
iteriert über die gefetchten Stimmen, ohne Stimmen gibt es nichts zu ändern.

### Regeln

- **Anwesend** = Voter hat die **erste Antwortoption** (Index 0) gewählt. Beide Vorlagen
  stellen die Ja-Option an Position 1; der Editor zeigt an Option 1 den Hinweis „zählt als
  anwesend". Kein String-Matching (`"Ich spiele (und helfe natürlich mit)"` enthält kein
  „ja"), keine zusätzliche DB-Spalte. Trainings-Polls behalten `VotePresenceEvaluator`
  unverändert.
- Option 2 und 3 (Auto-Fahrer, Aufbau/Catering-Helfer) landen **nie** in
  `availablePlayers`. Sie werden im Vorschau-Modal als Info-Listen angezeigt („Fährt",
  „Hilft") — nur aus dem Live-Fetch, nicht gespeichert und daher nicht an der
  Spieltag-Karte sichtbar.
- **Mirror-Semantik:** bekannter Spieler mit Ja → wird anwesend; bekannter Spieler ohne Ja
  → wird entfernt, falls aktuell anwesend. Nichtwähler bleiben unberührt (gleiche Regel
  wie `PollVoteSyncService.syncNow`).
- Zwei WhatsApp-Namen, die auf denselben Spieler zeigen (Handywechsel, Umbenennung), sind
  möglich. Widersprüchliche Stimmen werden nicht reihenfolgeabhängig aufgelöst: **ein Ja
  gewinnt** — sobald irgendeine Stimme dieses Spielers die erste Option enthält, ist er
  anwesend.
- Unbekannte WhatsApp-Namen (`player_id IS NULL`) werden **direkt im Vorschau-Modal**
  zugeordnet (Spieler-Dropdown oder „neuer Spieler"), keine Weiterleitung. Nach der
  Zuordnung lädt die Vorschau neu, der Wähler rutscht in „Neu anwesend". Gebucht wird erst
  mit „Anwesenheit übernehmen" — kein stiller Kaskaden-Schreibvorgang (Trainings-Stimmen
  werden wie bisher direkt re-gematcht).

### Neue Klassen

- `domain/service/GameDayVoteMirror` (pur, ohne Spring): Stimmen + aktuell Anwesende +
  Player-Map (WhatsApp-Name → Player) → `toAdd`, `toRemove`, `drivers`, `helpers`,
  `declined`, `unknown`. Kennt die Index-0-Regel.
- `application/GameDayVoteSyncService`: orchestriert Poll-Lookup, `fetchVotes`,
  Vote-Upsert, Mirror und `AvailabilityService`. Für `toRemove` sammelt es Warnungen aus
  `LineupEntryRepository` und `GameStaffRepository` (welcher Eintrag in welchem Spiel
  wegfällt).
- `adapter/dto/GameDayVotePreviewResponse` + Endpoints in `GameDayController`.
- `SyncedVoteRepository` erweitert um `findByGameDayIdAndVoterName`, `findByGameDayId`.

## UI

### Poll-Editor

`WhatsappPollPage.tsx` ist mit 894 Zeilen zu groß und enthält `PollEditor`, `PollCard`,
`AccountCard` und `SendPreview`. `PollEditor` (samt `SendPreview`) wandert in eine eigene
Datei `PollEditor.tsx` — der Test `PollEditor.test.tsx` importiert schon danach benannt.

Neu im Editor:

- Modus-Umschalter dreiwertig: Training / Einmalig / **Spieltag**.
- Bei Spieltag: Dropdown mit den Spieltagen der Saison. Sobald ein Spieltag gewählt ist,
  wird `sendDate` auf **Spieltag − 7 Tage** vorbelegt. Ändert man den Spieltag, rechnet es
  neu — außer das Datum wurde manuell überschrieben (dann bleibt der manuelle Wert, mit
  Aktion „auf 7 Tage vorher zurücksetzen").
- Zwei Vorlage-Buttons, die Frage, Nachricht, Antworten und Mehrfachauswahl aus dem
  gewählten Spieltag füllen (Platzhalter: Datum, Wochentag, `location`, `label`). Alles
  danach frei editierbar.

```
[Vorlage: Auswärtsspiel]              Mehrfachauswahl
  Nachricht: Wer ist nächste Woche Samstag (20.06.)
  Frage:     CoSe Spieltag in Aachen dabei?
  1. Ja ich will spielen                    ← zählt als anwesend
  2. Ich habe ein Auto und würde fahren
  3. Nein

[Vorlage: Heimspieltag]               Einzelauswahl
  Frage:     Heimspieltag 09.08.
  1. Ja, ich spiele (und helfe natürlich mit)   ← zählt als anwesend
  2. Ich komme zum Aufbauen/Anfeuern/Catering helfen
  3. Ich kann nicht :(
```

### Poll-Übersicht

Dritte Gruppe „Spieltag-Umfragen" neben „Trainingsumfragen" und „Einmalig & Nachrichten".
Karte zeigt Spieltag (Datum + Label/Ort) und nächsten Versand.

### GameDayPlanner

Im Anwesend-Block:

```
Anwesend (11)   [WhatsApp-Stimmen holen]   ⚠️ 2 unbekannte Wähler
```

- Button nur sichtbar, wenn für diesen Spieltag ein Poll existiert und gesendet wurde.
- Badge nur bei `game_day_id`-Stimmen mit `player_id IS NULL`, aus dem lesenden
  `GET`-Endpoint. Klick öffnet dasselbe Vorschau-Modal (keine Navigation).
- Klick auf den Button öffnet das Vorschau-Modal:

```
Stimmen abgeholt (11 Ja, 3 Auto, 2 Nein)

+ Neu anwesend: Max, Tim, Jana
- Nicht mehr:   Ben   ⚠ Lineup Spiel 2 (#4, SS) wird gelöscht

Unbekannt (1)
  "Sandra W."   [Spieler wählen… ▾]  [Zuweisen]  [+]

Fährt: Ben, Lisa, Tom     Hilft: Anne

[Abbrechen]  [Anwesenheit übernehmen]
```

Die Zuordnungs-Zeile ist dieselbe Komponente wie im WhatsApp-Tab: das Markup aus
`WhatsappVotersTab.tsx` (Name + Datum, Spieler-Dropdown, „Zuweisen", Plus-Button für neuen
Spieler) wird als `UnknownVoterRow` extrahiert und von beiden Stellen benutzt. Sie ruft die
bestehenden Endpoints `POST /api/orga/whatsapp/assign` bzw. `/assign-new`; danach lädt das
Modal die Vorschau neu.

### Unbekannte-Voter-Tab

`UnknownVoterResponse` kennt heute nur `trainingId`/`trainingDate`. Neu: `source`
(`TRAINING` | `GAME_DAY`), `targetId`, `date`. `WhatsappVotersTab` zeigt entsprechend
„Training 20.06." bzw. „Spieltag 09.08." und nutzt für die Zeilen `UnknownVoterRow`. Der
Tab bleibt als globale Alias-Pflege bestehen — die Zuordnung im Spieltag-Fluss braucht ihn
aber nicht mehr.

## Tests

Backend:

- `GameDayVoteMirrorTest`: Index-0-Regel, Mehrfachauswahl (Ja + Auto), nur-Auto zählt
  nicht, Rücknahme bei Stimmwechsel, Nichtwähler unberührt, unbekannte Voter, zwei Aliase
  auf einen Spieler mit widersprüchlichen Stimmen („Ja gewinnt"), leerer Fetch ändert
  nichts.
- `GameDayVoteSyncServiceTest`: Vorschau schreibt nicht in `availablePlayers`, Apply
  rechnet das Delta auf den aktuellen Stand (parallel hinzugefügter Spieler bleibt drin),
  Apply geht über `AvailabilityService`, Warnungen für betroffene Lineup-/Staff-Einträge,
  Abruf bei nicht verbundenem Sidecar wirft statt leere Vorschau zu liefern, Upsert setzt
  `present` bei Stimmwechsel von true auf false.
- `PollDueEvaluatorTest`: `GAME_DAY` verhält sich wie `ONE_OFF`.
- `WhatsappPollServiceTest`: Validierung `GAME_DAY`, Modus-Wechsel verwirft `gameDayId` +
  Sendehistorie, „Jetzt senden" stempelt Message-ID.
- `WhatsappPollMapperTest` / `WhatsappPollDtoMappingTest`: `mode` + `gameDayId`.
- Integrationstest für V53 (Flyway + `chk_vote_target`).

Frontend:

- `PollEditor.test.tsx`: Vorlage-Buttons füllen Optionen/Mehrfachauswahl, Spieltag-Wahl
  setzt `sendDate` auf −7 Tage, manuelles Datum wird nicht überschrieben, Modus-Wechsel.
- Sync-Modal: Diff-Anzeige, Warnung bei Lineup-Verlust, Abbrechen schreibt nichts,
  Inline-Zuordnung eines unbekannten Wählers lädt die Vorschau neu und verschiebt ihn nach
  „Neu anwesend".
- `UnknownVoterRow`: in `WhatsappVotersTab` und Modal identisches Verhalten (Zuweisen,
  neuer Spieler).
- `WhatsappPollPage.test.tsx`: Spieltag-Gruppe in der Übersicht.

## Explizit nicht Teil dieser Änderung

- Kein Heim/Auswärts-Flag am `GameDay` — Vorlage wird manuell gewählt.
- Keine Fahrgemeinschafts-Verwaltung aus den Auto-Stimmen (Feature existiert nicht).
- Kein automatischer Anwesenheits-Sync für Spieltage (Kaskade ist destruktiv).
- Keine Mehrfach-Polls pro Spieltag.
