# Legacy Live-Scoring: Generic Last-Action Undo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace AB-only Undo in legacy `ScoringPage` with generic "last-action undo" that handles AtBats (incl. orphan stealing cleanup), Stealing-only events, and Substitutions.

**Architecture:** Backend new `GameScoringService.undoLastAction(gameId)` picks the newest item across `[AtBat, BaseRunningEvent, Substitution]` by `createdAt` and removes it. AB-removal also deletes stealings with `createdAt > priorAB.createdAt` (orphan cleanup, mirrors Spielbogen). Returns `UndoResult{type, removedId}`. New REST endpoint `POST /api/games/{gameId}/scoring/undo`. Frontend hook + ScoringPage call new endpoint and show adaptive toast.

**Tech Stack:** Spring Boot 3.4.3, Java 21, JPA, Flyway, Mockito + JUnit 5, React 19, TypeScript, Vite.

**Spec:** `docs/superpowers/specs/2026-05-11-scoring-undo-fix-design.md`

---

## File Structure

**Backend — modified:**
- `backend/src/main/resources/db/migration/V29__add_substitution_created_at.sql` (new)
- `backend/src/main/java/com/softball/domain/model/Substitution.java` — add `createdAt`
- `backend/src/main/java/com/softball/adapter/out/persistence/entity/SubstitutionEntity.java` — add column + `@PrePersist`
- `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SubstitutionMapper.java` — map `createdAt`
- `backend/src/main/java/com/softball/domain/port/out/SubstitutionRepository.java` — add `deleteById`
- `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SubstitutionRepositoryAdapter.java` — implement `deleteById`
- `backend/src/main/java/com/softball/application/GameScoringService.java` — new `undoLastAction`
- `backend/src/main/java/com/softball/adapter/dto/UndoResultResponse.java` (new record)
- `backend/src/main/java/com/softball/adapter/in/web/ScoringController.java` — new POST endpoint

**Backend — tests:**
- `backend/src/test/java/com/softball/application/GameScoringServiceTest.java` — add cases for `undoLastAction`

**Frontend — modified:**
- `frontend/src/types/index.ts` — add `UndoResult` type
- `frontend/src/api/client.ts` — add `undoLastAction()`
- `frontend/src/hooks/useScoring.ts` — `undo` returns `UndoResult`, calls new endpoint
- `frontend/src/components/scoring/ScoringPage.tsx` — disable condition + adaptive toast

---

## Task 1: Flyway migration — `substitution.created_at`

**Files:**
- Create: `backend/src/main/resources/db/migration/V29__add_substitution_created_at.sql`

- [ ] **Step 1: Create migration file**

```sql
ALTER TABLE substitutions ADD COLUMN created_at TIMESTAMP(6) WITH TIME ZONE;
UPDATE substitutions SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE substitutions ALTER COLUMN created_at SET NOT NULL;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/resources/db/migration/V29__add_substitution_created_at.sql
git commit -m "✨ Migration V29: substitution.created_at NOT NULL"
```

(Migration validation läuft mit Testcontainers in Task 3.)

---

## Task 2: Domain model — `Substitution.createdAt`

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/Substitution.java`

- [ ] **Step 1: Add `createdAt` field + getter/setter**

Replace full file content with:

```java
package com.softball.domain.model;

import java.time.Instant;

public class Substitution {
    private Long id;
    private Game game;
    private Player playerOut;
    private Player playerIn;
    private Integer inning;
    private Instant createdAt;

    public Substitution() {}

    public Substitution(final Game game, final Player playerOut, final Player playerIn, final Integer inning) {
        this.game = game;
        this.playerOut = playerOut;
        this.playerIn = playerIn;
        this.inning = inning;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Game getGame() { return game; }
    public void setGame(final Game game) { this.game = game; }
    public Player getPlayerOut() { return playerOut; }
    public void setPlayerOut(final Player playerOut) { this.playerOut = playerOut; }
    public Player getPlayerIn() { return playerIn; }
    public void setPlayerIn(final Player playerIn) { this.playerIn = playerIn; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/Substitution.java
git commit -m "✨ Substitution Domain-Model: createdAt-Feld"
```

---

## Task 3: Entity + Mapper — persist `createdAt`

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/SubstitutionEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SubstitutionMapper.java`

- [ ] **Step 1: Add `createdAt` column + `@PrePersist` to entity**

Replace `SubstitutionEntity.java` content with:

```java
package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.Instant;

@Entity
@Table(name = "substitutions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"game_id", "player_out_id", "inning"})
})
public class SubstitutionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    @JsonIgnore
    private GameEntity game;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_out_id", nullable = false)
    private PlayerEntity playerOut;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_in_id", nullable = false)
    private PlayerEntity playerIn;

    @Min(1) @Max(6)
    @Column(nullable = false)
    private Integer inning;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public SubstitutionEntity() {}

    public SubstitutionEntity(final GameEntity game, final PlayerEntity playerOut, final PlayerEntity playerIn, final Integer inning) {
        this.game = game;
        this.playerOut = playerOut;
        this.playerIn = playerIn;
        this.inning = inning;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameEntity getGame() { return game; }
    public void setGame(final GameEntity game) { this.game = game; }
    public PlayerEntity getPlayerOut() { return playerOut; }
    public void setPlayerOut(final PlayerEntity playerOut) { this.playerOut = playerOut; }
    public PlayerEntity getPlayerIn() { return playerIn; }
    public void setPlayerIn(final PlayerEntity playerIn) { this.playerIn = playerIn; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
```

- [ ] **Step 2: Update mapper to round-trip `createdAt`**

Replace `SubstitutionMapper.java` content with:

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SubstitutionEntity;
import com.softball.domain.model.Game;
import com.softball.domain.model.Substitution;
import org.springframework.stereotype.Component;

@Component
public class SubstitutionMapper {

    private final PlayerMapper playerMapper;

    public SubstitutionMapper(final PlayerMapper playerMapper) {
        this.playerMapper = playerMapper;
    }

    public Substitution toDomain(final SubstitutionEntity entity) {
        if (entity == null) return null;
        final Game game = new Game();
        game.setId(entity.getGame().getId());
        final Substitution sub = new Substitution(
            game,
            playerMapper.toDomain(entity.getPlayerOut()),
            playerMapper.toDomain(entity.getPlayerIn()),
            entity.getInning()
        );
        sub.setId(entity.getId());
        sub.setCreatedAt(entity.getCreatedAt());
        return sub;
    }

    public SubstitutionEntity toEntity(final Substitution domain, final GameEntity gameEntity,
                                        final PlayerEntity playerOutEntity, final PlayerEntity playerInEntity) {
        final SubstitutionEntity entity = new SubstitutionEntity(gameEntity, playerOutEntity, playerInEntity, domain.getInning());
        entity.setId(domain.getId());
        entity.setCreatedAt(domain.getCreatedAt());
        return entity;
    }
}
```

- [ ] **Step 3: Run existing GameScoringServiceTest (boots Flyway via Testcontainers)**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test -Dtest=GameScoringServiceTest`
Expected: PASS — existing tests green, Flyway applies V29 without errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/entity/SubstitutionEntity.java backend/src/main/java/com/softball/adapter/out/persistence/mapper/SubstitutionMapper.java
git commit -m "✨ SubstitutionEntity+Mapper: createdAt persistieren"
```

---

## Task 4: Extend `SubstitutionRepository` port with `deleteById`

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/port/out/SubstitutionRepository.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SubstitutionRepositoryAdapter.java`

- [ ] **Step 1: Add `deleteById(Long)` to port interface**

Replace content of `SubstitutionRepository.java`:

```java
package com.softball.domain.port.out;

import com.softball.domain.model.Substitution;
import java.util.List;

public interface SubstitutionRepository {
    List<Substitution> findByGameId(Long gameId);
    List<Substitution> findByGameIdIn(List<Long> gameIds);
    void deleteByGameId(Long gameId);
    void deleteById(Long id);
    Substitution save(Substitution substitution);
}
```

- [ ] **Step 2: Implement `deleteById` in adapter**

Add method to `SubstitutionRepositoryAdapter.java` (after `deleteByGameId`):

```java
    @Override
    @Transactional
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
```

- [ ] **Step 3: Compile check**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml compile`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/domain/port/out/SubstitutionRepository.java backend/src/main/java/com/softball/adapter/out/persistence/adapter/SubstitutionRepositoryAdapter.java
git commit -m "✨ SubstitutionRepository: deleteById(Long)"
```

---

## Task 5: `UndoResultResponse` DTO

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/UndoResultResponse.java`

- [ ] **Step 1: Create DTO record**

```java
package com.softball.adapter.dto;

public record UndoResultResponse(
    UndoType type,
    Long removedId
) {
    public enum UndoType { AT_BAT, STEALING, SUBSTITUTION, NONE }

    public static UndoResultResponse none() {
        return new UndoResultResponse(UndoType.NONE, null);
    }

    public static UndoResultResponse atBat(final Long id) {
        return new UndoResultResponse(UndoType.AT_BAT, id);
    }

    public static UndoResultResponse stealing(final Long id) {
        return new UndoResultResponse(UndoType.STEALING, id);
    }

    public static UndoResultResponse substitution(final Long id) {
        return new UndoResultResponse(UndoType.SUBSTITUTION, id);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/UndoResultResponse.java
git commit -m "✨ DTO: UndoResultResponse mit UndoType-Enum"
```

---

## Task 6: Test + Service — empty game returns NONE

**Files:**
- Modify: `backend/src/test/java/com/softball/application/GameScoringServiceTest.java`
- Modify: `backend/src/main/java/com/softball/application/GameScoringService.java`

- [ ] **Step 1: Write failing test**

Append nested class inside `GameScoringServiceTest` (before the `// --- helpers ---` line, around line 607):

```java
    @org.junit.jupiter.api.Nested
    class UndoLastAction {

        @Test
        void emptyGame_returnsNone() {
            mockGame();
            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.empty());
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.NONE);
            assertThat(result.removedId()).isNull();
            org.mockito.Mockito.verify(atBatRepository, org.mockito.Mockito.never())
                .deleteById(org.mockito.ArgumentMatchers.anyLong());
        }
    }
```

- [ ] **Step 2: Run test — expect compile FAIL**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test -Dtest=GameScoringServiceTest$UndoLastAction#emptyGame_returnsNone`
Expected: COMPILE FAIL — `cannot find symbol method undoLastAction(Long)`.

- [ ] **Step 3: Add minimal stub in `GameScoringService`**

In `GameScoringService.java`, add method below `undoLastAtBat` (around line 91):

```java
    @Transactional
    public com.softball.adapter.dto.UndoResultResponse undoLastAction(final Long gameId) {
        findGame(gameId);
        return com.softball.adapter.dto.UndoResultResponse.none();
    }
```

- [ ] **Step 4: Run test — expect PASS**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test -Dtest=GameScoringServiceTest$UndoLastAction#emptyGame_returnsNone`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/java/com/softball/application/GameScoringServiceTest.java backend/src/main/java/com/softball/application/GameScoringService.java
git commit -m "✨ GameScoringService.undoLastAction: Stub + Empty-Game-Test"
```

---

## Task 7: AB ist jüngster → AB + orphan Stealings löschen

**Files:**
- Modify: `backend/src/test/java/com/softball/application/GameScoringServiceTest.java`
- Modify: `backend/src/main/java/com/softball/application/GameScoringService.java`

- [ ] **Step 1: Write failing test**

Inside `UndoLastAction` nested class:

```java
        @Test
        void lastABIsNewest_deletesABAndOrphanStealings() {
            mockGame();
            final Instant ab1Time = Instant.parse("2026-05-11T10:00:00Z");
            final Instant ab2Time = Instant.parse("2026-05-11T10:01:00Z");
            final Instant stealTime = Instant.parse("2026-05-11T10:02:00Z");
            final AtBat ab1 = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab1.setId(101L); ab1.setCreatedAt(ab1Time);
            final AtBat ab2 = atBat(2, 1, anne, AtBatResult.OUT, new BaseState(hung.getId(), null, null));
            ab2.setId(102L); ab2.setCreatedAt(ab2Time);
            final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealTime);
            steal.setId(201L);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab2));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab1, ab2));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.AT_BAT);
            assertThat(result.removedId()).isEqualTo(102L);
            org.mockito.Mockito.verify(atBatRepository).deleteById(102L);
            org.mockito.Mockito.verify(stealingRepository).deleteById(201L);
        }
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test -Dtest=GameScoringServiceTest$UndoLastAction#lastABIsNewest_deletesABAndOrphanStealings`
Expected: FAIL — `type` is NONE, expected AT_BAT.

- [ ] **Step 3: Implement AB-dispatch branch**

Replace body of `undoLastAction` in `GameScoringService.java` with:

```java
    @Transactional
    public com.softball.adapter.dto.UndoResultResponse undoLastAction(final Long gameId) {
        findGame(gameId);

        final java.util.Optional<AtBat> lastABOpt = atBatRepository.findLastByGameId(gameId);
        final java.util.List<BaseRunningEvent> allStealings = stealingRepository.findByGameIdOrderByIdAsc(gameId);
        final java.util.List<Substitution> allSubs = substitutionRepository.findByGameId(gameId);

        final java.time.Instant newestAB = lastABOpt.map(AtBat::getCreatedAt).orElse(null);
        final java.time.Instant newestStealing = allStealings.stream()
            .map(BaseRunningEvent::getCreatedAt)
            .filter(java.util.Objects::nonNull)
            .max(java.time.Instant::compareTo)
            .orElse(null);
        final java.time.Instant newestSub = allSubs.stream()
            .map(Substitution::getCreatedAt)
            .filter(java.util.Objects::nonNull)
            .max(java.time.Instant::compareTo)
            .orElse(null);

        if (newestAB == null && newestStealing == null && newestSub == null) {
            return com.softball.adapter.dto.UndoResultResponse.none();
        }

        final boolean abIsNewest = newestAB != null
            && (newestStealing == null || !newestStealing.isAfter(newestAB))
            && (newestSub == null || !newestSub.isAfter(newestAB));

        if (abIsNewest) {
            final AtBat lastAB = lastABOpt.get();
            final java.time.Instant cutoff = atBatRepository.findByGameIdOrderBySequenceAsc(gameId).stream()
                .filter(ab -> !ab.getId().equals(lastAB.getId()))
                .map(AtBat::getCreatedAt)
                .filter(java.util.Objects::nonNull)
                .max(java.time.Instant::compareTo)
                .orElse(java.time.Instant.EPOCH);
            final java.util.List<BaseRunningEvent> stale = allStealings.stream()
                .filter(e -> e.getCreatedAt() != null && e.getCreatedAt().isAfter(cutoff))
                .toList();
            for (final BaseRunningEvent e : stale) {
                stealingRepository.deleteById(e.getId());
            }
            atBatRepository.deleteById(lastAB.getId());
            return com.softball.adapter.dto.UndoResultResponse.atBat(lastAB.getId());
        }

        return com.softball.adapter.dto.UndoResultResponse.none();
    }
```

- [ ] **Step 4: Run test — expect PASS**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test -Dtest=GameScoringServiceTest$UndoLastAction#lastABIsNewest_deletesABAndOrphanStealings`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/java/com/softball/application/GameScoringServiceTest.java backend/src/main/java/com/softball/application/GameScoringService.java
git commit -m "✨ undoLastAction: AB-Branch + Orphan-Stealings-Cleanup"
```

---

## Task 8: Stealing ist jüngster → nur Stealing löschen

**Files:**
- Modify: `backend/src/test/java/com/softball/application/GameScoringServiceTest.java`
- Modify: `backend/src/main/java/com/softball/application/GameScoringService.java`

- [ ] **Step 1: Write failing tests**

Inside `UndoLastAction` nested class:

```java
        @Test
        void stealingIsNewest_deletesOnlyStealing() {
            mockGame();
            final Instant abTime = Instant.parse("2026-05-11T10:00:00Z");
            final Instant stealTime = Instant.parse("2026-05-11T10:05:00Z");
            final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab.setId(101L); ab.setCreatedAt(abTime);
            final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealTime);
            steal.setId(201L);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.STEALING);
            assertThat(result.removedId()).isEqualTo(201L);
            org.mockito.Mockito.verify(stealingRepository).deleteById(201L);
            org.mockito.Mockito.verify(atBatRepository, org.mockito.Mockito.never())
                .deleteById(org.mockito.ArgumentMatchers.anyLong());
        }

        @Test
        void singleStealingNoAB_deletesStealing() {
            mockGame();
            final Instant stealTime = Instant.parse("2026-05-11T10:00:00Z");
            final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealTime);
            steal.setId(202L);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.empty());
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.STEALING);
            assertThat(result.removedId()).isEqualTo(202L);
            org.mockito.Mockito.verify(stealingRepository).deleteById(202L);
        }
```

- [ ] **Step 2: Run tests — expect FAIL (both return NONE)**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test -Dtest=GameScoringServiceTest$UndoLastAction#stealingIsNewest_deletesOnlyStealing+GameScoringServiceTest$UndoLastAction#singleStealingNoAB_deletesStealing`
Expected: FAIL on both.

- [ ] **Step 3: Implement Stealing branch**

In `GameScoringService.undoLastAction`, replace the final `return ...none();` with:

```java
        final boolean stealingIsNewest = newestStealing != null
            && (newestSub == null || !newestSub.isAfter(newestStealing));

        if (stealingIsNewest) {
            final BaseRunningEvent latest = allStealings.stream()
                .filter(e -> e.getCreatedAt() != null)
                .max(java.util.Comparator.comparing(BaseRunningEvent::getCreatedAt))
                .orElseThrow();
            stealingRepository.deleteById(latest.getId());
            return com.softball.adapter.dto.UndoResultResponse.stealing(latest.getId());
        }

        return com.softball.adapter.dto.UndoResultResponse.none();
```

- [ ] **Step 4: Run tests — expect PASS**

Run: same command as Step 2.
Expected: PASS on both.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/java/com/softball/application/GameScoringServiceTest.java backend/src/main/java/com/softball/application/GameScoringService.java
git commit -m "✨ undoLastAction: Stealing-Branch"
```

---

## Task 9: Substitution ist jüngster → nur Sub löschen

**Files:**
- Modify: `backend/src/test/java/com/softball/application/GameScoringServiceTest.java`
- Modify: `backend/src/main/java/com/softball/application/GameScoringService.java`

- [ ] **Step 1: Write failing test**

Inside `UndoLastAction` nested class:

```java
        @Test
        void subIsNewest_deletesOnlySub() {
            mockGame();
            final Instant abTime = Instant.parse("2026-05-11T10:00:00Z");
            final Instant subTime = Instant.parse("2026-05-11T10:05:00Z");
            final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab.setId(101L); ab.setCreatedAt(abTime);
            final Substitution sub = new Substitution(game, hung, anne, 1);
            sub.setId(301L);
            sub.setCreatedAt(subTime);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of(sub));

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.SUBSTITUTION);
            assertThat(result.removedId()).isEqualTo(301L);
            org.mockito.Mockito.verify(substitutionRepository).deleteById(301L);
        }
```

- [ ] **Step 2: Run test — expect FAIL (returns NONE)**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test -Dtest=GameScoringServiceTest$UndoLastAction#subIsNewest_deletesOnlySub`
Expected: FAIL.

- [ ] **Step 3: Implement Substitution branch**

In `GameScoringService.undoLastAction`, replace the final `return ...none();` with:

```java
        if (newestSub != null) {
            final Substitution latest = allSubs.stream()
                .filter(s -> s.getCreatedAt() != null)
                .max(java.util.Comparator.comparing(Substitution::getCreatedAt))
                .orElseThrow();
            substitutionRepository.deleteById(latest.getId());
            return com.softball.adapter.dto.UndoResultResponse.substitution(latest.getId());
        }

        return com.softball.adapter.dto.UndoResultResponse.none();
```

- [ ] **Step 4: Run test — expect PASS**

Run: same command as Step 2.
Expected: PASS.

- [ ] **Step 5: Run full `GameScoringServiceTest`**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test -Dtest=GameScoringServiceTest`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/test/java/com/softball/application/GameScoringServiceTest.java backend/src/main/java/com/softball/application/GameScoringService.java
git commit -m "✨ undoLastAction: Substitution-Branch"
```

---

## Task 10: Cutoff-Boundary Test (Regression Guard)

**Hintergrund:** Cutoff = `max(otherABs.createdAt)`. Stealings mit `createdAt > cutoff` werden bei AB-Undo gelöscht. Stealings davor bleiben. Edge: ein Steal vor AB1 (User tippte zuerst nur einen SB). Bei Undo von AB2 soll dieser Steal stehen bleiben; ein Steal zwischen AB1 und AB2 gehört chronologisch zum AB2 und wird gelöscht.

**Files:**
- Modify: `backend/src/test/java/com/softball/application/GameScoringServiceTest.java`

- [ ] **Step 1: Write test — expect PASS (cutoff logic already correct)**

Inside `UndoLastAction` nested class:

```java
        @Test
        void undoAB_deletesStealingsAfterCutoff_keepsStealingsBefore() {
            mockGame();
            final Instant stealEarlyTime = Instant.parse("2026-05-11T09:59:00Z");
            final Instant ab1Time = Instant.parse("2026-05-11T10:00:00Z");
            final Instant stealMidTime = Instant.parse("2026-05-11T10:00:30Z");
            final Instant ab2Time = Instant.parse("2026-05-11T10:01:00Z");
            final AtBat ab1 = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab1.setId(101L); ab1.setCreatedAt(ab1Time);
            final AtBat ab2 = atBat(2, 1, anne, AtBatResult.OUT, new BaseState(null, hung.getId(), null));
            ab2.setId(102L); ab2.setCreatedAt(ab2Time);
            final BaseRunningEvent stealEarly = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealEarlyTime);
            stealEarly.setId(200L);
            final BaseRunningEvent stealMid = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealMidTime);
            stealMid.setId(201L);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab2));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab1, ab2));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(stealEarly, stealMid));
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.AT_BAT);
            assertThat(result.removedId()).isEqualTo(102L);
            org.mockito.Mockito.verify(atBatRepository).deleteById(102L);
            org.mockito.Mockito.verify(stealingRepository).deleteById(201L);
            org.mockito.Mockito.verify(stealingRepository, org.mockito.Mockito.never()).deleteById(200L);
        }
```

- [ ] **Step 2: Run test — expect PASS**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test -Dtest=GameScoringServiceTest$UndoLastAction#undoAB_deletesStealingsAfterCutoff_keepsStealingsBefore`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/softball/application/GameScoringServiceTest.java
git commit -m "✨ Test: Cutoff-Boundary für Stealing-Cleanup"
```

---

## Task 11: REST endpoint — `POST /scoring/undo`

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/in/web/ScoringController.java`

- [ ] **Step 1: Add new endpoint**

Add to `ScoringController.java` (after `resetScoring`, around line 48):

```java
    @PostMapping("/{gameId}/scoring/undo")
    public com.softball.adapter.dto.UndoResultResponse undoLastAction(@PathVariable final Long gameId) {
        return scoringService.undoLastAction(gameId);
    }
```

- [ ] **Step 2: Compile + run full backend test suite**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test`
Expected: BUILD SUCCESS, all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/in/web/ScoringController.java
git commit -m "✨ ScoringController: POST /scoring/undo Endpoint"
```

---

## Task 12: Frontend — `UndoResult` type

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add type**

Find the `// Live-Scoring` section (around line 267). Add:

```typescript
export type UndoResultType = 'AT_BAT' | 'STEALING' | 'SUBSTITUTION' | 'NONE'

export interface UndoResult {
  type: UndoResultType
  removedId: number | null
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "✨ Types: UndoResult für generic Last-Action-Undo"
```

---

## Task 13: Frontend — API client function

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add `undoLastAction` function**

Add to `client.ts` (after `undoLastAtBat`, around line 312):

```typescript
export const undoLastAction = (gameId: number) =>
  request<UndoResult>(`/games/${gameId}/scoring/undo`, { method: 'POST' })
```

Ensure `UndoResult` is imported. At top imports section (around line 1-15) check `import type { ... }` block — add `UndoResult` to the import list from `@/types`.

- [ ] **Step 2: TypeScript build check**

Run: `cd frontend && npm run build`
Expected: SUCCESS (no TS errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "✨ API-Client: undoLastAction(gameId)"
```

---

## Task 14: Frontend — `useScoring.undo` returns `UndoResult`

**Files:**
- Modify: `frontend/src/hooks/useScoring.ts`

- [ ] **Step 1: Update `undo` callback**

Replace the existing `undo` callback (around line 51-55) in `useScoring.ts`:

```typescript
  const undo = useCallback(async (): Promise<UndoResult> => {
    if (gameId == null) return { type: 'NONE', removedId: null }
    const result = await api.undoLastAction(gameId)
    await reload()
    return result
  }, [gameId, reload])
```

Add `UndoResult` to the type import block at the top of the file:

```typescript
import type {
  AtBatResponse,
  StealingEventResponse,
  ScoreboardResponse,
  RecordAtBatRequest,
  RecordStealingEventRequest,
  UndoResult,
} from '@/types'
```

- [ ] **Step 2: TypeScript build check**

Run: `cd frontend && npm run build`
Expected: SUCCESS. May see error in `ScoringPage.tsx` because `await undo()` now returns a value — that's expected, fixed in Task 15.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useScoring.ts
git commit -m "✨ useScoring.undo: ruft neuen Endpoint, gibt UndoResult zurück"
```

---

## Task 15: Frontend — `ScoringPage` adaptive toast + disable condition

**Files:**
- Modify: `frontend/src/components/scoring/ScoringPage.tsx`

- [ ] **Step 1: Update `handleUndo` and Undo button disable condition**

Read the current `handleUndo` (around line 348-359) and Undo button JSX (around line 864-870) in `ScoringPage.tsx`. Replace `handleUndo` with:

```typescript
  const handleUndo = async () => {
    if (atBats.length === 0 && stealingEvents.length === 0 && substitutions.length === 0) return
    setSubmitting(true)
    try {
      const result = await undo()
      const message =
        result.type === 'AT_BAT' ? 'Letzter At-Bat rückgängig gemacht' :
        result.type === 'STEALING' ? 'Letztes Stealing-Event rückgängig gemacht' :
        result.type === 'SUBSTITUTION' ? 'Letzte Substitution rückgängig gemacht' :
        'Nichts zum Rückgängigmachen'
      toast.show(message, result.type === 'NONE' ? 'error' : 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }
```

Replace the Undo button (around line 864-870):

```tsx
          <button
            onClick={handleUndo}
            disabled={(atBats.length === 0 && stealingEvents.length === 0 && substitutions.length === 0) || submitting}
            className="font-display h-11 rounded-xl bg-cream-50 border border-cream-300 hover:bg-white text-gray-700 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Undo2 size={14} /> Rückgängig
          </button>
```

Verify `stealingEvents` and `substitutions` are in scope:
- `stealingEvents` comes from `useScoring` — check destructure (around line 82). If missing, add `stealingEvents` to destructure.
- `substitutions` is state set elsewhere in ScoringPage — check `const [substitutions, setSubstitutions] = useState<...>` exists (around line 80-100 area).

- [ ] **Step 2: TypeScript build check**

Run: `cd frontend && npm run build`
Expected: SUCCESS.

- [ ] **Step 3: ESLint**

Run: `cd frontend && npm run lint`
Expected: No new warnings/errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/scoring/ScoringPage.tsx
git commit -m "✨ ScoringPage: adaptive Undo-Toast + disable wenn keine Aktion vorhanden"
```

---

## Task 16: Manuelle Verifikation im Browser

**Files:** keine

- [ ] **Step 1: Start backend + frontend**

Run in 3 separate terminals:
- `docker compose up -d db`
- `cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml`
- `cd frontend && npx vite`

- [ ] **Step 2: Run-through scenario (per Spec Frontend-Verifikation)**

Open `http://localhost:5173`, log in (`admin` / `Deadsox123!`), navigate to a GameDay with a Game. Click "Live-Scoring".

```
1. Lineup + Game.
2. AB1 = SINGLE → Runner 1B.
3. STOLEN_BASE 1B-Runner → 2B.
4. AB2 = OUT mit Force-Out via Correction → +1 OUT_ON_PLAY Stealing.
5. Substitution X→Y.
6. AB3 = DOUBLE → Runner scort.

Erwartet: scoreUs=1, outs=2, BaseState=(null, Batter, null), Subs=[X→Y].

Undo 1: AB3 weg → scoreUs=0, BaseState=(null, Runner-vom-Steal, null). Toast "Letzter At-Bat ...".
Undo 2: Sub jüngster → Sub weg. Toast "Letzte Substitution ...".
Undo 3: AB2 jüngster, OUT_ON_PLAY mit weg → outs=0, Runner auf 2B. Toast "Letzter At-Bat ...".
Undo 4: STOLEN_BASE → Runner zurück 1B. Toast "Letztes Stealing-Event ...".
Undo 5: AB1 → leer. Toast "Letzter At-Bat ...".
Undo 6: disabled button (oder Toast "Nichts zum Rückgängigmachen").
```

- [ ] **Step 3: Stop dev-server**

Ctrl-C in beiden Terminals.

(Kein Commit — manueller Smoke-Test.)

---

## Verification (final)

- [ ] **All backend tests pass**

Run: `cd backend && ./mvnw -s .mvn/local-settings.xml test`
Expected: BUILD SUCCESS.

- [ ] **Frontend build passes**

Run: `cd frontend && npm run build`
Expected: SUCCESS.

- [ ] **Manual smoke-test passed** (Task 16)
