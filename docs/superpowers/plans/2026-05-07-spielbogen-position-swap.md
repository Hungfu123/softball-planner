# Spielbogen Position-Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ability to record defensive position swaps (P↔C, ring-swaps) per inning in the Spielbogen, persisted with audit history and rendered in the RFL-PDF as stacked position numbers below the original position.

**Architecture:** Mirror the existing `SpielbogenSubstitution` pattern — new domain entity `SpielbogenPositionChange` with one row per slot-position-change, grouped via `groupId` (UUID) for atomic multi-slot swaps. Service method updates `slot.position` and writes audit records inside one transaction. PDF renders position-history stacked using existing sub-lines in the Pos-cell.

**Tech Stack:** Backend: Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway, PostgreSQL 17, JUnit + Testcontainers. Frontend: React 19, TypeScript, Vite, Tailwind v4, jsPDF.

**Spec:** `docs/superpowers/specs/2026-05-07-spielbogen-position-swap-design.md`

---

## Task 1: Flyway Migration V26

**Files:**
- Create: `backend/src/main/resources/db/migration/V26__create_spielbogen_position_change.sql`

- [ ] **Step 1: Write migration SQL**

Create `backend/src/main/resources/db/migration/V26__create_spielbogen_position_change.sql`:
```sql
CREATE TABLE spielbogen_position_change (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    group_id VARCHAR(36) NOT NULL,
    old_position VARCHAR(8),
    new_position VARCHAR(8),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT spielbogen_poschg_side_check CHECK (side IN ('HOME', 'AWAY'))
);

CREATE INDEX idx_spielbogen_poschg_bogen_side ON spielbogen_position_change(bogen_id, side);
CREATE INDEX idx_spielbogen_poschg_group ON spielbogen_position_change(group_id);
```

- [ ] **Step 2: Verify migration runs against test DB**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest -DfailIfNoTests=false`
Expected: Existing tests still pass; Testcontainers spin up Postgres and apply V26 without error. If migration fails, fix SQL syntax.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V26__create_spielbogen_position_change.sql
git commit -m "✨ Spielbogen: V26 Migration für Position-Change-Tabelle"
```

---

## Task 2: Domain Model + Port Interface

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/SpielbogenPositionChange.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/SpielbogenPositionChangeRepository.java`

- [ ] **Step 1: Write domain model**

Create `backend/src/main/java/com/softball/domain/model/SpielbogenPositionChange.java`:
```java
package com.softball.domain.model;

import java.time.Instant;

public class SpielbogenPositionChange {
    private Long id;
    private Spielbogen bogen;
    private SpielbogenSlot slot;
    private BogenSide side;
    private Integer inning;
    private String groupId;
    private String oldPosition;
    private String newPosition;
    private Instant createdAt;

    public SpielbogenPositionChange() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Spielbogen getBogen() { return bogen; }
    public void setBogen(final Spielbogen bogen) { this.bogen = bogen; }
    public SpielbogenSlot getSlot() { return slot; }
    public void setSlot(final SpielbogenSlot slot) { this.slot = slot; }
    public BogenSide getSide() { return side; }
    public void setSide(final BogenSide side) { this.side = side; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public String getGroupId() { return groupId; }
    public void setGroupId(final String groupId) { this.groupId = groupId; }
    public String getOldPosition() { return oldPosition; }
    public void setOldPosition(final String oldPosition) { this.oldPosition = oldPosition; }
    public String getNewPosition() { return newPosition; }
    public void setNewPosition(final String newPosition) { this.newPosition = newPosition; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 2: Write port interface**

Create `backend/src/main/java/com/softball/domain/port/out/SpielbogenPositionChangeRepository.java`:
```java
package com.softball.domain.port.out;

import com.softball.domain.model.SpielbogenPositionChange;

import java.util.List;
import java.util.Optional;

public interface SpielbogenPositionChangeRepository {
    List<SpielbogenPositionChange> findByBogenId(Long bogenId);
    Optional<SpielbogenPositionChange> findById(Long id);
    SpielbogenPositionChange save(SpielbogenPositionChange change);
    void deleteById(Long id);
    void deleteByGroupId(String groupId);
}
```

- [ ] **Step 3: Compile-check**

Run: `cd backend && ./mvnw compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/SpielbogenPositionChange.java backend/src/main/java/com/softball/domain/port/out/SpielbogenPositionChangeRepository.java
git commit -m "✨ Spielbogen: Domain-Model + Port für Position-Change"
```

---

## Task 3: JPA Entity

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenPositionChangeEntity.java`

- [ ] **Step 1: Write entity**

Create `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenPositionChangeEntity.java`:
```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "spielbogen_position_change")
public class SpielbogenPositionChangeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bogen_id", nullable = false)
    private SpielbogenEntity bogen;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slot_id", nullable = false)
    private SpielbogenSlotEntity slot;

    @Column(nullable = false)
    private String side;

    @Column(nullable = false)
    private Integer inning;

    @Column(name = "group_id", nullable = false)
    private String groupId;

    @Column(name = "old_position")
    private String oldPosition;

    @Column(name = "new_position")
    private String newPosition;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() { if (createdAt == null) createdAt = Instant.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SpielbogenEntity getBogen() { return bogen; }
    public void setBogen(SpielbogenEntity bogen) { this.bogen = bogen; }
    public SpielbogenSlotEntity getSlot() { return slot; }
    public void setSlot(SpielbogenSlotEntity slot) { this.slot = slot; }
    public String getSide() { return side; }
    public void setSide(String side) { this.side = side; }
    public Integer getInning() { return inning; }
    public void setInning(Integer inning) { this.inning = inning; }
    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
    public String getOldPosition() { return oldPosition; }
    public void setOldPosition(String oldPosition) { this.oldPosition = oldPosition; }
    public String getNewPosition() { return newPosition; }
    public void setNewPosition(String newPosition) { this.newPosition = newPosition; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenPositionChangeEntity.java
git commit -m "✨ Spielbogen: JPA-Entity SpielbogenPositionChangeEntity"
```

---

## Task 4: Spring Repo + Mapper + Adapter

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenPositionChangeRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenPositionChangeMapper.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenPositionChangeRepositoryAdapter.java`

- [ ] **Step 1: Spring repo**

Create `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenPositionChangeRepository.java`:
```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenPositionChangeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringSpielbogenPositionChangeRepository extends JpaRepository<SpielbogenPositionChangeEntity, Long> {
    List<SpielbogenPositionChangeEntity> findByBogen_IdOrderByInningAscIdAsc(Long bogenId);
    long deleteByGroupId(String groupId);
}
```

- [ ] **Step 2: Mapper**

Create `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenPositionChangeMapper.java`:
```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenPositionChangeEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenPositionChange;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenPositionChangeMapper {

    private final SpielbogenMapper bogenMapper;
    private final SpielbogenSlotMapper slotMapper;

    public SpielbogenPositionChangeMapper(final SpielbogenMapper bogenMapper, final SpielbogenSlotMapper slotMapper) {
        this.bogenMapper = bogenMapper;
        this.slotMapper = slotMapper;
    }

    public SpielbogenPositionChange toDomain(final SpielbogenPositionChangeEntity e) {
        if (e == null) return null;
        SpielbogenPositionChange c = new SpielbogenPositionChange();
        c.setId(e.getId());
        c.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        c.setSlot(e.getSlot() != null ? slotMapper.toDomain(e.getSlot()) : null);
        c.setSide(BogenSide.valueOf(e.getSide()));
        c.setInning(e.getInning());
        c.setGroupId(e.getGroupId());
        c.setOldPosition(e.getOldPosition());
        c.setNewPosition(e.getNewPosition());
        c.setCreatedAt(e.getCreatedAt());
        return c;
    }

    public SpielbogenPositionChangeEntity toEntity(final SpielbogenPositionChange c, final SpielbogenEntity bogenEntity, final SpielbogenSlotEntity slotEntity) {
        SpielbogenPositionChangeEntity e = new SpielbogenPositionChangeEntity();
        e.setId(c.getId());
        e.setBogen(bogenEntity);
        e.setSlot(slotEntity);
        e.setSide(c.getSide().name());
        e.setInning(c.getInning());
        e.setGroupId(c.getGroupId());
        e.setOldPosition(c.getOldPosition());
        e.setNewPosition(c.getNewPosition());
        return e;
    }
}
```

- [ ] **Step 3: Adapter (Spring bean implementing port)**

Create `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenPositionChangeRepositoryAdapter.java`:
```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenPositionChangeEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenPositionChangeMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenPositionChangeRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.domain.model.SpielbogenPositionChange;
import com.softball.domain.port.out.SpielbogenPositionChangeRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenPositionChangeRepositoryAdapter implements SpielbogenPositionChangeRepository {

    private final SpringSpielbogenPositionChangeRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpringSpielbogenSlotRepository slotRepo;
    private final SpielbogenPositionChangeMapper mapper;

    public SpielbogenPositionChangeRepositoryAdapter(final SpringSpielbogenPositionChangeRepository repo,
                                                     final SpringSpielbogenRepository bogenRepo,
                                                     final SpringSpielbogenSlotRepository slotRepo,
                                                     final SpielbogenPositionChangeMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenPositionChange> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderByInningAscIdAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SpielbogenPositionChange> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public SpielbogenPositionChange save(final SpielbogenPositionChange change) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(change.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", change.getBogen().getId()));
        SpielbogenSlotEntity slotEntity = slotRepo.findById(change.getSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", change.getSlot().getId()));
        SpielbogenPositionChangeEntity entity = mapper.toEntity(change, bogenEntity, slotEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    @Transactional
    public void deleteByGroupId(final String groupId) {
        repo.deleteByGroupId(groupId);
    }
}
```

- [ ] **Step 4: Compile-check**

Run: `cd backend && ./mvnw compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenPositionChangeRepository.java backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenPositionChangeMapper.java backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenPositionChangeRepositoryAdapter.java
git commit -m "✨ Spielbogen: Persistence-Adapter für Position-Change"
```

---

## Task 5: Service Method `recordPositionSwap` — TDD basic 2-slot swap

**Files:**
- Modify: `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`
- Modify: `backend/src/test/java/com/softball/service/SpielbogenScoringServiceTest.java`

- [ ] **Step 1: Write failing test for basic 2-slot swap**

Add to `backend/src/test/java/com/softball/service/SpielbogenScoringServiceTest.java` (inside the existing test class, near other `recordSubstitution` tests):
```java
@Test
void recordPositionSwap_basicTwoSlotSwap_updatesBothSlots() {
    Spielbogen bogen = liveBogen(1L);
    SpielbogenSlot slotP = slotFor(bogen, 100L, BogenSide.HOME, "P");
    SpielbogenSlot slotC = slotFor(bogen, 101L, BogenSide.HOME, "C");
    when(bogenRepo.findById(1L)).thenReturn(Optional.of(bogen));
    when(slotRepo.findById(100L)).thenReturn(Optional.of(slotP));
    when(slotRepo.findById(101L)).thenReturn(Optional.of(slotC));
    when(slotRepo.findByBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(List.of(slotP, slotC));
    when(slotRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(positionChangeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

    var entries = List.of(
        new SpielbogenScoringService.SwapEntry(100L, "C"),
        new SpielbogenScoringService.SwapEntry(101L, "P")
    );
    var result = service.recordPositionSwap(1L, BogenSide.HOME, 3, entries);

    assertEquals(2, result.size());
    assertEquals("C", slotP.getPosition());
    assertEquals("P", slotC.getPosition());
    assertEquals(result.get(0).getGroupId(), result.get(1).getGroupId());
    assertEquals("P", result.get(0).getOldPosition());
    assertEquals("C", result.get(0).getNewPosition());
}
```

If `slotFor`, `liveBogen`, or `positionChangeRepo` mock helpers don't exist in the test class, add them. Check existing test file structure first (look for `recordSubstitution` test as model) — extend `@BeforeEach` to create `positionChangeRepo = mock(SpielbogenPositionChangeRepository.class);` and pass it to the constructor.

- [ ] **Step 2: Run test (should fail)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest#recordPositionSwap_basicTwoSlotSwap_updatesBothSlots`
Expected: COMPILE FAIL (method `recordPositionSwap` doesn't exist; `SwapEntry` doesn't exist).

- [ ] **Step 3: Add `findByBogenIdAndSide` to slot port if missing**

Open `backend/src/main/java/com/softball/domain/port/out/SpielbogenSlotRepository.java`. If a method `List<SpielbogenSlot> findByBogenIdAndSide(Long bogenId, BogenSide side)` does not exist, add it:
```java
List<SpielbogenSlot> findByBogenIdAndSide(Long bogenId, BogenSide side);
```
Then implement it in `SpielbogenSlotRepositoryAdapter` (mirror existing methods).

If method already exists under a different name (e.g., `findByBogen_IdAndSide`), use that name in test + service code.

- [ ] **Step 4: Implement service method + nested record `SwapEntry` + inject port**

Modify `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`:

Add to imports:
```java
import com.softball.domain.port.out.SpielbogenPositionChangeRepository;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
```

Add field + constructor parameter:
```java
private final SpielbogenPositionChangeRepository positionChangeRepo;
```
Update constructor signature to accept `SpielbogenPositionChangeRepository positionChangeRepo` and assign.

Add nested record + method (place after `deleteSubstitution` at ~line 250):
```java
public record SwapEntry(Long slotId, String newPosition) {}

private static final Set<String> VALID_SWAP_POSITIONS = Set.of(
    "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "EH", "DH",
    "1", "2", "3", "4", "5", "6", "7", "8", "9"
);

@Transactional
public List<SpielbogenPositionChange> recordPositionSwap(final Long bogenId, final BogenSide side,
                                                         final Integer inning,
                                                         final List<SwapEntry> entries) {
    Spielbogen bogen = requireLive(bogenId);
    if (entries == null || entries.isEmpty()) {
        throw new BusinessValidationException("Mindestens 1 Position-Wechsel erforderlich");
    }
    if (inning == null || inning < 1) {
        throw new BusinessValidationException("inning muss >= 1 sein");
    }

    // Validate + load slots
    var loaded = new java.util.ArrayList<SpielbogenSlot>();
    var loadedNewPos = new java.util.ArrayList<String>();
    var seenSlotIds = new HashSet<Long>();
    for (SwapEntry entry : entries) {
        if (entry.slotId() == null) {
            throw new BusinessValidationException("slotId darf nicht null sein");
        }
        if (!seenSlotIds.add(entry.slotId())) {
            throw new BusinessValidationException("Slot " + entry.slotId() + " mehrfach im Swap");
        }
        String newPos = entry.newPosition();
        if (newPos != null && !newPos.isBlank() && !VALID_SWAP_POSITIONS.contains(newPos)) {
            throw new BusinessValidationException("Ungültige Position: " + newPos);
        }
        SpielbogenSlot slot = requireSlotForBogenAndSide(entry.slotId(), bogenId, side);
        loaded.add(slot);
        loadedNewPos.add(newPos == null || newPos.isBlank() ? null : newPos);
    }

    // Duplicate-field-position check across full side after applying changes
    var sideSlots = slotRepo.findByBogenIdAndSide(bogenId, side);
    var resultingPositions = new java.util.HashMap<Long, String>();
    for (SpielbogenSlot s : sideSlots) {
        resultingPositions.put(s.getId(), s.getPosition());
    }
    for (int i = 0; i < loaded.size(); i++) {
        resultingPositions.put(loaded.get(i).getId(), loadedNewPos.get(i));
    }
    var seenFieldPositions = new HashSet<String>();
    for (String pos : resultingPositions.values()) {
        if (pos == null || "EH".equals(pos)) continue;
        if (!seenFieldPositions.add(pos)) {
            throw new BusinessValidationException("Position " + pos + " ist doppelt belegt");
        }
    }

    // Apply changes + persist audit records
    String groupId = UUID.randomUUID().toString();
    var saved = new java.util.ArrayList<SpielbogenPositionChange>();
    for (int i = 0; i < loaded.size(); i++) {
        SpielbogenSlot slot = loaded.get(i);
        String oldPos = slot.getPosition();
        String newPos = loadedNewPos.get(i);
        if (java.util.Objects.equals(oldPos, newPos)) continue; // no-op skip

        SpielbogenPositionChange change = new SpielbogenPositionChange();
        change.setBogen(bogen);
        change.setSlot(slot);
        change.setSide(side);
        change.setInning(inning);
        change.setGroupId(groupId);
        change.setOldPosition(oldPos);
        change.setNewPosition(newPos);

        slot.setPosition(newPos);
        slotRepo.save(slot);
        saved.add(positionChangeRepo.save(change));
    }
    log.info("Spielbogen {} PositionSwap: side={} inning={} groupId={} changes={}",
             bogenId, side, inning, groupId, saved.size());
    return saved;
}
```

- [ ] **Step 5: Run test (should pass)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest#recordPositionSwap_basicTwoSlotSwap_updatesBothSlots`
Expected: PASS.

- [ ] **Step 6: Run all scoring tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest`
Expected: all green (existing tests still pass with new constructor param — fix `@BeforeEach` mock setup to inject the new repo as needed).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/softball/application/SpielbogenScoringService.java backend/src/main/java/com/softball/domain/port/out/SpielbogenSlotRepository.java backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenSlotRepositoryAdapter.java backend/src/test/java/com/softball/service/SpielbogenScoringServiceTest.java
git commit -m "✨ Spielbogen: recordPositionSwap-Service mit Basic-Swap-Test"
```

---

## Task 6: Service tests — Ring-Swap, Validation Errors

**Files:**
- Modify: `backend/src/test/java/com/softball/service/SpielbogenScoringServiceTest.java`

- [ ] **Step 1: Add ring-swap test**

```java
@Test
void recordPositionSwap_ringSwap_threeSlots() {
    Spielbogen bogen = liveBogen(1L);
    SpielbogenSlot p = slotFor(bogen, 100L, BogenSide.HOME, "P");
    SpielbogenSlot c = slotFor(bogen, 101L, BogenSide.HOME, "C");
    SpielbogenSlot ss = slotFor(bogen, 102L, BogenSide.HOME, "SS");
    when(bogenRepo.findById(1L)).thenReturn(Optional.of(bogen));
    when(slotRepo.findById(100L)).thenReturn(Optional.of(p));
    when(slotRepo.findById(101L)).thenReturn(Optional.of(c));
    when(slotRepo.findById(102L)).thenReturn(Optional.of(ss));
    when(slotRepo.findByBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(List.of(p, c, ss));
    when(slotRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(positionChangeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

    var entries = List.of(
        new SpielbogenScoringService.SwapEntry(100L, "C"),
        new SpielbogenScoringService.SwapEntry(101L, "SS"),
        new SpielbogenScoringService.SwapEntry(102L, "P")
    );
    var result = service.recordPositionSwap(1L, BogenSide.HOME, 5, entries);

    assertEquals(3, result.size());
    assertEquals("C", p.getPosition());
    assertEquals("SS", c.getPosition());
    assertEquals("P", ss.getPosition());
    String gid = result.get(0).getGroupId();
    assertEquals(gid, result.get(1).getGroupId());
    assertEquals(gid, result.get(2).getGroupId());
}
```

- [ ] **Step 2: Add duplicate-position validation test**

```java
@Test
void recordPositionSwap_duplicatePosition_throws() {
    Spielbogen bogen = liveBogen(1L);
    SpielbogenSlot p = slotFor(bogen, 100L, BogenSide.HOME, "P");
    SpielbogenSlot c = slotFor(bogen, 101L, BogenSide.HOME, "C");
    when(bogenRepo.findById(1L)).thenReturn(Optional.of(bogen));
    when(slotRepo.findById(100L)).thenReturn(Optional.of(p));
    when(slotRepo.findById(101L)).thenReturn(Optional.of(c));
    when(slotRepo.findByBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(List.of(p, c));

    var entries = List.of(
        new SpielbogenScoringService.SwapEntry(100L, "C"),
        new SpielbogenScoringService.SwapEntry(101L, "C")
    );
    assertThrows(BusinessValidationException.class,
        () -> service.recordPositionSwap(1L, BogenSide.HOME, 3, entries));
}
```

- [ ] **Step 3: Add invalid-position validation test**

```java
@Test
void recordPositionSwap_invalidPosition_throws() {
    Spielbogen bogen = liveBogen(1L);
    when(bogenRepo.findById(1L)).thenReturn(Optional.of(bogen));

    var entries = List.of(new SpielbogenScoringService.SwapEntry(100L, "XYZ"));
    assertThrows(BusinessValidationException.class,
        () -> service.recordPositionSwap(1L, BogenSide.HOME, 3, entries));
}
```

- [ ] **Step 4: Add empty-entries validation test**

```java
@Test
void recordPositionSwap_emptyEntries_throws() {
    Spielbogen bogen = liveBogen(1L);
    when(bogenRepo.findById(1L)).thenReturn(Optional.of(bogen));

    assertThrows(BusinessValidationException.class,
        () -> service.recordPositionSwap(1L, BogenSide.HOME, 3, List.of()));
}
```

- [ ] **Step 5: Run all new tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest`
Expected: all green including 4 new test methods.

- [ ] **Step 6: Commit**

```bash
git add backend/src/test/java/com/softball/service/SpielbogenScoringServiceTest.java
git commit -m "✅ Spielbogen: Tests für Ring-Swap + Validation-Errors"
```

---

## Task 7: DTOs + Controller Endpoint

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/SpielbogenPositionChangeResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/SpielbogenRecordPositionSwapRequest.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java`

- [ ] **Step 1: Response DTO**

Create `backend/src/main/java/com/softball/adapter/dto/SpielbogenPositionChangeResponse.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenPositionChange;

import java.time.Instant;

public record SpielbogenPositionChangeResponse(
    Long id,
    Long bogenId,
    Long slotId,
    BogenSide side,
    Integer inning,
    String groupId,
    String oldPosition,
    String newPosition,
    Instant createdAt
) {
    public static SpielbogenPositionChangeResponse from(final SpielbogenPositionChange c) {
        return new SpielbogenPositionChangeResponse(
            c.getId(),
            c.getBogen() != null ? c.getBogen().getId() : null,
            c.getSlot() != null ? c.getSlot().getId() : null,
            c.getSide(),
            c.getInning(),
            c.getGroupId(),
            c.getOldPosition(),
            c.getNewPosition(),
            c.getCreatedAt()
        );
    }
}
```

- [ ] **Step 2: Request DTO**

Create `backend/src/main/java/com/softball/adapter/dto/SpielbogenRecordPositionSwapRequest.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SpielbogenRecordPositionSwapRequest(
    @NotNull BogenSide side,
    @NotNull @Min(1) Integer inning,
    @NotEmpty List<SwapEntry> changes
) {
    public record SwapEntry(@NotNull Long slotId, String newPosition) {}
}
```

- [ ] **Step 3: Controller endpoint**

Modify `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java` — add new endpoint after `deleteSubstitution` (~line 212):
```java
@PostMapping("/{id}/position-swaps")
@ResponseStatus(HttpStatus.CREATED)
public List<SpielbogenPositionChangeResponse> recordPositionSwap(@PathVariable Long id,
                                                                 @Valid @RequestBody SpielbogenRecordPositionSwapRequest req) {
    var entries = req.changes().stream()
        .map(c -> new SpielbogenScoringService.SwapEntry(c.slotId(), c.newPosition()))
        .toList();
    return scoringService.recordPositionSwap(id, req.side(), req.inning(), entries).stream()
        .map(SpielbogenPositionChangeResponse::from)
        .toList();
}
```

Also add to imports:
```java
import com.softball.adapter.dto.SpielbogenPositionChangeResponse;
import com.softball.adapter.dto.SpielbogenRecordPositionSwapRequest;
```

- [ ] **Step 4: Compile + run tests**

Run: `cd backend && ./mvnw compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/SpielbogenPositionChangeResponse.java backend/src/main/java/com/softball/adapter/dto/SpielbogenRecordPositionSwapRequest.java backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java
git commit -m "✨ Spielbogen: REST-Endpoint POST /position-swaps + DTOs"
```

---

## Task 8: Integration Test (Full POST Flow)

**Files:**
- Create: `backend/src/test/java/com/softball/integration/PositionSwapIntegrationTest.java`

- [ ] **Step 1: Write integration test**

Look at `backend/src/test/java/com/softball/integration/SubstitutionIntegrationTest.java` for the test setup pattern (Testcontainers Postgres, MockMvc, helpers to create Bogen+Slots). Create `backend/src/test/java/com/softball/integration/PositionSwapIntegrationTest.java` mirroring its structure:

```java
package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.dto.SpielbogenRecordPositionSwapRequest;
import com.softball.adapter.dto.SpielbogenRecordPositionSwapRequest.SwapEntry;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenPositionChangeRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "admin", roles = "ADMIN")
class PositionSwapIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private SpringSpielbogenRepository bogenRepo;
    @Autowired private SpringSpielbogenSlotRepository slotRepo;
    @Autowired private SpringSpielbogenPositionChangeRepository changeRepo;

    @Test
    void postPositionSwap_persistsChangesAndUpdatesSlots() throws Exception {
        SpielbogenEntity bogen = new SpielbogenEntity();
        bogen.setDate(LocalDate.now());
        bogen.setHomeTeamName("Home");
        bogen.setAwayTeamName("Away");
        bogen.setStatus(BogenStatus.LIVE);
        bogen = bogenRepo.save(bogen);

        SpielbogenSlotEntity p = newSlot(bogen, "Hanne", "P", 1, 1);
        SpielbogenSlotEntity c = newSlot(bogen, "Gregor", "C", 2, 2);
        p = slotRepo.save(p);
        c = slotRepo.save(c);

        var req = new SpielbogenRecordPositionSwapRequest(
            BogenSide.HOME, 3,
            List.of(new SwapEntry(p.getId(), "C"), new SwapEntry(c.getId(), "P"))
        );

        mvc.perform(post("/api/spielbogen/" + bogen.getId() + "/position-swaps")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.length()").value(2));

        var changes = changeRepo.findByBogen_IdOrderByInningAscIdAsc(bogen.getId());
        assertEquals(2, changes.size());
        assertEquals(changes.get(0).getGroupId(), changes.get(1).getGroupId());
        assertEquals("C", slotRepo.findById(p.getId()).orElseThrow().getPosition());
        assertEquals("P", slotRepo.findById(c.getId()).orElseThrow().getPosition());
    }

    private SpielbogenSlotEntity newSlot(SpielbogenEntity bogen, String name, String pos, int slot, int order) {
        SpielbogenSlotEntity s = new SpielbogenSlotEntity();
        s.setBogen(bogen);
        s.setSide("HOME");
        s.setSlot(slot);
        s.setName(name);
        s.setPosition(pos);
        s.setBattingOrder(order);
        return s;
    }
}
```

If `SpielbogenSlotEntity` setter signatures differ, adjust to match — open the entity and use real fields.

- [ ] **Step 2: Run integration test**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PositionSwapIntegrationTest`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/softball/integration/PositionSwapIntegrationTest.java
git commit -m "✅ Spielbogen: Integration-Test für Position-Swap-Endpoint"
```

---

## Task 9: Embed positionChanges in BogenSheetResponse

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/BogenSheetResponse.java`
- Modify: `backend/src/main/java/com/softball/application/SpielbogenSheetService.java`
- Modify: `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java`

- [ ] **Step 1: Add `findPositionChanges` method to scoring service**

In `SpielbogenScoringService.java`, add:
```java
@Transactional(readOnly = true)
public List<SpielbogenPositionChange> findPositionChanges(final Long bogenId) {
    return positionChangeRepo.findByBogenId(bogenId);
}
```

- [ ] **Step 2: Extend SheetData record + getSheet**

In `SpielbogenSheetService.java`, update the record + assembly:
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
    Map<Integer, BogenScoreCalculator.InningRuns> inningRuns
) {}
```

In `getSheet`, append `scoringService.findPositionChanges(bogenId)` before `scoreCalc.calculateInningRuns(...)`.

- [ ] **Step 3: Extend BogenSheetResponse + Controller mapping**

In `BogenSheetResponse.java`:
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
    Map<Integer, InningRuns> inningRuns
) {
    public record InningRuns(int home, int away) {}
}
```

In `SpielbogenController.getSheet()`, add the new field in constructor call (between `substitutions` and `inningRuns`):
```java
data.positionChanges().stream().map(SpielbogenPositionChangeResponse::from).toList(),
```

Add import:
```java
import com.softball.domain.model.SpielbogenPositionChange;
```

- [ ] **Step 4: Run all backend tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: all green. Existing sheet-loading tests may need their constructor expectations updated — fix as needed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/BogenSheetResponse.java backend/src/main/java/com/softball/application/SpielbogenSheetService.java backend/src/main/java/com/softball/application/SpielbogenScoringService.java backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java
git commit -m "✨ Spielbogen: positionChanges in BogenSheetResponse einbetten"
```

---

## Task 10: Frontend Types + API Client + Hook

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/hooks/useSpielbogenScoring.ts`

- [ ] **Step 1: Add types**

In `frontend/src/types/index.ts`, add (place near `SpielbogenSubstitutionResponse`):
```ts
export interface SpielbogenPositionChangeResponse {
  id: number
  bogenId: number
  slotId: number
  side: BogenSide
  inning: number
  groupId: string
  oldPosition: string | null
  newPosition: string | null
  createdAt: string
}

export interface SpielbogenRecordPositionSwapRequest {
  side: BogenSide
  inning: number
  changes: PositionSwapEntry[]
}

export interface PositionSwapEntry {
  slotId: number
  newPosition: string | null
}
```

In `BogenSheetResponse`:
```ts
export interface BogenSheetResponse {
  meta: SpielbogenResponse
  homeLineup: SpielbogenSlotResponse[]
  awayLineup: SpielbogenSlotResponse[]
  homeAtBats: SpielbogenAtBatResponse[]
  awayAtBats: SpielbogenAtBatResponse[]
  stealingEvents: SpielbogenStealingResponse[]
  substitutions: SpielbogenSubstitutionResponse[]
  positionChanges: SpielbogenPositionChangeResponse[]
  inningRuns: Record<number, { home: number; away: number }>
}
```

- [ ] **Step 2: Add API client function**

In `frontend/src/api/client.ts`, add (near `recordSpielbogenSubstitution`):
```ts
export function recordSpielbogenPositionSwap(bogenId: number, req: SpielbogenRecordPositionSwapRequest): Promise<SpielbogenPositionChangeResponse[]> {
  return request<SpielbogenPositionChangeResponse[]>(`/spielbogen/${bogenId}/position-swaps`, {
    method: 'POST',
    body: JSON.stringify(req),
  })
}
```

Add imports for the new types at the top of `client.ts` if not already imported.

- [ ] **Step 3: Add hook function**

In `frontend/src/hooks/useSpielbogenScoring.ts`, add (mirror `recordSubstitution`):
```ts
const recordPositionSwap = useCallback(async (req: SpielbogenRecordPositionSwapRequest) => {
  await api.recordSpielbogenPositionSwap(bogenId, req)
  await reload()
}, [bogenId, reload])
```
Return it from the hook's return object.

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run build`
Expected: TypeScript clean, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts frontend/src/hooks/useSpielbogenScoring.ts
git commit -m "✨ Spielbogen: Frontend-Types + API-Client für Position-Swap"
```

---

## Task 11: PositionSwapDrawer Component

**Files:**
- Create: `frontend/src/components/spielbogen/PositionSwapDrawer.tsx`

- [ ] **Step 1: Implement drawer**

Create `frontend/src/components/spielbogen/PositionSwapDrawer.tsx`:
```tsx
import React, { useState, useMemo } from 'react'
import { Drawer } from 'vaul'
import type { BogenSide, SpielbogenSlotResponse, PositionSwapEntry } from '@/types'

const POSITION_OPTIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DH']

interface Props {
  open: boolean
  onClose: () => void
  side: BogenSide
  slots: SpielbogenSlotResponse[]
  currentInning: number
  onSubmit: (req: { inning: number; changes: PositionSwapEntry[] }) => Promise<void>
}

export function PositionSwapDrawer({ open, onClose, side, slots, currentInning, onSubmit }: Props) {
  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => a.battingOrder - b.battingOrder),
    [slots],
  )
  const [draft, setDraft] = useState<Record<number, string | null>>(() =>
    Object.fromEntries(sortedSlots.map(s => [s.id, s.position ?? null])),
  )
  const [inning, setInning] = useState<number>(currentInning)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changes: PositionSwapEntry[] = sortedSlots
    .filter(s => (draft[s.id] ?? null) !== (s.position ?? null))
    .map(s => ({ slotId: s.id, newPosition: draft[s.id] }))

  // Duplicate-position check (excludes EH and null)
  const duplicate = (() => {
    const seen = new Set<string>()
    for (const s of sortedSlots) {
      const pos = draft[s.id]
      if (!pos || pos === 'EH') continue
      if (seen.has(pos)) return pos
      seen.add(pos)
    }
    return null
  })()

  const canSubmit = changes.length > 0 && !duplicate && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ inning, changes })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl flex flex-col focus:outline-none"
          style={{ maxHeight: '90vh' }}
        >
          <Drawer.Title className="sr-only">Positionen tauschen</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />

          <div className="px-4 py-3 border-b border-cream-200 shrink-0 flex items-center justify-between">
            <h2 className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide">
              Positionen tauschen — {side === 'HOME' ? 'Heim' : 'Gast'}
            </h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Schließen">
              ✕
            </button>
          </div>

          <div className="px-4 py-2 shrink-0">
            <label className="font-body text-xs text-gray-700">
              Inning:&nbsp;
              <input
                type="number"
                min={1}
                value={inning}
                onChange={(e) => setInning(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-14 px-1 py-0.5 border border-gray-300 rounded font-display text-sm"
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-cream-50">
                <tr className="border-b border-cream-300">
                  <th className="text-left py-1 font-display font-bold text-navy-900">#</th>
                  <th className="text-left py-1 font-display font-bold text-navy-900">Name</th>
                  <th className="text-left py-1 font-display font-bold text-navy-900">Aktuell</th>
                  <th className="text-left py-1 font-display font-bold text-navy-900">Neu</th>
                </tr>
              </thead>
              <tbody>
                {sortedSlots.map(slot => {
                  const newPos = draft[slot.id] ?? null
                  const changed = newPos !== (slot.position ?? null)
                  return (
                    <tr key={slot.id} className={changed ? 'bg-amber-50' : ''}>
                      <td className="py-1 font-display font-bold text-navy-700">{slot.battingOrder}</td>
                      <td className="py-1 font-body text-navy-900">{slot.name}</td>
                      <td className="py-1 font-display text-navy-500 uppercase">{slot.position ?? '—'}</td>
                      <td className="py-1">
                        <select
                          value={newPos ?? ''}
                          onChange={(e) => setDraft(d => ({ ...d, [slot.id]: e.target.value || null }))}
                          className="px-1 py-0.5 border border-gray-300 rounded font-display text-sm"
                        >
                          <option value="">— (keine)</option>
                          {POSITION_OPTIONS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {duplicate && (
            <div className="px-4 py-2 text-softball-red-700 font-body text-sm">
              Position {duplicate} ist doppelt belegt.
            </div>
          )}
          {error && (
            <div className="px-4 py-2 text-softball-red-700 font-body text-sm">{error}</div>
          )}

          <div className="px-4 py-3 border-t border-cream-200 shrink-0 flex gap-2"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={onClose}
              className="flex-1 py-2.5 font-display text-xs font-bold tracking-widest uppercase rounded-xl border border-navy-700 text-navy-700 hover:bg-navy-50 cursor-pointer transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-2.5 font-display text-xs font-bold tracking-widest uppercase rounded-xl bg-navy-800 text-white hover:bg-navy-900 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Speichere…' : `Tauschen (${changes.length})`}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run build`
Expected: TypeScript clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/spielbogen/PositionSwapDrawer.tsx
git commit -m "✨ Spielbogen: PositionSwapDrawer-Komponente"
```

---

## Task 12: Page Integration + MEHR-Menu Entry

**Files:**
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx`
- Modify: `frontend/src/components/spielbogen/BogenActionButtons.tsx`

- [ ] **Step 1: Add MEHR-Menu entry**

In `BogenActionButtons.tsx`:
- Add prop `onPositionSwap: () => void` to the `Props` type.
- In the MEHR-menu rendering (search for `onSubstitution`), add a new menu item below the Substitution entry:
```tsx
<button
  onClick={() => { setMehrOpen(false); onPositionSwap() }}
  className="..." // copy classes from existing Substitution entry
>
  Positionen tauschen
</button>
```
Match existing button styling exactly.

- [ ] **Step 2: Wire in SpielbogenPage**

In `SpielbogenPage.tsx`:

1. Import the drawer:
```tsx
import { PositionSwapDrawer } from './PositionSwapDrawer'
```

2. Import hook function — destructure `recordPositionSwap` from `useSpielbogenScoring()`.

3. Add state:
```tsx
const [showPositionSwapDrawer, setShowPositionSwapDrawer] = useState(false)
```

4. Pass prop to BogenActionButtons:
```tsx
<BogenActionButtons
  ...
  onPositionSwap={() => setShowPositionSwapDrawer(true)}
/>
```

5. Mount drawer (find where `SubstitutionDrawer` is mounted; place adjacent):
```tsx
{sheet && (
  <PositionSwapDrawer
    open={showPositionSwapDrawer}
    onClose={() => setShowPositionSwapDrawer(false)}
    side={sheet.meta.currentSide}
    slots={sheet.meta.currentSide === 'HOME' ? sheet.homeLineup : sheet.awayLineup}
    currentInning={sheet.meta.currentInning}
    onSubmit={async ({ inning, changes }) => {
      await recordPositionSwap({ side: sheet.meta.currentSide, inning, changes })
      toast.show('Positionen getauscht', 'success')
    }}
  />
)}
```

- [ ] **Step 3: Typecheck + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: clean (warnings allowed).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/spielbogen/SpielbogenPage.tsx frontend/src/components/spielbogen/BogenActionButtons.tsx
git commit -m "✨ Spielbogen: PositionSwapDrawer in Page + MEHR-Menu integriert"
```

---

## Task 13: Renderer Helper — `positionToNumber` + `computePositionHistoryPerSlot`

**Files:**
- Modify: `frontend/src/utils/bogenSheetRenderer.ts`

- [ ] **Step 1: Add helpers**

Append to `bogenSheetRenderer.ts`:
```ts
// Position-Abkürzung (P, C, 1B, ...) → RFL-Nummer (1-9). Null bei unbekannt.
const POSITION_NUMBER_MAP: Record<string, string> = {
  P: '1', C: '2', '1B': '3', '2B': '4', '3B': '5',
  SS: '6', LF: '7', CF: '8', RF: '9',
}

export function positionToNumber(pos: string | null | undefined): string | null {
  if (!pos) return null
  if (POSITION_NUMBER_MAP[pos]) return POSITION_NUMBER_MAP[pos]
  if (/^[1-9]$/.test(pos)) return pos
  return null // EH, DH bleiben Abkürzung
}

export function positionDisplay(pos: string | null | undefined): string {
  if (!pos) return '—'
  const num = positionToNumber(pos)
  return num ?? pos
}

// Pro Slot: chronologische Liste der Positionen [original, change1, change2, ...].
// Original = aktuelle slot.position, falls keine Changes existieren.
// Mit Changes: erste oldPosition als Original, dann alle newPositions in inning-Reihenfolge.
export function computePositionHistoryPerSlot(
  slots: { id: number; position: string | null }[],
  changes: { slotId: number; inning: number; oldPosition: string | null; newPosition: string | null; createdAt: string }[],
): Map<number, string[]> {
  const result = new Map<number, string[]>()
  const sortedChanges = [...changes].sort((a, b) =>
    a.inning !== b.inning ? a.inning - b.inning : a.createdAt.localeCompare(b.createdAt),
  )
  const grouped = new Map<number, typeof sortedChanges>()
  for (const c of sortedChanges) {
    const arr = grouped.get(c.slotId) ?? []
    arr.push(c)
    grouped.set(c.slotId, arr)
  }
  for (const slot of slots) {
    const slotChanges = grouped.get(slot.id) ?? []
    if (slotChanges.length === 0) {
      result.set(slot.id, [slot.position ?? ''].filter(Boolean))
      continue
    }
    const list: string[] = []
    list.push(slotChanges[0].oldPosition ?? '')
    for (const c of slotChanges) list.push(c.newPosition ?? '')
    result.set(slot.id, list.filter(s => s !== ''))
  }
  return result
}
```

- [ ] **Step 2: Add unit test**

Create `frontend/src/utils/bogenSheetRenderer.position.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { positionToNumber, computePositionHistoryPerSlot } from './bogenSheetRenderer'

describe('positionToNumber', () => {
  it('maps abbreviations to RFL numbers', () => {
    expect(positionToNumber('P')).toBe('1')
    expect(positionToNumber('C')).toBe('2')
    expect(positionToNumber('SS')).toBe('6')
    expect(positionToNumber('RF')).toBe('9')
  })
  it('passes through numeric strings', () => {
    expect(positionToNumber('5')).toBe('5')
  })
  it('returns null for unknown positions like EH', () => {
    expect(positionToNumber('EH')).toBeNull()
    expect(positionToNumber(null)).toBeNull()
  })
})

describe('computePositionHistoryPerSlot', () => {
  it('returns single position when no changes', () => {
    const map = computePositionHistoryPerSlot(
      [{ id: 1, position: 'P' }],
      [],
    )
    expect(map.get(1)).toEqual(['P'])
  })
  it('returns chronological history when changes exist', () => {
    const map = computePositionHistoryPerSlot(
      [{ id: 1, position: 'C' }],
      [
        { slotId: 1, inning: 3, oldPosition: 'P', newPosition: 'C', createdAt: '2026-05-07T10:00:00Z' },
      ],
    )
    expect(map.get(1)).toEqual(['P', 'C'])
  })
  it('handles multiple changes in inning order', () => {
    const map = computePositionHistoryPerSlot(
      [{ id: 1, position: 'SS' }],
      [
        { slotId: 1, inning: 5, oldPosition: 'C', newPosition: 'SS', createdAt: '2026-05-07T11:00:00Z' },
        { slotId: 1, inning: 3, oldPosition: 'P', newPosition: 'C', createdAt: '2026-05-07T10:00:00Z' },
      ],
    )
    expect(map.get(1)).toEqual(['P', 'C', 'SS'])
  })
})
```

- [ ] **Step 3: Run test**

Run: `cd frontend && npx vitest run src/utils/bogenSheetRenderer.position.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/bogenSheetRenderer.ts frontend/src/utils/bogenSheetRenderer.position.test.ts
git commit -m "✨ Spielbogen: positionToNumber + computePositionHistoryPerSlot Helpers"
```

---

## Task 14: PDF Render Position-History (vertikal stacked numbers)

**Files:**
- Modify: `frontend/src/utils/spielbogenPdfExport.ts`

- [ ] **Step 1: Use helpers + render stacked positions in Pos-Cell**

In `spielbogenPdfExport.ts`:

Add import:
```ts
import { renderCells, cellKey, computePositionHistoryPerSlot, positionDisplay } from './bogenSheetRenderer'
```

Replace existing position rendering. Find the line in `drawSheet()`:
```ts
doc.text(slot.position ?? '—', x + colNum + colName + 2, yy + 4)
```

Replace with this block (compute once before the row loop, use within):

Before the row loop (after `cellMap`), compute history per side:
```ts
const sideKey = side === 'HOME' ? 'home' : 'away'
const sideChanges = sheet.positionChanges.filter(pc => pc.side === side)
const historyPerSlot = computePositionHistoryPerSlot(
  sorted.map(s => ({ id: s.id, position: s.position })),
  sideChanges,
)
```

Note: `drawSheet` does not currently receive the full `sheet` — it receives slices. Update `drawSheet` signature to accept `positionChanges: SpielbogenPositionChangeResponse[]` and pass it from `generateSpielbogenPdf`. Add import: `import type { SpielbogenPositionChangeResponse } from '@/types'`.

Inside the row loop, replace single position render with stacked:
```ts
if (slot) {
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(String(slot.battingOrder), x + 2, yy + 4)
  doc.text(slot.name.slice(0, 18), x + colNum + 2, yy + 4)

  // Position-History stacked: original oben (yy+4), changes auf Sub-Linien (yy+rowH*0.45+3, yy+rowH*0.75+3)
  const history = historyPerSlot.get(slot.id) ?? [slot.position ?? '']
  const yPositions = [yy + 4, yy + rowH * 0.45 + 3, yy + rowH * 0.75 + 3]
  for (let i = 0; i < Math.min(history.length, 3); i++) {
    doc.text(positionDisplay(history[i]), x + colNum + colName + 2, yPositions[i])
  }
}
```

In `generateSpielbogenPdf`, update `drawSheet` calls:
```ts
drawSheet(doc, 8, 42, 'AWAY', sheet.awayLineup, sheet.awayAtBats, sheet.stealingEvents, sheet.inningRuns, maxInning, sheet.positionChanges)
drawSheet(doc, 152, 42, 'HOME', sheet.homeLineup, sheet.homeAtBats, sheet.stealingEvents, sheet.inningRuns, maxInning, sheet.positionChanges)
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build`
Expected: TypeScript clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/spielbogenPdfExport.ts
git commit -m "✨ Spielbogen PDF: Position-History stacked als RFL-Nummern in Pos-Cell"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Backend full test**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: ALL TESTS PASS.

- [ ] **Step 2: Frontend build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build success; lint shows only pre-existing warnings (no new errors).

- [ ] **Step 3: Manual E2E**

Start backend + frontend locally:
```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
# in another terminal:
cd frontend && npx vite
```

Open `http://localhost:5173`, log in, create a fresh Spielbogen, set up a 9-player lineup including P, C, SS positions:

1. Open Spielbogen-LIVE-View.
2. Tap MEHR-Menu → "Positionen tauschen". Drawer opens with current side's lineup.
3. Set inning to 3. Change Pitcher's slot to "C". Change Catcher's slot to "P". Submit.
4. Toast "Positionen getauscht" appears. Drawer closes.
5. RFL-Sheet drawer → check Pos-Spalte: Pitcher-row shows "1" (top) and "2" (sub-line); Catcher-row shows "2" / "1".
6. Export PDF — Pos-Cells render numbers stacked vertically as in real RFL example.
7. 3-way ring-tausch test: open drawer again, change P→SS, SS→C, C→P at inning 5. Submit. Verify three changes propagate, all 3 records share groupId via DB query: `SELECT group_id, COUNT(*) FROM spielbogen_position_change GROUP BY group_id;`
8. Validation test: try setting two slots to same position → error message "Position X ist doppelt belegt".

- [ ] **Step 4: Final commit + push**

```bash
git push origin master
```

---

## Self-Review Notes

Spec coverage check:
- Migration V26 — Task 1 ✓
- Domain Model — Task 2 ✓
- Domain Port — Task 2 ✓
- JPA Entity — Task 3 ✓
- Mapper / Spring Repo / Adapter — Task 4 ✓
- Service Method `recordPositionSwap` — Task 5 ✓
- Service Tests — Tasks 5, 6 ✓
- Controller + DTOs — Task 7 ✓
- Integration Test — Task 8 ✓
- BogenSheetResponse Erweiterung — Task 9 ✓
- Frontend Types / API Client / Hook — Task 10 ✓
- PositionSwapDrawer — Task 11 ✓
- Page-Integration + MEHR-Menu — Task 12 ✓
- positionToNumber Helper — Task 13 ✓
- PDF-Render Position-History — Task 14 ✓
- E2E Verification — Task 15 ✓

All spec sections covered. Type names consistent (`SwapEntry` is request DTO inner record, `SpielbogenScoringService.SwapEntry` is service nested record — both used correctly).
