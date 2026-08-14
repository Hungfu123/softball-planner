# Umpire-Counter — Design

**Datum:** 2026-08-14
**Status:** freigegeben, bereit für Implementierungsplan

## Problem

Am Feld braucht es einen Zähler für Balls, Strikes, Outs, Inning und Score — das, was ein Schiedsrichter sonst mit dem mechanischen Handzähler macht. Die App kann das heute nicht: Live-Scoring (`ScoringPage`, Spielbogen) hängt immer an einem angelegten `Game` bzw. Spielbogen und hinter dem Login. Ein Zähler soll ohne Anmeldung, ohne Spieltag und ohne Netz funktionieren.

## Umfang

**Dabei:** Strike, Ball, Foul, Out, Inning mit Halbinning (oben/unten), Score Heim + Gast, Undo bis Spielanfang, Reset.

**Nicht dabei:** Sync über mehrere Geräte, Verkopplung mit Spielbogen/Game/Lineup, Batting-Order, Wake-Lock. Der Zähler ist ein eigenständiges Werkzeug, kein Einstieg ins Scoring.

## Zugang & Routing

Neue Route `/counter`, erreichbar **ohne Login**.

`App.tsx` gated heute vor dem Router:

```tsx
if (!loggedIn) return <LoginPage … />
return <RouterProvider router={router} />
```

Das wird umgedreht. Der Router läuft immer; das Auth-Gate wandert in ein `RequireAuth`-Element, das jede geschützte Route umschließt. `/counter` ist eine Top-Level-Route ohne `Layout` und ohne `RequireAuth`.

Begründung: ein zweiter Gate-Pfad neben dem Router wäre eine zweite Stelle, an der man Auth vergessen kann. Ein Wrapper-Element ist eine Stelle. Der Login-State (`useState(hasAuth())` + `handleLogin`) muss dafür in einen Context wandern, damit `RequireAuth` und `LoginPage` ihn teilen.

Zwei Einstiege, beide auf dieselbe Route — die Seite existiert nur einmal:

- **Ohne Login:** sekundärer Link „Nur Zähler öffnen" unter dem Passwortfeld der `LoginPage`.
- **Mit Login:** vierte Kachel „Zähler" in `OrgaHome`, `<Link to="/counter">`, neben Einladungen / Aufbau / WhatsApp-Umfragen. Icon: Lucide `Tally5`, als `CounterIcon` in die Icon-Facade aufgenommen.

Der Counter läuft auch aus der Orga-Kachel heraus ohne `Layout` — er ist eine Vollbild-Seite, kein Unterbereich von Orga. Damit er keine Sackgasse ist, sitzt links oben auf der Navy-Tafel ein `ChevronLeft`-Link, wie in `ScoringPage`: bei angemeldetem Nutzer nach `/orga`, sonst nach `/` (dort steht die `LoginPage`). Ziel und `aria-label` richten sich nach `hasAuth()`.

### Teilen

Rechts oben auf der Tafel, gespiegelt zum Zurück-Link, ein **Teilen**-Knopf. Er reicht die Adresse der Counter-Seite weiter, damit Leute ohne Zugangsdaten den Zähler auf ihrem eigenen Gerät öffnen können.

Reihenfolge:

1. `navigator.share({ title, url })`, wenn verfügbar — auf dem Handy das native Teilen-Blatt.
2. Sonst `navigator.clipboard.writeText(url)` und für zwei Sekunden die Rückmeldung „Link kopiert".
3. Schlägt auch das fehl: „Kopieren nicht möglich".

Ein Abbruch im Teilen-Blatt (`AbortError`) ist kein Fehler und erzeugt keine Meldung.

**Geteilt wird die Seite, nicht der Spielstand.** Der Stand liegt im localStorage des jeweiligen Geräts; wer den Link öffnet, startet bei 0:0. Das ist gewollt — Live-Sync über mehrere Geräte steht ausdrücklich nicht im Umfang. Der Knopf heißt deshalb „Teilen" und nicht „Spielstand teilen".

**Backend: keine Änderung.** Kein Endpoint, keine Tabelle, kein `permitAll()`. `SecurityConfig` behält `/api/calendar.ics` als einzige Ausnahme im Auth-Gate. Ein öffentlich schreibender Endpoint wäre ein Missbrauchsvektor und für einen Gerätezähler ohne Gegenwert.

## State & Persistenz

`localStorage` statt Datenbank: der Stand ist reiner Gerätestand, keine Teamdaten, kein Auswertungsinteresse. Kein Backend heißt auch kein Auth-Loch.

```ts
type CounterState = {
  balls: number       // 0–3
  strikes: number     // 0–2
  outs: number        // 0–2
  inning: number      // 1..n
  half: 'top' | 'bottom'
  home: number
  away: number
}
```

Persistiert unter dem localStorage-Key `counter`:

```ts
type CounterStorage = {
  current: CounterState
  history: CounterState[]   // Snapshots vor jeder Aktion, ältester zuerst
}
```

**Undo bis Spielanfang** = Stack-Pop, kein Rückrechnen. Jede Aktion legt den Zustand *vor* der Aktion auf `history`. Undo nimmt den obersten Snapshot und macht ihn zu `current`. Damit existiert keine Umkehrlogik, die von der Vorwärtslogik abweichen könnte.

Ein Snapshot ist ~60 Byte; ein volles Spiel bleibt unter 30 KB. Cap bei **1000** Einträgen — beim Überlauf fällt der älteste Snapshot raus (dann reicht Undo nicht mehr ganz bis zum Anfang, praktisch unerreichbar).

Undo bei leerer History: Button ist `disabled`.

Kaputtes oder fremdes JSON unter dem Key → Startzustand, kein Crash.

**Startzustand:** alle Zähler 0, `inning: 1`, `half: 'top'`.

## Regel-Logik

Pure Funktionen in `counterRules.ts` — kein React, kein localStorage, direkt testbar. Jede Funktion nimmt `CounterState` und gibt einen neuen `CounterState` zurück.

| Aktion | Wirkung |
|---|---|
| **Strike** | `strikes + 1`; erreicht das 3, greift stattdessen der Out-Pfad |
| **Foul** | `strikes + 1` **nur wenn** `strikes < 2`; bei `strikes === 2` bleibt der Zustand unverändert |
| **Ball** | `balls + 1`; erreicht das 4, gehen `balls` und `strikes` auf 0 (Walk — kein Out) |
| **Out** | `outs + 1`, `balls` und `strikes` auf 0; erreicht `outs` die 3, greift stattdessen der Halbinning-Wechsel |
| **Halbinning ▶** | Wechsel von Hand, ohne Out (Zeitlimit, Run-Ahead, Inning-Abbruch) |
| **+ Run Heim / Gast** | `home` bzw. `away` + 1 |
| **Zurück** | Snapshot-Pop |
| **Reset** | Startzustand, History leer, mit `ConfirmModal` |

**Halbinning-Wechsel:** `balls`, `strikes`, `outs` auf 0; `half` kippt; `inning + 1` **nur** beim Wechsel `bottom → top`.

Weil der Wechsel beim 3. Out sofort greift, steht die Tafel nie auf 3 Outs — die Out-Anzeige hat deshalb zwei Lampen, nicht drei. Dasselbe gilt für Strikes (zwei Lampen) und Balls (drei).

`half: 'top'` = Gast schlägt, `half: 'bottom'` = Heim schlägt.

Ein Foul bei 2 Strikes erzeugt trotzdem einen History-Eintrag (identischer Snapshot). Das ist gewollt: der Nutzer hat gedrückt, Undo soll sich danach nicht überspringen anfühlen.

## UI

Design-System: Stadium Pocket (Cream-Papier, Navy, Softball-Red; Saira Condensed für Zahlen, Archivo für Text).

**Leitidee: die Tafel zeigt an, das Papier bedient.** Die Anzeige ist nirgends antippbar, die Bedienelemente zeigen nirgends den Stand. Ein Fehltipp auf die Anzeige kann den Stand nicht verstellen.

### Tafel (`CounterBoard`) — `navy-900`-Platte oben

- Links oben ein `ChevronLeft`-Zurück-Link, rechts oben der Teilen-Knopf (beide siehe Routing), klein und zurückhaltend — sie dürfen der Anzeige nicht die Aufmerksamkeit nehmen.
- Score links `Heim`, rechts `Gast`, in `font-display`, sehr groß.
- Die schlagende Mannschaft steht hell auf leicht aufgehelltem Grund, die wartende auf `opacity-42`.
- Mitte: `Inning` mit Pfeil — ▲ oben, ▼ unten — durch Hairlines abgesetzt.
- Darunter, über eine Trennlinie abgesetzt: die Lampenreihe. Drei Gruppen `Ball` / `Strike` / `Out`, gefüllte Punkte für den aktuellen Stand, leere Ringe für den Rest.

Lampenfarben (Ampel — die Farbe steigert sich mit dem Ernst der Lage, und die Gruppe ist ohne Lesen des Labels erkennbar):

| Gruppe | Farbe |
|---|---|
| Ball | `cream-50` (#FFFBF3) |
| Strike | `amber-400` (#F59E0B) |
| Out | `softball-red-400` (#F87171) |

`softball-red-400` statt `-500`: #E63946 auf `navy-900` kommt auf ~3,4:1 und ist für einen 17px-Punkt in der Sonne zu knapp. Der Strike-Button auf Papier bleibt `softball-red-600`.

### Bedienteil (`CounterPad`) — Cream darunter

1. `Strike` (rot, primär) · `Ball` (navy) — die zwei meistgedrückten, volle Breite
2. `Foul` · `Out` (sekundär)
3. `+ Run Heim` · `+ Run Gast`
4. `↶ Zurück` · `Halbinning ▶` · `Reset` (klein, tertiär)

`Reset` öffnet `ConfirmModal`. Alles andere wirkt sofort — Undo trägt das Risiko.

### Rahmen

- `CounterPage` klammert Board + Pad und hält den Hook.
- Kein Scroll: `100dvh`, Tafel oben fest, Bedienteil füllt den Rest. `viewport-fit=cover` ist in `index.html` schon gesetzt; Safe-Area unten beachten.
- Tap-Ziele ≥ 56px.
- Lazy geladen wie die anderen schweren Seiten, in `Suspense` + `ChunkErrorBoundary`.
- Läuft offline — die Seite steckt im PWA-Precache und ruft kein `/api` auf.
- Tastatur-Fokus sichtbar, `prefers-reduced-motion` respektiert.

### Neue Dateien

```
frontend/src/components/counter/CounterPage.tsx
frontend/src/components/counter/CounterBoard.tsx
frontend/src/components/counter/CounterPad.tsx
frontend/src/components/counter/ShareCounterButton.tsx   (+ ShareCounterButton.test.tsx)
frontend/src/hooks/useCounter.ts        (+ useCounter.test.ts)
frontend/src/utils/counterRules.ts      (+ counterRules.test.ts)
```

`src/utils/` ist der bestehende Ort für pure Logik mit Test daneben (`bogenBaseAdvance`, `coachRotation`, `runnerAdvanceDefaults`).

Wiederverwendet: `Button`, `ConfirmModal`.

## Fehlerfälle

| Fall | Verhalten |
|---|---|
| localStorage kaputt/fremd | Startzustand, kein Crash |
| localStorage nicht verfügbar (Private Mode) | Zähler läuft rein im Speicher, kein Fehler-UI |
| Undo bei leerer History | Button `disabled` |
| History-Cap erreicht | ältester Snapshot fällt raus |
| Foul bei 2 Strikes | Zustand unverändert, History-Eintrag trotzdem |

## Tests

**`counterRules.test.ts`** (Vitest, pure Funktionen):

- Strike bei 0 / 1 Strikes → hochzählen
- Strike bei 2 Strikes → Out, Count auf 0
- Foul bei 0 / 1 Strikes → hochzählen
- Foul bei 2 Strikes → unverändert
- Ball bei 0–2 → hochzählen
- Ball bei 3 → Count auf 0, `outs` unverändert
- Out bei 0 / 1 → hochzählen, Count auf 0
- Out bei 2 → Halbinning-Wechsel, alles auf 0
- Wechsel `top → bottom` → `inning` unverändert
- Wechsel `bottom → top` → `inning + 1`
- Halbinning von Hand bei 0 oder 1 Outs → Wechsel, alles auf 0, `outs` steigt vorher nicht
- `+ Run` trifft die richtige Mannschaft

**`useCounter.test.ts`:**

- Roundtrip: Aktion → localStorage → Reload liest denselben Zustand
- Undo-Kette über mehrere Aktionen zurück bis zum Startzustand
- Kaputtes JSON im Key → Startzustand
- History-Cap greift bei Überlauf

**Kein E2E nötig** — der Counter fasst weder `ScoringPage`/`GameScoringService`/`useScoring`/`CorrectionSheet`/`DiamondView` noch den Spielbogen an. Die Playwright-Suite bleibt unberührt.

**Achtung beim Routing-Umbau:** `App.tsx` betrifft *jede* Route. Nach dem Umbau prüfen, dass ohne Login weiterhin jede Route außer `/counter` auf der `LoginPage` landet, und dass nach Login alles wie vorher erreichbar ist.

## Verifikation vor Commit

```bash
cd frontend && npm run lint && npm run build && npx vitest run
```

Backend unberührt — keine Migration, kein `./mvnw test` nötig.
