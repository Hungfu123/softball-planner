# Lineup-Row Player-Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tap/Click auf Player-Name in einer Lineup-Row öffnet ein Sheet zum Person-Tausch (Pool-Replace oder Lineup-Lineup-Swap), analog zum bestehenden Field-Position-Sheet.

**Architecture:** Frontend-only. Neuer `LineupRowSwapSheet` (Reuse `ResponsiveSheet`). Zwei neue Hook-Funktionen in `useLineup` (`replacePlayer`, `swapEntries`). `LineupRow` bekommt Name-Tap-Trigger + Hover/Static-Swap-Icon. Backend (`POST /api/games/{id}/lineup`) unverändert — derselbe Save-Pfad wie bei DnD.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, @dnd-kit (bestehend), Vitest + Testing-Library.

**Spec:** `docs/superpowers/specs/2026-05-20-lineup-row-swap-design.md`

---

## File Structure

**Create:**
- `frontend/src/components/planner/LineupRowSwapSheet.tsx` — Sheet mit Lineup- + Pool-Sektion
- `frontend/src/hooks/useLineup.swap.test.ts` — Vitest unit-tests für `replacePlayer` + `swapEntries`

**Modify:**
- `frontend/src/icons/index.tsx` — Export `ArrowsSwap` Icon
- `frontend/src/hooks/useLineup.ts` — Add `replacePlayer` + `swapEntries` + export
- `frontend/src/components/planner/LineupRow.tsx` — Klickbarer Name-Bereich + Swap-Icon + neue Prop
- `frontend/src/components/planner/LineupEditor.tsx` — Sheet-State + Render + neue Props
- `frontend/src/components/planner/GameDayPlanner.tsx` — Hook-Funktionen durchreichen

---

### Task 1: Add ArrowsSwap Icon

**Files:**
- Modify: `frontend/src/icons/index.tsx`

- [ ] **Step 1: Add Lucide import + export**

Open `frontend/src/icons/index.tsx`. Find the existing Lucide import block (around lines 1–40). Add `ArrowLeftRight` to the imports (alphabetical order doesn't matter — match existing style).

Existing import block ends with imports like `Frown`, `Send`, etc. Add `ArrowLeftRight as LucideArrowLeftRight` next to those.

Then add the export below the existing single-line exports (around line 66):

```tsx
export const ArrowsSwap = (p: IconProps) => <LucideArrowLeftRight size={p.size ?? 16} className={p.className} />
```

- [ ] **Step 2: Verify build**

Run from `frontend/`:
```bash
npm run build
```
Expected: PASS (typecheck + Vite build).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/icons/index.tsx
git -c commit.gpgsign=false commit -m "✨ Icon: ArrowsSwap (für Lineup-Row Swap)"
```

---

### Task 2: useLineup — `replacePlayer` + `swapEntries`

**Files:**
- Modify: `frontend/src/hooks/useLineup.ts`
- Create: `frontend/src/hooks/useLineup.swap.test.ts`

- [ ] **Step 1: Write failing test**

Create `frontend/src/hooks/useLineup.swap.test.ts`:

```tsx
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLineup } from './useLineup'
import type { Player } from '@/types'

const mkPlayer = (id: number, name: string): Player => ({
  id,
  name,
  defaultBattingOrder: null,
  defaultPosition: null,
})

describe('useLineup — swap operations', () => {
  it('replacePlayer keeps position + dh annotation, swaps only the person', () => {
    const { result } = renderHook(() => useLineup())
    const alice = mkPlayer(1, 'Alice')
    const bob = mkPlayer(2, 'Bob')      // DH-Batter
    const dave = mkPlayer(4, 'Dave')    // pool replacement

    act(() => {
      result.current.addPlayer(alice)
    })
    act(() => {
      result.current.setPosition(1, 'SS')
      result.current.setDhBatter(1, bob)
    })
    // sanity check
    expect(result.current.entries[0].position).toBe('SS')
    expect(result.current.entries[0].dhBatterId).toBe(2)

    act(() => {
      result.current.replacePlayer(1, dave) // pool-replace alice with dave
    })

    const e = result.current.entries[0]
    expect(e.player.id).toBe(4)        // dave replaced alice
    expect(e.position).toBe('SS')      // position preserved
    expect(e.dhBatterId).toBe(2)       // dh annotation preserved (bob still DH)
  })

  it('replacePlayer clears DH annotation if new player was a DH-batter elsewhere', () => {
    const { result } = renderHook(() => useLineup())
    const alice = mkPlayer(1, 'Alice')
    const bob = mkPlayer(2, 'Bob')
    const charlie = mkPlayer(3, 'Charlie') // currently DH-Batter for Alice

    act(() => {
      result.current.addPlayer(alice)
      result.current.addPlayer(bob)
    })
    act(() => {
      result.current.setPosition(1, 'SS')
      result.current.setPosition(2, '2B')
      result.current.setDhBatter(1, charlie) // charlie is alice's DH-batter
    })

    // Replace bob (row 1) with charlie — charlie was alice's DH-batter, that must clear
    act(() => {
      result.current.replacePlayer(2, charlie)
    })
    expect(result.current.entries[1].player.id).toBe(3) // bob replaced by charlie
    expect(result.current.entries[0].dhBatterId).toBeNull() // alice's DH cleared
  })

  it('swapEntries swaps two entries in place (true swap, not move)', () => {
    const { result } = renderHook(() => useLineup())
    const a = mkPlayer(1, 'A')
    const b = mkPlayer(2, 'B')
    const c = mkPlayer(3, 'C')
    const d = mkPlayer(4, 'D')

    act(() => {
      result.current.addPlayer(a)
      result.current.addPlayer(b)
      result.current.addPlayer(c)
      result.current.addPlayer(d)
    })
    act(() => {
      result.current.setPosition(1, 'SS')
      result.current.setPosition(2, '2B')
      result.current.setPosition(3, '1B')
      result.current.setPosition(4, 'CF')
    })

    act(() => {
      result.current.swapEntries(1, 4) // swap A (idx 0) ↔ D (idx 3)
    })

    const ids = result.current.entries.map(e => e.player.id)
    expect(ids).toEqual([4, 2, 3, 1])
    // Positions move with the player
    expect(result.current.entries[0].position).toBe('CF') // D kept CF, now at idx 0
    expect(result.current.entries[3].position).toBe('SS') // A kept SS, now at idx 3
  })

  it('swapEntries with unknown id is a no-op', () => {
    const { result } = renderHook(() => useLineup())
    const a = mkPlayer(1, 'A')
    const b = mkPlayer(2, 'B')
    act(() => {
      result.current.addPlayer(a)
      result.current.addPlayer(b)
    })

    act(() => {
      result.current.swapEntries(1, 999)
    })
    expect(result.current.entries.map(e => e.player.id)).toEqual([1, 2])
  })

  it('replacePlayer with unknown row id is a no-op', () => {
    const { result } = renderHook(() => useLineup())
    const a = mkPlayer(1, 'A')
    const x = mkPlayer(99, 'X')
    act(() => { result.current.addPlayer(a) })
    act(() => { result.current.replacePlayer(999, x) })
    expect(result.current.entries[0].player.id).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/hooks/useLineup.swap.test.ts
```
Expected: FAIL — `result.current.replacePlayer is not a function` (or similar).

- [ ] **Step 3: Implement `replacePlayer` and `swapEntries`**

Open `frontend/src/hooks/useLineup.ts`. After the `reorder` definition (around line 149), add:

```tsx
const replacePlayer = useCallback((rowPlayerId: number, newPlayer: Player) => {
  setEntries(prev => {
    const idx = prev.findIndex(e => e.player.id === rowPlayerId)
    if (idx < 0) return prev
    // If newPlayer is currently the DH-batter on some other row, clear that DH annotation
    // (DH-batter must be a bench player).
    const cleared = prev.map(e =>
      e.dhBatterId === newPlayer.id ? { ...e, dhBatterId: null, dhBatterName: null } : e
    )
    const updated = [...cleared]
    updated[idx] = { ...updated[idx], player: newPlayer }
    return updated
  })
}, [])

const swapEntries = useCallback((idA: number, idB: number) => {
  setEntries(prev => {
    const ia = prev.findIndex(e => e.player.id === idA)
    const ib = prev.findIndex(e => e.player.id === idB)
    if (ia < 0 || ib < 0 || ia === ib) return prev
    const next = [...prev]
    ;[next[ia], next[ib]] = [next[ib], next[ia]]
    return next
  })
}, [])
```

Then find the `return` statement of `useLineup` (near end of file) and add `replacePlayer` and `swapEntries` to the returned object.

Example of the existing return shape (search for `return {`):

```tsx
return {
  entries, savedEntries, substitutions, savedSubstitutions, saving,
  load, addPlayer, removePlayer, setPosition, setDhBatter,
  moveUp, moveDown, reorder,
  replacePlayer, swapEntries,                       // ← add these
  addSubstitution, removeSubstitution, save, hasChanges, /* … */
}
```

(Keep exact existing keys — only add the two new ones.)

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/hooks/useLineup.swap.test.ts
```
Expected: PASS (all 5 tests).

- [ ] **Step 5: Run full vitest to confirm no regressions**

```bash
cd frontend && npm test
```
Expected: PASS (alle bisherigen + die 5 neuen).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useLineup.ts frontend/src/hooks/useLineup.swap.test.ts
git -c commit.gpgsign=false commit -m "✨ useLineup: replacePlayer + swapEntries für Row-Swap"
```

---

### Task 3: LineupRowSwapSheet Component

**Files:**
- Create: `frontend/src/components/planner/LineupRowSwapSheet.tsx`

- [ ] **Step 1: Create component**

Create `frontend/src/components/planner/LineupRowSwapSheet.tsx`:

```tsx
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { Player, LocalLineupEntry } from '@/types'

interface Props {
  open: boolean
  row: LocalLineupEntry | null
  rowIndex: number | null
  entries: LocalLineupEntry[]
  poolPlayers: Player[]
  onSwapWithPool: (rowPlayerId: number, poolPlayer: Player) => void
  onSwapWithLineup: (rowPlayerId: number, otherRowPlayerId: number) => void
  onClose: () => void
}

export function LineupRowSwapSheet({
  open, row, rowIndex, entries, poolPlayers,
  onSwapWithPool, onSwapWithLineup, onClose,
}: Props) {
  if (!row || rowIndex === null) return null

  // Other lineup entries (not the current row)
  const others = entries.filter(e => e.player.id !== row.player.id)

  // Pool excluding any player who is currently a DH-batter on another row
  // (DH-batter must be a bench player — swapping them onto a field row would break that invariant)
  const activeDhBatterIds = new Set(
    entries
      .filter(e => e.dhBatterId !== null && e.dhBatterId !== row.player.id)
      .map(e => e.dhBatterId as number)
  )
  const pickablePool = poolPlayers.filter(p => !activeDhBatterIds.has(p.id))

  const handleLineupPick = (otherId: number) => {
    onSwapWithLineup(row.player.id, otherId)
    onClose()
  }
  const handlePoolPick = (p: Player) => {
    onSwapWithPool(row.player.id, p)
    onClose()
  }

  return (
    <ResponsiveSheet
      open={open}
      onClose={onClose}
      title={`Spieler tauschen`}
      maxWidth="md"
      footer={
        <button
          onClick={onClose}
          className="h-11 w-full rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-bold cursor-pointer"
        >
          Abbrechen
        </button>
      }
    >
      <div className="px-4 py-4 space-y-4">
        {/* Current row */}
        <div className="bg-navy-50 border border-navy-200 rounded-lg p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-0.5">
            Aktuell #{rowIndex + 1}
          </div>
          <div className="font-display text-base font-extrabold text-navy-900 flex items-center gap-2">
            <span>{row.player.name}</span>
            {row.position && (
              <span className="text-xs font-bold text-softball-red-600">{row.position}</span>
            )}
          </div>
        </div>

        {/* Lineup → Lineup swap */}
        {others.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-2">
              Mit Lineup tauschen (Plätze tauschen)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {others.map((e, i) => {
                const idxInLineup = entries.findIndex(x => x.player.id === e.player.id)
                return (
                  <button
                    key={e.player.id}
                    onClick={() => handleLineupPick(e.player.id)}
                    className="h-11 rounded-lg border border-cream-300 bg-white text-navy-800 text-sm font-semibold hover:border-navy-400 hover:bg-cream-100 cursor-pointer text-left px-3 truncate flex items-center justify-between gap-2"
                  >
                    <span className="truncate">
                      <span className="text-gray-400 font-bold tabular-nums mr-1.5">#{idxInLineup + 1}</span>
                      {e.player.name}
                    </span>
                    {e.position && (
                      <span className="text-[10px] font-bold text-softball-red-600 shrink-0">{e.position}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Pool replace */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-2">
            Aus Pool ersetzen ({pickablePool.length})
          </div>
          {pickablePool.length === 0 ? (
            <p className="text-sm text-navy-500 italic">Keine verfügbaren Spieler.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {pickablePool.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePoolPick(p)}
                  className="h-11 rounded-lg border border-cream-300 bg-white text-navy-800 text-sm font-semibold hover:border-softball-red-400 hover:bg-softball-red-50 cursor-pointer text-left px-3 truncate"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsiveSheet>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/planner/LineupRowSwapSheet.tsx
git -c commit.gpgsign=false commit -m "✨ LineupRowSwapSheet: Pool-Replace + Lineup-Swap Picker"
```

---

### Task 4: LineupRow — Name-Tap Trigger

**Files:**
- Modify: `frontend/src/components/planner/LineupRow.tsx`

- [ ] **Step 1: Add new prop + clickable name**

Open `frontend/src/components/planner/LineupRow.tsx`.

Add to imports (replace existing icon import line):
```tsx
import { GripHandle, ChevronUp, ChevronDown, XMark, ArrowsSwap } from '@/icons'
```

Add to `Props` interface (after `onMoveDown`):
```tsx
onOpenSwap: (entry: LocalLineupEntry) => void
```

Add `onOpenSwap` to the destructured props in the function signature:
```tsx
export function LineupRow({
  entry, index, isFirst, isLast, availablePositions,
  isFieldPosition, canCheckDh, poolPlayers,
  onRemove, onSetPosition, onSetDhBatter, onMoveUp, onMoveDown, onOpenSwap,
}: Props) {
```

Replace the existing Name span (around line 72):
```tsx
{/* Name */}
<span className="flex-1 text-sm font-medium text-gray-900 truncate min-w-0">
  {entry.player.name}
</span>
```

with:

```tsx
{/* Name — Tap/Click öffnet Swap-Sheet */}
<button
  type="button"
  onClick={() => onOpenSwap(entry)}
  className="flex-1 min-w-0 flex items-center gap-1.5 text-left text-sm font-medium text-gray-900 px-1.5 py-1 -mx-1.5 -my-1 rounded hover:bg-cream-100 cursor-pointer group/swap"
  title="Spieler tauschen"
>
  <span className="truncate">{entry.player.name}</span>
  <ArrowsSwap
    size={12}
    className="shrink-0 text-gray-300 sm:opacity-0 sm:group-hover/swap:opacity-100 sm:group-hover/swap:text-navy-600 transition-opacity"
  />
</button>
```

(Mobile: Icon static at `text-gray-300`. Desktop ≥sm: `opacity-0` default, fades in on hover with darker color.)

- [ ] **Step 2: Verify typecheck**

```bash
cd frontend && npm run build
```
Expected: FAIL — TypeScript complains `onOpenSwap` is missing where `LineupRow` is used (in `LineupEditor.tsx`). That's expected — fixed in next task.

(Do not commit yet — Task 5 fixes the wiring.)

---

### Task 5: LineupEditor — Sheet State + Wiring

**Files:**
- Modify: `frontend/src/components/planner/LineupEditor.tsx`

- [ ] **Step 1: Add Sheet state + new props**

Open `frontend/src/components/planner/LineupEditor.tsx`.

Add imports at top:
```tsx
import { useState } from 'react'
import { LineupRowSwapSheet } from './LineupRowSwapSheet'
```

Extend `Props` interface — add after `onReorder`:
```tsx
onSwapWithPool: (rowPlayerId: number, poolPlayer: Player) => void
onSwapWithLineup: (rowPlayerId: number, otherRowPlayerId: number) => void
```

Destructure them in the function signature:
```tsx
export function LineupEditor({
  entries, poolPlayers, onRemove, onSetPosition, onSetDhBatter,
  onMoveUp, onMoveDown, onReorder, onSwapWithPool, onSwapWithLineup,
  onClear, onCopyOtherGame, onAutoGenerate, autoGenerateLoading,
}: Props) {
```

Add state at the top of the function body (after `useSensors`):
```tsx
const [swapRow, setSwapRow] = useState<LocalLineupEntry | null>(null)
const swapRowIndex = swapRow ? entries.findIndex(e => e.player.id === swapRow.player.id) : null
```

Pass `onOpenSwap` to each `<LineupRow>`. Find the existing `<LineupRow ... />` JSX and add:
```tsx
onOpenSwap={setSwapRow}
```

Render the Sheet at the end of the returned JSX, right before the closing `</div>` of the outermost wrapper:
```tsx
<LineupRowSwapSheet
  open={swapRow !== null}
  row={swapRow}
  rowIndex={swapRowIndex !== null && swapRowIndex >= 0 ? swapRowIndex : null}
  entries={entries}
  poolPlayers={poolPlayers}
  onSwapWithPool={onSwapWithPool}
  onSwapWithLineup={onSwapWithLineup}
  onClose={() => setSwapRow(null)}
/>
```

- [ ] **Step 2: Verify typecheck**

```bash
cd frontend && npm run build
```
Expected: FAIL — `LineupEditor` invocation in `GameDayPlanner.tsx` is missing the two new props. Fixed in Task 6.

---

### Task 6: GameDayPlanner — Wire Handlers

**Files:**
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx`

- [ ] **Step 1: Pass new hook props to LineupEditor**

Open `frontend/src/components/planner/GameDayPlanner.tsx`. Find the `<LineupEditor ... />` invocation (around line 609). Add two new props after `onReorder`:

```tsx
onSwapWithPool={(rowPlayerId, newPlayer) => lineup.replacePlayer(rowPlayerId, newPlayer)}
onSwapWithLineup={(rowPlayerId, otherRowPlayerId) => lineup.swapEntries(rowPlayerId, otherRowPlayerId)}
```

(Direct delegation — no extra logic needed. The hook updates local state; the existing save-pipeline picks up changes on next save.)

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```
Expected: PASS (typecheck + Vite).

- [ ] **Step 3: Run frontend tests**

```bash
cd frontend && npm test
```
Expected: PASS.

- [ ] **Step 4: Run ESLint**

```bash
cd frontend && npm run lint
```
Expected: PASS (no new warnings/errors).

- [ ] **Step 5: Commit (Task 4 + 5 + 6 together — they form one working unit)**

```bash
git add frontend/src/components/planner/LineupRow.tsx \
        frontend/src/components/planner/LineupEditor.tsx \
        frontend/src/components/planner/GameDayPlanner.tsx
git -c commit.gpgsign=false commit -m "✨ Lineup-Row: Tap auf Name öffnet Swap-Sheet (Pool + Lineup-Swap)"
```

---

### Task 7: Manual UI Verification

**Files:** none (manual test)

- [ ] **Step 1: Start backend + frontend**

Two terminals:
```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
```
```bash
cd frontend && npx vite
```

- [ ] **Step 2: Desktop browser test**

Open `http://localhost:5173`. Login (`admin` / `Deadsox123!`). Navigate to a GameDay with a lineup of at least 4 players, all with positions set, and at least 2 players in the Pool.

Verify:
- Hover über einen Player-Namen → cream-100 Background + ArrowsSwap-Icon erscheint (fade-in).
- Klick auf Namen → Sheet öffnet sich. Header zeigt "Aktuell #N" + Name + Position.
- Sektion "Mit Lineup tauschen" zeigt alle anderen Rows mit `#N` + Name + Position.
- Sektion "Aus Pool ersetzen" zeigt Pool-Spieler.
- Klick auf Lineup-Karte: beide Rows tauschen Plätze (Namen + Positionen wandern mit).
- Klick auf Pool-Karte: aktuelle Row zeigt neuen Namen, Position unverändert.
- "Save" Button speichert (Standard-Flow).

- [ ] **Step 3: Mobile browser test (DevTools Device Mode, iPhone-Größe)**

- ArrowsSwap-Icon ist persistent (low-opacity) neben Name sichtbar.
- Drag-Sort funktioniert über GripHandle (long-press 150ms).
- Tap auf Name öffnet Sheet (kein Drag-Trigger ausgelöst).
- Sheet ist Bottom-Sheet (ResponsiveSheet Mobile-Mode).
- Beide Swap-Varianten funktionieren mit Touch.

- [ ] **Step 4: DH-Edgecase**

- Setze auf Row X (Field-Position) eine DH-Annotation mit Pool-Player Z.
- Öffne Swap-Sheet auf Row Y (andere Field-Position).
- Pool-Liste darf Z **nicht** anzeigen (`pickablePool` filter).
- Lineup-Swap zwischen X und Y: DH-Annotation wandert mit Row X (also bleibt auf dem Spieler, der vorher Row X war).

- [ ] **Step 5: Final build + lint**

```bash
cd frontend && npm run build && npm run lint
```
Expected: PASS.

- [ ] **Step 6: Commit if any small adjustment needed**

If steps 2–4 reveal small fixes, commit them separately:
```bash
git -c commit.gpgsign=false commit -m "🐛 Lineup-Row Swap: <was gefixt>"
```

Otherwise: nothing to commit — implementation is complete.

---

## Notes for the implementer

- **Save-Flow:** State changes via `replacePlayer`/`swapEntries` set `entries`. The existing Save-Button (`lineup.save(gameId)`) in `GameDayPlanner` picks up the new state and sends the full lineup array to `POST /api/games/{id}/lineup`. Backend validates via `LineupValidator` — DH-Bench-Constraint, Position-Uniqueness, etc.
- **Drag-Drop unverändert:** `useSortable` an GripHandle bleibt. Name-Span ist KEIN Sortable-Target.
- **Mobile Discoverability:** Static Icon ist absichtlich `text-gray-300` (low-contrast aber sichtbar). Falls bei manuellem Test undiscoverable → eventuell `text-gray-400` und size 14.
- **No backend changes.** Keine Migration, kein Endpoint, kein Service.
