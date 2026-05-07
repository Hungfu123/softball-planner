# Spielbogen Edit Meta + Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add UI to edit Spielbogen meta (team names, date, location) and individual lineup slots (name, position, batting order) after creation.

**Architecture:** Two new modal components (`BogenMetaEditModal` + `BogenSlotEditModal`) reused across Page header (meta) and RflSheetDrawer (per-slot). Existing backend endpoints `PATCH /api/spielbogen/{id}` and `PATCH /api/spielbogen/{id}/slots/{slotId}` are already implemented in `frontend/src/api/client.ts`. Hook layer adds `updateMeta` + `updateSlot` callables that reload the sheet after success.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (custom CSS classes incl. `bg-cream-50`, `softball-red-*`), `vaul` (Drawer not needed — use static modal pattern from `ConfirmModal`).

**Spec:** `docs/superpowers/specs/2026-05-07-spielbogen-edit-meta-slots-design.md`

**Note:** API client functions `updateSpielbogen` (line 376) and `updateSpielbogenSlot` (line 410) already exist in `frontend/src/api/client.ts`. Types `CreateSpielbogenRequest` (used as `Partial<>` for meta update) and `UpdateSlotRequest` already exist in `frontend/src/types/index.ts`. No additions there.

---

## Task 1: Hook Functions `updateMeta` + `updateSlot`

**Files:**
- Modify: `frontend/src/hooks/useSpielbogenScoring.ts`

- [ ] **Step 1: Read current hook structure**

Open `frontend/src/hooks/useSpielbogenScoring.ts` and find:
- the destructured imports (look for `recordSpielbogenSubstitution`, `recordSpielbogenPositionSwap`)
- the `recordSubstitution` callback (used as pattern reference)
- the return object of the hook

- [ ] **Step 2: Add type imports**

In the existing `import type { ... } from '@/types'` block, add `CreateSpielbogenRequest`, `UpdateSlotRequest`, `SpielbogenResponse`, `SpielbogenSlotResponse`. Skip ones already imported.

- [ ] **Step 3: Add `updateMeta` callback**

Add inside the hook body (place adjacent to `recordSubstitution`):
```ts
const updateMeta = useCallback(async (req: Partial<CreateSpielbogenRequest>): Promise<SpielbogenResponse> => {
  const result = await api.updateSpielbogen(bogenId, req)
  await reload()
  return result
}, [bogenId, reload])
```

- [ ] **Step 4: Add `updateSlot` callback**

```ts
const updateSlot = useCallback(async (slotId: number, req: UpdateSlotRequest): Promise<SpielbogenSlotResponse> => {
  const result = await api.updateSpielbogenSlot(bogenId, slotId, req)
  await reload()
  return result
}, [bogenId, reload])
```

- [ ] **Step 5: Add to return object**

Find the return object of the hook and add `updateMeta` and `updateSlot` to it.

- [ ] **Step 6: Build verify**

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run build`
Expected: TypeScript clean, build succeeds.

- [ ] **Step 7: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/src/hooks/useSpielbogenScoring.ts
git commit -m "✨ Spielbogen: updateMeta + updateSlot Hook-Funktionen"
```

---

## Task 2: BogenMetaEditModal Component

**Files:**
- Create: `frontend/src/components/spielbogen/BogenMetaEditModal.tsx`

- [ ] **Step 1: Implement modal**

Create `frontend/src/components/spielbogen/BogenMetaEditModal.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { XMark } from '@/icons'
import type { SpielbogenResponse, CreateSpielbogenRequest } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  meta: SpielbogenResponse
  onSubmit: (req: Partial<CreateSpielbogenRequest>) => Promise<void>
}

export function BogenMetaEditModal({ open, onClose, meta, onSubmit }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [homeTeamName, setHomeTeamName] = useState(meta.homeTeamName)
  const [awayTeamName, setAwayTeamName] = useState(meta.awayTeamName)
  const [date, setDate] = useState(meta.date)
  const [location, setLocation] = useState(meta.location ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const trimmedHome = homeTeamName.trim()
  const trimmedAway = awayTeamName.trim()
  const canSubmit = !!trimmedHome && !!trimmedAway && !!date && !submitting
  const ligaWarning = meta.leagueResultId != null

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        homeTeamName: trimmedHome,
        awayTeamName: trimmedAway,
        date,
        location: location.trim() || null,
        seasonId: meta.season?.id ?? null,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meta-edit-title"
        className="bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-cream-300">
          <h2 id="meta-edit-title" className="text-lg font-bold text-gray-900">Spielbogen bearbeiten</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Schließen">
            <XMark size={20} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          {ligaWarning && (
            <div className="px-3 py-2 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs font-body">
              Liga-Tabelle ist bereits aktualisiert — Änderungen werden nicht zurückgespielt.
            </div>
          )}

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Heim</span>
            <input
              type="text"
              value={homeTeamName}
              onChange={e => setHomeTeamName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Gast</span>
            <input
              type="text"
              value={awayTeamName}
              onChange={e => setAwayTeamName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Datum</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Ort</span>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          {error && (
            <div className="text-softball-red-700 font-body text-sm">{error}</div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-cream-300 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-cream-200 cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Speichere…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build verify**

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run build`
Expected: TypeScript clean.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/src/components/spielbogen/BogenMetaEditModal.tsx
git commit -m "✨ Spielbogen: BogenMetaEditModal-Komponente"
```

---

## Task 3: Wire BogenMetaEditModal into SpielbogenPage Header

**Files:**
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx`

- [ ] **Step 1: Add imports**

In `SpielbogenPage.tsx` add these imports (place near other component imports):
```tsx
import { BogenMetaEditModal } from './BogenMetaEditModal'
import { Pencil } from '@/icons'
```
(Skip imports already present.)

- [ ] **Step 2: Destructure `updateMeta` from hook**

Find where `useSpielbogenScoring()` is called and add `updateMeta` to the destructured properties.

- [ ] **Step 3: Add state**

Add inside the component (place near other modal/drawer state e.g. `showSubModal`):
```tsx
const [showMetaEdit, setShowMetaEdit] = useState(false)
```

- [ ] **Step 4: Add Pencil-Button to Page header**

Locate the header that displays team names + score. The exact JSX varies — find a div containing `meta.homeTeamName` and `meta.awayTeamName` (or `sheet.meta.homeTeamName`). Add a Pencil button adjacent:
```tsx
<button
  onClick={() => setShowMetaEdit(true)}
  className="p-1 text-gray-400 hover:text-navy-700 cursor-pointer"
  aria-label="Spielbogen bearbeiten"
>
  <Pencil size={16} />
</button>
```

The button should appear inline with the team-name display so it's visually associated.

- [ ] **Step 5: Mount modal**

Add at the end of the component's JSX (place near other modal mounts e.g. `<PositionSwapDrawer ... />`):
```tsx
{sheet && (
  <BogenMetaEditModal
    open={showMetaEdit}
    onClose={() => setShowMetaEdit(false)}
    meta={sheet.meta}
    onSubmit={async (req) => {
      await updateMeta(req)
      toast.show('Spielbogen aktualisiert', 'success')
    }}
  />
)}
```
If `toast` is named differently in this file, mirror the existing pattern used by other handlers (e.g. `handleSubstitutionSubmit`).

- [ ] **Step 6: Build + lint verify**

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run build && npm run lint`
Expected: build success; lint shows only pre-existing warnings.

- [ ] **Step 7: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/src/components/spielbogen/SpielbogenPage.tsx
git commit -m "✨ Spielbogen: BogenMetaEditModal in Page-Header integriert"
```

---

## Task 4: BogenSlotEditModal Component

**Files:**
- Create: `frontend/src/components/spielbogen/BogenSlotEditModal.tsx`

- [ ] **Step 1: Implement modal**

Create `frontend/src/components/spielbogen/BogenSlotEditModal.tsx`:
```tsx
import { useState } from 'react'
import { XMark } from '@/icons'
import type { SpielbogenSlotResponse, UpdateSlotRequest } from '@/types'

const POSITION_OPTIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DH']

interface Props {
  open: boolean
  onClose: () => void
  slot: SpielbogenSlotResponse | null
  onSubmit: (slotId: number, req: UpdateSlotRequest) => Promise<void>
}

export function BogenSlotEditModal({ open, onClose, slot, onSubmit }: Props) {
  const [name, setName] = useState(slot?.name ?? '')
  const [position, setPosition] = useState<string>(slot?.position ?? '')
  const [battingOrder, setBattingOrder] = useState<number>(slot?.battingOrder ?? 1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when slot changes (modal re-opened for different slot)
  const slotId = slot?.id ?? null
  if (open && slotId != null && (name === '' && slot && slot.name !== '')) {
    setName(slot.name)
    setPosition(slot.position ?? '')
    setBattingOrder(slot.battingOrder)
  }

  if (!open || !slot) return null

  const trimmedName = name.trim()
  const canSubmit =
    !!trimmedName &&
    battingOrder >= 1 && battingOrder <= 10 &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(slot.id, {
        name: trimmedName,
        position: position || null,
        battingOrder,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-edit-title"
        className="bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-cream-300">
          <h2 id="slot-edit-title" className="text-lg font-bold text-gray-900">Slot bearbeiten</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Schließen">
            <XMark size={20} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Position</span>
            <select
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            >
              <option value="">— (keine)</option>
              {POSITION_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Batting-Order</span>
            <input
              type="number"
              min={1}
              max={10}
              value={battingOrder}
              onChange={e => setBattingOrder(Math.max(1, Math.min(10, parseInt(e.target.value || '1', 10))))}
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          {error && (
            <div className="text-softball-red-700 font-body text-sm">{error}</div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-cream-300 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-cream-200 cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Speichere…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build verify**

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run build`
Expected: TypeScript clean.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/src/components/spielbogen/BogenSlotEditModal.tsx
git commit -m "✨ Spielbogen: BogenSlotEditModal-Komponente"
```

---

## Task 5: Wire BogenSlotEditModal into RflSheetDrawer

**Files:**
- Modify: `frontend/src/components/spielbogen/RflSheetDrawer.tsx`

- [ ] **Step 1: Add imports**

In `RflSheetDrawer.tsx` add:
```tsx
import { useState } from 'react'  // (skip if already present)
import { BogenSlotEditModal } from './BogenSlotEditModal'
import { Pencil } from '@/icons'
import type { SpielbogenSlotResponse, UpdateSlotRequest } from '@/types'  // adjust to existing import block
```

- [ ] **Step 2: Add `onSlotUpdate` Prop to component**

Find the `Props` type of the main `RflSheetDrawer` component and add:
```ts
onSlotUpdate?: (slotId: number, req: UpdateSlotRequest) => Promise<void>
```

Pass this prop down through to `SideSheet` (the inner sub-component that renders the table).

In `SideSheet`'s Props type, add the same `onSlotUpdate` field.

- [ ] **Step 3: Add state for editing slot in SideSheet**

In the `SideSheet` component body (the inner one), add:
```tsx
const [editingSlot, setEditingSlot] = useState<SpielbogenSlotResponse | null>(null)
```

- [ ] **Step 4: Add Pencil column header**

In `SideSheet`'s `<thead>`, add a new `<th>` after the inning columns (or as the last column). Use:
```tsx
<th className="px-1 py-1.5 w-6" style={headerCellStyle}></th>
```

- [ ] **Step 5: Add Pencil cell per row**

In the `<tbody>` map over `sorted` slots, after the inning cells, add a new `<td>`:
```tsx
<td className="p-0 text-center align-middle" style={cellStyle}>
  {onSlotUpdate && (
    <button
      onClick={() => setEditingSlot(slot)}
      className="p-1 text-gray-400 hover:text-navy-700 cursor-pointer"
      aria-label="Slot bearbeiten"
    >
      <Pencil size={12} />
    </button>
  )}
</td>
```

- [ ] **Step 6: Mount BogenSlotEditModal**

Inside `SideSheet`, place at the end of the returned JSX (after the `</table>` and outer `</div>`):
```tsx
{onSlotUpdate && (
  <BogenSlotEditModal
    open={editingSlot != null}
    onClose={() => setEditingSlot(null)}
    slot={editingSlot}
    onSubmit={async (slotId, req) => {
      await onSlotUpdate(slotId, req)
    }}
  />
)}
```

- [ ] **Step 7: Build + lint verify**

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run build && npm run lint`
Expected: build success; lint shows only pre-existing warnings.

- [ ] **Step 8: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/src/components/spielbogen/RflSheetDrawer.tsx
git commit -m "✨ Spielbogen: BogenSlotEditModal in RflSheetDrawer integriert"
```

---

## Task 6: Pass `onSlotUpdate` from SpielbogenPage

**Files:**
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx`

- [ ] **Step 1: Destructure `updateSlot` from hook**

Find where `useSpielbogenScoring()` is called and add `updateSlot` to the destructured properties (next to `updateMeta`).

- [ ] **Step 2: Add toast wrapper handler**

Add a handler near the existing handlers (e.g., `handlePositionSwapSubmit`):
```tsx
const handleSlotUpdate = async (slotId: number, req: UpdateSlotRequest) => {
  await updateSlot(slotId, req)
  toast.show('Slot aktualisiert', 'success')
}
```

Import the type if not already in scope:
```tsx
import type { UpdateSlotRequest } from '@/types'
```

- [ ] **Step 3: Pass to RflSheetDrawer**

Find the `<RflSheetDrawer ... />` JSX and add:
```tsx
onSlotUpdate={handleSlotUpdate}
```

- [ ] **Step 4: Build + lint verify**

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run build && npm run lint`
Expected: build success; lint shows only pre-existing warnings.

- [ ] **Step 5: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/src/components/spielbogen/SpielbogenPage.tsx
git commit -m "✨ Spielbogen: handleSlotUpdate Handler in Page wiring zu RflSheetDrawer"
```

---

## Task 7: Manual E2E Verification

- [ ] **Step 1: Start dev environment**

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
# in another terminal:
cd frontend && npx vite
```

Open `http://localhost:5173`, log in.

- [ ] **Step 2: Verify Meta-Edit**

1. Open an existing Spielbogen (or create new one).
2. In the page header, click the Pencil icon next to team names.
3. Modal opens with current values pre-filled.
4. Change a team name, change date, change location.
5. Click "Speichern".
6. Toast "Spielbogen aktualisiert" appears.
7. Page reloads and shows new values.

- [ ] **Step 3: Verify Slot-Edit**

1. Open the RflSheet drawer (per current UI affordance).
2. Find the new Pencil column at the right of each row.
3. Click Pencil for any slot.
4. Modal opens with slot's current name, position, batting-order.
5. Change name (typo correction), change position dropdown.
6. Click "Speichern".
7. Toast appears, sheet reloads with new slot values.

- [ ] **Step 4: Verify validation**

1. Open Meta-Edit modal, clear "Heim" field. Submit button disabled.
2. Open Slot-Edit modal, set Batting-Order to 11. Value clamps to 10.
3. Liga-Result-Warning: register Bogen to league, then re-open Meta-Edit. Amber warning visible.

- [ ] **Step 5: Final commit + push prep**

If everything works:
```bash
git log --oneline origin/master..HEAD
```
Verify commits look right. Push only when user confirms:
```bash
git push origin master
```

---

## Self-Review Notes

Spec coverage:
- Backend endpoints already present (no plan tasks needed) — Spec confirmed.
- BogenMetaEditModal — Task 2 ✓
- BogenSlotEditModal — Task 4 ✓
- Hook `updateMeta` + `updateSlot` — Task 1 ✓
- Page Pencil + meta wiring — Task 3 ✓
- RflSheetDrawer Pencil + slot wiring — Tasks 5 + 6 ✓
- DONE/Liga-Result Warning — Task 2 (in modal body) ✓
- Validation (empty teamname, batting-order range) — Tasks 2, 4 ✓
- Manual E2E — Task 7 ✓

Type consistency:
- `Partial<CreateSpielbogenRequest>` used as MetaModal `onSubmit` arg ✓ (matches `api.updateSpielbogen` signature line 376 of `client.ts`)
- `UpdateSlotRequest` used everywhere as Slot-update DTO ✓
- `SpielbogenSlotResponse` (with `id`, `name`, `position`, `battingOrder`) used as input to Slot-Modal ✓

No placeholders detected. All steps contain concrete code or explicit commands.

Out-of-scope items from spec (Bulk-Edit, Drag-Drop, List-View Edit) explicitly NOT included in any task — confirmed.
