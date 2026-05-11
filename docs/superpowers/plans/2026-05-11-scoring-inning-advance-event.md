# Inning-Advance Event — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistiere "Nächstes Inning"-Aktionen als Events in der Datenbank, sodass sowohl Inning-Tracking als auch Gegner-Run-Additions via Undo reversibel werden.

**Architecture:** Neue `InningAdvanceEvent`-Entity speichert pro Event: toInning + opponentRuns + createdAt. Backend addiert opponentRuns weiterhin direkt zu `game.scoreThem` (authoritative für Anzeige), Event ist Parallel-Audit-Log für Undo. `getScoreboard.currentInning` wird aus max(letztem AB.inning, letztem Event.toInning, 1) abgeleitet. `undoLastAction` bekommt 4. Action-Typ und revertet Event durch Score-Subtract + Event-Delete. Frontend ersetzt `inningOverride` durch Backend-derived Inning.

**Tech Stack:** Spring Boot 3.4.3, Java 21, JPA + Flyway, PostgreSQL (Testcontainers), JUnit 5 + Mockito + AssertJ, React 19, TypeScript, Vite.

**Spec:** `docs/superpowers/specs/2026-05-11-scoring-inning-advance-event-design.md`

---

## File Structure

**Backend — neu:**
- `backend/src/main/resources/db/migration/V30__create_inning_advance_events.sql`
- `backend/src/main/java/com/softball/domain/model/InningAdvanceEvent.java`
- `backend/src/main/java/com/softball/domain/port/out/InningAdvanceEventRepository.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/entity/InningAdvanceEventEntity.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/mapper/InningAdvanceEventMapper.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringInningAdvanceEventRepository.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/adapter/InningAdvanceEventRepositoryAdapter.java`
- `backend/src/main/java/com/softball/adapter/dto/InningAdvanceEventResponse.java`
- `backend/src/main/java/com/softball/adapter/dto/NextInningRequest.java`

**Backend — geändert:**
- `backend/src/main/java/com/softball/adapter/dto/UndoResultResponse.java` (Enum + Factory)
- `backend/src/main/java/com/softball/application/GameScoringService.java` (advanceInning + undoLastAction-Branch + getScoreboard currentInning)
- `backend/src/main/java/com/softball/adapter/in/web/ScoringController.java` (Endpoint)
- `backend/src/test/java/com/softball/application/GameScoringServiceTest.java` (Tests)

**Frontend — geändert:**
- `frontend/src/types/index.ts` (UndoResultType + InningAdvanceEventResponse)
- `frontend/src/api/client.ts` (advanceInning Funktion)
- `frontend/src/components/scoring/ScoringPage.tsx` (handleNextInning, inningOverride entfernen, Undo-Toast)

---

## Task 1: Flyway Migration V30

**Files:**
- Create: `backend/src/main/resources/db/migration/V30__create_inning_advance_events.sql`

- [ ] **Step 1: Create migration file**

```sql
CREATE TABLE inning_advance_events (
    id              BIGSERIAL PRIMARY KEY,
    game_id         BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    to_inning       INTEGER NOT NULL CHECK (to_inning >= 2),
    opponent_runs   INTEGER NOT NULL DEFAULT 0 CHECK (opponent_runs >= 0),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(64) NOT NULL DEFAULT 'unknown'
);

CREATE INDEX idx_inning_advance_events_game_id ON inning_advance_events(game_id);
CREATE INDEX idx_inning_advance_events_game_created ON inning_advance_events(game_id, created_at);
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/resources/db/migration/V30__create_inning_advance_events.sql
git commit -m "✨ Migration V30: inning_advance_events Tabelle"
```

(Validation via Testcontainers in späteren Tasks.)

---

## Task 2: Domain Model `InningAdvanceEvent`

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/InningAdvanceEvent.java`

- [ ] **Step 1: Create domain class**

```java
package com.softball.domain.model;

import java.time.Instant;

public class InningAdvanceEvent {
    private Long id;
    private Game game;
    private Integer toInning;
    private Integer opponentRuns;
    private Instant createdAt;
    private String createdBy;

    public InningAdvanceEvent() {}

    public InningAdvanceEvent(final Game game, final Integer toInning, final Integer opponentRuns, final String createdBy) {
        this.game = game;
        this.toInning = toInning;
        this.opponentRuns = opponentRuns;
        this.createdBy = createdBy;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Game getGame() { return game; }
    public void setGame(final Game game) { this.game = game; }
    public Integer getToInning() { return toInning; }
    public void setToInning(final Integer toInning) { this.toInning = toInning; }
    public Integer getOpponentRuns() { return opponentRuns; }
    public void setOpponentRuns(final Integer opponentRuns) { this.opponentRuns = opponentRuns; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/InningAdvanceEvent.java
git commit -m "✨ Domain: InningAdvanceEvent Model"
```

---

## Task 3: JPA Entity + Mapper + Port + Adapter + Spring-Repo

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/InningAdvanceEventEntity.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/InningAdvanceEventMapper.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/InningAdvanceEventRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringInningAdvanceEventRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/InningAdvanceEventRepositoryAdapter.java`

- [ ] **Step 1: Create JPA entity**

```java
package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "inning_advance_events")
public class InningAdvanceEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    @JsonIgnore
    private GameEntity game;

    @Column(name = "to_inning", nullable = false)
    private Integer toInning;

    @Column(name = "opponent_runs", nullable = false)
    private Integer opponentRuns;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", nullable = false, length = 64)
    private String createdBy;

    public InningAdvanceEventEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameEntity getGame() { return game; }
    public void setGame(final GameEntity game) { this.game = game; }
    public Integer getToInning() { return toInning; }
    public void setToInning(final Integer toInning) { this.toInning = toInning; }
    public Integer getOpponentRuns() { return opponentRuns; }
    public void setOpponentRuns(final Integer opponentRuns) { this.opponentRuns = opponentRuns; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
```

- [ ] **Step 2: Create mapper**

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.InningAdvanceEventEntity;
import com.softball.domain.model.Game;
import com.softball.domain.model.InningAdvanceEvent;
import org.springframework.stereotype.Component;

@Component
public class InningAdvanceEventMapper {

    public InningAdvanceEvent toDomain(final InningAdvanceEventEntity entity) {
        if (entity == null) return null;
        final Game game = new Game();
        game.setId(entity.getGame().getId());
        final InningAdvanceEvent event = new InningAdvanceEvent(
            game, entity.getToInning(), entity.getOpponentRuns(), entity.getCreatedBy()
        );
        event.setId(entity.getId());
        event.setCreatedAt(entity.getCreatedAt());
        return event;
    }

    public InningAdvanceEventEntity toEntity(final InningAdvanceEvent domain, final GameEntity gameEntity) {
        final InningAdvanceEventEntity entity = new InningAdvanceEventEntity();
        entity.setId(domain.getId());
        entity.setGame(gameEntity);
        entity.setToInning(domain.getToInning());
        entity.setOpponentRuns(domain.getOpponentRuns());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setCreatedBy(domain.getCreatedBy());
        return entity;
    }
}
```

- [ ] **Step 3: Create port interface**

```java
package com.softball.domain.port.out;

import com.softball.domain.model.InningAdvanceEvent;
import java.util.List;

public interface InningAdvanceEventRepository {
    List<InningAdvanceEvent> findByGameIdOrderByCreatedAtAsc(Long gameId);
    InningAdvanceEvent save(InningAdvanceEvent event);
    void deleteById(Long id);
}
```

- [ ] **Step 4: Create Spring JPA repository**

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.InningAdvanceEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpringInningAdvanceEventRepository extends JpaRepository<InningAdvanceEventEntity, Long> {

    @Query("SELECT e FROM InningAdvanceEventEntity e WHERE e.game.id = :gameId ORDER BY e.createdAt ASC")
    List<InningAdvanceEventEntity> findByGameIdOrderByCreatedAtAsc(Long gameId);
}
```

- [ ] **Step 5: Create adapter**

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.mapper.InningAdvanceEventMapper;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringInningAdvanceEventRepository;
import com.softball.domain.model.InningAdvanceEvent;
import com.softball.domain.port.out.InningAdvanceEventRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class InningAdvanceEventRepositoryAdapter implements InningAdvanceEventRepository {

    private final SpringInningAdvanceEventRepository repo;
    private final SpringGameRepository gameRepo;
    private final InningAdvanceEventMapper mapper;

    public InningAdvanceEventRepositoryAdapter(final SpringInningAdvanceEventRepository repo,
                                                final SpringGameRepository gameRepo,
                                                final InningAdvanceEventMapper mapper) {
        this.repo = repo;
        this.gameRepo = gameRepo;
        this.mapper = mapper;
    }

    @Override
    public List<InningAdvanceEvent> findByGameIdOrderByCreatedAtAsc(final Long gameId) {
        return repo.findByGameIdOrderByCreatedAtAsc(gameId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public InningAdvanceEvent save(final InningAdvanceEvent event) {
        final GameEntity gameEntity = gameRepo.getReferenceById(event.getGame().getId());
        return mapper.toDomain(repo.save(mapper.toEntity(event, gameEntity)));
    }

    @Override
    @Transactional
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
}
```

- [ ] **Step 6: Compile check**

Run: `cd /home/hungl/privat/softball-lineup && ./backend/mvnw -f backend/pom.xml -s backend/.mvn/local-settings.xml compile`
Expected: BUILD SUCCESS.

- [ ] **Step 7: Run existing tests to validate Flyway V30 applies**

Run: `cd /home/hungl/privat/softball-lineup && ./backend/mvnw -f backend/pom.xml -s backend/.mvn/local-settings.xml test -Dtest=GameScoringServiceTest`
Expected: PASS — V30 applies cleanly, existing tests stay green.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/entity/InningAdvanceEventEntity.java backend/src/main/java/com/softball/adapter/out/persistence/mapper/InningAdvanceEventMapper.java backend/src/main/java/com/softball/domain/port/out/InningAdvanceEventRepository.java backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringInningAdvanceEventRepository.java backend/src/main/java/com/softball/adapter/out/persistence/adapter/InningAdvanceEventRepositoryAdapter.java
git commit -m "✨ InningAdvanceEvent: Entity + Mapper + Repository (Port + Adapter)"
```

---

## Task 4: DTOs + UndoType.INNING_ADVANCE

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/NextInningRequest.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/InningAdvanceEventResponse.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/UndoResultResponse.java`

- [ ] **Step 1: Create NextInningRequest**

```java
package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record NextInningRequest(
    @NotNull @Min(0) Integer opponentRuns
) {}
```

- [ ] **Step 2: Create InningAdvanceEventResponse**

```java
package com.softball.adapter.dto;

import com.softball.domain.model.InningAdvanceEvent;

import java.time.Instant;

public record InningAdvanceEventResponse(
    Long id,
    Integer toInning,
    Integer opponentRuns,
    Instant createdAt
) {
    public static InningAdvanceEventResponse from(final InningAdvanceEvent event) {
        return new InningAdvanceEventResponse(
            event.getId(),
            event.getToInning(),
            event.getOpponentRuns(),
            event.getCreatedAt()
        );
    }
}
```

- [ ] **Step 3: Extend UndoResultResponse**

Replace full content of `UndoResultResponse.java` with:

```java
package com.softball.adapter.dto;

public record UndoResultResponse(
    UndoType type,
    Long removedId
) {
    public enum UndoType { AT_BAT, STEALING, SUBSTITUTION, INNING_ADVANCE, NONE }

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

    public static UndoResultResponse inningAdvance(final Long id) {
        return new UndoResultResponse(UndoType.INNING_ADVANCE, id);
    }
}
```

- [ ] **Step 4: Compile check**

Run: `cd /home/hungl/privat/softball-lineup && ./backend/mvnw -f backend/pom.xml -s backend/.mvn/local-settings.xml compile`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/NextInningRequest.java backend/src/main/java/com/softball/adapter/dto/InningAdvanceEventResponse.java backend/src/main/java/com/softball/adapter/dto/UndoResultResponse.java
git commit -m "✨ DTOs: NextInningRequest + InningAdvanceEventResponse + UndoType.INNING_ADVANCE"
```

---

## Task 5: Service — `advanceInning` + getScoreboard.currentInning

**Files:**
- Modify: `backend/src/test/java/com/softball/application/GameScoringServiceTest.java`
- Modify: `backend/src/main/java/com/softball/application/GameScoringService.java`

- [ ] **Step 1: Add mock + failing tests in `UndoLastAction`-nested-Class-Geschwister-Stelle**

In `GameScoringServiceTest.java`: add new `@Mock` field after existing repos (around line 31):

```java
    @Mock private com.softball.domain.port.out.InningAdvanceEventRepository inningAdvanceEventRepository;
```

Add new nested test class BEFORE the `// --- helpers ---` line:

```java
    @org.junit.jupiter.api.Nested
    class AdvanceInning {

        @Test
        void advanceInning_createsEventAndUpdatesScoreThem() {
            mockGame();
            game.setScoreThem(0);
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
            final com.softball.domain.model.InningAdvanceEvent saved = new com.softball.domain.model.InningAdvanceEvent(game, 2, 3, "test");
            saved.setId(501L);
            saved.setCreatedAt(Instant.parse("2026-05-11T10:00:00Z"));
            when(inningAdvanceEventRepository.save(org.mockito.ArgumentMatchers.any())).thenReturn(saved);

            final com.softball.adapter.dto.InningAdvanceEventResponse res = service.advanceInning(1L, 3);

            assertThat(res.toInning()).isEqualTo(2);
            assertThat(res.opponentRuns()).isEqualTo(3);
            assertThat(game.getScoreThem()).isEqualTo(3);
            org.mockito.Mockito.verify(gameRepository).save(game);
        }

        @Test
        void advanceInning_zeroRuns_doesNotChangeScoreThem() {
            mockGame();
            game.setScoreThem(5);
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
            final com.softball.domain.model.InningAdvanceEvent saved = new com.softball.domain.model.InningAdvanceEvent(game, 2, 0, "test");
            saved.setId(502L);
            saved.setCreatedAt(Instant.parse("2026-05-11T10:00:00Z"));
            when(inningAdvanceEventRepository.save(org.mockito.ArgumentMatchers.any())).thenReturn(saved);

            service.advanceInning(1L, 0);

            assertThat(game.getScoreThem()).isEqualTo(5);
        }

        @Test
        void scoreboard_currentInning_reflectsLastEvent() {
            mockGame();
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
            final com.softball.domain.model.InningAdvanceEvent ev = new com.softball.domain.model.InningAdvanceEvent(game, 3, 0, "test");
            ev.setId(503L);
            ev.setCreatedAt(Instant.parse("2026-05-11T10:00:00Z"));
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(ev));

            final com.softball.adapter.dto.ScoreboardResponse sb = service.getScoreboard(1L);

            assertThat(sb.currentInning()).isEqualTo(3);
        }
    }
```

- [ ] **Step 2: Run tests — expect COMPILE FAIL**

Run: `cd /home/hungl/privat/softball-lineup && ./backend/mvnw -f backend/pom.xml -s backend/.mvn/local-settings.xml test -Dtest=GameScoringServiceTest$AdvanceInning`
Expected: COMPILE FAIL — `service.advanceInning` method missing, constructor injection mismatch.

- [ ] **Step 3: Update GameScoringService constructor to inject new repo + add advanceInning + update getScoreboard**

In `GameScoringService.java`:

Add field after `private final SubstitutionRepository substitutionRepository;`:
```java
    private final com.softball.domain.port.out.InningAdvanceEventRepository inningAdvanceEventRepository;
```

Update constructor signature + body — replace existing constructor with:
```java
    public GameScoringService(final GameRepository gameRepository,
                               final PlayerRepository playerRepository,
                               final LineupEntryRepository lineupEntryRepository,
                               final AtBatRepository atBatRepository,
                               final BaseRunningEventRepository stealingRepository,
                               final SubstitutionRepository substitutionRepository,
                               final com.softball.domain.port.out.InningAdvanceEventRepository inningAdvanceEventRepository) {
        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.atBatRepository = atBatRepository;
        this.stealingRepository = stealingRepository;
        this.substitutionRepository = substitutionRepository;
        this.inningAdvanceEventRepository = inningAdvanceEventRepository;
    }
```

Add new method `advanceInning` directly after `undoLastAction`:
```java
    @Transactional
    public com.softball.adapter.dto.InningAdvanceEventResponse advanceInning(final Long gameId, final int opponentRuns) {
        if (opponentRuns < 0) {
            throw new com.softball.shared.exception.BusinessValidationException("opponentRuns darf nicht negativ sein");
        }
        final Game game = findGame(gameId);

        // Aktuelles Inning aus letztem AB + letztem Event (max).
        final int lastABInning = atBatRepository.findByGameIdOrderBySequenceAsc(gameId).stream()
            .mapToInt(a -> a.getInning() != null ? a.getInning() : 1)
            .max().orElse(1);
        final int lastEventInning = inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(gameId).stream()
            .mapToInt(e -> e.getToInning() != null ? e.getToInning() : 1)
            .max().orElse(1);
        final int currentInning = Math.max(lastABInning, lastEventInning);
        final int toInning = currentInning + 1;

        final InningAdvanceEvent event = new InningAdvanceEvent(game, toInning, opponentRuns, currentUser());
        final InningAdvanceEvent saved = inningAdvanceEventRepository.save(event);

        if (opponentRuns > 0) {
            game.setScoreThem((game.getScoreThem() != null ? game.getScoreThem() : 0) + opponentRuns);
            gameRepository.save(game);
        } else {
            // Auch wenn opponentRuns=0, save für Konsistenz wenn Mock erwartet
            gameRepository.save(game);
        }

        return com.softball.adapter.dto.InningAdvanceEventResponse.from(saved);
    }
```

Add import at top of file:
```java
import com.softball.domain.model.InningAdvanceEvent;
```

Modify `getScoreboard` — find line `final int currentInning = last != null ? last.getInning() : 1;` and replace with:
```java
        final int lastABInning = last != null && last.getInning() != null ? last.getInning() : 1;
        final int lastEventInning = inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(gameId).stream()
            .mapToInt(e -> e.getToInning() != null ? e.getToInning() : 1)
            .max().orElse(1);
        final int currentInning = Math.max(lastABInning, lastEventInning);
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd /home/hungl/privat/softball-lineup && ./backend/mvnw -f backend/pom.xml -s backend/.mvn/local-settings.xml test -Dtest=GameScoringServiceTest`
Expected: PASS — all 37+ tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/GameScoringService.java backend/src/test/java/com/softball/application/GameScoringServiceTest.java
git commit -m "✨ GameScoringService: advanceInning + currentInning aus Event"
```

---

## Task 6: undoLastAction — INNING_ADVANCE-Branch

**Files:**
- Modify: `backend/src/test/java/com/softball/application/GameScoringServiceTest.java`
- Modify: `backend/src/main/java/com/softball/application/GameScoringService.java`

- [ ] **Step 1: Add failing tests in `UndoLastAction` nested class**

Add inside existing `UndoLastAction` class in `GameScoringServiceTest.java`:

```java
        @Test
        void inningAdvanceIsNewest_revertsScoreAndDeletesEvent() {
            mockGame();
            game.setScoreThem(5);
            final Instant abTime = Instant.parse("2026-05-11T10:00:00Z");
            final Instant eventTime = Instant.parse("2026-05-11T10:05:00Z");
            final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab.setId(101L); ab.setCreatedAt(abTime);
            final com.softball.domain.model.InningAdvanceEvent ev = new com.softball.domain.model.InningAdvanceEvent(game, 2, 3, "test");
            ev.setId(601L);
            ev.setCreatedAt(eventTime);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(ev));

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.INNING_ADVANCE);
            assertThat(result.removedId()).isEqualTo(601L);
            org.mockito.Mockito.verify(inningAdvanceEventRepository).deleteById(601L);
            assertThat(game.getScoreThem()).isEqualTo(2);
            org.mockito.Mockito.verify(gameRepository).save(game);
        }

        @Test
        void abNewerThanInningAdvance_undosAB() {
            mockGame();
            game.setScoreThem(3);
            final Instant eventTime = Instant.parse("2026-05-11T10:00:00Z");
            final Instant abTime = Instant.parse("2026-05-11T10:05:00Z");
            final AtBat ab = atBat(1, 2, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab.setId(102L); ab.setCreatedAt(abTime);
            final com.softball.domain.model.InningAdvanceEvent ev = new com.softball.domain.model.InningAdvanceEvent(game, 2, 3, "test");
            ev.setId(602L);
            ev.setCreatedAt(eventTime);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(ev));

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.AT_BAT);
            org.mockito.Mockito.verify(atBatRepository).deleteById(102L);
            org.mockito.Mockito.verify(inningAdvanceEventRepository, org.mockito.Mockito.never())
                .deleteById(org.mockito.ArgumentMatchers.anyLong());
            // Score-Them bleibt (Event-Run nicht zurückgeholt)
            assertThat(game.getScoreThem()).isEqualTo(3);
        }

        @Test
        void inningAdvanceUndo_clampsScoreThemAtZero() {
            mockGame();
            game.setScoreThem(1);
            final Instant eventTime = Instant.parse("2026-05-11T10:00:00Z");
            final com.softball.domain.model.InningAdvanceEvent ev = new com.softball.domain.model.InningAdvanceEvent(game, 2, 3, "test");
            ev.setId(603L);
            ev.setCreatedAt(eventTime);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.empty());
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(ev));

            service.undoLastAction(1L);

            assertThat(game.getScoreThem()).isZero();
        }
```

- [ ] **Step 2: Run tests — expect FAIL (Sub-Branch greift, type=SUBSTITUTION or NONE)**

Run: `cd /home/hungl/privat/softball-lineup && ./backend/mvnw -f backend/pom.xml -s backend/.mvn/local-settings.xml test -Dtest=GameScoringServiceTest$UndoLastAction#inningAdvanceIsNewest_revertsScoreAndDeletesEvent`
Expected: FAIL.

- [ ] **Step 3: Implement INNING_ADVANCE-Branch in `undoLastAction`**

In `GameScoringService.java` `undoLastAction`, modify:

(a) After existing `allSubs` line, add:
```java
        final java.util.List<InningAdvanceEvent> allInningEvents = inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(gameId);
```

(b) After existing `newestSub` line, add:
```java
        final java.time.Instant newestEvent = allInningEvents.stream()
            .map(InningAdvanceEvent::getCreatedAt)
            .filter(java.util.Objects::nonNull)
            .max(java.time.Instant::compareTo)
            .orElse(null);
```

(c) Update the "all null" check:
```java
        if (newestAB == null && newestStealing == null && newestSub == null && newestEvent == null) {
            return com.softball.adapter.dto.UndoResultResponse.none();
        }
```

(d) Update `abIsNewest` condition:
```java
        final boolean abIsNewest = newestAB != null
            && (newestStealing == null || !newestStealing.isAfter(newestAB))
            && (newestSub == null || !newestSub.isAfter(newestAB))
            && (newestEvent == null || !newestEvent.isAfter(newestAB));
```

(e) Update `stealingIsNewest` condition:
```java
        final boolean stealingIsNewest = newestStealing != null
            && (newestSub == null || !newestSub.isAfter(newestStealing))
            && (newestEvent == null || !newestEvent.isAfter(newestStealing));
```

(f) Update Sub-Branch — instead of unconditional `if (newestSub != null)`, use:
```java
        final boolean subIsNewest = newestSub != null
            && (newestEvent == null || !newestEvent.isAfter(newestSub));

        if (subIsNewest) {
            final Substitution latest = allSubs.stream()
                .filter(s -> s.getCreatedAt() != null)
                .max(java.util.Comparator.comparing(Substitution::getCreatedAt))
                .orElseThrow();
            substitutionRepository.deleteById(latest.getId());
            return com.softball.adapter.dto.UndoResultResponse.substitution(latest.getId());
        }
```

(g) Add INNING_ADVANCE-Branch BEFORE `return ...none()`:
```java
        if (newestEvent != null) {
            final InningAdvanceEvent latest = allInningEvents.stream()
                .filter(e -> e.getCreatedAt() != null)
                .max(java.util.Comparator.comparing(InningAdvanceEvent::getCreatedAt))
                .orElseThrow();
            final int runs = latest.getOpponentRuns() != null ? latest.getOpponentRuns() : 0;
            if (runs > 0) {
                final Game game = findGame(gameId);
                final int newScore = Math.max(0, (game.getScoreThem() != null ? game.getScoreThem() : 0) - runs);
                game.setScoreThem(newScore);
                gameRepository.save(game);
            }
            inningAdvanceEventRepository.deleteById(latest.getId());
            return com.softball.adapter.dto.UndoResultResponse.inningAdvance(latest.getId());
        }
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd /home/hungl/privat/softball-lineup && ./backend/mvnw -f backend/pom.xml -s backend/.mvn/local-settings.xml test -Dtest=GameScoringServiceTest`
Expected: ALL PASS (37+ tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/GameScoringService.java backend/src/test/java/com/softball/application/GameScoringServiceTest.java
git commit -m "✨ undoLastAction: INNING_ADVANCE-Branch + Score-Revert"
```

---

## Task 7: REST Endpoint `POST /scoring/next-inning`

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/in/web/ScoringController.java`

- [ ] **Step 1: Add endpoint to ScoringController**

Add to `ScoringController.java` after existing `undoLastAction` endpoint:

```java
    @PostMapping("/{gameId}/scoring/next-inning")
    @ResponseStatus(HttpStatus.CREATED)
    public com.softball.adapter.dto.InningAdvanceEventResponse advanceInning(@PathVariable final Long gameId,
                                                                              @jakarta.validation.Valid @RequestBody final com.softball.adapter.dto.NextInningRequest req) {
        return scoringService.advanceInning(gameId, req.opponentRuns());
    }
```

- [ ] **Step 2: Full backend test suite**

Run: `cd /home/hungl/privat/softball-lineup && ./backend/mvnw -f backend/pom.xml -s backend/.mvn/local-settings.xml test`
Expected: BUILD SUCCESS, all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/in/web/ScoringController.java
git commit -m "✨ ScoringController: POST /scoring/next-inning Endpoint"
```

---

## Task 8: Frontend Types + API-Client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Extend types**

In `frontend/src/types/index.ts`, find:
```typescript
export type UndoResultType = 'AT_BAT' | 'STEALING' | 'SUBSTITUTION' | 'NONE'
```

Replace with:
```typescript
export type UndoResultType = 'AT_BAT' | 'STEALING' | 'SUBSTITUTION' | 'INNING_ADVANCE' | 'NONE'

export interface InningAdvanceEventResponse {
  id: number
  toInning: number
  opponentRuns: number
  createdAt: string
}
```

- [ ] **Step 2: Add API client function**

In `frontend/src/api/client.ts`, after the existing `undoLastAction` function, add:

```typescript
export const advanceInning = (gameId: number, opponentRuns: number) =>
  request<InningAdvanceEventResponse>(`/games/${gameId}/scoring/next-inning`, {
    method: 'POST',
    body: JSON.stringify({ opponentRuns }),
  })
```

Ensure `InningAdvanceEventResponse` is imported. Add to the `import type { ... }` block at top of `client.ts`.

- [ ] **Step 3: Build check**

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run build`
Expected: SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts
git commit -m "✨ Types + API-Client: advanceInning + InningAdvanceEventResponse + UndoType erweitert"
```

---

## Task 9: ScoringPage — handleNextInning Backend-Call + inningOverride entfernen + Undo-Toast

**Files:**
- Modify: `frontend/src/components/scoring/ScoringPage.tsx`

- [ ] **Step 1: Remove `inningOverride` state and derived values**

Find and remove:
```typescript
  const [inningOverride, setInningOverride] = useState<number | null>(null)
```

Find the block:
```typescript
  const serverInning = scoreboard?.currentInning ?? 1
  const displayInning = inningOverride ?? serverInning
  const inningTransition = inningOverride != null && serverInning < inningOverride
  const displayOuts = inningTransition ? 0 : (scoreboard?.outsInCurrentInning ?? 0)
  const displayBaseState = inningTransition ? { first: null, second: null, third: null } : (scoreboard?.baseState ?? { first: null, second: null, third: null })
  const displayRunners = inningTransition ? [] : (scoreboard?.runners ?? [])
  const halfInningOver = !inningTransition && displayOuts >= 3
  const currentInning = displayInning
```

Replace with:
```typescript
  const serverInning = scoreboard?.currentInning ?? 1
  const displayInning = serverInning
  const displayOuts = scoreboard?.outsInCurrentInning ?? 0
  const displayBaseState = scoreboard?.baseState ?? { first: null, second: null, third: null }
  const displayRunners = scoreboard?.runners ?? []
  const halfInningOver = displayOuts >= 3
  const currentInning = displayInning
```

Remove the `inningOverride`-cleanup useEffect block:
```typescript
  // inningOverride zurücksetzen sobald Server in das neue Inning nachgezogen hat
  useEffect(() => {
    if (inningOverride != null && serverInning >= inningOverride) {
      setInningOverride(null)
    }
  }, [serverInning, inningOverride])

  // extraOuts zurücksetzen bei Inning-Wechsel
  useEffect(() => {
    if (inningTransition) setExtraOuts(0)
  }, [inningTransition])
```

Replace with:
```typescript
  // extraOuts zurücksetzen bei Inning-Wechsel — über serverInning detection
  const prevInningRef = useRef(serverInning)
  useEffect(() => {
    if (serverInning !== prevInningRef.current) {
      setExtraOuts(0)
      prevInningRef.current = serverInning
    }
  }, [serverInning])
```

Add `useRef` to React imports at top of file if not already present:
```typescript
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
```

(Check actual import line, may differ. Just add `useRef`.)

- [ ] **Step 2: Rewrite `handleNextInning` to use new endpoint**

Find existing `handleNextInning`:
```typescript
  const handleNextInning = async () => {
    // Optional: Gegner-Runs in diesem Inning addieren
    if (currentGame && opponentRunsThisInning.trim() !== '') {
      const addRuns = Number(opponentRunsThisInning)
      if (!Number.isNaN(addRuns) && addRuns >= 0) {
        const newScoreThem = (scoreThem ?? 0) + addRuns
        try {
          await api.setGameScore(currentGame.id, scoreUs, newScoreThem)
        } catch (e) {
          toast.show((e as Error).message, 'error')
        }
      }
    }
    setOpponentRunsThisInning('')
    setInningOverride(displayInning + 1)
    toast.show(`Inning ${displayInning + 1} · Bases frei`, 'success')
    await reload()
  }
```

Replace with:
```typescript
  const handleNextInning = async () => {
    if (!currentGame) return
    let opponentRuns = 0
    if (opponentRunsThisInning.trim() !== '') {
      const parsed = Number(opponentRunsThisInning)
      if (!Number.isNaN(parsed) && parsed >= 0) {
        opponentRuns = parsed
      }
    }
    try {
      await api.advanceInning(currentGame.id, opponentRuns)
      setOpponentRunsThisInning('')
      await reload()
      toast.show(`Inning ${displayInning + 1} · Bases frei`, 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }
```

- [ ] **Step 3: Extend Undo-Toast in `handleUndo`**

Find:
```typescript
      const message =
        result.type === 'AT_BAT' ? 'Letzter At-Bat rückgängig gemacht' :
        result.type === 'STEALING' ? 'Letztes Stealing-Event rückgängig gemacht' :
        result.type === 'SUBSTITUTION' ? 'Letzte Substitution rückgängig gemacht' :
        'Nichts zum Rückgängigmachen'
```

Replace with:
```typescript
      const message =
        result.type === 'AT_BAT' ? 'Letzter At-Bat rückgängig gemacht' :
        result.type === 'STEALING' ? 'Letztes Stealing-Event rückgängig gemacht' :
        result.type === 'SUBSTITUTION' ? 'Letzte Substitution rückgängig gemacht' :
        result.type === 'INNING_ADVANCE' ? 'Letzter Inning-Wechsel rückgängig gemacht' :
        'Nichts zum Rückgängigmachen'
```

- [ ] **Step 4: Find + remove other `setInningOverride` / `inningOverride` references**

Search for any remaining usages:
```bash
grep -n "inningOverride\|setInningOverride\|inningTransition" frontend/src/components/scoring/ScoringPage.tsx
```

Remove or update each reference. Expected: should be zero matches after this task.

- [ ] **Step 5: Build + lint**

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run build`
Expected: SUCCESS.

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run lint`
Expected: No new errors. Existing warnings may remain.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/scoring/ScoringPage.tsx
git commit -m "🔧 ScoringPage: handleNextInning ruft Backend, inningOverride entfernt, Toast erweitert"
```

---

## Task 10: Manuelle Verifikation im Browser

**Files:** keine

- [ ] **Step 1: Backend + Frontend starten**

Drei Terminals:
- `docker compose up -d db`
- `cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml`
- `cd frontend && npx vite`

- [ ] **Step 2: Smoke-Test Szenario**

```
1. Game öffnen, Lineup setzen.
2. AB1=OUT, AB2=STRIKEOUT, AB3=OUT in Inning 1 → 3 Outs, halfInningOver=true.
3. "Gegner-Runs"-Input: "2". Klick "Nächstes Inning". Toast "Inning 2 · Bases frei".
4. State: scoreThem=2, currentInning=2 (Server).
5. AB4=SINGLE in Inning 2 → Runner auf 1B.
6. Undo. → AB4 weg, currentInning bleibt 2 (Event noch da).
7. Undo. → Inning-Advance weg. scoreThem=0, currentInning=1.
   Toast: "Letzter Inning-Wechsel rückgängig gemacht".
8. Undo. → AB3 weg, halfInningOver=false.
9. Weiter Undo bis leer.
```

Erwartet: alle Schritte korrekt, kein Score-Drift.

- [ ] **Step 3: Stop dev-server**

Ctrl-C in beiden Terminals.

(Kein Commit — manueller Test.)

---

## Verification (final)

- [ ] **Full backend test suite**

Run: `cd /home/hungl/privat/softball-lineup && ./backend/mvnw -f backend/pom.xml -s backend/.mvn/local-settings.xml test`
Expected: BUILD SUCCESS.

- [ ] **Frontend build + lint**

Run: `cd /home/hungl/privat/softball-lineup/frontend && npm run build && npm run lint`
Expected: SUCCESS.

- [ ] **Manual smoke-test passed** (Task 10)
