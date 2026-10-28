# Aufstellung teilen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Seite unter `/gameday/:id/vorschau`, die alle Spiele eines Spieltags mit Schlagreihenfolge und Feld ohne vertikales Scrollen zeigt, plus Teilen-Knopf — damit Aufstellungen nicht mehr als PDF verschickt werden müssen.

**Architecture:** Keine neuen Endpunkte, keine Migration. Die Seite lädt `GET /api/gamedays/{id}` + `GET /api/gamedays/{id}/lineups` (beide `isAuthenticated()`) und setzt vorhandene Teile zusammen: das Feld-Diagramm wird aus `FieldView` als `FeldDiagramm` herausgelöst (eine Geometriequelle bleibt eine), Auswechslung und Coach-Rotation werden von reinen Funktionen in Kurzschrift gebracht, der Teilen-Knopf teilt sich die Logik mit `ShareCounterButton`.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (Theme-Tokens), React Router 7, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-aufstellung-teilen-design.md`

**Vorher:** `docs/superpowers/plans/2026-10-28-aufstellung-freigeben.md`. Die Freigabe-Regel
entsteht dort; diese Seite erbt sie und baut keine eigene. Ein Spieler, der einen Link zu
einem nicht freigegebenen Spieltag öffnet, bekommt vom Backend leere Listen und liest
**„Die Aufstellung steht noch nicht."** — derselbe Satz wie im Spieler-Dashboard.

## Global Constraints

- **Deutsch** in allen Beschriftungen, Fehlermeldungen und Testnamen.
- **Theme-Tokens, keine Palette:** neue und angefasste UI nimmt `bg-surface-raised`, `border-line`, `text-ink-strong`, `text-ink-muted`, `text-ink-faint`, `hover:bg-surface-hover` — nicht `bg-cream-50`/`text-navy-900`. Rot (`softball-red`) bleibt für Bases und Signale.
- **Der PDF-Export wird nicht angefasst.** `utils/pdfExport.ts` bleibt Zeile für Zeile, wie es ist — auch seine Kopie der Feldkoordinaten (`FIELD_COORDS`, `pdfExport.ts:37`).
- **Jeder Angemeldete** darf die Seite sehen: kein `RequireRole`, keine Backend-Änderung.
- **Kein vertikales Scrollen** bei drei Spielen auf 393 × 760.
- Commits mit Gitmoji, **ohne `Co-Authored-By`**. Gestagt wird **nur per Pfad**, nie `git add -A`.
- Vor jedem Commit: `cd frontend && npm run build` (tsc + Vite) und `npx vitest run <betroffene Datei>`.

## Review Focus

1. **Spieltag ohne Aufstellungen** (leeres `lineups`-Objekt oder unbekannte id) — die Seite zeigt eine ruhige Meldung, sie stürzt nicht ab. → Task 4.
2. **Nicht genau drei Spiele** (eines, vier) — das Raster bleibt heil; bei vieren darf gescrollt werden, aber nichts darf überlappen. → Task 4.
3. **Schlagplatz ohne Feldposition** (EH, DH-Batter, `position: null`) — steht in der Liste, erscheint **nicht** auf dem Feld. → Task 4.
4. **Rotation zeigt auf einen Schlagplatz, den es nicht gibt** (Paar `POS_5_10` bei neun Spielern) — `resolveRotation` liefert `—`; die Kurzschrift gibt dann **keine Zeile** statt „— → —". → Task 1.
5. **Auswechslung eines Spielers, der nicht in der Liste steht** — kein Pfeil an einer fremden Zeile, keine Ausnahme. → Task 1.

---

## Dateien

| Datei | Verantwortung |
|---|---|
| `frontend/src/utils/aufstellungKurzschrift.ts` *(neu)* | Reine Funktionen: Auswechslung je Spieler, Coach-/Rotationszeile als Kurzschrift. |
| `frontend/src/components/planner/FeldDiagramm.tsx` *(neu)* | Das Feld allein: Geometrie, SVG, Marker. Zwei Beschriftungsarten (Name / Schlagnummer). |
| `frontend/src/components/planner/FieldView.tsx` *(geändert)* | Behält Überschrift und Zähler, zeichnet über `FeldDiagramm`. |
| `frontend/src/components/shared/useTeilen.ts` *(neu)* | Teilen-Blatt → Zwischenablage → Rückmeldung, als Hook. |
| `frontend/src/components/counter/ShareCounterButton.tsx` *(geändert)* | Benutzt den Hook, Aussehen unverändert. |
| `frontend/src/components/vorschau/AufstellungVorschau.tsx` *(neu)* | Die Seite. Laden, Titel, drei Spielblöcke, Teilen-Knopf. |
| `frontend/src/components/vorschau/SpielBlock.tsx` *(neu)* | Ein Spiel: Liste links, Feld + Bank + Coaches rechts. |
| `frontend/src/lazyPages.tsx`, `routes.tsx` *(geändert)* | Route `/gameday/:id/vorschau` im Layout, ohne Rollenprüfung. |
| `frontend/src/components/planner/GameDayPlanner.tsx` *(geändert)* | Fünfter Eintrag „Vorschau" im Werkzeugstreifen (mobil + Desktop). |
| `frontend/e2e/aufstellung/vorschau.spec.ts` *(neu)* | Kein Scrollen bei 393 × 760, Zoom nicht gesperrt. |
| `frontend/e2e/theme/kontrast.spec.ts` *(geändert)* | Seite in die Messliste. |

---

### Task 1: Kurzschrift für Auswechslung und Rotation

**Files:**
- Create: `frontend/src/utils/aufstellungKurzschrift.ts`
- Test: `frontend/src/utils/aufstellungKurzschrift.test.ts`

**Interfaces:**
- Consumes: `resolveRotation(pair, lineup, reversed)` aus `@/utils/coachRotation`; Typen `LineupEntryResponse`, `GameStaffResponse`, `SubstitutionResponse`, `CoachRotationPair` aus `@/types`.
- Produces:
  ```ts
  export function wechselFuer(playerId: number, subs: SubstitutionResponse[]): { rein: string; inning: number } | null
  export function coachZeilen(game: RotationFelder, lineup: LineupEntryResponse[], staff: GameStaffResponse[]): string[]
  export interface RotationFelder {
    firstBaseCoachRotation?: CoachRotationPair | null
    thirdBaseCoachRotation?: CoachRotationPair | null
    firstBaseCoachRotationReversed?: boolean
    thirdBaseCoachRotationReversed?: boolean
  }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
describe('wechselFuer', () => {
  it('findet die Auswechslung des Spielers, der rausgeht', () => {
    const subs = [{ id: 1, playerOut: { id: 7, name: 'Mike' }, playerIn: { id: 9, name: 'Lisa' }, inning: 2 }]
    expect(wechselFuer(7, subs)).toEqual({ rein: 'Lisa', inning: 2 })
  })
  it('schweigt fuer einen Spieler ohne Auswechslung', () => {
    expect(wechselFuer(3, [])).toBeNull()
  })
  // Review Focus 5
  it('haengt keinen Pfeil an eine fremde Zeile', () => {
    const subs = [{ id: 1, playerOut: { id: 99, name: 'Weg' }, playerIn: { id: 98, name: 'Neu' }, inning: 4 }]
    expect(wechselFuer(7, subs)).toBeNull()
  })
})

describe('coachZeilen', () => {
  it('schreibt den gesetzten Coach ohne Pfeil', () => {
    const staff = [{ id: 1, player: { id: 4, name: 'Jan' }, role: 'BASE_COACH_1ST' }]
    expect(coachZeilen({}, lineupMit10, staff)).toEqual(['1B Jan'])
  })
  it('schreibt die Rotation als Pfeil mit Schlagfenster', () => {
    const game = { thirdBaseCoachRotation: 'POS_3_8' as const }
    expect(coachZeilen(game, lineupMit10, [])).toEqual(['3B Platz8 → Platz3 #6–#8'])
  })
  it('stellt 3B vor 1B — die wichtigere Base zuerst', () => {
    const staff = [
      { id: 1, player: { id: 4, name: 'Jan' }, role: 'BASE_COACH_1ST' },
      { id: 2, player: { id: 5, name: 'Dat' }, role: 'BASE_COACH_3RD' },
    ]
    expect(coachZeilen({}, lineupMit10, staff)).toEqual(['3B Dat', '1B Jan'])
  })
  it('nennt das Inning, wenn der Coach selbst eingewechselt wurde', () => {
    // staff-Spieler ist playerIn einer Substitution → '1B Jan ab 3.'
  })
  // Review Focus 4
  it('laesst die Zeile weg, wenn die Rotation auf einen fehlenden Schlagplatz zeigt', () => {
    const game = { thirdBaseCoachRotation: 'POS_5_10' as const }
    expect(coachZeilen(game, lineupMit9, [])).toEqual([])
  })
  it('gibt eine leere Liste, wenn weder Coach noch Rotation gesetzt sind', () => {
    expect(coachZeilen({}, lineupMit10, [])).toEqual([])
  })
})
```

`lineupMit10` / `lineupMit9` sind Hilfsfabriken in der Testdatei: `battingOrder` 1..n, Spielername `Platz{n}`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/utils/aufstellungKurzschrift.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Implement `aufstellungKurzschrift.ts`**

`wechselFuer` sucht `subs.find(s => s.playerOut.id === playerId)`.
`coachZeilen` geht `['3B', '1B']` in dieser Reihenfolge durch; je Base: gesetzter Staff-Coach (`role === 'BASE_COACH_3RD'` bzw. `'BASE_COACH_1ST'`) schlägt Rotation. Staff-Zeile ist `` `${base} ${name}` ``, plus `` ` ab ${inning + 1}.` `` falls der Coach `playerIn` einer Substitution ist (gleiche Inning-Verschiebung wie `pdfExport.ts:479`). Rotationszeile ist `` `${base} ${primary.name} → ${backup.name} ${backupCoverRange}` ``, **entfällt** aber, wenn `primary.name` oder `backup.name` gleich `'—'` ist. Die Kommentarzeile über der Funktion hält fest, warum die ausgeschriebene Satzform des PDFs hier nicht taugt (160 px Spaltenbreite).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/utils/aufstellungKurzschrift.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/aufstellungKurzschrift.ts frontend/src/utils/aufstellungKurzschrift.test.ts
git commit -m "✨ Auswechslung und Rotation als Pfeil statt als Satz"
```

---

### Task 2: Das Feld allein — `FeldDiagramm`

**Files:**
- Create: `frontend/src/components/planner/FeldDiagramm.tsx`
- Modify: `frontend/src/components/planner/FieldView.tsx`
- Test: `frontend/src/components/planner/FeldDiagramm.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface FeldBesetzung { position: string; name: string; order: number }
  export function FeldDiagramm(props: {
    besetzung: FeldBesetzung[]
    beschriftung: 'name' | 'nummer'
    onPositionClick?: (position: string) => void
  }): JSX.Element
  ```
- `FieldView` behält seine heutige Signatur (`entries: LocalLineupEntry[]`, `onPositionClick?`) und baut daraus `FeldBesetzung[]` (`order = index + 1`, nur Einträge mit `position`).

**Verschoben, nicht neu geschrieben:** `FIELD_COORDS`, `VB`, `left`, `top`, `FENCE_R`, `FOUL_END`, das `<svg>` und die Marker-Schleife wandern unverändert aus `FieldView.tsx` nach `FeldDiagramm.tsx` — samt des Kommentars, dass die Koordinaten mit `pdfExport.ts` übereinstimmen müssen. In `FieldView` bleiben nur Überschrift, `taken`/`open`-Zähler und der Aufruf.

**Beim Verschieben auf Tokens umgestellt** (im hellen Theme identische Werte, siehe `styles/index.css`): `bg-cream-50` → `bg-surface-raised` (beide #FBF6EC), `border-cream-300` → `border-line` (beide #DDD2B8), `text-navy-900` → `text-ink-strong` (beide #142B49), `text-gray-400` → `text-ink-faint` (beide #6B655C), `hover:bg-cream-200` → `hover:bg-surface-hover` (#E8E0CA → #F2EBDC, der einzige sichtbare Unterschied), im SVG `var(--color-navy-900)` → `var(--color-ink-strong)`. Die roten Bases bleiben rot.

- [ ] **Step 1: Write the failing test**

```tsx
const besetzung = [
  { position: 'SS', name: 'Dat', order: 1 },
  { position: 'P', name: 'Mike', order: 2 },
]

it('zeigt Namen, wenn so beschriftet', () => {
  render(<FeldDiagramm besetzung={besetzung} beschriftung="name" />)
  expect(screen.getByText('Dat')).toBeInTheDocument()
})

it('zeigt Schlagnummern statt Namen, wenn so beschriftet', () => {
  render(<FeldDiagramm besetzung={besetzung} beschriftung="nummer" />)
  expect(screen.getByText('1')).toBeInTheDocument()
  expect(screen.queryByText('Dat')).not.toBeInTheDocument()
})

it('nennt im Titel trotzdem den Namen — die Nummer allein sagt nichts', () => {
  render(<FeldDiagramm besetzung={besetzung} beschriftung="nummer" onPositionClick={() => {}} />)
  expect(screen.getByRole('button', { name: /SS/ })).toHaveAttribute('title', 'SS — Dat (Schlag 1)')
})

it('zeigt unbesetzte Positionen als „frei"', () => {
  render(<FeldDiagramm besetzung={besetzung} beschriftung="name" />)
  expect(screen.getAllByText('frei')).toHaveLength(7)
})

it('ist ohne onPositionClick kein Knopf', () => {
  render(<FeldDiagramm besetzung={besetzung} beschriftung="name" />)
  expect(screen.queryAllByRole('button')).toHaveLength(0)
})
```

Bei `beschriftung="nummer"` trägt das Marker-Element `title` auch ohne `onPositionClick` (sonst wäre die Zahl ohne Nachschlagen stumm).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/planner/FeldDiagramm.test.tsx`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Verschieben und `beschriftung` ergänzen**

- [ ] **Step 4: Run the planner's own tests to prove nothing moved**

Run: `cd frontend && npx vitest run src/components/planner && npm run build`
Expected: PASS, Build grün.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/planner/FeldDiagramm.tsx frontend/src/components/planner/FeldDiagramm.test.tsx frontend/src/components/planner/FieldView.tsx
git commit -m "♻️ Das Feld zieht aus FieldView aus — und nimmt Tokens mit"
```

---

### Task 3: Teilen als Hook

**Files:**
- Create: `frontend/src/components/shared/useTeilen.ts`
- Modify: `frontend/src/components/counter/ShareCounterButton.tsx`
- Test: `frontend/src/components/shared/useTeilen.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type TeilenHinweis = null | 'kopiert' | 'fehlgeschlagen'
  export function useTeilen(url: string, titel: string): { hinweis: TeilenHinweis; teilen: () => Promise<void> }
  ```
- Verhalten unverändert aus `ShareCounterButton.tsx` übernommen: `navigator.share` zuerst, `AbortError` schweigt, sonst `navigator.clipboard.writeText`, Hinweis 2000 ms, Timer wird beim Abräumen gelöscht.

- [ ] **Step 1: Write the failing test**

Die vier Fälle aus `ShareCounterButton.test.tsx` gegen den Hook, über eine Wegwerf-Komponente im Test gerendert (`fireEvent`, **nicht** `userEvent` — das ersetzt `navigator.clipboard`): natives Blatt wird genutzt; Kopieren samt Hinweis `kopiert`; Scheitern meldet `fehlgeschlagen`; Abbruch schweigt und kopiert nicht.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/shared/useTeilen.test.tsx`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Hook schreiben, `ShareCounterButton` darauf umstellen**

Die Übersetzung `kopiert` → „Link kopiert" / `fehlgeschlagen` → „Kopieren nicht möglich" bleibt beim Knopf, nicht im Hook.

- [ ] **Step 4: Run both test files**

Run: `cd frontend && npx vitest run src/components/shared/useTeilen.test.tsx src/components/counter/ShareCounterButton.test.tsx`
Expected: PASS — die vier Alt-Tests sind das Netz für die Umstellung.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared/useTeilen.ts frontend/src/components/shared/useTeilen.test.tsx frontend/src/components/counter/ShareCounterButton.tsx
git commit -m "♻️ Teilen einmal, benutzt zweimal"
```

---

### Task 4: Die Vorschau-Seite

**Files:**
- Create: `frontend/src/components/vorschau/AufstellungVorschau.tsx`
- Create: `frontend/src/components/vorschau/SpielBlock.tsx`
- Modify: `frontend/src/lazyPages.tsx`, `frontend/src/routes.tsx`
- Test: `frontend/src/components/vorschau/AufstellungVorschau.test.tsx`

**Interfaces:**
- Consumes: `wechselFuer`, `coachZeilen` (Task 1); `FeldDiagramm`, `FeldBesetzung` (Task 2); `useTeilen` (Task 3); `api.getGameDay(id)`, `api.getGameDayLineups(id)`; `getDisplayName` aus `@/utils/pdfExport` (nur **lesend** importiert — die Datei wird nicht geändert).
- Produces:
  ```ts
  export function AufstellungVorschau(): JSX.Element            // liest :id aus useParams
  export function SpielBlock(props: {
    game: GameResponse
    lineup: LineupEntryResponse[]
    staff: GameStaffResponse[]
    substitutions: SubstitutionResponse[]
  }): JSX.Element
  export function LazyAufstellungVorschau(): JSX.Element        // in lazyPages.tsx
  ```

**Aufbau (die Rechnung aus dem Entwurf):** Titelzeile (Spieltag — Datum @ Ort) mit dem Teilen-Knopf rechts, darunter `space-y-2` mit einem `SpielBlock` je Spiel. Ein Block ist `grid grid-cols-[1fr_160px] gap-2`: links die Schlagreihenfolge (`battingOrder`, Name, Position), rechts `FeldDiagramm` mit `beschriftung="nummer"` und darunter Bank und die Zeilen aus `coachZeilen`. Bank und Coaches stehen rechts, **nicht** über die volle Breite — sonst passen drei Spiele nicht auf einen Bildschirm. Eine Zeile mit Auswechslung bekommt `` `${name} → ${rein}` `` plus das Inning als `<sup>`; die Zahl ist das Inning, nicht die Zahl der Wechsel.

**Feld-Beschriftung:** `order` ist `battingOrder` (nicht der Listenindex), `name` ist `getDisplayName(player.name)`. Auf dem Feld steht die Nummer, der Name steht links — das ist die Verbindung, die ohne Worte auskommt.

- [ ] **Step 1: Write the failing test**

```tsx
// api gemockt: vi.mock('@/api/client')
it('zeigt alle drei Spiele mit Gegner und Schlagreihenfolge', async () => {
  expect(await screen.findByText(/Spiel 1/)).toBeInTheDocument()
  expect(screen.getByText(/Rockets/)).toBeInTheDocument()
  expect(screen.getAllByText(/Spiel \d/)).toHaveLength(3)
})

it('setzt den Pfeil in die Zeile des Spielers, der geht', async () => {
  // Spiel 1: Mike (Schlag 2) wird im 3. Inning durch Lisa ersetzt
  expect(await screen.findByText(/Mike → Lisa/)).toBeInTheDocument()
})

it('schreibt die Coach-Zeile als Kurzschrift', async () => {
  expect(await screen.findByText('3B Dat → Mike #6–#8')).toBeInTheDocument()
})

// Review Focus 3
it('stellt einen Schlagplatz ohne Feldposition nicht aufs Feld', async () => {
  // EH-Spieler „Tom" steht in der Liste …
  expect(await screen.findByText('Tom')).toBeInTheDocument()
  // … aber auf dem Feld sind nur die besetzten Positionen beschriftet
  expect(screen.getAllByText('frei').length).toBeGreaterThan(0)
})

// Review Focus 1
it('meldet ruhig, wenn ein Spiel keine Aufstellung hat', async () => {
  expect(await screen.findByText('Keine Aufstellung')).toBeInTheDocument()
})

it('sagt Bescheid, wenn der Spieltag nicht geladen werden kann', async () => {
  // api.getGameDay wirft → 'Spieltag nicht erreichbar.'
})

// Review Focus 2
it('traegt auch ein einzelnes Spiel', async () => {
  // gameDay.games hat Laenge 1 → genau ein Block, kein leerer Platzhalter daneben
  expect(await screen.findAllByText(/Spiel \d/)).toHaveLength(1)
})

it('traegt auch vier Spiele — dann darf gescrollt werden, aber nichts fehlt', async () => {
  expect(await screen.findAllByText(/Spiel \d/)).toHaveLength(4)
})

it('teilt die Adresse dieser Seite', async () => {
  // navigator stubben wie in useTeilen.test; Klick auf „Aufstellung teilen"
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/gameday/1/vorschau')))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/vorschau/AufstellungVorschau.test.tsx`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Seite, Block, Lazy-Hülle und Route schreiben**

Laden wie in `components/export/LineupSheet.tsx:14-32`, aber **ohne** `getSeasons` — die Seite braucht keine Saison. Fehlerfall: `Spieltag nicht erreichbar.` in `text-ink-muted`. Route als Kind der Layout-Route in `routes.tsx`, direkt hinter `/gameday/:id`, **ohne `RequireRole`** — jeder Angemeldete darf sie sehen (Entscheidung 1 des Entwurfs). Lazy-Hülle wie `LazyLineupSheet` in `lazyPages.tsx`.

- [ ] **Step 4: Run tests and build**

Run: `cd frontend && npx vitest run src/components/vorschau && npm run build`
Expected: PASS, Build grün.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/vorschau frontend/src/lazyPages.tsx frontend/src/routes.tsx
git commit -m "✨ Alle Aufstellungen eines Spieltags auf einem Schirm"
```

---

### Task 5: Der Weg dorthin im Planer

**Files:**
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx` (mobiler Streifen `:753-781`, Desktop-Streifen `:828-864`)
- Test: `frontend/src/components/planner/GameDayPlannerVorschau.test.tsx`

**Interfaces:**
- Consumes: Route `/gameday/:id/vorschau` (Task 4).

**Warum ein Eintrag und nicht zwei:** Der mobile Streifen trägt heute vier Einträge (`Auto`, `Aufstellung`, `PDF`, `Liste`) in `flex-1`-Teilung. Bei 393 px bleiben je Eintrag rund 70 px — ein fünfter geht, ein sechster drückt die Beschriftungen unter die Lesbarkeit. Der Teilen-Knopf sitzt deshalb **auf der Vorschau-Seite** (Task 4), wo er auch hingehört: erst ansehen, dann verschicken. Im Planer steht nur der Weg dorthin, und der heißt, was er tut — „Vorschau", nicht „Teilen".

- [ ] **Step 1: Write the failing test**

```tsx
it('fuehrt vom Planer zur Vorschau', async () => {
  // GameDayPlanner mit gemocktem api + MemoryRouter auf /gameday/1
  fireEvent.click(screen.getAllByRole('button', { name: /Vorschau/ })[0])
  expect(await screen.findByText('vorschau-seite')).toBeInTheDocument()  // Platzhalter-Route im Test
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/planner/GameDayPlannerVorschau.test.tsx`
Expected: FAIL — kein Knopf mit diesem Namen.

- [ ] **Step 3: Eintrag ergaenzen**

Mobil als fünfter `ToolbarBtn` (`icon={<AugeIcon size={16} />}`, `label="Vorschau"`), Desktop als weiterer Knopf im selben Muster wie „Aufstellung", `title="Aufstellung aller Spiele ansehen und teilen"`. Navigation über `useNavigate()` auf `/gameday/${gameDay.id}/vorschau`. Reihenfolge: **vor** „Aufstellung" — ansehen kommt vor exportieren.

- [ ] **Step 4: Run tests and build**

Run: `cd frontend && npx vitest run src/components/planner && npm run build`
Expected: PASS, Build grün.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/planner/GameDayPlanner.tsx frontend/src/components/planner/GameDayPlannerVorschau.test.tsx
git commit -m "✨ Vorschau im Werkzeugstreifen des Planers"
```

---

### Task 6: Das Versprechen festnageln — kein Scrollen, lesbar im Dunkeln

**Files:**
- Create: `frontend/e2e/aufstellung/vorschau.spec.ts`
- Modify: `frontend/e2e/theme/kontrast.spec.ts` (Liste `SEITEN`)

**Interfaces:**
- Consumes: `seedAuth` aus `../helpers/auth`; Route aus Task 4.

**Warum E2E und nicht Vitest:** „passt ohne Scrollen" ist eine Aussage über Layout. jsdom misst nichts; nur ein echter Browser bei 393 × 760 beantwortet das.

- [ ] **Step 1: Write the failing test**

```ts
test('Drei Spiele passen ohne Scrollen auf ein Handy', async ({ page, context }) => {
  await seedAuth(context)
  await page.setViewportSize({ width: 393, height: 760 })
  await page.goto('/gameday/1/vorschau')
  await page.waitForLoadState('networkidle')

  const spiele = await page.locator('[data-spiel]').count()
  test.skip(spiele < 3, 'Spieltag 1 hat weniger als drei Spiele — nichts zu messen')

  const { scrollHeight, innerHeight } = await page.evaluate(() => ({
    scrollHeight: document.scrollingElement!.scrollHeight,
    innerHeight: window.innerHeight,
  }))
  expect(scrollHeight, `Seite ist ${scrollHeight - innerHeight}px zu hoch`).toBeLessThanOrEqual(innerHeight + 1)
})

test('Der Zoom ist nicht gesperrt — er ist der Weg zum Detail', async ({ page, context }) => {
  await seedAuth(context)
  await page.goto('/gameday/1/vorschau')
  const inhalt = await page.locator('meta[name="viewport"]').getAttribute('content')
  expect(inhalt).not.toMatch(/user-scalable\s*=\s*no|maximum-scale/)
})
```

`SpielBlock` trägt dafür `data-spiel={game.gameNumber}` auf seinem Wurzelelement (Task 4 ergänzt das Attribut, falls es dort noch fehlt).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx playwright test e2e/aufstellung/vorschau.spec.ts`
Expected: FAIL — Seite scrollt oder Zähler ist 0.
Voraussetzung: `docker compose up -d db`, und **kein altes Backend auf :8080** (siehe `env_e2e_stale_backend`).

- [ ] **Step 3: Höhe nachziehen, bis es passt**

Stellschrauben in dieser Reihenfolge: Zeilenhöhe der Schlagreihenfolge, Abstand zwischen den Blöcken, Höhe des Titels. Das Feld ist das Letzte, was schrumpft — ein Feld, das man nicht lesen kann, ist Zierrat. Bei vier Spielen darf gescrollt werden, das ist ausdrücklich in Kauf genommen.

- [ ] **Step 4: Run the full E2E suite plus the contrast check**

Run: `cd frontend && npx playwright test e2e/aufstellung e2e/theme/kontrast.spec.ts`
Expected: PASS — der Kontrasttest misst `/gameday/1/vorschau` jetzt mit und ist rot, wenn das Dunkel schlechter ist als das Helle.

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/aufstellung/vorschau.spec.ts frontend/e2e/theme/kontrast.spec.ts
git commit -m "✅ Kein Scrollen, kein Zoom-Riegel, im Dunkeln lesbar"
```

---

## Abschluss

- [ ] `cd frontend && npm run lint && npm run build`
- [ ] `cd frontend && npx vitest run`
- [ ] `cd frontend && npm run test:e2e` (Scoring-Pfad ist nicht angefasst, aber der Kontrasttest hat eine Seite mehr)
- [ ] `CLAUDE.md`: unter „UI/UX preferences" zwei Sätze zur neuen Seite — wer sie sehen darf (jeder Angemeldete, wie `/gameday/:id/export`), dass das PDF daneben bleibt, und dass die Kurzschrift mit Pfeil Absicht ist.
