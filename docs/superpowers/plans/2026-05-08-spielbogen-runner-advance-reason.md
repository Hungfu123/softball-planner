# Spielbogen Runner-Advance-Reason Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the **reason** for each runner advance per AB (`BB_FORCE`, `HIT_PUSH`, etc.) and render the corresponding annotation (e.g. "BB", "1B") at the diamond-side of the runner's cell in the RFL sheet/PDF.

**Architecture:** New `SpielbogenRunnerAdvance` entity (mirror SubstitutionEntity pattern) with FK to `at_bat`. Frontend computes default advances locally via `computeDefaultAdvances()` pure function and sends as part of `recordAtBat` request. Backend persists; sheet renderer reads back and emits side-annotations on each runner's cell.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway, PostgreSQL 17; React 19, TypeScript, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-08-spielbogen-runner-advance-reason-design.md`

---

## Task 1: Migration V27

**Files:**
- Create: `backend/src/main/resources/db/migration/V27__create_spielbogen_runner_advance.sql`

- [ ] **Step 1: Write SQL**

Create `backend/src/main/resources/db/migration/V27__create_spielbogen_runner_advance.sql`:
```sql
CREATE TABLE spielbogen_runner_advance (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    at_bat_id BIGINT NOT NULL REFERENCES spielbogen_at_bat(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    from_base SMALLINT NOT NULL,
    to_base SMALLINT NOT NULL,
    reason VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT runner_advance_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT runner_advance_base_check CHECK (
        from_base BETWEEN 0 AND 3 AND to_base BETWEEN 1 AND 4 AND to_base > from_base
    )
);

CREATE INDEX idx_runner_advance_bogen_side ON spielbogen_runner_advance(bogen_id, side);
CREATE INDEX idx_runner_advance_atbat ON spielbogen_runner_advance(at_bat_id);
CREATE INDEX idx_runner_advance_slot ON spielbogen_runner_advance(slot_id);
```

Verify the at_bat table is named `spielbogen_at_bat` first by reading `V20__create_spielbogen_scoring_tables.sql`. If named differently (e.g. `spielbogen_atbat`), adjust FK reference.

- [ ] **Step 2: Verify migration applies**

Run: `cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance/backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest -DfailIfNoTests=false`
Expected: existing tests pass; Testcontainers applies V27 cleanly.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add backend/src/main/resources/db/migration/V27__create_spielbogen_runner_advance.sql
git commit -m "✨ Spielbogen: V27 Migration spielbogen_runner_advance"
```

---

## Task 2: Domain Model + Reason Enum + Port

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/RunnerAdvanceReason.java`
- Create: `backend/src/main/java/com/softball/domain/model/SpielbogenRunnerAdvance.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/SpielbogenRunnerAdvanceRepository.java`

- [ ] **Step 1: Reason enum**

Create `backend/src/main/java/com/softball/domain/model/RunnerAdvanceReason.java`:
```java
package com.softball.domain.model;

public enum RunnerAdvanceReason {
    HIT_PUSH,
    BB_FORCE,
    HBP_FORCE,
    FIELDERS_CHOICE,
    ERROR,
    SAC,
    WP,
    PB
}
```

- [ ] **Step 2: Domain model**

Create `backend/src/main/java/com/softball/domain/model/SpielbogenRunnerAdvance.java`:
```java
package com.softball.domain.model;

import java.time.Instant;

public class SpielbogenRunnerAdvance {
    private Long id;
    private Spielbogen bogen;
    private SpielbogenAtBat atBat;
    private SpielbogenSlot slot;
    private BogenSide side;
    private Integer inning;
    private Integer fromBase;
    private Integer toBase;
    private RunnerAdvanceReason reason;
    private Instant createdAt;

    public SpielbogenRunnerAdvance() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Spielbogen getBogen() { return bogen; }
    public void setBogen(final Spielbogen bogen) { this.bogen = bogen; }
    public SpielbogenAtBat getAtBat() { return atBat; }
    public void setAtBat(final SpielbogenAtBat atBat) { this.atBat = atBat; }
    public SpielbogenSlot getSlot() { return slot; }
    public void setSlot(final SpielbogenSlot slot) { this.slot = slot; }
    public BogenSide getSide() { return side; }
    public void setSide(final BogenSide side) { this.side = side; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public Integer getFromBase() { return fromBase; }
    public void setFromBase(final Integer fromBase) { this.fromBase = fromBase; }
    public Integer getToBase() { return toBase; }
    public void setToBase(final Integer toBase) { this.toBase = toBase; }
    public RunnerAdvanceReason getReason() { return reason; }
    public void setReason(final RunnerAdvanceReason reason) { this.reason = reason; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 3: Port interface**

Create `backend/src/main/java/com/softball/domain/port/out/SpielbogenRunnerAdvanceRepository.java`:
```java
package com.softball.domain.port.out;

import com.softball.domain.model.SpielbogenRunnerAdvance;

import java.util.List;

public interface SpielbogenRunnerAdvanceRepository {
    List<SpielbogenRunnerAdvance> findByBogenId(Long bogenId);
    List<SpielbogenRunnerAdvance> findByAtBatId(Long atBatId);
    SpielbogenRunnerAdvance save(SpielbogenRunnerAdvance advance);
    List<SpielbogenRunnerAdvance> saveAll(List<SpielbogenRunnerAdvance> advances);
    void deleteByAtBatId(Long atBatId);
}
```

- [ ] **Step 4: Compile-check**

Run: `cd backend && ./mvnw compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add backend/src/main/java/com/softball/domain/model/RunnerAdvanceReason.java backend/src/main/java/com/softball/domain/model/SpielbogenRunnerAdvance.java backend/src/main/java/com/softball/domain/port/out/SpielbogenRunnerAdvanceRepository.java
git commit -m "✨ Spielbogen: Domain-Model + Port für RunnerAdvance"
```

---

## Task 3: JPA Entity + Spring Repo + Mapper + Adapter

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenRunnerAdvanceEntity.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenRunnerAdvanceRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenRunnerAdvanceMapper.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenRunnerAdvanceRepositoryAdapter.java`

- [ ] **Step 1: Entity**

Create `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenRunnerAdvanceEntity.java`:
```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "spielbogen_runner_advance")
public class SpielbogenRunnerAdvanceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bogen_id", nullable = false)
    private SpielbogenEntity bogen;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "at_bat_id", nullable = false)
    private SpielbogenAtBatEntity atBat;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slot_id", nullable = false)
    private SpielbogenSlotEntity slot;

    @Column(nullable = false)
    private String side;

    @Column(nullable = false)
    private Integer inning;

    @Column(name = "from_base", nullable = false)
    private Integer fromBase;

    @Column(name = "to_base", nullable = false)
    private Integer toBase;

    @Column(nullable = false)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() { if (createdAt == null) createdAt = Instant.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SpielbogenEntity getBogen() { return bogen; }
    public void setBogen(SpielbogenEntity bogen) { this.bogen = bogen; }
    public SpielbogenAtBatEntity getAtBat() { return atBat; }
    public void setAtBat(SpielbogenAtBatEntity atBat) { this.atBat = atBat; }
    public SpielbogenSlotEntity getSlot() { return slot; }
    public void setSlot(SpielbogenSlotEntity slot) { this.slot = slot; }
    public String getSide() { return side; }
    public void setSide(String side) { this.side = side; }
    public Integer getInning() { return inning; }
    public void setInning(Integer inning) { this.inning = inning; }
    public Integer getFromBase() { return fromBase; }
    public void setFromBase(Integer fromBase) { this.fromBase = fromBase; }
    public Integer getToBase() { return toBase; }
    public void setToBase(Integer toBase) { this.toBase = toBase; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
```

If existing `SpielbogenAtBatEntity` is named differently, adjust the import + `@ManyToOne` target.

- [ ] **Step 2: Spring repo**

Create `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenRunnerAdvanceRepository.java`:
```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenRunnerAdvanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringSpielbogenRunnerAdvanceRepository extends JpaRepository<SpielbogenRunnerAdvanceEntity, Long> {
    List<SpielbogenRunnerAdvanceEntity> findByBogen_IdOrderByIdAsc(Long bogenId);
    List<SpielbogenRunnerAdvanceEntity> findByAtBat_IdOrderByIdAsc(Long atBatId);
    void deleteByAtBat_Id(Long atBatId);
}
```

- [ ] **Step 3: Mapper**

Create `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenRunnerAdvanceMapper.java`:
```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenAtBatEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenRunnerAdvanceEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.RunnerAdvanceReason;
import com.softball.domain.model.SpielbogenRunnerAdvance;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenRunnerAdvanceMapper {

    private final SpielbogenMapper bogenMapper;
    private final SpielbogenAtBatMapper atBatMapper;
    private final SpielbogenSlotMapper slotMapper;

    public SpielbogenRunnerAdvanceMapper(final SpielbogenMapper bogenMapper,
                                         final SpielbogenAtBatMapper atBatMapper,
                                         final SpielbogenSlotMapper slotMapper) {
        this.bogenMapper = bogenMapper;
        this.atBatMapper = atBatMapper;
        this.slotMapper = slotMapper;
    }

    public SpielbogenRunnerAdvance toDomain(final SpielbogenRunnerAdvanceEntity e) {
        if (e == null) return null;
        SpielbogenRunnerAdvance a = new SpielbogenRunnerAdvance();
        a.setId(e.getId());
        a.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        a.setAtBat(e.getAtBat() != null ? atBatMapper.toDomain(e.getAtBat()) : null);
        a.setSlot(e.getSlot() != null ? slotMapper.toDomain(e.getSlot()) : null);
        a.setSide(BogenSide.valueOf(e.getSide()));
        a.setInning(e.getInning());
        a.setFromBase(e.getFromBase());
        a.setToBase(e.getToBase());
        a.setReason(RunnerAdvanceReason.valueOf(e.getReason()));
        a.setCreatedAt(e.getCreatedAt());
        return a;
    }

    public SpielbogenRunnerAdvanceEntity toEntity(final SpielbogenRunnerAdvance a,
                                                   final SpielbogenEntity bogenEntity,
                                                   final SpielbogenAtBatEntity atBatEntity,
                                                   final SpielbogenSlotEntity slotEntity) {
        SpielbogenRunnerAdvanceEntity e = new SpielbogenRunnerAdvanceEntity();
        e.setId(a.getId());
        e.setBogen(bogenEntity);
        e.setAtBat(atBatEntity);
        e.setSlot(slotEntity);
        e.setSide(a.getSide().name());
        e.setInning(a.getInning());
        e.setFromBase(a.getFromBase());
        e.setToBase(a.getToBase());
        e.setReason(a.getReason().name());
        return e;
    }
}
```

If `SpielbogenAtBatMapper` doesn't expose `toDomain(SpielbogenAtBatEntity)`, adapt — possibly read existing AtBat mapping pattern.

- [ ] **Step 4: Adapter**

Create `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenRunnerAdvanceRepositoryAdapter.java`:
```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenAtBatEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenRunnerAdvanceEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenRunnerAdvanceMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenAtBatRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRunnerAdvanceRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.domain.model.SpielbogenRunnerAdvance;
import com.softball.domain.port.out.SpielbogenRunnerAdvanceRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class SpielbogenRunnerAdvanceRepositoryAdapter implements SpielbogenRunnerAdvanceRepository {

    private final SpringSpielbogenRunnerAdvanceRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpringSpielbogenAtBatRepository atBatRepo;
    private final SpringSpielbogenSlotRepository slotRepo;
    private final SpielbogenRunnerAdvanceMapper mapper;

    public SpielbogenRunnerAdvanceRepositoryAdapter(final SpringSpielbogenRunnerAdvanceRepository repo,
                                                    final SpringSpielbogenRepository bogenRepo,
                                                    final SpringSpielbogenAtBatRepository atBatRepo,
                                                    final SpringSpielbogenSlotRepository slotRepo,
                                                    final SpielbogenRunnerAdvanceMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.atBatRepo = atBatRepo;
        this.slotRepo = slotRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenRunnerAdvance> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderByIdAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<SpielbogenRunnerAdvance> findByAtBatId(final Long atBatId) {
        return repo.findByAtBat_IdOrderByIdAsc(atBatId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public SpielbogenRunnerAdvance save(final SpielbogenRunnerAdvance advance) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(advance.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", advance.getBogen().getId()));
        SpielbogenAtBatEntity atBatEntity = atBatRepo.findById(advance.getAtBat().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenAtBat", advance.getAtBat().getId()));
        SpielbogenSlotEntity slotEntity = slotRepo.findById(advance.getSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", advance.getSlot().getId()));
        SpielbogenRunnerAdvanceEntity entity = mapper.toEntity(advance, bogenEntity, atBatEntity, slotEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public List<SpielbogenRunnerAdvance> saveAll(final List<SpielbogenRunnerAdvance> advances) {
        return advances.stream().map(this::save).toList();
    }

    @Override
    @Transactional
    public void deleteByAtBatId(final Long atBatId) {
        repo.deleteByAtBat_Id(atBatId);
    }
}
```

- [ ] **Step 5: Compile**

Run: `cd backend && ./mvnw compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenRunnerAdvanceEntity.java backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenRunnerAdvanceRepository.java backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenRunnerAdvanceMapper.java backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenRunnerAdvanceRepositoryAdapter.java
git commit -m "✨ Spielbogen: RunnerAdvance Persistence-Adapter"
```

---

## Task 4: DTOs Request + Response

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/SpielbogenRunnerAdvanceResponse.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/SpielbogenRecordAtBatRequest.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/SpielbogenAtBatResponse.java`

- [ ] **Step 1: Response DTO**

Create `backend/src/main/java/com/softball/adapter/dto/SpielbogenRunnerAdvanceResponse.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.RunnerAdvanceReason;
import com.softball.domain.model.SpielbogenRunnerAdvance;

import java.time.Instant;

public record SpielbogenRunnerAdvanceResponse(
    Long id,
    Long bogenId,
    Long atBatId,
    Long slotId,
    BogenSide side,
    Integer inning,
    Integer fromBase,
    Integer toBase,
    RunnerAdvanceReason reason,
    Instant createdAt
) {
    public static SpielbogenRunnerAdvanceResponse from(final SpielbogenRunnerAdvance a) {
        return new SpielbogenRunnerAdvanceResponse(
            a.getId(),
            a.getBogen() != null ? a.getBogen().getId() : null,
            a.getAtBat() != null ? a.getAtBat().getId() : null,
            a.getSlot() != null ? a.getSlot().getId() : null,
            a.getSide(),
            a.getInning(),
            a.getFromBase(),
            a.getToBase(),
            a.getReason(),
            a.getCreatedAt()
        );
    }
}
```

- [ ] **Step 2: Add `runnerAdvances` field to `SpielbogenRecordAtBatRequest`**

Open `backend/src/main/java/com/softball/adapter/dto/SpielbogenRecordAtBatRequest.java`. Add a new field (Optional list of entries) to the record:
```java
public record SpielbogenRecordAtBatRequest(
    // ... existing fields stay ...
    BogenBaseStateDto baseStateAfter,
    List<RunnerAdvanceEntry> runnerAdvances
) {
    public record RunnerAdvanceEntry(
        @NotNull Long slotId,
        @NotNull Integer fromBase,
        @NotNull Integer toBase,
        @NotNull RunnerAdvanceReason reason
    ) {}
}
```

Add imports as needed:
```java
import com.softball.domain.model.RunnerAdvanceReason;
import jakarta.validation.constraints.NotNull;
import java.util.List;
```

If `runnerAdvances` is null in request, treat as empty list in service code.

- [ ] **Step 3: Add `runnerAdvances` field to `SpielbogenAtBatResponse`**

Open `backend/src/main/java/com/softball/adapter/dto/SpielbogenAtBatResponse.java`. Add field:
```java
List<SpielbogenRunnerAdvanceResponse> runnerAdvances
```
to the record signature. Update the `from(...)` factory: takes a `List<SpielbogenRunnerAdvance>` second parameter and maps. Existing single-arg `from(SpielbogenAtBat ab)` overload can stay (use `List.of()` as default for advances), and a new `from(SpielbogenAtBat, List<SpielbogenRunnerAdvance>)` overload added for sheet-loading.

Example pattern:
```java
public static SpielbogenAtBatResponse from(final SpielbogenAtBat ab) {
    return from(ab, List.of());
}

public static SpielbogenAtBatResponse from(final SpielbogenAtBat ab, final List<SpielbogenRunnerAdvance> advances) {
    return new SpielbogenAtBatResponse(
        // ... existing field mappings ...
        ab.getBaseStateAfter() != null ? BogenBaseStateDto.from(ab.getBaseStateAfter()) : null,
        advances.stream().map(SpielbogenRunnerAdvanceResponse::from).toList()
    );
}
```

Add imports:
```java
import com.softball.domain.model.SpielbogenRunnerAdvance;
import java.util.List;
```

- [ ] **Step 4: Compile**

Run: `cd backend && ./mvnw compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS. If existing callers of `SpielbogenAtBatResponse.from(ab)` (single-arg) break — they shouldn't, since overload is preserved.

- [ ] **Step 5: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add backend/src/main/java/com/softball/adapter/dto/SpielbogenRunnerAdvanceResponse.java backend/src/main/java/com/softball/adapter/dto/SpielbogenRecordAtBatRequest.java backend/src/main/java/com/softball/adapter/dto/SpielbogenAtBatResponse.java
git commit -m "✨ Spielbogen: DTOs für RunnerAdvance"
```

---

## Task 5: Service `recordAtBat` persists RunnerAdvances

**Files:**
- Modify: `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`
- Modify: `backend/src/test/java/com/softball/application/SpielbogenScoringServiceTest.java`

- [ ] **Step 1: Write failing test**

Add to `SpielbogenScoringServiceTest.java`:
```java
@Test
void recordAtBat_withRunnerAdvances_persistsAll() {
    // Setup: bogen LIVE, slot for batter on HOME, runner-slot with id=200
    when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
    when(slotRepo.findById(100L)).thenReturn(Optional.of(slotFor(liveBogen, 100L, BogenSide.HOME, "P")));
    when(slotRepo.findById(200L)).thenReturn(Optional.of(slotFor(liveBogen, 200L, BogenSide.HOME, "C")));
    SpielbogenAtBat persistedAB = new SpielbogenAtBat();
    persistedAB.setId(99L);
    persistedAB.setBogen(liveBogen);
    when(atBatRepo.save(any())).thenReturn(persistedAB);
    when(atBatRepo.countOutsInInning(anyLong(), any(), anyInt())).thenReturn(0L);

    var advances = List.of(
        new RunnerAdvanceEntry(200L, 1, 2, RunnerAdvanceReason.BB_FORCE)
    );

    service.recordAtBat(
        1L, BogenSide.HOME, 100L, 1, AtBatResult.BB,
        null, null, null, false, null, 0, 0, null, advances
    );

    verify(runnerAdvanceRepo).saveAll(argThat(list -> list.size() == 1
        && list.get(0).getReason() == RunnerAdvanceReason.BB_FORCE
        && list.get(0).getFromBase() == 1
        && list.get(0).getToBase() == 2));
}
```

`RunnerAdvanceEntry` is the inner DTO — service-method signature should accept a list. If existing `recordAtBat` signature is fixed-args, extend with a new last param `List<RunnerAdvanceEntry>` (using a service-internal record `RunnerAdvanceInput` to avoid leaking DTO into application layer).

Mock `runnerAdvanceRepo` needs to be added to `@BeforeEach` setup (mock instance + constructor arg).

If `argThat` not imported: `import static org.mockito.ArgumentMatchers.argThat;`.

- [ ] **Step 2: Run test (compile fail expected)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest#recordAtBat_withRunnerAdvances_persistsAll`
Expected: COMPILE FAIL — `recordAtBat` doesn't accept advances list, no `runnerAdvanceRepo`.

- [ ] **Step 3: Add `runnerAdvanceRepo` to service + nested record**

Modify `SpielbogenScoringService.java`:

Imports:
```java
import com.softball.domain.port.out.SpielbogenRunnerAdvanceRepository;
import com.softball.domain.model.RunnerAdvanceReason;
import com.softball.domain.model.SpielbogenRunnerAdvance;
```

Field + constructor param:
```java
private final SpielbogenRunnerAdvanceRepository runnerAdvanceRepo;
```
Update constructor to accept `SpielbogenRunnerAdvanceRepository runnerAdvanceRepo` and assign.

Nested record (place near `SwapEntry`):
```java
public record RunnerAdvanceEntry(Long slotId, Integer fromBase, Integer toBase, RunnerAdvanceReason reason) {}
```

- [ ] **Step 4: Extend `recordAtBat` signature + persist advances**

In `recordAtBat` method, add a new last parameter:
```java
public SpielbogenAtBat recordAtBat(final Long bogenId, final BogenSide side, final Long slotId,
                                   final Integer inning, final AtBatResult result,
                                   final OutType outType, final SacrificeType sacrificeType,
                                   final List<Integer> fielderChain,
                                   final Boolean isError, final Integer errorPosition,
                                   final Integer runsScored, final Integer rbi,
                                   final BogenBaseState baseStateAfter,
                                   final List<RunnerAdvanceEntry> runnerAdvances) {
    // ... existing logic ...
    SpielbogenAtBat saved = atBatRepo.save(ab);
    
    // Persist runner advances
    if (runnerAdvances != null && !runnerAdvances.isEmpty()) {
        var entities = runnerAdvances.stream().map(entry -> {
            if (entry.fromBase() == null || entry.toBase() == null || entry.fromBase() >= entry.toBase()) {
                throw new BusinessValidationException("Ungültiger RunnerAdvance: fromBase=" + entry.fromBase() + ", toBase=" + entry.toBase());
            }
            SpielbogenSlot runnerSlot = requireSlotForBogenAndSide(entry.slotId(), bogenId, side);
            SpielbogenRunnerAdvance ra = new SpielbogenRunnerAdvance();
            ra.setBogen(bogen);
            ra.setAtBat(saved);
            ra.setSlot(runnerSlot);
            ra.setSide(side);
            ra.setInning(inning);
            ra.setFromBase(entry.fromBase());
            ra.setToBase(entry.toBase());
            ra.setReason(entry.reason());
            return ra;
        }).toList();
        runnerAdvanceRepo.saveAll(entities);
    }
    
    maybeAutoSwitchSide(bogen, side, inning);
    return saved;
}
```

(Make sure existing call-sites get updated to pass `null` or `List.of()` for `runnerAdvances` — search the codebase for `recordAtBat(` callers and update them.)

- [ ] **Step 5: Run test**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest`
Expected: ALL GREEN including new test. Existing `recordAtBat`-tests may need an extra null arg — fix accordingly.

- [ ] **Step 6: Add `findRunnerAdvancesForBogen` method**

Add to `SpielbogenScoringService.java` (used by sheet service later):
```java
@Transactional(readOnly = true)
public List<SpielbogenRunnerAdvance> findRunnerAdvances(final Long bogenId) {
    return runnerAdvanceRepo.findByBogenId(bogenId);
}
```

- [ ] **Step 7: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add backend/src/main/java/com/softball/application/SpielbogenScoringService.java backend/src/test/java/com/softball/application/SpielbogenScoringServiceTest.java
git commit -m "✨ Spielbogen: recordAtBat persistiert RunnerAdvance-Records"
```

---

## Task 6: Controller + SheetService Wiring

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java`
- Modify: `backend/src/main/java/com/softball/application/SpielbogenSheetService.java`

- [ ] **Step 1: Controller pass-through advances on recordAtBat**

In `SpielbogenController.java`, find the `recordAtBat` endpoint. The request body is `SpielbogenRecordAtBatRequest`. Update the call to `scoringService.recordAtBat(...)` to map the request's `runnerAdvances` field:
```java
var advances = req.runnerAdvances() == null ? java.util.List.<SpielbogenScoringService.RunnerAdvanceEntry>of()
    : req.runnerAdvances().stream()
        .map(e -> new SpielbogenScoringService.RunnerAdvanceEntry(e.slotId(), e.fromBase(), e.toBase(), e.reason()))
        .toList();
var saved = scoringService.recordAtBat(
    id, req.side(), req.slotId(), req.inning(), req.result(),
    req.outType(), req.sacrificeType(), req.fielderChain(),
    req.isError(), req.errorPosition(),
    req.runsScored(), req.rbi(),
    req.baseStateAfter() != null ? req.baseStateAfter().toDomain() : null,
    advances
);
```

If the existing call site is shorter (some args defaulted), align with actual existing code.

For the response: load advances by atBatId and use the new `SpielbogenAtBatResponse.from(ab, advances)` overload:
```java
var savedAdvances = scoringService.findRunnerAdvancesForAtBat(saved.getId());
return SpielbogenAtBatResponse.from(saved, savedAdvances);
```

If `findRunnerAdvancesForAtBat` doesn't exist, add to service:
```java
@Transactional(readOnly = true)
public List<SpielbogenRunnerAdvance> findRunnerAdvancesForAtBat(final Long atBatId) {
    return runnerAdvanceRepo.findByAtBatId(atBatId);
}
```

- [ ] **Step 2: SheetService loads advances**

In `backend/src/main/java/com/softball/application/SpielbogenSheetService.java`:

Update `SheetData` record:
```java
public record SheetData(
    Spielbogen bogen,
    List<SpielbogenSlot> homeLineup,
    List<SpielbogenSlot> awayLineup,
    List<SpielbogenAtBat> homeAtBats,
    List<SpielbogenAtBat> awayAtBats,
    List<SpielbogenStealingEvent> stealings,
    List<SpielbogenSubstitution> subs,
    List<SpielbogenPositionChange> positionChanges,
    List<SpielbogenRunnerAdvance> runnerAdvances,
    Map<Integer, BogenScoreCalculator.InningRuns> inningRuns
) {}
```

Add import `import com.softball.domain.model.SpielbogenRunnerAdvance;`.

In `getSheet`, add `scoringService.findRunnerAdvances(bogenId)` to the `SheetData` constructor call.

- [ ] **Step 3: Update getSheet response in Controller**

In `SpielbogenController.getSheet()`, the per-AB mapping currently uses `SpielbogenAtBatResponse::from(ab)`. Change to map advances per AB:
```java
List<SpielbogenAtBatResponse> homeAtBatsResponse = data.homeAtBats().stream()
    .map(ab -> {
        var perAbAdvances = data.runnerAdvances().stream()
            .filter(adv -> adv.getAtBat() != null && ab.getId().equals(adv.getAtBat().getId()))
            .toList();
        return SpielbogenAtBatResponse.from(ab, perAbAdvances);
    })
    .toList();
// same for away
```
Replace existing single-arg map calls.

- [ ] **Step 4: Run all backend tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: ALL GREEN. If integration tests fail because they expected old shape, update test expectations.

- [ ] **Step 5: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java backend/src/main/java/com/softball/application/SpielbogenSheetService.java backend/src/main/java/com/softball/application/SpielbogenScoringService.java
git commit -m "✨ Spielbogen: Controller + SheetService wiring für RunnerAdvances"
```

---

## Task 7: Frontend Types + Default-Logic Helper + Tests

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/utils/runnerAdvanceDefaults.ts`
- Create: `frontend/src/utils/runnerAdvanceDefaults.test.ts`

- [ ] **Step 1: Types**

In `frontend/src/types/index.ts` add (place near `SpielbogenStealingResponse`):
```ts
export type RunnerAdvanceReason =
  | 'HIT_PUSH'
  | 'BB_FORCE'
  | 'HBP_FORCE'
  | 'FIELDERS_CHOICE'
  | 'ERROR'
  | 'SAC'
  | 'WP'
  | 'PB'

export interface RunnerAdvanceEntry {
  slotId: number
  fromBase: number
  toBase: number
  reason: RunnerAdvanceReason
}

export interface SpielbogenRunnerAdvanceResponse {
  id: number
  bogenId: number
  atBatId: number
  slotId: number
  side: BogenSide
  inning: number
  fromBase: number
  toBase: number
  reason: RunnerAdvanceReason
  createdAt: string
}
```

In `SpielbogenAtBatResponse`, add field:
```ts
runnerAdvances: SpielbogenRunnerAdvanceResponse[]
```
(non-optional; backend always returns at least empty array.)

In `SpielbogenRecordAtBatRequest` (if defined as type), add optional `runnerAdvances?: RunnerAdvanceEntry[]`.

- [ ] **Step 2: Default-Logic helper**

Create `frontend/src/utils/runnerAdvanceDefaults.ts`:
```ts
import type { RunnerAdvanceEntry, RunnerAdvanceReason, AtBatResult, BogenBaseState } from '@/types'

interface ComputeArgs {
  abResult: AtBatResult
  baseStateBefore: BogenBaseState | null
  baseStateAfter: BogenBaseState | null
}

/** Compute RunnerAdvanceEntry list from a state diff + AB-result.
 *  Pure function — does not call API. Used by HitAdjustSheet onConfirm + auto for BB/HBP. */
export function computeDefaultAdvances({ abResult, baseStateBefore, baseStateAfter }: ComputeArgs): RunnerAdvanceEntry[] {
  const before = baseStateBefore ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }
  const after = baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }
  const reason = mapReason(abResult)
  if (!reason) return []

  const beforeMap = mapSlotsToBase(before)
  const afterMap = mapSlotsToBase(after)
  const advances: RunnerAdvanceEntry[] = []
  for (const [slotId, fromBase] of beforeMap.entries()) {
    const toBase = afterMap.get(slotId) ?? 4 // not in after = scored (home)
    if (toBase > fromBase) {
      advances.push({ slotId, fromBase, toBase, reason })
    }
  }
  return advances
}

function mapReason(r: AtBatResult): RunnerAdvanceReason | null {
  if (r === 'SINGLE' || r === 'DOUBLE' || r === 'TRIPLE' || r === 'HOMERUN') return 'HIT_PUSH'
  if (r === 'BB') return 'BB_FORCE'
  if (r === 'HBP') return 'HBP_FORCE'
  if (r === 'SACRIFICE') return 'SAC'
  return null
}

function mapSlotsToBase(s: BogenBaseState): Map<number, number> {
  const m = new Map<number, number>()
  if (s.firstSlotId != null) m.set(s.firstSlotId, 1)
  if (s.secondSlotId != null) m.set(s.secondSlotId, 2)
  if (s.thirdSlotId != null) m.set(s.thirdSlotId, 3)
  return m
}
```

(If `AtBatResult` enum string values differ in this codebase, adjust `mapReason` accordingly. Read `frontend/src/types/index.ts` for actual values.)

- [ ] **Step 3: Tests**

Create `frontend/src/utils/runnerAdvanceDefaults.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeDefaultAdvances } from './runnerAdvanceDefaults'

describe('computeDefaultAdvances', () => {
  it('1B with empty bases produces no advances', () => {
    const advances = computeDefaultAdvances({
      abResult: 'SINGLE',
      baseStateBefore: { firstSlotId: null, secondSlotId: null, thirdSlotId: null },
      baseStateAfter: { firstSlotId: 100, secondSlotId: null, thirdSlotId: null },
    })
    expect(advances).toEqual([])
  })

  it('1B + runner on 2B advances to 3B yields HIT_PUSH 2→3', () => {
    const advances = computeDefaultAdvances({
      abResult: 'SINGLE',
      baseStateBefore: { firstSlotId: null, secondSlotId: 200, thirdSlotId: null },
      baseStateAfter: { firstSlotId: 100, secondSlotId: null, thirdSlotId: 200 },
    })
    expect(advances).toEqual([
      { slotId: 200, fromBase: 2, toBase: 3, reason: 'HIT_PUSH' },
    ])
  })

  it('BB + runner on 1B yields BB_FORCE 1→2', () => {
    const advances = computeDefaultAdvances({
      abResult: 'BB',
      baseStateBefore: { firstSlotId: 200, secondSlotId: null, thirdSlotId: null },
      baseStateAfter: { firstSlotId: 100, secondSlotId: 200, thirdSlotId: null },
    })
    expect(advances).toEqual([
      { slotId: 200, fromBase: 1, toBase: 2, reason: 'BB_FORCE' },
    ])
  })

  it('BB bases-loaded yields 3 BB_FORCE advances and runner home', () => {
    const advances = computeDefaultAdvances({
      abResult: 'BB',
      baseStateBefore: { firstSlotId: 200, secondSlotId: 201, thirdSlotId: 202 },
      baseStateAfter: { firstSlotId: 100, secondSlotId: 200, thirdSlotId: 201 },
    })
    expect(advances).toEqual([
      { slotId: 200, fromBase: 1, toBase: 2, reason: 'BB_FORCE' },
      { slotId: 201, fromBase: 2, toBase: 3, reason: 'BB_FORCE' },
      { slotId: 202, fromBase: 3, toBase: 4, reason: 'BB_FORCE' },
    ])
  })
})
```

- [ ] **Step 4: Run tests**

Run: `cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance/frontend && npx vitest run src/utils/runnerAdvanceDefaults.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: TypeScript clean.

- [ ] **Step 6: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add frontend/src/types/index.ts frontend/src/utils/runnerAdvanceDefaults.ts frontend/src/utils/runnerAdvanceDefaults.test.ts
git commit -m "✨ Spielbogen: computeDefaultAdvances Helper + Types"
```

---

## Task 8: API Client + Hook — recordAtBat sends runnerAdvances

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/hooks/useSpielbogenScoring.ts`

- [ ] **Step 1: Update API client**

In `frontend/src/api/client.ts`, find `recordSpielbogenAtBat` (or equivalent). Verify the request body type — if it accepts a generic body, the new `runnerAdvances` field will pass through automatically. If a typed wrapper exists, extend its arg type.

If the function already takes the full `SpielbogenRecordAtBatRequest` shape, just confirm that the type now includes `runnerAdvances?` (Task 7 added it). No changes needed.

- [ ] **Step 2: Update Hook**

In `frontend/src/hooks/useSpielbogenScoring.ts`, find `recordAtBat` callback. If it constructs the request body inline, extend its parameter signature to accept `runnerAdvances?: RunnerAdvanceEntry[]` and pass through.

Example:
```ts
const recordAtBat = useCallback(async (req: {
  // existing fields ...
  runnerAdvances?: RunnerAdvanceEntry[]
}) => {
  await api.recordSpielbogenAtBat(bogenId, req)
  await reload()
}, [bogenId, reload])
```

- [ ] **Step 3: Build**

Run: `cd frontend && npm run build`
Expected: TypeScript clean.

- [ ] **Step 4: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add frontend/src/api/client.ts frontend/src/hooks/useSpielbogenScoring.ts
git commit -m "✨ Spielbogen: recordAtBat-Hook akzeptiert runnerAdvances"
```

---

## Task 9: HitAdjustSheet sets advance-reason

**Files:**
- Modify: `frontend/src/components/spielbogen/HitAdjustSheet.tsx`

- [ ] **Step 1: Wire computeDefaultAdvances into onConfirm**

Open `frontend/src/components/spielbogen/HitAdjustSheet.tsx`. Find the `onConfirm` callback that sends the AB record. Before sending, compute advances:
```ts
import { computeDefaultAdvances } from '@/utils/runnerAdvanceDefaults'

// inside onConfirm, after baseStateAfter is determined:
const advances = computeDefaultAdvances({
  abResult,                  // already in scope from sheet
  baseStateBefore,           // sheet should have access; if not, pass via props
  baseStateAfter,
})
// Append `runnerAdvances: advances` to the recordAtBat request payload
```

If `baseStateBefore` is not in scope, add a Prop `baseStateBefore: BogenBaseState | null` to HitAdjustSheet's Props type. Update caller `SpielbogenPage` to pass it.

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build`
Expected: TypeScript clean.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add frontend/src/components/spielbogen/HitAdjustSheet.tsx frontend/src/components/spielbogen/SpielbogenPage.tsx
git commit -m "✨ Spielbogen: HitAdjustSheet sendet RunnerAdvances mit AB"
```

---

## Task 10: SpielbogenPage auto-force for BB/HBP/SAC

**Files:**
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx`

- [ ] **Step 1: Wire auto-compute for non-hit results**

In `SpielbogenPage.tsx`, find where `recordAtBat` is called for direct AB-results (not via HitAdjustSheet). Specifically: BB, HBP, K, OUT, etc. For BB / HBP / SAC: compute default-advances and include:
```ts
import { computeDefaultAdvances } from '@/utils/runnerAdvanceDefaults'

// before recordAtBat call for BB:
const advances = computeDefaultAdvances({
  abResult: 'BB',
  baseStateBefore: currentBaseState,
  baseStateAfter: newBaseState,
})
await recordAtBat({ /* ...existing fields..., */ runnerAdvances: advances })
```

For Strikeout / Out / FlyOut: no advances → omit or pass `[]`.

- [ ] **Step 2: Build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build success; lint shows only pre-existing warnings.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add frontend/src/components/spielbogen/SpielbogenPage.tsx
git commit -m "✨ Spielbogen: BB/HBP auto-computeAdvances bei recordAtBat"
```

---

## Task 11: Sheet Renderer — advanceLabels per Cell

**Files:**
- Modify: `frontend/src/utils/bogenSheetRenderer.ts`

- [ ] **Step 1: Extend CellNotation with advanceLabels**

In `frontend/src/utils/bogenSheetRenderer.ts`, find the `CellNotation` type or interface. Add field:
```ts
advanceLabels: AdvanceLabel[]
```

Define:
```ts
export interface AdvanceLabel {
  side: 'home-1b' | '1b-2b' | '2b-3b' | '3b-home'
  label: string
}
```

- [ ] **Step 2: Add helper to compute labels per cell**

In `bogenSheetRenderer.ts`:
```ts
function reasonToLabel(reason: RunnerAdvanceReason, abResult?: AtBatResult): string {
  switch (reason) {
    case 'HIT_PUSH':
      if (abResult === 'SINGLE') return '1B'
      if (abResult === 'DOUBLE') return '2B'
      if (abResult === 'TRIPLE') return '3B'
      if (abResult === 'HOMERUN') return 'HR'
      return 'H'
    case 'BB_FORCE': return 'BB'
    case 'HBP_FORCE': return 'HBP'
    case 'FIELDERS_CHOICE': return 'FC'
    case 'ERROR': return 'E'
    case 'SAC': return 'SAC'
    case 'WP': return 'WP'
    case 'PB': return 'PB'
  }
}

function fromToToSide(fromBase: number, toBase: number): AdvanceLabel['side'] | null {
  if (fromBase === 0 && toBase === 1) return 'home-1b'
  if (fromBase === 1 && toBase === 2) return '1b-2b'
  if (fromBase === 2 && toBase === 3) return '2b-3b'
  if (fromBase === 3 && toBase === 4) return '3b-home'
  return null  // multi-step advance — skip side label (or could add multiple)
}
```

- [ ] **Step 3: Wire advance-labels into renderCells**

Modify `renderCells` (the function that produces `CellMap`) to accept a third param `runnerAdvances: SpielbogenRunnerAdvanceResponse[]`. For each advance, find the runner's slot's cell at the AB's inning. Compute the label using `abResult` from the originating AB. Push to that cell's `advanceLabels`.

Algorithm sketch:
```ts
export function renderCells(
  atBats: SpielbogenAtBatResponse[],
  stealingEvents: SpielbogenStealingResponse[],
  runnerAdvances: SpielbogenRunnerAdvanceResponse[] = [],
): CellMap {
  // existing logic ...

  // Initialize advanceLabels: [] on each cell ...

  for (const adv of runnerAdvances) {
    const ab = atBats.find(a => a.id === adv.atBatId)
    if (!ab) continue
    const side = fromToToSide(adv.fromBase, adv.toBase)
    if (!side) continue
    const label = reasonToLabel(adv.reason, ab.result)
    const key = cellKey(adv.side, adv.slotId, adv.inning)
    const cell = cellMap.get(key)
    if (cell) cell.advanceLabels.push({ side, label })
  }
  return cellMap
}
```

Update existing callers of `renderCells` to pass `runnerAdvances`:
- `SpielbogenPage.tsx` (uses sheet, already has `sheet.atBats` — pass `sheet.runnerAdvances ?? []` once added — see Task 13).
- `RflSheetDrawer.tsx` (uses `renderCells(atBats, stealings)` — add 3rd arg).
- `LastAtBatPreview.tsx` (uses `renderCells([lastAtBat], [])` — add `[]`).
- `spielbogenPdfExport.ts` (uses `renderCells(atBats, stealings)` — add `sheet.runnerAdvances`).

- [ ] **Step 4: Build**

Run: `cd frontend && npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add frontend/src/utils/bogenSheetRenderer.ts frontend/src/components/spielbogen/RflSheetDrawer.tsx frontend/src/components/spielbogen/LastAtBatPreview.tsx frontend/src/utils/spielbogenPdfExport.ts frontend/src/components/spielbogen/SpielbogenPage.tsx
git commit -m "✨ Spielbogen: advanceLabels in CellNotation + Renderer"
```

---

## Task 12: Add `runnerAdvances` to BogenSheetResponse type + Frontend wiring

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add field to BogenSheetResponse**

In `frontend/src/types/index.ts`, find `BogenSheetResponse`. Add:
```ts
runnerAdvances: SpielbogenRunnerAdvanceResponse[]
```
(After the existing `positionChanges` field, before `inningRuns`.)

- [ ] **Step 2: Update Backend's BogenSheetResponse to include runnerAdvances at TOP-level too**

Backend currently has runnerAdvances **per AB**, not at top level. The frontend renderer needs flat list for cellMap loop. Easiest: backend also returns flat `runnerAdvances` at sheet root. Update:

`backend/src/main/java/com/softball/adapter/dto/BogenSheetResponse.java`:
```java
public record BogenSheetResponse(
    SpielbogenResponse meta,
    List<SpielbogenSlotResponse> homeLineup,
    List<SpielbogenSlotResponse> awayLineup,
    List<SpielbogenAtBatResponse> homeAtBats,
    List<SpielbogenAtBatResponse> awayAtBats,
    List<SpielbogenStealingResponse> stealingEvents,
    List<SpielbogenSubstitutionResponse> substitutions,
    List<SpielbogenPositionChangeResponse> positionChanges,
    List<SpielbogenRunnerAdvanceResponse> runnerAdvances,
    Map<Integer, InningRuns> inningRuns
) {
    public record InningRuns(int home, int away) {}
}
```

`SpielbogenController.getSheet()`: add `data.runnerAdvances().stream().map(SpielbogenRunnerAdvanceResponse::from).toList()` to the constructor call.

- [ ] **Step 3: Build (Backend + Frontend)**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance/backend
./mvnw compile -s .mvn/local-settings.xml
cd ../frontend
npm run build
```
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add backend/src/main/java/com/softball/adapter/dto/BogenSheetResponse.java backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java frontend/src/types/index.ts
git commit -m "✨ Spielbogen: runnerAdvances flach in BogenSheetResponse"
```

---

## Task 13: DiamondCell + PDF — render advance-labels

**Files:**
- Modify: `frontend/src/components/spielbogen/DiamondCell.tsx`
- Modify: `frontend/src/utils/spielbogenPdfExport.ts`

- [ ] **Step 1: Render advance-labels in DiamondCell SVG**

In `DiamondCell.tsx`, after the existing diamond paths and before stealing-arrows section, add:
```tsx
{notation?.advanceLabels?.map((adv, i) => {
  const pos = sidePosition(adv.side)
  return (
    <text
      key={`adv-${i}`}
      x={pos.x}
      y={pos.y}
      textAnchor="middle"
      fontSize="4"
      fontWeight="700"
      fill="#1f2937"
      style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
    >
      {adv.label}
    </text>
  )
})}
```

Add helper inside the file:
```tsx
function sidePosition(side: 'home-1b' | '1b-2b' | '2b-3b' | '3b-home') {
  if (side === 'home-1b') return { x: 42, y: 41 }
  if (side === '1b-2b') return { x: 42, y: 19 }
  if (side === '2b-3b') return { x: 18, y: 19 }
  if (side === '3b-home') return { x: 18, y: 41 }
  return { x: 30, y: 30 }
}
```

(Coordinates per viewBox 60×80 used elsewhere in DiamondCell.)

- [ ] **Step 2: Render advance-labels in PDF**

In `frontend/src/utils/spielbogenPdfExport.ts`, find `drawDiamondCell`. After the diamond path and before stealing-arrow rendering, add:
```ts
if (cell?.advanceLabels?.length) {
  doc.setFontSize(2.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  for (const adv of cell.advanceLabels) {
    const cellMid = { x: cellX + cellW * 0.5, y: cellY + cellH * 0.5 }
    const pos = pdfSidePosition(adv.side, cellX, cellY, cellW, cellH, cellMid)
    doc.text(adv.label, pos.x, pos.y, { align: 'center' })
  }
}
```

Add helper at bottom of file:
```ts
function pdfSidePosition(
  side: 'home-1b' | '1b-2b' | '2b-3b' | '3b-home',
  cellX: number, cellY: number, cellW: number, cellH: number,
  mid: { x: number; y: number },
) {
  // Approximate midpoints between bases on the diamond rendered in this cell.
  // Diamond top at cy, sized by r in drawDiamondCell — approximate via cell-frac.
  const dx = cellW * 0.18
  const dy = cellH * 0.14
  if (side === 'home-1b') return { x: mid.x + dx, y: mid.y + dy * 0.5 }
  if (side === '1b-2b') return { x: mid.x + dx, y: mid.y - dy * 1.4 }
  if (side === '2b-3b') return { x: mid.x - dx, y: mid.y - dy * 1.4 }
  if (side === '3b-home') return { x: mid.x - dx, y: mid.y + dy * 0.5 }
  return { x: mid.x, y: mid.y }
}
```

- [ ] **Step 3: Build**

Run: `cd frontend && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-runner-advance
git add frontend/src/components/spielbogen/DiamondCell.tsx frontend/src/utils/spielbogenPdfExport.ts
git commit -m "✨ Spielbogen: AdvanceLabels-Render in DiamondCell + PDF"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Backend full test**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: ALL TESTS PASS.

- [ ] **Step 2: Frontend build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build success; lint shows only pre-existing warnings.

- [ ] **Step 3: Manual E2E**

Start dev environment + open browser. Test:
1. Bogen LIVE, lineup with ≥3 batters.
2. Batter-1: Walk → empty bases → no advance records.
3. Batter-2: Walk → Runner-1 forced 1B→2B. Annotation "BB" on Runner-1's cell at side 1b-2b. Visible in RflSheetDrawer.
4. Batter-3: Single (1B). HitAdjustSheet opens; user pushes Runner-2 from 2B→3B. Save. Annotation "1B" at side 2b-3b on Runner-2's cell.
5. Bases-loaded BB → 3 BB-FORCE advances + Run scored.
6. Triple → all runners home. Annotation "3B" on each runner's cell at side 3b-home.
7. Export PDF → annotations visible at diamond-sides as small text labels.
8. Validation: invalid request (fromBase=2, toBase=2) returns 400.

- [ ] **Step 4: Final commit if any fixes needed**

If E2E surfaced issues, fix and commit.

---

## Self-Review Notes

Spec coverage:
- V27 migration — Task 1 ✓
- Domain model + Reason enum + Port — Task 2 ✓
- JPA Entity + Spring repo + Mapper + Adapter — Task 3 ✓
- Request/Response DTOs — Task 4 ✓
- Service `recordAtBat` persists advances + `findRunnerAdvances` — Tasks 5, 6 ✓
- Controller pass-through + SheetService loading — Task 6 ✓
- BogenSheetResponse runnerAdvances field — Task 12 ✓
- Frontend types — Task 7 ✓
- `computeDefaultAdvances` helper + tests — Task 7 ✓
- API client + hook recordAtBat extension — Task 8 ✓
- HitAdjustSheet wiring — Task 9 ✓
- BB/HBP auto-force — Task 10 ✓
- Sheet renderer advanceLabels — Task 11 ✓
- DiamondCell + PDF render — Task 13 ✓
- Manual E2E — Task 14 ✓

Type consistency:
- `RunnerAdvanceEntry` (frontend type) and `SpielbogenScoringService.RunnerAdvanceEntry` (backend nested record) match: slotId, fromBase, toBase, reason ✓
- `SpielbogenAtBatResponse.runnerAdvances` field added in Task 4, frontend type in Task 7 ✓

Out-of-scope items from spec (backend default-compute endpoint, migration of existing ABs, stealing-convergence) explicitly NOT in any task — confirmed.
