# Spielbogen Feedback Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 5 Spielbogen-Issues aus Real-Use-Test Round 2: FlyOut+2-Outs Picker-Skip, PDF Roman-Bold, Error→Tier-2-Button, Mini-Field-Chain-Picker, Combined-Center-Flash.

**Architecture:** Frontend-only Pass. Neue `ErrorPickerDrawer`-Komponente. `RunnerOutPickerView` erweitert um Chain-Step. `sideSwitchFlash`-State erweitert um `lastOutType`. Tier-2 Layout `grid-cols-2` → `grid-cols-3`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, motion/react, Vitest, Vaul, jsPDF.

**Spec:** `docs/superpowers/specs/2026-05-02-spielbogen-feedback-round2-design.md`

---

## File Structure

**Modified:**
- `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — A skip-Picker bei FlyOut+outs>=2; Error-Option entfernen; D Chain-Picker in `RunnerOutPickerView`
- `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx` — neue Tests
- `frontend/src/components/spielbogen/BogenActionButtons.tsx` — neuer ERROR-Tier-2-Button + Drawer-Trigger; grid-cols-3
- `frontend/src/components/spielbogen/SpielbogenPage.tsx` — E lastOutType bei Center-Flash, Skip Strikeout-Flash bei 3rd-Out
- `frontend/src/utils/spielbogenPdfExport.ts` — B Roman schwarz + bold

**New:**
- `frontend/src/components/spielbogen/ErrorPickerDrawer.tsx` — Mini-Field-Picker für errorPosition
- `frontend/src/components/spielbogen/ErrorPickerDrawer.test.tsx` — Tests

---

## Task 1: A — FlyOut + 2 Outs Picker skippen

**Files:**
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — `handleFielderTap` Logik
- Test: `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx`

- [ ] **Step 1: Failing-Test**

In `OutDetailDrawer.test.tsx` ergänzen:

```typescript
describe('OutDetailDrawer FlyOut + 2 Outs Picker skip', () => {
  it('mit 2 outs + Outfielder-Tap: direkt submit ohne Tag-Up-Picker', () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={{ firstSlotId: null, secondSlotId: null, thirdSlotId: 1 }}
        slots={slots}
        batterSlotId={42}
        outs={2}
      />
    )
    fireEvent.click(screen.getByLabelText('Feldposition 8 CF'))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'OUT',
        outType: 'FLY',
        fielderChain: [8],
        runsScored: 0,
        rbi: 0,
      })
    )
    // Picker should NOT have opened
    expect(screen.queryByText(/Tag Up/i)).toBeNull()
  })
})
```

- [ ] **Step 2: Test laufen — fail**

```bash
cd frontend && npx vitest run src/components/spielbogen/OutDetailDrawer.test.tsx
```

- [ ] **Step 3: `handleFielderTap` anpassen**

In `OutDetailDrawer.tsx`:

```typescript
const handleFielderTap = (pos: number) => {
  if (pos >= 7) {
    const hasAnyRunner = baseStateAfter && (
      baseStateAfter.firstSlotId != null ||
      baseStateAfter.secondSlotId != null ||
      baseStateAfter.thirdSlotId != null
    )
    if (hasAnyRunner && outs < 2) {
      setPendingFlyOutRequest({ fielder: pos })
    } else {
      onSubmit({
        result: 'OUT',
        outType: 'FLY',
        fielderChain: [pos],
        runsScored: 0,
        rbi: 0,
      })
    }
  } else {
    setSelectedFielder(pos)
  }
}
```

- [ ] **Step 4: Test grün**

```bash
cd frontend && npx vitest run src/components/spielbogen/OutDetailDrawer.test.tsx
```

- [ ] **Step 5: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/spielbogen/OutDetailDrawer.tsx frontend/src/components/spielbogen/OutDetailDrawer.test.tsx
git commit -m "🐛 Spielbogen: FlyOut bei 2 Outs überspringt Tag-Up-Picker (Inning beendet)"
```

---

## Task 2: B — PDF Roman-Numerals schwarz + bold

**Files:**
- Modify: `frontend/src/utils/spielbogenPdfExport.ts`

- [ ] **Step 1: Edit Roman-Numeral Render**

In `spielbogenPdfExport.ts:299-304` ersetzen:

```typescript
if (cell?.outIndex) {
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(cell.outIndex, cellX + 1, cellY + 3)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
}
```

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Tests grün**

```bash
cd frontend && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/spielbogenPdfExport.ts
git commit -m "🎨 Spielbogen PDF: Römische Out-Zahlen schwarz + bold (besser lesbar)"
```

---

## Task 3: E — Center-Flash combiniert Strikeout-Info bei 3rd-Out

**Files:**
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx`

- [ ] **Step 1: State + Logik**

In `SpielbogenPage.tsx` State erweitern:

```typescript
const [sideSwitchFlash, setSideSwitchFlash] = useState<{
  newSide: BogenSide
  lastOutType?: 'strikeout' | 'fly' | 'grounder'
} | null>(null)
```

Hilfsfunktion vor `handleRecord`:

```typescript
function deriveLastOutType(req: SpielbogenRecordAtBatRequest): 'strikeout' | 'fly' | 'grounder' | undefined {
  if (req.result === 'STRIKEOUT') return 'strikeout'
  if (req.result === 'OUT') {
    if (req.outType === 'FLY') return 'fly'
    if (req.outType === 'GROUNDER' || req.outType === 'UNASSISTED' ||
        req.outType === 'DOUBLE_PLAY' || req.outType === 'TRIPLE_PLAY' ||
        req.outType === 'FIELDERS_CHOICE') return 'grounder'
  }
  return undefined
}
```

In `handleRecord` Strikeout-Flash Block (line ~268):

```typescript
} else if (req.result === 'STRIKEOUT' && projectedOuts < 3) {
  setStrikeoutFlash(batterName)
  setTimeout(() => setStrikeoutFlash(null), 1600)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([40, 40, 80]) } catch { /* not supported */ }
  }
}
```

(`projectedOuts` muss vor diesem Block schon berechnet sein — ist es bereits unten in line 324, hochziehen):

```typescript
let increment = 0
if (req.result === 'STRIKEOUT') {
  increment = 1
} else if (req.result === 'OUT' && !req.isError) {
  if (req.outType === 'DOUBLE_PLAY') increment = 2
  else if (req.outType === 'TRIPLE_PLAY') increment = 3
  else increment = 1
}
const projectedOuts = outs + increment
```

→ Move dieses Block VOR den Flash-Block (vor `if (req.result === 'HOMERUN')`-Kette).

In Auto-Switch-Block:

```typescript
if (projectedOuts >= 3) {
  try {
    await switchSide()
    const newSide = currentSide === 'HOME' ? 'AWAY' : 'HOME'
    setSideSwitchFlash({ newSide, lastOutType: deriveLastOutType(req) })
    setTimeout(() => setSideSwitchFlash(null), 1200)
  } catch {
    // Backend rejected; ignore silently
  }
}
```

JSX Center-Flash Block — Subtitle adaptiv (around line 462-493):

```typescript
{sideSwitchFlash && (
  <motion.div
    role="alert"
    aria-live="assertive"
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
      transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: 20 }}
      className="text-center text-white px-6"
    >
      <div className="font-display text-6xl sm:text-7xl font-extrabold tracking-widest mb-2">
        3 OUTS
      </div>
      <div className="font-display text-xl sm:text-2xl font-bold tracking-widest uppercase">
        {sideSwitchFlash.lastOutType === 'strikeout' ? 'Strikeout · Seitenwechsel'
          : sideSwitchFlash.lastOutType === 'fly' ? 'Fly Out · Seitenwechsel'
          : sideSwitchFlash.lastOutType === 'grounder' ? 'Grounder Out · Seitenwechsel'
          : 'Seitenwechsel'}
      </div>
      <div className="font-body text-base sm:text-lg mt-2 opacity-95">
        {sideSwitchFlash.newSide === 'HOME' ? 'Heim' : 'Gast'} schlägt jetzt
      </div>
    </motion.div>
  </motion.div>
)}
```

useEffect-Auto-Switch (around line 178-196) — auch lastOutType setzen kann nicht, weil dort kein req zugänglich. Nur explizite handleRecord-Path setzt lastOutType. Manuell-Switch zeigt fallback "Seitenwechsel" (kein lastOutType). OK.

- [ ] **Step 2: Tests + Build**

```bash
cd frontend && npx vitest run
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/spielbogen/SpielbogenPage.tsx
git commit -m "✨ Spielbogen: Center-Flash zeigt Strikeout/Fly/Grounder bei 3rd-Out + skip Strikeout-Flash"
```

---

## Task 4: C — ERROR-Button Tier-2 + ErrorPickerDrawer

**Files:**
- Create: `frontend/src/components/spielbogen/ErrorPickerDrawer.tsx`
- Create: `frontend/src/components/spielbogen/ErrorPickerDrawer.test.tsx`
- Modify: `frontend/src/components/spielbogen/BogenActionButtons.tsx` — neuer ERROR-Button + Drawer-State + grid-cols-3
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Error-Option aus `InfieldOptionsView` entfernen

- [ ] **Step 1: ErrorPickerDrawer-Komponente**

`frontend/src/components/spielbogen/ErrorPickerDrawer.tsx` (neu):

```typescript
import { Drawer } from 'vaul'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (errorPosition: number) => void
}

const POSITION_NAMES: Record<number, string> = {
  1: 'P', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS',
  7: 'LF', 8: 'CF', 9: 'RF',
}

const FIELD_POSITIONS: Array<{ pos: number; cx: number; cy: number }> = [
  { pos: 7, cx: 55,  cy: 45 },
  { pos: 8, cx: 140, cy: 25 },
  { pos: 9, cx: 225, cy: 45 },
  { pos: 5, cx: 72,  cy: 115 },
  { pos: 6, cx: 108, cy: 100 },
  { pos: 4, cx: 168, cy: 100 },
  { pos: 3, cx: 210, cy: 115 },
  { pos: 1, cx: 140, cy: 130 },
  { pos: 2, cx: 140, cy: 180 },
]

export function ErrorPickerDrawer({ open, onClose, onPick }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[80vh] flex flex-col focus:outline-none">
          <Drawer.Title className="sr-only">Error-Position wählen</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />
          <div className="px-5 py-3 border-b border-cream-200 flex items-center justify-between shrink-0">
            <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
              Welcher Fielder hatte den Fehler?
            </h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs text-gray-500 text-center mb-3 font-body">
              Tippe auf die Feldposition, die den Fehler gemacht hat. Batter erreicht 1B safe.
            </p>
            <svg viewBox="0 0 280 220" className="w-full max-w-xs mx-auto block">
              <path d="M 30 200 Q 140 20 250 200" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 3" />
              <path d="M 140 175 L 210 120 L 140 65 L 70 120 Z" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 2" />
              {FIELD_POSITIONS.map(({ pos, cx, cy }) => (
                <g
                  key={pos}
                  role="button"
                  aria-label={`Feldposition ${pos} ${POSITION_NAMES[pos]}`}
                  onClick={() => { onPick(pos); onClose() }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={cx} cy={cy} r="22" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e3a5f">{pos}</text>
                  <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#374151">{POSITION_NAMES[pos]}</text>
                </g>
              ))}
            </svg>
            <button
              onClick={onClose}
              className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Abbrechen
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 2: ErrorPickerDrawer-Test**

`frontend/src/components/spielbogen/ErrorPickerDrawer.test.tsx` (neu):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorPickerDrawer } from './ErrorPickerDrawer'

describe('ErrorPickerDrawer', () => {
  it('Tap auf Fielder ruft onPick mit Position', () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<ErrorPickerDrawer open onClose={onClose} onPick={onPick} />)
    fireEvent.click(screen.getByLabelText('Feldposition 5 3B'))
    expect(onPick).toHaveBeenCalledWith(5)
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: BogenActionButtons — ERROR-Button + Drawer**

In `BogenActionButtons.tsx`:

Imports erweitern:
```typescript
import { ErrorPickerDrawer } from './ErrorPickerDrawer'
```

State + Handler:
```typescript
const [showErrorDrawer, setShowErrorDrawer] = useState(false)

const handleErrorPick = async (errorPosition: number) => {
  if (!currentSlotId) return
  setSubmitting(true)
  try {
    const advance = computeBaseStateAdvance({
      before: baseStateAfter,
      result: 'OUT',
      isError: true,
      batterSlotId: currentSlotId,
    })
    await onRecord({
      side,
      slotId: currentSlotId,
      inning,
      result: 'OUT',
      isError: true,
      errorPosition,
      runsScored: advance.runsScored,
      rbi: 0,  // ROE: unearned run, kein RBI
      baseStateAfter: advance.baseStateAfter,
    })
  } finally {
    setSubmitting(false)
  }
}
```

Imports auch `computeBaseStateAdvance`:
```typescript
import { computeBaseStateAdvance } from '@/utils/bogenBaseAdvance'
```

Tier-2-Layout — `grid-cols-2` → `grid-cols-3`:
```typescript
{/* Tier 2: Medium buttons */}
<div className="grid grid-cols-3 gap-2">
  <MedButton label="WALK" color="emerald" onClick={() => handleRecord('WALK')} disabled={isDisabled} />
  <MedButton label="HBP" subtitle="Hit-by-Pitch" color="amber" onClick={() => handleRecord('HIT_BY_PITCH')} disabled={isDisabled} />
  <MedButton label="ERROR" subtitle="Batter safe" color="orange" onClick={() => setShowErrorDrawer(true)} disabled={isDisabled} />
</div>
```

`COLOR_CLASSES` erweitern:
```typescript
const COLOR_CLASSES = {
  navy:    'bg-navy-800 hover:bg-navy-900 active:bg-navy-950 text-white',
  red:     'bg-softball-red-600 hover:bg-softball-red-700 active:bg-softball-red-800 text-white',
  gray:    'bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
  amber:   'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
  orange:  'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white',
} as const
```

JSX Drawer ergänzen (am Ende neben anderen Drawers):
```typescript
<ErrorPickerDrawer
  open={showErrorDrawer}
  onClose={() => setShowErrorDrawer(false)}
  onPick={handleErrorPick}
/>
```

- [ ] **Step 4: Error-Option aus OutDetailDrawer entfernen**

In `OutDetailDrawer.tsx` `InfieldOptionsView` `options`-Array — Error-Option-Block löschen:

```typescript
// LÖSCHEN:
{
  label: `Sicher an 1B durch Fehler (E${fielder})`,
  description: 'Batter safe — kein Out, Fielder hat Fehler',
  action: () => handleGrounderOut('GROUNDER', [], true, fielder),
  isError: true,
},
```

`isError`-Type aus options-Type entfernen:
```typescript
const options: Array<{ label: string; description: string; action: () => void; primary?: boolean }> = [
```

Render-Block: Error-Divider + amber-Logik entfernen, zurück zu einfachem Map:
```typescript
{options.map((opt) => (
  <button
    key={opt.label}
    onClick={opt.action}
    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
      opt.primary
        ? 'bg-navy-50 border-navy-300 text-navy-900 hover:bg-navy-100'
        : 'bg-white border-cream-300 text-gray-700 hover:bg-cream-100'
    }`}
  >
    <div className="text-sm font-semibold">{opt.label}</div>
    <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
  </button>
))}
```

`handleGrounderOut` Signature: `isError`/`errorPosition` Params können bleiben (für FC-Path), aber von Error-Option nicht mehr aufgerufen → eigentlich entfernen wenn keine Aufrufer mehr. Check: ist isError sonst noch genutzt? Nein nur Error-Option. → Vereinfachen:

```typescript
const handleGrounderOut = (outType: 'GROUNDER' | 'UNASSISTED', chain: number[]) => {
  const baseSubmit: Partial<SpielbogenRecordAtBatRequest> = {
    result: 'OUT',
    outType,
    fielderChain: chain,
    ...(isSacBunt ? { sacrificeType: 'BUNT' as const } : {}),
  }
  if (hasRunners) {
    const lastFielder = chain[chain.length - 1]
    const throwTarget = FIELDER_TO_BASE[lastFielder] ?? 1
    onAdvancePick(fielder, throwTarget, baseSubmit)
    return
  }
  onSubmit(baseSubmit)
}
```

- [ ] **Step 5: OutDetailDrawer-Tests anpassen**

In `OutDetailDrawer.test.tsx`: bestehender `Error E5` Test → entfernen oder umstellen auf `ErrorPickerDrawer.test.tsx`. Da neue Datei separate Tests hat, alte Test-Block aus OutDetailDrawer entfernen.

```typescript
// LÖSCHEN: describe('OutDetailDrawer Error/ROE', ...)
```

- [ ] **Step 6: Tests grün**

```bash
cd frontend && npx vitest run
```

- [ ] **Step 7: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/spielbogen/ErrorPickerDrawer.tsx frontend/src/components/spielbogen/ErrorPickerDrawer.test.tsx frontend/src/components/spielbogen/BogenActionButtons.tsx frontend/src/components/spielbogen/OutDetailDrawer.tsx frontend/src/components/spielbogen/OutDetailDrawer.test.tsx
git commit -m "✨ Spielbogen: ERROR Tier-2-Button + ErrorPickerDrawer (raus aus AUS-Drawer)"
```

---

## Task 5: D — Mini-Field-Chain-Picker für Runner-Out

**Files:**
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — `RunnerOutPickerView` erweitern

- [ ] **Step 1: ChainPicker-Sub-View**

Neue Sub-Komponente `ChainPickerView` in `OutDetailDrawer.tsx` (vor `OutDetailDrawer`):

```typescript
interface ChainPickerProps {
  initialFielder: number
  onConfirm: (chain: number[]) => void
  onBack: () => void
}

function ChainPickerView({ initialFielder, onConfirm, onBack }: ChainPickerProps) {
  const [chain, setChain] = useState<number[]>([initialFielder])

  const tap = (pos: number) => {
    setChain(prev => {
      // Wenn schon im chain, ignore (no duplicates)
      if (prev.includes(pos)) return prev
      return [...prev, pos]
    })
  }

  const reset = () => setChain([])

  const chainLabel = chain.length === 0
    ? '(Kein Fielder gewählt)'
    : chain.length === 1
    ? `Solo (${chain[0]} unassisted)`
    : chain.join('-')

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide">
        Wer hat den Runner getaggt? Wer hat geworfen?
      </h3>
      <p className="text-xs text-gray-500 font-body">
        Erster Tap = Tagger. Weitere Taps fügen Assister hinzu (in Reihenfolge des Wurfs). Default: Solo.
      </p>
      <div className="bg-navy-50 border border-navy-300 rounded-lg p-2 text-center">
        <div className="text-[10px] tracking-widest uppercase text-gray-500 font-bold">Chain</div>
        <div className="font-display text-lg font-extrabold text-navy-900 tabular-nums">{chainLabel}</div>
      </div>
      <svg viewBox="0 0 280 220" className="w-full max-w-xs mx-auto block">
        <path d="M 30 200 Q 140 20 250 200" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d="M 140 175 L 210 120 L 140 65 L 70 120 Z" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 2" />
        {FIELD_POSITIONS.map(({ pos, cx, cy }) => {
          const isInChain = chain.includes(pos)
          const idx = chain.indexOf(pos)
          return (
            <g key={pos} role="button" aria-label={`Feldposition ${pos} ${POSITION_NAMES[pos]}`}
               onClick={() => tap(pos)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r="22"
                fill={isInChain ? '#1e3a5f' : (pos >= 7 ? '#dbeafe' : '#f0f4f8')}
                stroke={isInChain ? '#0f1f33' : (pos >= 7 ? '#3b82f6' : '#6b7280')}
                strokeWidth="1.5" />
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={isInChain ? 'white' : '#1e3a5f'}>{pos}</text>
              <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill={isInChain ? 'white' : '#374151'}>{POSITION_NAMES[pos]}</text>
              {isInChain && (
                <text x={cx + 16} y={cy - 14} textAnchor="middle" fontSize="9" fontWeight="700" fill="#dc2626">{idx + 1}</text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="flex gap-2 mt-2">
        <button
          onClick={reset}
          className="flex-1 py-2 text-sm rounded-lg border border-cream-300 text-gray-600 hover:bg-cream-100 cursor-pointer"
        >
          Reset
        </button>
        <button
          onClick={onBack}
          className="flex-1 py-2 text-sm rounded-lg border border-cream-300 text-gray-600 hover:bg-cream-100 cursor-pointer"
        >
          ← Zurück
        </button>
        <button
          onClick={() => onConfirm(chain.length === 0 ? [initialFielder] : chain)}
          className="flex-1 py-2 font-display text-sm font-bold tracking-widest uppercase text-white bg-navy-800 hover:bg-navy-900 rounded-lg cursor-pointer"
        >
          Bestätigen
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire ChainPickerView in `OutDetailDrawer`**

State erweitern:
```typescript
const [pendingChainPicker, setPendingChainPicker] = useState<null | {
  initialFielder: number
  baseRequest: Partial<SpielbogenRecordAtBatRequest>
  baseStateAfter: BogenBaseStateDto
}>(null)
```

`handleRunnerOutPick` umbauen — statt direkt onSubmit zuerst Chain-Picker öffnen:

```typescript
const handleRunnerOutPick = ({ runnerSlotId, fromBase }: { runnerSlotId: number; fromBase: 1 | 2 | 3 }) => {
  if (pendingRunnerOutRequest == null || batterSlotId == null) return
  const fielder = pendingRunnerOutRequest.fielder
  const before = baseState
  const newFirstSlot: number | null = batterSlotId
  let newSecondSlot: number | null = before.secondSlotId
  let newThirdSlot: number | null = before.thirdSlotId
  if (fromBase === 1) {
    // unchanged
  } else if (fromBase === 2) {
    newSecondSlot = null
    if (before.firstSlotId != null) newSecondSlot = before.firstSlotId
  } else if (fromBase === 3) {
    newThirdSlot = null
    if (before.secondSlotId != null) {
      newThirdSlot = before.secondSlotId
      newSecondSlot = before.firstSlotId
    } else if (before.firstSlotId != null) {
      newSecondSlot = before.firstSlotId
    }
  }
  void runnerSlotId
  setPendingRunnerOutRequest(null)
  setPendingChainPicker({
    initialFielder: fielder,
    baseRequest: {
      result: 'OUT',
      outType: 'FIELDERS_CHOICE',
      runsScored: 0,
      rbi: 0,
    },
    baseStateAfter: {
      firstSlotId: newFirstSlot,
      secondSlotId: newSecondSlot,
      thirdSlotId: newThirdSlot,
    },
  })
}
```

`handleDpRunnerOut` analog umbauen:

```typescript
const handleDpRunnerOut = ({ runnerSlotId, fromBase }: { runnerSlotId: number; fromBase: 1 | 2 | 3 }) => {
  if (pendingDpRequest == null) return
  const after: BogenBaseStateDto = {
    firstSlotId: runnerFromBase === 1 ? null : baseState.firstSlotId,
    secondSlotId: runnerFromBase === 2 ? null : baseState.secondSlotId,
    thirdSlotId: runnerFromBase === 3 ? null : baseState.thirdSlotId,
  }
  void runnerSlotId
  void fromBase
  // Hack: TS happy
  const realAfter: BogenBaseStateDto = {
    firstSlotId: fromBase === 1 ? null : baseState.firstSlotId,
    secondSlotId: fromBase === 2 ? null : baseState.secondSlotId,
    thirdSlotId: fromBase === 3 ? null : baseState.thirdSlotId,
  }
  setPendingDpRequest(null)
  setPendingChainPicker({
    initialFielder: pendingDpRequest.fielder,
    baseRequest: {
      result: 'OUT',
      outType: 'DOUBLE_PLAY',
      runsScored: 0,
      rbi: 0,
    },
    baseStateAfter: realAfter,
  })
  void after
}
```

(Note: `after`/`realAfter` doppelt ist Codereste vom Refactor — clean machen.)

`handleChainPickerConfirm`:
```typescript
const handleChainPickerConfirm = (chain: number[]) => {
  if (pendingChainPicker == null) return
  onSubmit({
    ...pendingChainPicker.baseRequest,
    fielderChain: chain,
    baseStateAfter: pendingChainPicker.baseStateAfter,
  })
  setPendingChainPicker(null)
  setSelectedFielder(null)
}
```

JSX-Block einfügen (vor anderen Picker):

```typescript
{pendingChainPicker != null ? (
  <ChainPickerView
    initialFielder={pendingChainPicker.initialFielder}
    onConfirm={handleChainPickerConfirm}
    onBack={() => setPendingChainPicker(null)}
  />
) : pendingRunnerOutRequest != null ? (
  ...
```

- [ ] **Step 3: Tests**

In `OutDetailDrawer.test.tsx` ergänzen:

```typescript
describe('OutDetailDrawer Chain-Picker', () => {
  it('Fielder Choice + Solo-Tap → submit chain length 1', async () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={{ firstSlotId: null, secondSlotId: null, thirdSlotId: 9 }}
        slots={slots}
        batterSlotId={1}
        outs={0}
      />
    )
    // Tap SS (6) als Fielder
    fireEvent.click(screen.getByLabelText('Feldposition 6 SS'))
    // Pick Fielder's Choice
    fireEvent.click(screen.getByText(/Fielder's Choice/i))
    // Pick Runner3B als getagged
    fireEvent.click(await screen.findByText(/auf 3B/i))
    // Chain-Picker öffnet — Initial chain = [6]
    expect(await screen.findByText(/Solo \(6 unassisted\)/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Bestätigen/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        outType: 'FIELDERS_CHOICE',
        fielderChain: [6],
      })
    )
  })

  it('Chain-Picker + Reset + 2 Taps → submit chain [5, 6]', async () => {
    const onSubmit = vi.fn()
    render(
      <OutDetailDrawer
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        baseStateAfter={{ firstSlotId: 1, secondSlotId: null, thirdSlotId: null }}
        slots={[
          { id: 1, side: 'AWAY' as const, slot: 1, name: 'A', position: 1, battingOrder: 1 },
        ]}
        batterSlotId={42}
        outs={0}
      />
    )
    fireEvent.click(screen.getByLabelText('Feldposition 6 SS'))
    fireEvent.click(screen.getByText(/Fielder's Choice/i))
    fireEvent.click(await screen.findByText(/auf 1B/i))
    // Chain-Picker offen — initial [6]. Reset.
    fireEvent.click(screen.getByText(/Reset/i))
    // Tap 5 (3B) zuerst, dann 6 (SS)
    fireEvent.click(screen.getByLabelText('Feldposition 5 3B'))
    fireEvent.click(screen.getByLabelText('Feldposition 6 SS'))
    fireEvent.click(screen.getByText(/Bestätigen/i))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        fielderChain: [5, 6],
      })
    )
  })
})
```

- [ ] **Step 4: Tests grün**

```bash
cd frontend && npx vitest run
```

- [ ] **Step 5: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/spielbogen/OutDetailDrawer.tsx frontend/src/components/spielbogen/OutDetailDrawer.test.tsx
git commit -m "✨ Spielbogen: Mini-Field-Chain-Picker für FC/DP Runner-Out (1-2 Taps)"
```

---

## Final Verification

- [ ] **Alle Tests grün**

```bash
cd frontend && npx vitest run
```

- [ ] **Build sauber**

```bash
cd frontend && npm run build
```

- [ ] **Lint clean**

```bash
cd frontend && npm run lint
```

- [ ] **Manuell-Smoke** (alle 5 Punkte):
  1. FlyOut bei 2 Outs → kein Tag-Up-Picker, direkt Submit.
  2. PDF-Export anzeigen → Roman-Zahlen schwarz + bold.
  3. Strikeout=3rd-Out → kein Doppel-Flash, Center "STRIKEOUT · SEITENWECHSEL".
  4. ERROR-Button Tier-2 (orange) → Drawer → Fielder-Tap → Batter auf 1B safe.
  5. FC oder DP → Chain-Picker mit Mini-Field → Solo oder Multi-Tap → Confirm.

---

## Open Questions / Tech-Debt

- D: ChainPickerView teilt SVG/Field-Positions mit OutDetailDrawer + ErrorPickerDrawer. Im nächsten Refactor: shared `<MiniField>`-Komponente extrahieren.
- E: Manueller Side-Switch zeigt fallback-Subtitle "Seitenwechsel" ohne lastOutType. Optional: useEffect könnte letzte AB lesen aus sheet, aber Komplexität nicht wert.
- C: ErrorPickerDrawer + OutDetailDrawer dupliziert FIELD_POSITIONS-Konstante. Ebenfalls Kandidat für shared.
