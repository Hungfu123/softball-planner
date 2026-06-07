# College-Series Live-Anzeige — Design (finaler Stand)

**Datum:** 2026-06-07
**Status:** Umgesetzt (`feat/college-series-live-panel`, Commit `7bce17e`), live getestet.
**Ziel:** Liga-Tabelle **und** Spielplan der "College Series" live aus der externen
`strikeout-scoring.com`-API holen und im eigenen Frontend-Design anzeigen — reine Anzeige,
kein Speichern, kein Backend.

> **Historie:** Frühe Versionen dieses Specs beschrieben (a) einen Backend-Import mit Persistenz,
> dann (b) eine reine Standings-Anzeige. Beides überholt. Maßgeblich ist der hier dokumentierte,
> tatsächlich gebaute Stand: **Frontend-only, Standings + Spielplan, mit Team-Logos.**

---

## 1. Scope (umgesetzt)

- **Reine Anzeige**, kein Speichern, kein Backend, keine Migration.
- **Fetch direkt im Frontend** gegen `api.strikeout-scoring.com` (deren CORS ist `*`), anonym
  (kein Custom-Header).
- **Zwei Ansichten:** Liga-**Tabelle** + **Spielplan**.
- **Volle Team-Namen** + **echte Team-Logos** (Monogramm-Fallback bei fehlendem Logo).
- **Dead Sox hervorgehoben** (Tabelle: navy Zeile; Spielplan: Heim/Auswärts-Badge).
- Sichtbar **nur** in der College-Series-Season (Gate per Season-Name).

**Nicht-Ziel:** Persistenz, Backend-Endpoint, Integration mit eigenen `Game`/`LeagueResult`-Daten,
eigene Standings-Berechnung (es werden deren fertige Werte gezeigt).

---

## 2. Externe API

Host: `https://api.strikeout-scoring.com/index.php` · League `243398103` · Season `455890221`.
Offen (kein Auth, CORS `*`, JSON). Genutzt:

| Daten | Endpoint | Pfad zu Zeilen |
|------|----------|----------------|
| Standings | `/league/standings/243398103/455890221` | `standings[].rsStandings[].members[]` |
| Schedule | `/schedule/league/243398103/455890221` | `stages[].games[]` |
| Logos | `/uploads/{logo}` | `logo` (Member) / `homeTeamLogoURL`/`awayTeamLogoURL` (Game) |

Felder als **Strings** (→ `Number(...)`). Member: name, color, logo, tlc, g/w/l/wperc/rs/ra/rd.
Game: home/awayTeamName, …Color, …LogoURL, …Tlc, home/awayScore, status (`Final`), gameDate
(unix-Sek). Dead Sox: teamID `406716409`.

**Rest-Risiko:** inoffizielle API — kann sich ändern, CORS kann wegfallen, kein Cache/Fallback
(Frontend-direkt). Abgefedert durch Fehler-State + defensives Parsing + Isolation auf eine Sektion.

---

## 3. Architektur (Frontend-only)

```
frontend/src/
├── api/collegeSeries.ts          # Fetch + Parse (Standings+Schedule), teamColorHex, teamLogoUrl, isCollegeSeriesSeason
├── hooks/useCollegeSeries.ts     # { standings, schedule, loading, error, reload }
└── components/dashboard/CollegeSeriesPanel.tsx   # UI (Tabs/2-Spalten, Tabelle, Spielplan, Avatare, States)
```

- **`api/collegeSeries.ts`** kapselt URL/Konstanten, ruft beide Endpoints direkt (NICHT über den
  `/api`-Client), flacht die verschachtelten Strukturen, parst Strings→Zahlen, sortiert Standings
  (winPct↓, runDiff↓) und Schedule (Datum↑). Helfer: `teamColorHex` (Token→Hex),
  `teamLogoUrl` (Dateiname→CDN-URL), `isCollegeSeriesSeason` (Gate).
- **`useCollegeSeries`** holt Standings + Schedule parallel, hält loading/error, bietet `reload`.
- **`CollegeSeriesPanel`** rendert alles, holt Daten selbst über den Hook (keine Props).

---

## 4. UI / UX (umgesetzt)

- **Responsive:**
  - Mobil: **Segmented Tabs** „Tabelle | Spielplan" — eine Ansicht (spart vertikalen Platz).
  - Ab `lg`: **2 Spalten** nebeneinander (Tabelle 3/5 + Trenner, Spielplan 2/5) — keine Tabs.
- **Team-Avatar:** echtes Logo (`<img>` vom CDN) oder Monogramm (TLC) im Team-Farbton als Fallback.
- **Tabelle:** #, Team (Avatar+Name), G, W, L, Pct, RS, RA, Diff. W grün / L rot, Diff ±.
  **RS/RA mobil ausgeblendet** (Breite), ab `sm` sichtbar. Dead-Sox-Zeile navy-800/weiß,
  cream-100 Zebra.
- **Spielplan:** Filter-Chips „nur Dead Sox" (default) / „Alle Teams". Gruppiert nach Spieltag
  (Pill). **Kein `@`** — Dead-Sox-Spiele zeigen **Heim/Ausw.**-Badge + Gegner prominent; Finals
  **Sieg/Niederlage** + Score aus eigener Sicht; offene → `OFFEN`-Pill. Fremd-Spiele (nur „Alle"):
  `Gast bei Gastgeber` (Heim markiert). „Alle Teams" auf 6 Spieltage gekappt + „mehr"-Button.
- **Design:** all-cream Card (cream-50) + Layered-Shadows, cream Akzente (Zebra/Tabs/Header/Footer),
  navy als Brand-Akzent. Custom-Icons (Trophy/Calendar/Refresh), deutsch. LIVE-Pill (ping) +
  **Refresh-Knopf** im Header.
- **States:** Lade-Skeleton, Fehler + „Erneut laden", Leer (CrossBones).

---

## 5. Einbindung

In `Dashboard.tsx` (SPIELE-Tab) nach `SeasonTileGrid`, **gegated**:
`isCollegeSeriesSeason(selectedSeason?.name)` → Panel nur in der College-Series-Season, nichts
in der DB, getrennt von eigenen Daten. Auf Prod erscheint es automatisch in der bestehenden
„College Series"-Season (kein Anlegen nötig).

---

## 6. PWA / Anonymität

SW erfasst den Cross-Origin-Call standardmäßig nicht (läuft durch); Fetch `cache: 'no-store'`.
Offline → Fehler-Zustand (erwartbar). Plain `fetch` ohne Custom-Header (anonym).

---

## 7. Verifikation

- `npm run build` grün, `npm run lint` 0 Errors (15 Warnings = Repo-Baseline `set-state-in-effect`).
- **Live getestet** (lokal): College-Series-Season angelegt → Panel rendert, Logos laden vom CDN,
  Tabs + 2-Spalten + Refresh + Filter + Dead-Sox-Highlight funktionieren, 0 Console-Errors.
  (Lokale Test-Season danach gelöscht.)
- Optionale spätere Härtung: Backend-Proxy + Cache gegen CORS-Wegfall/Ausfälle.
