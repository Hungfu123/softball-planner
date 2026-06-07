# College-Series Standings-Anzeige Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die College-Series-Liga-Tabelle live aus der externen `strikeout-scoring.com`-API holen
und im eigenen Frontend-Design anzeigen — reine Anzeige, kein Speichern, kein Backend.

**Architecture:** Reines Frontend. `api/collegeSeries.ts` fetcht die externe Standings-API direkt
(deren CORS `*` erlaubt's) und parst die verschachtelte Struktur
`standings[].rsStandings[].members[]` (alle Werte als Strings) zu einer typed, sortierten Liste.
`useCollegeSeriesStandings` kapselt loading/error/data. `CollegeSeriesStandings.tsx` rendert die
Tabelle mit Dead-Sox-Hervorhebung (`teamID === '406716409'`), Lade-/Fehler-/Leer-Zuständen.

**Tech Stack:** React 19 + TS, Vitest + @testing-library/react, Tailwind v4, custom SVG-Icons.
**Kein Backend, kein Flyway, kein Java.**

**Spec:** `docs/superpowers/specs/2026-06-07-college-series-import-design.md`

**Konstanten:** League `243398103`, Season `455890221`, Dead-Sox-teamID `406716409`,
Basis-URL `https://api.strikeout-scoring.com/index.php`.

---

## File Structure

**Erstellen:**
- `frontend/src/api/collegeSeries.ts` — Fetch + Parsing (`fetchCollegeSeriesStandings`, `parseStandings`, Typ `CollegeSeriesRow`)
- `frontend/src/api/collegeSeries.test.ts` — Parsing-Unit-Tests
- `frontend/src/hooks/useCollegeSeriesStandings.ts` — State-Hook
- `frontend/src/components/dashboard/CollegeSeriesStandings.tsx` — Tabellen-UI
- `frontend/src/components/dashboard/CollegeSeriesStandings.test.tsx` — Render-Smoke (optional)

**Modifizieren:**
- Eltern-Ansicht der Season (dort wo `<Standings .../>` gerendert wird) → `<CollegeSeriesStandings />` einbinden.

> Pfad-Alias `@/` → `frontend/src/`.

---

## Task 1: Fetch + Parsing (TDD)

`parseStandings` ist pure (kein Netzwerk) → primär getestet. `fetchCollegeSeriesStandings` ruft
die API und delegiert ans Parsing.

**Files:**
- Create: `frontend/src/api/collegeSeries.ts`
- Test: `frontend/src/api/collegeSeries.test.ts`

- [ ] **Step 1: Failing test schreiben**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseStandings, fetchCollegeSeriesStandings } from './collegeSeries'

// gekürztes echtes API-Sample: standings[0].rsStandings[0].members[]
const sample = {
  standings: [
    {
      name: 'Vorrunde',
      type: 'RS',
      rsStandings: [
        {
          name: 'League',
          members: [
            { teamID: '994247751', name: 'Aachen Aixplosives', tlc: 'AAX',
              g: '9', w: '6', l: '3', wperc: '0.6666', rs: '135', ra: '74', rd: '61' },
            { teamID: '692783220', name: 'UCE Travellers', tlc: 'UCE',
              g: '6', w: '6', l: '0', wperc: '1', rs: '90', ra: '32', rd: '58' },
            { teamID: '406716409', name: 'Düsseldorf Dead Sox', tlc: 'DUS',
              g: '0', w: '0', l: '0', wperc: '0', rs: '0', ra: '0', rd: '0' },
          ],
        },
      ],
    },
  ],
}

describe('parseStandings', () => {
  it('flacht members, parst Strings, markiert Dead Sox, sortiert nach winPct dann runDiff', () => {
    const rows = parseStandings(sample)

    expect(rows).toHaveLength(3)
    // UCE (1.0) vor Aachen (0.666) vor Dead Sox (0)
    expect(rows.map(r => r.name)).toEqual([
      'UCE Travellers', 'Aachen Aixplosives', 'Düsseldorf Dead Sox',
    ])
    expect(rows[0].wins).toBe(6)
    expect(rows[0].runDiff).toBe(58)
    expect(rows[1].games).toBe(9)
    expect(rows.find(r => r.teamId === '406716409')?.isOwnTeam).toBe(true)
    expect(rows[0].isOwnTeam).toBe(false)
  })

  it('liefert leere Liste bei fehlender Struktur', () => {
    expect(parseStandings({})).toEqual([])
    expect(parseStandings(null)).toEqual([])
  })
})

describe('fetchCollegeSeriesStandings', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('wirft bei non-ok Response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(fetchCollegeSeriesStandings()).rejects.toThrow('503')
  })

  it('parst erfolgreiche Response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(sample),
    }))
    const rows = await fetchCollegeSeriesStandings()
    expect(rows).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Test ausführen, MUSS fehlschlagen**

Run: `cd frontend && npx vitest run src/api/collegeSeries.test.ts`
Expected: FAIL — Modul `./collegeSeries` existiert nicht.

- [ ] **Step 3: Implementierung**

```ts
const BASE_URL = 'https://api.strikeout-scoring.com/index.php'
const LEAGUE_ID = '243398103'
const SEASON_ID = '455890221'
const DEAD_SOX_TEAM_ID = '406716409'

export interface CollegeSeriesRow {
  teamId: string
  name: string
  games: number
  wins: number
  losses: number
  winPct: number
  runsScored: number
  runsAgainst: number
  runDiff: number
  isOwnTeam: boolean
}

interface RawMember {
  teamID?: string; name?: string
  g?: string; w?: string; l?: string; wperc?: string
  rs?: string; ra?: string; rd?: string
}

function num(s: string | undefined): number {
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export function parseStandings(data: unknown): CollegeSeriesRow[] {
  const stages = (data as { standings?: unknown[] } | null)?.standings ?? []
  const members: RawMember[] = []
  for (const stage of stages as Array<{ rsStandings?: Array<{ members?: RawMember[] }> }>) {
    for (const group of stage?.rsStandings ?? []) {
      for (const m of group?.members ?? []) members.push(m)
    }
  }
  const rows: CollegeSeriesRow[] = members.map((m) => ({
    teamId: String(m.teamID ?? ''),
    name: String(m.name ?? ''),
    games: num(m.g),
    wins: num(m.w),
    losses: num(m.l),
    winPct: num(m.wperc),
    runsScored: num(m.rs),
    runsAgainst: num(m.ra),
    runDiff: num(m.rd),
    isOwnTeam: String(m.teamID ?? '') === DEAD_SOX_TEAM_ID,
  }))
  rows.sort((a, b) => b.winPct - a.winPct || b.runDiff - a.runDiff)
  return rows
}

export async function fetchCollegeSeriesStandings(): Promise<CollegeSeriesRow[]> {
  const res = await fetch(`${BASE_URL}/league/standings/${LEAGUE_ID}/${SEASON_ID}`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`College-Series API Fehler ${res.status}`)
  }
  return parseStandings(await res.json())
}
```

- [ ] **Step 4: Test ausführen, MUSS grün sein**

Run: `cd frontend && npx vitest run src/api/collegeSeries.test.ts`
Expected: PASS (4 Tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/collegeSeries.ts frontend/src/api/collegeSeries.test.ts
git commit -m "✨ College-Series: API-Fetch + Standings-Parsing (Frontend-direkt)"
```

---

## Task 2: State-Hook

`useCollegeSeriesStandings` kapselt loading/error/data + reload.

**Files:**
- Create: `frontend/src/hooks/useCollegeSeriesStandings.ts`

- [ ] **Step 1: Hook implementieren**

```ts
import { useCallback, useEffect, useState } from 'react'
import { fetchCollegeSeriesStandings, type CollegeSeriesRow } from '@/api/collegeSeries'

export function useCollegeSeriesStandings() {
  const [rows, setRows] = useState<CollegeSeriesRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchCollegeSeriesStandings()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Tabelle konnte nicht geladen werden'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { rows, loading, error, reload }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc -b`
Expected: kein Fehler.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useCollegeSeriesStandings.ts
git commit -m "✨ College-Series: useCollegeSeriesStandings Hook (loading/error/reload)"
```

---

## Task 3: Tabellen-Komponente (frontend-design)

> **Visuelle Umsetzung mit der `frontend-design`-Skill.** Der folgende Code ist eine
> funktionierende Baseline (Struktur + alle Zustände + Dead-Sox-Hervorhebung). Die Skill
> verfeinert Layout/Typo/Spacing im Navy-Theme. Konventionen: deutsch, custom Icons, kein
> Icon-Lib, Tailwind-v4-Klassen (`md:`-Prefixe, keine arbitrary brackets).

**Files:**
- Create: `frontend/src/components/dashboard/CollegeSeriesStandings.tsx`
- Test: `frontend/src/components/dashboard/CollegeSeriesStandings.test.tsx`

- [ ] **Step 1: Failing Render-Test schreiben**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CollegeSeriesStandings } from './CollegeSeriesStandings'

const rows = [
  { teamId: '692783220', name: 'UCE Travellers', games: 6, wins: 6, losses: 0,
    winPct: 1, runsScored: 90, runsAgainst: 32, runDiff: 58, isOwnTeam: false },
  { teamId: '406716409', name: 'Düsseldorf Dead Sox', games: 0, wins: 0, losses: 0,
    winPct: 0, runsScored: 0, runsAgainst: 0, runDiff: 0, isOwnTeam: true },
]

vi.mock('@/hooks/useCollegeSeriesStandings', () => ({
  useCollegeSeriesStandings: vi.fn(() => ({ rows, loading: false, error: null, reload: vi.fn() })),
}))

afterEach(() => vi.clearAllMocks())

describe('CollegeSeriesStandings', () => {
  it('zeigt volle Team-Namen und markiert die Dead-Sox-Zeile', () => {
    render(<CollegeSeriesStandings />)
    expect(screen.getByText('UCE Travellers')).toBeInTheDocument()
    const deadSoxRow = screen.getByText('Düsseldorf Dead Sox').closest('tr')
    expect(deadSoxRow).toHaveAttribute('data-own', 'true')
  })
})
```

- [ ] **Step 2: Test ausführen, MUSS fehlschlagen**

Run: `cd frontend && npx vitest run src/components/dashboard/CollegeSeriesStandings.test.tsx`
Expected: FAIL — Komponente existiert nicht.

- [ ] **Step 3: Komponente implementieren** (Baseline)

```tsx
import { useCollegeSeriesStandings } from '@/hooks/useCollegeSeriesStandings'
import { TrophyIcon, CrossBones, AlertTriangle } from '@/icons'

export function CollegeSeriesStandings() {
  const { rows, loading, error, reload } = useCollegeSeriesStandings()

  return (
    <section className="rounded-xl border border-navy-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
          <TrophyIcon className="h-5 w-5" />
          College Series — Tabelle (live)
        </h2>
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-navy-800 px-3 py-1.5 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-800 hover:text-white"
        >
          Aktualisieren
        </button>
      </div>

      {loading && <p className="py-8 text-center text-navy-500">Lade Tabelle…</p>}

      {error && !loading && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-navy-700">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="rounded-lg border border-navy-800 px-3 py-1.5 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-800 hover:text-white"
          >
            Erneut laden
          </button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-navy-500">
          <CrossBones className="h-8 w-8" />
          <p>Noch keine Tabellendaten.</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-200 text-left text-navy-500">
                <th className="px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">Team</th>
                <th className="px-2 py-1.5 text-right">G</th>
                <th className="px-2 py-1.5 text-right">W</th>
                <th className="px-2 py-1.5 text-right">L</th>
                <th className="px-2 py-1.5 text-right">Pct</th>
                <th className="px-2 py-1.5 text-right">RS</th>
                <th className="px-2 py-1.5 text-right">RA</th>
                <th className="px-2 py-1.5 text-right">RD</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.teamId}
                  data-own={r.isOwnTeam}
                  className={
                    r.isOwnTeam
                      ? 'border-b border-navy-100 bg-navy-800 font-semibold text-white'
                      : 'border-b border-navy-100 text-navy-900'
                  }
                >
                  <td className="px-2 py-1.5">{i + 1}</td>
                  <td className="px-2 py-1.5">{r.name}</td>
                  <td className="px-2 py-1.5 text-right">{r.games}</td>
                  <td className="px-2 py-1.5 text-right">{r.wins}</td>
                  <td className="px-2 py-1.5 text-right">{r.losses}</td>
                  <td className="px-2 py-1.5 text-right">{r.winPct.toFixed(3).replace(/^0/, '')}</td>
                  <td className="px-2 py-1.5 text-right">{r.runsScored}</td>
                  <td className="px-2 py-1.5 text-right">{r.runsAgainst}</td>
                  <td className="px-2 py-1.5 text-right">{r.runDiff > 0 ? `+${r.runDiff}` : r.runDiff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
```

> Prüfe verfügbare Navy-Farbtöne in `frontend/src/styles/index.css` (z.B. `navy-200`,
> `navy-800`); passe Klassen an die tatsächlich definierten Tokens an.

- [ ] **Step 4: Test ausführen, MUSS grün sein**

Run: `cd frontend && npx vitest run src/components/dashboard/CollegeSeriesStandings.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/CollegeSeriesStandings.tsx \
        frontend/src/components/dashboard/CollegeSeriesStandings.test.tsx
git commit -m "✨ College-Series: Standings-Tabelle (Dead-Sox-Highlight, Lade/Fehler/Leer)"
```

---

## Task 4: Einbindung in die Season-Ansicht

**Files:**
- Modify: Eltern-Komponente, die `<Standings .../>` rendert.

- [ ] **Step 1: Einbindeort finden**

Run: `cd frontend && grep -rn "<Standings" src`
→ liefert die Eltern-Ansicht (z.B. eine Season-/Dashboard-Seite).

- [ ] **Step 2: Komponente einbinden**

In der gefundenen Eltern-Ansicht importieren und an passender Stelle rendern (eigene Sektion,
klar als Live-College-Series gelabelt — getrennt von einer evtl. eigenen Standings-Tabelle):

```tsx
import { CollegeSeriesStandings } from '@/components/dashboard/CollegeSeriesStandings'
// ... im JSX, an gewünschter Position:
<CollegeSeriesStandings />
```

> Genaue Platzierung (eigener Tab vs. Sektion) in der `frontend-design`-Phase entscheiden. Die
> Komponente braucht keine Props (holt sich Daten selbst über den Hook).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/<eltern-ansicht>.tsx
git commit -m "✨ College-Series: Live-Tabelle in Season-Ansicht eingebunden"
```

---

## Task 5: Build, Lint, manuelle Verifikation

- [ ] **Step 1: Voller Frontend-Check**

Run: `cd frontend && npm run build && npm run lint && npx vitest run`
Expected: tsc + vite build ohne Fehler, ESLint clean, alle Unit-Tests grün.

- [ ] **Step 2: Lokal ansehen**

```bash
cd frontend && npx vite
```
Season-Ansicht öffnen → College-Series-Tabelle erscheint live, volle Namen, Dead-Sox-Zeile
hervorgehoben, Reihenfolge nach Pct/RD. „Aktualisieren" lädt neu.

- [ ] **Step 3: Fehlerzustand prüfen**

DevTools → Netzwerk offline schalten → „Aktualisieren" → freundliche Fehlermeldung + „Erneut
laden"-Button statt White-Screen.

---

## Hinweise (Review-Checkliste)

- Kein Backend, kein Flyway, kein Java — rein Frontend. ✓
- Fetch direkt im Frontend gegen `api.strikeout-scoring.com` (CORS `*`), anonym (kein Custom-UA). ✓
- `parseStandings` pure + getestet (Strings→Zahlen, Flatten, Sortierung, Dead-Sox-Flag). ✓
- Lade-/Fehler-/Leer-Zustände vorhanden (Live-Abhängigkeit). ✓
- Volle Team-Namen, Dead-Sox-Hervorhebung. ✓
- Keine Vermischung mit eigener `Game`/`LeagueResult`-Standings (eigenständige Ansicht). ✓
