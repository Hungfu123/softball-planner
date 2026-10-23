# Navigationsumbau Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Reiterleiste von sieben auf fünf Punkte bringen, Orga nach tatsächlichem Gebrauch sortieren und den Aufbau-Katalog entfernen — damit später Konto, Accounts und Historie Platz finden.

**Architecture:** Rein im Frontend, plus das Löschen einer in sich geschlossenen Backend-Scheibe (Equipment). Keine Migration, kein Schema-Eingriff, keine neue Abhängigkeit. Die Routentabelle (`routes.tsx`) und die Reitertabelle (`Layout.tsx:32`) bleiben die einzigen zwei Stellen, an denen Navigation definiert wird.

**Tech Stack:** React 19, TypeScript, React Router DOM 7, Tailwind v4, Vitest + Testing Library, Playwright (E2E), Spring Boot 3.4.3 (nur Löschungen).

**Spec:** `docs/superpowers/specs/2026-10-23-accounts-und-rollen-design.md`, Abschnitt „Navigation"

## Global Constraints

- Deutsche Oberfläche durchgehend — Labels, Fehlermeldungen, Texte.
- Dark-Only. Kein Light-Mode. `softball-red` bleibt negativen Signalen vorbehalten.
- Tailwind v4 ohne Klammer-Syntax (`lg:grid-cols-3`, nicht `lg:grid-cols-[3]`).
- Trefferflächen mindestens **44 × 44 px** (Playmaker-Maßstab, Commit `7dcd8e0`).
- Die Reiter dürfen bei 390 px Viewport (366 px innen) **nicht** überlaufen; heute brauchen sieben Reiter 301 px.
- Path-Alias `@/` → `frontend/src/`.
- Keine `Co-Authored-By`-Zeilen in Commits. Gitmoji-Präfix, Conventional Commits.
- Die Tabelle `equipment_item` wird **nicht** gelöscht und **nicht** angefasst.
- Vor jedem Commit: `npm run build` in `frontend/`. Bei Backend-Änderungen zusätzlich `./mvnw test -s .mvn/local-settings.xml` in `backend/`.

## Review Focus

Fünf Dinge, die die Spec voraussetzt, aber kein Task-Test von allein prüft:

1. **Ein Lesezeichen auf `/orga/aufbau`** — jemand hat die Seite im Browser gespeichert oder als PWA-Verknüpfung. Nach dem Löschen muss er auf dem Dashboard landen, nicht im `ChunkErrorBoundary`. Test in Task 1.
2. **Ein Lesezeichen auf `/stats`** — die Adresse bleibt, aber der aktive Reiter heißt jetzt ANALYSE. Der Reiter muss hervorgehoben sein, sonst wirkt die Seite „nirgends". Test in Task 2.
3. **`/teams` und `/teams/spiele` markieren denselben Reiter** — `matches()` prüft `startsWith(path + '/')`; `/teams` exakt und `/teams/spiele` als Unterpfad müssen beide ANALYSE aktiv setzen. Test in Task 2.
4. **Die Reiterleiste bei 390 px** — fünf Reiter dürfen `navOverflows` nicht auslösen. Das ist der ganze Zweck des Umbaus und wird sonst nirgends gemessen. Test in Task 3.
5. **Jede Orga-Kachel trifft ihr Ziel** — nach dem Umbau in drei Blöcke mit zwei Darstellungen (Kachel und Zeile) ist ein vertauschter `to`-Wert der wahrscheinlichste Fehler. Test in Task 4.

---

## File Structure

| Datei | Verantwortung | Task |
|---|---|---|
| `frontend/src/components/equipment/` (4 Dateien) | löschen | 1 |
| `frontend/src/hooks/useEquipmentCatalog.ts` | löschen | 1 |
| `frontend/src/utils/aufbauPdf.ts` + `.test.ts` | löschen | 1 |
| `backend/.../domain/model/EquipmentItem.java` u. a. (10 Dateien) | löschen | 1 |
| `frontend/src/components/analysis/AnalysisModeTabs.tsx` | verschoben aus `components/orga/`, dritter Chip | 2 |
| `frontend/src/components/stats/StatsPage.tsx` | zeigt den Umschalter | 2 |
| `frontend/src/components/layout/Layout.tsx:32` | Reitertabelle: 7 → 5 | 3 |
| `frontend/src/components/orga/OrgaHome.tsx` | drei Blöcke, zwei Darstellungen | 4 |
| `frontend/src/routes.tsx` | Aufbau-Route raus | 1 |
| `frontend/src/lazyPages.tsx` | `LazyEquipmentCatalog` raus | 1 |

---

### Task 1: Aufbau-Katalog entfernen

Zuerst, weil es Platz schafft und nichts voraussetzt. Der Katalog ist in sich geschlossen — `Drill.equipment` ist eine Stringliste aus `drills.json` und hat damit **nichts** zu tun.

**Files:**
- Delete: `frontend/src/components/equipment/EquipmentCatalogPage.tsx`, `EquipmentItemForm.tsx`, `VenueMap.tsx`, `venueLayout.ts`
- Delete: `frontend/src/hooks/useEquipmentCatalog.ts`, `frontend/src/utils/aufbauPdf.ts`, `frontend/src/utils/aufbauPdf.test.ts`
- Delete: `backend/src/main/java/com/softball/domain/model/EquipmentItem.java`, `domain/port/out/EquipmentItemRepository.java`, `application/EquipmentService.java`, `adapter/in/web/EquipmentController.java`, `adapter/dto/EquipmentRequest.java`, `adapter/dto/EquipmentResponse.java`, `adapter/out/persistence/entity/EquipmentItemEntity.java`, `adapter/out/persistence/mapper/EquipmentItemMapper.java`, `adapter/out/persistence/repository/SpringEquipmentItemRepository.java`, `adapter/out/persistence/adapter/EquipmentItemRepositoryAdapter.java`
- Modify: `frontend/src/routes.tsx` (Zeile mit `/orga/aufbau`), `frontend/src/lazyPages.tsx` (`EquipmentCatalogPage`-Import und `LazyEquipmentCatalog`), `frontend/src/api/client.ts:736-744` (Equipment-Block, Typimporte `EquipmentItem`/`EquipmentInput`), `frontend/src/types/index.ts` (beide Typen), `frontend/src/components/orga/OrgaHome.tsx` (Aufbau-Kachel)
- Test: `frontend/src/routes.test.tsx`, `frontend/src/components/orga/OrgaHome.test.tsx`

**Interfaces:**
- Consumes: nichts
- Produces: nichts. Entfernt `getEquipmentCatalog`, `createEquipmentItem`, `updateEquipment`, `deleteEquipment` aus `@/api/client` und die Typen `EquipmentItem`, `EquipmentInput`.

- [ ] **Step 1: Den Test für das tote Lesezeichen schreiben**

In `frontend/src/routes.test.tsx`, im bestehenden Describe-Block:

```tsx
it('schickt ein altes Lesezeichen auf /orga/aufbau zurück aufs Dashboard', async () => {
  localStorage.setItem('auth', btoa('admin:x'))
  const router = createMemoryRouter(routes, { initialEntries: ['/orga/aufbau'] })
  render(<RouterProvider router={router} />)
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx vitest run src/routes.test.tsx`
Expected: FAIL — der Pfad bleibt `/orga/aufbau`, weil die Route noch existiert.

- [ ] **Step 3: Frontend-Dateien löschen und Verweise entfernen**

Die oben gelisteten Frontend-Dateien löschen. In `routes.tsx` den `/orga/aufbau`-Eintrag entfernen (die `*`-Catch-all-Route fängt ihn danach ab). In `lazyPages.tsx` Import und `LazyEquipmentCatalog` entfernen. In `client.ts` den Equipment-Block samt Typimporten entfernen. In `types/index.ts` `EquipmentItem` und `EquipmentInput` entfernen. In `OrgaHome.tsx` die Aufbau-Kachel und den ungenutzt gewordenen Import entfernen.

- [ ] **Step 4: Backend-Dateien löschen**

Die zehn gelisteten Java-Dateien löschen. `EquipmentItemEntity` ist die einzige Abbildung auf `equipment_item`; die Tabelle bleibt stehen und `spring.jpa.hibernate.ddl-auto=validate` stört sich nicht an einer Tabelle ohne Entity.

- [ ] **Step 5: Den Kachel-Test in `OrgaHome.test.tsx` anpassen**

Die Zeile `expect(screen.getByRole('link', { name: /Aufbau Heimspieltag/ }))…` entfernen und den Test-Titel von „fünf Kacheln" auf die neue Zahl bringen.

- [ ] **Step 6: Alles laufen lassen**

Run: `cd frontend && npm run build && npx vitest run`
Expected: PASS, keine TypeScript-Fehler über fehlende Typen.

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS. Kein Test referenziert Equipment — falls doch einer bricht, gehört er mitgelöscht.

- [ ] **Step 7: Commit**

```bash
git add -u frontend/src backend/src
git commit -m "🧹 Aufbau-Katalog entfernt — wird nicht mehr benutzt

Tabelle equipment_item bleibt stehen: sie traegt die echten Bestandsdaten,
der Code ist ueber Git rueckholbar, die Zeilen waeren es nicht.
Drill.equipment ist etwas anderes und bleibt unberuehrt."
```

---

### Task 2: Statistik wird der dritte Modus von ANALYSE

**Files:**
- Create: `frontend/src/components/analysis/AnalysisModeTabs.tsx` (verschoben aus `components/orga/`)
- Delete: `frontend/src/components/orga/AnalysisModeTabs.tsx`
- Modify: `frontend/src/components/orga/GameLogPage.tsx:7`, `frontend/src/components/orga/TeamDirectoryPage.tsx:8` (Importpfad)
- Modify: `frontend/src/components/stats/StatsPage.tsx` (Umschalter einsetzen)
- Test: `frontend/src/components/analysis/AnalysisModeTabs.test.tsx`

**Interfaces:**
- Consumes: nichts
- Produces: `AnalysisModeTabs()` aus `@/components/analysis/AnalysisModeTabs` — drei `NavLink`s in dieser Reihenfolge: `/stats` („Statistik"), `/teams/spiele` („Spiel-Verlauf"), `/teams` („Gegner", mit `end`).

- [ ] **Step 1: Den Test schreiben**

`frontend/src/components/analysis/AnalysisModeTabs.test.tsx`:

```tsx
it('zeigt drei Modi, Statistik zuerst', () => {
  render(<MemoryRouter><AnalysisModeTabs /></MemoryRouter>)
  const links = screen.getAllByRole('link')
  expect(links.map(l => l.textContent)).toEqual(['Statistik', 'Spiel-Verlauf', 'Gegner'])
  expect(links[0]).toHaveAttribute('href', '/stats')
  expect(links[1]).toHaveAttribute('href', '/teams/spiele')
  expect(links[2]).toHaveAttribute('href', '/teams')
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx vitest run src/components/analysis/AnalysisModeTabs.test.tsx`
Expected: FAIL — Datei existiert nicht.

- [ ] **Step 3: Datei verschieben und dritten Chip ergänzen**

`components/orga/AnalysisModeTabs.tsx` nach `components/analysis/AnalysisModeTabs.tsx` verschieben, den `NavLink` auf `/stats` mit der Beschriftung „Statistik" **als ersten** einsetzen. Die `tabCls`-Funktion und das `aria-label="Analyse-Ansichten"` bleiben unverändert. Den Kommentarblock oben auf den dritten Modus erweitern.

- [ ] **Step 4: Importpfade anpassen und Umschalter in StatsPage einsetzen**

In `GameLogPage.tsx` und `TeamDirectoryPage.tsx` den Import auf `@/components/analysis/AnalysisModeTabs` umstellen. In `StatsPage.tsx` `<AnalysisModeTabs />` an derselben Stelle einsetzen, an der die anderen beiden Seiten ihn haben: direkt unter der `h1`.

- [ ] **Step 5: Tests laufen lassen**

Run: `cd frontend && npx vitest run src/components/analysis && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/analysis frontend/src/components/orga frontend/src/components/stats
git commit -m "✨ Statistik wird der dritte Modus von ANALYSE"
```

---

### Task 3: Reiterleiste von sieben auf fünf

**Files:**
- Modify: `frontend/src/components/layout/Layout.tsx:32-39` (die `TABS`-Tabelle)
- Test: `frontend/src/components/layout/Layout.test.tsx` (anlegen, falls nicht vorhanden)

**Interfaces:**
- Consumes: `AnalysisModeTabs` aus Task 2 (die Modi übernehmen, was die beiden gestrichenen Reiter leisteten)
- Produces: `TABS` mit fünf Einträgen in dieser Reihenfolge — `/` (Spielbetrieb/Spiele), `/training`, `/players`, `/stats` (**Analyse**/Analyse, `extraPaths: ['/teams']`), `/orga` (`extraPaths: ['/kalender']`)

- [ ] **Step 1: Die Tests schreiben**

`frontend/src/components/layout/Layout.test.tsx`:

```tsx
it('zeigt fünf Reiter', () => {
  renderAt('/')
  expect(screen.getAllByRole('link').filter(isTab)).toHaveLength(5)
})

it.each(['/stats', '/teams', '/teams/spiele'])('markiert ANALYSE auf %s', (pfad) => {
  renderAt(pfad)
  expect(screen.getByRole('link', { name: /Analyse/ })).toHaveClass('bg-white')
})

it('hat keinen Spielbogen-Reiter mehr', () => {
  renderAt('/')
  expect(screen.queryByRole('link', { name: /Bogen|Spielbogen/ })).toBeNull()
})
```

`renderAt(pfad)` rendert `<MemoryRouter initialEntries={[pfad]}><Layout /></MemoryRouter>`; `isTab` filtert auf Links innerhalb des `nav`-Elements.

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx vitest run src/components/layout/Layout.test.tsx`
Expected: FAIL — sieben Reiter, Bogen vorhanden.

- [ ] **Step 3: Die `TABS`-Tabelle umbauen**

In `Layout.tsx:32-39` die Einträge `/stats` und `/spielbogen` streichen und den Eintrag `/teams/spiele` ersetzen durch
`{ path: '/stats', label: 'Analyse', shortLabel: 'Analyse', Icon: BarChart3, extraPaths: ['/teams'] }`.
Die übrigen vier Einträge bleiben unverändert. Ungenutzt gewordene Icon-Importe (`LineChart`, `ClipboardList`) entfernen.

Der Kommentarblock über der `nav` nennt die Messung „die Tabs brauchen 301px" — den Wert auf den neuen anpassen (Schritt 5 liefert ihn).

- [ ] **Step 4: Tests laufen lassen**

Run: `cd frontend && npx vitest run src/components/layout && npm run build`
Expected: PASS.

- [ ] **Step 5: Die Breite im Browser messen**

Dev-Server starten (`npx vite`), im Browser bei 390 px Viewport die Breite des Reiter-Wrappers auslesen und mit 366 px vergleichen. Der gemessene Wert geht in den Kommentar aus Schritt 3.
Expected: deutlich unter 366 px, `data-scroll-hint` am `nav` ist `false`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout
git commit -m "🔧 Reiterleiste von sieben auf fünf — ANALYSE schluckt Statistik, Bogen zieht nach Orga"
```

---

### Task 4: Orga nach Gebrauch sortieren

**Files:**
- Modify: `frontend/src/components/orga/OrgaHome.tsx` (komplett umgebaut)
- Test: `frontend/src/components/orga/OrgaHome.test.tsx`

**Interfaces:**
- Consumes: nichts
- Produces: nichts

- [ ] **Step 1: Die Tests schreiben**

In `OrgaHome.test.tsx` den bestehenden Kachel-Test ersetzen:

```tsx
it.each([
  ['Counter', '/counter'],
  ['WhatsApp-Umfragen', '/orga/whatsapp-umfrage'],
  ['Trainerabrechnung', '/orga/trainerabrechnung'],
  ['Kalender', '/kalender'],
  ['Einladungen', '/orga/einladungen'],
  ['Playmaker', '/orga/playmaker'],
  ['Spielbogen', '/spielbogen'],
])('Kachel %s zeigt auf %s', (name, ziel) => {
  render(<MemoryRouter><OrgaHome /></MemoryRouter>)
  expect(screen.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', ziel)
})

it('zeigt die drei Blöcke in der Reihenfolge oben, Weiteres, Selten', () => {
  render(<MemoryRouter><OrgaHome /></MemoryRouter>)
  const ueberschriften = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
  expect(ueberschriften).toEqual(['Weiteres', 'Selten'])
})

it('nennt den Zähler Counter', () => {
  render(<MemoryRouter><OrgaHome /></MemoryRouter>)
  expect(screen.queryByRole('link', { name: /Zähler/ })).toBeNull()
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx vitest run src/components/orga/OrgaHome.test.tsx`
Expected: FAIL — es gibt keinen Spielbogen, keinen Playmaker, keine Überschriften, und der Zähler heißt Zähler.

- [ ] **Step 3: `OrgaHome` umbauen**

Drei Blöcke, in dieser Reihenfolge:

| Block | Überschrift | Darstellung | Inhalt |
|---|---|---|---|
| 1 | keine | `Card padding="lg"`, Raster `grid-cols-2`, bestehendes Kachel-Markup | Counter (`/counter`), WhatsApp-Umfragen (`/orga/whatsapp-umfrage`), Trainerabrechnung (`/orga/trainerabrechnung`) |
| 2 | „Weiteres" (`h2`) | dieselben Kacheln, Raster `grid-cols-2 sm:grid-cols-3` | Kalender (`/kalender`), Einladungen (`/orga/einladungen`), Playmaker (`/orga/playmaker`) |
| 3 | „Selten" (`h2`) | Zeilen statt Kacheln, mindestens 44 px hoch, Chevron rechts | Spielbogen (`/spielbogen`) |

Die Überschriften im Stil der Spec: klein, versal, gesperrt, `text-gray-400`, mit einer dünnen Linie danach. Der Block ohne Überschrift braucht keine — er steht für sich.

Playmaker und Spielbogen sind neu in Orga, beide brauchen Icon und Untertitel im bestehenden Muster. Icons aus `lucide-react` wie die Nachbarn (`Mail`, `Receipt`); für Spielbogen `ClipboardListIcon` aus `@/icons`, das dort schon liegt.

Accounts und Historie kommen **nicht** hierhin — die bringt der Account-Plan mit.

- [ ] **Step 4: Tests laufen lassen**

Run: `cd frontend && npx vitest run src/components/orga && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/orga
git commit -m "✨ Orga nach Gebrauch sortiert — Counter, Umfrage, Abrechnung nach oben"
```

---

### Task 5: Mit den Fingern nachprüfen

Kein Test ersetzt das. Die Spec verlangt 44-px-Flächen und eine Leiste, die bei 390 px nicht überläuft — beides sieht man erst im Browser.

**Files:**
- Modify: keine, außer es findet sich etwas

**Interfaces:**
- Consumes: Tasks 1–4
- Produces: nichts

- [ ] **Step 1: Den vollen Durchlauf fahren**

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml &
cd frontend && npx vite
```

- [ ] **Step 2: Bei 390 × 844 durchklicken**

Browser auf 390 × 844 stellen. Jeden der fünf Reiter antippen. Auf `/stats` alle drei Modus-Chips durchgehen. In Orga jede Kachel und jede Zeile antippen und wieder zurück.

Expected: kein waagerechtes Scrollen im Kopf, kein Verlauf-Hinweis rechts an der `nav`, jede Fläche beim ersten Versuch getroffen, jedes Ziel das richtige.

- [ ] **Step 3: Die Flächen nachmessen**

Für jede Orga-Zeile und jeden Modus-Chip die tatsächliche Höhe und Breite auslesen.
Expected: jede mindestens 44 × 44 px. Was darunter liegt, wird in diesem Schritt korrigiert und mit einem eigenen Commit nachgezogen.

- [ ] **Step 4: Bei 1440 px gegenprüfen**

Expected: Reiter in der breiten Darstellung (Zeile mit vollen Labels), Orga-Raster bricht nicht, die „Selten"-Zeilen laufen nicht über die ganze Breite ins Leere.

- [ ] **Step 5: E2E laufen lassen**

Vorher ein etwaiges Backend auf Port 8080 beenden — Playwright benutzt sonst ein veraltetes.

Run: `cd frontend && npm run test:e2e`
Expected: PASS. Die Suite deckt Scoring, Spielbogen, Playmaker, Training und Teams ab; keiner dieser Pfade sollte vom Umbau betroffen sein. Ein Fehlschlag hier heißt, dass ein Test über die Navigation einstieg — dann den Test auf den neuen Weg bringen, nicht den Umbau zurückdrehen.

- [ ] **Step 6: Befund festhalten**

Was bei Schritt 2 bis 4 auffiel, kommt als kurze Liste in die Antwort an den Menschen: was gemessen wurde, was korrigiert werden musste, was auffällig blieb. Keine Erfolgsmeldung ohne die Zahlen.
