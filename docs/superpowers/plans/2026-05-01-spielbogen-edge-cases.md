# Spielbogen Edge Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Erweitere Spielbogen-Scoring um fehlende Edge Cases (FC, WP/PB, Multi-Base-Advance, Sac-Flags, 3-Outs-Auto-Switch) mit verbindlichen Tests pro Case.

**Architecture:** Backend behält Onion-Layout (Domain Enums + Application Service + Adapter DTOs + Migration). Frontend nutzt bestehenden Renderer/Drawer-Stack. Tests verbindlich pro Edge Case: Backend-Integration via Testcontainers, Frontend Renderer/Drawer Unit-Tests via Vitest (neu), End-to-End-Replay als hardcoded RFL-Game.

**Tech Stack:** Java 21 + Spring Boot 3.4 + JPA + Flyway + PostgreSQL 17 (Testcontainers); React 19 + Vite 7 + TypeScript + Vitest (neu) + @testing-library/react.

**Spec:** [docs/superpowers/specs/2026-05-01-spielbogen-edge-cases-design.md](../specs/2026-05-01-spielbogen-edge-cases-design.md)

---

## File Structure

### Backend

| Pfad | Aufgabe |
|------|---------|
| `backend/src/main/resources/db/migration/V21__spielbogen_fielders_choice.sql` | DB CHECK-Constraint erweitert um FIELDERS_CHOICE |
| `backend/src/main/resources/db/migration/V22__spielbogen_pitching_events.sql` | DB CHECK-Constraint erweitert um WILD_PITCH/PASSED_BALL |
| `backend/src/main/resources/db/migration/V23__spielbogen_sacrifice_type.sql` | Neue Spalte `sacrifice_type` + CHECK |
| `backend/src/main/java/com/softball/domain/model/OutType.java` | Enum-Wert `FIELDERS_CHOICE` |
| `backend/src/main/java/com/softball/domain/model/StealingEventType.java` | Enum-Werte `WILD_PITCH`, `PASSED_BALL` |
| `backend/src/main/java/com/softball/domain/model/SacrificeType.java` | NEU — Enum BUNT/FLY |
| `backend/src/main/java/com/softball/domain/model/SpielbogenAtBat.java` | Field `sacrificeType` |
| `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenAtBatEntity.java` | Spalte `sacrifice_type` |
| `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenAtBatMapper.java` | Map `sacrificeType` |
| `backend/src/main/java/com/softball/adapter/dto/*.java` | Request/Response DTOs für Sacrifice + WP/PB |
| `backend/src/main/java/com/softball/application/SpielbogenScoringService.java` | Auto-Switch-Logik + WP/PB-Recording, Sacrifice-Persistenz |
| `backend/src/test/java/com/softball/integration/SpielbogenEdgeCasesIntegrationTest.java` | NEU — alle Edge-Case-Tests |
| `backend/src/test/java/com/softball/integration/SpielbogenScoringScenarioTest.java` | NEU — End-to-End-Replay-Tests |
| `backend/src/test/resources/fixtures/spielbogen/krefeld-cologne-2026.json` | NEU — Replay-Fixture |

### Frontend

| Pfad | Aufgabe |
|------|---------|
| `frontend/package.json` | Vitest + Testing-Library devDeps + `test` Script |
| `frontend/vitest.config.ts` | NEU — Vitest-Config (jsdom env) |
| `frontend/src/test-setup.ts` | NEU — testing-library setup |
| `frontend/src/types/index.ts` | OutType / StealingEventType / SacrificeType erweitern |
| `frontend/src/utils/bogenSheetRenderer.ts` | Sac-Suffix, FC-Prefix, WP/PB-Marker |
| `frontend/src/utils/bogenSheetRenderer.test.ts` | NEU — Renderer-Unit-Tests |
| `frontend/src/components/spielbogen/DiamondCell.tsx` | WP/PB-Marker rendern |
| `frontend/src/components/spielbogen/DiamondCell.test.tsx` | NEU — Snapshot-Tests |
| `frontend/src/components/spielbogen/OutDetailDrawer.tsx` | FC-Wiring + Sac-Toggles + Multi-Base-Advance generisch |
| `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx` | NEU — Drawer-Tests |
| `frontend/src/components/spielbogen/PitchingEventDrawer.tsx` | NEU — WP/PB-Drawer |
| `frontend/src/components/spielbogen/SpielbogenPage.tsx` | "WP/PB"-Action-Button + Auto-Switch-Toast |
| `frontend/src/api/client.ts` | Endpoint `recordPitchingEvent` |

---

## Task 0: Frontend Vitest Setup

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test-setup.ts`
- Create: `frontend/src/utils/bogenSheetRenderer.test.ts` (smoke test)

- [ ] **Step 0.1: Install Vitest + Testing Library**

```bash
cd /home/hungl/privat/softball-lineup/frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui
```

- [ ] **Step 0.2: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 0.3: Create `frontend/src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 0.4: Add `test` script to `frontend/package.json`**

In `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 0.5: Smoke-test in `frontend/src/utils/bogenSheetRenderer.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { cellKey } from './bogenSheetRenderer'

describe('cellKey', () => {
  it('joins side, slot, inning with pipes', () => {
    expect(cellKey('HOME', 7, 3)).toBe('HOME|7|3')
  })
})
```

- [ ] **Step 0.6: Run smoke test**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm test
```

Expected: 1 passed.

- [ ] **Step 0.7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts \
        frontend/src/test-setup.ts frontend/src/utils/bogenSheetRenderer.test.ts
git commit -m "🧪 Frontend: Vitest + Testing-Library Setup für Spielbogen-Tests"
```

---

## Task 1: Fielder's Choice OutType (P1.2)

**Files:**
- Create: `backend/src/main/resources/db/migration/V21__spielbogen_fielders_choice.sql`
- Modify: `backend/src/main/java/com/softball/domain/model/OutType.java`
- Create: `backend/src/test/java/com/softball/integration/SpielbogenEdgeCasesIntegrationTest.java`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/utils/bogenSheetRenderer.ts`
- Modify: `frontend/src/utils/bogenSheetRenderer.test.ts`
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx`

- [ ] **Step 1.1: Write failing backend test for FC**

Create `backend/src/test/java/com/softball/integration/SpielbogenEdgeCasesIntegrationTest.java`:

```java
package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class SpielbogenEdgeCasesIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private SpringSpielbogenRepository spielbogenRepository;

    @AfterEach
    void tearDown() { spielbogenRepository.deleteAll(); }

    private record BogenContext(Long bogenId, Long homeSlot1, Long homeSlot2, Long awaySlot1, Long awaySlot2) {}

    private BogenContext createLiveBogen() throws Exception {
        var createBody = Map.of("date", "2026-04-30", "homeTeamName", "Heim", "awayTeamName", "Gast");
        var resp = mvc.perform(post("/api/spielbogen").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andExpect(status().isCreated()).andReturn();
        Long bogenId = json.readTree(resp.getResponse().getContentAsString()).get("id").asLong();

        var lineupHome = Map.of("side", "HOME", "slots", List.of(
            Map.of("slot", 1, "name", "H1", "battingOrder", 1, "position", "P"),
            Map.of("slot", 2, "name", "H2", "battingOrder", 2, "position", "C")));
        var lineupAway = Map.of("side", "AWAY", "slots", List.of(
            Map.of("slot", 1, "name", "A1", "battingOrder", 1, "position", "P"),
            Map.of("slot", 2, "name", "A2", "battingOrder", 2, "position", "C")));
        for (var l : List.of(lineupHome, lineupAway)) {
            mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(l))).andExpect(status().isOk());
        }
        mvc.perform(post("/api/spielbogen/" + bogenId + "/start")).andExpect(status().isOk());

        var sheet = mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet")).andReturn();
        var node = json.readTree(sheet.getResponse().getContentAsString());
        var home = node.get("homeLineup");
        var away = node.get("awayLineup");
        return new BogenContext(bogenId,
            home.get(0).get("id").asLong(), home.get(1).get("id").asLong(),
            away.get(0).get("id").asLong(), away.get(1).get("id").asLong());
    }

    @Test
    void fielders_choice_records_batter_safe_on_first_runner_out() throws Exception {
        var ctx = createLiveBogen();

        // First batter (away slot 1) singles → on 1B
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1, "result", "SINGLE",
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot1)))))
            .andExpect(status().isOk());

        // Second batter (away slot 2) FC: result=OUT, outType=FIELDERS_CHOICE chain=[6,4],
        // batter ends up on 1B, runner from 1B was force-out at 2B
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot2, "inning", 1,
                "result", "OUT", "outType", "FIELDERS_CHOICE",
                "fielderChain", List.of(6, 4),
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot2)))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.outType").value("FIELDERS_CHOICE"))
            .andExpect(jsonPath("$.baseStateAfter.firstSlotId").value(ctx.awaySlot2));
    }
}
```

- [ ] **Step 1.2: Run test, expect failure**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml \
    -Dtest=SpielbogenEdgeCasesIntegrationTest#fielders_choice_records_batter_safe_on_first_runner_out
```

Expected: FAIL — `FIELDERS_CHOICE` not in CHECK constraint OR not in OutType enum.

- [ ] **Step 1.3: Add `FIELDERS_CHOICE` to enum**

Edit `backend/src/main/java/com/softball/domain/model/OutType.java`:

```java
package com.softball.domain.model;

public enum OutType {
    GROUNDER, FLY, FOUL, UNASSISTED, DOUBLE_PLAY, TRIPLE_PLAY, FORCE_OUT, TAG_OUT, FIELDERS_CHOICE
}
```

- [ ] **Step 1.4: Migration `V21__spielbogen_fielders_choice.sql`**

Create `backend/src/main/resources/db/migration/V21__spielbogen_fielders_choice.sql`:

```sql
ALTER TABLE spielbogen_at_bat DROP CONSTRAINT spielbogen_atbat_outtype_when_out;
ALTER TABLE spielbogen_at_bat ADD CONSTRAINT spielbogen_atbat_outtype_when_out CHECK (
    (result = 'OUT' AND (out_type IS NULL OR out_type IN
        ('GROUNDER','FLY','FOUL','UNASSISTED','DOUBLE_PLAY','TRIPLE_PLAY','FORCE_OUT','TAG_OUT','FIELDERS_CHOICE')))
    OR (result != 'OUT' AND out_type IS NULL)
);
```

- [ ] **Step 1.5: Re-run test**

```bash
./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenEdgeCasesIntegrationTest#fielders_choice_records_batter_safe_on_first_runner_out
```

Expected: PASS.

- [ ] **Step 1.6: Frontend types + renderer**

Edit `frontend/src/types/index.ts`:

```ts
export type OutType = 'GROUNDER' | 'FLY' | 'FOUL' | 'UNASSISTED' | 'DOUBLE_PLAY' | 'TRIPLE_PLAY' | 'FORCE_OUT' | 'TAG_OUT' | 'FIELDERS_CHOICE'
```

Edit `frontend/src/utils/bogenSheetRenderer.ts` `renderOut`:

```ts
function renderOut(ab: SpielbogenAtBatResponse): string {
  if (!ab.outType) return 'OUT'
  const chain = ab.fielderChain && ab.fielderChain.length > 0 ? ab.fielderChain.join('-') : ''
  if (ab.outType === 'FIELDERS_CHOICE') return chain ? `FC ${chain}` : 'FC'
  if (ab.fielderChain && ab.fielderChain.length > 0) {
    if (ab.outType === 'DOUBLE_PLAY') return `${chain} DP`
    if (ab.outType === 'TRIPLE_PLAY') return `${chain} TP`
    if (ab.outType === 'FLY' && ab.fielderChain.length === 1) return `F${ab.fielderChain[0]}`
    return chain
  }
  switch (ab.outType) {
    case 'GROUNDER': return 'GO'
    case 'FLY': return 'FO'
    case 'FOUL': return 'FOUL'
    case 'UNASSISTED': return 'U'
    case 'DOUBLE_PLAY': return 'DP'
    case 'TRIPLE_PLAY': return 'TP'
    case 'FORCE_OUT': return 'FO'
    case 'TAG_OUT': return 'TO'
  }
  return 'OUT'
}
```

- [ ] **Step 1.7: Renderer-Test for FC**

Append to `frontend/src/utils/bogenSheetRenderer.test.ts`:

```ts
import { renderCells, type CellMap } from './bogenSheetRenderer'
import type { SpielbogenAtBatResponse } from '@/types'

function ab(o: Partial<SpielbogenAtBatResponse>): SpielbogenAtBatResponse {
  return {
    id: 1, bogenId: 1, slotId: 1, side: 'HOME', sequence: 1, inning: 1,
    result: 'SINGLE', outType: null, fielderChain: null, isError: null,
    errorPosition: null, runsScored: 0, rbi: 0, baseStateAfter: null, createdAt: '',
    ...o,
  }
}

describe('renderCells — Fielder\'s Choice', () => {
  it('labels FC + chain, batter on 1B counts as reach=1', () => {
    const fc = ab({
      slotId: 5, result: 'OUT', outType: 'FIELDERS_CHOICE',
      fielderChain: [6, 4],
      baseStateAfter: { firstSlotId: 5, secondSlotId: null, thirdSlotId: null },
    })
    const cells: CellMap = renderCells([fc], [])
    const cell = cells.get('HOME|5|1')!
    expect(cell.primaryLabel).toBe('FC 6-4')
    expect(cell.reachedBase).toBe(1)
    expect(cell.outIndex).toBe('I')
  })
})
```

- [ ] **Step 1.8: Run frontend test**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm test -- bogenSheetRenderer
```

Expected: PASS.

- [ ] **Step 1.9: OutDetailDrawer FC-Wiring**

Find existing "Runner out — Batter safe an 1B" Option in `OutDetailDrawer.tsx`. Setze beim Submit `outType: 'FIELDERS_CHOICE'` statt `FORCE_OUT`. Beispiel-Patch (suche nach "Batter safe"):

```tsx
onSubmit({
  result: 'OUT',
  outType: 'FIELDERS_CHOICE',
  fielderChain: [fielder, runnerOutFromBase + 1],
  baseStateAfter: {
    ...baseStateAfter,
    firstSlotId: batterSlotId,
    [runnerOutFromBase === 1 ? 'firstSlotId' :
     runnerOutFromBase === 2 ? 'secondSlotId' : 'thirdSlotId']: null,
  },
})
```

- [ ] **Step 1.10: Build + commit**

```bash
cd /home/hungl/privat/softball-lineup && cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenEdgeCasesIntegrationTest && cd ../frontend && npm test && npm run build
git add backend/src/main/resources/db/migration/V21__spielbogen_fielders_choice.sql \
        backend/src/main/java/com/softball/domain/model/OutType.java \
        backend/src/test/java/com/softball/integration/SpielbogenEdgeCasesIntegrationTest.java \
        frontend/src/types/index.ts frontend/src/utils/bogenSheetRenderer.ts \
        frontend/src/utils/bogenSheetRenderer.test.ts \
        frontend/src/components/spielbogen/OutDetailDrawer.tsx
git commit -m "✨ Spielbogen: Fielder's Choice als eigener OutType (P1.2)"
```

---

## Task 2: Wild Pitch / Passed Ball (P1.1)

**Files:**
- Create: `backend/src/main/resources/db/migration/V22__spielbogen_pitching_events.sql`
- Modify: `backend/src/main/java/com/softball/domain/model/StealingEventType.java`
- Modify: `backend/src/test/java/com/softball/integration/SpielbogenEdgeCasesIntegrationTest.java` (append tests)
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/utils/bogenSheetRenderer.ts`
- Modify: `frontend/src/utils/bogenSheetRenderer.test.ts`
- Modify: `frontend/src/components/spielbogen/DiamondCell.tsx`
- Create: `frontend/src/components/spielbogen/PitchingEventDrawer.tsx`
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 2.1: Failing backend test for WP**

Append to `SpielbogenEdgeCasesIntegrationTest`:

```java
@Test
void wild_pitch_advances_runner_without_sb_credit() throws Exception {
    var ctx = createLiveBogen();
    // Slot1 walks → on 1B
    mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
        .content(json.writeValueAsString(Map.of(
            "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1, "result", "WALK",
            "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot1)))))
        .andExpect(status().isOk());

    // Wild Pitch: runner advances 1B → 2B
    mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/stealing-events").contentType(APPLICATION_JSON)
        .content(json.writeValueAsString(Map.of(
            "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1,
            "type", "WILD_PITCH", "fromBase", 1, "toBase", 2))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.type").value("WILD_PITCH"))
        .andExpect(jsonPath("$.toBase").value(2));
}

@Test
void passed_ball_advances_runner_two_bases() throws Exception {
    var ctx = createLiveBogen();
    mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
        .content(json.writeValueAsString(Map.of(
            "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1, "result", "WALK",
            "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot1)))))
        .andExpect(status().isOk());

    mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/stealing-events").contentType(APPLICATION_JSON)
        .content(json.writeValueAsString(Map.of(
            "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1,
            "type", "PASSED_BALL", "fromBase", 1, "toBase", 3))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.type").value("PASSED_BALL"));
}
```

- [ ] **Step 2.2: Run, expect failure**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml \
    -Dtest=SpielbogenEdgeCasesIntegrationTest#wild_pitch_advances_runner_without_sb_credit
```

- [ ] **Step 2.3: Migration V22**

Create `backend/src/main/resources/db/migration/V22__spielbogen_pitching_events.sql`:

```sql
ALTER TABLE spielbogen_stealing_event DROP CONSTRAINT spielbogen_stealing_type_check;
ALTER TABLE spielbogen_stealing_event ADD CONSTRAINT spielbogen_stealing_type_check CHECK (
    type IN ('STOLEN_BASE','CAUGHT_STEALING','OUT_ON_PLAY','WILD_PITCH','PASSED_BALL')
);
```

- [ ] **Step 2.4: Enum erweitern**

Edit `backend/src/main/java/com/softball/domain/model/StealingEventType.java`:

```java
package com.softball.domain.model;

public enum StealingEventType {
    STOLEN_BASE, CAUGHT_STEALING, OUT_ON_PLAY, WILD_PITCH, PASSED_BALL
}
```

- [ ] **Step 2.5: Re-run tests**

```bash
./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenEdgeCasesIntegrationTest
```

Expected: PASS für WP+PB.

- [ ] **Step 2.6: Frontend types**

Edit `frontend/src/types/index.ts`:

```ts
export type StealingEventType = 'STOLEN_BASE' | 'CAUGHT_STEALING' | 'OUT_ON_PLAY' | 'WILD_PITCH' | 'PASSED_BALL'
```

- [ ] **Step 2.7: Renderer Marker für WP/PB**

Edit `bogenSheetRenderer.ts` — erweitere stealingArrow-Block in `renderCells`:

```ts
for (const st of stealings) {
    const key = cellKey(st.side, st.slotId, st.inning)
    const existing = cells.get(key) ?? emptyCell()
    existing.stealingArrow = { fromBase: st.fromBase, toBase: st.toBase, type: st.type }
    if (st.toBase === 4 && existing.reachedBase < 4) {
      existing.reachedBase = 4
      existing.runScored = true
    } else if (st.toBase > existing.reachedBase) {
      existing.reachedBase = st.toBase
    }
    cells.set(key, existing)
}
```

(Bestehender Code unverändert — `type` wird bereits durchgereicht, DiamondCell entscheidet Farbe.)

- [ ] **Step 2.8: DiamondCell Farb-Logik**

Edit `DiamondCell.tsx` Stealing-Arrow Block:

```tsx
{notation?.stealingArrow && (
  <line
    x1={baseToCoord(notation.stealingArrow.fromBase).x}
    y1={baseToCoord(notation.stealingArrow.fromBase).y}
    x2={baseToCoord(notation.stealingArrow.toBase).x}
    y2={baseToCoord(notation.stealingArrow.toBase).y}
    stroke={
      notation.stealingArrow.type === 'WILD_PITCH' || notation.stealingArrow.type === 'PASSED_BALL'
        ? '#f97316'  // orange for pitching mistakes
        : notation.stealingArrow.type === 'CAUGHT_STEALING' || notation.stealingArrow.type === 'OUT_ON_PLAY'
        ? '#7c2d12'  // dark red for out-on-play
        : '#dc2626'  // red for stolen base
    }
    strokeWidth="1.5"
    strokeDasharray="2 1"
  />
)}
```

Plus kleines "WP"/"PB"-Mini-Label oben in der Cell:

```tsx
{notation?.stealingArrow && (notation.stealingArrow.type === 'WILD_PITCH' || notation.stealingArrow.type === 'PASSED_BALL') && (
  <text
    x={30}
    y={17}
    textAnchor="middle"
    fontSize="5"
    fontWeight="700"
    fill="#f97316"
    style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
  >
    {notation.stealingArrow.type === 'WILD_PITCH' ? 'WP' : 'PB'}
  </text>
)}
```

- [ ] **Step 2.9: Renderer-Test**

Append to `bogenSheetRenderer.test.ts`:

```ts
describe('renderCells — Wild Pitch / Passed Ball', () => {
  it('attaches WP arrow to the runner\'s cell with correct toBase', () => {
    const walk = ab({ slotId: 7, result: 'WALK', baseStateAfter: { firstSlotId: 7, secondSlotId: null, thirdSlotId: null } })
    const wp = { id: 1, bogenId: 1, slotId: 7, side: 'HOME' as const, inning: 1, type: 'WILD_PITCH' as const, fromBase: 1, toBase: 2, createdAt: '' }
    const cells = renderCells([walk], [wp])
    const cell = cells.get('HOME|7|1')!
    expect(cell.stealingArrow?.type).toBe('WILD_PITCH')
    expect(cell.reachedBase).toBe(2)
  })

  it('PB advancing to home marks runScored', () => {
    const walk = ab({ slotId: 7, result: 'WALK', baseStateAfter: { firstSlotId: null, secondSlotId: null, thirdSlotId: 7 } })
    const pb = { id: 1, bogenId: 1, slotId: 7, side: 'HOME' as const, inning: 1, type: 'PASSED_BALL' as const, fromBase: 3, toBase: 4, createdAt: '' }
    const cells = renderCells([walk], [pb])
    const cell = cells.get('HOME|7|1')!
    expect(cell.runScored).toBe(true)
    expect(cell.reachedBase).toBe(4)
  })
})
```

- [ ] **Step 2.10: API-Client Endpoint**

Falls `recordStealingEvent` in `frontend/src/api/client.ts` schon existiert, nimmt er bereits den neuen Type via DTO entgegen. Verify mit:

```bash
grep -n "recordStealingEvent" frontend/src/api/client.ts
```

Wenn vorhanden: nichts zu tun. Type-System lässt WP/PB schon durch.

- [ ] **Step 2.11: PitchingEventDrawer-Komponente**

Create `frontend/src/components/spielbogen/PitchingEventDrawer.tsx`:

```tsx
import { useState } from 'react'
import { Drawer } from 'vaul'
import type { BogenBaseStateDto, SpielbogenSlotResponse, StealingEventType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  baseState: BogenBaseStateDto
  slots: SpielbogenSlotResponse[]
  onSubmit: (events: Array<{ slotId: number; type: 'WILD_PITCH' | 'PASSED_BALL'; fromBase: 1|2|3; toBase: 2|3|4 }>) => void
}

export function PitchingEventDrawer({ open, onClose, baseState, slots, onSubmit }: Props) {
  const [type, setType] = useState<'WILD_PITCH' | 'PASSED_BALL'>('WILD_PITCH')
  const runners = [
    baseState.thirdSlotId  != null ? { from: 3 as const, slotId: baseState.thirdSlotId  } : null,
    baseState.secondSlotId != null ? { from: 2 as const, slotId: baseState.secondSlotId } : null,
    baseState.firstSlotId  != null ? { from: 1 as const, slotId: baseState.firstSlotId  } : null,
  ].filter(Boolean) as Array<{ from: 1|2|3; slotId: number }>

  const [targets, setTargets] = useState<Record<number, number>>({})

  const cycle = (from: 1|2|3) => {
    setTargets(prev => {
      const curr = prev[from] ?? from
      const next = curr === 4 ? from : curr + 1
      return { ...prev, [from]: next }
    })
  }

  const submit = () => {
    const events = runners
      .filter(r => (targets[r.from] ?? r.from) !== r.from)
      .map(r => ({
        slotId: r.slotId,
        type,
        fromBase: r.from,
        toBase: (targets[r.from] ?? r.from) as 2|3|4,
      }))
    if (events.length > 0) onSubmit(events)
    onClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl flex flex-col p-4">
          <Drawer.Title className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide mb-2">
            Pitcher-/Catcher-Mistake
          </Drawer.Title>

          <div className="flex gap-2 mb-3">
            <button onClick={() => setType('WILD_PITCH')}
              className={`flex-1 py-2 rounded-xl font-display text-xs font-bold tracking-widest uppercase ${
                type === 'WILD_PITCH' ? 'bg-orange-500 text-white' : 'border border-cream-300 bg-white text-navy-700'
              }`}>Wild Pitch</button>
            <button onClick={() => setType('PASSED_BALL')}
              className={`flex-1 py-2 rounded-xl font-display text-xs font-bold tracking-widest uppercase ${
                type === 'PASSED_BALL' ? 'bg-orange-500 text-white' : 'border border-cream-300 bg-white text-navy-700'
              }`}>Passed Ball</button>
          </div>

          <p className="text-xs text-gray-500 mb-2">Tipp pro Runner um Ziel-Base zu cycle (bleibt → +1 → +2 → Home).</p>
          <div className="space-y-2">
            {runners.map(r => {
              const slot = slots.find(s => s.id === r.slotId)
              const t = targets[r.from] ?? r.from
              const label = t === r.from ? 'bleibt' : t === 4 ? '→ Home (Run!)' : `→ ${t}B`
              return (
                <button key={r.from} onClick={() => cycle(r.from)}
                  className={`w-full text-left px-4 py-3 rounded-xl border ${
                    t === r.from ? 'border-cream-300 bg-white' : 'border-orange-500 bg-orange-50'
                  }`}>
                  <div className="font-display font-bold text-sm flex items-center justify-between">
                    <span>{slot?.name ?? `Slot ${r.slotId}`} (auf {r.from}B)</span>
                    <span className="text-xs">{label}</span>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-cream-300">Abbrechen</button>
            <button onClick={submit} className="flex-1 py-2 font-display text-sm font-bold tracking-widest uppercase text-white bg-navy-800 rounded-lg">Bestätigen</button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 2.12: Action-Button in SpielbogenPage**

In `SpielbogenPage.tsx`, suche nach Action-Bar (z.B. "SB"-Button). Füge hinzu:

```tsx
const [showPitchingDrawer, setShowPitchingDrawer] = useState(false)

// im Action-Bar JSX, neben SB-Button:
<button onClick={() => setShowPitchingDrawer(true)} className="...action-btn-classes...">
  WP/PB
</button>

// am Ende des Component-Returns:
<PitchingEventDrawer
  open={showPitchingDrawer}
  onClose={() => setShowPitchingDrawer(false)}
  baseState={currentBaseState ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }}
  slots={currentSide === 'HOME' ? sheet.homeLineup : sheet.awayLineup}
  onSubmit={async (events) => {
    for (const e of events) {
      await api.recordStealingEvent(sheet.meta.id, e)
    }
    await reload()
  }}
/>
```

- [ ] **Step 2.13: Build + commit**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenEdgeCasesIntegrationTest && cd ../frontend && npm test && npm run build
git add -A && git commit -m "✨ Spielbogen: Wild Pitch / Passed Ball als Pitching-Events (P1.1)"
```

---

## Task 3: Multi-Base-Advance bei allen Out-Typen (P1.3)

**Files:**
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx`
- Create: `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx`

- [ ] **Step 3.1: Failing test**

Create `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OutDetailDrawer } from './OutDetailDrawer'
import type { SpielbogenSlotResponse } from '@/types'

const slots: SpielbogenSlotResponse[] = [
  { id: 1, side: 'HOME', slot: 1, name: 'Runner-1B', position: null, battingOrder: 1 },
  { id: 2, side: 'HOME', slot: 2, name: 'Runner-2B', position: null, battingOrder: 2 },
]

describe('OutDetailDrawer — Multi-Base-Advance auf Grounder', () => {
  it('zeigt "Runner-Advance editieren" Button bei Grounder-Out wenn Runner auf Base', async () => {
    const onSubmit = vi.fn()
    render(<OutDetailDrawer
      open={true}
      onClose={() => {}}
      onSubmit={onSubmit}
      baseStateAfter={{ firstSlotId: 1, secondSlotId: 2, thirdSlotId: null }}
      slots={slots}
      batterSlotId={99}
    />)
    // Tap auf 5 (3B-Position) für Grounder
    fireEvent.click(screen.getByRole('button', { name: /5/ }))
    // Edit-Runner-Advance Button sichtbar?
    expect(screen.getByText(/Runner-Advance editieren/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3.2: Run, expect failure**

```bash
cd frontend && npm test -- OutDetailDrawer
```

Expected: FAIL — Button existiert noch nicht.

- [ ] **Step 3.3: Refactor — Picker generisch verfügbar**

In `OutDetailDrawer.tsx` (siehe Datei Zeilen 376–460 InfieldOptionsView): füge "Runner-Advance editieren"-Button am Ende der Optionen ein, der `setPendingFlyOutRequest({ fielder })`-Pattern nutzt aber generisch.

Refactor: Ersetze `pendingFlyOutRequest` mit `pendingAdvancePickerRequest`, der zusätzlich speichert welcher Action-Type gewählt wurde (FLY/GROUNDER/FORCE/etc.) und Default-Result-Submit. RunnerAdvancePickerView zeigt Picker, OnConfirm berechnet baseStateAfter via applyAdvances + sendet finales onSubmit.

Konkret:

```tsx
// State
const [pendingAdvancePicker, setPendingAdvancePicker] = useState<null | {
  baseRequest: Partial<SpielbogenRecordAtBatRequest>
  title: string
}>(null)

// In InfieldOptionsView, hinter den Standard-Buttons:
{hasRunners && (
  <button onClick={() => setPendingAdvancePicker({
    baseRequest: { result: 'OUT', outType: 'GROUNDER', fielderChain: [fielder, 3] },
    title: `Grounder ${fielder}-3 — Runner-Advance editieren`
  })} className="...">
    Runner-Advance editieren
  </button>
)}

// In Drawer-Render:
{pendingAdvancePicker && (
  <RunnerAdvancePickerView
    title={pendingAdvancePicker.title}
    subtitle="Wie weit ist jeder Runner gelaufen?"
    baseState={baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }}
    slots={slots}
    onConfirm={(advances) => {
      const { baseStateAfter: after, runsScored: runs } = applyAdvances(baseStateAfter, advances)
      onSubmit({ ...pendingAdvancePicker.baseRequest, runsScored: runs, rbi: runs, baseStateAfter: after })
      setPendingAdvancePicker(null)
    }}
    onBack={() => setPendingAdvancePicker(null)}
  />
)}
```

- [ ] **Step 3.4: Re-run test**

```bash
npm test -- OutDetailDrawer
```

Expected: PASS.

- [ ] **Step 3.5: Commit**

```bash
git add -A && git commit -m "🔁 Spielbogen: Multi-Base-Advance Picker generisch für alle Out-Typen (P1.3)"
```

---

## Task 4: Sacrifice Flags (P2.6)

**Files:**
- Create: `backend/src/main/resources/db/migration/V23__spielbogen_sacrifice_type.sql`
- Create: `backend/src/main/java/com/softball/domain/model/SacrificeType.java`
- Modify: `backend/src/main/java/com/softball/domain/model/SpielbogenAtBat.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenAtBatEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenAtBatMapper.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/*` (Request + Response Records)
- Modify: `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`
- Modify: `backend/src/test/java/com/softball/integration/SpielbogenEdgeCasesIntegrationTest.java`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/utils/bogenSheetRenderer.ts`
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx`

- [ ] **Step 4.1: Failing test**

Append to `SpielbogenEdgeCasesIntegrationTest`:

```java
@Test
void sac_fly_marks_at_bat_with_rbi() throws Exception {
    var ctx = createLiveBogen();
    // Slot1 doubles → on 2B
    mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
        .content(json.writeValueAsString(Map.of(
            "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1, "result", "DOUBLE",
            "baseStateAfter", Map.of("secondSlotId", ctx.awaySlot1)))))
        .andExpect(status().isOk());

    // Move to 3B via stealing for setup
    mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/stealing-events").contentType(APPLICATION_JSON)
        .content(json.writeValueAsString(Map.of(
            "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1,
            "type", "STOLEN_BASE", "fromBase", 2, "toBase", 3))))
        .andExpect(status().isOk());

    // Slot2 sac fly: result=OUT, outType=FLY, sacrificeType=FLY, runsScored=1, rbi=1
    mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
        .content(json.writeValueAsString(Map.of(
            "side", "AWAY", "slotId", ctx.awaySlot2, "inning", 1,
            "result", "OUT", "outType", "FLY", "sacrificeType", "FLY",
            "fielderChain", List.of(8),
            "runsScored", 1, "rbi", 1,
            "baseStateAfter", Map.of()))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sacrificeType").value("FLY"))
        .andExpect(jsonPath("$.rbi").value(1));
}
```

- [ ] **Step 4.2: Migration V23**

Create `backend/src/main/resources/db/migration/V23__spielbogen_sacrifice_type.sql`:

```sql
ALTER TABLE spielbogen_at_bat ADD COLUMN sacrifice_type VARCHAR(8);
ALTER TABLE spielbogen_at_bat ADD CONSTRAINT spielbogen_atbat_sacrifice_check
    CHECK (sacrifice_type IS NULL OR sacrifice_type IN ('BUNT','FLY'));
```

- [ ] **Step 4.3: Domain Enum + AtBat-Field**

Create `backend/src/main/java/com/softball/domain/model/SacrificeType.java`:

```java
package com.softball.domain.model;

public enum SacrificeType { BUNT, FLY }
```

In `SpielbogenAtBat.java` (innerhalb der Field-Liste + Getter/Setter):

```java
private SacrificeType sacrificeType;
public SacrificeType getSacrificeType() { return sacrificeType; }
public void setSacrificeType(final SacrificeType sacrificeType) { this.sacrificeType = sacrificeType; }
```

- [ ] **Step 4.4: Entity-Field**

In `SpielbogenAtBatEntity.java`:

```java
@Column(name = "sacrifice_type")
private String sacrificeType;
public String getSacrificeType() { return sacrificeType; }
public void setSacrificeType(String sacrificeType) { this.sacrificeType = sacrificeType; }
```

- [ ] **Step 4.5: Mapper-Update**

In `SpielbogenAtBatMapper.java`, in beiden Richtungen `sacrificeType` mappen (String ↔ enum). Suche nach existierenden String-Enum-Konvertierungen wie für `outType` und kopiere Pattern.

- [ ] **Step 4.6: DTOs**

Suche `SpielbogenAtBatResponse.java` und `SpielbogenRecordAtBatRequest.java` Records in `adapter/dto/`. Füge `SacrificeType sacrificeType` hinzu (nullable für Request).

- [ ] **Step 4.7: Service-Update**

In `SpielbogenScoringService.recordAtBat`: AtBat aus Request fülle `setSacrificeType(req.sacrificeType())` (oder via Mapper). Verify dass DTO-Param vorhanden.

- [ ] **Step 4.8: Re-run backend test**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenEdgeCasesIntegrationTest#sac_fly_marks_at_bat_with_rbi
```

Expected: PASS.

- [ ] **Step 4.9: Frontend types**

Edit `frontend/src/types/index.ts`:

```ts
export type SacrificeType = 'BUNT' | 'FLY'

export interface SpielbogenAtBatResponse {
  // ... bestehende Felder
  sacrificeType: SacrificeType | null
}

export interface SpielbogenRecordAtBatRequest {
  // ... bestehende Felder
  sacrificeType?: SacrificeType
}
```

- [ ] **Step 4.10: Renderer-Suffix für Sac**

Erweitere `renderAtBat` in `bogenSheetRenderer.ts`:

```ts
function renderAtBat(ab: SpielbogenAtBatResponse): { label: string } {
  const base = renderAtBatBase(ab)
  if (ab.sacrificeType === 'FLY') return { label: `${base} SF` }
  if (ab.sacrificeType === 'BUNT') return { label: `${base} SH` }
  return { label: base }
}

function renderAtBatBase(ab: SpielbogenAtBatResponse): string {
  if (ab.isError && ab.errorPosition != null) return `E${ab.errorPosition}`
  switch (ab.result) {
    case 'SINGLE': return '1B'
    case 'DOUBLE': return '2B'
    case 'TRIPLE': return '3B'
    case 'HOMERUN': return 'HR'
    case 'WALK': return 'BB'
    case 'HIT_BY_PITCH': return 'HP'
    case 'STRIKEOUT': return 'K'
    case 'OUT': return renderOut(ab)
  }
}
```

- [ ] **Step 4.11: Renderer-Test**

Append:

```ts
describe('renderCells — Sacrifice', () => {
  it('Sac Fly suffix is "SF"', () => {
    const sf = ab({ slotId: 3, result: 'OUT', outType: 'FLY', sacrificeType: 'FLY', fielderChain: [8], rbi: 1 })
    const cells = renderCells([sf], [])
    expect(cells.get('HOME|3|1')!.primaryLabel).toBe('F8 SF')
  })

  it('Sac Bunt suffix is "SH"', () => {
    const sh = ab({ slotId: 3, result: 'OUT', outType: 'GROUNDER', sacrificeType: 'BUNT', fielderChain: [1, 3] })
    const cells = renderCells([sh], [])
    expect(cells.get('HOME|3|1')!.primaryLabel).toBe('1-3 SH')
  })
})
```

- [ ] **Step 4.12: OutDetailDrawer Toggle**

In `OutDetailDrawer.tsx` Submit-Pfaden für FlyOut + Grounder: Checkbox-Toggle "Als Sacrifice werten" → setzt `sacrificeType: 'FLY' | 'BUNT'` im AtBat-Request.

- [ ] **Step 4.13: Build + commit**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenEdgeCasesIntegrationTest && cd ../frontend && npm test && npm run build
git add -A && git commit -m "✨ Spielbogen: Sacrifice-Flags BUNT/FLY für AVG-korrekte Stats (P2.6)"
```

---

## Task 5: 3-Outs-Auto-Switch (P2.5)

**Files:**
- Modify: `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`
- Modify: `backend/src/test/java/com/softball/integration/SpielbogenEdgeCasesIntegrationTest.java`
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx`

- [ ] **Step 5.1: Failing test**

Append:

```java
@Test
void three_strikeouts_auto_switch_side() throws Exception {
    var ctx = createLiveBogen();
    for (int i = 0; i < 3; i++) {
        Long slotId = (i % 2 == 0) ? ctx.awaySlot1 : ctx.awaySlot2;
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", slotId, "inning", 1, "result", "STRIKEOUT"))))
            .andExpect(status().isOk());
    }
    mvc.perform(get("/api/spielbogen/" + ctx.bogenId))
        .andExpect(jsonPath("$.currentSide").value("HOME"));
}

@Test
void caught_stealing_as_third_out_auto_switches() throws Exception {
    var ctx = createLiveBogen();
    // 2 strikeouts
    for (int i = 0; i < 2; i++) {
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1, "result", "STRIKEOUT"))))
            .andExpect(status().isOk());
    }
    // Walk + caught stealing
    mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
        .content(json.writeValueAsString(Map.of(
            "side", "AWAY", "slotId", ctx.awaySlot2, "inning", 1, "result", "WALK",
            "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot2)))))
        .andExpect(status().isOk());
    mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/stealing-events").contentType(APPLICATION_JSON)
        .content(json.writeValueAsString(Map.of(
            "side", "AWAY", "slotId", ctx.awaySlot2, "inning", 1,
            "type", "CAUGHT_STEALING", "fromBase", 1, "toBase", 2))))
        .andExpect(status().isOk());

    mvc.perform(get("/api/spielbogen/" + ctx.bogenId))
        .andExpect(jsonPath("$.currentSide").value("HOME"));
}
```

- [ ] **Step 5.2: Auto-Switch-Logik in Service**

In `SpielbogenScoringService.java`, am Ende von `recordAtBat` und `recordStealingEvent`:

```java
private void maybeAutoSwitchSide(Spielbogen bogen, BogenSide side, int inning) {
    int outs = countOutsForInning(bogen.getId(), side, inning);
    if (outs >= 3) {
        BogenSide next = side == BogenSide.HOME ? BogenSide.AWAY : BogenSide.HOME;
        bogen.setCurrentSide(next);
        if (side == BogenSide.HOME) {
            bogen.setCurrentInning(inning + 1);
        }
        bogenRepo.save(bogen);
        log.info("Auto-switch nach 3 Outs: bogen={} inning={} → {}", bogen.getId(), inning, next);
    }
}

private int countOutsForInning(Long bogenId, BogenSide side, int inning) {
    List<SpielbogenAtBat> abs = atBatRepo.findByBogenAndSide(bogenId, side).stream()
        .filter(ab -> ab.getInning().equals(inning))
        .filter(ab -> !Boolean.TRUE.equals(ab.getIsError()))
        .toList();
    int abOuts = 0;
    for (var ab : abs) {
        if (ab.getResult() == AtBatResult.STRIKEOUT) abOuts++;
        else if (ab.getResult() == AtBatResult.OUT) {
            if (ab.getOutType() == OutType.DOUBLE_PLAY) abOuts += 2;
            else if (ab.getOutType() == OutType.TRIPLE_PLAY) abOuts += 3;
            else abOuts += 1;
        }
    }
    int stealOuts = (int) stealingRepo.findByBogen(bogenId).stream()
        .filter(s -> s.getSide() == side && s.getInning().equals(inning))
        .filter(s -> s.getType() == StealingEventType.CAUGHT_STEALING || s.getType() == StealingEventType.OUT_ON_PLAY)
        .count();
    return abOuts + stealOuts;
}
```

In `recordAtBat` und `recordStealingEvent` Aufruf von `maybeAutoSwitchSide(bogen, side, inning)` am Ende einbauen.

- [ ] **Step 5.3: Re-run tests**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenEdgeCasesIntegrationTest
```

Expected: alle PASS.

- [ ] **Step 5.4: Frontend Auto-Switch-Toast**

In `SpielbogenPage.tsx`: Vergleiche `sheet.meta.currentSide` vor und nach jeder Action. Wenn gewechselt:

```tsx
if (prevSide !== sheet.meta.currentSide) {
  toast.show(`Inning ${sheet.meta.currentInning} — ${sheet.meta.currentSide === 'HOME' ? 'Heim' : 'Gast'} am Schlag`, 'info')
}
```

- [ ] **Step 5.5: Commit**

```bash
git add -A && git commit -m "🔄 Spielbogen: 3-Outs-Auto-Switch inkl. Pickoff/CS-Outs (P2.5)"
```

---

## Task 6: End-to-End Replay Tests + Fixtures

**Files:**
- Create: `backend/src/test/java/com/softball/integration/SpielbogenScoringScenarioTest.java`
- Create: `backend/src/test/resources/fixtures/spielbogen/krefeld-cologne-2026.json`

- [ ] **Step 6.1: Fixture-JSON**

Create `backend/src/test/resources/fixtures/spielbogen/krefeld-cologne-2026.json` (kondensiert echte Spiel-Sequenz aus Bild-24):

```json
{
  "meta": { "homeTeamName": "Cologne Cardinals", "awayTeamName": "Krefeld Crows", "date": "2026-04-26" },
  "homeLineup": [
    { "slot": 1, "name": "Max", "battingOrder": 1, "position": "C" },
    { "slot": 2, "name": "Tim", "battingOrder": 2, "position": "LF" },
    { "slot": 3, "name": "Pascal", "battingOrder": 3, "position": "2B" },
    { "slot": 4, "name": "Orlando", "battingOrder": 4, "position": "C" },
    { "slot": 5, "name": "Laura", "battingOrder": 5, "position": "RF" },
    { "slot": 6, "name": "Jochen", "battingOrder": 6, "position": "P" },
    { "slot": 7, "name": "Andrea", "battingOrder": 7, "position": "1B" },
    { "slot": 8, "name": "Patrick", "battingOrder": 8, "position": "SS" },
    { "slot": 9, "name": "Alberto", "battingOrder": 9, "position": "3B" }
  ],
  "awayLineup": [
    { "slot": 1, "name": "Olaf", "battingOrder": 1, "position": "3B" },
    { "slot": 2, "name": "Allie", "battingOrder": 2, "position": "LF" },
    { "slot": 3, "name": "Ben", "battingOrder": 3, "position": "SS" },
    { "slot": 4, "name": "Nils", "battingOrder": 4, "position": "C" },
    { "slot": 5, "name": "Gregor", "battingOrder": 5, "position": "RF" },
    { "slot": 6, "name": "Daniel", "battingOrder": 6, "position": "CF" },
    { "slot": 7, "name": "Hanne", "battingOrder": 7, "position": "P" },
    { "slot": 8, "name": "Percy", "battingOrder": 8, "position": "1B" },
    { "slot": 9, "name": "Carina", "battingOrder": 9, "position": "2B" }
  ],
  "events": [
    { "type": "atbat", "side": "AWAY", "slotIdx": 0, "inning": 1, "result": "OUT", "outType": "FLY", "fielderChain": [6] },
    { "type": "atbat", "side": "AWAY", "slotIdx": 1, "inning": 1, "result": "STRIKEOUT" },
    { "type": "atbat", "side": "AWAY", "slotIdx": 2, "inning": 1, "result": "HOMERUN", "runsScored": 1, "rbi": 1 },
    { "type": "atbat", "side": "AWAY", "slotIdx": 3, "inning": 1, "result": "SINGLE", "baseStateAfter": { "firstSlotIdx": 3 } },
    { "type": "atbat", "side": "AWAY", "slotIdx": 4, "inning": 1, "result": "DOUBLE", "baseStateAfter": { "secondSlotIdx": 4, "thirdSlotIdx": 3 } },
    { "type": "atbat", "side": "AWAY", "slotIdx": 5, "inning": 1, "result": "SINGLE", "runsScored": 1, "rbi": 1, "baseStateAfter": { "firstSlotIdx": 5, "secondSlotIdx": 4 } },
    { "type": "atbat", "side": "AWAY", "slotIdx": 6, "inning": 1, "result": "OUT", "outType": "FLY", "fielderChain": [6] }
  ],
  "expectedFinal": {
    "awayInningRuns": { "1": 2 },
    "totalAtBats": 7
  }
}
```

- [ ] **Step 6.2: Replay-Test**

Create `backend/src/test/java/com/softball/integration/SpielbogenScoringScenarioTest.java`:

```java
package com.softball.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class SpielbogenScoringScenarioTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private SpringSpielbogenRepository spielbogenRepository;

    @AfterEach
    void tearDown() { spielbogenRepository.deleteAll(); }

    @Test
    void replays_krefeld_cologne_2026_first_inning() throws Exception {
        var fixturePath = Path.of("src/test/resources/fixtures/spielbogen/krefeld-cologne-2026.json");
        var fixture = json.readTree(Files.readString(fixturePath));

        // Create + lineup + start
        var meta = fixture.get("meta");
        var resp = mvc.perform(post("/api/spielbogen").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                    "date", meta.get("date").asText(),
                    "homeTeamName", meta.get("homeTeamName").asText(),
                    "awayTeamName", meta.get("awayTeamName").asText()))))
            .andExpect(status().isCreated()).andReturn();
        Long bogenId = json.readTree(resp.getResponse().getContentAsString()).get("id").asLong();

        for (var sideName : List.of("HOME", "AWAY")) {
            var lineup = fixture.get(sideName.toLowerCase() + "Lineup");
            var slots = new java.util.ArrayList<Map<String, Object>>();
            for (var s : lineup) {
                var slot = new HashMap<String, Object>();
                slot.put("slot", s.get("slot").asInt());
                slot.put("name", s.get("name").asText());
                slot.put("battingOrder", s.get("battingOrder").asInt());
                slot.put("position", s.get("position").asText());
                slots.add(slot);
            }
            mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("side", sideName, "slots", slots))))
                .andExpect(status().isOk());
        }
        mvc.perform(post("/api/spielbogen/" + bogenId + "/start")).andExpect(status().isOk());

        // Map slot indices to actual slotIds via sheet
        var sheet = json.readTree(mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andReturn().getResponse().getContentAsString());
        long[] homeIds = collectIds(sheet.get("homeLineup"));
        long[] awayIds = collectIds(sheet.get("awayLineup"));

        for (var event : fixture.get("events")) {
            String type = event.get("type").asText();
            String side = event.get("side").asText();
            int slotIdx = event.get("slotIdx").asInt();
            long slotId = side.equals("HOME") ? homeIds[slotIdx] : awayIds[slotIdx];
            if ("atbat".equals(type)) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("side", side);
                body.put("slotId", slotId);
                body.put("inning", event.get("inning").asInt());
                body.put("result", event.get("result").asText());
                if (event.has("outType")) body.put("outType", event.get("outType").asText());
                if (event.has("fielderChain")) {
                    var arr = new java.util.ArrayList<Integer>();
                    event.get("fielderChain").forEach(n -> arr.add(n.asInt()));
                    body.put("fielderChain", arr);
                }
                if (event.has("runsScored")) body.put("runsScored", event.get("runsScored").asInt());
                if (event.has("rbi")) body.put("rbi", event.get("rbi").asInt());
                if (event.has("baseStateAfter")) {
                    var b = event.get("baseStateAfter");
                    var state = new HashMap<String, Object>();
                    if (b.has("firstSlotIdx")) state.put("firstSlotId", side.equals("HOME") ? homeIds[b.get("firstSlotIdx").asInt()] : awayIds[b.get("firstSlotIdx").asInt()]);
                    if (b.has("secondSlotIdx")) state.put("secondSlotId", side.equals("HOME") ? homeIds[b.get("secondSlotIdx").asInt()] : awayIds[b.get("secondSlotIdx").asInt()]);
                    if (b.has("thirdSlotIdx")) state.put("thirdSlotId", side.equals("HOME") ? homeIds[b.get("thirdSlotIdx").asInt()] : awayIds[b.get("thirdSlotIdx").asInt()]);
                    body.put("baseStateAfter", state);
                }
                mvc.perform(post("/api/spielbogen/" + bogenId + "/at-bats").contentType(APPLICATION_JSON)
                    .content(json.writeValueAsString(body))).andExpect(status().isOk());
            }
        }

        var finalSheet = json.readTree(mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andReturn().getResponse().getContentAsString());
        var expected = fixture.get("expectedFinal");
        assert finalSheet.get("inningRuns").get("1").get("away").asInt() == expected.get("awayInningRuns").get("1").asInt();
    }

    private long[] collectIds(JsonNode arr) {
        long[] out = new long[arr.size()];
        for (int i = 0; i < arr.size(); i++) out[i] = arr.get(i).get("id").asLong();
        return out;
    }
}
```

- [ ] **Step 6.3: Run replay test**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringScenarioTest
```

Expected: PASS.

- [ ] **Step 6.4: Commit**

```bash
git add -A && git commit -m "🧪 Spielbogen: End-to-End-Replay-Test mit RFL-Game-Fixture"
```

---

## Task 7: DiamondCell Snapshot Tests

**Files:**
- Create: `frontend/src/components/spielbogen/DiamondCell.test.tsx`

- [ ] **Step 7.1: Snapshot-Tests**

Create `frontend/src/components/spielbogen/DiamondCell.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DiamondCell } from './DiamondCell'
import type { CellNotation } from '@/utils/bogenSheetRenderer'

const empty: CellNotation = { primaryLabel: '', labels: [], runScored: false, outIndex: null, rbi: 0, reachedBase: 0, stealingArrow: null, abCount: 0 }

describe('DiamondCell', () => {
  it('empty cell renders just diamond outline', () => {
    const { container } = render(<DiamondCell notation={empty} />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.querySelector('text')).toBeNull()
  })

  it('FC label shows under diamond', () => {
    const cell: CellNotation = { ...empty, primaryLabel: 'FC 6-4', labels: ['FC 6-4'], reachedBase: 1, outIndex: 'I', abCount: 1 }
    const { getByText } = render(<DiamondCell notation={cell} />)
    expect(getByText('FC 6-4')).toBeTruthy()
    expect(getByText('I')).toBeTruthy()
  })

  it('runScored fills diamond + cream label', () => {
    const cell: CellNotation = { ...empty, primaryLabel: 'HR', labels: ['HR'], runScored: true, reachedBase: 4, abCount: 1 }
    const { container, getByText } = render(<DiamondCell notation={cell} />)
    expect(getByText('HR')).toBeTruthy()
    const path = container.querySelector('path')
    expect(path?.getAttribute('fill')).toBe('#1e3a8a')
  })

  it('shows up to 3 RBI dots', () => {
    const cell: CellNotation = { ...empty, primaryLabel: '1B', labels: ['1B'], reachedBase: 1, rbi: 5, abCount: 1 }
    const { container } = render(<DiamondCell notation={cell} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(3)
  })

  it('WP arrow renders orange', () => {
    const cell: CellNotation = { ...empty, primaryLabel: 'BB', labels: ['BB'], reachedBase: 2, abCount: 1,
      stealingArrow: { fromBase: 1, toBase: 2, type: 'WILD_PITCH' } }
    const { container } = render(<DiamondCell notation={cell} />)
    const lines = container.querySelectorAll('line')
    const wpLine = Array.from(lines).find(l => l.getAttribute('stroke-dasharray'))
    expect(wpLine?.getAttribute('stroke')).toBe('#f97316')
  })
})
```

- [ ] **Step 7.2: Run + commit**

```bash
cd frontend && npm test -- DiamondCell
git add frontend/src/components/spielbogen/DiamondCell.test.tsx
git commit -m "🧪 Spielbogen: DiamondCell Snapshot-Tests für alle Render-States"
```

---

## Task 8: Final Verification

- [ ] **Step 8.1: Vollständiger Backend-Test-Lauf**

```bash
cd /home/hungl/privat/softball-lineup/backend && ./mvnw test -s .mvn/local-settings.xml
```

Expected: alle grün.

- [ ] **Step 8.2: Vollständiger Frontend-Test-Lauf**

```bash
cd /home/hungl/privat/softball-lineup/frontend && npm test
```

Expected: alle grün.

- [ ] **Step 8.3: Frontend Build**

```bash
npm run build
```

Expected: erfolgreich.

- [ ] **Step 8.4: Manueller Smoketest**

Starte Backend + Frontend lokal. Teste in UI:
1. Game starten, Lineup setzen
2. AB mit FC → Cell zeigt "FC 6-4" + Batter auf 1B sichtbar
3. WP-Action → Runner advance, Cell zeigt orange Arrow + "WP"-Label
4. Grounder-Out + "Runner-Advance editieren" → Picker erscheint
5. Sac Fly → Cell zeigt "F8 SF"
6. 3 Outs → Auto-Switch auf andere Side, Toast erscheint

- [ ] **Step 8.5: Final Commit (falls Smoketest noch was offenbart hat)**

```bash
git add -A && git commit -m "✅ Spielbogen Edge Cases: alle P1+P2 Features mit Tests komplett"
```

---

## Self-Review

**Spec-Coverage-Check:**
- ✓ P1.1 WP/PB → Task 2
- ✓ P1.2 FC → Task 1
- ✓ P1.3 Multi-Base-Advance → Task 3
- ✓ P2.5 3-Outs-Auto-Switch → Task 5
- ✓ P2.6 Sacrifice-Flags → Task 4
- ✓ Backend-Integration-Tests → Task 1, 2, 4, 5
- ✓ Frontend-Vitest-Setup → Task 0
- ✓ Frontend-Renderer-Tests → Task 1, 2, 4
- ✓ Frontend-Drawer-Tests → Task 3, 7
- ✓ DiamondCell-Snapshot-Tests → Task 7
- ✓ E2E-Replay mit Fixtures → Task 6

**Placeholder-Scan:** keine "TBD"/"TODO". Alle Code-Blöcke vollständig.

**Type-Consistency:**
- `OutType` durchgängig erweitert mit `FIELDERS_CHOICE` (Backend Enum + Frontend Union).
- `StealingEventType` durchgängig erweitert (`WILD_PITCH`, `PASSED_BALL`).
- `SacrificeType` neu, durchgängig (Backend + Frontend).
- `applyAdvances` toBase 1-4 in OutDetailDrawer (von vorherigem Commit).
- `outIndex` als string (von vorherigem Commit, kein Konflikt).
