# Training-Page-Konsolidierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Konsolidiere `/training` + `/training-plan` zu einer mobile-first `/training`-Page mit Anwesenheit (primary) + Plan (secondary) + Stats-Drawer (Bars für 3M-Cross-Season + Jahres-Quote pro Spieler).

**Architecture:** Neuer `useAttendanceStats`-Hook berechnet Quoten clientseitig aus existing `getAllAttendance`-API über date-Range-Filter. Sonner ersetzt eigenes ToastProvider für Undo-UX. Vertikal-gestackt mobile, 2-Spalten Desktop via Tailwind. vaul-Drawer für Stats + Plan-Edit. 4 Phasen, Tests pro Phase, Push pro Phase.

**Tech Stack:** React 19, Vite 7, TypeScript, Tailwind v4, motion/react, vaul, sonner (neu), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-12-training-page-consolidation-design.md`

---

## File Structure

**Phase 1 — neue Page + Stats**

Neu:
- `frontend/src/hooks/useAttendanceStats.ts` — Computation 3M + Jahres-Quoten
- `frontend/src/hooks/useAttendanceStats.test.ts` — Stats-Math-Tests
- `frontend/src/components/training/AttendanceList.tsx` — Liste mit Icon-Toggle + Inline-Quoten
- `frontend/src/components/training/AttendanceList.test.tsx`
- `frontend/src/components/training/AttendanceCounter.tsx` — Sticky-Header-Counter
- `frontend/src/components/training/StatsDrawer.tsx` — Bars + Aggregate
- `frontend/src/components/training/StatsDrawer.test.tsx`
- `frontend/src/components/training/TrainingTodayPage.tsx` — neue Top-Level-Page
- `frontend/e2e/training/training-attendance.spec.ts`
- `frontend/e2e/training/training-stats.spec.ts`

Geändert:
- `frontend/package.json` — sonner devDep
- `frontend/src/App.tsx` — Route updaten, alte als `/training-history`
- `frontend/src/components/layout/Layout.tsx` — Toast-Provider auf sonner

**Phase 2 — Plan-Edit-Drawer**

Neu:
- `frontend/src/components/training/PlanEditDrawer.tsx`
- `frontend/src/components/training/PlanEditDrawer.test.tsx`
- `frontend/e2e/training/training-plan-edit.spec.ts`

**Phase 3 — History-Matrix**

Neu:
- `frontend/src/components/training/HistoryMatrix.tsx` (extrahiert aus alter TrainingPage)
- `frontend/src/components/training/HistoryMatrix.test.tsx`
- StatsDrawer erweitert um Matrix-Tab
- `frontend/e2e/training/training-history.spec.ts`

**Phase 4 — Cleanup**

Gelöscht:
- `frontend/src/components/training-plan/TrainingPlanPage.tsx` (Power-Edit-Components bleiben falls reused)
- Alte `frontend/src/components/training/TrainingPage.tsx` (Multi-Day-Matrix-Version)

---

# PHASE 1 — Neue `/training` Page

## Task 1.1: Sonner Install + Toast-Migration

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/components/layout/Layout.tsx` (oder wo ToastProvider lebt)
- Modify: alle existing `toast.show(...)`-Aufrufe (Migration)

- [ ] **Step 1: Install Sonner**

```bash
cd /home/hungl/privat/softball-lineup/frontend
npm install sonner
```

- [ ] **Step 2: Setup Toaster im Layout**

In `frontend/src/components/layout/Layout.tsx` ergänze:

```typescript
import { Toaster } from 'sonner'
```

Im JSX am Ende vor dem schließenden Root-Wrapper:
```tsx
<Toaster position="top-center" richColors closeButton />
```

- [ ] **Step 3: Alle existing toast.show()-Calls auf sonner umstellen**

Suche alle Verwendungen:
```bash
grep -rn "toast.show" frontend/src --include='*.tsx' --include='*.ts'
```

Pro Datei: `import { toast } from 'sonner'`, dann `toast.show('msg', 'success')` → `toast.success('msg')`, `'error'` → `toast.error()`.

Existing `useToast`/`ToastProvider` (falls vorhanden) als deprecated lassen, NICHT entfernen — eigenes Cleanup-Task später.

- [ ] **Step 4: Build + smoke**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run build
```
Expected: SUCCESS, no TS errors.

- [ ] **Step 5: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/package.json frontend/package-lock.json frontend/src/
git commit -m "✨ Sonner: Toast-Library für Undo-UX adoptiert"
```

## Task 1.2: useAttendanceStats Hook + Tests

**Files:**
- Create: `frontend/src/hooks/useAttendanceStats.ts`
- Create: `frontend/src/hooks/useAttendanceStats.test.ts`

- [ ] **Step 1: Test-Datei mit fixtures schreiben**

```typescript
// frontend/src/hooks/useAttendanceStats.test.ts
import { describe, it, expect } from 'vitest'
import { computeAttendanceStats } from './useAttendanceStats'

type Training = { id: number; date: string; cancelled?: boolean }
type AttendanceRecord = { playerId: number; present: boolean }

const NOW = new Date('2026-05-12T12:00:00Z')

function training(id: number, daysAgo: number): Training {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return { id, date: d.toISOString().slice(0, 10) }
}

describe('computeAttendanceStats', () => {
  it('returns 0/0 wenn keine Trainings', () => {
    const stats = computeAttendanceStats({ trainings: [], attendance: new Map(), playerId: 1, now: NOW })
    expect(stats.last3Months.attended).toBe(0)
    expect(stats.last3Months.total).toBe(0)
    expect(stats.last3Months.percentage).toBe(0)
    expect(stats.lastYear.attended).toBe(0)
    expect(stats.lastYear.total).toBe(0)
  })

  it('zählt Trainings nur innerhalb 3-Monats-Fenster (90 Tage)', () => {
    const trainings = [
      training(1, 30),  // in 3M
      training(2, 60),  // in 3M
      training(3, 89),  // gerade noch in 3M
      training(4, 91),  // außerhalb 3M
      training(5, 200), // außerhalb 3M, in Jahr
    ]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    att.set(2, new Map([[1, false]]))
    att.set(3, new Map([[1, true]]))
    att.set(4, new Map([[1, true]]))
    att.set(5, new Map([[1, true]]))

    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.last3Months.total).toBe(3)
    expect(stats.last3Months.attended).toBe(2)
    expect(stats.last3Months.percentage).toBe(67) // round 2/3
  })

  it('zählt Trainings innerhalb 365-Tage-Fenster', () => {
    const trainings = [
      training(1, 30),
      training(2, 200),
      training(3, 360),
      training(4, 370), // außerhalb Jahr
    ]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    att.set(2, new Map([[1, true]]))
    att.set(3, new Map([[1, true]]))
    att.set(4, new Map([[1, true]]))

    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.lastYear.total).toBe(3)
    expect(stats.lastYear.attended).toBe(3)
    expect(stats.lastYear.percentage).toBe(100)
  })

  it('ignoriert cancelled Trainings', () => {
    const trainings = [
      training(1, 10),
      { ...training(2, 20), cancelled: true },
      training(3, 30),
    ]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    att.set(2, new Map([[1, true]])) // cancelled — should not count
    att.set(3, new Map([[1, false]]))

    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.last3Months.total).toBe(2)
    expect(stats.last3Months.attended).toBe(1)
  })

  it('missing attendance-entry zählt als nicht-anwesend', () => {
    const trainings = [training(1, 10), training(2, 20), training(3, 30)]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    // training 2 + 3 haben keine Records für playerId=1 → counted as not-present

    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.last3Months.total).toBe(3)
    expect(stats.last3Months.attended).toBe(1)
    expect(stats.last3Months.percentage).toBe(33)
  })

  it('arbeitet cross-season — Trainings über Periode-Grenzen', () => {
    // Spec sagt: 3M cross-season heißt rolling 90 days IGNORIERT Period-Boundaries
    // Test stellt sicher dass alle Trainings im Datums-Bereich zählen, egal zu welcher Period sie gehören
    const trainings = [training(1, 10), training(2, 30), training(3, 60)] // 3 verschiedene Periods denkbar
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    att.set(2, new Map([[1, true]]))
    att.set(3, new Map([[1, true]]))

    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.last3Months.total).toBe(3)
    expect(stats.last3Months.attended).toBe(3)
  })

  it('rundet Prozent korrekt — kein Off-by-One', () => {
    const trainings = [training(1, 5), training(2, 10), training(3, 15)]
    const att = new Map<number, Map<number, boolean>>()
    att.set(1, new Map([[1, true]]))
    att.set(2, new Map([[1, true]]))
    att.set(3, new Map([[1, false]]))

    const stats = computeAttendanceStats({ trainings, attendance: att, playerId: 1, now: NOW })
    expect(stats.last3Months.percentage).toBe(67) // 2/3 = 0.6667 → 67
  })
})
```

- [ ] **Step 2: Run — expect COMPILE FAIL**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm test -- useAttendanceStats
```
Expected: `Cannot find module './useAttendanceStats'`

- [ ] **Step 3: Hook implementieren**

```typescript
// frontend/src/hooks/useAttendanceStats.ts
import { useMemo } from 'react'
import type { TrainingResponse } from '@/types'

export type AttendanceWindow = {
  attended: number
  total: number
  percentage: number
}

export type PlayerAttendanceStats = {
  last3Months: AttendanceWindow
  lastYear: AttendanceWindow
}

type Args = {
  trainings: { id: number; date: string; cancelled?: boolean }[]
  attendance: Map<number, Map<number, boolean>>
  playerId: number
  now?: Date
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function computeAttendanceStats({ trainings, attendance, playerId, now = new Date() }: Args): PlayerAttendanceStats {
  const cutoff3M = new Date(now.getTime() - 90 * MS_PER_DAY)
  const cutoff1Y = new Date(now.getTime() - 365 * MS_PER_DAY)

  let in3M = { attended: 0, total: 0 }
  let in1Y = { attended: 0, total: 0 }

  for (const t of trainings) {
    if (t.cancelled) continue
    const tDate = new Date(t.date)
    if (Number.isNaN(tDate.getTime())) continue
    const inThreeMonths = tDate >= cutoff3M
    const inYear = tDate >= cutoff1Y
    if (!inYear) continue

    const present = attendance.get(t.id)?.get(playerId) === true
    if (inThreeMonths) {
      in3M.total += 1
      if (present) in3M.attended += 1
    }
    in1Y.total += 1
    if (present) in1Y.attended += 1
  }

  return {
    last3Months: {
      attended: in3M.attended,
      total: in3M.total,
      percentage: in3M.total === 0 ? 0 : Math.round((in3M.attended / in3M.total) * 100),
    },
    lastYear: {
      attended: in1Y.attended,
      total: in1Y.total,
      percentage: in1Y.total === 0 ? 0 : Math.round((in1Y.attended / in1Y.total) * 100),
    },
  }
}

export function useAttendanceStats(args: Args): PlayerAttendanceStats {
  return useMemo(() => computeAttendanceStats(args), [args.trainings, args.attendance, args.playerId, args.now])
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm test -- useAttendanceStats
```
Expected: 7/7 PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/src/hooks/useAttendanceStats.ts frontend/src/hooks/useAttendanceStats.test.ts
git commit -m "✨ useAttendanceStats: 3M + Jahres-Quote-Computation cross-season"
```

## Task 1.3: AttendanceCounter Component

**Files:**
- Create: `frontend/src/components/training/AttendanceCounter.tsx`
- Create: `frontend/src/components/training/AttendanceCounter.test.tsx`

- [ ] **Step 1: Test schreiben**

```typescript
// frontend/src/components/training/AttendanceCounter.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AttendanceCounter } from './AttendanceCounter'

describe('AttendanceCounter', () => {
  it('zeigt Anzahl/Total und Prozent', () => {
    render(<AttendanceCounter present={8} total={15} />)
    expect(screen.getByText('8 / 15')).toBeInTheDocument()
    expect(screen.getByText('53%')).toBeInTheDocument()
  })

  it('zeigt 0% wenn total=0', () => {
    render(<AttendanceCounter present={0} total={0} />)
    expect(screen.getByText('0 / 0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('zeigt 100% wenn alle da', () => {
    render(<AttendanceCounter present={5} total={5} />)
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- AttendanceCounter
```
Expected: `Cannot find module './AttendanceCounter'`

- [ ] **Step 3: Component implementieren**

```typescript
// frontend/src/components/training/AttendanceCounter.tsx
type Props = { present: number; total: number }

export function AttendanceCounter({ present, total }: Props) {
  const percentage = total === 0 ? 0 : Math.round((present / total) * 100)
  return (
    <div className="bg-white border border-cream-300 rounded-2xl p-4 shadow-sm">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-5xl font-black text-navy-800 tabular-nums">
          {present} / {total}
        </span>
        <span className="font-display text-lg font-bold text-navy-600 tabular-nums">{percentage}%</span>
      </div>
      <div className="mt-3 h-2 bg-cream-200 rounded-full overflow-hidden">
        <div className="h-full bg-navy-700 transition-all duration-300" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Test passes**

```bash
npm test -- AttendanceCounter
```
Expected: 3/3 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/training/AttendanceCounter.tsx frontend/src/components/training/AttendanceCounter.test.tsx
git commit -m "✨ AttendanceCounter: Sticky-Header X/Y · Z% Komponente"
```

## Task 1.4: AttendanceList Component

**Files:**
- Create: `frontend/src/components/training/AttendanceList.tsx`
- Create: `frontend/src/components/training/AttendanceList.test.tsx`

- [ ] **Step 1: Test schreiben**

```typescript
// frontend/src/components/training/AttendanceList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AttendanceList } from './AttendanceList'
import type { Player } from '@/types'

const mockPlayer = (id: number, name: string): Player => ({ id, name } as Player)

describe('AttendanceList', () => {
  it('rendert alle Spieler mit Name', () => {
    const players = [mockPlayer(1, 'Khang'), mockPlayer(2, 'Hung')]
    const stats = new Map([
      [1, { last3Months: { attended: 12, total: 15, percentage: 80 }, lastYear: { attended: 36, total: 50, percentage: 72 } }],
      [2, { last3Months: { attended: 7, total: 15, percentage: 47 }, lastYear: { attended: 20, total: 50, percentage: 40 } }],
    ])
    const present = new Set<number>()
    render(<AttendanceList players={players} stats={stats} presentIds={present} onToggle={vi.fn()} sortBy="quote" />)
    expect(screen.getByText('Khang')).toBeInTheDocument()
    expect(screen.getByText('Hung')).toBeInTheDocument()
  })

  it('zeigt Quote-Inline 3M und Jahr', () => {
    const players = [mockPlayer(1, 'Khang')]
    const stats = new Map([
      [1, { last3Months: { attended: 12, total: 15, percentage: 80 }, lastYear: { attended: 36, total: 50, percentage: 72 } }],
    ])
    render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={vi.fn()} sortBy="quote" />)
    expect(screen.getByText(/3M 80%/i)).toBeInTheDocument()
    expect(screen.getByText(/J 72%/i)).toBeInTheDocument()
  })

  it('sortiert nach Quote DESC bei sortBy=quote', () => {
    const players = [
      mockPlayer(1, 'Alice'),  // 30%
      mockPlayer(2, 'Bob'),    // 80%
      mockPlayer(3, 'Charlie'),// 50%
    ]
    const stats = new Map([
      [1, { last3Months: { attended: 3, total: 10, percentage: 30 }, lastYear: { attended: 10, total: 30, percentage: 33 } }],
      [2, { last3Months: { attended: 8, total: 10, percentage: 80 }, lastYear: { attended: 24, total: 30, percentage: 80 } }],
      [3, { last3Months: { attended: 5, total: 10, percentage: 50 }, lastYear: { attended: 15, total: 30, percentage: 50 } }],
    ])
    const { container } = render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={vi.fn()} sortBy="quote" />)
    const names = Array.from(container.querySelectorAll('[data-player-name]')).map(el => el.textContent)
    expect(names).toEqual(['Bob', 'Charlie', 'Alice'])
  })

  it('sortiert alphabetisch bei sortBy=alpha', () => {
    const players = [mockPlayer(2, 'Bob'), mockPlayer(1, 'Alice'), mockPlayer(3, 'Charlie')]
    const stats = new Map([
      [1, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
      [2, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
      [3, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
    ])
    const { container } = render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={vi.fn()} sortBy="alpha" />)
    const names = Array.from(container.querySelectorAll('[data-player-name]')).map(el => el.textContent)
    expect(names).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('ruft onToggle mit playerId bei Icon-Klick', () => {
    const onToggle = vi.fn()
    const players = [mockPlayer(1, 'Khang')]
    const stats = new Map([[1, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }]])
    render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={onToggle} sortBy="quote" />)
    const icon = screen.getByRole('button', { name: /Khang.*togglen/i })
    fireEvent.click(icon)
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it('zeigt anwesend-Status visuell anders', () => {
    const players = [mockPlayer(1, 'Khang')]
    const stats = new Map([[1, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }]])
    const { container, rerender } = render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={vi.fn()} sortBy="quote" />)
    const iconBefore = container.querySelector('[data-attendance-icon]')
    expect(iconBefore?.getAttribute('data-present')).toBe('false')

    rerender(<AttendanceList players={players} stats={stats} presentIds={new Set([1])} onToggle={vi.fn()} sortBy="quote" />)
    const iconAfter = container.querySelector('[data-attendance-icon]')
    expect(iconAfter?.getAttribute('data-present')).toBe('true')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- AttendanceList
```

- [ ] **Step 3: Component implementieren**

```typescript
// frontend/src/components/training/AttendanceList.tsx
import type { Player } from '@/types'
import type { PlayerAttendanceStats } from '@/hooks/useAttendanceStats'

type SortBy = 'quote' | 'alpha'

type Props = {
  players: Player[]
  stats: Map<number, PlayerAttendanceStats>
  presentIds: Set<number>
  onToggle: (playerId: number) => void
  sortBy: SortBy
}

function colorClass(percentage: number, present: boolean): { icon: string; name: string; quote: string } {
  if (percentage >= 70) return {
    icon: present ? 'bg-navy-800' : 'border-2 border-navy-400',
    name: 'text-navy-900 font-semibold',
    quote: 'text-navy-700',
  }
  if (percentage < 30) return {
    icon: present ? 'bg-softball-red-500' : 'border-2 border-softball-red-300',
    name: 'text-softball-red-700',
    quote: 'text-softball-red-500',
  }
  return {
    icon: present ? 'bg-navy-600' : 'border-2 border-cream-400',
    name: 'text-navy-800',
    quote: 'text-navy-600',
  }
}

export function AttendanceList({ players, stats, presentIds, onToggle, sortBy }: Props) {
  const sorted = [...players].sort((a, b) => {
    if (sortBy === 'alpha') return a.name.localeCompare(b.name)
    const qA = stats.get(a.id)?.last3Months.percentage ?? 0
    const qB = stats.get(b.id)?.last3Months.percentage ?? 0
    if (qA !== qB) return qB - qA
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden">
      {sorted.map(p => {
        const s = stats.get(p.id) ?? { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }
        const present = presentIds.has(p.id)
        const colors = colorClass(s.last3Months.percentage, present)
        return (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0">
            <button
              type="button"
              aria-label={`${p.name} Anwesenheit togglen`}
              onClick={() => onToggle(p.id)}
              className="w-11 h-11 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
            >
              <span
                data-attendance-icon
                data-present={present ? 'true' : 'false'}
                className={`w-6 h-6 rounded-full ${colors.icon}`}
              />
            </button>
            <span data-player-name className={`flex-1 ${colors.name}`}>{p.name}</span>
            <span className={`text-sm tabular-nums ${colors.quote}`}>
              <span className="font-semibold">3M {s.last3Months.percentage}%</span>
              <span className="text-xs ml-2 opacity-70">J {s.lastYear.percentage}%</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Tests passen**

```bash
npm test -- AttendanceList
```
Expected: 6/6 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/training/AttendanceList.tsx frontend/src/components/training/AttendanceList.test.tsx
git commit -m "✨ AttendanceList: Icon-Toggle + Inline-Quote (3M+J) + Color-Coded"
```

## Task 1.5: StatsDrawer Component

**Files:**
- Create: `frontend/src/components/training/StatsDrawer.tsx`
- Create: `frontend/src/components/training/StatsDrawer.test.tsx`

- [ ] **Step 1: Test schreiben**

```typescript
// frontend/src/components/training/StatsDrawer.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsDrawer } from './StatsDrawer'
import type { Player } from '@/types'

const mockPlayer = (id: number, name: string): Player => ({ id, name } as Player)

describe('StatsDrawer', () => {
  it('zeigt Bars für jeden Spieler', () => {
    const players = [mockPlayer(1, 'Khang'), mockPlayer(2, 'Hung')]
    const stats = new Map([
      [1, { last3Months: { attended: 12, total: 15, percentage: 80 }, lastYear: { attended: 36, total: 50, percentage: 72 } }],
      [2, { last3Months: { attended: 7, total: 15, percentage: 47 }, lastYear: { attended: 20, total: 50, percentage: 40 } }],
    ])
    render(<StatsDrawer open={true} onClose={() => {}} players={players} stats={stats} avgPresent={8.2} totalTrainings={15} />)
    expect(screen.getByText('Khang')).toBeInTheDocument()
    expect(screen.getByText('Hung')).toBeInTheDocument()
    expect(screen.getByText(/12.*15/)).toBeInTheDocument()
    expect(screen.getByText(/7.*15/)).toBeInTheDocument()
  })

  it('zeigt Aggregate-Section mit Durchschnitt', () => {
    render(<StatsDrawer open={true} onClose={() => {}} players={[]} stats={new Map()} avgPresent={8.2} totalTrainings={15} />)
    expect(screen.getByText(/8\.2/)).toBeInTheDocument()
  })

  it('sortiert Bars nach Quote DESC', () => {
    const players = [
      mockPlayer(1, 'Alice'),
      mockPlayer(2, 'Bob'),
      mockPlayer(3, 'Charlie'),
    ]
    const stats = new Map([
      [1, { last3Months: { attended: 3, total: 10, percentage: 30 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
      [2, { last3Months: { attended: 8, total: 10, percentage: 80 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
      [3, { last3Months: { attended: 5, total: 10, percentage: 50 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
    ])
    const { container } = render(<StatsDrawer open={true} onClose={() => {}} players={players} stats={stats} avgPresent={5} totalTrainings={10} />)
    const names = Array.from(container.querySelectorAll('[data-stats-row-name]')).map(el => el.textContent)
    expect(names).toEqual(['Bob', 'Charlie', 'Alice'])
  })

  it('rendert nichts wenn open=false', () => {
    render(<StatsDrawer open={false} onClose={() => {}} players={[mockPlayer(1, 'Khang')]} stats={new Map()} avgPresent={0} totalTrainings={0} />)
    expect(screen.queryByText('Khang')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- StatsDrawer
```

- [ ] **Step 3: Component implementieren**

```typescript
// frontend/src/components/training/StatsDrawer.tsx
import { Drawer } from 'vaul'
import type { Player } from '@/types'
import type { PlayerAttendanceStats } from '@/hooks/useAttendanceStats'

type Props = {
  open: boolean
  onClose: () => void
  players: Player[]
  stats: Map<number, PlayerAttendanceStats>
  avgPresent: number
  totalTrainings: number
}

function barColor(percentage: number): string {
  if (percentage >= 70) return 'bg-navy-700'
  if (percentage < 30) return 'bg-softball-red-400'
  return 'bg-navy-500'
}

export function StatsDrawer({ open, onClose, players, stats, avgPresent, totalTrainings }: Props) {
  const sorted = [...players].sort((a, b) => {
    const qA = stats.get(a.id)?.last3Months.percentage ?? 0
    const qB = stats.get(b.id)?.last3Months.percentage ?? 0
    return qB - qA || a.name.localeCompare(b.name)
  })

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[85vh] overflow-y-auto focus:outline-none">
          <Drawer.Title className="sr-only">Anwesenheits-Statistik</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
          <div className="px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <div>
              <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">Anwesenheits-Statistik</h2>
              <p className="text-xs text-navy-600">Letzte 3 Monate · {totalTrainings} Trainings</p>
            </div>

            <div className="bg-white border border-cream-300 rounded-xl p-3 space-y-2">
              {sorted.map(p => {
                const s = stats.get(p.id) ?? { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span data-stats-row-name className="w-24 text-sm font-medium text-navy-900 truncate">{p.name}</span>
                    <div className="flex-1 h-2.5 bg-cream-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor(s.last3Months.percentage)} transition-all duration-300`}
                        style={{ width: `${s.last3Months.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-navy-700 w-20 text-right">
                      {s.last3Months.attended}/{s.last3Months.total} · {s.last3Months.percentage}%
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border border-cream-300 rounded-xl p-3">
                <div className="text-xs text-navy-500 uppercase tracking-wide">⌀ Spieler</div>
                <div className="font-display text-2xl font-black text-navy-800 tabular-nums">{avgPresent.toFixed(1)}</div>
              </div>
              <div className="bg-white border border-cream-300 rounded-xl p-3">
                <div className="text-xs text-navy-500 uppercase tracking-wide">Trainings</div>
                <div className="font-display text-2xl font-black text-navy-800 tabular-nums">{totalTrainings}</div>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 4: Tests passen**

```bash
npm test -- StatsDrawer
```
Expected: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/training/StatsDrawer.tsx frontend/src/components/training/StatsDrawer.test.tsx
git commit -m "✨ StatsDrawer: Bars-Visualisierung + Aggregate (vaul-Drawer)"
```

## Task 1.6: TrainingTodayPage — Top-Level-Page

**Files:**
- Create: `frontend/src/components/training/TrainingTodayPage.tsx`

- [ ] **Step 1: Page-Component schreiben**

```typescript
// frontend/src/components/training/TrainingTodayPage.tsx
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useTraining } from '@/hooks/useTraining'
import { usePlayers } from '@/hooks/usePlayers'
import { computeAttendanceStats } from '@/hooks/useAttendanceStats'
import { AttendanceList } from './AttendanceList'
import { AttendanceCounter } from './AttendanceCounter'
import { StatsDrawer } from './StatsDrawer'
import { BarChart3 } from '@/icons'

type SortBy = 'quote' | 'alpha'

export function TrainingTodayPage() {
  const { trainings, attendance, toggleAttendance } = useTraining()
  const { players } = usePlayers()
  const [sortBy, setSortBy] = useState<SortBy>('quote')
  const [statsOpen, setStatsOpen] = useState(false)

  // Heutiges/aktuelles Training: nächstes nicht-cancelled in der Zukunft, oder letztes vergangenes
  const todayTraining = useMemo(() => {
    const now = new Date()
    const sorted = [...trainings].filter(t => !t.cancelled).sort((a, b) => a.date.localeCompare(b.date))
    const upcoming = sorted.find(t => new Date(t.date) >= now)
    return upcoming ?? sorted[sorted.length - 1] ?? null
  }, [trainings])

  const presentIds = useMemo(() => {
    if (!todayTraining) return new Set<number>()
    const map = attendance.get(todayTraining.id) ?? new Map()
    return new Set([...map.entries()].filter(([, present]) => present).map(([id]) => id))
  }, [attendance, todayTraining])

  const stats = useMemo(() => {
    const m = new Map<number, ReturnType<typeof computeAttendanceStats>>()
    for (const p of players) {
      m.set(p.id, computeAttendanceStats({ trainings, attendance, playerId: p.id }))
    }
    return m
  }, [players, trainings, attendance])

  const totalTrainings = trainings.filter(t => !t.cancelled).length

  const avgPresent = useMemo(() => {
    if (totalTrainings === 0) return 0
    let sum = 0
    for (const t of trainings) {
      if (t.cancelled) continue
      const map = attendance.get(t.id) ?? new Map()
      const presentCount = [...map.values()].filter(v => v === true).length
      sum += presentCount
    }
    return sum / totalTrainings
  }, [attendance, trainings, totalTrainings])

  const handleToggle = async (playerId: number) => {
    if (!todayTraining) return
    const wasPresent = presentIds.has(playerId)
    const player = players.find(p => p.id === playerId)
    try {
      await toggleAttendance(todayTraining.id, playerId, !wasPresent)
      toast.success(`${player?.name} ${!wasPresent ? 'anwesend' : 'abwesend'}`, {
        action: { label: 'Rückgängig', onClick: () => toggleAttendance(todayTraining.id, playerId, wasPresent) },
      })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (!todayTraining) {
    return (
      <div className="min-h-screen bg-cream-50 p-4 flex items-center justify-center">
        <p className="text-navy-700">Kein Training verfügbar.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-extrabold text-navy-900 uppercase tracking-wide">
            Training
          </h1>
          <span className="text-sm text-navy-600">{new Date(todayTraining.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <AttendanceCounter present={presentIds.size} total={players.length} />
          </div>
          <button
            onClick={() => setStatsOpen(true)}
            className="bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold px-4 py-3 rounded-xl flex items-center gap-2 self-stretch"
          >
            <BarChart3 size={18} />
            <span className="hidden sm:inline">Statistik</span>
          </button>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-sm font-bold text-navy-700 uppercase tracking-wide">Anwesenheit</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setSortBy('quote')}
                  className={`px-2 py-1 text-xs rounded-md font-semibold ${sortBy === 'quote' ? 'bg-navy-700 text-white' : 'bg-cream-200 text-navy-700'}`}
                >
                  Quote ↓
                </button>
                <button
                  onClick={() => setSortBy('alpha')}
                  className={`px-2 py-1 text-xs rounded-md font-semibold ${sortBy === 'alpha' ? 'bg-navy-700 text-white' : 'bg-cream-200 text-navy-700'}`}
                >
                  A-Z
                </button>
              </div>
            </div>
            <AttendanceList
              players={players}
              stats={stats}
              presentIds={presentIds}
              onToggle={handleToggle}
              sortBy={sortBy}
            />
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-sm font-bold text-navy-700 uppercase tracking-wide">Trainingsplan</h2>
              <a
                href="/training-plan"
                className="text-xs font-semibold text-softball-red-700 hover:underline"
              >
                ✎ Bearbeiten
              </a>
            </div>
            <div className="bg-white border border-cream-300 rounded-2xl p-4 text-sm text-navy-700">
              <p className="opacity-70 italic">Plan-Anzeige folgt in Phase 2.</p>
            </div>
          </section>
        </div>

        <StatsDrawer
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
          players={players}
          stats={stats}
          avgPresent={avgPresent}
          totalTrainings={totalTrainings}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run build
```
Expected: SUCCESS. Falls TS-Errors wegen Icons: prüfe `@/icons/index.tsx` und ersetze `BarChart3` mit verfügbarem Icon (z.B. importiere aus lucide-react oder nutze custom).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/training/TrainingTodayPage.tsx
git commit -m "✨ TrainingTodayPage: Layout Anwesenheit + Plan-Slot + Stats-Drawer"
```

## Task 1.7: Routes + Nav Update

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Layout.tsx`

- [ ] **Step 1: Route ergänzen**

In `frontend/src/App.tsx` finde existing `/training` lazy + Route. Erstmal beide parallel:

```typescript
const TrainingTodayPage = lazy(() => import('@/components/training/TrainingTodayPage').then(m => ({ default: m.TrainingTodayPage })))
// ... existing TrainingPage import bleibt

// In den routes:
{ path: '/training', element: <Suspense fallback={<LoadingSkeleton />}><TrainingTodayPage /></Suspense> },
{ path: '/training-history', element: <Suspense fallback={<LoadingSkeleton />}><TrainingPage /></Suspense> },
// existing /training-plan bleibt
```

Default `/training` ist jetzt neue Page. Alte multi-day-Matrix via `/training-history`.

- [ ] **Step 2: Build check**

```bash
npm run build
```
Expected: SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "🔧 Routes: /training neue TrainingTodayPage, alte → /training-history"
```

## Task 1.8: E2E Test Phase 1

**Files:**
- Create: `frontend/e2e/training/training-attendance.spec.ts`

- [ ] **Step 1: E2E Test schreiben**

```typescript
// frontend/e2e/training/training-attendance.spec.ts
import { test, expect } from '../helpers/fixtures'

test.describe('Training — Attendance Page', () => {
  test('lädt /training und zeigt Counter + Liste @smoke', async ({ page, scoringPage }) => {
    // scoringPage-Fixture seedet Game (nicht Training direkt) — wir nutzen separate Navigation
    void scoringPage
    await page.goto('/training')
    await expect(page.getByRole('heading', { name: /Training/i })).toBeVisible({ timeout: 5000 })
    // Stats-Button sichtbar
    await expect(page.getByRole('button', { name: /Statistik/i })).toBeVisible()
  })

  test('Statistik-Drawer öffnet bei Button-Klick', async ({ page, scoringPage }) => {
    void scoringPage
    await page.goto('/training')
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /Statistik/i }).click()
    await page.waitForTimeout(400)
    await expect(page.getByText(/Anwesenheits-Statistik/i)).toBeVisible({ timeout: 1500 })
  })

  test('Sortier-Toggle wechselt zwischen Quote und A-Z', async ({ page, scoringPage }) => {
    void scoringPage
    await page.goto('/training')
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /^A-Z$/ }).click()
    await page.waitForTimeout(200)
    // Erster Spieler-Name should be alphabetisch first
    const firstName = await page.locator('[data-player-name]').first().textContent()
    expect(firstName).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run E2E**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm run test:e2e -- training-attendance.spec.ts
```
Expected: 3/3 PASS. Falls Backend keine Trainings hat → `seedTraining`-Helper später ergänzen.

- [ ] **Step 3: Commit + Push**

```bash
cd /home/hungl/privat/softball-lineup
git add frontend/e2e/training/training-attendance.spec.ts
git commit -m "✨ E2E: Training-Attendance Smoke + Stats-Drawer + Sort-Toggle"
git push origin master
```

## Task 1.9: Phase 1 Final-Test + Push

- [ ] **Step 1: Full Vitest**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm test
```
Expected: ALL PASS (alte + neue Tests).

- [ ] **Step 2: Full E2E**

```bash
npm run test:e2e
```
Expected: ALL PASS.

- [ ] **Step 3: Manueller Smoke-Test**

Start app local:
```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
cd frontend && npx vite
```

Navigiere `/training`, klicke Spieler, Stats-Drawer, Sortier-Toggle. Falls etwas hakt → fixen.

- [ ] **Step 4: Push (falls Schritte 1+2 OK)**

```bash
git push origin master
```

# PHASE 2 — Plan-Edit-Drawer

## Task 2.1: PlanEditDrawer Component

**Files:**
- Create: `frontend/src/components/training/PlanEditDrawer.tsx`
- Create: `frontend/src/components/training/PlanEditDrawer.test.tsx`

- [ ] **Step 1: Test schreiben**

```typescript
// frontend/src/components/training/PlanEditDrawer.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanEditDrawer } from './PlanEditDrawer'

describe('PlanEditDrawer', () => {
  it('rendert PlanForm wenn open=true', () => {
    render(<PlanEditDrawer open={true} onClose={vi.fn()} planContent={null} onSave={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /Plan bearbeiten/i })).toBeVisible()
  })

  it('ruft onClose bei Schließen', () => {
    const onClose = vi.fn()
    render(<PlanEditDrawer open={true} onClose={onClose} planContent={null} onSave={vi.fn()} />)
    const cancelBtn = screen.getByRole('button', { name: /Abbrechen/i })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('rendert nichts wenn open=false', () => {
    render(<PlanEditDrawer open={false} onClose={vi.fn()} planContent={null} onSave={vi.fn()} />)
    expect(screen.queryByRole('heading', { name: /Plan bearbeiten/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — FAIL**

```bash
npm test -- PlanEditDrawer
```

- [ ] **Step 3: Component implementieren**

```typescript
// frontend/src/components/training/PlanEditDrawer.tsx
import { Drawer } from 'vaul'
import type { TrainingPlanContentResponse } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  planContent: TrainingPlanContentResponse | null
  onSave: (content: TrainingPlanContentResponse) => Promise<void>
}

export function PlanEditDrawer({ open, onClose, planContent, onSave }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[90vh] overflow-y-auto focus:outline-none">
          <Drawer.Title className="sr-only">Plan bearbeiten</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
          <div className="px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">Plan bearbeiten</h2>

            <div className="bg-white border border-cream-300 rounded-xl p-4 text-sm text-navy-700">
              <p>Plan-Edit-Inhalt — Phase 2 minimal: zeigt aktuellen Plan als JSON-Snippet zur Verifikation.</p>
              <pre className="text-xs mt-2 overflow-x-auto">{JSON.stringify(planContent, null, 2)}</pre>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClose}
                className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100"
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  if (planContent) {
                    await onSave(planContent)
                    onClose()
                  }
                }}
                className="h-11 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold"
              >
                Speichern
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 4: Tests passen**

```bash
npm test -- PlanEditDrawer
```
Expected: 3/3 PASS.

- [ ] **Step 5: Integrate in TrainingTodayPage**

In `TrainingTodayPage.tsx` ergänzen:
- State `planEditOpen` + Plan-Hooks
- Pencil-Button öffnet `PlanEditDrawer`
- Plan-Read-Section zeigt geladenen Plan

(Details siehe existing `useTrainingPlan`-Hook im Projekt für API-Calls.)

- [ ] **Step 6: Commit + Push**

```bash
git add frontend/src/components/training/PlanEditDrawer.tsx frontend/src/components/training/PlanEditDrawer.test.tsx frontend/src/components/training/TrainingTodayPage.tsx
git commit -m "✨ PlanEditDrawer: Vaul-Drawer für Plan-Edit (Phase 2)"
git push origin master
```

## Task 2.2: E2E Plan-Edit

**Files:**
- Create: `frontend/e2e/training/training-plan-edit.spec.ts`

```typescript
import { test, expect } from '../helpers/fixtures'

test.describe('Training — Plan Edit', () => {
  test('Pencil-Button öffnet Plan-Edit-Drawer', async ({ page, scoringPage }) => {
    void scoringPage
    await page.goto('/training')
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /Bearbeiten|Edit/i }).first().click()
    await expect(page.getByRole('heading', { name: /Plan bearbeiten/i })).toBeVisible({ timeout: 1500 })
  })
})
```

- [ ] **Run + Commit + Push**

```bash
npm run test:e2e -- training-plan-edit.spec.ts
git add frontend/e2e/training/training-plan-edit.spec.ts
git commit -m "✨ E2E: Training-Plan-Edit-Drawer Smoke"
git push origin master
```

# PHASE 3 — History-Matrix in Stats-Drawer

## Task 3.1: HistoryMatrix Component + Stats-Drawer-Tab

**Files:**
- Create: `frontend/src/components/training/HistoryMatrix.tsx`
- Create: `frontend/src/components/training/HistoryMatrix.test.tsx`
- Modify: `frontend/src/components/training/StatsDrawer.tsx`

- [ ] **Step 1: Test**

```typescript
// frontend/src/components/training/HistoryMatrix.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoryMatrix } from './HistoryMatrix'
import type { Player } from '@/types'

const mockPlayer = (id: number, name: string): Player => ({ id, name } as Player)

describe('HistoryMatrix', () => {
  it('rendert Matrix mit Spielern und Trainings', () => {
    const players = [mockPlayer(1, 'Khang')]
    const trainings = [{ id: 1, date: '2026-05-01' }, { id: 2, date: '2026-05-08' }]
    const attendance = new Map([[1, new Map([[1, true]])], [2, new Map([[1, false]])]])
    render(<HistoryMatrix players={players} trainings={trainings} attendance={attendance} />)
    expect(screen.getByText('Khang')).toBeInTheDocument()
  })

  it('zeigt ✓ wenn anwesend, ✗ wenn nicht', () => {
    const players = [mockPlayer(1, 'Khang')]
    const trainings = [{ id: 1, date: '2026-05-01' }]
    const attendance = new Map([[1, new Map([[1, true]])]])
    const { container } = render(<HistoryMatrix players={players} trainings={trainings} attendance={attendance} />)
    expect(container.querySelector('[data-attendance="true"]')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Component**

```typescript
// frontend/src/components/training/HistoryMatrix.tsx
import type { Player } from '@/types'

type Training = { id: number; date: string; cancelled?: boolean }

type Props = {
  players: Player[]
  trainings: Training[]
  attendance: Map<number, Map<number, boolean>>
}

export function HistoryMatrix({ players, trainings, attendance }: Props) {
  const sortedTrainings = [...trainings].filter(t => !t.cancelled).sort((a, b) => a.date.localeCompare(b.date))
  return (
    <div className="overflow-x-auto bg-white border border-cream-300 rounded-xl">
      <table className="text-xs tabular-nums">
        <thead className="bg-cream-100">
          <tr>
            <th className="sticky left-0 bg-cream-100 px-3 py-2 text-left font-semibold text-navy-900">Spieler</th>
            {sortedTrainings.map(t => (
              <th key={t.id} className="px-2 py-2 text-navy-700 font-medium whitespace-nowrap">
                {new Date(t.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id} className="border-t border-cream-200">
              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-navy-800">{p.name}</td>
              {sortedTrainings.map(t => {
                const present = attendance.get(t.id)?.get(p.id) === true
                return (
                  <td key={t.id} data-attendance={present ? 'true' : 'false'} className="px-2 py-2 text-center">
                    {present ? <span className="text-navy-800">✓</span> : <span className="text-cream-400">✗</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: StatsDrawer um Tabs erweitern**

Erweitere `StatsDrawer.tsx` um Tab-State + Render von HistoryMatrix wenn aktiv. Code dafür: zwei Tab-Buttons, conditional Render.

- [ ] **Step 4: Tests + Commit + Push**

```bash
npm test
npm run test:e2e
git add frontend/src/components/training/HistoryMatrix.tsx frontend/src/components/training/HistoryMatrix.test.tsx frontend/src/components/training/StatsDrawer.tsx
git commit -m "✨ HistoryMatrix in Stats-Drawer (Phase 3)"
git push origin master
```

# PHASE 4 — Cleanup

## Task 4.1: Routes-Cleanup

- [ ] Lösche `/training-plan` Route, redirect zu `/training`
- [ ] Lösche `/training-history` Route (Matrix jetzt in Drawer)
- [ ] Entferne old `TrainingPage.tsx` (multi-day-Matrix Version)
- [ ] Entferne old `TrainingPlanPage.tsx`
- [ ] Nav: entferne "Trainingsplan"-Item aus Layout

## Task 4.2: Final-Verify

```bash
cd /home/hungl/privat/softball-lineup/frontend
npm test
npm run test:e2e
npm run build
```
Expected: ALLES grün.

## Task 4.3: Commit + Push

```bash
git add -A frontend/src/
git commit -m "🔥 Cleanup: alte TrainingPage + TrainingPlanPage entfernt"
git push origin master
```

---

## Verification (after each Phase)

- [ ] Vitest grün
- [ ] E2E grün
- [ ] Frontend build SUCCESS
- [ ] Manueller Browser-Smoke-Test
- [ ] Git push
