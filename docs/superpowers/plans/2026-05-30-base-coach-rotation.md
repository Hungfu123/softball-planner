# Base-Coach-Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-game Base-Coach-Rotation aus Lineup für 10er/11er-Setups mit Halbe-Lineup-Split-Schema, Recommendation-Engine + PDF/UI-Darstellung.

**Architecture:** Backend: neues `CoachRotationPair` Enum (3 Werte), 2 nullable Felder am `Game`. Frontend: Pure-Function-Util für Resolve + Scoring, Conditional-Picker in `CoachSlots`, Coach-Badge in `LineupEditor`, neue PDF-Function `drawCoachRotationBox` in 3 PDF-Generatoren.

**Tech Stack:** Java 21 / Spring Boot 3.4 / Flyway / Hibernate (Backend); React 19 / TypeScript / Tailwind v4 / jsPDF (Frontend).

**Reference:** Spec `docs/superpowers/specs/2026-05-30-base-coach-rotation-design.md`.

---

## File Structure

### Backend
- **Create:** `backend/src/main/java/com/softball/domain/model/CoachRotationPair.java` (Enum)
- **Create:** `backend/src/main/resources/db/migration/V34__add_base_coach_rotation.sql`
- **Create:** `backend/src/main/java/com/softball/adapter/dto/SetCoachRotationRequest.java`
- **Create:** `backend/src/test/java/com/softball/domain/model/CoachRotationPairTest.java`
- **Modify:** `backend/src/main/java/com/softball/adapter/out/persistence/entity/GameEntity.java` (+ 2 Fields)
- **Modify:** `backend/src/main/java/com/softball/domain/model/Game.java` (+ 2 Fields)
- **Modify:** `backend/src/main/java/com/softball/adapter/out/persistence/mapper/GameMapper.java` (+ mapping)
- **Modify:** `backend/src/main/java/com/softball/adapter/dto/GameResponse.java` (+ 2 Fields)
- **Modify:** `backend/src/main/java/com/softball/application/GameService.java` (+ setCoachRotation)
- **Modify:** `backend/src/main/java/com/softball/application/GameStaffService.java` (+ rotation cleanup)
- **Modify:** `backend/src/main/java/com/softball/adapter/in/web/GameController.java` (+ PUT endpoint)
- **Modify:** `backend/src/test/java/com/softball/service/GameServiceTest.java`

### Frontend
- **Create:** `frontend/src/utils/coachRotation.ts` (resolve + scoring pure functions)
- **Create:** `frontend/src/utils/coachRotation.test.ts`
- **Modify:** `frontend/src/types/index.ts` (+ `CoachRotationPair` type + extend `GameResponse`)
- **Modify:** `frontend/src/api/client.ts` (+ setCoachRotation)
- **Modify:** `frontend/src/icons/index.tsx` (+ CoachFlagIcon)
- **Modify:** `frontend/src/components/planner/CoachSlots.tsx` (+ Picker + Preview)
- **Modify:** `frontend/src/components/planner/LineupEditor.tsx` (+ Coach-Badge — optional Phase D)
- **Modify:** `frontend/src/utils/pdfExport.ts` (+ drawCoachRotationBox + integrations)

---

## Task 1: CoachRotationPair Enum (Backend Domain)

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/CoachRotationPair.java`

- [ ] **Step 1: Create enum with config data**

```java
package com.softball.domain.model;

import java.util.List;

public enum CoachRotationPair {
    POS_3_8(3, 8, "4–8", "9–10, 1–3", "#1–#2", "#6–#7"),
    POS_4_9(4, 9, "5–9", "10, 1–4", "#2–#3", "#7–#8"),
    POS_5_10(5, 10, "6–10", "1–5", "#3–#4", "#8–#9");

    private final int lowerPosition;
    private final int higherPosition;
    private final String lowerRangeLabel;
    private final String higherRangeLabel;
    private final String lowerWarmupLabel;
    private final String higherWarmupLabel;

    CoachRotationPair(final int lowerPosition, final int higherPosition,
                      final String lowerRangeLabel, final String higherRangeLabel,
                      final String lowerWarmupLabel, final String higherWarmupLabel) {
        this.lowerPosition = lowerPosition;
        this.higherPosition = higherPosition;
        this.lowerRangeLabel = lowerRangeLabel;
        this.higherRangeLabel = higherRangeLabel;
        this.lowerWarmupLabel = lowerWarmupLabel;
        this.higherWarmupLabel = higherWarmupLabel;
    }

    public int getLowerPosition() { return lowerPosition; }
    public int getHigherPosition() { return higherPosition; }
    public String getLowerRangeLabel() { return lowerRangeLabel; }
    public String getHigherRangeLabel() { return higherRangeLabel; }
    public String getLowerWarmupLabel() { return lowerWarmupLabel; }
    public String getHigherWarmupLabel() { return higherWarmupLabel; }

    public List<Integer> getPositions() {
        return List.of(lowerPosition, higherPosition);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/CoachRotationPair.java
git commit -m "✨ Add CoachRotationPair enum (Backend)"
```

---

## Task 2: CoachRotationPair Unit Test

**Files:**
- Create: `backend/src/test/java/com/softball/domain/model/CoachRotationPairTest.java`

- [ ] **Step 1: Write tests**

```java
package com.softball.domain.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CoachRotationPairTest {

    @Test
    void pos_5_10_hasCorrectMappings() {
        var pair = CoachRotationPair.POS_5_10;
        assertEquals(5, pair.getLowerPosition());
        assertEquals(10, pair.getHigherPosition());
        assertEquals("6–10", pair.getLowerRangeLabel());
        assertEquals("1–5", pair.getHigherRangeLabel());
        assertEquals("#3–#4", pair.getLowerWarmupLabel());
        assertEquals("#8–#9", pair.getHigherWarmupLabel());
    }

    @Test
    void pos_4_9_hasWrapHigherRange() {
        var pair = CoachRotationPair.POS_4_9;
        assertEquals(4, pair.getLowerPosition());
        assertEquals(9, pair.getHigherPosition());
        assertEquals("5–9", pair.getLowerRangeLabel());
        assertEquals("10, 1–4", pair.getHigherRangeLabel());
    }

    @Test
    void pos_3_8_hasWrapHigherRange() {
        var pair = CoachRotationPair.POS_3_8;
        assertEquals(3, pair.getLowerPosition());
        assertEquals(8, pair.getHigherPosition());
        assertEquals("4–8", pair.getLowerRangeLabel());
        assertEquals("9–10, 1–3", pair.getHigherRangeLabel());
    }

    @Test
    void getPositions_returnsBothPositions() {
        assertEquals(java.util.List.of(5, 10), CoachRotationPair.POS_5_10.getPositions());
    }
}
```

- [ ] **Step 2: Run test**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=CoachRotationPairTest
```

Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/softball/domain/model/CoachRotationPairTest.java
git commit -m "🧪 Test CoachRotationPair enum mappings"
```

---

## Task 3: Flyway Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V34__add_base_coach_rotation.sql`

- [ ] **Step 1: Write migration**

```sql
-- T18: Base-Coach-Rotation aus Lineup für 10/11-Spieler-Setups
-- Bei leerem GameStaff-Slot (1B oder 3B) wird Rotation aus Lineup gewählt.
-- 3 Paare: POS_3_8, POS_4_9, POS_5_10.

ALTER TABLE games ADD COLUMN first_base_coach_rotation VARCHAR(20);
ALTER TABLE games ADD COLUMN third_base_coach_rotation VARCHAR(20);
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/resources/db/migration/V34__add_base_coach_rotation.sql
git commit -m "✨ Flyway V34: add base_coach_rotation columns to games"
```

---

## Task 4: Extend GameEntity

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/GameEntity.java`

- [ ] **Step 1: Add fields + getter/setter**

Insert after `private String battingSide;` (line ~39):

```java
@Enumerated(EnumType.STRING)
@Column(name = "first_base_coach_rotation", length = 20)
private com.softball.domain.model.CoachRotationPair firstBaseCoachRotation;

@Enumerated(EnumType.STRING)
@Column(name = "third_base_coach_rotation", length = 20)
private com.softball.domain.model.CoachRotationPair thirdBaseCoachRotation;
```

At the bottom of the class (after `setBattingSide`), add:

```java
public com.softball.domain.model.CoachRotationPair getFirstBaseCoachRotation() { return firstBaseCoachRotation; }
public void setFirstBaseCoachRotation(final com.softball.domain.model.CoachRotationPair v) { this.firstBaseCoachRotation = v; }
public com.softball.domain.model.CoachRotationPair getThirdBaseCoachRotation() { return thirdBaseCoachRotation; }
public void setThirdBaseCoachRotation(final com.softball.domain.model.CoachRotationPair v) { this.thirdBaseCoachRotation = v; }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/entity/GameEntity.java
git commit -m "✨ GameEntity: + firstBase/thirdBaseCoachRotation Fields"
```

---

## Task 5: Extend Domain Game

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/Game.java`

- [ ] **Step 1: Add fields**

Insert after `private String battingSide;`:

```java
private CoachRotationPair firstBaseCoachRotation;
private CoachRotationPair thirdBaseCoachRotation;
```

At the bottom, add getter/setter:

```java
public CoachRotationPair getFirstBaseCoachRotation() { return firstBaseCoachRotation; }
public void setFirstBaseCoachRotation(final CoachRotationPair v) { this.firstBaseCoachRotation = v; }
public CoachRotationPair getThirdBaseCoachRotation() { return thirdBaseCoachRotation; }
public void setThirdBaseCoachRotation(final CoachRotationPair v) { this.thirdBaseCoachRotation = v; }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/Game.java
git commit -m "✨ Game domain: + coach-rotation Fields"
```

---

## Task 6: Update GameMapper

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/GameMapper.java`

- [ ] **Step 1: Map new fields**

Add after `game.setBattingSide(entity.getBattingSide());`:

```java
game.setFirstBaseCoachRotation(entity.getFirstBaseCoachRotation());
game.setThirdBaseCoachRotation(entity.getThirdBaseCoachRotation());
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/mapper/GameMapper.java
git commit -m "✨ GameMapper: map coach-rotation Fields"
```

---

## Task 7: Extend GameResponse Record

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/GameResponse.java`

- [ ] **Step 1: Add fields + update factory**

Replace entire file content with:

```java
package com.softball.adapter.dto;

import com.softball.domain.model.CoachRotationPair;
import com.softball.domain.model.Game;

import java.time.Instant;

public record GameResponse(Long id, Integer gameNumber, LeagueTeamResponse opponentTeam,
                            Integer scoreUs, Integer scoreThem, Long gameDayId,
                            int lineupEntryCount,
                            Instant endedAt,
                            String battingSide,
                            long atBatCount,
                            CoachRotationPair firstBaseCoachRotation,
                            CoachRotationPair thirdBaseCoachRotation) {

    public static GameResponse from(final Game game) {
        return from(game, 0L, null);
    }

    public static GameResponse from(final Game game, final long atBatCount, final Integer liveScoreUs) {
        final Integer effectiveScoreUs = liveScoreUs != null ? liveScoreUs : game.getScoreUs();
        return new GameResponse(
            game.getId(),
            game.getGameNumber(),
            game.getOpponentTeam() != null ? LeagueTeamResponse.from(game.getOpponentTeam()) : null,
            effectiveScoreUs,
            game.getScoreThem(),
            game.getGameDayId(),
            game.getLineupEntryCount(),
            game.getEndedAt(),
            game.getBattingSide(),
            atBatCount,
            game.getFirstBaseCoachRotation(),
            game.getThirdBaseCoachRotation()
        );
    }
}
```

- [ ] **Step 2: Verify compile**

```bash
cd backend && ./mvnw compile -s .mvn/local-settings.xml -q
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/GameResponse.java
git commit -m "✨ GameResponse: + coach-rotation Fields"
```

---

## Task 8: SetCoachRotationRequest DTO

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/SetCoachRotationRequest.java`

- [ ] **Step 1: Create DTO**

```java
package com.softball.adapter.dto;

import com.softball.domain.model.CoachRotationPair;

public record SetCoachRotationRequest(
    CoachRotationPair firstBaseCoachRotation,
    CoachRotationPair thirdBaseCoachRotation
) {}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/SetCoachRotationRequest.java
git commit -m "✨ SetCoachRotationRequest DTO"
```

---

## Task 9: GameService.setCoachRotation

**Files:**
- Modify: `backend/src/main/java/com/softball/application/GameService.java`

- [ ] **Step 1: Check existing imports + methods**

Read the file first to find proper insert location. Look for `endGame` method, add new method below it.

- [ ] **Step 2: Add setCoachRotation method**

Add new method (e.g. after `endGame`):

```java
@Transactional
public Game setCoachRotation(final Long gameId,
                              final CoachRotationPair firstBaseRotation,
                              final CoachRotationPair thirdBaseRotation) {
    final Game game = findById(gameId);
    game.setFirstBaseCoachRotation(firstBaseRotation);
    game.setThirdBaseCoachRotation(thirdBaseRotation);
    gameRepository.save(game);
    log.info("Game {} coach-rotation set: 1B={}, 3B={}", gameId, firstBaseRotation, thirdBaseRotation);
    return game;
}
```

Add import at top if not present:
```java
import com.softball.domain.model.CoachRotationPair;
```

- [ ] **Step 3: Compile**

```bash
cd backend && ./mvnw compile -s .mvn/local-settings.xml -q
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/application/GameService.java
git commit -m "✨ GameService.setCoachRotation"
```

---

## Task 10: GameStaffService — Cleanup-on-Staff-Set

**Files:**
- Modify: `backend/src/main/java/com/softball/application/GameStaffService.java`

- [ ] **Step 1: Find setStaff method, add rotation cleanup**

Read `GameStaffService.java`. In the `setStaff(...)` method (and `addStaff(...)` if separate), after the staff list is updated, check if a `BASE_COACH_1ST` or `BASE_COACH_3RD` is now present and clear corresponding `Game` rotation field.

Pseudo-pattern:
```java
final boolean hasFirstBaseCoach = newStaff.stream()
    .anyMatch(s -> s.getRole() == StaffRole.BASE_COACH_1ST);
final boolean hasThirdBaseCoach = newStaff.stream()
    .anyMatch(s -> s.getRole() == StaffRole.BASE_COACH_3RD);

if (hasFirstBaseCoach && game.getFirstBaseCoachRotation() != null) {
    game.setFirstBaseCoachRotation(null);
    gameRepository.save(game);
}
if (hasThirdBaseCoach && game.getThirdBaseCoachRotation() != null) {
    game.setThirdBaseCoachRotation(null);
    gameRepository.save(game);
}
```

Insert before the method returns. Add `gameRepository` field if not present (inject via constructor).

- [ ] **Step 2: Compile**

```bash
cd backend && ./mvnw compile -s .mvn/local-settings.xml -q
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/application/GameStaffService.java
git commit -m "✨ GameStaffService: clear rotation when coach-staff assigned"
```

---

## Task 11: GameController — PUT /coach-rotation Endpoint

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/in/web/GameController.java`

- [ ] **Step 1: Add endpoint**

Insert after `getGame` method:

```java
@PutMapping("/{id}/coach-rotation")
public GameResponse setCoachRotation(@PathVariable final Long id,
                                      @RequestBody final SetCoachRotationRequest request) {
    return toResponseWithLive(gameService.setCoachRotation(
        id, request.firstBaseCoachRotation(), request.thirdBaseCoachRotation()));
}
```

- [ ] **Step 2: Compile**

```bash
cd backend && ./mvnw compile -s .mvn/local-settings.xml -q
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/in/web/GameController.java
git commit -m "✨ GameController: PUT /api/games/{id}/coach-rotation"
```

---

## Task 12: GameService Integration Test

**Files:**
- Modify: `backend/src/test/java/com/softball/service/GameServiceTest.java`

- [ ] **Step 1: Check existing test patterns**

Read the existing GameServiceTest to see Mock patterns + test style.

- [ ] **Step 2: Add tests**

Add tests for `setCoachRotation` + verify staff cleanup behavior:

```java
@Test
void setCoachRotation_storesValues() {
    Long gameId = 1L;
    when(gameRepository.findById(gameId)).thenReturn(Optional.of(testGame()));
    when(gameRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Game result = gameService.setCoachRotation(gameId, CoachRotationPair.POS_4_9, CoachRotationPair.POS_5_10);

    assertEquals(CoachRotationPair.POS_4_9, result.getFirstBaseCoachRotation());
    assertEquals(CoachRotationPair.POS_5_10, result.getThirdBaseCoachRotation());
}

@Test
void setCoachRotation_allowsNull() {
    Long gameId = 1L;
    when(gameRepository.findById(gameId)).thenReturn(Optional.of(testGame()));
    when(gameRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Game result = gameService.setCoachRotation(gameId, null, null);

    assertNull(result.getFirstBaseCoachRotation());
    assertNull(result.getThirdBaseCoachRotation());
}
```

(Adjust `testGame()` helper to whatever is used in existing tests.)

- [ ] **Step 3: Run tests**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameServiceTest
```

Expected: PASS (existing + new).

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/java/com/softball/service/GameServiceTest.java
git commit -m "🧪 GameServiceTest: + setCoachRotation"
```

---

## Task 13: Frontend Types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add CoachRotationPair type**

Find existing GameResponse interface (line ~30). Add new type above:

```typescript
export type CoachRotationPair = 'POS_3_8' | 'POS_4_9' | 'POS_5_10'
```

Then extend `GameResponse` with two new fields:

```typescript
export interface GameResponse {
  id: number
  gameNumber: number
  opponentTeam: LeagueTeamResponse | null
  scoreUs: number | null
  scoreThem: number | null
  gameDayId: number
  lineupEntryCount: number
  endedAt?: string | null
  battingSide?: 'top' | 'bottom' | null
  atBatCount?: number
  firstBaseCoachRotation?: CoachRotationPair | null
  thirdBaseCoachRotation?: CoachRotationPair | null
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "✨ Frontend types: CoachRotationPair + extend GameResponse"
```

---

## Task 14: API Client setCoachRotation

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add API function**

Insert after `getGame(...)`:

```typescript
export const setCoachRotation = (
  gameId: number,
  firstBaseCoachRotation: CoachRotationPair | null,
  thirdBaseCoachRotation: CoachRotationPair | null
) =>
  request<GameResponse>(`/games/${gameId}/coach-rotation`, {
    method: 'PUT',
    body: JSON.stringify({ firstBaseCoachRotation, thirdBaseCoachRotation }),
  })
```

Add import for the type at top of file if needed:
```typescript
import type { CoachRotationPair, GameResponse } from '@/types'
```
(check existing imports — `GameResponse` is likely already imported).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "✨ API: setCoachRotation"
```

---

## Task 15: CoachFlagIcon

**Files:**
- Modify: `frontend/src/icons/index.tsx`

- [ ] **Step 1: Add icon**

Find the import line for lucide icons, add `Flag` to the imports. Then add export:

```typescript
import { Flag } from 'lucide-react'
// ... existing exports
export const CoachFlagIcon = (p: IconProps) => <Flag size={p.size ?? 14} className={p.className} />
```

(If lucide import is grouped, append `Flag` to the import-list.)

- [ ] **Step 2: Commit**

```bash
git add frontend/src/icons/index.tsx
git commit -m "✨ Icons: + CoachFlagIcon (wrap lucide Flag)"
```

---

## Task 16: coachRotation.ts — Pure Util Functions

**Files:**
- Create: `frontend/src/utils/coachRotation.ts`

- [ ] **Step 1: Create util module**

```typescript
import type { CoachRotationPair, LineupEntryResponse } from '@/types'

interface ResolvedCoachSide {
  name: string
  pos: number
  range: string
  warmup: string
}

export interface ResolvedRotation {
  pair: CoachRotationPair
  higher: ResolvedCoachSide  // höhere Position (z.B. Pos 10 bei POS_5_10)
  lower: ResolvedCoachSide   // niedrigere Position (z.B. Pos 5)
}

interface RotationConfig {
  lower: number
  higher: number
  lowerRange: string
  higherRange: string
  lowerWarmup: string
  higherWarmup: string
}

const ROTATION_CONFIG: Record<CoachRotationPair, RotationConfig> = {
  POS_3_8:  { lower: 3, higher: 8,  lowerRange: '4–8',  higherRange: '9–10, 1–3', lowerWarmup: '#1–#2', higherWarmup: '#6–#7' },
  POS_4_9:  { lower: 4, higher: 9,  lowerRange: '5–9',  higherRange: '10, 1–4',   lowerWarmup: '#2–#3', higherWarmup: '#7–#8' },
  POS_5_10: { lower: 5, higher: 10, lowerRange: '6–10', higherRange: '1–5',       lowerWarmup: '#3–#4', higherWarmup: '#8–#9' },
}

export function resolveRotation(pair: CoachRotationPair, lineup: LineupEntryResponse[]): ResolvedRotation {
  const config = ROTATION_CONFIG[pair]
  const higherEntry = lineup.find(e => e.battingOrder === config.higher)
  const lowerEntry  = lineup.find(e => e.battingOrder === config.lower)

  return {
    pair,
    higher: {
      name: higherEntry?.player.name ?? '—',
      pos: config.higher,
      range: config.higherRange,
      warmup: config.higherWarmup,
    },
    lower: {
      name: lowerEntry?.player.name ?? '—',
      pos: config.lower,
      range: config.lowerRange,
      warmup: config.lowerWarmup,
    },
  }
}

export const ALL_ROTATION_PAIRS: CoachRotationPair[] = ['POS_3_8', 'POS_4_9', 'POS_5_10']

export function getPairLabel(pair: CoachRotationPair): string {
  const { lower, higher } = ROTATION_CONFIG[pair]
  return `Pos ${lower}+${higher}`
}

/**
 * Score a rotation pair given the current lineup.
 * Higher = better fit. Used for recommendation engine.
 */
export function scoreRotationPair(pair: CoachRotationPair, lineup: LineupEntryResponse[]): number {
  let score = 100
  const config = ROTATION_CONFIG[pair]

  for (const pos of [config.lower, config.higher]) {
    const entry = lineup.find(e => e.battingOrder === pos)
    if (!entry) {
      score -= 40  // Lineup unvollständig auf der Position
      continue
    }
    if (entry.position === 'P') {
      score -= 50  // Pitcher als Coach ist suboptimal
    }
    if (entry.battingOrder === 4) {
      score -= 30  // Cleanup-Hitter sollte nicht coachen
    }
  }

  // Wrap-Around-Paare leicht abgewertet (Mathematik unkomplizierter ohne)
  if (pair !== 'POS_5_10') {
    score -= 5
  }

  return score
}

export function recommendRotationPair(lineup: LineupEntryResponse[]): CoachRotationPair {
  const scored = ALL_ROTATION_PAIRS.map(p => ({ pair: p, score: scoreRotationPair(p, lineup) }))
  scored.sort((a, b) => b.score - a.score)
  return scored[0].pair  // Highest score, POS_5_10 as natural tiebreaker (last in array stable-sort-wise)
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/coachRotation.ts
git commit -m "✨ coachRotation util: resolve + scoring + recommendation"
```

---

## Task 17: coachRotation.test.ts

**Files:**
- Create: `frontend/src/utils/coachRotation.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest'
import type { LineupEntryResponse } from '@/types'
import { resolveRotation, scoreRotationPair, recommendRotationPair } from './coachRotation'

function makeEntry(battingOrder: number, name: string, position: string | null = 'LF'): LineupEntryResponse {
  return {
    id: battingOrder * 10,
    battingOrder,
    position,
    player: { id: battingOrder, name },
    dhBatterPlayer: null,
  } as LineupEntryResponse
}

const fullLineup: LineupEntryResponse[] = [
  makeEntry(1, 'Khang', 'EH'),
  makeEntry(2, 'Hung', 'CF'),
  makeEntry(3, 'Yuki', 'SS'),
  makeEntry(4, 'Mitchi', 'LF'),
  makeEntry(5, 'Mike', '3B'),
  makeEntry(6, 'Miriam', 'C'),
  makeEntry(7, 'Martin', '1B'),
  makeEntry(8, 'Madita', 'P'),
  makeEntry(9, 'Vivi', '2B'),
  makeEntry(10, 'Tristan', 'RF'),
]

describe('resolveRotation', () => {
  it('POS_5_10 maps to Mike/Tristan correctly', () => {
    const r = resolveRotation('POS_5_10', fullLineup)
    expect(r.lower.name).toBe('Mike')
    expect(r.lower.pos).toBe(5)
    expect(r.lower.range).toBe('6–10')
    expect(r.lower.warmup).toBe('#3–#4')
    expect(r.higher.name).toBe('Tristan')
    expect(r.higher.pos).toBe(10)
    expect(r.higher.range).toBe('1–5')
    expect(r.higher.warmup).toBe('#8–#9')
  })

  it('POS_4_9 has wrap range for higher', () => {
    const r = resolveRotation('POS_4_9', fullLineup)
    expect(r.higher.range).toBe('10, 1–4')
  })

  it('POS_3_8 has wrap range for higher', () => {
    const r = resolveRotation('POS_3_8', fullLineup)
    expect(r.higher.range).toBe('9–10, 1–3')
  })

  it('returns em-dash when position not in lineup', () => {
    const r = resolveRotation('POS_5_10', fullLineup.slice(0, 8))  // only 8 entries
    expect(r.higher.name).toBe('—')
  })
})

describe('scoreRotationPair', () => {
  it('POS_5_10 is highest when Pos 8 is pitcher (Madita)', () => {
    const s = scoreRotationPair('POS_5_10', fullLineup)
    expect(s).toBeGreaterThan(scoreRotationPair('POS_3_8', fullLineup))
    expect(s).toBeGreaterThan(scoreRotationPair('POS_4_9', fullLineup))
  })

  it('penalizes Pitcher on coach position', () => {
    const s38 = scoreRotationPair('POS_3_8', fullLineup)
    // POS_3_8 includes Pos 8 = Madita (pitcher) → -50
    expect(s38).toBeLessThan(70)
  })

  it('penalizes cleanup hitter on Pos 4', () => {
    const s49 = scoreRotationPair('POS_4_9', fullLineup)
    // POS_4_9 includes Pos 4 = Cleanup → -30
    expect(s49).toBeLessThan(80)
  })

  it('penalizes wrap pairs slightly', () => {
    // POS_5_10 has no wrap penalty, others have -5
    // pure check: build lineup without Pitcher to isolate wrap effect
    const noPitcher = fullLineup.map(e => e.position === 'P' ? { ...e, position: 'LF' } : e)
    expect(scoreRotationPair('POS_5_10', noPitcher)).toBeGreaterThan(scoreRotationPair('POS_3_8', noPitcher))
  })
})

describe('recommendRotationPair', () => {
  it('recommends POS_5_10 for default Trier-Lineup', () => {
    expect(recommendRotationPair(fullLineup)).toBe('POS_5_10')
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx vitest run src/utils/coachRotation.test.ts
```

Expected: PASS all.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/coachRotation.test.ts
git commit -m "🧪 coachRotation: resolve + scoring tests"
```

---

## Task 18: CoachSlots — Rotation Picker + Preview

**Files:**
- Modify: `frontend/src/components/planner/CoachSlots.tsx`

- [ ] **Step 1: Read existing file**

Familiarize with current implementation (props, onSave pattern, state).

- [ ] **Step 2: Add props + state for rotation**

Extend `Props`:

```typescript
interface Props {
  staff: GameStaffResponse[]
  availablePlayers: Player[]
  lineup: LineupEntryResponse[]                    // NEU
  game: GameResponse                                // NEU
  onSave: (entries: { playerId: number; role: string }[]) => Promise<void>
  onSaveRotation: (firstBase: CoachRotationPair | null, thirdBase: CoachRotationPair | null) => Promise<void>  // NEU
}
```

Add imports:
```typescript
import { CoachFlagIcon, StarIcon } from '@/icons'
import { ALL_ROTATION_PAIRS, getPairLabel, recommendRotationPair, resolveRotation } from '@/utils/coachRotation'
import type { CoachRotationPair, GameResponse, LineupEntryResponse } from '@/types'
```

- [ ] **Step 3: Add Rotation-Picker JSX block**

Insert AFTER the existing `select` for each coach (inside the `.map(...)` loop):

```tsx
{!value && lineup.length >= 10 && (
  <RotationPicker
    role={role}
    lineup={lineup}
    currentValue={role === 'BASE_COACH_1ST' ? game.firstBaseCoachRotation : game.thirdBaseCoachRotation}
    onChange={(pair) => {
      if (role === 'BASE_COACH_1ST') {
        onSaveRotation(pair, game.thirdBaseCoachRotation ?? null)
      } else {
        onSaveRotation(game.firstBaseCoachRotation ?? null, pair)
      }
    }}
  />
)}
{!value && lineup.length < 10 && (
  <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
    Lineup mit 10 Spielern nötig für Coach-Rotation
  </div>
)}
```

- [ ] **Step 4: Define inline `RotationPicker` component**

Below `CoachSlots` (in same file) — keep file self-contained:

```tsx
interface RotationPickerProps {
  role: string
  lineup: LineupEntryResponse[]
  currentValue: CoachRotationPair | null | undefined
  onChange: (pair: CoachRotationPair | null) => void
}

function RotationPicker({ role, lineup, currentValue, onChange }: RotationPickerProps) {
  const recommended = useMemo(() => recommendRotationPair(lineup), [lineup])
  const active = currentValue ?? recommended  // visual default, persist erst beim Klick
  const resolved = useMemo(() => resolveRotation(active, lineup), [active, lineup])

  return (
    <div className="mt-2 space-y-2">
      <div className="font-display text-[9px] tracking-widest uppercase font-bold text-gray-500 flex items-center gap-1">
        ↳ Rotation aus Lineup
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_ROTATION_PAIRS.map(pair => {
          const isActive = active === pair
          const isRecommended = recommended === pair
          return (
            <button
              key={pair}
              onClick={() => onChange(pair)}
              className={`font-display px-2.5 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-full transition-colors min-h-[36px] whitespace-nowrap flex items-center gap-1
                ${isActive
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-cream-100 text-gray-600 hover:bg-cream-200 hover:text-navy-900 border border-cream-300'}`}
            >
              {getPairLabel(pair)}
              {isRecommended && !isActive && (
                <StarIcon size={9} className="text-amber-500 fill-amber-500" />
              )}
            </button>
          )
        })}
      </div>
      {/* 2-Block Preview */}
      <div className="bg-cream-50 border border-cream-300 rounded-xl p-3">
        <div className="font-display text-[9px] tracking-widest uppercase font-bold text-softball-red-600 mb-2">
          Aktiv · {getPairLabel(active).toUpperCase()}
        </div>
        <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden border border-cream-200">
          <div className="bg-softball-red-50 p-2.5">
            <div className="font-display text-[10px] tracking-widest uppercase font-bold text-softball-red-700 mb-1">
              Schlag {resolved.higher.range}
            </div>
            <div className="font-display font-extrabold text-navy-900 text-sm">{resolved.higher.name}</div>
            <div className="font-display text-[10px] tracking-wider text-gray-500">Pos {resolved.higher.pos}</div>
          </div>
          <div className="bg-cream-100 p-2.5 border-l-2 border-navy-900">
            <div className="font-display text-[10px] tracking-widest uppercase font-bold text-navy-700 mb-1">
              Schlag {resolved.lower.range}
            </div>
            <div className="font-display font-extrabold text-navy-900 text-sm">{resolved.lower.name}</div>
            <div className="font-display text-[10px] tracking-wider text-gray-500">Pos {resolved.lower.pos}</div>
          </div>
        </div>
        <div className="font-display text-[10px] text-gray-500 italic mt-2">
          Warmup: {resolved.higher.name} {resolved.higher.warmup}, {resolved.lower.name} {resolved.lower.warmup}
        </div>
      </div>
    </div>
  )
}
```

Add `useMemo` import at top: `import { useState, useEffect, useRef, useMemo } from 'react'`.

- [ ] **Step 5: Verify build**

```bash
cd frontend && npm run build
```

Expected: success.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/planner/CoachSlots.tsx
git commit -m "✨ CoachSlots: Rotation-Picker + 2-Block-Preview + Recommendation"
```

---

## Task 19: GameDayPlanner — Wire onSaveRotation

**Files:**
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx`

- [ ] **Step 1: Add handler**

Find existing `handleStaffSave` function. Add parallel:

```typescript
const handleRotationSave = async (
  firstBase: CoachRotationPair | null,
  thirdBase: CoachRotationPair | null
) => {
  if (!activeGame) return
  const updated = await api.setCoachRotation(activeGame.id, firstBase, thirdBase)
  // Refresh game state — pattern matches existing API flows
  refreshGame(updated)  // <-- use whatever refresh pattern existing code uses
}
```

(Check existing code for how game-state-refresh is done — there's likely a hook like `useGameDay` or similar with a `reload()` method. Use that.)

- [ ] **Step 2: Pass props to CoachSlots**

Find each `<CoachSlots ...>` usage (3 spots in GameDayPlanner per earlier grep). Add new props:

```tsx
<CoachSlots
  staff={staff.staff}
  availablePlayers={...}
  lineup={lineup.entries}      // NEU
  game={activeGame}             // NEU
  onSave={handleStaffSave}
  onSaveRotation={handleRotationSave}  // NEU
/>
```

- [ ] **Step 3: Add imports if needed**

```typescript
import type { CoachRotationPair } from '@/types'
```

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/planner/GameDayPlanner.tsx
git commit -m "✨ GameDayPlanner: wire CoachSlots rotation save"
```

---

## Task 20: LineupEditor — Coach-Badge

**Files:**
- Modify: `frontend/src/components/planner/LineupEditor.tsx`

- [ ] **Step 1: Read file to find Lineup-Row component**

Find where each Lineup-Entry is rendered (likely a row with battingOrder, player name, position).

- [ ] **Step 2: Add Coach-Badge logic**

Add prop:
```typescript
interface Props {
  // ... existing props
  game: GameResponse  // NEU — needed for rotation lookup
}
```

Inside the row-render, after the player-name span, add:

```tsx
{(() => {
  const firstBasePair = game.firstBaseCoachRotation
  const thirdBasePair = game.thirdBaseCoachRotation
  const config = {
    POS_3_8: [3, 8],
    POS_4_9: [4, 9],
    POS_5_10: [5, 10],
  } as const
  const is1B = firstBasePair && config[firstBasePair].includes(entry.battingOrder as 3|4|5|8|9|10)
  const is3B = thirdBasePair && config[thirdBasePair].includes(entry.battingOrder as 3|4|5|8|9|10)
  return (
    <>
      {is1B && <CoachBadge label="1B" />}
      {is3B && <CoachBadge label="3B" />}
    </>
  )
})()}
```

Define `CoachBadge` at bottom of file:

```tsx
function CoachBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase rounded-full bg-softball-red-100 text-softball-red-700">
      <CoachFlagIcon size={9} />
      {label}
    </span>
  )
}
```

Add imports:
```typescript
import { CoachFlagIcon } from '@/icons'
import type { GameResponse } from '@/types'
```

- [ ] **Step 3: Pass game prop from GameDayPlanner**

In GameDayPlanner, where `<LineupEditor ...>` is rendered, add `game={activeGame}`.

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/planner/LineupEditor.tsx frontend/src/components/planner/GameDayPlanner.tsx
git commit -m "✨ LineupEditor: Coach-Badge für Rotation-Positions"
```

---

## Task 21: PDF — drawCoachRotationBox Function

**Files:**
- Modify: `frontend/src/utils/pdfExport.ts`

- [ ] **Step 1: Add import + helper function**

At top, add import:

```typescript
import type { CoachRotationPair } from '@/types'
import { resolveRotation, getPairLabel } from './coachRotation'
```

Add new function inside the file (before `generatePdf`):

```typescript
function drawCoachRotationBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  pair: CoachRotationPair,
  lineup: LineupEntryResponse[],
  baseLabel: '1B' | '3B',
): number {
  const resolved = resolveRotation(pair, lineup)
  const half = w / 2
  const blockH = 16

  // Eyebrow
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(200, 46, 46)
  doc.setCharSpace(1.2)
  doc.text(`${baseLabel}-COACH ROTATION · ${getPairLabel(pair).toUpperCase()}`, x, y + 3)
  doc.setCharSpace(0)
  let cursorY = y + 6

  // Linker Block (rot-getönt) — HIGHER position
  doc.setFillColor(252, 234, 234)
  doc.rect(x, cursorY, half, blockH, 'F')
  // Rechter Block (cream)
  doc.setFillColor(248, 244, 232)
  doc.rect(x + half, cursorY, half, blockH, 'F')
  // Divider
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.4)
  doc.line(x + half, cursorY, x + half, cursorY + blockH)

  // Linker Block Text (HIGHER)
  doc.setFontSize(7)
  doc.setTextColor(160, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(1.5)
  doc.text(`SCHLAG ${resolved.higher.range}`, x + 2, cursorY + 4)
  doc.setCharSpace(0)
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text(resolved.higher.name, x + 2, cursorY + 10)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`Pos ${resolved.higher.pos}`, x + 2, cursorY + 14)

  // Rechter Block Text (LOWER)
  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(1.5)
  doc.text(`SCHLAG ${resolved.lower.range}`, x + half + 2, cursorY + 4)
  doc.setCharSpace(0)
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text(resolved.lower.name, x + half + 2, cursorY + 10)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`Pos ${resolved.lower.pos}`, x + half + 2, cursorY + 14)

  cursorY += blockH + 3

  // Warmup-Line
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120, 120, 120)
  doc.text(
    `Warmup: ${resolved.higher.name} ${resolved.higher.warmup}, ${resolved.lower.name} ${resolved.lower.warmup}`,
    x, cursorY
  )
  cursorY += 4
  return cursorY
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/pdfExport.ts
git commit -m "✨ PDF: drawCoachRotationBox helper"
```

---

## Task 22: PDF — Integrate into generateLineupWithFieldPdf

**Files:**
- Modify: `frontend/src/utils/pdfExport.ts`

- [ ] **Step 1: Update GameData interface**

Extend to include rotation fields:

```typescript
export interface GameData {
  game: {
    id: number
    gameNumber: number
    opponentTeam: { id: number; name: string } | null
    scoreUs: number | null
    scoreThem: number | null
    firstBaseCoachRotation?: CoachRotationPair | null  // NEU
    thirdBaseCoachRotation?: CoachRotationPair | null  // NEU
  }
  lineup: LineupEntryResponse[]
  staff: GameStaffResponse[]
  substitutions: SubstitutionResponse[]
}
```

- [ ] **Step 2: Insert Rotation-Block in generateLineupWithFieldPdf**

After the staff-line is drawn (around the existing block where staff text is rendered), insert:

```typescript
// Coach-Rotation-Boxes (volle Breite, oberhalb Lineup+Field)
const fullWidth = pageWidth - 2 * margin
const has1BCoach = staff.some(s => s.role === 'BASE_COACH_1ST')
const has3BCoach = staff.some(s => s.role === 'BASE_COACH_3RD')

if (!has1BCoach && game.firstBaseCoachRotation) {
  y = drawCoachRotationBox(doc, margin, y, fullWidth, game.firstBaseCoachRotation, lineup, '1B') + 2
}
if (!has3BCoach && game.thirdBaseCoachRotation) {
  y = drawCoachRotationBox(doc, margin, y, fullWidth, game.thirdBaseCoachRotation, lineup, '3B') + 2
}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/pdfExport.ts
git commit -m "✨ generateLineupWithFieldPdf: + Coach-Rotation-Boxes"
```

---

## Task 23: PDF — Integrate into generatePdf

**Files:**
- Modify: `frontend/src/utils/pdfExport.ts`

- [ ] **Step 1: Insert Rotation in basic Lineup PDF**

After the staff-line block in `generatePdf`, insert (using `contentWidth = 100mm` since that's the basic-Lineup PDF content area):

```typescript
const has1BCoach = staff.some(s => s.role === 'BASE_COACH_1ST')
const has3BCoach = staff.some(s => s.role === 'BASE_COACH_3RD')
if (!has1BCoach && game.firstBaseCoachRotation) {
  y = drawCoachRotationBox(doc, contentLeft, y, contentWidth, game.firstBaseCoachRotation, lineup, '1B') + 2
}
if (!has3BCoach && game.thirdBaseCoachRotation) {
  y = drawCoachRotationBox(doc, contentLeft, y, contentWidth, game.thirdBaseCoachRotation, lineup, '3B') + 2
}
```

(Variable names `contentLeft` and `contentWidth` per existing code in `generatePdf`.)

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/pdfExport.ts
git commit -m "✨ generatePdf: + Coach-Rotation-Boxes"
```

---

## Task 24: PDF — Integrate into generateScoringPdf

**Files:**
- Modify: `frontend/src/utils/pdfExport.ts`

- [ ] **Step 1: Insert Rotation in scoring PDF**

After staff-line in `generateScoringPdf`, use full page width:

```typescript
const fullW = pageWidth - 2 * margin
const has1BCoach = staff.some(s => s.role === 'BASE_COACH_1ST')
const has3BCoach = staff.some(s => s.role === 'BASE_COACH_3RD')
if (!has1BCoach && game.firstBaseCoachRotation) {
  y = drawCoachRotationBox(doc, margin, y, fullW, game.firstBaseCoachRotation, lineup, '1B') + 2
}
if (!has3BCoach && game.thirdBaseCoachRotation) {
  y = drawCoachRotationBox(doc, margin, y, fullW, game.thirdBaseCoachRotation, lineup, '3B') + 2
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/pdfExport.ts
git commit -m "✨ generateScoringPdf: + Coach-Rotation-Boxes"
```

---

## Task 25: Wire game.firstBaseCoachRotation / thirdBaseCoachRotation through PDF-Export-Callers

**Files:**
- Modify: PDF-Export-Caller-Stellen (z.B. `GameDayPlanner.tsx`)

- [ ] **Step 1: Find where PDFs are triggered**

```bash
cd /home/hungl/privat/softball-lineup && grep -rn "generatePdf\|generateLineupWithFieldPdf\|generateScoringPdf" frontend/src --include="*.tsx" | head
```

- [ ] **Step 2: Update each caller to pass rotation fields**

For each `GameData` object construction, add `firstBaseCoachRotation` and `thirdBaseCoachRotation` from `game`:

```typescript
const gameData: GameData = {
  game: {
    id: game.id,
    gameNumber: game.gameNumber,
    opponentTeam: game.opponentTeam,
    scoreUs: game.scoreUs,
    scoreThem: game.scoreThem,
    firstBaseCoachRotation: game.firstBaseCoachRotation,  // NEU
    thirdBaseCoachRotation: game.thirdBaseCoachRotation,  // NEU
  },
  lineup, staff, substitutions
}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/planner/GameDayPlanner.tsx
git commit -m "✨ PDF-Caller: pass coach-rotation fields"
```

---

## Task 26: CoachSlots Vitest

**Files:**
- Create: `frontend/src/components/planner/CoachSlots.test.tsx`

- [ ] **Step 1: Test Picker visibility + functionality**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CoachSlots } from './CoachSlots'
import type { GameResponse, LineupEntryResponse } from '@/types'

const game: GameResponse = {
  id: 1, gameNumber: 1, opponentTeam: null, scoreUs: null, scoreThem: null,
  gameDayId: 1, lineupEntryCount: 10, firstBaseCoachRotation: null, thirdBaseCoachRotation: null,
}

const fullLineup: LineupEntryResponse[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1, battingOrder: i + 1, position: 'LF',
  player: { id: i + 1, name: `Player${i + 1}` }, dhBatterPlayer: null,
} as LineupEntryResponse))

describe('CoachSlots Rotation', () => {
  it('shows rotation picker when 1B coach slot empty + lineup ≥ 10', () => {
    render(<CoachSlots staff={[]} availablePlayers={[]} lineup={fullLineup} game={game}
                       onSave={vi.fn()} onSaveRotation={vi.fn()} />)
    expect(screen.getByText(/Rotation aus Lineup/i)).toBeInTheDocument()
    expect(screen.getByText('Pos 5+10')).toBeInTheDocument()
  })

  it('does NOT show picker when lineup < 10', () => {
    render(<CoachSlots staff={[]} availablePlayers={[]} lineup={fullLineup.slice(0, 8)} game={game}
                       onSave={vi.fn()} onSaveRotation={vi.fn()} />)
    expect(screen.getByText(/Lineup mit 10 Spielern nötig/i)).toBeInTheDocument()
  })

  it('saves rotation on pill click', () => {
    const onSaveRotation = vi.fn()
    render(<CoachSlots staff={[]} availablePlayers={[]} lineup={fullLineup} game={game}
                       onSave={vi.fn()} onSaveRotation={onSaveRotation} />)
    fireEvent.click(screen.getAllByText('Pos 4+9')[0])
    expect(onSaveRotation).toHaveBeenCalledWith('POS_4_9', null)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx vitest run src/components/planner/CoachSlots.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/planner/CoachSlots.test.tsx
git commit -m "🧪 CoachSlots: Rotation-Picker tests"
```

---

## Task 27: End-to-End Manual Verification

- [ ] **Step 1: Start app locally** (if Docker available):

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml &
cd frontend && npx vite
```

- [ ] **Step 2: Test the flow:**

1. Open a Game-Setup (`/games/X`).
2. Leave 3B Coach empty → Rotation-Picker should appear.
3. ⭐ should be on `Pos 5+10` (recommended).
4. Click `Pos 4+9` — pill turns navy, preview updates.
5. Reload page — selection persists.
6. Add a 1B-Coach via dropdown — rotation field stays (only 3B was set).
7. Export Aufstellungs-PDF — verify rotation block appears with full-width above lineup+field.
8. Verify warmup line readable.

- [ ] **Step 3: Verify Coach-Badge in Lineup**

Lineup-Editor should show small "3B" badge next to Pos 5 + Pos 10 (or Pos 4+9 if active).

- [ ] **Step 4: Final Commit (if any fixes needed)**

```bash
git add -A
git commit -m "🐛 Coach-Rotation: fix manual-test findings"
```

---

## Task 28: Full Build + Push

- [ ] **Step 1: Frontend build**

```bash
cd frontend && npm run build
```

Expected: success.

- [ ] **Step 2: Backend tests (when Docker available)**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```

Expected: all tests pass (CI will run on push if local Docker unavailable).

- [ ] **Step 3: Push**

```bash
git push origin master
```

- [ ] **Step 4: Verify GitHub Action runs successfully**

```bash
gh run list --workflow=ci.yml --limit 1
```

Expected: completed success.

---

## Spec Coverage Verification

- ✅ Backend: Enum + Migration + Game-Entity + Mapper + DTO + Service + Endpoint — Tasks 1-12
- ✅ Frontend Types + API — Tasks 13-14
- ✅ Icons (CoachFlagIcon) — Task 15
- ✅ Pure-Util (resolve + scoring + recommendation) — Tasks 16-17
- ✅ CoachSlots Picker + Preview + Recommendation — Tasks 18-19
- ✅ LineupEditor Coach-Badge — Task 20
- ✅ PDF drawCoachRotationBox + 3 Integrations — Tasks 21-25
- ✅ Tests (Backend + Frontend) — Tasks 2, 12, 17, 26
- ✅ Manual E2E — Task 27
- ✅ Push + CI — Task 28

## Edge-Cases Coverage

- ✅ Lineup < 10 → Picker disabled (Task 18 + Test 26)
- ✅ Pitcher on coach-pos → recommendation penalty (Task 16 + Test 17)
- ✅ Coach-Staff set → rotation auto-cleared (Task 10)
- ✅ DH-Setup → resolve uses `entry.player.name` (Task 16)
- ✅ Game endedAt → endpoint allows update (no validation on game state)
- ✅ Spielbogen vs Legacy → only Legacy PDFs touched (Tasks 22-24)
