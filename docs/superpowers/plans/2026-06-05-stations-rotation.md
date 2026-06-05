# Stationen-Rotation (Spieler-Rollen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Stationen-Lageplan um Spieler-Nummern, Rollen (aktiv/passiv) und Outfield-Rest erweitern; Pucks zeigen Icons statt Nummern.

**Architecture:** Reine Util `assignPlayers(stations, playerCount)` verteilt deterministisch Nummern auf Stations-Plätze (paired = aktiv+passiv, single bei `choiceGroup`) und füllt das Outfield mit dem Rest. `StationsDiagram` rendert Icon-Pucks + Spieler-Badges + Rollen + Outfield + die bestehende orthogonale Route. `playerCount` (Anwesende) fließt von `TrainingTodayPage` durch. Keine DB-/Backend-Änderung.

**Tech Stack:** React 19 / TypeScript / Vite / Vitest / Tailwind v4

---

## File Structure

- Create `frontend/src/components/training/stations/stationRoles.ts` — Nummern/Rollen-Verteilung (reine Logik)
- Create `frontend/src/components/training/stations/stationRoles.test.ts` — Vitest
- Modify `frontend/src/components/training/stations/deriveStations.ts` — Korken-Default-Label "Korken/Whiffle"
- Modify `frontend/src/components/training/stations/StationsDiagram.tsx` — Icon-Pucks + Badges + Outfield + `playerCount`-Prop
- Modify `frontend/src/components/training/TrainingPlanView.tsx` — `playerCount` durchreichen
- Modify `frontend/src/components/training/TrainingTodayPage.tsx` — `playerCount={presentIds.size}`

---

## Task 1: stationRoles util (TDD)

**Files:**
- Create: `frontend/src/components/training/stations/stationRoles.ts`
- Test: `frontend/src/components/training/stations/stationRoles.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/training/stations/stationRoles.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assignPlayers } from './stationRoles'
import { resolveStations } from './deriveStations'

describe('assignPlayers', () => {
  it('numbers default stations: odd=active, even=passive, singles for choiceGroup', () => {
    const { stations, outfield } = assignPlayers(resolveStations(null), 13)
    // Live paired
    expect(stations[0].slots).toEqual([
      { number: 1, role: 'active', roleLabel: 'schlägt' },
      { number: 2, role: 'passive', roleLabel: 'tosst' },
    ])
    // Bunt paired (3. Station)
    expect(stations[2].slots).toEqual([
      { number: 5, role: 'active', roleLabel: 'buntet' },
      { number: 6, role: 'passive', roleLabel: 'wirft' },
    ])
    // Hütchen + Tee(Besen) = single (choiceGroup gesetzt)
    expect(stations[4].slots).toEqual([{ number: 9, role: 'single', roleLabel: '' }])
    expect(stations[5].slots).toEqual([{ number: 10, role: 'single', roleLabel: '' }])
    // Rest → Outfield
    expect(outfield).toEqual([11, 12, 13])
  })

  it('returns no outfield when playerCount not given', () => {
    const { outfield } = assignPlayers(resolveStations(null))
    expect(outfield).toEqual([])
  })

  it('returns no outfield when playerCount <= assigned slots', () => {
    const { outfield } = assignPlayers(resolveStations(null), 4)
    expect(outfield).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/training/stations/stationRoles.test.ts`
Expected: FAIL — cannot find module `./stationRoles`.

- [ ] **Step 3: Implement the util**

Create `frontend/src/components/training/stations/stationRoles.ts`:

```ts
import type { StationType } from '@/types'
import type { Station } from './deriveStations'

export type SlotRole = 'active' | 'passive' | 'single'
export interface PlayerSlot { number: number; role: SlotRole; roleLabel: string }
export interface StationWithSlots extends Station { slots: PlayerSlot[] }
export interface Assignment { stations: StationWithSlots[]; outfield: number[] }

/** Rollen-Bezeichnungen je Stationstyp (aktiv = ungerade Nummer, passiv = gerade). */
const ROLE_LABELS: Record<StationType, { active: string; passive: string }> = {
  LIVE: { active: 'schlägt', passive: 'tosst' },
  TEE: { active: 'schlägt', passive: 'Hilfe' },
  BUNT: { active: 'buntet', passive: 'wirft' },
  KORKEN: { active: 'schlägt', passive: 'tosst' },
  HUETCHEN: { active: 'schlägt', passive: 'tosst' },
  OTHER: { active: 'schlägt', passive: 'tosst' },
}

/** Station mit gesetzter choiceGroup = Wahl-Combo → ein einzelner Spieler. */
const isSingle = (s: Station): boolean => s.choiceGroup != null

/**
 * Verteilt Spieler-Nummern deterministisch in Routen-Reihenfolge:
 * paired → [aktiv n, passiv n+1]; single → [n]; Rest bis playerCount → Outfield.
 */
export function assignPlayers(stations: Station[], playerCount = 0): Assignment {
  let n = 1
  const withSlots: StationWithSlots[] = stations.map(s => {
    if (isSingle(s)) {
      const slot: PlayerSlot = { number: n, role: 'single', roleLabel: '' }
      n += 1
      return { ...s, slots: [slot] }
    }
    const labels = ROLE_LABELS[s.type]
    const slots: PlayerSlot[] = [
      { number: n, role: 'active', roleLabel: labels.active },
      { number: n + 1, role: 'passive', roleLabel: labels.passive },
    ]
    n += 2
    return { ...s, slots }
  })
  const outfield: number[] = []
  for (let p = n; p <= playerCount; p += 1) outfield.push(p)
  return { stations: withSlots, outfield }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/training/stations/stationRoles.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/training/stations/stationRoles.ts frontend/src/components/training/stations/stationRoles.test.ts
git commit -m "✨ stationRoles: Spieler-Nummern + Rollen + Outfield ableiten"
```

---

## Task 2: Korken-Default-Label

**Files:**
- Modify: `frontend/src/components/training/stations/deriveStations.ts`

- [ ] **Step 1: Set the label on the Korken default**

In `frontend/src/components/training/stations/deriveStations.ts`, in `DEFAULT_STATIONS`, replace the Korken entry:

```ts
  { type: 'KORKEN', x: 0.08, y: 0.5 }, // über Bunt → 3→4 vertikal
```

with:

```ts
  { type: 'KORKEN', label: 'Korken/Whiffle', x: 0.08, y: 0.5 }, // über Bunt → 3→4 vertikal
```

- [ ] **Step 2: Verify typecheck**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/training/stations/deriveStations.ts
git commit -m "💄 Korken-Station Default-Label 'Korken/Whiffle'"
```

---

## Task 3: StationsDiagram — Icon-Pucks + Spieler-Badges + Outfield

**Files:**
- Modify: `frontend/src/components/training/stations/StationsDiagram.tsx`

Der Puck zeigt jetzt das Typ-Icon (statt Rotationsnummer). Daneben kleine Spieler-Badges (aktiv = rot gefüllt, passiv = Outline, single = navy). Im Vollbild zusätzlich Rollen-Zeile. Outfield-Rest als Cluster in der Feldmitte. Neuer Prop `playerCount`.

- [ ] **Step 1: Replace the full component**

Overwrite `frontend/src/components/training/stations/StationsDiagram.tsx` with:

```tsx
import { useRef, useState } from 'react'
import type { Station } from './deriveStations'
import { STATION_META } from './stationMeta'
import { assignPlayers } from './stationRoles'

interface Props {
  stations: Station[]
  size?: 'mini' | 'full'
  /** Anzahl anwesender Spieler — Rest nach Stationsplätzen landet im Outfield. */
  playerCount?: number
  /** Wenn true, sind die Marker per Drag verschiebbar. */
  editable?: boolean
  /** Callback beim Verschieben: neue normalisierte Position (0..1). */
  onMove?: (index: number, x: number, y: number) => void
}

// Feld-Koordinatensystem (Lageplan). Home-Plate unten-links, Foul-Linien = die Ecke.
const VB_W = 360
const VB_H = 300
const HOME = { x: 30, y: 262 }
const AREA = { x0: 82, x1: 312, y0: 52, y1: 212 } // Stationen-Bereich (entspricht 0..1)

const toSvg = (nx: number, ny: number) => ({
  x: AREA.x0 + nx * (AREA.x1 - AREA.x0),
  y: AREA.y0 + ny * (AREA.y1 - AREA.y0),
})
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function StationsDiagram({ stations, size = 'mini', playerCount = 0, editable = false, onMove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  if (stations.length === 0) return null
  const full = size === 'full'

  const puckR = full ? 17 : 14
  const iconSize = full ? 18 : 15
  const labelSize = full ? 11 : 9
  const badgeR = full ? 9 : 7
  const badgeFont = full ? 11 : 9

  const { stations: withSlots, outfield } = assignPlayers(stations, playerCount)
  const pts = stations.map(s => toSvg(s.x, s.y))

  // Choice-Gruppen für "WÄHLE 1"-Rahmen
  const groups = new Map<number, number[]>()
  stations.forEach((s, i) => {
    if (s.choiceGroup != null) {
      const arr = groups.get(s.choiceGroup) ?? []
      arr.push(i)
      groups.set(s.choiceGroup, arr)
    }
  })

  const eventToNorm = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * VB_W
    const vy = ((e.clientY - rect.top) / rect.height) * VB_H
    return {
      x: clamp01((vx - AREA.x0) / (AREA.x1 - AREA.x0)),
      y: clamp01((vy - AREA.y0) / (AREA.y1 - AREA.y0)),
    }
  }

  // Badge: kleine nummerierte Scheibe; aktiv = rot, passiv = outline, single = navy
  const Badge = ({ x, y, n, role }: { x: number; y: number; n: number; role: 'active' | 'passive' | 'single' }) => (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={x} cy={y} r={badgeR}
        fill={role === 'active' ? '#e23b32' : role === 'single' ? '#234a86' : '#13284a'}
        stroke={role === 'passive' ? '#9fb3d1' : '#f4ecd8'} strokeWidth={role === 'passive' ? 1.5 : 2} />
      <text x={x} y={y + badgeFont * 0.34} textAnchor="middle" fill="#f4ecd8" fontSize={badgeFont} fontWeight={800}
        style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</text>
    </g>
  )

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ background: 'radial-gradient(120% 90% at 15% 0%, #16305c 0%, transparent 55%), linear-gradient(135deg,#13284a,#0d1b34)' }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto block"
        style={{ touchAction: editable ? 'none' : undefined }}
        onPointerMove={e => { if (dragIdx != null && onMove) { const n = eventToNorm(e); if (n) onMove(dragIdx, n.x, n.y) } }}
        onPointerUp={() => setDragIdx(null)}
        onPointerLeave={() => setDragIdx(null)}
      >
        <defs>
          <marker id="leitfaden-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#e23b32" />
          </marker>
        </defs>

        {/* Feld: Foul-Linien (die Ecke) + Home-Plate */}
        <path d={`M${HOME.x} ${HOME.y} L${HOME.x} 30`} stroke="rgba(244,236,216,.45)" strokeWidth={4} strokeLinecap="round" fill="none" />
        <path d={`M${HOME.x} ${HOME.y} L${VB_W - 18} ${HOME.y}`} stroke="rgba(244,236,216,.45)" strokeWidth={4} strokeLinecap="round" fill="none" />
        <path d={`M${HOME.x - 7} ${HOME.y} l14 0 0 -8 -7 -7 -7 7 z`} fill="#f4ecd8" />

        {/* Roter Leitfaden — orthogonale Rotations-Route mit Pfeilen */}
        {pts.slice(1).map((p, i) => {
          const a = pts[i]
          const eps = 1.5
          const aligned = Math.abs(a.x - p.x) < eps || Math.abs(a.y - p.y) < eps
          const d = aligned ? `M${a.x} ${a.y} L${p.x} ${p.y}` : `M${a.x} ${a.y} L${p.x} ${a.y} L${p.x} ${p.y}`
          return (
            <path key={`route-${i}`} d={d} fill="none"
              stroke="#e23b32" strokeWidth={full ? 3 : 2.5} strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round"
              markerEnd="url(#leitfaden-arrow)" opacity={0.9} />
          )
        })}

        {/* WÄHLE-1-Rahmen */}
        {[...groups.values()].filter(idxs => idxs.length > 1).map((idxs, gi) => {
          const xs = idxs.map(i => pts[i].x)
          const ys = idxs.map(i => pts[i].y)
          const pad = puckR + (full ? 20 : 15)
          const x = Math.min(...xs) - pad
          const y = Math.min(...ys) - pad
          const w = Math.max(...xs) - Math.min(...xs) + pad * 2
          const h = Math.max(...ys) - Math.min(...ys) + pad * 2
          return (
            <g key={`choice-${gi}`}>
              <rect x={x} y={y} width={w} height={h} rx={12} fill="rgba(231,185,74,.08)" stroke="#e7b94a" strokeWidth={1.5} strokeDasharray="7 6" />
              <text x={x + w / 2} y={y - 4} textAnchor="middle" fill="#e7b94a" fontSize={labelSize} fontWeight={700} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Wähle 1</text>
            </g>
          )
        })}

        {/* Outfield-Cluster (Rest der Spieler) */}
        {outfield.length > 0 && (() => {
          const cx = AREA.x0 + 0.62 * (AREA.x1 - AREA.x0)
          const cy = AREA.y0 + 0.5 * (AREA.y1 - AREA.y0)
          const gap = badgeR * 2 + 4
          const perRow = Math.min(4, outfield.length)
          return (
            <g style={{ pointerEvents: 'none' }}>
              <text x={cx} y={cy - badgeR - 6} textAnchor="middle" fill="#9fb3d1" fontSize={labelSize} fontWeight={700} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Outfield</text>
              {outfield.map((num, i) => {
                const row = Math.floor(i / perRow)
                const colCount = Math.min(perRow, outfield.length - row * perRow)
                const col = i % perRow
                const bx = cx + (col - (colCount - 1) / 2) * gap
                const by = cy + row * gap
                return <Badge key={num} x={bx} y={by} n={num} role="single" />
              })}
            </g>
          )
        })()}

        {/* Stationen-Marker (Icon-Puck + Spieler-Badges + Rollen) */}
        {withSlots.map((st, i) => {
          const meta = STATION_META[st.type]
          const Icon = meta.Icon
          const { x, y } = pts[i]
          const fill = meta.accent ? '#e23b32' : '#234a86'
          return (
            <g key={i} style={{ cursor: editable ? 'move' : 'default' }}
              onPointerDown={editable ? e => { (e.target as Element).setPointerCapture?.(e.pointerId); setDragIdx(i) } : undefined}>
              {st.type === 'LIVE' ? (
                <rect x={x - puckR} y={y - puckR} width={puckR * 2} height={puckR * 2} rx={4}
                  transform={`rotate(45 ${x} ${y})`} fill={fill} stroke="#f4ecd8" strokeWidth={2.5} />
              ) : (
                <circle cx={x} cy={y} r={puckR} fill={fill} stroke="#f4ecd8" strokeWidth={2.5} />
              )}
              {/* Typ-Icon im Puck */}
              <g transform={`translate(${x - iconSize / 2} ${y - iconSize / 2})`} style={{ pointerEvents: 'none' }}>
                <Icon size={iconSize} className="text-cream-50" />
              </g>
              {/* Spieler-Badges überm Puck */}
              {st.slots.length === 1 ? (
                <Badge x={x} y={y - puckR - badgeR - 1} n={st.slots[0].number} role="single" />
              ) : (
                <>
                  <Badge x={x - puckR + 1} y={y - puckR - badgeR + 2} n={st.slots[0].number} role="active" />
                  <Badge x={x + puckR - 1} y={y - puckR - badgeR + 2} n={st.slots[1].number} role="passive" />
                </>
              )}
              {/* Stationsname */}
              <text x={x} y={y + puckR + labelSize + 3} textAnchor="middle" fill="#f4ecd8" fontSize={labelSize} fontWeight={700} style={{ pointerEvents: 'none' }}>{st.label}</text>
              {/* Rollen-Zeile (nur Vollbild, nur paired) */}
              {full && st.slots.length === 2 && (
                <text x={x} y={y + puckR + labelSize * 2 + 4} textAnchor="middle" fill="#9fb3d1" fontSize={labelSize - 1} fontWeight={600} style={{ pointerEvents: 'none' }}>
                  {st.slots[0].number} {st.slots[0].roleLabel} · {st.slots[1].number} {st.slots[1].roleLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/training/stations/StationsDiagram.tsx
git commit -m "✨ StationsDiagram: Icon-Pucks + Spieler-Badges (aktiv/passiv) + Outfield"
```

---

## Task 4: TrainingPlanView — playerCount durchreichen

**Files:**
- Modify: `frontend/src/components/training/TrainingPlanView.tsx`

- [ ] **Step 1: Add the prop to the Props type**

In `frontend/src/components/training/TrainingPlanView.tsx`, in the `Props` type (search `type Props = {`), add after the `onSaveStations?...` line:

```tsx
  playerCount?: number
```

- [ ] **Step 2: Destructure it**

In the component signature `export function TrainingPlanView({ ... }: Props)`, add `playerCount` to the destructured params (e.g. right after `onSaveStations`).

- [ ] **Step 3: Pass to the mini diagram**

Find `<StationsDiagram stations={stations} size="mini" />` and replace with:

```tsx
                <StationsDiagram stations={stations} size="mini" playerCount={playerCount} />
```

- [ ] **Step 4: Pass to the fullscreen diagram**

Find the fullscreen `<StationsDiagram ... size="full" editable={...} onMove={...} />` and add `playerCount={playerCount}`:

```tsx
            <StationsDiagram
              stations={toDiagramStations(arrangeDraft)}
              size="full"
              playerCount={playerCount}
              editable={!!onSaveStations}
              onMove={(idx, x, y) => setArrangeDraft(prev => prev.map((s, i) => i === idx ? { ...s, x, y } : s))}
            />
```

- [ ] **Step 5: Verify typecheck**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/training/TrainingPlanView.tsx
git commit -m "✨ TrainingPlanView: playerCount an Stationen-Diagramm"
```

---

## Task 5: TrainingTodayPage — Anwesende übergeben

**Files:**
- Modify: `frontend/src/components/training/TrainingTodayPage.tsx`

- [ ] **Step 1: Pass presentIds.size**

In `frontend/src/components/training/TrainingTodayPage.tsx`, find the `<TrainingPlanView` usage (around line 379). Add the prop (e.g. directly after the opening tag, alongside the existing props):

```tsx
              playerCount={presentIds.size}
```

(`presentIds` is already computed in this file as a `useMemo` of present player IDs.)

- [ ] **Step 2: Verify typecheck + build**

Run: `cd frontend && npx tsc -b && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/training/TrainingTodayPage.tsx
git commit -m "✨ TrainingTodayPage: Anwesenden-Anzahl an Plan-View (Outfield)"
```

---

## Task 6: Full verification

- [ ] **Step 1: tests + lint + build**

Run:
```bash
cd frontend && npx vitest run && npm run lint && npm run build
```
Expected: all vitest pass (incl. `stationRoles.test.ts` + `deriveStations.test.ts`), lint 0 errors, build succeeds.

- [ ] **Step 2: Visual smoke (temp preview)**

Temporär eine Route `/stations-preview` in `frontend/src/App.tsx` auf eine Komponente legen, die `<StationsDiagram stations={resolveStations(null)} size="full" playerCount={13} />` rendert; `npx vite` starten; per Browser Desktop (1100px) + Mobile (390px) ansehen: Icon-Pucks, Badges (aktiv rot 1/3/5/7, passiv outline 2/4/6/8), single 9/10, Outfield 11–13, orthogonale Route. Danach Route + Preview-Komponente wieder entfernen (nicht committen).

- [ ] **Step 3: Final commit (falls Smoke Anpassungen brachte)**

```bash
git add -A && git commit -m "💄 Stationen-Rotation: Feinschliff nach Smoke-Test"
```

---

## Notes for the implementer

- **Keine DB-/Backend-Änderung.** Alles abgeleitet aus `stations` + `playerCount`.
- **Nummerierung:** ungerade = aktiv, gerade = passiv — ergibt sich aus paired-Stationen am Anfang (Live/Tee/Bunt/Korken) gefolgt von singles. `assignPlayers` vergibt pro Paar `[aktiv n, passiv n+1]`.
- **single** = Station mit `choiceGroup != null` (Wahl-Combo Hütchen/Tee-Besen).
- **Tailwind v4:** Diagramm nutzt Inline-`style` für Board-Farben (board-spezifisch, keine Tokens) — beibehalten.
- Drag&Drop im Vollbild + `editable`/`onMove` unverändert lassen.
```
