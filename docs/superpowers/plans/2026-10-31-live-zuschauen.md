# Live zuschauen beim Scoren — Umsetzungsplan

> **Für agentische Arbeiter:** PFLICHT-SUB-SKILL: `superpowers:executing-plans` oder
> `superpowers:subagent-driven-development`. Schritte tragen Kästchen (`- [ ]`).

**Ziel:** Wer am Spieltag in die App schaut, sieht das laufende Spiel live mitlaufen —
Diamant, Runner, Stand, Verlauf. Wer scort, sieht, wer gerade scort, und kann übernehmen.

**Architektur:** Eine Ansicht für alle (`ScoringPage`), drei Zustände (Zuschauer, Scorer
ohne aktiven Status, aktiver Scorer). Der Zustand kommt immer aus `reload()`, nie aus einem
Ereignis. Transport zuerst durch Nachfragen, der Ereignisstrom kommt in einem späteren Plan.

**Stack:** React 19, Spring Boot 3.4, PostgreSQL, Flyway, Playwright, vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-live-scoring-zu-mehreren-design.md`
samt **Nachtrag vom 31.10.2026** — der Nachtrag geht dem Hauptteil vor.

## Globale Vorgaben

- **Der Schreibpfad wird nicht angefasst.** Kein `GameScoringService`, kein `recordAtBat`,
  keine Undo-Logik, keine Inning-Advance. Erweitert wird das Nachladen, nicht das Schreiben.
- **Kein neuer Grund, aus dem ein Eintrag scheitern kann.** Der aktive Scorer lebt in der
  Oberfläche; kein Endpunkt lehnt wegen ihm etwas ab.
- **Vor jedem Commit an Aufgabe 1:** `cd frontend && npm run test:e2e` (die volle
  Scoring-Suite, so verlangt es CLAUDE.md).
- Deutsche Oberfläche. **Keine Gedankenstriche in sichtbarem Text.**
- Kein `git add -A`; Maven immer mit `-s .mvn/local-settings.xml`.
- Das Wort „Stift" kommt weder in der Oberfläche noch im Code vor. Der Zustand heißt
  `aktiverScorer`.

## Review Focus

- **Offener Korrekturbogen beim Nachladen.** Der halbe At-Bat lebt nur lokal. Fällt eine
  Sperre weg, ist er weg, und niemandem fällt es auf, bis der Eintrag fehlt.
- **Ein Spiel ohne Aufstellung.** `getLineup` liefert leer; die Vorschau darf nicht werfen.
- **Zwei Geräte, ein Konto.** Der aktive Scorer hängt am Konto; das eigene zweite Gerät
  darf sich nicht selbst verdrängen.
- **Nachfragen im Hintergrund.** Eine App in der Tasche darf nichts abrufen.
- **Zuschauer ohne Scorer-Recht tippt auf einen abgeschalteten Knopf.** Nichts passiert,
  und nichts wird gesendet.

---

### Aufgabe 1: `reload()` holt Aufstellung, Wechsel und Spielzeile mit

Der einzige Schritt, der den bestehenden Ablauf berührt. Geht allein raus.

**Dateien:**
- Ändern: `frontend/src/hooks/useScoring.ts`
- Ändern: `frontend/src/components/scoring/ScoringPage.tsx` (Zeilen um 110: die beiden
  Einmal-Abrufe von `getLineup`/`getSubstitutions` fallen weg)
- Test: `frontend/src/hooks/useScoring.test.ts` (neu)

**Schnittstellen:**
- Liefert: `useScoring` gibt zusätzlich `lineup: LineupEntryResponse[]`,
  `substitutions: SubstitutionResponse[]`, `game: GameResponse | null` zurück.
- Benutzt: `api.getLineup(gameId)`, `api.getSubstitutions(gameId)`, `api.getGame(gameId)`.

- [ ] **Schritt 1: Test schreiben** — `reload()` holt alle sechs Dinge; nach
      `recordAtBat` sind Aufstellung und Wechsel erneut abgerufen worden.
- [ ] **Schritt 2: Rot sehen** — `npx vitest run src/hooks/useScoring.test.ts`,
      erwartet FAIL („lineup is not a function" bzw. fehlende Aufrufe).
- [ ] **Schritt 3: `reload()` erweitern** — die drei Abrufe in dasselbe `Promise.all`.
      Fehler einzelner Abrufe dürfen den Rest nicht kippen: `getLineup` und
      `getSubstitutions` fallen auf `[]` zurück, wie heute in `ScoringPage`.
- [ ] **Schritt 4: `ScoringPage` umstellen** — eigener Zustand für `lineup` und
      `substitutions` entfällt, die Werte kommen aus dem Hook. `currentGame` bleibt die
      Quelle für den Gegner; `game` aus dem Hook überschreibt Spielstand und Spielende.
- [ ] **Schritt 5: Grün sehen** — `npx vitest run src/hooks src/components/scoring`.
- [ ] **Schritt 6: Die volle E2E** — `npm run test:e2e`. Erwartet: alles grün, keine
      neuen Flaker.
- [ ] **Schritt 7: Commit** (`frontend/src/hooks/useScoring.ts`,
      `frontend/src/hooks/useScoring.test.ts`, `frontend/src/components/scoring/ScoringPage.tsx`).

---

### Aufgabe 2: Zuschauer-Modus in der Ansicht

**Dateien:**
- Ändern: `frontend/src/components/scoring/ScoringPage.tsx`, `ActionButtons.tsx`
- Ändern: `frontend/src/routes.tsx` (die Scoring-Route verlangt kein Scorer-Recht mehr)
- Test: `frontend/src/components/scoring/ScoringPage.zuschauen.test.tsx` (neu)

**Schnittstellen:**
- Benutzt: `useRolle().darfScoren`.
- Liefert: `ActionButtons` nimmt `nurLesen?: boolean` und schaltet alle Knöpfe ab.

- [ ] **Schritt 1: Test schreiben** — ohne Scorer-Recht sind alle Knöpfe abgeschaltet,
      Diamant, Stand und Uhr aber da; ein Klick sendet nichts.
- [ ] **Schritt 2: Rot sehen.**
- [ ] **Schritt 3: `RequireRole scorer` an der Route durch `RequireAuth` ersetzen.**
      Jeder Angemeldete darf die Seite öffnen. Begründung steht im Nachtrag.
- [ ] **Schritt 4: `nurLesen` durchreichen** — Knöpfe `disabled`, Korrekturbogen und
      Blätter gar nicht erst öffnen.
- [ ] **Schritt 5: Zugang** — auf der Spieltag-Kachel der Startseite eine Zeile
      „Live zuschauen", solange ein Spiel des heutigen Spieltags läuft.
- [ ] **Schritt 6: Grün sehen, dann E2E.**
- [ ] **Schritt 7: Commit.**

---

### Aufgabe 3: Nachfragen, und zwar nur wenn es ungefährlich ist

**Dateien:**
- Neu: `frontend/src/hooks/useLiveNachfragen.ts`
- Ändern: `frontend/src/components/scoring/ScoringPage.tsx`
- Test: `frontend/src/hooks/useLiveNachfragen.test.ts` (neu)

**Schnittstellen:**
- Liefert: `useLiveNachfragen({ laden, gesperrt, taktMs })` — ruft `laden()` im
  Vordergrund im Takt auf, nie solange `gesperrt` wahr ist, und holt Versäumtes nach,
  sobald die Sperre fällt.

- [ ] **Schritt 1: Test schreiben** — (a) im Takt wird geladen, (b) bei `gesperrt` nicht,
      (c) nach dem Fallen der Sperre genau einmal nachgeholt, (d) im Hintergrund
      (`document.hidden`) gar nicht.
- [ ] **Schritt 2: Rot sehen.**
- [ ] **Schritt 3: Hook bauen** — `visibilitychange` wie in `pwa/appUpdate.ts`.
- [ ] **Schritt 4: In `ScoringPage` einhängen** — `gesperrt` ist wahr, solange ein
      Korrekturbogen oder ein anderes Blatt offen ist oder ein Schreibvorgang läuft.
- [ ] **Schritt 5: Tipp auf die Statuszeile** holt sofort.
- [ ] **Schritt 6: Grün sehen, dann E2E.**
- [ ] **Schritt 7: Commit.**

---

### Aufgabe 4: Der aktive Scorer im Backend

**Dateien:**
- Neu: `backend/src/main/resources/db/migration/V78__aktiver_scorer.sql`
- Neu: `domain/model/AktiverScorer.java`, `domain/port/out/AktiverScorerRepository.java`,
  `application/AktiverScorerService.java`, `adapter/in/web/AktiverScorerController.java`,
  Entity, Mapper, Adapter nach dem bestehenden Zuschnitt
- Test: `backend/src/test/java/com/softball/integration/AktiverScorerIntegrationTest.java`

**Schnittstellen:**
- Liefert: `GET /api/games/{id}/aktiver-scorer` → `{ accountId, name, seit, letzterEintrag }`
  oder leer; `POST /api/games/{id}/aktiver-scorer` übernimmt.
- Herzschlag: `AktiverScorerService.melde(gameId, account)` wird **aus dem bestehenden
  Audit-Weg** gespeist, nicht aus `GameScoringService` — der Schreibpfad bleibt unberührt.

- [ ] **Schritt 1: Test schreiben** — wer schreibt, wird aktiv; nach zwei Minuten ohne
      Eintrag ist niemand aktiv; Übernehmen gelingt immer; zwei Geräte eines Kontos
      verdrängen sich nicht.
- [ ] **Schritt 2: Rot sehen** (`./mvnw test -s .mvn/local-settings.xml -Dtest=AktiverScorerIntegrationTest`).
- [ ] **Schritt 3: Migration und Schichten bauen.**
- [ ] **Schritt 4: Grün sehen, dann die volle Backend-Suite.**
- [ ] **Schritt 5: Commit.**

---

### Aufgabe 5: Statuszeile und Übernehmen

**Dateien:**
- Neu: `frontend/src/components/scoring/ScorerZeile.tsx`
- Ändern: `frontend/src/components/scoring/ScoringPage.tsx`
- Test: `frontend/src/components/scoring/ScorerZeile.test.tsx`

**Schnittstellen:**
- `ScorerZeile` nimmt `{ aktiver, ichBinEs, darfScoren, zuschauer, onUebernehmen, onJetzt }`.

- [ ] **Schritt 1: Test schreiben** — die sieben Zeilen aus der Tabelle des Nachtrags,
      inklusive „allein heißt still" (nichts gerendert).
- [ ] **Schritt 2: Rot sehen.**
- [ ] **Schritt 3: Zeile bauen**, Wortlaut wörtlich aus dem Nachtrag.
- [ ] **Schritt 4: Knöpfe koppeln** — ein Scorer, der nicht aktiv ist, bekommt graue
      Knöpfe; ist niemand aktiv, sind sie scharf.
- [ ] **Schritt 5: Rückfrage** beim Übernehmen, wenn der andere vor weniger als 30
      Sekunden geschrieben hat.
- [ ] **Schritt 6: Grün sehen, dann E2E.**
- [ ] **Schritt 7: Commit.**

---

## Nicht in diesem Plan

- Der Ereignisstrom (SSE) und Nginx. Eigener Plan, nachdem das Nachfragen am Feld gelaufen ist.
- Der hochzählende Spielstand und der einfahrende Verlaufseintrag.
- Der Verlauf in Worten (gemeinsame Ergebnis-Namen mit `bogenFeed.ts`).
- Der Spielbogen. Der bleibt Einzelbedienung.
