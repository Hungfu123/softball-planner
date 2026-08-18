# Live-Zuschauerlink für das Legacy-Scoring — Design

**Datum:** 2026-08-14
**Status:** freigegeben, bereit für Implementierungsplan

## Problem

Während ein Spiel im Legacy-Scoring (`ScoringPage`) mitgeschrieben wird, sieht den Stand nur die Person mit dem Gerät. Bank, Angehörige und verhinderte Spieler haben keinen Zugang — die App ist vollständig hinter Anmeldung, und Zugangsdaten an Zuschauer zu verteilen ist keine Option.

Der Teilen-Knopf des Zählers (`/counter`) hat die Lücke sichtbar gemacht: er teilt die *Seite*, nicht den *Stand*. Für einen echten Live-Blick fehlt ein Weg, Spieldaten lesend nach draußen zu geben, ohne die App zu öffnen.

## Umfang

**Dabei:** Ein widerrufbarer, tagesgültiger Link pro Spiel. Dahinter eine Nur-Lese-Seite mit Tafel (Score, Inning, Outs, Basen, aktueller Schlagmann, Spieluhr) und einem Ticker der letzten At-Bats. Erzeugt und widerrufen wird der Link in der `ScoringPage`.

**Nicht dabei:** Schreibender Zugriff von außen. Zuschauer-Links für den Spielbogen (RFL) — dieses Vorhaben betrifft nur das Legacy-Scoring. Eine Liste vergangener Links im UI. Rate-Limiting. Push-Benachrichtigungen. WebSockets.

**Bewusste Einschränkung:** Das Legacy-Scoring erfasst abgeschlossene At-Bats, nicht Wurf für Wurf. Balls und Strikes gibt es dort nicht und können deshalb auch nicht angezeigt werden. Das unterscheidet die Ansicht vom Zähler.

## Datenmodell und Lebensdauer

Neue Tabelle, Migration `V57__game_spectator_link.sql`, rein additiv:

| Spalte | Typ | |
|---|---|---|
| `id` | bigserial | PK |
| `game_id` | bigint | FK auf `game` mit `ON DELETE CASCADE`, **nicht** unique |
| `token` | text | unique, not null |
| `created_at` | timestamptz | not null |
| `revoked_at` | timestamptz | nullable |

Index auf `token` (unique) und auf `game_id`.

**Ein Link ist gültig, wenn `revoked_at IS NULL` und das Datum des zugehörigen Spieltags nicht in der Vergangenheit liegt.**

Verglichen wird gegen das lokale Datum der Serverzeitzone (`Europe/Berlin`), nicht gegen UTC — sonst wäre ein Abendspiel je nach Sommerzeit schon vor Mitternacht abgelaufen.

Die Regel hängt am **Spieltagsdatum**, nicht an `Game.endedAt`. Daraus folgt genau das gewünschte Verhalten, ohne zweite Regel und ohne Scheduler:

- Spiel läuft → Live-Stand.
- Spiel beendet (`endedAt` gesetzt) → derselbe Link zeigt weiter den eingefrorenen Endstand. Wer später klickt, erfährt das Ergebnis.
- Am Folgetag → Link tot. Für das nächste Spiel wird ein neuer erzeugt.

`game_id` ist bewusst nicht unique: „neuen Link erzeugen" setzt bei allen bestehenden Zeilen des Spiels `revoked_at` und legt eine neue an. Damit ist der Widerruf echt — ein Vorgänger wird ungültig, statt weiterzuleben.

Zwei Spiele am selben Spieltag haben getrennte Links, weil der Token am Spiel hängt.

**Für Angemeldete ändert sich nichts.** Die Frist begrenzt ausschließlich den öffentlichen Token. Spieldaten bleiben über die normalen, authentifizierten Wege dauerhaft zugänglich.

## Backend

Onion-Struktur wie im Bestand.

**Wichtigster Punkt: die Scoreboard-Logik wird nicht nachgebaut.** `LiveViewService` ruft dasselbe `GameScoringService.getScoreboard(gameId)`, das die `ScoringPage` nutzt — nur lesend. Andernfalls würden öffentliche und interne Ansicht mit der Zeit auseinanderlaufen.

**Domain**

- `domain/model/SpectatorLink` — POJO: `id`, `gameId`, `token`, `createdAt`, `revokedAt`
- `domain/port/out/SpectatorLinkRepository` — `save`, `findByToken`, `findActiveByGameId`, `revokeAllForGame`

**Application**

- `SpectatorLinkService` — erzeugen (bestehende widerrufen, neue anlegen), aktiven holen, widerrufen. Token aus `SecureRandom`, 32 Bytes, base64url ohne Padding.
- `LiveViewService` — prüft Token und Frist, holt Scoreboard und At-Bats über die bestehenden Wege, bildet auf die öffentlichen DTOs ab.

**Adapter in/web**

- `PublicLiveController` — `GET /api/live/{token}`, der einzige öffentliche Endpoint.
- `SpectatorLinkController` — `/api/games/{gameId}/spectator-link`: `POST` erzeugen, `GET` aktiven holen, `DELETE` widerrufen. Authentifiziert wie alles andere.

**Adapter out/persistence** — `SpectatorLinkEntity`, `SpectatorLinkMapper`, `SpringSpectatorLinkRepository`, `SpectatorLinkRepositoryAdapter`, nach dem Muster der bestehenden zwölf.

**DTOs — eigens gebaut, nicht die bestehenden weiterverwendet:**

```java
LiveViewResponse(
    String opponentName,
    LocalDate gameDate,
    boolean ended,
    PublicScoreboard scoreboard,
    List<TickerEntry> ticker)

PublicScoreboard(
    Integer scoreUs, Integer scoreThem,
    Integer currentInning, Integer outsInCurrentInning,
    List<String> runnersByBase,       // Index 0 = 1st, 1 = 2nd, 2 = 3rd; null = leer
    String currentBatterName,
    ClockStateResponse clock)

TickerEntry(Integer inning, String batterName, String result, Integer runsScored)
```

Die eine Ausnahme ist `ClockStateResponse`: das DTO wird wiederverwendet, weil es ausschließlich Zeiten führt und keine Personen- oder Nutzerdaten. Bei der Umsetzung ist das gegen die aktuelle Fassung zu prüfen — kommt dort je ein Feld mit Nutzerbezug hinzu, braucht auch die Uhr ein eigenes öffentliches DTO.

`AtBatResponse` enthält `createdBy` (eine Nutzerkennung) und interne Ids. Beides fehlt in `TickerEntry` bewusst. Auch `PublicScoreboard` führt keine Ids: der Diamant braucht nur Base plus Name.

Der Ticker ist auf die **letzten 15** At-Bats begrenzt, damit die Antwort im Sekundentakt klein bleibt.

**`SecurityConfig`** — eine Zeile, `/api/live/**` als `permitAll()` **vor** `/api/**`:

```java
.requestMatchers("/api/live/**").permitAll()
```

**Antwort-Cache: 2 Sekunden pro Spiel.** Zwanzig Zuschauer im 5-Sekunden-Takt lösen sonst zwanzig Datenbank-Runden für dieselbe Antwort aus. Schützt den VPS und nimmt einem Missbrauch die Wirkung.

## Frontend

Neue Route `/live/:token`, **außerhalb** von `RequireAuth` — dieselbe Bauart wie `/counter`, und die zweite und letzte Ausnahme.

Aufbau: Gegnername und Datum als Kopf, darunter die Tafel, darunter der Ticker. Basenbelegung als Diamant-Andeutung statt Text — schneller zu erfassen.

**Kein Zurück-Pfeil und kein Hinweis auf die Anmeldung.** Wer über den Link kommt, hat kein Konto; ein Weg zur Anmeldung führt ins Nichts. Dieselbe Lehre wie beim Zähler.

Drei Zustände:

| Zustand | Anzeige |
|---|---|
| Spiel läuft | Live-Tafel, Aktualisierung alle 5 Sekunden |
| Spiel beendet | gleicher Aufbau, Endstand, Hinweis „Spiel beendet", **kein** weiteres Nachladen |
| Token tot, widerrufen oder erfunden | schlichte Seite „Dieser Link ist nicht mehr gültig." — ohne Hinweis, ob er je existierte |

Aktualisierung per Polling, nicht WebSocket: der Stack hat keine, und bei Softball genügt der 5-Sekunden-Takt. Sobald `ended` gemeldet wird, endet das Polling.

**In der `ScoringPage`** kommt genau ein Element dazu: ein Knopf, der entweder „Zuschauer-Link erzeugen" anbietet oder den aktiven Link mit Teilen und Widerrufen zeigt. Rein zusätzliche UI, keine Änderung an der Scoring-Logik.

Neue Dateien:

```
frontend/src/components/live/LiveViewPage.tsx        (Default-Export, lazy)
frontend/src/components/live/LiveScoreboard.tsx
frontend/src/components/live/LiveTicker.tsx
frontend/src/hooks/useLiveView.ts                    (Polling, Zustände)
frontend/src/components/scoring/SpectatorLinkSheet.tsx
```

Wiederverwendet: `ResponsiveSheet`, `Button`, `ConfirmModal` (für den Widerruf), `LoadingSkeleton`.

## Sicherheit

**Was nach draußen geht — vollständig:** Gegnername, Spieldatum, Score beider Seiten, Inning, Outs, Basenbelegung, Vornamen von Läufern und Schlagmann, Spieluhr, Ticker mit Inning, Name, Ergebnis und Runs.

**Was nicht:** `createdBy`, `whatsappName`, interne Ids, die Spielerliste, andere Spiele, jeder andere Teil der App.

Die Namen sind die Werte aus `Player.name` — bei diesem Team Vornamen bzw. Spitznamen. Es steht nichts darin, was nicht auch auf dem Spielbogen steht, der an die Liga geht.

**Token:** 32 Bytes `SecureRandom` als base64url. Nicht erratbar.

**Der Token wird nicht geloggt.** Er ist ein Geheimnis wie ein Passwort; in Logs steht die `gameId`.

**Immer 404**, nie 403: bei unbekanntem, widerrufenem und abgelaufenem Token. Ein 403 würde bestätigen, dass der Token einmal existierte.

**Nur Lesen.** Alle Scoring-Endpoints bleiben authentifiziert. Ein Zuschauer kann keinen At-Bat eintragen, nichts zurücknehmen, nichts zurücksetzen.

Kein Rate-Limiting. Begründung: der Endpoint ist billig, der Cache dämpft Lastspitzen, und der Token stirbt täglich. Sollte sich Missbrauch zeigen, ist das eine eigene Entscheidung.

## Fehlerfälle

| Fall | Verhalten |
|---|---|
| Token unbekannt / widerrufen / abgelaufen | 404, Seite zeigt „nicht mehr gültig" |
| Spiel gelöscht, Link existiert noch | 404 (FK-Kaskade entfernt die Zeile) |
| Backend nicht erreichbar während des Pollings | letzter Stand bleibt stehen, dezenter Hinweis, nächster Versuch |
| Link erzeugen ohne Anmeldung | 401, wie jeder andere geschützte Endpoint |
| Zwei Scorer erzeugen gleichzeitig einen Link | letzter gewinnt, vorheriger ist widerrufen — beabsichtigt |

## Tests

**Backend**

- Gültigkeitsregel als Unit-Test: widerrufen, Spieltag vorbei, gültig
- Ein Test, der belegt, dass `createdBy` und interne Ids **nicht** in `LiveViewResponse` landen
- Integrationstests (Testcontainers): gültiger Token → 200 mit erwarteter Form; widerrufen → 404; abgelaufen → 404; unbekannt → 404
- **Sicherheits-Regressionstest:** `/api/live/{token}` ist ohne Anmeldung erreichbar **und** `/api/games/{id}/atbats` liefert weiterhin 401. Das ist die Bremse für das neue Auth-Loch.
- Ticker-Begrenzung auf 15 Einträge
- Erzeugen widerruft den Vorgänger

**Frontend**

- `LiveViewPage` in allen drei Zuständen
- Polling endet, sobald `ended` gemeldet wird
- `/live/<token>` in `routes.test.tsx` als zweite öffentliche Route; alle übrigen Pfade bleiben gesperrt
- `SpectatorLinkSheet`: erzeugen, teilen, widerrufen

**E2E**

Weil die `ScoringPage` angefasst wird, läuft `npm run test:e2e` (Playwright, 77 Tests). Das ist der von der Projektregel verlangte Beleg, dass der Scoring-Pfad unverändert funktioniert — nicht Zuversicht, sondern die Suite.

## Verifikation vor Commit

```bash
cd frontend && npm run lint && npx vitest run && npm run build
cd backend && ./mvnw test -s .mvn/local-settings.xml
docker compose up -d db && cd frontend && npm run test:e2e
```

## Doku nachziehen

`CLAUDE.md`, Abschnitt „Auth & deployment": aus zwei bewusst offenen Stellen werden vier — je zwei auf jeder Seite. Backendseitig `/api/calendar.ics` und `/api/live/**` (beide nur lesend), frontendseitig die Routen `/counter` und `/live/:token`. Alles andere unter `/api/**` bleibt authentifiziert, jede andere Route liegt hinter `RequireAuth`, und einen öffentlich **schreibenden** Endpoint gibt es weiterhin nicht.
