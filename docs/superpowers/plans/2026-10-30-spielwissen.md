# Spielwissen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Reiter „Spielwissen", unter dem Offense als drei Kapitel animierter Karten
liegt und Defense direkt in die bestehende Playmaker-Uebersicht fuehrt.

**Architecture:** Reines Frontend, kein Backend, kein Endpunkt, kein Cache-Eintrag. Eine
Kartenhuelle (`Karte.tsx`) traegt Pointe, Satz, „nochmal" und den Ruhig-Modus; jede Karte
liefert nur ihre Buehne als Komponente mit der Signatur `{ lauf, ruhig }`. Die drei Kapitel
sind Daten in `kapitel.ts`, die eine Route `/spielwissen/:kapitel` rendert. Das Feld kommt
in jeder Zeichnung aus `components/playmaker/board/geometry`, nie nachgezeichnet.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, `motion/react` (schon
Abhaengigkeit), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-30-spielwissen-design.md`

## Global Constraints

- **Keine Gedankenstriche in sichtbarem Text.** Ausdrueckliche Vorgabe des Betreibers.
  Gilt fuer jede Pointe, jeden Satz, jede Ueberschrift, jedes Label. (Code-Kommentare sind
  davon nicht betroffen.)
- **Kein `/api`-Aufruf aus den Offense-Seiten.** Kein Endpunkt, keine Migration, kein
  Eintrag in `pwa/apiCaching.ts`.
- **Der Reiter ist fuer alle Rollen sichtbar**, Trainer eingeschlossen.
- **Die Playmaker-Routen bleiben unveraendert** (`/orga/playmaker…`). Nichts wird
  verschoben, nichts umgeleitet.
- **Der bestehende Playmaker wird nicht umgefaerbt.** Nur die Ueberschrift aendert sich.
- **Buehne navy in beiden Themes.** Ball cream mit rotem Nahtring, Strike und Out
  `softball-red`, Zone und Pointe `amber-400`, Figur cream.
- **`active:` ist am Handy die einzige Rueckmeldung**; `hover:` kompiliert zu
  `@media (hover: hover)`. Jede neue Paletten-Klasse im `active:`-Zustand braucht ihren
  Eintrag im Dunkel-Shim in `styles/index.css`, sonst faellt
  `tools/palette-abdeckung.test.ts`.
- **Nichts laeuft in Schleife.** Jede Karte hat ein „nochmal".
- **`motion` liest `y`/`x` als Transform.** Wer ein SVG-Attribut animiert, nimmt
  `attrY`/`attrX`.
- Pre-Commit: `npm run build` in `frontend/` muss sauber durchlaufen.

## Review Focus

1. **Reduzierte Bewegung an.** Die CSS-Regel in `styles/index.css` fasst `motion/react`
   nicht an. Erwartung: jede Karte zeigt sofort ihren Endzustand, keine Sequenz laeuft.
   (Test in Task 2.)
2. **Unbekanntes Kapitel in der Adresse** (`/spielwissen/quatsch`). Erwartung: zurueck auf
   die Uebersicht, kein Absturz, keine leere Seite. (Test in Task 3.)
3. **Admin mit sieben Reitern bei 390 px.** Erwartung: jeder Reiter bleibt erreichbar, der
   Scroll-Hinweis erscheint, wenn die Leiste ueberlaeuft. (Test in Task 1.)
4. **Offense ohne Netz.** Erwartung: null `fetch`-Aufrufe gegen `/api` beim Rendern von
   Uebersicht und Kapitelseite. (Test in Task 3.)
5. **Dunkelmodus.** Erwartung: `tools/palette-abdeckung.test.ts` bleibt gruen, also hat
   jede neue Paletten-Klasse ihre Umdeutung oder ihren `UNVERAENDERT`-Eintrag. (Laeuft in
   jeder Task mit; eigener Schritt in Task 7.)

---

## Kartenbestand der ersten Fassung

Sechzehn Karten. **Zwei Karten aus dem Design fehlen absichtlich**, weil die Regel noch
nachgeschlagen werden muss (Design, „Vor dem Bauen zu klaeren"): „Ein Fuss bleibt drin"
(Kapitel 1) und „An der 1 darfst du durchlaufen" (Kapitel 2). Sie werden nachgetragen,
nicht jetzt gebaut.

| Kapitel | id | Karten |
|---|---|---|
| In der Box | `box` | Die Zone bist du · Drin ist Strike · Auch Strike · Der Count ist ein Wettlauf · Wofuer ein Bunt gut ist · Die Bunt-Falle |
| Du hast getroffen | `getroffen` | Lauf. Sofort. · Foul siehst du nicht · Raus: gefangen · Raus: Wurf zur 1 · Raus: getickt |
| Auf der Base | `base` | Die Base ist sicher · Los erst beim Release · Wild Pitch · Steal · Fly gefangen: erst zurueck |

---

## File Structure

```
frontend/src/components/spielwissen/
├─ SpielwissenHome.tsx      Uebersicht: Kachel Offense (drei Kapitel) + Kachel Defense
├─ KapitelSeite.tsx         Route /spielwissen/:kapitel, Karten untereinander, Weiter
├─ Karte.tsx                Huelle: Pointe, Satz, Buehne, "nochmal", Ruhig-Modus
├─ kapitel.ts               Typen + die drei Kapitel als Daten
├─ buehne.tsx               Figur, Ball, MiniFeld: die geteilten Zeichenteile
└─ karten/
    ├─ box.tsx              die sechs Buehnen von Kapitel 1
    ├─ getroffen.tsx        die fuenf Buehnen von Kapitel 2
    └─ base.tsx             die fuenf Buehnen von Kapitel 3
```

Geaendert: `components/layout/Layout.tsx` (Reiter), `routes.tsx` (zwei Routen),
`lazyPages.tsx` (beide Seiten lazy), `components/playmaker/PlaymakerOverview.tsx`
(Ueberschrift), `styles/index.css` (Dunkel-Shim, falls noetig).

Geloescht: `components/howto/SpikeHowTo.tsx` und die Route `/spike-howto`.

---

### Task 1: Der Reiter und die Uebersicht

**Files:**
- Create: `frontend/src/components/spielwissen/SpielwissenHome.tsx`
- Create: `frontend/src/components/spielwissen/SpielwissenHome.test.tsx`
- Modify: `frontend/src/components/layout/Layout.tsx` (`ADMIN_TABS`, `PLAYER_TABS`)
- Modify: `frontend/src/components/layout/Layout.test.tsx`
- Modify: `frontend/src/routes.tsx`, `frontend/src/lazyPages.tsx`
- Modify: `frontend/src/routes.test.tsx` (`PROTECTED_PATHS`)
- Delete: `frontend/src/components/howto/SpikeHowTo.tsx` und die Route `/spike-howto`

**Interfaces:**
- Consumes: nichts.
- Produces: Route `/spielwissen` → `SpielwissenHome` (default export). Der Reiter traegt
  `path: '/spielwissen'`, `label: 'Spielwissen'`, `shortLabel: 'Wissen'`.

- [ ] **Step 1: Wegwerf-Spike loeschen**

`SpikeHowTo.tsx` samt Verzeichnis `components/howto/`, der Import in `routes.tsx` und die
Route `/spike-howto`.

- [ ] **Step 2: Die fehlschlagenden Tests schreiben**

In `Layout.test.tsx` die beiden Zaehl-Tests auf die neue Lage heben und den Reiter pinnen:

```tsx
it('zeigt einem Admin sieben Reiter', () => { /* wie der bestehende Sechser-Test, Zahl 7 */ })
it('zeigt einem Spieler fuenf Reiter: Start, Spielbetrieb, Analyse, Kalender, Wissen', () => { /* … */ })
it('zeigt den Wissen-Reiter jeder Rolle und fuehrt ihn auf /spielwissen', () => {
  // Spieler UND Admin: getByRole('link', { name: /Wissen/i }) hat href /spielwissen
})
```

In `SpielwissenHome.test.tsx`:

```tsx
it('bietet Offense mit seinen drei Fragen und Defense', () => {
  expect(screen.getByRole('link', { name: /In der Box/ })).toHaveAttribute('href', '/spielwissen/box')
  expect(screen.getByText('Was zaehlt als Strike?')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Du hast getroffen/ })).toHaveAttribute('href', '/spielwissen/getroffen')
  expect(screen.getByRole('link', { name: /Auf der Base/ })).toHaveAttribute('href', '/spielwissen/base')
  expect(screen.getByRole('link', { name: /Defense/ })).toHaveAttribute('href', '/orga/playmaker')
})
it('nennt keine Kapitelnummern', () => {
  expect(screen.queryByText(/Kapitel 1|Kapitel 2|Kapitel 3/)).not.toBeInTheDocument()
})
it('schreibt keinen Gedankenstrich in sichtbaren Text', () => {
  expect(container.textContent).not.toContain('—')
})
```

In `routes.test.tsx`: `/spielwissen` und `/spielwissen/box` in `PROTECTED_PATHS`.

- [ ] **Step 3: Tests laufen lassen, Fehlschlag bestaetigen**

Run: `cd frontend && npx vitest run src/components/layout/Layout.test.tsx src/components/spielwissen src/routes.test.tsx`
Expected: FAIL, `SpielwissenHome` existiert nicht.

- [ ] **Step 4: `SpielwissenHome` bauen**

Default export, keine Props. Vier Links: drei Kapitel-Kacheln unter einer Ueberschrift
OFFENSE, darunter eine Kachel DEFENSE auf `/orga/playmaker`. Jede Kapitel-Kachel zeigt
Titel und darunter die Frage. Die Defense-Kachel nimmt `FeldMiniatur` aus
`components/start/FeldMiniatur` als Vorschaubild, weil sie dieselbe Geometrie zeichnet wie
der Playmaker dahinter.

Die Fragen wortgenau: `Was zaehlt als Strike?` · `Wohin laufe ich, wann bin ich raus?` ·
`Wann darf ich weiter?`

- [ ] **Step 5: Reiter und Routen eintragen**

Reiter in **beide** Listen, hinter `/stats` bzw. hinter `/kalender`. Icon: `BookOpen` aus
`lucide-react` (die Reiterleiste benutzt lucide, nicht den eigenen Satz).
`/spielwissen` als lazy Route in `routes.tsx` innerhalb des `Layout`-Blocks.

- [ ] **Step 6: Tests laufen lassen**

Run: `cd frontend && npx vitest run src/components/layout src/components/spielwissen src/routes.test.tsx`
Expected: PASS.

- [ ] **Step 7: Die Reiterleiste bei 390 px nachmessen**

Der Kommentar in `Layout.tsx` haelt fest, dass der sechste Reiter dort schon einmal um
2 px zu viel war. Mit dem Browser bei 390 px Breite als Admin pruefen: laeuft die Leiste
ueber, steht `data-scroll-hint="true"` an der `nav`, und ist jeder Reiter durch Wischen
erreichbar. Ergebnis als Kommentar an `ADMIN_TABS` schreiben, mit der gemessenen Zahl.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/spielwissen frontend/src/components/layout frontend/src/routes.tsx frontend/src/routes.test.tsx frontend/src/lazyPages.tsx
git rm -r frontend/src/components/howto
git commit -m "✨ Ein Reiter Spielwissen, der Offense und Defense zusammenbringt"
```

---

### Task 2: Die Kartenhuelle und die geteilten Zeichenteile

**Files:**
- Create: `frontend/src/components/spielwissen/kapitel.ts`
- Create: `frontend/src/components/spielwissen/Karte.tsx`
- Create: `frontend/src/components/spielwissen/Karte.test.tsx`
- Create: `frontend/src/components/spielwissen/buehne.tsx`

**Interfaces:**
- Consumes: nichts.
- Produces:
  ```ts
  // kapitel.ts
  export interface BuehnenProps { lauf: number; ruhig: boolean }
  export interface KartenDaten {
    id: string
    pointe: string
    satz?: string
    Buehne: React.ComponentType<BuehnenProps>
  }
  export interface Kapitel {
    id: 'box' | 'getroffen' | 'base'
    titel: string
    frage: string
    karten: KartenDaten[]
  }
  export const KAPITEL: Kapitel[]
  export function findeKapitel(id: string | undefined): Kapitel | undefined
  ```
  ```tsx
  // Karte.tsx
  export function Karte({ karte }: { karte: KartenDaten }): JSX.Element
  ```
  ```tsx
  // buehne.tsx
  export function Figur(props: { k?: number; boden?: number }): JSX.Element   // SVG-<g>, Schlagfrau, skaliert vom Boden aus
  export function Ball(props: { r?: number }): JSX.Element                    // SVG-<g>, cream mit rotem Nahtring
  export function MiniFeld(props: { ausschnitt: 'infield' | 'home'; children?: React.ReactNode }): JSX.Element
  ```
  `MiniFeld` zeichnet aus `components/playmaker/board/geometry` (`SKIN_PATH`,
  `FOUL_LINES_PATH`, `BASES`, `HOME`) und legt `children` in dasselbe Koordinatensystem.

- [ ] **Step 1: Die fehlschlagenden Tests schreiben**

```tsx
it('zeigt Pointe und Satz und haelt die Buehne', () => { /* beide im Dokument, Buehne gerendert */ })

it('startet die Buehne neu, wenn man nochmal tippt', () => {
  // Buehnen-Attrappe schreibt `lauf` in ein data-Attribut
  fireEvent.click(screen.getByRole('button', { name: 'nochmal' }))
  expect(screen.getByTestId('buehne')).toHaveAttribute('data-lauf', '1')
})

it('springt bei reduzierter Bewegung sofort in den Endzustand', () => {
  // useReducedMotion ueber matchMedia auf true
  expect(screen.getByTestId('buehne')).toHaveAttribute('data-ruhig', 'true')
})

it('bietet bei reduzierter Bewegung kein nochmal an', () => {
  expect(screen.queryByRole('button', { name: 'nochmal' })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestaetigen**

Run: `cd frontend && npx vitest run src/components/spielwissen/Karte.test.tsx`
Expected: FAIL, `Karte` existiert nicht.

- [ ] **Step 3: `kapitel.ts` mit Typen und leerem `KAPITEL` anlegen**

`findeKapitel` sucht in `KAPITEL` nach `id` und liefert `undefined`, wenn nichts passt.

- [ ] **Step 4: `Karte` bauen**

Haelt `lauf` als Zustand, liest `useReducedMotion()` aus `motion/react` und reicht beides
als `BuehnenProps` durch. Bei `ruhig` faellt der „nochmal"-Knopf weg, weil es nichts
abzuspielen gibt. Die Buehne liegt auf navy (`bg-navy-900`), Pointe in `font-display`,
versal, `text-amber-400`.

- [ ] **Step 5: `buehne.tsx` bauen**

`Figur` und `Ball` sind reine SVG-Gruppen ohne eigene Animation, damit jede Karte sie
selbst bewegt. `MiniFeld` kapselt `viewBox` und die drei Pfade; `ausschnitt: 'infield'`
zeigt den Diamanten, `'home'` den Bereich um die Platte.

- [ ] **Step 6: Tests laufen lassen**

Run: `cd frontend && npx vitest run src/components/spielwissen`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/spielwissen
git commit -m "✨ Eine Kartenhuelle, die auch bei abgeschalteter Bewegung ihre Auskunft zeigt"
```

---

### Task 3: Die Kapitelseite

**Files:**
- Create: `frontend/src/components/spielwissen/KapitelSeite.tsx`
- Create: `frontend/src/components/spielwissen/KapitelSeite.test.tsx`
- Modify: `frontend/src/routes.tsx`, `frontend/src/lazyPages.tsx`

**Interfaces:**
- Consumes: `KAPITEL`, `findeKapitel`, `Karte` aus Task 2.
- Produces: Route `/spielwissen/:kapitel` → `KapitelSeite` (default export).

- [ ] **Step 1: Die fehlschlagenden Tests schreiben**

```tsx
it('zeigt Titel, Frage und jede Karte des Kapitels', () => { /* … */ })

it('fuehrt am Ende ins naechste Kapitel', () => {
  // auf /spielwissen/box: Link auf /spielwissen/getroffen
})

it('bietet im letzten Kapitel keinen Weiter-Link, sondern zurueck zur Uebersicht', () => {
  // auf /spielwissen/base: Link auf /spielwissen
})

it('schickt ein unbekanntes Kapitel zurueck auf die Uebersicht', () => {
  // /spielwissen/quatsch rendert die Uebersicht, nicht eine leere Seite
})

it('ruft nichts unter /api ab', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  // rendern
  expect(fetchSpy.mock.calls.filter(([u]) => String(u).includes('/api'))).toHaveLength(0)
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestaetigen**

Run: `cd frontend && npx vitest run src/components/spielwissen/KapitelSeite.test.tsx`
Expected: FAIL.

- [ ] **Step 3: `KapitelSeite` bauen**

Liest `useParams()`, sucht mit `findeKapitel`. Kein Treffer heisst
`<Navigate to="/spielwissen" replace />`. Sonst Kopf mit Titel und Frage, darunter die
Karten untereinander, darunter der Weiter-Link auf das naechste Kapitel in `KAPITEL` oder,
wenn es keines mehr gibt, zurueck auf `/spielwissen`.

- [ ] **Step 4: Route eintragen**

`/spielwissen/:kapitel` als lazy Route, hinter `/spielwissen`.

- [ ] **Step 5: Tests laufen lassen**

Run: `cd frontend && npx vitest run src/components/spielwissen src/routes.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/spielwissen frontend/src/routes.tsx frontend/src/lazyPages.tsx
git commit -m "✨ Drei Kapitel, die der Reihe nach durch den At-Bat fuehren"
```

---

### Task 4: Kapitel 1, In der Box

**Files:**
- Create: `frontend/src/components/spielwissen/karten/box.tsx`
- Create: `frontend/src/components/spielwissen/karten/box.test.tsx`
- Modify: `frontend/src/components/spielwissen/kapitel.ts` (Kapitel `box` eintragen)

**Interfaces:**
- Consumes: `BuehnenProps`, `Figur`, `Ball`, `MiniFeld` aus Task 2.
- Produces: `export const BOX_KARTEN: KartenDaten[]` mit sechs Eintraegen.

**Die sechs Pointen, wortgenau:**

| id | pointe | satz |
|---|---|---|
| `zone` | `Die Zone bist du` | `Brust bis Knie, ueber der Platte. Zwei Leute, zwei Zonen.` |
| `drin` | `Drin ist Strike` | `Auch wenn du nicht schwingst.` |
| `auch-strike` | `Auch Strike` | `Geschwungen und nicht getroffen. Und jedes Foul, solange du unter zwei Strikes bist.` |
| `count` | `Der Count ist ein Wettlauf` | `Vier Balls bringen dich auf die 1. Drei Strikes, und du bist raus.` |
| `bunt-wofuer` | `Wofuer ein Bunt gut ist` | `Kurz ablegen, waehrend die Verteidigung tief steht, und du bist schon unterwegs.` |
| `bunt-falle` | `Die Bunt-Falle` | `Bei zwei Strikes gebuntet und foul: du bist raus.` |

- [ ] **Step 1: Die fehlschlagenden Tests schreiben**

```tsx
it('liefert sechs Karten mit genau diesen Pointen', () => {
  expect(BOX_KARTEN.map(k => k.pointe)).toEqual([
    'Die Zone bist du', 'Drin ist Strike', 'Auch Strike',
    'Der Count ist ein Wettlauf', 'Wofuer ein Bunt gut ist', 'Die Bunt-Falle',
  ])
})

it('schreibt in keiner Karte einen Gedankenstrich', () => {
  for (const k of BOX_KARTEN) {
    expect(k.pointe).not.toContain('—')
    expect(k.satz ?? '').not.toContain('—')
  }
})

it('laesst die Zone mit der Figur wachsen', () => {
  // Buehne `zone` rendern, auf "Gross" tippen: die Hoehe des Zonen-Rechtecks
  // ist groesser als vorher
})

it('zeigt jede Buehne im Ruhig-Modus ohne Absturz und mit ihrem Endzustand', () => {
  // ueber alle sechs: render(<B lauf={0} ruhig />) und eine sichtbare Aussage pruefen
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestaetigen**

Run: `cd frontend && npx vitest run src/components/spielwissen/karten/box.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Die sechs Buehnen bauen**

Jede als `React.ComponentType<BuehnenProps>`. Was jede zeigt:

- `zone`: Figur neben der Platte, Zonen-Rechteck von Brust bis Knie, zwei Knoepfe
  „Klein" und „Gross". Die Figur skaliert vom Boden aus, das Rechteck folgt.
  **`attrY`, nicht `y`.**
- `drin`: ein Pitch faellt in die Zone, Stempel `Strike`, daneben ein zweiter daneben,
  Stempel `Ball`.
- `auch-strike`: drei Felder, die nacheinander aufleuchten: geschwungen und vorbei ·
  Foul unter zwei Strikes · in der Zone stehen gelassen.
- `count`: zwei Reihen, vier gegen drei Punkte, die sich fuellen; wer voll ist, gewinnt.
  `WALK` in `amber-400`, `OUT` in `softball-red`.
- `bunt-wofuer`: `MiniFeld` mit `ausschnitt='infield'`, die Verteidigung steht tief, der
  Ball faellt kurz, der Laeufer ist schon los.
- `bunt-falle`: Count steht auf zwei Strikes, Schlaeger dreht in die Bunt-Haltung, Ball
  tropft ins Foul, `OUT`.

- [ ] **Step 4: Kapitel eintragen**

In `kapitel.ts`: `{ id: 'box', titel: 'In der Box', frage: 'Was zaehlt als Strike?', karten: BOX_KARTEN }`.

- [ ] **Step 5: Tests laufen lassen**

Run: `cd frontend && npx vitest run src/components/spielwissen`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/spielwissen
git commit -m "✨ Kapitel In der Box: die Zone, der Count und die Bunt-Falle"
```

---

### Task 5: Kapitel 2, Du hast getroffen

**Files:**
- Create: `frontend/src/components/spielwissen/karten/getroffen.tsx`
- Create: `frontend/src/components/spielwissen/karten/getroffen.test.tsx`
- Modify: `frontend/src/components/spielwissen/kapitel.ts`

**Interfaces:**
- Consumes: wie Task 4.
- Produces: `export const GETROFFEN_KARTEN: KartenDaten[]` mit fuenf Eintraegen.

| id | pointe | satz |
|---|---|---|
| `lauf` | `Lauf. Sofort.` | `Nicht hinsehen, nicht abwarten.` |
| `foul` | `Foul siehst du nicht` | `Zwei Baelle, gleicher Abflug. Einer ist fair, einer ist foul. Nicht dein Call.` |
| `gefangen` | `Raus: gefangen` | `Ball aus der Luft gefangen, bevor er den Boden beruehrt.` |
| `wurf-zur-eins` | `Raus: Wurf zur 1` | `Der Ball ist vor dir da.` |
| `getickt` | `Raus: getickt` | `Jemand beruehrt dich mit dem Ball, waehrend du auf keiner Base stehst.` |

- [ ] **Step 1: Die fehlschlagenden Tests schreiben**

Wie Task 4 Step 1: Pointenliste, Gedankenstrich-Verbot, Ruhig-Modus ueber alle fuenf.
Dazu eine Karte im Einzelnen:

```tsx
it('laesst die beiden Baelle gleich losfliegen und erst spaet auseinandergehen', () => {
  // Buehne `foul`: beide Kreise starten auf HOME, am Ende liegt der eine innerhalb,
  // der andere ausserhalb der Foul-Linie
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestaetigen**

Run: `cd frontend && npx vitest run src/components/spielwissen/karten/getroffen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Die fuenf Buehnen bauen**

- `lauf`: der Schlag, und die Figur ist weg, bevor der Ball gelandet ist.
- `foul`: `MiniFeld` `'infield'`, zwei Baelle aus `HOME`, 42 und 50 Grad, gemeinsame
  erste Strecke, dann `FAIR` und `FOUL`.
- `gefangen`: Flugball, ein Handschuh darunter, Ball bleibt drin, `OUT`.
- `wurf-zur-eins`: Laeufer und Ball laufen gegeneinander zur 1, der Ball ist zuerst da.
- `getickt`: Laeufer zwischen zwei Bases, der Ball beruehrt ihn, `OUT`.

- [ ] **Step 4: Kapitel eintragen**

`{ id: 'getroffen', titel: 'Du hast getroffen', frage: 'Wohin laufe ich, wann bin ich raus?', karten: GETROFFEN_KARTEN }`.

- [ ] **Step 5: Tests laufen lassen**

Run: `cd frontend && npx vitest run src/components/spielwissen`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/spielwissen
git commit -m "✨ Kapitel Du hast getroffen: lauf, und drei Arten trotzdem raus zu sein"
```

---

### Task 6: Kapitel 3, Auf der Base

**Files:**
- Create: `frontend/src/components/spielwissen/karten/base.tsx`
- Create: `frontend/src/components/spielwissen/karten/base.test.tsx`
- Modify: `frontend/src/components/spielwissen/kapitel.ts`

**Interfaces:**
- Consumes: wie Task 4.
- Produces: `export const BASE_KARTEN: KartenDaten[]` mit fuenf Eintraegen.

| id | pointe | satz |
|---|---|---|
| `sicher` | `Die Base ist sicher` | `Steh drauf, und dir passiert nichts.` |
| `release` | `Los erst beim Release` | `Erst wenn der Ball die Hand der Pitcherin verlaesst. Kein Leadoff.` |
| `wild-pitch` | `Wild Pitch` | `Der Ball rutscht am Catcher vorbei. Das ist dein Moment.` |
| `steal` | `Steal` | `Dasselbe, nur geplant.` |
| `tag-up` | `Fly gefangen: erst zurueck` | `Zurueck auf die Base beruehren, dann erst los.` |

- [ ] **Step 1: Die fehlschlagenden Tests schreiben**

Wie Task 4 Step 1, plus:

```tsx
it('laesst den Laeufer erst los, wenn der Ball die Hand verlaesst', () => {
  // Buehne `release`: solange der Pitch nicht abgegeben ist, steht der Laeufer auf der Base
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestaetigen**

Run: `cd frontend && npx vitest run src/components/spielwissen/karten/base.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Die fuenf Buehnen bauen**

- `sicher`: Laeufer steht auf der Base, der Ball kommt und geht, nichts passiert.
- `release`: zwei Laeufe nebeneinander, einer zu frueh (zurueck) und einer beim Release.
- `wild-pitch`: der Pitch rutscht am Catcher vorbei, der Laeufer zieht auf die naechste.
- `steal`: derselbe Weg wie `wild-pitch`, nur beginnt er mit dem Release und ohne Fehler.
- `tag-up`: Flugball gefangen, der Laeufer beruehrt die Base, erst danach laeuft er.

- [ ] **Step 4: Kapitel eintragen**

`{ id: 'base', titel: 'Auf der Base', frage: 'Wann darf ich weiter?', karten: BASE_KARTEN }`.

- [ ] **Step 5: Tests laufen lassen**

Run: `cd frontend && npx vitest run src/components/spielwissen`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/spielwissen
git commit -m "✨ Kapitel Auf der Base: wann man los darf und wann nicht"
```

---

### Task 7: Defense am Playmaker, Dunkelmodus und Abschluss

**Files:**
- Modify: `frontend/src/components/playmaker/PlaymakerOverview.tsx:178-184`
- Modify: `frontend/src/styles/index.css` (nur falls der Paletten-Waechter es verlangt)
- Create/Modify: Test auf die Ueberschrift

**Interfaces:**
- Consumes: nichts.
- Produces: nichts.

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

```tsx
it('ueberschreibt die Uebersicht mit Defense und nennt Playmaker darueber', () => {
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Defense')
  expect(screen.getByText('Playmaker')).toBeInTheDocument()
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestaetigen**

Run: `cd frontend && npx vitest run src/components/playmaker`
Expected: FAIL.

- [ ] **Step 3: Die Ueberschrift umstellen**

Ueber der `<h1>` eine kleine Zeile `Playmaker` in der Art der Augenbrauen-Zeilen der App,
die `<h1>` selbst traegt `Defense`. Die Kacheln in `OrgaHome.tsx` und auf der Startseite
bleiben unveraendert „Playmaker".

- [ ] **Step 4: Den Paletten-Waechter laufen lassen**

Run: `cd frontend && npx vitest run tools/palette-abdeckung.test.ts`
Expected: PASS. Falls rot: die genannte Klasse im Dunkel-Block von `styles/index.css`
umdeuten, `active:` eine Stufe ueber `hover:` (Hausregel, `#425978` fuer die navy-Reihe).

- [ ] **Step 5: Die ganze Suite und den Bau**

Run: `cd frontend && npx vitest run && npm run lint && npm run build`
Expected: alles gruen, Bau ohne Fehler.

- [ ] **Step 6: Am Geraet ansehen**

Bei 393x760 durch alle drei Kapitel scrollen, jedes „nochmal" einmal antippen, in beiden
Themes. Geprueft wird: keine Karte haengt auf halbem Weg, keine Pointe wird abgeschnitten,
der Druck auf „nochmal" gibt eine sichtbare Rueckmeldung.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/playmaker frontend/src/styles/index.css
git commit -m "🏷️ Die Play-Uebersicht heisst fuer Spieler Defense"
```

---

## Was bewusst NICHT in dieser Fassung steht

- **„Ein Fuss bleibt drin"** und **„An der 1 darfst du durchlaufen"**: die Regel ist noch
  nicht gegen das Regelbuch geprueft (Design, „Vor dem Bauen zu klaeren" 1 und 2).
- **Dropped Third Strike**: gilt je nach Liga anders.
- **Kein Umbau des Playmakers**, kein Backend, kein Quiz, kein Fortschritt, kein Video.
