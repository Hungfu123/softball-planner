# Spielbogen Live-Feed + öffentlicher Zuschauer-Link

**Datum:** 2026-07-31
**Status:** Design, noch nicht umgesetzt

## Problem

Der Klemmbrett-Button auf der `SpielbogenPage` öffnet den `RflSheetDrawer` — das RFL-Gitter mit
7 Inning-Spalten und Mini-Diamanten pro Slot. Dieses Gitter ist eine **PDF-Vorschau**:
`RflSheetDrawer.tsx` und `utils/spielbogenPdfExport.ts` rendern über denselben Renderer
(`renderCells`, `cellKey` aus `utils/bogenSheetRenderer.ts`).

Während des Spiels bringt das nichts. Wer wissen will „wie steht's, was ist gerade passiert",
bekommt die Archiv-Form statt der Live-Form. Auf dem Handy ist das Gitter zusätzlich Zoom-Arbeit.

Zweiter, verwandter Bedarf: Zuschauer am Zaun bekommen heute Screenshots in die WhatsApp-Gruppe
geschickt. Ein Link, der sich selbst aktualisiert, ersetzt das.

## Lösung in einem Satz

Eine Feed-Komponente (Scoreboard + Linescore + Play-by-Play), die an zwei Stellen läuft: im
Drawer anstelle des Gitters, und auf einer öffentlichen, token-geschützten Seite. Das Gitter
bleibt, wo es hingehört — im PDF.

## Nicht Teil dieser Arbeit

- Offline-Scoring (verworfen: Netzaussetzer am Platz sind kurz, ein Retry reicht)
- Legacy-`ScoringPage` — dort werden nur eigene At-Bats erfasst, Gegner-Runs kommen als Klumpen
  (`GameScoringService.java:231`). Ein Feed wäre halb leer. Nur `Spielbogen` bekommt das Feature.
- Push-Benachrichtigungen an Zuschauer
- Pitching-Statistik

## Datenlage

`GET /api/spielbogen/{id}/sheet` → `BogenSheetResponse` liefert bereits alles Nötige:

| Feld | Inhalt |
|---|---|
| `meta` | `homeTeamName`, `awayTeamName`, `status`, `currentInning`, `currentSide`, `homeRuns`, `awayRuns`, `date`, `location` |
| `homeLineup` / `awayLineup` | `SpielbogenSlotResponse` — `name` ist Freitext, **beide Seiten haben echte Namen** |
| `homeAtBats` / `awayAtBats` | `result`, `outType`, `sacrificeType`, `fielderChain`, `isError`, `errorPosition`, `runsScored`, `rbi`, `inning`, `sequence`, `createdAt`, `slotId` |
| `stealingEvents` | `type`, `fromBase`, `toBase`, `inning`, `side`, `slotId`, `createdAt` |
| `substitutions`, `positionChanges` | für Feed-Zeilen niedriger Priorität |
| `inningRuns` | `Map<Inning, {home, away}>` — Linescore-Runs schon fertig berechnet |

Für die In-App-Variante ist **kein neuer Endpoint** nötig. Der Drawer lädt diese Response heute schon.

## Backend

### 1. Team-Totals für die Linescore

Eine klassische Linescore zeigt Runs pro Inning, dann **R H E als Spiel-Summe pro Team** — H und E
sind keine Inning-Werte. `inningRuns` liefert die Runs bereits; es fehlen Hits und Errors als Totale.

`BogenSheetResponse` bekommt zwei additive Felder:

```java
public record BogenSheetResponse(
    ...bestehende Felder unverändert...,
    Map<Integer, InningRuns> inningRuns,
    TeamTotals homeTotals,     // neu
    TeamTotals awayTotals      // neu
) {
    public record InningRuns(int home, int away) {}          // unverändert
    public record TeamTotals(int runs, int hits, int errors) {}
}
```

Additiv, damit `spielbogenPdfExport.ts` (nutzt `inningRuns[inn].home/.away`) und
`SpielbogenScoringScenarioTest` unberührt bleiben.

Berechnung in `domain/service/BogenScoreCalculator` (existiert, rechnet schon `InningRuns`):

- `runs` — Summe `runsScored` der At-Bats dieser Seite. Muss mit `meta.homeRuns`/`awayRuns`
  übereinstimmen; **Steal-Runs nicht vergessen** (Runner kann per `STOLEN_BASE` nach Hause kommen).
  Wenn der bestehende Score-Pfad Steal-Runs separat führt, hier denselben Pfad benutzen statt neu
  zu summieren — sonst weicht die Linescore vom Scoreboard ab.
- `hits` — Anzahl At-Bats dieser Seite mit `result.isHit()` (SINGLE, DOUBLE, TRIPLE, HOMERUN,
  INSIDE_PARK_HR — `AtBatResult.isHit()` existiert).
- `errors` — **Achtung, Seitenwechsel.** `isError` wird am At-Bat der *schlagenden* Mannschaft
  erfasst, der Fehler gehört aber der *feldenden*. Ein At-Bat mit `side=AWAY, isError=true` zählt
  auf `homeTotals.errors`. Diese Invertierung ist die wahrscheinlichste Fehlerquelle der ganzen
  Änderung und braucht einen eigenen Test.

### 2. Öffentlicher Link

**Migration `V55__spielbogen_public_token.sql`:**

```sql
ALTER TABLE spielbogen ADD COLUMN public_token VARCHAR(43);
CREATE UNIQUE INDEX uq_spielbogen_public_token ON spielbogen(public_token);
```

Nullable — ein Bogen bekommt erst einen Token, wenn jemand den Link erzeugt.
43 Zeichen = 256 Bit base64url ohne Padding.

**Token-Erzeugung:** `SecureRandom`, base64url. Nicht die laufende `id` und nichts daraus
Ableitbares — sonst ist die ganze Saison durchzählbar.

**Endpoints:**

| Methode | Pfad | Auth | Zweck |
|---|---|---|---|
| `POST` | `/api/spielbogen/{id}/share` | ja | Token erzeugen (idempotent — vorhandenen zurückgeben) |
| `DELETE` | `/api/spielbogen/{id}/share` | ja | Token auf `null` → Link tot |
| `GET` | `/api/public/bogen/{token}` | **nein** | Feed-Daten |

`SecurityConfig` bekommt `.requestMatchers("/api/public/**").permitAll()` — vor
`.requestMatchers("/api/**").authenticated()`. Präzedenzfall existiert: `/api/calendar.ics`
ist bereits `permitAll` (`SecurityConfig.java:36`).

**Der öffentliche Endpoint liefert ein eigenes, reduziertes DTO** (`PublicBogenFeedResponse`) —
nicht `BogenSheetResponse` durchreichen. Keine internen IDs außer den zur Zuordnung nötigen
`slotId`, keine `season`, keine `leagueResultId`, keine `createdBy`. Unbekannter oder
zurückgezogener Token → 404, nicht 403; ein 403 würde bestätigen, dass der Token mal existierte.

Response mit `X-Robots-Tag: noindex` ausliefern.

**Personenbezug:** Die Seite zeigt Klarnamen beider Mannschaften öffentlich. Das ist gewollt
(dieselben Namen stehen im RFL-Bogen), aber es ist der Grund, warum der Link unlisted bleibt,
widerrufbar ist und nicht indexiert wird.

## Frontend

### Neue Komponente `BogenLiveFeed`

Rein präsentational, bekommt die Feed-Daten als Prop. Wird von beiden Einsatzorten befüllt —
in-app aus `BogenSheetResponse`, öffentlich aus `PublicBogenFeedResponse`. Ein gemeinsamer
View-Typ, zwei Mapper.

Aufbau von oben nach unten:

```
┌──────────────────────────────┐
│  SPIELBOGEN              ✕   │
│  Köln Abbots 4 : 1 Allstar   │
├──────────────────────────────┤
│    1 2 3 4 5 6 7 │ R  H  E   │
│ ABB 1 0 3 0 - - - │ 4  6  1   │
│ ALL 0 1 0 0 - - - │ 1  3  2   │
├──────────────────────────────┤
│ ▲ 4. Inning — Köln Abbots    │
│   Fanzi    Strikeout         │
│   Krosaki  Single      1B    │
│   Rauf     Walk              │
│   ──────── 4:1 ────────      │
│ ▼ 3. Inning — Allstar        │
│   ...                        │
├──────────────────────────────┤
│ ▸ Aufstellung          HEIM ▾│
├──────────────────────────────┤
│ [PDF]  [Liga senden]         │
│ [ Spiel beenden ]            │
└──────────────────────────────┘
```

1. **Scoreboard** — beide Teams, Score, aktuelles Inning mit Hälfte (▲ = Top/Away am Schlag,
   ▼ = Bottom/Home), Outs als gefüllte Punkte, besetzte Bases.
2. **Linescore** — Inning-Spalten mit Runs, rechts R/H/E-Summen. Noch nicht gespielte Innings
   als `-`. Horizontal scrollbar bei Extra-Innings, die Seite selbst scrollt nie horizontal.
3. **Play-by-Play** — gruppiert nach (Inning, Seite), **neueste Gruppe oben, innerhalb der
   Gruppe ebenfalls neueste zuerst**, damit die letzte Aktion immer die oberste Zeile ist.
   Jede Gruppe endet mit einem Trenner, der den Zwischenstand nach dieser Halbinning zeigt.
4. **Aufstellung** — eingeklappt, HEIM/GAST-Umschalter, Slot + Name + Position.
   In-app mit Stift → `BogenSlotEditModal` (unverändert). Öffentlich ohne Stift.

### Feed-Zeilen

**Sortierung über alle Typen:** At-Bats haben `sequence` nur pro Seite, Steals gar keine.
Gemeinsamer Sortierschlüssel ist deshalb `createdAt` — an allen Ereignistypen vorhanden.

**At-Bat-Zeile** — `{name}  {label}  {suffix}`:

| Fall | Label |
|---|---|
| Hit / Walk / HBP / Strikeout | `AtBatResult.displayNameDe()` — existiert bereits |
| `outType=GROUNDER` | `Grounder ` + `fielderChain.join('-')` → „Grounder 6-3" |
| `outType=FLY` | `Fly ` + Position → „Fly F9" |
| `outType=DOUBLE_PLAY` / `TRIPLE_PLAY` | „Double Play 6-4-3" |
| `outType=FOUL/UNASSISTED/FORCE_OUT/TAG_OUT/FIELDERS_CHOICE` | eigenes deutsches Label |
| `sacrificeType=BUNT` / `FLY` | „Sac Bunt" / „Sac Fly" |
| `isError=true` | „Error " + `errorPosition` |

Suffix: `rbi > 0` → „+N RBI". `runsScored > 0` → Zeile hervorgehoben. Das ist die Emotion des
Feeds — Runs müssen sich optisch von Strikeouts abheben.

**Steal-Zeile** nach `StealingEventType`: STOLEN_BASE → „stiehlt {toBase}", CAUGHT_STEALING →
„beim Klau gefangen", OUT_ON_PLAY → „Aus beim Vorrücken", WILD_PITCH → „Wild Pitch",
PASSED_BALL → „Passed Ball".

**Substitution / Positionswechsel** als Zeile niedriger Betonung („X für Y").

### Drawer-Umbau

`RflSheetDrawer` (261 Zeilen) verliert das Gitter, behält alles andere. Der Footer bleibt
unverändert — Spiel beenden, wieder öffnen, PDF-Export, „Liga senden". Das Gitter-Rendering
(`SideSheet`, `renderCells`) fliegt hier raus; `utils/bogenSheetRenderer.ts` bleibt, weil der
PDF-Export es weiter braucht.

Der Slot-Stift zieht aus den Gitter-Zeilen in den Aufstellung-Block. Begründung: der Feed soll
reine Lese-Fläche bleiben (sonst tippt man beim Scrollen versehentlich in eine Bearbeitung), im
Wizard wäre er mitten im laufenden Spiel am falschen Ort, und Namen im Feed antippen erreicht
Slots ohne At-Bat nicht. Der Block ersetzt außerdem die Positions-Übersicht, die mit dem Gitter
verloren geht.

Umbenennen: `RflSheetDrawer` → `BogenSheetDrawer`, weil er kein RFL-Sheet mehr zeigt.

### Öffentliche Seite

Route `/live/:token`, **außerhalb `Layout`**, kein Auth-Guard, keine Navigation. Lazy geladen,
in `Suspense` + `ChunkErrorBoundary` wie die anderen schweren Seiten.

`api/client.ts` schickt heute an jeden Request `getAuthHeaders()`. Der öffentliche Aufruf muss
daran vorbei — sonst schickt ein Zuschauer ohne `localStorage.auth` einen kaputten Header, und
ein eingeloggter Nutzer testet die Seite nie im Zuschauer-Zustand. Also ein eigener,
Auth-freier Pfad für `/api/public/**`.

Aktualisierung per Polling alle 10 s, solange `status === 'LIVE'`; bei `DONE` einmal laden und
stoppen. Kein WebSocket. Polling pausiert bei verstecktem Tab (`visibilitychange`).

Teilen-Einstieg: Button im Drawer-Footer bzw. auf der `SpielbogenPage` — Link erzeugen, kopieren,
zurückziehen.

### Zustände

Jeder braucht eine eigene Darstellung, keiner darf als leerer Bildschirm enden:
`DRAFT` (noch nicht gestartet), `LIVE` ohne At-Bats (Spiel läuft, noch nichts passiert),
`DONE` (Endstand, Feed als Nachlese), Token unbekannt/zurückgezogen (404 → „Dieser Link ist
nicht mehr gültig"), Netzfehler beim Polling (letzten Stand stehen lassen, Hinweis einblenden,
weiter versuchen).

## Tests

**Backend**
- `BogenScoreCalculator`: Hits-Zählung über alle `AtBatResult`-Werte
- `BogenScoreCalculator`: **Error-Zuordnung zur feldenden Mannschaft** — At-Bat `side=AWAY,
  isError=true` muss auf `homeTotals.errors` landen. Eigener Test, das ist die Kippstelle.
- `runs`-Summe stimmt mit `meta.homeRuns`/`awayRuns` überein, inklusive per Steal erzielter Runs
- Öffentlicher Endpoint: gültiger Token ohne Auth → 200; unbekannter Token → 404; nach `DELETE
  /share` → 404; `/api/spielbogen/**` bleibt ohne Auth → 401
- Token ist nicht aus der `id` ableitbar; zweimal `POST /share` liefert denselben Token

**Frontend (vitest)**
- Feed-Zeilen-Rendering je Ergebnistyp, Out-Typ, Sacrifice, Error, RBI-Suffix
- Steal-Zeilen je `StealingEventType`
- Sortierung über gemischte Ereignistypen via `createdAt`
- Linescore mit Extra-Innings und mit noch nicht gespielten Innings
- Die vier Zustände oben

**Vor dem Merge**
- `cd frontend && npm run build` und `npm test`
- `cd backend && ./mvnw test -s .mvn/local-settings.xml`
- Die Playwright-E2E-Suite deckt die Legacy-`ScoringPage` ab, nicht den Spielbogen — hier also
  nicht die eigentliche Absicherung, trotzdem laufen lassen, weil `SpielbogenPage` angefasst wird.

## Dokumentation

`docs/SPIELBOGEN.md` um Feed und öffentlichen Link ergänzen. In `CLAUDE.md` den neuen
öffentlichen Pfad bei den Auth-Regeln erwähnen (bisher steht dort nur Basic Auth für alles).

## Bewusst in Kauf genommen

Nach dem Umbau gibt es **keine In-App-Ansicht des RFL-Gitters mehr** — nur noch im PDF-Export.
Das ist die ausdrückliche Entscheidung: das Gitter zeigt, was ohnehin ins PDF kommt, und hilft
während des Spiels nicht. Wer es am Bildschirm braucht, exportiert.
