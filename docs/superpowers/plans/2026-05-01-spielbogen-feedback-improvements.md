# Spielbogen Feedback-Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 Spielbogen-Issues aus Real-Use-Test: ROE-Logik, FlyOut+2-Outs-Score-Bug, Smart-Default-Advance, Center-Flash-Side-Switch, Runner-Advance-Flash, SH/SF-Help-Popover.

**Architecture:** Frontend-only Pass (kein Backend-Schema-Change). Erweiterung von `computeBaseStateAdvance` um isError-Handling + Force-Default-Helper. Neue Helper-Komponente `HelpPopover` (shared). State-Erweiterung in `SpielbogenPage` für Center-Flash + Advance-Flash. Neue Prop `outs` an `OutDetailDrawer`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, motion/react (Framer Motion), Vitest, Vaul (drawer).

**Spec:** `docs/superpowers/specs/2026-05-01-spielbogen-feedback-improvements-design.md`

---

## File Structure

**Modified:**
- `frontend/src/utils/bogenBaseAdvance.ts` — `computeBaseStateAdvance` erweitern + neuer Helper `computeForceDefaults`
- `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Error-Visual, FlyOut+2-Outs-Logik, Smart-Defaults, Help-Popover-Integration, `outs`-Prop
- `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx` — neue Tests
- `frontend/src/components/spielbogen/BogenActionButtons.tsx` — `outs` durchreichen, isError → SINGLE-Advance
- `frontend/src/components/spielbogen/SpielbogenPage.tsx` — Center-Flash-Overlay (Auto-Switch), Runner-Advance-Flash, `outs` an Drawer
- `frontend/src/components/spielbogen/SpielbogenPage.test.tsx` (falls existiert) — Side-Switch-Flash-Test

**New:**
- `frontend/src/utils/bogenBaseAdvance.test.ts` — Unit-Tests für Helper-Logik
- `frontend/src/components/shared/HelpPopover.tsx` — wiederverwendbare Help-Icon + Popover-Komponente

---

## Task 1: FlyOut + 2 Outs Bugfix (kritisch — Score falsch)

**Files:**
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — neue `outs`-Prop + Logik in `handleFlyOutConfirm`
- Modify: `frontend/src/components/spielbogen/BogenActionButtons.tsx` — `outs`-Prop durchreichen
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx` — `outs` an `BogenActionButtons` übergeben
- Test: `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx`

- [ ] **Step 1: Failing test schreiben — FlyOut bei 2 Outs zählt keine Runs**

In `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx` neuen Test ergänzen:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OutDetailDrawer } from './OutDetailDrawer'
import type { BogenBaseStateDto, SpielbogenSlotResponse } from '@/types'

describe('OutDetailDrawer FlyOut + 2 Outs', () => {
  const slots: SpielbogenSlotResponse[] = [
    { id: 1, battingOrder: 1, name: 'A', playerId: null, playerName: null, dhBatterPlayerId: null, dhBatterName: null, position: 1 },
  ]
  const baseState: BogenBaseStateDto = { firstSlotId: null, secondSlotId: null, thirdSlotId: 1 }

  it('mit 2 outs + Runner3B-Tag-Up: kein Run, weil Catch das Inning beendet', async () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={baseState}
        slots={slots}
        batterSlotId={1}
        outs={2}
      />
    )
    // Tap CF (8) — outfielder triggers fly-out tag-up flow
    fireEvent.click(screen.getByLabelText('Feldposition 8 CF'))
    // Cycle runner3B from "bleibt" → "Home"
    const runnerBtn = await screen.findByText(/auf 3B/i)
    fireEvent.click(runnerBtn) // bleibt → 2B (only target options 3→3,4)
    // labelFor(3,4) is "→ Home (Run!)", cycle 3→3 then 3→? Actually fromBase=3 cycles 3→4→3
    // Single tap from 3 goes to 4 (Home)
    fireEvent.click(screen.getByText(/Bestätigen/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'OUT',
        outType: 'FLY',
        runsScored: 0,
        rbi: 0,
      })
    )
  })

  it('mit 1 out + Runner3B-Tag-Up: Run zählt (Sac Fly möglich)', async () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={baseState}
        slots={slots}
        batterSlotId={1}
        outs={1}
      />
    )
    fireEvent.click(screen.getByLabelText('Feldposition 8 CF'))
    fireEvent.click(await screen.findByText(/auf 3B/i)) // 3→4 (Home)
    fireEvent.click(screen.getByText(/Bestätigen/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'OUT',
        outType: 'FLY',
        runsScored: 1,
        rbi: 1,
      })
    )
  })
})
```

- [ ] **Step 2: Test laufen — soll fehlschlagen weil `outs`-Prop nicht existiert**

```bash
cd frontend && npx vitest run src/components/spielbogen/OutDetailDrawer.test.tsx
```

Expected: TypeScript-Fehler `outs` nicht in Props-Type, oder Test scheitert weil 2-Outs-Logik fehlt.

- [ ] **Step 3: Prop `outs` zu `OutDetailDrawer` hinzufügen + Logik anpassen**

`frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Props-Interface ergänzen:

```typescript
interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (req: Partial<SpielbogenRecordAtBatRequest>) => void
  baseStateAfter: BogenBaseStateDto | null
  slots: SpielbogenSlotResponse[]
  batterSlotId: number | null
  outs: number  // NEW: outs vor diesem AB (0/1/2)
}
```

Funktion-Signatur erweitern:

```typescript
export function OutDetailDrawer({ open, onClose, onSubmit, baseStateAfter, slots, batterSlotId, outs }: Props) {
```

`handleFlyOutConfirm` umbauen:

```typescript
const handleFlyOutConfirm = (advances: { fromBase: 1 | 2 | 3; toBase: 1 | 2 | 3 | 4 }[], isSacFly: boolean) => {
  if (pendingFlyOutRequest == null) return
  const { baseStateAfter: after, runsScored: rawRuns } = applyAdvances(baseStateAfter, advances)
  // Bei 2 Outs ist der Catch der 3rd Out → Inning beendet, Runs danach zählen nicht
  const runs = outs >= 2 ? 0 : rawRuns
  onSubmit({
    result: 'OUT',
    outType: 'FLY',
    ...(isSacFly && outs < 2 ? { sacrificeType: 'FLY' as const } : {}),
    fielderChain: [pendingFlyOutRequest.fielder],
    runsScored: runs,
    rbi: runs,
    baseStateAfter: after,
  })
  setPendingFlyOutRequest(null)
}
```

`RunnerAdvancePickerView` aufrufen mit hint bei 2-Outs:

```typescript
) : pendingFlyOutRequest != null ? (
  <RunnerAdvancePickerView
    title={`Fly Out F${pendingFlyOutRequest.fielder} — Tag Up?`}
    subtitle={
      outs >= 2
        ? 'Catch ist 3rd Out — Runs zählen nicht (Inning beendet)'
        : 'Welche Runner sind nach dem Catch weitergelaufen?'
    }
    baseState={baseState}
    slots={slots}
    onConfirm={handleFlyOutConfirm}
    onBack={() => setPendingFlyOutRequest(null)}
    showSacFlyToggle={outs < 2}
  />
```

- [ ] **Step 4: `BogenActionButtons` muss `outs` durchreichen**

`frontend/src/components/spielbogen/BogenActionButtons.tsx` — Props erweitern:

```typescript
interface Props {
  side: BogenSide
  currentSlotId: number | null
  inning: number
  baseStateAfter: BogenBaseStateDto | null
  slots: SpielbogenSlotResponse[]
  outs: number  // NEW
  disabled?: boolean
  onRecord: (req: SpielbogenRecordAtBatRequest) => Promise<void>
  onRecordStealing: (req: SpielbogenRecordStealingRequest) => Promise<void>
  onSwitchSide: () => void
  onSubstitution: () => void
  onEndGame: () => void
  canEndGame: boolean
}
```

In Funktions-Destructure ergänzen:

```typescript
export function BogenActionButtons({
  side,
  currentSlotId,
  inning,
  baseStateAfter,
  slots,
  outs,
  disabled,
  ...
```

`<OutDetailDrawer>` Aufruf-Stelle erweitern:

```typescript
<OutDetailDrawer
  open={showOutDrawer}
  onClose={() => setShowOutDrawer(false)}
  onSubmit={handleOutSubmit}
  baseStateAfter={baseStateAfter}
  slots={slots}
  batterSlotId={currentSlotId}
  outs={outs}
/>
```

- [ ] **Step 5: `SpielbogenPage` übergibt `outs` an `BogenActionButtons`**

`frontend/src/components/spielbogen/SpielbogenPage.tsx` — `<BogenActionButtons>` Aufruf erweitern (around line 538):

```typescript
<BogenActionButtons
  side={currentSide}
  currentSlotId={currentSlot?.id ?? null}
  inning={meta.currentInning}
  baseStateAfter={displayBaseState}
  slots={slots}
  outs={outs}
  disabled={submitting}
  onRecord={handleRecord}
  onRecordStealing={recordStealing}
  onSwitchSide={handleSideToggleClick}
  onSubstitution={() => {
    setSubSlotId(currentSlot?.id ?? null)
    setShowSubModal(true)
  }}
  onEndGame={() => setShowEndConfirm(true)}
  canEndGame={isLive}
/>
```

- [ ] **Step 6: Tests laufen + grün**

```bash
cd frontend && npx vitest run src/components/spielbogen/OutDetailDrawer.test.tsx
```

Expected: alle Tests PASS.

- [ ] **Step 7: Build + Typecheck**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/spielbogen/OutDetailDrawer.tsx frontend/src/components/spielbogen/OutDetailDrawer.test.tsx frontend/src/components/spielbogen/BogenActionButtons.tsx frontend/src/components/spielbogen/SpielbogenPage.tsx
git commit -m "🐛 Spielbogen: FlyOut bei 2 Outs zählt keine Runs (3rd Out beendet Inning)"
```

---

## Task 2: Error/ROE-Fix — Batter erreicht 1B safe

**Files:**
- Modify: `frontend/src/utils/bogenBaseAdvance.ts` — `computeBaseStateAdvance` erweitern um `isError`-Param
- Create: `frontend/src/utils/bogenBaseAdvance.test.ts` (falls noch nicht existiert)
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Error-Visual + Logik
- Modify: `frontend/src/components/spielbogen/BogenActionButtons.tsx` — `isError` durchreichen
- Test: `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx`

- [ ] **Step 1: Test für `computeBaseStateAdvance` mit isError schreiben**

Neue Datei `frontend/src/utils/bogenBaseAdvance.test.ts` (oder erweitern falls existiert):

```typescript
import { describe, it, expect } from 'vitest'
import { computeBaseStateAdvance } from './bogenBaseAdvance'

describe('computeBaseStateAdvance — isError (ROE)', () => {
  it('Error mit leeren Bases: Batter zu 1B', () => {
    const r = computeBaseStateAdvance({
      before: { firstSlotId: null, secondSlotId: null, thirdSlotId: null },
      result: 'OUT',
      isError: true,
      batterSlotId: 42,
    })
    expect(r.baseStateAfter).toEqual({ firstSlotId: 42, secondSlotId: null, thirdSlotId: null })
    expect(r.runsScored).toBe(0)
  })

  it('Error mit Runner1B: Runner zu 2B, Batter zu 1B (wie Single)', () => {
    const r = computeBaseStateAdvance({
      before: { firstSlotId: 7, secondSlotId: null, thirdSlotId: null },
      result: 'OUT',
      isError: true,
      batterSlotId: 42,
    })
    expect(r.baseStateAfter).toEqual({ firstSlotId: 42, secondSlotId: 7, thirdSlotId: null })
    expect(r.runsScored).toBe(0)
  })

  it('Error mit Runner3B: Runner scored, Batter zu 1B', () => {
    const r = computeBaseStateAdvance({
      before: { firstSlotId: null, secondSlotId: null, thirdSlotId: 9 },
      result: 'OUT',
      isError: true,
      batterSlotId: 42,
    })
    expect(r.baseStateAfter).toEqual({ firstSlotId: 42, secondSlotId: null, thirdSlotId: null })
    expect(r.runsScored).toBe(1)
  })

  it('OUT ohne isError bleibt unverändert (Runner stays put)', () => {
    const r = computeBaseStateAdvance({
      before: { firstSlotId: 7, secondSlotId: null, thirdSlotId: null },
      result: 'OUT',
      isError: false,
      batterSlotId: 42,
    })
    expect(r.baseStateAfter).toEqual({ firstSlotId: 7, secondSlotId: null, thirdSlotId: null })
    expect(r.runsScored).toBe(0)
  })
})
```

- [ ] **Step 2: Test laufen — soll fehlschlagen**

```bash
cd frontend && npx vitest run src/utils/bogenBaseAdvance.test.ts
```

Expected: FAIL — `isError` Param nicht akzeptiert oder OUT-Branch ignoriert isError.

- [ ] **Step 3: `computeBaseStateAdvance` um isError erweitern**

`frontend/src/utils/bogenBaseAdvance.ts` — Interface + OUT-Branch ergänzen:

```typescript
import type { BogenBaseStateDto, AtBatResult, OutType } from '@/types'

interface AdvanceInput {
  before: BogenBaseStateDto | null
  result: AtBatResult
  outType?: OutType
  isError?: boolean  // NEW
  batterSlotId: number
}

interface AdvanceResult {
  baseStateAfter: BogenBaseStateDto
  runsScored: number
}

const empty = (): BogenBaseStateDto => ({ firstSlotId: null, secondSlotId: null, thirdSlotId: null })

export function computeBaseStateAdvance(input: AdvanceInput): AdvanceResult {
  const before = input.before ?? empty()
  const { firstSlotId: b1, secondSlotId: b2, thirdSlotId: b3 } = before
  const batter = input.batterSlotId

  // ROE: result=OUT + isError=true → Batter erreicht 1B wie Single
  if (input.result === 'OUT' && input.isError === true) {
    const runsScored = b3 != null ? 1 : 0
    return {
      baseStateAfter: {
        firstSlotId: batter,
        secondSlotId: b1,
        thirdSlotId: b2,
      },
      runsScored,
    }
  }

  switch (input.result) {
    // ... rest unverändert
```

Rest des Switches unverändert lassen.

- [ ] **Step 4: Test grün**

```bash
cd frontend && npx vitest run src/utils/bogenBaseAdvance.test.ts
```

Expected: PASS.

- [ ] **Step 5: `BogenActionButtons.handleOutSubmit` muss isError durchreichen**

`frontend/src/components/spielbogen/BogenActionButtons.tsx` — `handleOutSubmit` Block erweitern:

```typescript
const handleOutSubmit = async (req: Partial<SpielbogenRecordAtBatRequest>) => {
  setShowOutDrawer(false)
  if (!currentSlotId) return
  setSubmitting(true)
  try {
    let resolvedBaseState = req.baseStateAfter
    let runsScored = req.runsScored ?? 0
    let rbi = req.rbi ?? 0
    if (!resolvedBaseState) {
      const outResult = (req.result ?? 'OUT') as AtBatResult
      const advance = computeBaseStateAdvance({
        before: baseStateAfter,
        result: outResult,
        outType: req.outType,
        isError: req.isError ?? false,
        batterSlotId: currentSlotId,
      })
      resolvedBaseState = advance.baseStateAfter
      runsScored = advance.runsScored
      rbi = advance.runsScored
    }
    await onRecord({
      side,
      slotId: currentSlotId,
      inning,
      result: 'OUT',
      runsScored,
      rbi,
      baseStateAfter: resolvedBaseState,
      ...req,
    })
  } finally {
    setSubmitting(false)
  }
}
```

- [ ] **Step 6: OutDetailDrawer-Test für Error-Path**

In `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx` ergänzen:

```typescript
describe('OutDetailDrawer Error/ROE', () => {
  const slots: SpielbogenSlotResponse[] = [
    { id: 1, battingOrder: 1, name: 'A', playerId: null, playerName: null, dhBatterPlayerId: null, dhBatterName: null, position: 1 },
  ]

  it('Error E5 submit: result=OUT + isError=true + errorPosition=5, ohne baseStateAfter', () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={{ firstSlotId: null, secondSlotId: null, thirdSlotId: null }}
        slots={slots}
        batterSlotId={1}
        outs={0}
      />
    )
    // Tap 3B (5)
    fireEvent.click(screen.getByLabelText('Feldposition 5 3B'))
    // Tap "Sicher an 1B durch Fehler (E5)"
    fireEvent.click(screen.getByText(/Sicher an 1B durch Fehler \(E5\)/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'OUT',
        isError: true,
        errorPosition: 5,
      })
    )
  })
})
```

- [ ] **Step 7: OutDetailDrawer Error-Option umbenennen + Visual**

`frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Error-Option in `InfieldOptionsView` umbauen. Bestehender Block:

```typescript
{
  label: `Error E${fielder}`,
  description: 'Fehler beim Fielder',
  action: () => handleGrounderOut('GROUNDER', [], true, fielder),
},
```

Ersetzen durch (Label + Description geändert; Layout-Visualität erfolgt nachher):

```typescript
{
  label: `Sicher an 1B durch Fehler (E${fielder})`,
  description: 'Batter safe — kein Out, Fielder hat Fehler',
  action: () => handleGrounderOut('GROUNDER', [], true, fielder),
  isError: true,
},
```

`options`-Type erweitern:

```typescript
const options: Array<{ label: string; description: string; action: () => void; primary?: boolean; isError?: boolean }> = [
```

Render-Block für Buttons anpassen — visuelle Trennung + amber-Farbe für Error:

```typescript
{options.map((opt) => (
  <div key={opt.label}>
    {opt.isError && (
      <div className="flex items-center gap-2 my-2">
        <div className="flex-1 h-px bg-amber-300" />
        <span className="text-[10px] font-bold tracking-widest uppercase text-amber-700">Fehler des Fielders</span>
        <div className="flex-1 h-px bg-amber-300" />
      </div>
    )}
    <button
      onClick={opt.action}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
        opt.isError
          ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
          : opt.primary
          ? 'bg-navy-50 border-navy-300 text-navy-900 hover:bg-navy-100'
          : 'bg-white border-cream-300 text-gray-700 hover:bg-cream-100'
      }`}
    >
      <div className="text-sm font-semibold">{opt.label}</div>
      <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
    </button>
  </div>
))}
```

- [ ] **Step 8: Tests laufen — alle grün**

```bash
cd frontend && npx vitest run src/components/spielbogen/ src/utils/bogenBaseAdvance.test.ts
```

Expected: PASS.

- [ ] **Step 9: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 10: Commit**

```bash
git add frontend/src/utils/bogenBaseAdvance.ts frontend/src/utils/bogenBaseAdvance.test.ts frontend/src/components/spielbogen/OutDetailDrawer.tsx frontend/src/components/spielbogen/OutDetailDrawer.test.tsx frontend/src/components/spielbogen/BogenActionButtons.tsx
git commit -m "✨ Spielbogen: Error/ROE — Batter erreicht 1B safe statt zu verschwinden"
```

---

## Task 3: Smart-Default Runner-Advance bei Grounder

**Files:**
- Modify: `frontend/src/utils/bogenBaseAdvance.ts` — neuer Helper `computeForceDefaults`
- Modify: `frontend/src/utils/bogenBaseAdvance.test.ts`
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Picker pre-filled, autofire bei hasRunners

- [ ] **Step 1: Failing-Test für `computeForceDefaults`**

In `frontend/src/utils/bogenBaseAdvance.test.ts` ergänzen:

```typescript
import { computeForceDefaults } from './bogenBaseAdvance'

describe('computeForceDefaults', () => {
  it('Runner1B + Throw zu 1B (Force weg): default 1B → 2B', () => {
    const r = computeForceDefaults(
      { firstSlotId: 7, secondSlotId: null, thirdSlotId: null },
      1, // throw target = 1B
    )
    expect(r).toEqual({ 1: 2, 2: 2, 3: 3 })
  })

  it('Runner2B + Throw zu 1B: 2B bleibt', () => {
    const r = computeForceDefaults(
      { firstSlotId: null, secondSlotId: 8, thirdSlotId: null },
      1,
    )
    expect(r).toEqual({ 1: 1, 2: 2, 3: 3 })
  })

  it('Runner3B + Throw zu 1B: 3B bleibt', () => {
    const r = computeForceDefaults(
      { firstSlotId: null, secondSlotId: null, thirdSlotId: 9 },
      1,
    )
    expect(r).toEqual({ 1: 1, 2: 2, 3: 3 })
  })

  it('Runner1B+2B + Throw zu 1B: 1B → 2B (force weg, kann advancen)', () => {
    const r = computeForceDefaults(
      { firstSlotId: 7, secondSlotId: 8, thirdSlotId: null },
      1,
    )
    expect(r).toEqual({ 1: 2, 2: 2, 3: 3 })
  })

  it('Bases loaded + Throw zu 1B: Runner1B → 2B', () => {
    const r = computeForceDefaults(
      { firstSlotId: 7, secondSlotId: 8, thirdSlotId: 9 },
      1,
    )
    expect(r).toEqual({ 1: 2, 2: 2, 3: 3 })
  })

  it('Throw zu 2B (Force greift): 1B → 2B (forced)', () => {
    const r = computeForceDefaults(
      { firstSlotId: 7, secondSlotId: null, thirdSlotId: null },
      2,
    )
    expect(r).toEqual({ 1: 2, 2: 2, 3: 3 })
  })
})
```

- [ ] **Step 2: Test laufen — fehlschlagen**

```bash
cd frontend && npx vitest run src/utils/bogenBaseAdvance.test.ts
```

Expected: FAIL — `computeForceDefaults` existiert nicht.

- [ ] **Step 3: Helper implementieren**

In `frontend/src/utils/bogenBaseAdvance.ts` am Ende anhängen:

```typescript
/**
 * Smart-Defaults für Runner-Advance bei Grounder.
 * Logik: wenn Throw zu 1B (Batter out an 1B), Force für Runner auf 1B fällt weg → kann zu 2B.
 * Andere Bases: konservativ "bleibt".
 */
export function computeForceDefaults(
  baseState: BogenBaseStateDto,
  throwTarget: 1 | 2 | 3 | 4,
): Record<1 | 2 | 3, 1 | 2 | 3 | 4> {
  const defaults: Record<1 | 2 | 3, 1 | 2 | 3 | 4> = { 1: 1, 2: 2, 3: 3 }
  // Throw zu 1B → Runner auf 1B nicht mehr forced, aggressive Default → 2B
  if (throwTarget === 1 && baseState.firstSlotId != null) {
    defaults[1] = 2
  }
  // Throw zu 2B (Force-Out auf 1B-Runner) → Force greift, Runner1B → 2B (auf 2B-Out)
  if (throwTarget === 2 && baseState.firstSlotId != null) {
    defaults[1] = 2
  }
  return defaults
}
```

- [ ] **Step 4: Test grün**

```bash
cd frontend && npx vitest run src/utils/bogenBaseAdvance.test.ts
```

Expected: PASS.

- [ ] **Step 5: `OutDetailDrawer` — Grounder/SoloOut bei Runners öffnet Picker mit Smart-Defaults**

`frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Imports erweitern:

```typescript
import { computeForceDefaults } from '@/utils/bogenBaseAdvance'
```

`RunnerAdvancePickerView` Signature erweitern um `defaultTargets`:

```typescript
function RunnerAdvancePickerView({
  title,
  subtitle,
  baseState,
  slots,
  onConfirm,
  onBack,
  showSacFlyToggle,
  defaultTargets,
}: {
  title: string
  subtitle: string
  baseState: BogenBaseStateDto
  slots: SpielbogenSlotResponse[]
  onConfirm: (advances: { fromBase: 1 | 2 | 3; toBase: 1 | 2 | 3 | 4 }[], isSacFly: boolean) => void
  onBack: () => void
  showSacFlyToggle?: boolean
  defaultTargets?: Record<1 | 2 | 3, 1 | 2 | 3 | 4>
}) {
```

State-Init mit defaultTargets:

```typescript
const [targets, setTargets] = useState<Record<1 | 2 | 3, 1 | 2 | 3 | 4>>(
  defaultTargets ?? { 1: 1, 2: 2, 3: 3 }
)
```

`handleGrounderOut` umbauen — bei `hasRunners` immer Picker öffnen statt direkt submit. Existing block in `InfieldOptionsView`:

```typescript
const handleGrounderOut = (
  outType: 'GROUNDER' | 'UNASSISTED',
  chain: number[],
  isError?: boolean,
  errorPosition?: number,
) => {
  const baseSubmit: Partial<SpielbogenRecordAtBatRequest> = isError
    ? { result: 'OUT', isError: true, errorPosition }
    : { result: 'OUT', outType, fielderChain: chain, ...(isSacBunt ? { sacrificeType: 'BUNT' as const } : {}) }
  onSubmit(baseSubmit)
}
```

Wird komplett ersetzt — Caller muss bei hasRunners den Picker öffnen statt direkt submitten. Da `InfieldOptionsView` keine direkte State-Hoheit hat, neuer Callback-Prop:

In `InfieldOptionsView`-Props ergänzen:

```typescript
interface InfieldOptionsProps {
  fielder: number
  hasRunners: boolean
  baseState: BogenBaseStateDto
  onSubmit: (req: Partial<SpielbogenRecordAtBatRequest>) => void
  onDpPick: (fielder: number, defaultDpPartner: number) => void
  onRunnerOutPick: (fielder: number) => void
  onAdvancePick: (fielder: number, throwTarget: 1 | 2 | 3 | 4, baseSubmit: Partial<SpielbogenRecordAtBatRequest>) => void  // CHANGED
  onBack: () => void
}
```

`handleGrounderOut` umbauen:

```typescript
const handleGrounderOut = (
  outType: 'GROUNDER' | 'UNASSISTED',
  chain: number[],
  isError?: boolean,
  errorPosition?: number,
) => {
  const baseSubmit: Partial<SpielbogenRecordAtBatRequest> = isError
    ? { result: 'OUT', isError: true, errorPosition }
    : { result: 'OUT', outType, fielderChain: chain, ...(isSacBunt ? { sacrificeType: 'BUNT' as const } : {}) }
  // Bei Runnern: Picker öffnen mit Smart-Defaults (Throw-Target = letztes Element der Chain, default 1)
  if (hasRunners && !isError) {
    const throwTarget = (chain[chain.length - 1] as 1 | 2 | 3 | 4) || 1
    const tt: 1 | 2 | 3 | 4 = throwTarget === 3 ? 1 : throwTarget  // fielder-pos 3 = 1B
    onAdvancePick(fielder, tt, baseSubmit)
    return
  }
  onSubmit(baseSubmit)
}
```

Anmerkung: in `chain` ist Pos `3` der Fielder 1B. Throw-Target = base, nicht fielder-pos. Helper:

Eigentlich einfacher: throwTarget direkt aus chain[1]:
- chain `[5, 3]` = 3B fielder wirft zu 1B fielder → throw target = 1B = base 1
- chain `[6, 4]` = SS wirft zu 2B → target = base 2

Da fielder-pos 3 == 1B, fielder-pos 4 == 2B etc., direkt mappen:

```typescript
const FIELDER_TO_BASE: Record<number, 1 | 2 | 3 | 4> = { 3: 1, 4: 2, 6: 2, 5: 3, 2: 4 }

const handleGrounderOut = (
  outType: 'GROUNDER' | 'UNASSISTED',
  chain: number[],
  isError?: boolean,
  errorPosition?: number,
) => {
  const baseSubmit: Partial<SpielbogenRecordAtBatRequest> = isError
    ? { result: 'OUT', isError: true, errorPosition }
    : { result: 'OUT', outType, fielderChain: chain, ...(isSacBunt ? { sacrificeType: 'BUNT' as const } : {}) }
  if (hasRunners && !isError) {
    const lastFielder = chain[chain.length - 1]
    const throwTarget = FIELDER_TO_BASE[lastFielder] ?? 1
    onAdvancePick(fielder, throwTarget, baseSubmit)
    return
  }
  onSubmit(baseSubmit)
}
```

Top-Level `OutDetailDrawer` — `handleAdvancePick` Signature anpassen:

```typescript
const handleAdvancePick = (fielder: number, throwTarget: 1 | 2 | 3 | 4, baseRequest: Partial<SpielbogenRecordAtBatRequest>) => {
  setPendingAdvancePicker({
    baseRequest,
    title: `Out ${fielder}${baseRequest.fielderChain && baseRequest.fielderChain.length > 1 ? `-${baseRequest.fielderChain[baseRequest.fielderChain.length - 1]}` : ''} — Runner-Advance`,
    defaultTargets: computeForceDefaults(baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }, throwTarget),
  })
}
```

State-Type erweitern:

```typescript
const [pendingAdvancePicker, setPendingAdvancePicker] = useState<null | {
  baseRequest: Partial<SpielbogenRecordAtBatRequest>
  title: string
  defaultTargets: Record<1 | 2 | 3, 1 | 2 | 3 | 4>
}>(null)
```

Aufruf-Stelle Picker:

```typescript
) : pendingAdvancePicker != null ? (
  <RunnerAdvancePickerView
    title={pendingAdvancePicker.title}
    subtitle="Smart-Default basierend auf Throw-Target — anpassen wenn Runner anders gelaufen ist."
    baseState={baseState}
    slots={slots}
    defaultTargets={pendingAdvancePicker.defaultTargets}
    onConfirm={handleAdvancePickerConfirm}
    onBack={() => setPendingAdvancePicker(null)}
  />
```

Optional `⚙ Runner-Advance editieren` aus `InfieldOptionsView` entfernen (jetzt automatisch).

```typescript
// Entferne diesen Block aus options:
// ...(hasRunners ? [
//   {
//     label: '⚙ Runner-Advance editieren',
//     ...
//   },
// ] : []),
```

`InfieldOptionsView`-Caller muss neuen Signature anpassen:

```typescript
<InfieldOptionsView
  fielder={selectedFielder}
  hasRunners={runnersOnBase}
  baseState={baseState}
  onSubmit={handleInfieldSubmit}
  onDpPick={(fielder, defaultDpPartner) => setPendingDpRequest({ fielder, defaultDpPartner })}
  onRunnerOutPick={(fielder) => setPendingRunnerOutRequest({ fielder })}
  onAdvancePick={handleAdvancePick}
  onBack={() => setSelectedFielder(null)}
/>
```

`handleAdvancePickerConfirm` — `pendingAdvancePicker.baseRequest` muss spread werden:

```typescript
const handleAdvancePickerConfirm = (advances: { fromBase: 1 | 2 | 3; toBase: 1 | 2 | 3 | 4 }[], _isSacFly: boolean) => {
  if (pendingAdvancePicker == null) return
  const { baseStateAfter: after, runsScored: runs } = applyAdvances(baseStateAfter, advances)
  onSubmit({
    ...pendingAdvancePicker.baseRequest,
    runsScored: runs,
    rbi: runs,
    baseStateAfter: after,
  })
  setPendingAdvancePicker(null)
  setSelectedFielder(null)
}
```

- [ ] **Step 6: Tests in OutDetailDrawer.test.tsx erweitern**

```typescript
describe('OutDetailDrawer Smart-Defaults', () => {
  const slots: SpielbogenSlotResponse[] = [
    { id: 1, battingOrder: 1, name: 'A', playerId: null, playerName: null, dhBatterPlayerId: null, dhBatterName: null, position: 1 },
  ]

  it('Grounder + Runner1B → Picker öffnet sich automatisch mit default 1B → 2B', async () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={{ firstSlotId: 1, secondSlotId: null, thirdSlotId: null }}
        slots={slots}
        batterSlotId={42}
        outs={0}
      />
    )
    fireEvent.click(screen.getByLabelText('Feldposition 6 SS'))
    fireEvent.click(screen.getByText(/Wirft zu 1B/i))
    // Picker erscheint, Runner1B sollte default → 2B haben
    expect(await screen.findByText(/→ 2B/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Bestätigen/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        outType: 'GROUNDER',
        baseStateAfter: expect.objectContaining({
          firstSlotId: null,
          secondSlotId: 1,
        }),
      })
    )
  })
})
```

- [ ] **Step 7: Tests grün**

```bash
cd frontend && npx vitest run src/components/spielbogen/ src/utils/bogenBaseAdvance.test.ts
```

Expected: PASS.

- [ ] **Step 8: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/utils/bogenBaseAdvance.ts frontend/src/utils/bogenBaseAdvance.test.ts frontend/src/components/spielbogen/OutDetailDrawer.tsx frontend/src/components/spielbogen/OutDetailDrawer.test.tsx
git commit -m "✨ Spielbogen: Smart-Default Runner-Advance-Picker bei Grounder mit Runnern"
```

---

## Task 4: 3-Outs Center-Flash + roter Toast

**Files:**
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx` — Center-Flash-Overlay + roter Toast

- [ ] **Step 1: Center-Flash-State + Overlay implementieren**

`frontend/src/components/spielbogen/SpielbogenPage.tsx` — bestehenden `inningSwitchFlash` State umfunktionieren als Center-Flash, oder ergänzen. Bestehender State (line 154):

```typescript
const [inningSwitchFlash, setInningSwitchFlash] = useState<{ newSide: BogenSide } | null>(null)
```

ersetzen durch:

```typescript
const [sideSwitchFlash, setSideSwitchFlash] = useState<{ newSide: BogenSide; reason: 'auto' | 'manual' } | null>(null)
```

In `useEffect` (auto-switch detection, line 177-187) anpassen:

```typescript
useEffect(() => {
  if (prevSideRef.current !== null && currentSideForEffect !== null && prevSideRef.current !== currentSideForEffect) {
    setSideSwitchFlash({ newSide: currentSideForEffect, reason: 'auto' })
    setTimeout(() => setSideSwitchFlash(null), 1200)
    toast.show(
      `Inning ${currentInningForEffect} — ${currentSideForEffect === 'HOME' ? 'Heim' : 'Gast'} am Schlag`,
      'error',  // CHANGED: rot statt success
    )
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([100, 50, 100, 50, 200]) } catch { /* not supported */ }
    }
  }
  prevSideRef.current = currentSideForEffect
}, [currentSideForEffect])
```

Im `handleRecord` Auto-Switch-Block (line 325-334) auch:

```typescript
if (projectedOuts >= 3) {
  try {
    await switchSide()
    const newSide = currentSide === 'HOME' ? 'AWAY' : 'HOME'
    setSideSwitchFlash({ newSide, reason: 'auto' })
    setTimeout(() => setSideSwitchFlash(null), 1200)
  } catch {
    // Backend rejected; ignore silently
  }
}
```

(Note: useEffect feuert sowieso wegen `currentSide`-change — der explizite Set hier kann redundant sein. Belassen für Sofort-Feedback.)

JSX-Block (line 421-433) — Top-Banner ersetzen durch Center-Overlay:

```typescript
{/* 3-Out / Side-Switch Center-Flash */}
<AnimatePresence>
  {sideSwitchFlash && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-softball-red-700/85 pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.2, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="text-center text-white px-6"
      >
        <div className="font-display text-6xl sm:text-7xl font-extrabold tracking-widest mb-2">
          3 OUTS
        </div>
        <div className="font-display text-xl sm:text-2xl font-bold tracking-widest uppercase">
          Seitenwechsel
        </div>
        <div className="font-body text-base sm:text-lg mt-2 opacity-95">
          {sideSwitchFlash.newSide === 'HOME' ? 'Heim' : 'Gast'} schlägt jetzt
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

Alten `inningSwitchFlash`-Banner-Block (`fixed top-0 left-0 right-0 z-50 bg-navy-800 ...`) entfernen.

- [ ] **Step 2: Manuelle Side-Switch nutzt KEINEN Center-Flash**

`handleSwitchConfirm` — kein Set von sideSwitchFlash. Toast bleibt:

```typescript
const handleSwitchConfirm = async () => {
  setShowSwitchConfirm(false)
  setSubmitting(true)
  try {
    await switchSide()
  } catch (e) {
    toast.show((e as Error).message, 'error')
  } finally {
    setSubmitting(false)
  }
}
```

(useEffect erkennt side-change und feuert den Center-Flash automatisch — also auch bei manuellem Switch. Akzeptabel, da es nur 1.2s ist und Side-Wechsel ist Side-Wechsel. Falls user wirklich nur Auto-Switch will: setCurrentSide-Flow + manualSwitch-Marker einbauen — siehe Open Question.)

Pragmatik: belassen wie ist. Center-Flash bei jedem Side-Switch.

- [ ] **Step 3: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Manuell-Test im Browser**

```bash
cd frontend && npx vite
```

In anderem Terminal: `cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml`

Im Browser:
- Spielbogen erstellen, 3 Outs hintereinander spielen
- Center-Flash mit "3 OUTS — Seitenwechsel" sichtbar?
- Toast rot statt grün?
- Vibration auf Mobile?

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/spielbogen/SpielbogenPage.tsx
git commit -m "🎨 Spielbogen: Center-Flash + roter Toast bei 3-Outs-Side-Switch (sichtbarer)"
```

---

## Task 5: Runner-Advance-Flash

**Files:**
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx`

- [ ] **Step 1: State + Logik**

`SpielbogenPage.tsx` — neuer State neben anderen Flashes:

```typescript
const [advanceFlash, setAdvanceFlash] = useState<{ runners: string[]; targets: string[] } | null>(null)
```

Helper für Diff zwischen Vorher/Nachher (in `handleRecord` direkt vor dem Try):

```typescript
const beforeBaseState = displayBaseState
```

Nach `await recordAtBat(req)` — ergänze in Reduced-Motion-Block oder daneben:

```typescript
// Runner-Advance-Flash (Diff vor/nach Play)
if (!reducedMotion && req.baseStateAfter) {
  const before = beforeBaseState
  const after = req.baseStateAfter
  const advanced: string[] = []
  const targets: string[] = []
  // Runner1B → 2B oder höher
  if (before.firstSlotId != null && after.secondSlotId === before.firstSlotId) {
    const s = slots.find(sl => sl.id === before.firstSlotId)
    if (s) { advanced.push(s.name); targets.push('2B') }
  }
  if (before.firstSlotId != null && after.thirdSlotId === before.firstSlotId) {
    const s = slots.find(sl => sl.id === before.firstSlotId)
    if (s) { advanced.push(s.name); targets.push('3B') }
  }
  // Runner2B → 3B (aber nicht scored — das wird schon scoredFlash gemacht)
  if (before.secondSlotId != null && after.thirdSlotId === before.secondSlotId) {
    const s = slots.find(sl => sl.id === before.secondSlotId)
    if (s) { advanced.push(s.name); targets.push('3B') }
  }
  // Skip wenn bereits Run scored (scoredFlash) oder HR/Hit (hat eigenen Flash)
  const hasOwnFlash = req.result === 'HOMERUN' || req.result === 'HIT_BY_PITCH' ||
                      req.result === 'WALK' || req.result === 'STRIKEOUT' ||
                      ((req.runsScored ?? 0) > 0)
  if (advanced.length > 0 && !hasOwnFlash) {
    setAdvanceFlash({ runners: advanced, targets })
    setTimeout(() => setAdvanceFlash(null), 1200)
  }
}
```

JSX — Flash-Block (unter Diamond, oder Overlay):

```typescript
{/* Runner-Advance-Flash */}
<AnimatePresence>
  {advanceFlash && (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="fixed top-32 left-1/2 -translate-x-1/2 z-50 bg-cream-50 border-2 border-emerald-400 px-4 py-2 rounded-xl shadow-xl pointer-events-none"
    >
      <div className="font-display text-xs font-bold tracking-widest uppercase text-emerald-700 mb-0.5">
        Runner advanced
      </div>
      <div className="text-sm text-navy-900 font-semibold">
        {advanceFlash.runners.map((r, i) => `${r} → ${advanceFlash.targets[i]}`).join(' · ')}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Manuell-Test**

Im Browser:
- Runner auf 1B, dann Single → Flash sichtbar?
- Reduced-Motion: in DevTools `prefers-reduced-motion: reduce` → kein Flash?

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/spielbogen/SpielbogenPage.tsx
git commit -m "✨ Spielbogen: Runner-Advance-Flash zeigt Bewegung sichtbar"
```

---

## Task 6: SH/SF Help-Popover

**Files:**
- Create: `frontend/src/components/shared/HelpPopover.tsx`
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Toggles mit HelpPopover

- [ ] **Step 1: Wiederverwendbare HelpPopover-Komponente**

`frontend/src/components/shared/HelpPopover.tsx` (neu):

```typescript
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  title: string
  body: React.ReactNode
}

export function HelpPopover({ title, body }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-5 h-5 inline-flex items-center justify-center rounded-full border border-gray-400 text-gray-500 text-[11px] font-bold hover:bg-gray-100 cursor-pointer"
        aria-label={`Hilfe: ${title}`}
      >
        ?
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-7 z-50 w-72 max-w-[calc(100vw-2rem)] bg-cream-50 border border-cream-300 rounded-xl shadow-xl p-3"
            >
              <div className="font-display text-xs font-extrabold tracking-widest uppercase text-navy-900 mb-1.5">
                {title}
              </div>
              <div className="text-xs text-gray-700 leading-relaxed space-y-1.5">
                {body}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="mt-2 text-[10px] font-bold tracking-widest uppercase text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Schließen
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  )
}
```

- [ ] **Step 2: Help-Popover im Sac-Bunt-Toggle (`InfieldOptionsView`) einbauen**

`OutDetailDrawer.tsx` — Import:

```typescript
import { HelpPopover } from '@/components/shared/HelpPopover'
```

`InfieldOptionsView` — Sac-Bunt-Toggle umbauen (line ~192-202):

```typescript
{hasRunners && (
  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 pb-1">
    <input
      type="checkbox"
      checked={isSacBunt}
      onChange={e => setIsSacBunt(e.target.checked)}
      className="w-4 h-4 rounded border-gray-300 accent-navy-800 cursor-pointer"
    />
    <span>Als Sacrifice Bunt werten (SH)</span>
    <HelpPopover
      title="Sacrifice Bunt (SH)"
      body={
        <>
          <p>Batter buntet absichtlich, damit Runner advancen kann. Batter wird out an 1B — opfert sich ("sacrifice").</p>
          <p><strong>Wann ankreuzen:</strong> Batter hat absichtlich gebuntet um Runner weiterzubringen.</p>
          <p><strong>Wirkung:</strong> AB zählt nicht für AVG → Batter-AVG bleibt geschützt.</p>
        </>
      }
    />
  </label>
)}
```

`RunnerAdvancePickerView` — Sac-Fly-Toggle umbauen (line ~380-390):

```typescript
{showSacFlyToggle && (
  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 pt-1">
    <input
      type="checkbox"
      checked={isSacFly}
      onChange={e => setIsSacFly(e.target.checked)}
      className="w-4 h-4 rounded border-gray-300 accent-navy-800 cursor-pointer"
    />
    <span>Als Sacrifice Fly werten (SF)</span>
    <HelpPopover
      title="Sacrifice Fly (SF)"
      body={
        <>
          <p>Batter schlägt Fly Ball ins Outfield. Outfielder fängt → Batter out. Aber: Runner von 3B taggt up und scored.</p>
          <p><strong>Wann ankreuzen:</strong> Mindestens 1 Run wegen Tag-Up. Nur möglich bei &lt; 2 Outs.</p>
          <p><strong>Wirkung:</strong> AB zählt nicht für AVG.</p>
        </>
      }
    />
  </label>
)}
```

- [ ] **Step 3: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Manuell-Test**

Im Browser:
- AUS-Drawer öffnen, Infielder tap, Runner auf 1B → SH-Toggle mit `?`-Icon
- Tap `?` → Popover sichtbar mit Erklärung?
- Outfielder-Tag-Up → SF-Toggle mit `?`-Icon ?

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared/HelpPopover.tsx frontend/src/components/spielbogen/OutDetailDrawer.tsx
git commit -m "✨ Spielbogen: Help-Popover für SH/SF erklärt Sacrifice-Logik für Anfänger"
```

---

## Final Verification

- [ ] **Alle Tests grün**

```bash
cd frontend && npx vitest run
```

- [ ] **Production-Build sauber**

```bash
cd frontend && npm run build
```

- [ ] **Lint clean**

```bash
cd frontend && npm run lint
```

- [ ] **Manuell-Smoke-Test im Browser** (alle 6 Punkte):
  1. FlyOut bei 2 Outs + Runner3B-Tag-Up → kein Run gewertet, Hinweis sichtbar
  2. Error-Button auf Infielder → Batter auf 1B safe, amber-Visual
  3. Grounder + Runner1B → Picker öffnet auto mit `1B → 2B` default
  4. 3 Outs → Vollbild-Center-Flash rot, roter Toast, Vibration
  5. Single mit Runner1B → "Runner advanced"-Flash sichtbar
  6. SH-Toggle `?`-Icon → Popover erklärt

---

## Open Questions / Tech-Debt für später

- `REACHED_ON_ERROR` als eigener `AtBatResult` (Backend-Enum + DB-Migration) statt `OUT + isError=true` Pattern.
- Center-Flash bei manuellem Side-Switch unterdrücken (aktuell feuert er bei jedem currentSide-Wechsel).
- Spielbogen-Stats-Calc: prüfen ob `isError` korrekt gehandhabt wird (AB+1, kein Hit) — vermutlich gleich `BattingStatsCalculator`-Logik nötig für Spielbogen.
