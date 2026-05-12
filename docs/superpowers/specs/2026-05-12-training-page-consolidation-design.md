# Training + Trainingsplan Konsolidierung

**Datum:** 2026-05-12
**Scope:** Frontend nur. Bestehende Backend-Endpoints reichen. Neue `/training`-Page kombiniert Anwesenheit + Plan + Stats. Migration in 4 Phasen.

## Problem

Aktuell 2 separate Routes:
- `/training` (TrainingPage.tsx ~1327 Z): Anwesenheits-Matrix multi-day, Period-Filter, Trainings-Liste
- `/training-plan` (TrainingPlanPage.tsx + 5 Components, ~2038 Z): Plan-Build/Edit, Drill-Picker, AI-Generation

Workflow-Pain: User (Hauptnutzer + 3 zukünftige Trainer) braucht **beide gleichzeitig** ("wer da ist → wie pass ich Plan an"). 2-Route-Switch = unnötige Friction auf Mobile.

## Lösung

1 Page `/training`, Mobile-First, vertikal-gestackt:
- **Sticky-Header:** Aktuelles Training-Datum + Counter "X/Y da · Z%"
- **Section 1 — Anwesenheit (primary):** Spieler-Liste mit Icon-Toggle, Inline-Quote (3M + Jahr), Sort-Toggle (Quote/Alpha)
- **Section 2 — Plan (secondary):** Plan-Read mit Edit-Pencil → Drawer für Edit-Mode
- **Stats-Drawer (on-demand):** Bars-Visualization für Anwesenheits-Pattern, Trend, History-Matrix-Tab

## Design-Decisions

### Color-Palette (Cream-Theme bleibt)
- Page-BG: `cream-50`
- Cards: `white` + `cream-300` border
- Primary-Accents: `navy-700/800/900`
- Action: `softball-red-600`
- Casual-Indicator (<30% Quote): `softball-red-400` text-tint
- Stammspieler (≥70%): `navy-800` text-fett

### Layout-Responsive

| Breakpoint | Layout |
|---|---|
| `< md` | Vertikal-Stack: Anwesenheit → Plan, max-w-md mx-auto |
| `md - lg` | Vertikal-Stack breiter, max-w-2xl mx-auto |
| `≥ lg` | 2-Spalten-Grid: Anwesenheit | Plan, max-w-4xl |

Stats-Drawer **immer Drawer** (auch Desktop) — konsistente Pattern.

### Anwesenheits-Toggle

**Tap-Zone:** Nur Icon-Kreis links (44pt min). Row sonst scroll-safe. Plus Scale-Pop-Animation (motion/react) + Haptic-Feedback (`navigator.vibrate(30)`).

**Visual:**
- Anwesend: filled circle `navy-800` + Name `font-medium navy-900`
- Nicht-anwesend: outline circle `cream-400` + Name `navy-700`
- Casual (<30% 3M): icon + name in `softball-red-400` tint

**Undo:** Toast nach Toggle mit "Rückgängig"-Action für 3s. Library: **Sonner adopten** (replace eigenes ToastProvider — saubere Migration über alle Pages).

### Quote-Format

Inline: `3M 80% · J 75%`
- Primary: 3-Monats-Cross-Season-Quote (fett, navy-800)
- Secondary: Jahres-Quote (klein, navy-500)
- Bei Casual: beide in red-Tint

Berechnung Backend-seitig: existing `useTraining`-Hook hat schon attendance-Map. Cross-Season-Stats brauchen evtl. neuen Endpoint oder Client-Filter aus existierenden Daten.

### Sort-Toggle

```
[Quote ↓] [A-Z]    ← Pill-Toggle, navy-700 selected
```
Default: Quote DESC. Click toggle alphabetisch.

### Plan-Section

**Read-Mode (Default):**
- Trainingsplan-Zeitslots gerendered
- Top-Right Pencil-Icon → Edit-Mode

**Edit-Mode:**
- Drawer (vaul) slides up
- Beinhaltet: Time-Slot-Edit, Drill-Replace, Reorder
- Save bestätigt + closes Drawer
- AI-Generation + Drill-Picker als sub-views im Drawer (oder full-screen via `inset-0` overlay)

**Plan from Scratch (Power-Mode):**
- Falls Drawer zu eng auf Mobile: Sub-Route `/training/plan-edit` (full-page) — Optional Phase-2-Decision

### Stats-Drawer

Trigger: Button `📊 Statistik` im Sticky-Header.

```
┌─────────────────────────────────────┐
│  ━━━                          [✕]   │
│  Anwesenheits-Statistik             │
│  [3M] · 6M · 1J · Saison           │  ← Period-Filter-Pills
├─────────────────────────────────────┤
│  Khang     ████████████  12 · 80%  │  ← Bars (Tailwind only)
│  Florian   ██████████     9 · 60%  │
│  ...                                │
├─────────────────────────────────────┤
│  Aggregate                          │
│  ⌀ 8.2 Spieler · ↗ +12% Trend      │
├─────────────────────────────────────┤
│  History-Matrix (Optional Phase 3)  │
│  [collapsible]                      │
└─────────────────────────────────────┘
```

### Lib-Adds

| Lib | Bundle | Use |
|---|---|---|
| **sonner** | ~5kB | Toast mit Undo-Action |
| **Existing motion/react** | — | Toggle-Pop, Drawer-Spring |
| **Existing vaul** | — | Plan-Edit-Drawer + Stats-Drawer |
| **Pure Tailwind CSS** | — | Bars + Layout (kein Chart-Lib) |

## Migration in 4 Phasen

### Phase 1 — Neue `/training` Page (Anwesenheit + Plan-Read + Stats-Drawer)

- Neue `TrainingPage.tsx` (oder umbenannt `TrainingTodayPage.tsx`) auf `/training`-Route
- Anwesenheits-Section + Plan-Read-Section + Stats-Drawer
- Plan-Edit bleibt erstmal auf alter `/training-plan` (Pencil-Icon links zu alter Route)
- Sonner adopted, alte ToastProvider migriert
- Bestehender TrainingPage-Code bleibt parallel als `/training-history` (Cross-Day-Matrix) erreichbar via "Statistik"-Drawer → "Ganze History"-Link

**Test-Coverage:**
- Vitest: TrainingPage Component-Tests (Sortieren, Toggle, Counter)
- Vitest: Stats-Drawer Bar-Math + Quote-Computation
- Playwright E2E: Anwesenheit-Toggle, Stats-Drawer-Open, Plan-Read

### Phase 2 — Plan-Edit-Drawer

- Pencil-Icon öffnet Drawer mit Plan-Edit-Form (existing PlanEditor/PlanForm-Components rein-renden)
- AI-Generation bleibt im Drawer (oder Sub-Drawer)
- Drill-Picker als Sub-Drawer
- `/training-plan`-Route bleibt aktiv aber als Fallback (Deep-Link kompatibel)

**Test-Coverage:**
- Vitest: PlanEditDrawer Component-Tests
- Playwright E2E: Plan-Edit-Flow, Save, AI-Generate-Trigger

### Phase 3 — History-Matrix in Stats-Drawer

- Stats-Drawer bekommt 2. Tab/Section "History-Matrix"
- Cross-Training Matrix-View migriert von alter TrainingPage rein
- Period-Filter im Drawer (3M / 6M / 1J / Saison)
- `/training-history` Sub-Route entfernt

**Test-Coverage:**
- Vitest: History-Matrix Render-Logic, Period-Filter
- Playwright E2E: Stats-Drawer → History-Tab → Filter ändern

### Phase 4 — Cleanup

- Alte `/training-plan`-Route entfernt → Redirect `/training`
- Alte `TrainingPlanPage.tsx` + Componenten löschen (PlanEditor/PlanDisplay als Sub-Components der neuen Page beibehalten falls reused)
- Nav-Item "Trainingsplan" aus Layout entfernen
- Stale-State-Cleanup (Routes, Lazy-Imports)

**Test-Coverage:**
- Vitest: Layout-Component snapshot Test
- Playwright E2E: Navigation prüft nur 1 Training-Item

## Test-Strategy (KRITISCH)

User-Anforderung: **viele Tests, vor allem Stats-Math richtig.**

### Stats-Math-Tests (Vitest)

Pro Phase mindestens:
- Anwesenheits-Quote Computation: 3M cross-season (über mehrere Periods)
- Anwesenheits-Quote Computation: Jahres-Aggregation
- Edge-Cases: 0 Trainings → 0%, Player nie da, neue Spieler
- Sortier-Stable-Sort: Quote-Tie → alphabetisch
- Bar-Width-Map: 80% → `w-[80%]` oder calc-style
- Color-Threshold: 70/40/30 → richtige Klasse
- Cross-Season-Period-Boundary: trainings über Saison-Wechsel korrekt aggregiert

### Component-Tests (Vitest)

- AttendanceRow Toggle → State-Change
- StatsBar render mit verschiedenen Quoten
- StatsDrawer Period-Filter wechselt Daten-Source
- PlanEditDrawer Save → Backend-Call
- SortToggle: A→Z vs Quote DESC

### Backend-Tests (existing)

- AttendanceService Quote-Berechnung (falls neu)
- TrainingPlanService Update (existing)

### E2E-Tests (Playwright)

Phase 1+ minimum:
- Anwesenheit-Toggle persistiert
- Counter aktualisiert beim Toggle
- Stats-Drawer öffnet/schließt
- Stats-Bars matched DOM
- Plan-Read zeigt aktuelles Training
- Sort-Toggle wechselt Reihenfolge
- Sonner-Toast erscheint nach Toggle, "Rückgängig" funktioniert

Phase 2+:
- Plan-Edit-Drawer öffnet
- Edit-Save persistiert

Phase 3+:
- Stats-Drawer History-Tab Click
- Period-Filter ändert Bars

Phase 4:
- Old route redirect
- Nav-Item entfernt

## Workflow

Pro Phase:
1. Build feature
2. **Run alle Tests** (`npm test` + `npm run test:e2e`)
3. Manuell Smoke-Test im Browser
4. Commit (gitmoji + clear message)
5. Push to master

Bei Test-Fail: fix vor commit. Bei UX-Issue: iterate vor commit.

## Risk + Mitigation

| Risk | Mitigation |
|---|---|
| Quote-Math falsch bei Cross-Season | Dedicated Vitest-Tests mit fixtures |
| Sonner-Migration bricht andere Toasts | Pro Page einzeln migrieren, nicht big-bang |
| Plan-Edit-Drawer auf Mobile zu eng | Fall back: Sub-Route `/training/plan-edit` für komplexe Edits |
| History-Matrix zu wide auf Mobile in Drawer | Horizontal-scroll mit sticky-left-column |
| 4 Trainer parallel-Plan-Edit | Last-Write-Wins erstmal akzeptieren |

## Out of Scope

- Real-Time-Collaboration (WebSockets für parallel-edit)
- Drag-Drop in Plan-Edit (kann später)
- Push-Notifications für Anwesenheit
- Spieler-Self-Service-Anmeldung (kein Login pro Spieler)
- Saison-Übergreifende Stats über mehr als 1 Jahr (Spec sagt 3M + 1J)

## Files

**Neu:**
- `frontend/src/components/training/TrainingPageNew.tsx` (oder Rename strategy)
- `frontend/src/components/training/AttendanceList.tsx`
- `frontend/src/components/training/StatsDrawer.tsx`
- `frontend/src/components/training/PlanEditDrawer.tsx` (Phase 2)
- `frontend/src/hooks/useAttendanceStats.ts` (Quote-Computation)
- E2E specs unter `frontend/e2e/training/*`
- Vitest specs unter `frontend/src/components/training/*.test.tsx`

**Geändert:**
- `frontend/src/App.tsx` (Routes)
- `frontend/src/components/layout/Layout.tsx` (Nav-Item)
- `frontend/package.json` (sonner devDep)
- `CLAUDE.md` (Pre-commit-check für training-related changes)

**Gelöscht (Phase 4):**
- Old TrainingPlanPage + Components (oder ggf. reused)
