# Playmaker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Werkzeug unter `/orga/playmaker`, mit dem der Trainer Spielsituationen als abspielbare Animation baut und das Team sie nachliest.

**Architecture:** Backend nach Onion — Domain-Modelle und `PlayValidator` ohne Spring, Ports in `domain/port/out`, Adapter in `adapter/out/persistence`, REST in `adapter/in/web`. Ein Play ist eine Folge von Ständen; die Marker eines Stands liegen als JSON-Spalte, weil sie immer vollständig gelesen und geschrieben werden. Frontend: eine Board-Komponente für alle vier Ansichten, die Rechenkerne (Zuschnitt, Maßstab, Interpolation) als reine Funktionen mit eigenen Tests.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway, PostgreSQL 17 (Testcontainers), React 19, TypeScript, Vite 7, Tailwind v4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-20-playmaker-design.md`

## Global Constraints

- Deutsch in allen Beschriftungen, Fehlermeldungen und Texten.
- Flyway: neue Migrationen `V66`, `V67`, `V68`. `ddl-auto=validate`, kein Schema per Hand.
- Maven immer mit `-s .mvn/local-settings.xml`.
- Keine Schichtverletzungen: `domain` kennt kein Spring, kein JPA, keine DTOs.
- DTOs sind Java-Records in `adapter/dto/`, Bean Validation auf den Request-Records.
- `BusinessValidationException` → 400, `ResourceNotFoundException` → 404.
- Tailwind v4 ohne eckige Klammern, Icons aus `src/icons/`, keine Icon-Bibliothek.
- Modals statt `confirm()`; `ResponsiveSheet` portalt nach `body`.
- Board-Koordinaten: Einheit = ein Fuß, Ursprung oben links, **y nach unten**, Home bei `(155, 218)`.
- Feldmaße: Base-Weg 60, Home→2B 84,85, Pitching-Distanz 43, Circle-Radius 8, Sandbogen 60 um die Plate, Zaun 215, Backstop 25.
- Farben: Gras `#93B268`, Sand `#E3C9A4`, Linien `#FFFFFF`, Inventar `#FBF6EC` mit Kontur `#10133F` 0,4, Verteidiger `#10133F`, Runner `#B91C2A`, Ball `#E6F03C`.
- Marker: sichtbarer Durchmesser = 30 % des Base-Wegs auf dem Schirm, mindestens 26 px, höchstens 44 px (`pointer: coarse`) bzw. 56 px (`pointer: fine`). Trefferfläche immer mindestens 44 px.
- Keine Regel-Logik: die App prüft keine Softball-Regeln.
- Commits mit Gitmoji, **ohne** `Co-Authored-By`.

## Review Focus

1. **Play ohne Stände** — `PUT` mit leerer Standliste muss 400 liefern, nicht ein unsichtbares Play erzeugen (Task 2).
2. **Zuschnitt bei einem einzigen Marker** — Mindestbreite 130 ft greift, sonst Division durch nahe Null und unendlicher Zoom (Task 5).
3. **Wiedergabe verändert den gespeicherten Zustand** — der Fehler aus dem Prototyp; `frameAt` muss seine Eingabe unberührt lassen (Task 7).
4. **Autosave scheitert** — Netz weg mitten im Bauen: sichtbarer Zustand „Nicht gesichert", Wiederholen, Warnung beim Verlassen (Task 10).
5. **Kategorie mit gleichem Namen in anderer Schreibweise** — „Cutoff" neben „cut off" zerlegt die Gruppierung; Unique ohne Rücksicht auf Groß- und Kleinschreibung (Task 1 und 4).

---

## Dateien

**Backend**
- `db/migration/V66__play_category.sql`, `V67__play.sql`, `V68__seed_plays.sql`
- `domain/model/`: `Play`, `PlayStep`, `PlayMarkers`, `PlayCategory`, `BallState`, `GameState`
- `domain/port/out/`: `PlayRepository`, `PlayCategoryRepository`
- `domain/service/PlayValidator.java`
- `application/`: `PlayService`, `PlayCategoryService`
- `adapter/in/web/`: `PlayController`, `PlayCategoryController`
- `adapter/dto/`: `PlayRequest`, `PlayResponse`, `PlayStepRequest`, `PlayStepResponse`, `PlayCategoryRequest`, `PlayCategoryResponse`
- `adapter/out/persistence/`: `entity/PlayEntity`, `entity/PlayStepEntity`, `entity/PlayCategoryEntity`, `mapper/PlayMapper`, `repository/SpringPlayRepository`, `repository/SpringPlayCategoryRepository`, `adapter/PlayRepositoryAdapter`, `adapter/PlayCategoryRepositoryAdapter`

**Frontend**
- `src/components/playmaker/board/geometry.ts` — Feldmaße, Pfade, Base-Punkte
- `src/components/playmaker/board/layout.ts` — Zuschnitt, Maßstab, Marker-Größe
- `src/components/playmaker/board/interpolate.ts` — `frameAt`, Kurven, Runner-Pfad
- `src/components/playmaker/PlayBoard.tsx` — Darstellung, alle vier Ansichten
- `src/components/playmaker/PlaymakerOverview.tsx`, `PlaySetupPage.tsx`, `PlayEditorPage.tsx`, `PlayViewerPage.tsx`
- `src/components/playmaker/PlaybackBar.tsx`, `StepTimeline.tsx`, `LegendSheet.tsx`
- `src/hooks/usePlays.ts`, `src/hooks/usePlayEditor.ts`, `src/hooks/usePlayback.ts`
- `src/api/plays.ts`
- Tests: `board/layout.test.ts`, `board/interpolate.test.ts`, `e2e/playmaker.spec.ts`

---

### Task 1: Schema und Kategorien

**Files:**
- Create: `backend/src/main/resources/db/migration/V66__play_category.sql`
- Create: `backend/src/main/resources/db/migration/V67__play.sql`
- Test: `backend/src/test/java/com/softball/adapter/out/persistence/PlaySchemaTest.java`

**Interfaces:**
- Produces: Tabellen `play_category(id, name, sort_order)`, `play(id, title, category_id, game_state, game_state_note, counterpart_play_id, created_at, updated_at)`, `play_step(id, play_id, ordinal, duration_ms, note, outs, markers jsonb)`.

- [ ] **Step 1: Migration `V66` schreiben** — Tabelle `play_category` mit `name varchar(80) not null`, eindeutigem Index `lower(name)`, `sort_order int not null`. Danach `INSERT` der acht Startkategorien: Cut-off & Relay, Bunt-Defense, Rundown, First-and-Third, Pop-up-Priorities, Steal-Defense & Pickoff, Base-Coverage, Spielsituationen.
- [ ] **Step 2: Migration `V67` schreiben** — `play` mit `counterpart_play_id` als selbstbezüglicher FK `on delete set null`, `category_id` FK `on delete restrict`, `game_state varchar(16) not null default 'ANY'`. `play_step` mit `markers jsonb not null`, `outs smallint not null check (outs between 0 and 3)`, `duration_ms int not null`, eindeutigem Index auf `(play_id, ordinal)`, FK `on delete cascade`.
- [ ] **Step 3: Test schreiben**, der mit Testcontainers hochfährt, die acht Kategorien zählt und erwartet, dass ein zweites `INSERT` von `'cutoff & relay'` neben `'Cut-off & Relay'` fehlschlägt.
- [ ] **Step 4: `./mvnw test -s .mvn/local-settings.xml -Dtest=PlaySchemaTest`** — Expected: PASS.
- [ ] **Step 5: Commit** `✨ Playmaker: Schema fuer Plays und Kategorien`

### Task 2: Domain und Validator

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/{Play,PlayStep,PlayMarkers,PlayCategory,BallState,GameState}.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/{PlayRepository,PlayCategoryRepository}.java`
- Create: `backend/src/main/java/com/softball/domain/service/PlayValidator.java`
- Test: `backend/src/test/java/com/softball/domain/service/PlayValidatorTest.java`

**Interfaces:**
- Produces: `PlayValidator.validate(Play play)` wirft `BusinessValidationException`. `PlayMarkers` mit `List<Defender> defenders`, `List<Runner> runners`, `Ball ball`; `Defender(String position, double x, double y)`, `Runner(String id, double x, double y, RunnerStatus status)`, `Ball(BallState state, String holder, double x, double y, Trajectory trajectory)`.

- [ ] **Step 1: Failing tests schreiben** — `rejectsPlayWithoutSteps`, `rejectsNonSequentialOrdinals`, `rejectsOutsAboveThree`, `acceptsOutsExactlyThree`, `rejectsUnknownDuration`, `rejectsSelfCounterpart`, `acceptsMinimalValidPlay`.
- [ ] **Step 2: `./mvnw test -s .mvn/local-settings.xml -Dtest=PlayValidatorTest`** — Expected: FAIL, Klassen fehlen.
- [ ] **Step 3: Modelle und `PlayValidator` implementieren.** Erlaubte Dauern: 600, 1200, 2000. `ordinal` muss lückenlos 1..N sein.
- [ ] **Step 4: Tests laufen lassen** — Expected: PASS.
- [ ] **Step 5: Commit** `✨ Playmaker: Domain-Modell und Validator`

### Task 3: Persistenz

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/{PlayEntity,PlayStepEntity,PlayCategoryEntity}.java`
- Create: `.../mapper/PlayMapper.java`, `.../repository/Spring{Play,PlayCategory}Repository.java`, `.../adapter/{Play,PlayCategory}RepositoryAdapter.java`
- Test: `backend/src/test/java/com/softball/adapter/out/persistence/PlayRepositoryAdapterTest.java`

**Interfaces:**
- Consumes: Ports aus Task 2.
- Produces: `PlayRepositoryAdapter implements PlayRepository` mit `findAll()`, `findById(Long)`, `save(Play)`, `deleteById(Long)`.

- [ ] **Step 1: Failing test** `savesAndReadsBackAllMarkers` — speichert ein Play mit neun Verteidigern, zwei Runnern und Ball `IN_HAND`, liest es neu und vergleicht Feld für Feld.
- [ ] **Step 2: Test laufen lassen** — Expected: FAIL.
- [ ] **Step 3: Entities, Mapper und Adapter implementieren.** `markers` über `@JdbcTypeCode(SqlTypes.JSON)` auf ein `PlayMarkers`-Record.
- [ ] **Step 4: Test laufen lassen** — Expected: PASS.
- [ ] **Step 5: Commit** `✨ Playmaker: Persistenz-Adapter`

### Task 4: Services und REST

**Files:**
- Create: `backend/src/main/java/com/softball/application/{PlayService,PlayCategoryService}.java`
- Create: `backend/src/main/java/com/softball/adapter/in/web/{PlayController,PlayCategoryController}.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/…`
- Test: `backend/src/test/java/com/softball/adapter/in/web/PlayControllerIntegrationTest.java`

**Interfaces:**
- Produces: `GET /api/plays` (vollständige Plays inklusive Stände), `GET/POST/PUT/DELETE /api/plays[/{id}]`, `GET/POST/PUT /api/play-categories[/{id}]`, `POST /api/play-categories/{id}/merge/{targetId}`, `DELETE /api/play-categories/{id}`.

- [ ] **Step 1: Failing tests** — `listReturnsStepsInline`, `putReplacesAllSteps`, `putWithoutStepsReturns400`, `deleteCategoryWithPlaysReturns400`, `mergeMovesPlays`, `deletePlayNullsCounterpart`, `duplicateCategoryNameCaseInsensitiveReturns400`.
- [ ] **Step 2: Tests laufen lassen** — Expected: FAIL.
- [ ] **Step 3: Services, Controller und DTOs implementieren.** `PUT` löscht alle Stände und legt sie neu an, in einer Transaktion. INFO-Log bei create, update, delete, merge.
- [ ] **Step 4: Tests laufen lassen** — Expected: PASS.
- [ ] **Step 5: Commit** `✨ Playmaker: Service-Schicht und REST-Endpunkte`

### Task 5: Board-Geometrie und Layout-Mathematik

**Files:**
- Create: `frontend/src/components/playmaker/board/geometry.ts`
- Create: `frontend/src/components/playmaker/board/layout.ts`
- Test: `frontend/src/components/playmaker/board/layout.test.ts`

**Interfaces:**
- Produces: `FIELD` (Konstanten und SVG-Pfade), `BASES`, `DEFAULT_DEFENSE`; `computeContentBox(steps): Box`, `fitViewBox(box, areaW, areaH, mode: 'full' | 'content'): {viewBox: Box, scale: number}`, `markerRadius(scale, pointerFine): number`.

- [ ] **Step 1: Failing tests schreiben**

```ts
test('Zuschnitt umschliesst alle Marker aller Staende plus Home plus 20 ft', …)
test('Mindestbreite 130 ft bei nur einem Marker', …)
test('fitViewBox zieht auf das Seitenverhaeltnis AUF, schneidet nie ab', …)
test('Home bleibt am unteren Rand, der Zuwachs geht nach oben', …)
test('mode "full" liefert immer das ganze Feld, unabhaengig vom Inhalt', …)
test('markerRadius: 30 % des Base-Wegs, geklemmt auf 26..44 bzw. 26..56', …)
```

- [ ] **Step 2: `npx vitest run src/components/playmaker/board/layout.test.ts`** — Expected: FAIL.
- [ ] **Step 3: `geometry.ts` und `layout.ts` implementieren.** Aufziehen: `cropAspect < areaAspect ? w = h * areaAspect : h = w / areaAspect`.
- [ ] **Step 4: Tests laufen lassen** — Expected: PASS.
- [ ] **Step 5: Commit** `✨ Playmaker: Feldgeometrie und Layout-Mathematik`

### Task 6: PlayBoard

**Files:**
- Create: `frontend/src/components/playmaker/PlayBoard.tsx`
- Test: `frontend/src/components/playmaker/PlayBoard.test.tsx`

**Interfaces:**
- Consumes: Task 5.
- Produces: `<PlayBoard step markers mode onMarkerDrag? ghostPath? className>`; Props `interactive: boolean`, `showGhostPath: boolean`.

- [ ] **Step 1: Failing tests** — `zeichnet neun Verteidiger mit Kuerzel`, `Ball liegt an der Kante der Scheibe wenn gehalten`, `Z-Reihenfolge: Ball zuletzt im DOM`, `kein Marker ausserhalb des viewBox`.
- [ ] **Step 2: Tests laufen lassen** — Expected: FAIL.
- [ ] **Step 3: `PlayBoard` implementieren.** Reihenfolge: Gras, Sand, Linien, Inventar, Pfade, Verteidiger, Runner, Ball. `touch-action: none` auf dem Rahmen.
- [ ] **Step 4: Tests laufen lassen** — Expected: PASS.
- [ ] **Step 5: Commit** `✨ Playmaker: Board-Komponente`

### Task 7: Interpolation und Wiedergabe

**Files:**
- Create: `frontend/src/components/playmaker/board/interpolate.ts`
- Create: `frontend/src/hooks/usePlayback.ts`
- Test: `frontend/src/components/playmaker/board/interpolate.test.ts`

**Interfaces:**
- Produces: `frameAt(steps: PlayStep[], from: number, to: number, t: number): PlayMarkers`; `usePlayback(steps, {speed, loop})` liefert `{frame, index, playing, play, pause, next, prev, seek}`.

- [ ] **Step 1: Failing tests**

```ts
test('frameAt veraendert die Eingabe nicht', …)          // der Prototyp-Fehler
test('t=0 ergibt Stand A, t=1 ergibt Stand B', …)
test('Ball ist zur Haelfte der Zeit weiter als ein Spieler gleicher Strecke', …)
test('Runner von 1 nach 3 laeuft ueber die 2', …)
test('Runner mit Status OUT fehlt im Folgebild', …)
```

- [ ] **Step 2: Tests laufen lassen** — Expected: FAIL.
- [ ] **Step 3: Implementieren.** Spieler `ease-in-out`, Ball `ease-out`. Runner zwischen zwei Bases entlang der Base-Wege, sonst gerade. 400 ms Halt am Standende, Tempo 0,5× / 1× / 2×.
- [ ] **Step 4: Tests laufen lassen** — Expected: PASS.
- [ ] **Step 5: Commit** `✨ Playmaker: Interpolation und Wiedergabe`

### Task 8: API-Anbindung, Routen, Einstieg

**Files:**
- Create: `frontend/src/api/plays.ts`, `frontend/src/hooks/usePlays.ts`
- Create: `frontend/src/components/playmaker/PlaymakerOverview.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/components/orga/OrgaHome.tsx`

**Interfaces:**
- Produces: `usePlays()` → `{plays, categories, loading, error, reload}`; Routen `/orga/playmaker`, `/orga/playmaker/neu`, `/orga/playmaker/:id`, `/orga/playmaker/:id/bearbeiten`.

- [ ] **Step 1: `plays.ts` und `usePlays` schreiben**, Lazy-Route in `App.tsx` mit `Suspense` und `ChunkErrorBoundary`, Kachel in `OrgaHome.tsx`.
- [ ] **Step 2: Übersicht bauen** — oben das zuletzt bearbeitete Play großflächig mit Verlauf und Meta-Zeile, darunter Kategorie-Auswahlfeld mit Anzahl, darunter Zeilen mit Vorschau des ersten Stands. Leerzustand mit CrossBones. Spiellage als einzige Pille, nur wenn ≠ `ANY`.
- [ ] **Step 3: Zeilenmenü** — Langdruck beziehungsweise Hover-Reveal mit Duplizieren, Umbenennen, Löschen. Duplizieren kopiert Play samt Ständen über `POST`; Löschen über `ConfirmModal`.
- [ ] **Step 4: Offline prüfen** — Einen Aufruf von `/api/plays` online absetzen, Netz abschalten, Übersicht und Spieleransicht neu laden: beide müssen aus dem Cache kommen. Reicht die gemeinsame `maxEntries: 100` nicht, eine eigene Workbox-Regel für `/api/plays` in `vite.config.ts` ergänzen.
- [ ] **Step 5: `npm run build`** — Expected: keine Typfehler.
- [ ] **Step 6: Commit** `✨ Playmaker: Uebersicht und Einstieg`

### Task 9: Setup

**Files:**
- Create: `frontend/src/components/playmaker/PlaySetupPage.tsx`

- [ ] **Step 1: Seite bauen** — Titel als Platzhalterfeld ohne Überschrift, Kategorie-Auswahl mit „Neue Kategorie" unten, Spiellage mit vier Werten (Vorgabe „Jede Lage"); das Begründungsfeld erscheint nur bei abweichender Lage. Ausgangslage über antippbare Bases mit gestricheltem Ring auf leeren Bases, Outs als drei Punkte. Gegenstück wählbar aus Plays derselben Kategorie.
- [ ] **Step 2: Anlegen schreibt ein Play mit genau einem Stand** und leitet in den Editor.
- [ ] **Step 3: `npm run build`** — Expected: PASS.
- [ ] **Step 4: Commit** `✨ Playmaker: Setup-Seite`

### Task 10: Editor

**Files:**
- Create: `frontend/src/components/playmaker/PlayEditorPage.tsx`, `StepTimeline.tsx`
- Create: `frontend/src/hooks/usePlayEditor.ts`

**Interfaces:**
- Consumes: Tasks 5, 6, 7, 8.
- Produces: `usePlayEditor(play)` → `{steps, cur, setCur, moveMarker, addStep, deleteStep, duplicateStep, setDuration, setOuts, setNote, undo, saveState}`.

- [ ] **Step 1: Failing tests** (Vitest, Hook) — `addStep kopiert den aktuellen Stand`, `undo stellt die letzte Bewegung wieder her`, `undo haelt fuenf Stufen`, `deleteStep nummeriert neu`, `letzter Stand laesst sich nicht loeschen`.
- [ ] **Step 2: Tests laufen lassen** — Expected: FAIL.
- [ ] **Step 3: Hook und Seite implementieren.** Raster `h-dvh`, kein Scrollen; ab 900 px zweispaltig mit Standliste rechts. Ziehen: Greifen über den nächstgelegenen Marker innerhalb 22 px, Anheben um 28 px über die Fingerkuppe mit 150 ms Übergang, heller Ring an der echten Ablegestelle, Einrasten im Radius 12 ft (Runner an Bases, Ball an Verteidigern). Zuschnitt erst beim Loslassen neu rechnen. Knöpfe: `Runner +`, `Standard`, `↶`. Autosave entprellt; Kopf zeigt „Gesichert", „Sichert…" nur bei laufender Anfrage, bei Fehler „Nicht gesichert" in `softball-red` mit Wiederholen und Warnung beim Verlassen.
- [ ] **Step 4: Tests laufen lassen und `npm run build`** — Expected: PASS.
- [ ] **Step 5: Commit** `✨ Playmaker: Editor mit Ziehen und Staenden`

### Task 11: Spieleransicht

**Files:**
- Create: `frontend/src/components/playmaker/PlayViewerPage.tsx`, `PlaybackBar.tsx`, `LegendSheet.tsx`

- [ ] **Step 1: Seite bauen** — Kopf mit Titel, „?" für die Legende und Outs als drei Punkte. Wiedergabeleiste: `◀`, `❚❚`, `▶`, Zählung, `↻` Schleife, Tempo `1×`; alle 44 px, Zählung mit `nowrap` und unter 340 px als „3/4". Abspielen deaktiviert bei weniger als zwei Ständen, Zeitleiste erst ab zwei Ständen sichtbar. Vorige Flugbahn blass bei 35 %, aktuelle wächst während der Animation mit. Verweis aufs Gegenstück unter der Notiz.
- [ ] **Step 2: `prefers-reduced-motion`** — springt von Stand zu Stand, 400 ms Halt bleibt.
- [ ] **Step 3: `npm run build`** — Expected: PASS.
- [ ] **Step 4: Commit** `✨ Playmaker: Spieleransicht mit Wiedergabe`

### Task 12: E2E

**Files:**
- Create: `frontend/e2e/playmaker.spec.ts`

- [ ] **Step 1: Acht Fälle schreiben** — Play anlegen; Marker ziehen und loslassen; Einrasten auf einer Base; „+ Stand" erzeugt eine Kopie und Stand 1 bleibt unberührt; Rückgängig über fünf Stufen; Abspielen endet auf dem letzten Stand und lässt die Stände unverändert; kein Scrollen bei 320×568 und 390×844; Stand löschen fragt nach und nummeriert neu.
- [ ] **Step 2: `npm run test:e2e -- playmaker`** — Expected: PASS.
- [ ] **Step 3: Commit** `✅ Playmaker: E2E-Suite`

### Task 13: Start-Plays

**Files:**
- Create: `backend/src/main/resources/db/migration/V68__seed_plays.sql`
- Create: `scripts/build-seed-plays.mjs`

- [ ] **Step 1: Generator schreiben**, der aus einer knappen Beschreibung je Play (Positionen, Bewegungen je Stand, Notiz) die `INSERT`-Anweisungen erzeugt. Basis sind `DEFAULT_DEFENSE` und `BASES` aus Task 5, damit Koordinaten nicht von Hand getippt werden.
- [ ] **Step 2: Die 48 Plays des Katalogs beschreiben** (Abschnitt „Play-Katalog" der Spec), je 3–6 Stände mit Notiz, Kategorie und wo sinnvoll `counterpart_play_id`.
- [ ] **Step 3: `V68` erzeugen und Migration laufen lassen** — Expected: 48 Zeilen in `play`.
- [ ] **Step 4: Jedes Play einmal im Viewer abspielen** und auf fachliche Sinnhaftigkeit prüfen.
- [ ] **Step 5: Commit** `✨ Playmaker: 48 Start-Plays`
