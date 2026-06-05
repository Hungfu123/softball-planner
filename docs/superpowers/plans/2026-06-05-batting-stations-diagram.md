# Batting-Stationen-Diagramm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aus den Sections eines Trainingsplans ein konfigurierbares Batting-Stationen-Diagramm ableiten und es als Mini-Karte (mit Vollbild) im Plan-Tab anzeigen.

**Architecture:** `TrainingPlanSection` (liegt als JSONB in `training_plans.plan_content`) bekommt 3 optionale Felder (`stationType`, `stationLevel`, `stationChoiceGroup`). Jackson serialisiert sie automatisch — keine DB-Migration, kein Mapper-Change. Frontend leitet via reiner `deriveStations()`-Util eine `Station[]` ab, eine präsentationale `StationsDiagram`-Komponente rendert sie in zwei Größen, ein `StationsEditorDrawer` editiert Typ/Level/Choice und speichert über das bestehende `PUT /api/training-plans/{id}`.

**Tech Stack:** Java 21 / Spring Boot / Jackson · React 19 / TypeScript / Tailwind v4 / Vitest

---

## File Structure

**Backend**
- Modify `backend/src/main/java/com/softball/domain/model/TrainingPlanSection.java` — 3 Felder + getter/setter
- Create `backend/src/main/java/com/softball/domain/model/StationType.java` — enum
- Create `backend/src/main/java/com/softball/domain/model/StationLevel.java` — enum
- Modify `backend/src/main/java/com/softball/adapter/dto/TrainingPlanSectionResponse.java` — 3 Felder im Record + `from`/`toDomain`
- Create `backend/src/test/java/com/softball/domain/model/TrainingPlanSectionSerializationTest.java` — Jackson-Roundtrip

**Frontend**
- Modify `frontend/src/types/index.ts` — Station-Enums + 3 Felder in `TrainingPlanSectionResponse`
- Create `frontend/src/components/training/stations/deriveStations.ts` — Util
- Create `frontend/src/components/training/stations/deriveStations.test.ts` — Util-Test
- Create `frontend/src/components/training/stations/stationMeta.ts` — Typ → Icon/Farbe/Label-Map
- Create `frontend/src/components/training/stations/StationIcons.tsx` — Custom-SVG-Icons
- Create `frontend/src/components/training/stations/StationsDiagram.tsx` — präsentational, `size: 'mini' | 'full'`
- Create `frontend/src/components/training/stations/StationsEditorDrawer.tsx` — Editor
- Modify `frontend/src/components/training/TrainingPlanView.tsx` — Integration (Mini im Batting-Block + Vollbild-Modal + Editor-Wiring)

---

## Task 1: Backend — Station-Enums + Section-Felder

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/StationType.java`
- Create: `backend/src/main/java/com/softball/domain/model/StationLevel.java`
- Modify: `backend/src/main/java/com/softball/domain/model/TrainingPlanSection.java`
- Test: `backend/src/test/java/com/softball/domain/model/TrainingPlanSectionSerializationTest.java`

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/com/softball/domain/model/TrainingPlanSectionSerializationTest.java`:

```java
package com.softball.domain.model;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TrainingPlanSectionSerializationTest {

    private final ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Test
    void roundTripsStationFields() throws Exception {
        TrainingPlanSection section = new TrainingPlanSection();
        section.setTitle("Tee-Drill");
        section.setStationType(StationType.TEE);
        section.setStationLevel(StationLevel.BEGINNER);
        section.setStationChoiceGroup(1);

        String json = mapper.writeValueAsString(section);
        TrainingPlanSection back = mapper.readValue(json, TrainingPlanSection.class);

        assertThat(back.getStationType()).isEqualTo(StationType.TEE);
        assertThat(back.getStationLevel()).isEqualTo(StationLevel.BEGINNER);
        assertThat(back.getStationChoiceGroup()).isEqualTo(1);
    }

    @Test
    void legacyJsonWithoutStationFieldsDeserializes() throws Exception {
        String legacy = "{\"title\":\"Alt\",\"sectionType\":\"BATTING\"}";

        TrainingPlanSection back = mapper.readValue(legacy, TrainingPlanSection.class);

        assertThat(back.getStationType()).isNull();
        assertThat(back.getStationLevel()).isNull();
        assertThat(back.getStationChoiceGroup()).isNull();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPlanSectionSerializationTest`
Expected: COMPILE FAIL — `StationType`, `StationLevel`, `setStationType` existieren nicht.

- [ ] **Step 3: Create the enums**

Create `backend/src/main/java/com/softball/domain/model/StationType.java`:

```java
package com.softball.domain.model;

public enum StationType {
    LIVE, TEE, BUNT, KORKEN, HUETCHEN, OTHER
}
```

Create `backend/src/main/java/com/softball/domain/model/StationLevel.java`:

```java
package com.softball.domain.model;

public enum StationLevel {
    ADVANCED, BEGINNER
}
```

- [ ] **Step 4: Add fields to TrainingPlanSection**

In `backend/src/main/java/com/softball/domain/model/TrainingPlanSection.java`, add after the `group` field (line 17):

```java
    private StationType stationType;
    private StationLevel stationLevel;
    private Integer stationChoiceGroup;
```

And add after the `setGroup` method (line 48):

```java
    public StationType getStationType() { return stationType; }
    public void setStationType(final StationType stationType) { this.stationType = stationType; }
    public StationLevel getStationLevel() { return stationLevel; }
    public void setStationLevel(final StationLevel stationLevel) { this.stationLevel = stationLevel; }
    public Integer getStationChoiceGroup() { return stationChoiceGroup; }
    public void setStationChoiceGroup(final Integer stationChoiceGroup) { this.stationChoiceGroup = stationChoiceGroup; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPlanSectionSerializationTest`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/StationType.java \
        backend/src/main/java/com/softball/domain/model/StationLevel.java \
        backend/src/main/java/com/softball/domain/model/TrainingPlanSection.java \
        backend/src/test/java/com/softball/domain/model/TrainingPlanSectionSerializationTest.java
git commit -m "✨ Station-Felder an TrainingPlanSection (Typ/Level/Choice)"
```

---

## Task 2: Backend — DTO durchreichen

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/TrainingPlanSectionResponse.java`

- [ ] **Step 1: Extend the record**

Replace the record header + components in `TrainingPlanSectionResponse.java` (lines 6-11) with:

```java
public record TrainingPlanSectionResponse(
        String drillId, String sectionType, String title, Integer durationMinutes,
        Integer rounds, String adaptationNotes, String rotationPlan, String setupNotes,
        String tips, String groupSetup, String userNotes,
        Integer parallelGroup, Integer playersPerGroup,
        SectionGroup group,
        StationType stationType, StationLevel stationLevel, Integer stationChoiceGroup) {
```

Add the imports below the existing `import com.softball.domain.model.SectionGroup;`:

```java
import com.softball.domain.model.StationLevel;
import com.softball.domain.model.StationType;
```

- [ ] **Step 2: Update `from()`**

Replace the `new TrainingPlanSectionResponse(...)` body in `from()` (lines 14-21) with:

```java
        return new TrainingPlanSectionResponse(
                section.getDrillId(), section.getSectionType(), section.getTitle(),
                section.getDurationMinutes(), section.getRounds(), section.getAdaptationNotes(),
                section.getRotationPlan(), section.getSetupNotes(), section.getTips(),
                section.getGroupSetup(), section.getUserNotes(),
                section.getParallelGroup(), section.getPlayersPerGroup(),
                section.getGroup(),
                section.getStationType(), section.getStationLevel(), section.getStationChoiceGroup()
        );
```

- [ ] **Step 3: Update `toDomain()`**

In `toDomain()`, add before `return section;` (after line 39):

```java
        section.setStationType(stationType);
        section.setStationLevel(stationLevel);
        section.setStationChoiceGroup(stationChoiceGroup);
```

- [ ] **Step 4: Verify backend compiles + tests pass**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPlanSectionSerializationTest`
Expected: PASS. (Full suite runs in Task 8.)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/TrainingPlanSectionResponse.java
git commit -m "✨ Station-Felder in TrainingPlanSectionResponse durchreichen"
```

---

## Task 3: Frontend — Types

**Files:**
- Modify: `frontend/src/types/index.ts:222-237`

- [ ] **Step 1: Add station unions + fields**

In `frontend/src/types/index.ts`, directly above `export interface TrainingPlanSectionResponse` (line 222), add:

```ts
export type StationType = 'LIVE' | 'TEE' | 'BUNT' | 'KORKEN' | 'HUETCHEN' | 'OTHER'
export type StationLevel = 'ADVANCED' | 'BEGINNER'
```

Then add these three lines inside `TrainingPlanSectionResponse`, after `group?: SectionGroup` (line 236):

```ts
  stationType?: StationType | null
  stationLevel?: StationLevel | null
  stationChoiceGroup?: number | null
```

- [ ] **Step 2: Verify typecheck**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "✨ Station-Typen im Frontend-Types"
```

---

## Task 4: Frontend — deriveStations util (TDD)

**Files:**
- Create: `frontend/src/components/training/stations/deriveStations.ts`
- Test: `frontend/src/components/training/stations/deriveStations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/training/stations/deriveStations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveStations } from './deriveStations'
import type { TrainingPlanSectionResponse } from '@/types'

function section(partial: Partial<TrainingPlanSectionResponse>): TrainingPlanSectionResponse {
  return {
    drillId: null, sectionType: null, title: null, durationMinutes: null,
    rounds: null, adaptationNotes: null, rotationPlan: null, setupNotes: null,
    tips: null, groupSetup: null, userNotes: null, parallelGroup: null,
    playersPerGroup: null, ...partial,
  }
}

describe('deriveStations', () => {
  it('returns only sections with a stationType, numbered in order', () => {
    const stations = deriveStations([
      section({ title: 'Warmup' }),                              // no type -> skip
      section({ title: 'Live', stationType: 'LIVE' }),
      section({ title: 'Tee', stationType: 'TEE' }),
    ])
    expect(stations).toHaveLength(2)
    expect(stations[0]).toMatchObject({ rotation: 1, label: 'Live', type: 'LIVE' })
    expect(stations[1]).toMatchObject({ rotation: 2, label: 'Tee', type: 'TEE' })
  })

  it('carries level, parallelGroup and choiceGroup through', () => {
    const stations = deriveStations([
      section({ title: 'A', stationType: 'HUETCHEN', stationLevel: 'ADVANCED', parallelGroup: 2, stationChoiceGroup: 1 }),
    ])
    expect(stations[0]).toMatchObject({
      level: 'ADVANCED', parallelGroup: 2, choiceGroup: 1,
    })
  })

  it('falls back to a generic label when title is missing', () => {
    const stations = deriveStations([section({ title: null, stationType: 'BUNT' })])
    expect(stations[0].label).toBe('Station')
  })

  it('returns empty array when no section is a station', () => {
    expect(deriveStations([section({ title: 'x' })])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/training/stations/deriveStations.test.ts`
Expected: FAIL — cannot find module `./deriveStations`.

- [ ] **Step 3: Implement the util**

Create `frontend/src/components/training/stations/deriveStations.ts`:

```ts
import type { StationLevel, StationType, TrainingPlanSectionResponse } from '@/types'

export interface Station {
  /** 1-basierte Rotationsnummer (Reihenfolge der Stationen). */
  rotation: number
  label: string
  type: StationType
  level: StationLevel | null
  parallelGroup: number | null
  /** Stationen mit gleicher choiceGroup = "WÄHLE 1"-Alternativen. */
  choiceGroup: number | null
}

/** Leitet aus Plan-Sections die Stationen ab: jede Section mit gesetztem stationType wird eine Station. */
export function deriveStations(sections: TrainingPlanSectionResponse[]): Station[] {
  const result: Station[] = []
  for (const s of sections) {
    if (!s.stationType) continue
    result.push({
      rotation: result.length + 1,
      label: s.title?.trim() || 'Station',
      type: s.stationType,
      level: s.stationLevel ?? null,
      parallelGroup: s.parallelGroup ?? null,
      choiceGroup: s.stationChoiceGroup ?? null,
    })
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/training/stations/deriveStations.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/training/stations/deriveStations.ts \
        frontend/src/components/training/stations/deriveStations.test.ts
git commit -m "✨ deriveStations: Sections → Stationen ableiten"
```

---

## Task 5: Frontend — Station-Icons + Meta

**Files:**
- Create: `frontend/src/components/training/stations/StationIcons.tsx`
- Create: `frontend/src/components/training/stations/stationMeta.ts`

- [ ] **Step 1: Create the custom SVG icons**

Create `frontend/src/components/training/stations/StationIcons.tsx` (Projekt-Konvention: eigene SVGs, kein Icon-Lib):

```tsx
interface IconProps { size?: number; className?: string }

const base = (size: number, className?: string) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const, className,
})

export const LiveBatIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M5 19l4-4" /><path d="M9 15l7-7a3 3 0 0 0-4-4l-7 7" /><circle cx="18" cy="6" r="1.4" fill="currentColor" /></svg>
)
export const TeeIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><circle cx="12" cy="6" r="2.4" /><path d="M12 8.4V18" /><path d="M8 20h8" /></svg>
)
export const BuntIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M4 14h10" /><path d="M14 14l5-5" /><circle cx="6" cy="14" r="1.2" fill="currentColor" /></svg>
)
export const KorkenIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><rect x="9" y="3" width="6" height="6" rx="1" /><path d="M11 9v9" /><path d="M13 9v9" /><path d="M9 20h6" /></svg>
)
export const HuetchenIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><path d="M12 4l5 14H7z" /><path d="M5 18h14" /></svg>
)
export const OtherStationIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
)
```

- [ ] **Step 2: Create the meta map**

Create `frontend/src/components/training/stations/stationMeta.ts`:

```ts
import type { ReactNode } from 'react'
import type { StationType } from '@/types'
import { LiveBatIcon, TeeIcon, BuntIcon, KorkenIcon, HuetchenIcon, OtherStationIcon } from './StationIcons'

interface StationMeta {
  label: string
  Icon: (p: { size?: number; className?: string }) => ReactNode
  /** true = Softball-Red-Akzent (Live-Station), sonst Navy. */
  accent: boolean
}

export const STATION_META: Record<StationType, StationMeta> = {
  LIVE: { label: 'Live', Icon: LiveBatIcon, accent: true },
  TEE: { label: 'Tee', Icon: TeeIcon, accent: false },
  BUNT: { label: 'Bunt', Icon: BuntIcon, accent: false },
  KORKEN: { label: 'Korken', Icon: KorkenIcon, accent: false },
  HUETCHEN: { label: 'Hütchen', Icon: HuetchenIcon, accent: false },
  OTHER: { label: 'Sonstiges', Icon: OtherStationIcon, accent: false },
}

export const STATION_TYPE_ORDER: StationType[] = ['LIVE', 'TEE', 'BUNT', 'KORKEN', 'HUETCHEN', 'OTHER']
```

- [ ] **Step 3: Verify typecheck**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/training/stations/StationIcons.tsx \
        frontend/src/components/training/stations/stationMeta.ts
git commit -m "✨ Station-Icons + Typ-Meta"
```

---

## Task 6: Frontend — StationsDiagram (präsentational)

**Files:**
- Create: `frontend/src/components/training/stations/StationsDiagram.tsx`

- [ ] **Step 1: Implement the component**

Create `frontend/src/components/training/stations/StationsDiagram.tsx`:

```tsx
import type { Station } from './deriveStations'
import { STATION_META } from './stationMeta'

interface Props {
  stations: Station[]
  size?: 'mini' | 'full'
}

/** Auto-Layout: 2 Spalten, in Reihenfolge gefüllt; choiceGroup-Paare gerahmt. */
export function StationsDiagram({ stations, size = 'mini' }: Props) {
  if (stations.length === 0) return null
  const full = size === 'full'

  // choiceGroup -> Stationen gruppieren (für "WÄHLE 1"-Rahmen)
  const choiceCounts = new Map<number, number>()
  for (const s of stations) {
    if (s.choiceGroup != null) choiceCounts.set(s.choiceGroup, (choiceCounts.get(s.choiceGroup) ?? 0) + 1)
  }

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${full ? 'p-6' : 'p-3'}`}
      style={{
        background:
          'radial-gradient(120% 90% at 15% 0%, #16305c 0%, transparent 55%), linear-gradient(135deg,#13284a,#0d1b34)',
      }}
    >
      {/* Foul-Linien-Motiv */}
      <div className="pointer-events-none absolute inset-0 opacity-30"
           style={{ borderLeft: '3px solid rgba(244,236,216,.4)', borderBottom: '3px solid rgba(244,236,216,.4)', margin: full ? 16 : 8 }} />
      <div className={`relative grid grid-cols-2 ${full ? 'gap-4' : 'gap-2'}`}>
        {stations.map(st => {
          const meta = STATION_META[st.type]
          const Icon = meta.Icon
          const inChoice = st.choiceGroup != null && (choiceCounts.get(st.choiceGroup) ?? 0) > 1
          return (
            <div
              key={st.rotation}
              className={`flex items-center gap-2 rounded-lg ${full ? 'px-3 py-2.5' : 'px-2 py-1.5'} ${
                inChoice ? 'border border-dashed border-amber-400/70' : ''
              }`}
              style={{ background: 'rgba(244,236,216,.06)' }}
            >
              <span
                className={`flex items-center justify-center rounded-full text-cream-50 font-bold tabular-nums ${
                  full ? 'w-9 h-9 text-base' : 'w-7 h-7 text-xs'
                }`}
                style={{ background: meta.accent ? '#e23b32' : '#234a86', border: '2px solid #f4ecd8' }}
              >
                {st.rotation}
              </span>
              <Icon size={full ? 20 : 16} className={meta.accent ? 'text-softball-red-300' : 'text-cream-100'} />
              <div className="min-w-0">
                <div className={`font-bold text-cream-50 truncate ${full ? 'text-sm' : 'text-xs'}`}>{st.label}</div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cream-300">
                  <span>{meta.label}</span>
                  {st.level && (
                    <span className={st.level === 'ADVANCED' ? 'text-softball-red-300' : 'text-amber-300'}>
                      · {st.level === 'ADVANCED' ? 'Advanced' : 'Beginner'}
                    </span>
                  )}
                  {inChoice && <span className="text-amber-300">· wähle 1</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
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
git commit -m "✨ StationsDiagram (mini + full)"
```

---

## Task 7: Frontend — StationsEditorDrawer

**Files:**
- Create: `frontend/src/components/training/stations/StationsEditorDrawer.tsx`

Der Drawer bekommt die Sections des aktiven Plans, lässt pro Section Typ/Level/Choice setzen und gibt die geänderte Section-Liste über `onSave` zurück. Vorbelegung (BATTING → LIVE) passiert beim Öffnen.

- [ ] **Step 1: Implement the drawer**

Create `frontend/src/components/training/stations/StationsEditorDrawer.tsx`:

```tsx
import { useEffect, useState } from 'react'
import type { StationLevel, StationType, TrainingPlanSectionResponse } from '@/types'
import { STATION_META, STATION_TYPE_ORDER } from './stationMeta'
import { XMark } from '@/icons'

interface Props {
  open: boolean
  sections: TrainingPlanSectionResponse[]
  onClose: () => void
  onSave: (sections: TrainingPlanSectionResponse[]) => void
}

export function StationsEditorDrawer({ open, sections, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<TrainingPlanSectionResponse[]>([])

  // Beim Öffnen: Kopie + Vorbelegung (BATTING ohne Typ -> LIVE).
  useEffect(() => {
    if (!open) return
    setDraft(sections.map(s =>
      s.stationType == null && s.sectionType === 'BATTING'
        ? { ...s, stationType: 'LIVE' as StationType }
        : { ...s },
    ))
  }, [open, sections])

  if (!open) return null

  const patch = (idx: number, change: Partial<TrainingPlanSectionResponse>) =>
    setDraft(prev => prev.map((s, i) => (i === idx ? { ...s, ...change } : s)))

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-cream-50 overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300 sticky top-0 bg-cream-50">
          <h2 className="font-display font-extrabold text-navy-900 uppercase tracking-widest text-sm">Stationen bearbeiten</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-navy-900 cursor-pointer"><XMark size={20} /></button>
        </div>

        <div className="p-4 space-y-3">
          {draft.map((s, idx) => (
            <div key={idx} className="rounded-xl border border-cream-300 bg-white p-3 space-y-2.5">
              <div className="font-bold text-navy-900 text-sm">{s.title?.trim() || 'Section'}</div>

              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                Stations-Typ
                <select
                  value={s.stationType ?? ''}
                  onChange={e => patch(idx, { stationType: (e.target.value || null) as StationType | null })}
                  className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm text-navy-900 bg-cream-50"
                >
                  <option value="">— keine Station —</option>
                  {STATION_TYPE_ORDER.map(t => <option key={t} value={t}>{STATION_META[t].label}</option>)}
                </select>
              </label>

              {s.stationType && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Level
                    <select
                      value={s.stationLevel ?? ''}
                      onChange={e => patch(idx, { stationLevel: (e.target.value || null) as StationLevel | null })}
                      className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm text-navy-900 bg-cream-50"
                    >
                      <option value="">—</option>
                      <option value="ADVANCED">Advanced</option>
                      <option value="BEGINNER">Beginner</option>
                    </select>
                  </label>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Wahl-Gruppe
                    <input
                      type="number" min={1} placeholder="–"
                      value={s.stationChoiceGroup ?? ''}
                      onChange={e => patch(idx, { stationChoiceGroup: e.target.value ? Number(e.target.value) : null })}
                      className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm text-navy-900 bg-cream-50 tabular-nums"
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-cream-50 border-t border-cream-300 p-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-cream-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-cream-100 cursor-pointer">Abbrechen</button>
          <button onClick={() => onSave(draft)} className="flex-1 rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white hover:bg-navy-800 cursor-pointer">Speichern</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/training/stations/StationsEditorDrawer.tsx
git commit -m "✨ StationsEditorDrawer: Typ/Level/Wahl-Gruppe pro Section"
```

---

## Task 8: Frontend — Integration in TrainingPlanView

**Files:**
- Modify: `frontend/src/components/training/TrainingPlanView.tsx`

Mini-Diagramm im Batting-Block, Vollbild-Modal, Editor-Wiring. Speichern via vorhandenem Plan-Update-Pfad (`onEdit` existiert; wir nutzen einen neuen optionalen `onSaveStations`-Callback, der die Section-Liste persistiert — analog `onEdit`).

- [ ] **Step 1: Add imports**

In `frontend/src/components/training/TrainingPlanView.tsx`, after the existing imports at the top of the file, add:

```tsx
import { useState as useStateStations } from 'react'
import { deriveStations } from './stations/deriveStations'
import { StationsDiagram } from './stations/StationsDiagram'
import { StationsEditorDrawer } from './stations/StationsEditorDrawer'
```

(`useState` ist bereits importiert — der Alias vermeidet doppelten Named-Import; alternativ den bestehenden `useState`-Import wiederverwenden und diese Zeile weglassen.)

- [ ] **Step 2: Add an `onSaveStations` prop**

Locate the `Props` interface (search `interface Props` near the top of the file). Add this optional member:

```tsx
  onSaveStations?: (sections: TrainingPlanSectionResponse[]) => void
```

Add `onSaveStations` to the destructured params of `TrainingPlanView(...)` (line 261), e.g. after `onEdit`:

```tsx
export function TrainingPlanView({ plans, loading = false, activePlanKind, onSwitchKind, drills, onEdit, onSaveStations, onRegenerate, onDelete, onShare, onAddBeginnerGroup, onGenerateBeginnerPlan, onGenerateMain }: Props) {
```

- [ ] **Step 3: Add diagram state + derived stations**

Inside the component body, after `const sections = planContent?.sections ?? []` (line 264), add:

```tsx
  const stations = deriveStations(sections)
  const [stationsFull, setStationsFull] = useStateStations(false)
  const [stationsEditor, setStationsEditor] = useStateStations(false)
```

- [ ] **Step 4: Render the mini diagram inside the batting group**

In `renderSectionSlice`, inside the grouped-render branch, locate the closing of the station-cards container `</div>` that ends the `<div className="p-2 space-y-1.5">` block (around line 361-362). Immediately after that inner `</div>` (still inside the group's outer `<div>`), insert — only for the batting group:

```tsx
            {isBattingGroup && stations.length > 0 && (
              <div className="px-2 pb-2">
                <button
                  type="button"
                  onClick={() => setStationsFull(true)}
                  className="w-full text-left cursor-pointer"
                  title="Vollbild anzeigen"
                >
                  <StationsDiagram stations={stations} size="mini" />
                </button>
                {onSaveStations && (
                  <button
                    type="button"
                    onClick={() => setStationsEditor(true)}
                    className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-navy-700 hover:text-softball-red-600 cursor-pointer"
                  >
                    Stationen bearbeiten
                  </button>
                )}
              </div>
            )}
```

- [ ] **Step 5: Render the fullscreen modal + editor at the component root**

In the component's returned JSX, just before the final closing `</div>` of the top-level `<div data-training-plan-view>` (line ~565, the last line before the closing of `return (`), insert:

```tsx
      {stationsFull && stations.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setStationsFull(false)}>
          <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setStationsFull(false)} className="text-cream-100 hover:text-white text-sm font-bold uppercase tracking-wider cursor-pointer">Schließen ✕</button>
            </div>
            <StationsDiagram stations={stations} size="full" />
          </div>
        </div>
      )}
      {onSaveStations && (
        <StationsEditorDrawer
          open={stationsEditor}
          sections={sections}
          onClose={() => setStationsEditor(false)}
          onSave={next => { onSaveStations(next); setStationsEditor(false) }}
        />
      )}
```

- [ ] **Step 6: Wire `onSaveStations` from the parent (TrainingTodayPage)**

Find where `<TrainingPlanView` is rendered (search the codebase: `grep -rn "TrainingPlanView" frontend/src/components/training/TrainingTodayPage.tsx`). It already passes `onEdit`. Add a sibling prop that saves an updated section list through the same update path `onEdit` uses. Concretely, if `onEdit` is defined as something like `onEdit={(content) => updatePlan(content)}`, add:

```tsx
              onSaveStations={(nextSections) => {
                if (!activePlan?.content) return
                update(activePlan.id, activePlan.trainingId, {
                  ...activePlan.content,
                  sections: nextSections,
                })
              }}
```

Use the same `update` / plan reference already in scope for `onEdit` in that file. (The `update` signature is `update(planId, trainingId, content)` per `useTrainingPlan`.)

- [ ] **Step 7: Verify typecheck + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: no errors, no new lint warnings.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/training/TrainingPlanView.tsx \
        frontend/src/components/training/TrainingTodayPage.tsx
git commit -m "✨ Stationen-Diagramm in TrainingPlanView (Mini + Vollbild + Editor)"
```

---

## Task 9: Full verification

- [ ] **Step 1: Frontend build + tests**

Run:
```bash
cd frontend && npm run build && npx vitest run
```
Expected: build succeeds (tsc + vite), all vitest tests pass (incl. `deriveStations.test.ts` and existing `TrainingPlanView.test.tsx`).

- [ ] **Step 2: Backend tests**

Run:
```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```
Expected: all tests pass (Docker daemon running for Testcontainers).

- [ ] **Step 3: Manual smoke (optional, recommended)**

Start db + backend + frontend (`docker compose up -d db`; backend `spring-boot:run`; `npx vite`). Open a training with batting sections → "Stationen bearbeiten" → set types (e.g. LIVE / TEE / BUNT), one ADVANCED + one BEGINNER sharing Wahl-Gruppe 1 → Speichern. Verify: mini diagram shows in batting block, numbers + icons + level badges + "wähle 1" dashed frame; tap → fullscreen board.

- [ ] **Step 4: Final commit (if smoke produced tweaks)**

```bash
git add -A && git commit -m "✨ Batting-Stationen-Diagramm: Feinschliff nach Smoke-Test"
```

---

## Notes for the implementer

- **No DB migration.** Sections live in `training_plans.plan_content` (JSONB). The mapper serialises the domain `TrainingPlanContent` via Jackson; new `TrainingPlanSection` fields are picked up automatically. `FAIL_ON_UNKNOWN_PROPERTIES=false` keeps old plans (without the fields) loadable.
- **Enums null-safe:** `stationType == null` means "not a station" — the whole diagram keys off this. Never default it server-side.
- **Backend dependency rule:** `StationType`/`StationLevel` live in `domain/model` (no Spring/JPA imports). The DTO in `adapter/dto` may import them (outer → inner is allowed).
- **Icons:** custom inline SVG per project convention — do not pull station icons from `lucide-react`.
- **Tailwind v4:** use utility classes (`grid-cols-2`, `gap-4`); the few field-gradient values that have no token are inline `style` (acceptable — they're board-specific, not reusable tokens).
```
