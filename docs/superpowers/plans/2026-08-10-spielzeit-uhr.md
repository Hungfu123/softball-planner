# Spielzeit-Uhr — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine pausierbare Spielzeit-Uhr mit Limit für Legacy-Scoring und Spielbogen, serverseitig gespeichert, in der Kopfzeile beider Systeme sichtbar.

**Architecture:** Drei additive Spalten je Aggregat (`games`, `spielbogen`) und drei Aktionen (Start, Pause, Fortsetzen). Die verstrichene Zeit wird aus `accumulated + (jetzt − runningSince)` abgeleitet und bei beendeten Spielen gegen `endedAt` gedeckelt. Die Anzeige ist bereits gebaut.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway, PostgreSQL 17 (Testcontainers), React 19, TypeScript, Vite 7, Tailwind v4, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-10-spielzeit-uhr-design.md`
**Design-Mockup:** `/tmp/.../scratchpad/timer-mockup.html` (vom Nutzer freigegeben)

## Ausgangslage

Die **Anzeige existiert bereits** auf `feature/game-clock-ui` (`3a74ab8`): `GameClockReadout` und
`GameClockRule` in `frontend/src/components/shared/GameClock.tsx`, rein präsentational, im
Spielbogen-Streifen verdrahtet mit Platzhalterwerten. 339 vitest-Tests, E2E 77/77.

**Dieser Plan baut darauf auf.** Branch: `feature/game-clock`, abgezweigt von
`feature/game-clock-ui` — nicht von `master`, sonst geht die Anzeige verloren.

## Leitgrundsatz

**Die Uhr liest den Spielzustand, sie schreibt nie hinein.** Kein Endpunkt der Uhr verändert
Score, Inning, Outs, At-Bats oder `endedAt`. Fällt die Uhr aus, ist kein Spiel falsch erfasst.

Umgekehrt schreibt der Spielablauf so selten wie möglich in die Uhr: **genau eine** Kopplung, in
Task 4, mit Begründung dort.

## Global Constraints

- Maven immer mit `-s .mvn/local-settings.xml`. `~/.m2/settings.xml` NICHT anfassen.
- Backend-Tests brauchen einen laufenden Docker-Daemon (Testcontainers).
- Onion-Architektur: `domain` kennt weder Spring-Web, JPA noch DTOs.
- Schema-Änderungen nur als neue `V{n}__*.sql`. Höchste vorhandene Version ist **`V54`** — vor
  dem Schreiben mit `ls backend/src/main/resources/db/migration/` prüfen.
- Deutsche UI-Texte und Fehlermeldungen.
- Tailwind v4, Farben nur aus `frontend/src/styles/index.css`.
- Commits: Conventional Commits mit Gitmoji. **Keine `Co-Authored-By`-Zeilen.**
- **Niemals `git add -A`** — gezielt per Pfad stagen.
- Die bwrap-Sandbox ist defekt: Bash mit `dangerouslyDisableSandbox: true`. Ist Docker nicht
  erreichbar, `DOCKER_HOST=unix:///var/run/docker.sock` exportieren.
- **Spielbogen id 1 und id 143 nicht verändern** — Referenzdaten des Nutzers. Eigene
  Wegwerf-Daten anlegen und wieder abräumen.

## Baseline

Backend 799 / 1 skipped · vitest 339 / 2 skipped (auf `feature/game-clock-ui`) · Lint 0 Fehler /
19 Warnungen · E2E 77/77. Jede Abweichung ist zu erklären.

---

### Task 1: Spalten und Schichten, beide Aggregate

Rein additiv. Danach muss die Suite unverändert grün sein.

**Files:** Migration `V55__game_clock.sql`; `domain/model/Game.java`,
`domain/model/Spielbogen.java`; beide Entities, Mapper, `SpielbogenResponse`, die Legacy-Game-DTOs;
`frontend/src/types/index.ts`

- [ ] **Step 1: Migration**

```sql
-- Spielzeit-Uhr. Pausierbar, deshalb zwei Felder statt eines Startzeitpunkts:
-- accumulated haelt die Zeit vor der laufenden Phase, running_since den Beginn der laufenden.
ALTER TABLE games      ADD COLUMN timer_running_since TIMESTAMP;
ALTER TABLE games      ADD COLUMN timer_accumulated_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games      ADD COLUMN time_limit_minutes INTEGER;

ALTER TABLE spielbogen ADD COLUMN timer_running_since TIMESTAMP;
ALTER TABLE spielbogen ADD COLUMN timer_accumulated_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE spielbogen ADD COLUMN time_limit_minutes INTEGER;
```

Tabellennamen vorher prüfen (`\dt` bzw. die V1-Migration) — Legacy heißt `games`, nicht `game`.

- [ ] **Step 2: Durch alle Schichten**

Domain-Modelle, Entities (`@Column`), **Mapper in beide Richtungen**, DTOs, TS-Typen.

Der Mapper ist die Falle: eine einseitige Abbildung verliert die Felder beim Speichern still.
Zuletzt bei `publicToken` passiert. Beide Mapper vollständig lesen, nicht nur die Diff-Stellen —
es kann ein geteiltes `applyToEntity` geben.

- [ ] **Step 3: Rundlauf-Test je Aggregat**, der fällt, wenn eine Mapper-Richtung fehlt.

- [ ] **Step 4: Verifizieren** — Backend +2 Tests, vitest unverändert 339. Jede andere Abweichung
      bedeutet, dass dieser additive Task etwas angefasst hat, das er nicht anfassen sollte.

- [ ] **Step 5: Commit**

---

### Task 2: Uhr-Logik als Domain-Service

Die Rechnung gehört an eine Stelle, nicht zweimal in zwei Services.

**Files:** `domain/service/GameClockCalculator.java` (neu) + Test

**Interfaces:**
```java
public record ClockState(int elapsedSeconds, boolean running, boolean started,
                         Integer limitMinutes, boolean overLimit) {}

ClockState compute(Instant runningSince, int accumulatedSeconds,
                   Integer limitMinutes, Instant endedAt, Instant now)
```

- [ ] **Step 1: Tests zuerst**

- nie gestartet (`runningSince == null`, `accumulated == 0`) → `started=false`, 0 Sekunden
- läuft → `accumulated + (now − runningSince)`
- pausiert (`runningSince == null`, `accumulated > 0`) → `accumulated`, `running=false`,
  `started=true`
- **beendetes Spiel deckelt gegen `endedAt`**: läuft die Uhr und `endedAt` liegt vor `now`, zählt
  nur bis `endedAt`. Der Test muss fallen, wenn gegen `now` gerechnet wird — das ist der Kern
  dieser Ableitung.
- `endedAt` gesetzt, Uhr pausiert → unverändert `accumulated`
- Limit überschritten → `overLimit=true`; ohne Limit nie `overLimit`
- kein Limit → `limitMinutes=null`, trotzdem korrekte Sekunden (reine Stoppuhr)

- [ ] **Step 2: Rot sehen · Step 3: Umsetzen · Step 4: Grün** — reine Funktion, keine Repositories.

- [ ] **Step 5: Commit**

---

### Task 3: Endpunkte, beide Systeme

Symmetrisch. Reihenfolge: **erst Legacy** (das der Nutzer täglich benutzt), dann Spielbogen.

**Files:** `application/GameClockService.java` (neu, bedient beide Aggregate oder je einer —
Entscheidung des Implementers, begründen); `ScoringController`, `SpielbogenController`; Tests

**Endpunkte je System:**

| | |
|---|---|
| `POST .../clock/start` | Body `{ limitMinutes: number \| null }`. Setzt `runningSince = jetzt`. **Ablehnen, wenn die Uhr läuft.** |
| `POST .../clock/pause` | `accumulated += jetzt − runningSince`, `runningSince = null`. **Ablehnen, wenn sie nicht läuft.** |
| `POST .../clock/resume` | `runningSince = jetzt`. **Ablehnen, wenn sie läuft oder nie gestartet war.** |
| `POST .../clock/reset` | `runningSince = null`, `accumulated = 0`. Limit bleibt. |

Doppeltes Starten oder Pausieren wird mit `BusinessValidationException` abgelehnt, nicht still
geschluckt — ein Doppeltipp auf dem Handy würde sonst Zeit verschlucken oder verdoppeln, und
niemand merkt es, bis die Zahl nicht mehr stimmt.

**Die Antwort enthält den berechneten `ClockState`**, nicht nur die Rohfelder. Sonst rechnet das
Handy mit seiner eigenen Uhr und die Anzeige driftet, wenn das Gerät falsch geht. Auch die
bestehenden Lese-Endpunkte (Scoreboard, Sheet) liefern den Zustand mit.

- [ ] **Step 1: Integrationstests zuerst** — je System: Start setzt Werte; zweiter Start abgelehnt;
      Pause bucht und leert; zweite Pause abgelehnt; Fortsetzen zählt weiter ohne Verlust;
      Fortsetzen ohne Start abgelehnt; Start → Pause → Fortsetzen → Pause summiert korrekt; Reset
      leert die Zeit und lässt das Limit stehen; die Antwort enthält `elapsedSeconds`.
- [ ] **Step 2: Rot · Step 3: Umsetzen · Step 4: Grün + volle Backend-Suite**
- [ ] **Step 5: Commit** (Legacy und Spielbogen dürfen getrennte Commits sein)

---

### Task 4: Wiederöffnen pausiert die Uhr

**Der einzige Schreibvorgang vom Spielablauf in die Uhr.** Begründung gehört in den Code.

**Files:** `GameService` (reopen, ~Zeile 106), `SpielbogenService.reopen` (~157),
`SpielbogenScoringService.reopenIfDone` (~328); Tests

Beim Wiederöffnen fällt `endedAt` weg. Die Ableitung aus Task 2 verlöre damit ihre Obergrenze und
zählte schlagartig alle Stunden seit Spielende mit — die Anzeige spränge von 93 Minuten auf
vierzehn.

**Regel:** vor dem Nullen von `endedAt`, falls die Uhr läuft:
`accumulated += endedAt − runningSince`, `runningSince = null`. Berechenbar, weil `endedAt` in
diesem Moment noch gesetzt ist.

- [ ] **Step 1: Tests zuerst**
  - beendetes Spiel mit laufender Uhr wieder öffnen → Uhr pausiert, verstrichene Zeit unverändert
    gegenüber dem Stand bei Spielende. **Der Test muss fallen, wenn die Zeit springt.**
  - beendetes Spiel mit pausierter Uhr → unverändert
  - **Regressionsschutz:** Wiederöffnen eines Spiels **ohne** Uhr verhält sich exakt wie heute
- [ ] **Step 2: Rot · Step 3: Umsetzen · Step 4: Grün**
- [ ] **Step 5: Commit**

**Ausdrücklich nicht anfassen:** die vier Stellen, die `endedAt` **setzen** (`GameService:95`,
`SpielbogenService:145`, `SpielbogenScoringService:158` und `:240`). Das Einfrieren beim
Spielende erledigt die Ableitung aus Task 2 ohne Codeänderung. Und `resetScoring` bleibt
unberührt — die Uhr hat ihren eigenen Reset.

---

### Task 5: Legacy-Kopfzeile verdrahten

Zuerst Legacy, weil der Nutzer es täglich benutzt und die Uhr dort zuerst im Einsatz steht.

**Files:** `components/scoring/ScoringPage.tsx`, `api/client.ts`, ein Start-Dialog, Tests

- [ ] **Step 1:** `GameClockReadout` und `GameClockRule` aus
      `@/components/shared/GameClock` in den Legacy-Kopfbereich einsetzen, analog zum Spielbogen.
      Die Komponenten existieren und sind getestet — **nicht neu bauen**.
- [ ] **Step 2:** Start-Dialog über `ResponsiveSheet`: Schnellwahl `50 min` und `90 min`, daneben
      freie Eingabe, plus „ohne Limit". Tippen auf die Uhr startet, pausiert, setzt fort.
- [ ] **Step 3: Tests** — Zustandswechsel; **und der Regressionsschutz: ohne gestartete Uhr
      rendert die Kopfzeile unverändert wie heute.** Der Test prüft das DOM, nicht Props.
- [ ] **Step 4:** `npm test`, `npm run build`, `npm run lint`, **`npm run test:e2e`** — die Suite
      deckt das Legacy-Scoring dicht ab und dessen Kopfzeile wird angefasst.
- [ ] **Step 5:** Von Hand: Uhr starten, pausieren, fortsetzen, **Seite neu laden** und prüfen,
      dass die Zeit stimmt. Das Neuladen ist der eigentliche Test — dafür liegt die Uhr auf dem
      Server. Danach eigene Testdaten abräumen.
- [ ] **Step 6: Commit**

---

### Task 6: Spielbogen-Kopfzeile verdrahten

Die Platzhalterwerte aus `feature/game-clock-ui` durch echte Daten ersetzen.

**Files:** `components/spielbogen/SpielbogenPage.tsx` (Zeilen ~728 und ~748), `api/client.ts`, Tests

- [ ] **Step 1:** `elapsedSeconds={0} limitMinutes={null} running={false} started={false}` durch
      die Werte aus der Sheet-Antwort ersetzen, `onPress` verdrahten.
- [ ] **Step 2:** Denselben Start-Dialog wiederverwenden, den Task 5 gebaut hat — nicht kopieren.
- [ ] **Step 3–5:** Tests inklusive Regressionsschutz, Suiten, Handprüfung mit Neuladen, Commit.

---

### Task 7: `Zeit:` im PDF füllen

**Files:** `utils/spielbogenPdfExport.ts` (Zeile 35), Test

Heute: `drawHeaderField(doc, 'Zeit:', '', 232, 20, 244, 38)` — fest leer.

- [ ] Die **Startzeit** eintragen, sobald eine existiert (Uhrzeit `HH:MM`, nicht die Dauer — auf
      dem RFL-Blatt steht dort die Anfangszeit). Ohne gestartete Uhr bleibt das Feld leer wie
      heute.
- [ ] Test für beide Fälle. Danach `rfl-demo.pdf` neu erzeugen **über den echten Browser-Export**,
      nicht über einen kopflosen Test — dort greift der Notfall-Zweig des Logos und das Ergebnis
      täuscht.

---

### Task 8: Dokumentation

`docs/SPIELBOGEN.md` und `docs/SCORING-LEGACY.md`: die Uhr aufnehmen, samt dem Leitgrundsatz
(Uhr liest, schreibt nie) und der einen Ausnahme beim Wiederöffnen. `CLAUDE.md` (**gitignored**,
bearbeiten, nicht stagen) bei den Domänenregeln ergänzen.

---

## Abschlussprüfung vor dem Merge

- [ ] `cd backend && ./mvnw test -s .mvn/local-settings.xml`
- [ ] `cd frontend && npm test && npm run build && npm run lint`
- [ ] `cd frontend && npm run test:e2e` — 77 erwartet
- [ ] **Ein Spiel in beiden Systemen ohne Uhr durchgespielt** — der Nachweis, dass der übliche
      Weg unverändert funktioniert. Wichtiger als jeder Uhr-Test.
- [ ] Uhr gestartet, pausiert, fortgesetzt, Seite neu geladen, Zeit stimmt
- [ ] Beendetes Spiel wieder geöffnet: Zeit springt nicht
- [ ] PDF mit gefülltem `Zeit:`-Feld angesehen
- [ ] Eigene Testdaten abgeräumt; Spielbogen 1 und 143 unangetastet
- [ ] **Nicht am Tag vor einem Spiel deployen.**
