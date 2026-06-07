# College-Series Standings-Anzeige — Design

**Datum:** 2026-06-07
**Status:** Entwurf (Review ausstehend)
**Ziel:** Die Liga-Tabelle der "College Series" live aus der externen
`strikeout-scoring.com`-API holen und im eigenen Frontend-Design anzeigen — **reine Anzeige,
kein Speichern, kein Backend**.

> **Hinweis:** Eine frühere Version dieses Specs beschrieb einen Backend-Import mit Persistenz
> (LeagueTeam/LeagueResult). Das wurde verworfen — der User will nur **anzeigen**, nicht
> speichern, und den Fetch **direkt im Frontend**. Dieses Dokument ist die gültige Variante.

---

## 1. Problem & Ziel

Die Dead Sox spielen in der College Series. Die App hat dafür bereits eine Season "College
Series" angelegt. Die offizielle Tabelle steht auf college-series.de (Backend:
`strikeout-scoring.com`) — fertig berechnet.

Ziel: In der App diese Tabelle **live** sehen, gerendert im eigenen Design (Navy-Theme, volle
Team-Namen, Dead-Sox-Zeile hervorgehoben). Keine Persistenz, keine Vermischung mit der eigenen
`Game`-basierten Standings-Berechnung.

**Nicht-Ziel:** Kein Speichern in der DB. Kein Backend-Endpoint. Keine Migration. Keine
Integration mit eigenen `Game`/`LeagueResult`-Daten. Kein Schreiben zurück.

---

## 2. Externe API

Host: `https://api.strikeout-scoring.com/index.php`
Offen: kein Auth, `Access-Control-Allow-Origin: *` → **Browser-Fetch direkt möglich**.
IDs der College Series: League `243398103`, Season `455890221`.

**Endpoint (genutzt):** `GET /league/standings/243398103/455890221`

**Antwort-Struktur:**
```
{ standings: [ { name: "Vorrunde", type: "RS", rsStandings: [ { name: "League", members: [ ROW... ] } ] } ] }
```
Pfad zu den Team-Zeilen: `standings[].rsStandings[].members[]`. (Mehrere Stages/Gruppen möglich
— defensiv über alle iterieren bzw. erste Stage nehmen.)

**Member-Felder (ALLE als String!):** `teamID`, `name` (voller Name), `nickname`, `tlc`, `color`,
`logo`, `g`, `w`, `l`, `wperc`, `rs`, `ra`, `rd`, `sos`. → beim Parsen `Number(...)`.

**Dead Sox:** `teamID == "406716409"` → Zeile in der Tabelle hervorheben.

**Anonym:** plain `fetch()` ohne Custom-Header (Browser sendet Standard-UA). Bewusst kein
Kontakt-User-Agent.

**Risiko:** Inoffizielle API, kein Vertrag. CORS `*` kann wegfallen → dann bricht die Anzeige
(Frontend-direkt hat keinen Fallback-Server). Lade-/Fehler-/Leer-Zustände sind daher Pflicht.

---

## 3. Entscheidungen (im Brainstorming geklärt)

1. **Reine Anzeige**, kein Speichern, kein Backend.
2. **Fetch direkt im Frontend** (deren CORS `*` erlaubt's).
3. **Umfang: nur die Standings-Tabelle.** Kein Spielplan, keine Team-Stammdaten-Anlage.
4. **Volle Team-Namen** (Feld `name`), keine TLC-Kürzel.
5. **Dead-Sox-Zeile hervorgehoben.**
6. **Eigenes Design** via `frontend-design`-Skill (Navy-Theme, custom Icons, deutsch).
7. **Anonymer Fetch.**
8. Live bei jedem Aufruf; **keine** eigene Standings-Berechnung (deren Werte direkt zeigen).

---

## 4. Architektur (Frontend-only)

```
frontend/src/
├── api/collegeSeries.ts          # fetchCollegeSeriesStandings(): direkter API-Call + Parsing
├── hooks/useCollegeSeriesStandings.ts   # loading / error / data State
└── components/.../CollegeSeriesStandings.tsx   # Tabellen-UI (frontend-design)
```

- **`api/collegeSeries.ts`** — kapselt URL + Konstanten (`LEAGUE_ID`, `SEASON_ID`, `BASE_URL`),
  ruft die externe API direkt (NICHT über den `/api`-Client-Wrapper, das ist das eigene Backend),
  flacht `standings[].rsStandings[].members[]` zu einer typed Liste, parst Strings zu Zahlen,
  sortiert nach winPct↓, dann runDiff↓ (wie deren Tabelle).
- **`useCollegeSeriesStandings`** — Hook mit `{ rows, loading, error, reload }`. Fängt
  Netzwerk-/Parse-Fehler → `error`-State (kein Crash).
- **`CollegeSeriesStandings.tsx`** — präsentationsorientiert: Tabelle mit Platz, Name, G, W, L,
  Pct, RS, RA, RD. Dead-Sox-Zeile hervorgehoben. Lade-Spinner, Fehler-Zustand mit Retry,
  Leer-Zustand (CrossBones-Icon-Konvention).

**Datentyp:**
```ts
interface CollegeSeriesRow {
  teamId: string
  name: string         // voller Name
  games: number
  wins: number
  losses: number
  winPct: number
  runsScored: number
  runsAgainst: number
  runDiff: number
  isOwnTeam: boolean   // teamId === '406716409'
}
```

---

## 5. Einbindung

- Anzeige innerhalb der Season-Ansicht der App.
- **Nur sichtbar, wenn die offene Season die College Series ist** — Gate per Season-Name
  (case-insensitive Match auf "College Series"). Andere Seasons zeigen die Live-Tabelle nicht
  (die externen IDs `243398103`/`455890221` gelten nur für diese eine Liga).
- Klar gelabelt als Live-Daten, z.B. Sektion "College Series — Tabelle (live)".
- Getrennt von einer evtl. vorhandenen eigenen Standings-Tabelle (zwei Welten, bewusst).
- Genaue Platzierung (eigener Tab vs. Sektion in bestehender Ansicht) → in der
  `frontend-design`-Phase festlegen.

---

## 6. Zustände (Pflicht, da Live-Abhängigkeit)

- **Loading:** Spinner/Skeleton während Fetch.
- **Error:** API nicht erreichbar / CORS weg / Parse-Fehler → freundliche deutsche Meldung +
  "Erneut laden"-Button. Kein White-Screen.
- **Empty:** API liefert leere `members` → Hinweis "Noch keine Tabellendaten".
- **Success:** Tabelle, Dead-Sox-Zeile hervorgehoben.

---

## 7. PWA-Hinweis

Service Worker cached same-origin `/api` (NetworkFirst). Der externe Cross-Origin-Call
(`api.strikeout-scoring.com`) wird vom Workbox-Runtime-Caching standardmäßig nicht erfasst →
läuft durch. Falls der SW doch dazwischenfunkt: Fetch mit `cache: 'no-store'`. Bei Offline
zeigt die Anzeige den Error-Zustand (erwartbar, da Live-Feature).

---

## 8. Test-Strategie

- **Parsing-Unit-Test:** `fetchCollegeSeriesStandings`-Parsing mit echtem API-Sample-JSON als
  Fixture (Strings→Zahlen, Flatten der verschachtelten Struktur, Sortierung, `isOwnTeam`-Flag).
  Netzwerk gemockt (`vi.fn()`/`fetch`-Mock), kein Live-Call im Test.
- **Component-Smoke (optional):** Render mit Mock-Daten → Dead-Sox-Hervorhebung sichtbar,
  Error-/Empty-Zustand rendern.
- `npm run build` + `npm run lint` müssen grün sein.
- Kein Live-Call gegen die externe API im Test (flaky).
