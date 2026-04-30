# Spielbogen Phase 2 Implementation Plan — Live-Scoring + RFL-Sheet-View

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add live-scoring functionality to Spielbogen (Phase 1 covered CRUD + Wizard). Phase 2 covers AtBat/Stealing/Substitution recording with explicit Out-Detail UX, Last-At-Bat-Preview, soft side-switch with confirmation, and the RFL-Sheet-Drawer rendering.

**Architecture:** New persistence tables for at_bat/stealing/substitution under spielbogen. New `SpielbogenScoringService` orchestrates recording. Two new domain services: `BogenSheetRenderer` (transform AtBats → cell notation) and `BogenScoreCalculator` (aggregate runs per inning). Frontend: new `SpielbogenPage` Scoring-Page with action buttons, mini-field out-detail drawer, last-at-bat preview, RFL-Sheet drawer with DiamondCell rendering.

**Tech Stack:** Same as Phase 1: Spring Boot 3.4.3 + Java 21, JPA/Hibernate, Flyway, JUnit 5 + Mockito + Testcontainers. React 19 + Vite + Tailwind v4, vaul drawer, motion library. Backend: `./mvnw -s .mvn/local-settings.xml`. Frontend: `npm run build` / `npm run lint`.

**Spec reference:** `docs/superpowers/specs/2026-04-30-spielbogen-design.md`
**Phase 1 plan reference:** `docs/superpowers/plans/2026-04-30-spielbogen-phase1.md` (for established patterns)

---

## File Structure

### Backend (new files)

**Domain:**
- `domain/model/SpielbogenAtBat.java`
- `domain/model/SpielbogenStealingEvent.java`
- `domain/model/SpielbogenSubstitution.java`
- `domain/model/AtBatResult.java` (enum)
- `domain/model/StealingEventType.java` (enum)
- `domain/model/BogenBaseState.java` (record-like, slot IDs on bases)
- `domain/port/out/SpielbogenAtBatRepository.java`
- `domain/port/out/SpielbogenStealingRepository.java`
- `domain/port/out/SpielbogenSubstitutionRepository.java`
- `domain/service/BogenSheetRenderer.java` (transforms at-bats + stealings + subs → cell notation per slot/inning)
- `domain/service/BogenScoreCalculator.java` (aggregate inning runs)

**Adapter persistence:**
- `adapter/out/persistence/entity/SpielbogenAtBatEntity.java`
- `adapter/out/persistence/entity/SpielbogenStealingEventEntity.java`
- `adapter/out/persistence/entity/SpielbogenSubstitutionEntity.java`
- `adapter/out/persistence/repository/SpringSpielbogenAtBatRepository.java`
- `adapter/out/persistence/repository/SpringSpielbogenStealingRepository.java`
- `adapter/out/persistence/repository/SpringSpielbogenSubstitutionRepository.java`
- `adapter/out/persistence/mapper/SpielbogenAtBatMapper.java`
- `adapter/out/persistence/mapper/SpielbogenStealingMapper.java`
- `adapter/out/persistence/mapper/SpielbogenSubstitutionMapper.java`
- `adapter/out/persistence/adapter/SpielbogenAtBatRepositoryAdapter.java`
- `adapter/out/persistence/adapter/SpielbogenStealingRepositoryAdapter.java`
- `adapter/out/persistence/adapter/SpielbogenSubstitutionRepositoryAdapter.java`

**Application services:**
- `application/SpielbogenScoringService.java` (records at-bats + stealings + subs, manages out-counts, side-switch trigger)
- `application/SpielbogenSheetService.java` (read-aggregate for Sheet endpoint)

**REST + DTOs:**
- `adapter/in/web/SpielbogenScoringController.java` (or extend SpielbogenController)
- `adapter/dto/RecordAtBatRequest.java`
- `adapter/dto/SpielbogenAtBatResponse.java`
- `adapter/dto/RecordStealingEventRequest.java`
- `adapter/dto/StealingEventResponse.java`
- `adapter/dto/RecordSubstitutionRequest.java`
- `adapter/dto/SubstitutionResponse.java`
- `adapter/dto/BogenBaseStateDto.java`
- `adapter/dto/BogenScoreboardDto.java`
- `adapter/dto/BogenSheetResponse.java`
- `adapter/dto/SwitchSideRequest.java`

**Migration:**
- `db/migration/V20__create_spielbogen_scoring_tables.sql`

**Tests:**
- `test/java/com/softball/domain/service/BogenSheetRendererTest.java`
- `test/java/com/softball/domain/service/BogenScoreCalculatorTest.java`
- `test/java/com/softball/application/SpielbogenScoringServiceTest.java`
- `test/java/com/softball/integration/SpielbogenScoringIntegrationTest.java`

### Frontend (new + modified files)

**New components under `frontend/src/components/spielbogen/`:**
- `SpielbogenPage.tsx` (route `/spielbogen/:id` — main scoring page)
- `BogenScoreboard.tsx` (header with score + inning + outs)
- `BogenActionButtons.tsx` (TREFFER/STRIKEOUT/AUS + WALK/HBP + STEAL/MORE)
- `OutDetailDrawer.tsx` (mini-field-SVG with explicit sub-buttons)
- `LastAtBatPreview.tsx` (inline preview with Klartext + Undo)
- `SideToggle.tsx` (HEIM/GAST pill + auto-switch logic)
- `BogenDiamondView.tsx` (live diamond with bases + runners)
- `RflSheetDrawer.tsx` (vaul drawer with full sheet)
- `DiamondCell.tsx` (single sheet cell rendering)
- `bogenSheetRenderer.ts` (frontend port of BogenSheetRenderer logic for cell notation)

**New hooks:**
- `frontend/src/hooks/useSpielbogenScoring.ts`

**New utils:**
- `frontend/src/utils/bogenSheetRenderer.ts` (TS port of domain-level cell-notation logic)

**Modified files:**
- `frontend/src/types/index.ts` (add scoring types)
- `frontend/src/api/client.ts` (add scoring endpoints)
- `frontend/src/App.tsx` (add `/spielbogen/:id` route)

---

## Backend Tasks

### Task 1: Migration V20 — Scoring Tables

**Files:**
- Create: `backend/src/main/resources/db/migration/V20__create_spielbogen_scoring_tables.sql`

- [ ] **Step 1: Create migration**

```sql
CREATE TABLE spielbogen_at_bat (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    sequence INTEGER NOT NULL,
    inning INTEGER NOT NULL,
    result VARCHAR(20) NOT NULL,
    out_type VARCHAR(20),
    fielder_chain INTEGER[],
    is_error BOOLEAN NOT NULL DEFAULT FALSE,
    error_position INTEGER,
    runs_scored INTEGER NOT NULL DEFAULT 0,
    rbi INTEGER NOT NULL DEFAULT 0,
    base_state_first BIGINT REFERENCES spielbogen_slot(id) ON DELETE SET NULL,
    base_state_second BIGINT REFERENCES spielbogen_slot(id) ON DELETE SET NULL,
    base_state_third BIGINT REFERENCES spielbogen_slot(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    CONSTRAINT spielbogen_atbat_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_atbat_result_check CHECK (
        result IN ('SINGLE','DOUBLE','TRIPLE','HOMERUN','WALK','HIT_BY_PITCH','STRIKEOUT','OUT')
    ),
    CONSTRAINT spielbogen_atbat_outtype_when_out CHECK (
        (result = 'OUT' AND (out_type IS NULL OR out_type IN
            ('GROUNDER','FLY','FOUL','UNASSISTED','DOUBLE_PLAY','TRIPLE_PLAY','FORCE_OUT','TAG_OUT')))
        OR (result != 'OUT' AND out_type IS NULL)
    ),
    CONSTRAINT spielbogen_atbat_error_pos_range CHECK (
        error_position IS NULL OR error_position BETWEEN 1 AND 9
    ),
    CONSTRAINT spielbogen_atbat_runs_nonneg CHECK (runs_scored >= 0 AND rbi >= 0),
    UNIQUE (bogen_id, side, sequence)
);

CREATE INDEX idx_spielbogen_atbat_bogen_side ON spielbogen_at_bat(bogen_id, side);
CREATE INDEX idx_spielbogen_atbat_slot ON spielbogen_at_bat(slot_id);
CREATE INDEX idx_spielbogen_atbat_inning ON spielbogen_at_bat(bogen_id, side, inning);

CREATE TABLE spielbogen_stealing_event (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    from_base INTEGER NOT NULL,
    to_base INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT spielbogen_stealing_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_stealing_type_check CHECK (
        type IN ('STOLEN_BASE','CAUGHT_STEALING','OUT_ON_PLAY')
    ),
    CONSTRAINT spielbogen_stealing_base_range CHECK (
        from_base BETWEEN 1 AND 3 AND to_base BETWEEN 2 AND 4
    )
);

CREATE INDEX idx_spielbogen_stealing_bogen_side ON spielbogen_stealing_event(bogen_id, side);

CREATE TABLE spielbogen_substitution (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    player_out_name VARCHAR(100) NOT NULL,
    player_in_name VARCHAR(100) NOT NULL,
    is_pinch_hitter BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT spielbogen_sub_side_check CHECK (side IN ('HOME', 'AWAY'))
);

CREATE INDEX idx_spielbogen_sub_bogen_side ON spielbogen_substitution(bogen_id, side);
```

- [ ] **Step 2: Verify Flyway applies migration**

```bash
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
```
Wait for log "Successfully applied 1 migration" then Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V20__create_spielbogen_scoring_tables.sql
git commit -m "🗄️ Migration V20 — spielbogen_at_bat + stealing + substitution"
```

---

### Task 2: Domain Enums (AtBatResult, StealingEventType)

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/AtBatResult.java`
- Create: `backend/src/main/java/com/softball/domain/model/StealingEventType.java`

- [ ] **Step 1: AtBatResult**
```java
package com.softball.domain.model;

public enum AtBatResult {
    SINGLE, DOUBLE, TRIPLE, HOMERUN,
    WALK, HIT_BY_PITCH,
    STRIKEOUT, OUT
}
```

- [ ] **Step 2: StealingEventType**
```java
package com.softball.domain.model;

public enum StealingEventType {
    STOLEN_BASE, CAUGHT_STEALING, OUT_ON_PLAY
}
```

- [ ] **Step 3: Build + commit**
```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
git add backend/src/main/java/com/softball/domain/model/AtBatResult.java \
        backend/src/main/java/com/softball/domain/model/StealingEventType.java
git commit -m "🎯 Spielbogen Scoring-Enums (AtBatResult, StealingEventType)"
```

---

### Task 3: BogenBaseState Domain Model

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/BogenBaseState.java`

- [ ] **Step 1: Create**

```java
package com.softball.domain.model;

public class BogenBaseState {
    private Long firstSlotId;
    private Long secondSlotId;
    private Long thirdSlotId;

    public BogenBaseState() {}

    public BogenBaseState(final Long firstSlotId, final Long secondSlotId, final Long thirdSlotId) {
        this.firstSlotId = firstSlotId;
        this.secondSlotId = secondSlotId;
        this.thirdSlotId = thirdSlotId;
    }

    public Long getFirstSlotId() { return firstSlotId; }
    public void setFirstSlotId(final Long firstSlotId) { this.firstSlotId = firstSlotId; }
    public Long getSecondSlotId() { return secondSlotId; }
    public void setSecondSlotId(final Long secondSlotId) { this.secondSlotId = secondSlotId; }
    public Long getThirdSlotId() { return thirdSlotId; }
    public void setThirdSlotId(final Long thirdSlotId) { this.thirdSlotId = thirdSlotId; }

    public static BogenBaseState empty() {
        return new BogenBaseState(null, null, null);
    }
}
```

- [ ] **Step 2: Commit**
```bash
git add backend/src/main/java/com/softball/domain/model/BogenBaseState.java
git commit -m "🎯 BogenBaseState Domain-Model"
```

---

### Task 4: SpielbogenAtBat / StealingEvent / Substitution Domain Models

**Files:**
- Create 3 domain model classes

- [ ] **Step 1: SpielbogenAtBat.java**

```java
package com.softball.domain.model;

import java.time.Instant;
import java.util.List;

public class SpielbogenAtBat {
    private Long id;
    private Spielbogen bogen;
    private SpielbogenSlot slot;
    private BogenSide side;
    private Integer sequence;
    private Integer inning;
    private AtBatResult result;
    private OutType outType;
    private List<Integer> fielderChain;
    private Boolean isError;
    private Integer errorPosition;
    private Integer runsScored;
    private Integer rbi;
    private BogenBaseState baseStateAfter;
    private Instant createdAt;
    private String createdBy;

    public SpielbogenAtBat() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Spielbogen getBogen() { return bogen; }
    public void setBogen(final Spielbogen bogen) { this.bogen = bogen; }
    public SpielbogenSlot getSlot() { return slot; }
    public void setSlot(final SpielbogenSlot slot) { this.slot = slot; }
    public BogenSide getSide() { return side; }
    public void setSide(final BogenSide side) { this.side = side; }
    public Integer getSequence() { return sequence; }
    public void setSequence(final Integer sequence) { this.sequence = sequence; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public AtBatResult getResult() { return result; }
    public void setResult(final AtBatResult result) { this.result = result; }
    public OutType getOutType() { return outType; }
    public void setOutType(final OutType outType) { this.outType = outType; }
    public List<Integer> getFielderChain() { return fielderChain; }
    public void setFielderChain(final List<Integer> fielderChain) { this.fielderChain = fielderChain; }
    public Boolean getIsError() { return isError; }
    public void setIsError(final Boolean isError) { this.isError = isError; }
    public Integer getErrorPosition() { return errorPosition; }
    public void setErrorPosition(final Integer errorPosition) { this.errorPosition = errorPosition; }
    public Integer getRunsScored() { return runsScored; }
    public void setRunsScored(final Integer runsScored) { this.runsScored = runsScored; }
    public Integer getRbi() { return rbi; }
    public void setRbi(final Integer rbi) { this.rbi = rbi; }
    public BogenBaseState getBaseStateAfter() { return baseStateAfter; }
    public void setBaseStateAfter(final BogenBaseState baseStateAfter) { this.baseStateAfter = baseStateAfter; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }
}
```

- [ ] **Step 2: SpielbogenStealingEvent.java**

```java
package com.softball.domain.model;

import java.time.Instant;

public class SpielbogenStealingEvent {
    private Long id;
    private Spielbogen bogen;
    private SpielbogenSlot slot;
    private BogenSide side;
    private Integer inning;
    private StealingEventType type;
    private Integer fromBase;
    private Integer toBase;
    private Instant createdAt;

    public SpielbogenStealingEvent() {}

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
    public StealingEventType getType() { return type; }
    public void setType(final StealingEventType type) { this.type = type; }
    public Integer getFromBase() { return fromBase; }
    public void setFromBase(final Integer fromBase) { this.fromBase = fromBase; }
    public Integer getToBase() { return toBase; }
    public void setToBase(final Integer toBase) { this.toBase = toBase; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 3: SpielbogenSubstitution.java**

```java
package com.softball.domain.model;

import java.time.Instant;

public class SpielbogenSubstitution {
    private Long id;
    private Spielbogen bogen;
    private SpielbogenSlot slot;
    private BogenSide side;
    private Integer inning;
    private String playerOutName;
    private String playerInName;
    private Boolean isPinchHitter;
    private Instant createdAt;

    public SpielbogenSubstitution() {}

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
    public String getPlayerOutName() { return playerOutName; }
    public void setPlayerOutName(final String playerOutName) { this.playerOutName = playerOutName; }
    public String getPlayerInName() { return playerInName; }
    public void setPlayerInName(final String playerInName) { this.playerInName = playerInName; }
    public Boolean getIsPinchHitter() { return isPinchHitter; }
    public void setIsPinchHitter(final Boolean isPinchHitter) { this.isPinchHitter = isPinchHitter; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 4: Build + commit**
```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
git add backend/src/main/java/com/softball/domain/model/SpielbogenAtBat.java \
        backend/src/main/java/com/softball/domain/model/SpielbogenStealingEvent.java \
        backend/src/main/java/com/softball/domain/model/SpielbogenSubstitution.java
git commit -m "🎯 SpielbogenAtBat + StealingEvent + Substitution Domain-Models"
```

---

### Task 5: Repository Ports

**Files (3 ports):**

- [ ] **Step 1: SpielbogenAtBatRepository.java**
```java
package com.softball.domain.port.out;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenAtBat;

import java.util.List;
import java.util.Optional;

public interface SpielbogenAtBatRepository {
    List<SpielbogenAtBat> findByBogenId(Long bogenId);
    List<SpielbogenAtBat> findByBogenIdAndSide(Long bogenId, BogenSide side);
    Optional<SpielbogenAtBat> findById(Long id);
    Optional<SpielbogenAtBat> findLatestForSide(Long bogenId, BogenSide side);
    SpielbogenAtBat save(SpielbogenAtBat atBat);
    void deleteById(Long id);
    Integer findMaxSequenceForBogenSide(Long bogenId, BogenSide side);
    long countOutsInInning(Long bogenId, BogenSide side, Integer inning);
}
```

- [ ] **Step 2: SpielbogenStealingRepository.java**
```java
package com.softball.domain.port.out;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenStealingEvent;

import java.util.List;
import java.util.Optional;

public interface SpielbogenStealingRepository {
    List<SpielbogenStealingEvent> findByBogenId(Long bogenId);
    Optional<SpielbogenStealingEvent> findById(Long id);
    SpielbogenStealingEvent save(SpielbogenStealingEvent event);
    void deleteById(Long id);
    long countOutsInInning(Long bogenId, BogenSide side, Integer inning);
}
```

- [ ] **Step 3: SpielbogenSubstitutionRepository.java**
```java
package com.softball.domain.port.out;

import com.softball.domain.model.SpielbogenSubstitution;

import java.util.List;
import java.util.Optional;

public interface SpielbogenSubstitutionRepository {
    List<SpielbogenSubstitution> findByBogenId(Long bogenId);
    Optional<SpielbogenSubstitution> findById(Long id);
    SpielbogenSubstitution save(SpielbogenSubstitution sub);
    void deleteById(Long id);
}
```

- [ ] **Step 4: Commit**
```bash
git add backend/src/main/java/com/softball/domain/port/out/SpielbogenAtBatRepository.java \
        backend/src/main/java/com/softball/domain/port/out/SpielbogenStealingRepository.java \
        backend/src/main/java/com/softball/domain/port/out/SpielbogenSubstitutionRepository.java
git commit -m "🔌 Spielbogen Scoring Repository-Ports (AtBat + Stealing + Substitution)"
```

---

### Task 6: JPA Entities

Follow Phase 1 patterns. Each entity:
- `@Entity @Table(name = "spielbogen_at_bat" / "spielbogen_stealing_event" / "spielbogen_substitution")`
- `@Id @GeneratedValue(strategy = IDENTITY)`
- `@ManyToOne` to SpielbogenEntity (bogen) and SpielbogenSlotEntity (slot)
- For SpielbogenAtBatEntity: `@Column` for `fielder_chain` of type Integer[] — use Hibernate `@JdbcTypeCode(SqlTypes.ARRAY)` or store as `@Type(JsonBinaryType.class)` if ARRAY type doesn't work directly. Or simpler: declare as `@Column(name = "fielder_chain", columnDefinition = "INTEGER[]")` with `private Integer[] fielderChain;`
- BaseStateAfter stored as 3 columns (`base_state_first`, `base_state_second`, `base_state_third`) — each is `Long` referencing slot ID; use `@Column(name = ...)` (not @ManyToOne — keep loose ref)
- Standard getters/setters
- `@PrePersist` to set createdAt

**Files (3 entities):**
- `SpielbogenAtBatEntity.java`
- `SpielbogenStealingEventEntity.java`
- `SpielbogenSubstitutionEntity.java`

- [ ] **Step 1: SpielbogenAtBatEntity.java**

```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "spielbogen_at_bat",
       uniqueConstraints = @UniqueConstraint(columnNames = {"bogen_id", "side", "sequence"}))
public class SpielbogenAtBatEntity {

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
    private Integer sequence;

    @Column(nullable = false)
    private Integer inning;

    @Column(nullable = false)
    private String result;

    @Column(name = "out_type")
    private String outType;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "fielder_chain", columnDefinition = "integer[]")
    private Integer[] fielderChain;

    @Column(name = "is_error", nullable = false)
    private Boolean isError = Boolean.FALSE;

    @Column(name = "error_position")
    private Integer errorPosition;

    @Column(name = "runs_scored", nullable = false)
    private Integer runsScored = 0;

    @Column(nullable = false)
    private Integer rbi = 0;

    @Column(name = "base_state_first")
    private Long baseStateFirst;

    @Column(name = "base_state_second")
    private Long baseStateSecond;

    @Column(name = "base_state_third")
    private Long baseStateThird;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "created_by")
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SpielbogenEntity getBogen() { return bogen; }
    public void setBogen(SpielbogenEntity bogen) { this.bogen = bogen; }
    public SpielbogenSlotEntity getSlot() { return slot; }
    public void setSlot(SpielbogenSlotEntity slot) { this.slot = slot; }
    public String getSide() { return side; }
    public void setSide(String side) { this.side = side; }
    public Integer getSequence() { return sequence; }
    public void setSequence(Integer sequence) { this.sequence = sequence; }
    public Integer getInning() { return inning; }
    public void setInning(Integer inning) { this.inning = inning; }
    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
    public String getOutType() { return outType; }
    public void setOutType(String outType) { this.outType = outType; }
    public Integer[] getFielderChain() { return fielderChain; }
    public void setFielderChain(Integer[] fielderChain) { this.fielderChain = fielderChain; }
    public Boolean getIsError() { return isError; }
    public void setIsError(Boolean isError) { this.isError = isError; }
    public Integer getErrorPosition() { return errorPosition; }
    public void setErrorPosition(Integer errorPosition) { this.errorPosition = errorPosition; }
    public Integer getRunsScored() { return runsScored; }
    public void setRunsScored(Integer runsScored) { this.runsScored = runsScored; }
    public Integer getRbi() { return rbi; }
    public void setRbi(Integer rbi) { this.rbi = rbi; }
    public Long getBaseStateFirst() { return baseStateFirst; }
    public void setBaseStateFirst(Long baseStateFirst) { this.baseStateFirst = baseStateFirst; }
    public Long getBaseStateSecond() { return baseStateSecond; }
    public void setBaseStateSecond(Long baseStateSecond) { this.baseStateSecond = baseStateSecond; }
    public Long getBaseStateThird() { return baseStateThird; }
    public void setBaseStateThird(Long baseStateThird) { this.baseStateThird = baseStateThird; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
}
```

- [ ] **Step 2: SpielbogenStealingEventEntity.java**

```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "spielbogen_stealing_event")
public class SpielbogenStealingEventEntity {

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

    @Column(nullable = false)
    private String type;

    @Column(name = "from_base", nullable = false)
    private Integer fromBase;

    @Column(name = "to_base", nullable = false)
    private Integer toBase;

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
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Integer getFromBase() { return fromBase; }
    public void setFromBase(Integer fromBase) { this.fromBase = fromBase; }
    public Integer getToBase() { return toBase; }
    public void setToBase(Integer toBase) { this.toBase = toBase; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 3: SpielbogenSubstitutionEntity.java**

```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "spielbogen_substitution")
public class SpielbogenSubstitutionEntity {

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

    @Column(name = "player_out_name", nullable = false)
    private String playerOutName;

    @Column(name = "player_in_name", nullable = false)
    private String playerInName;

    @Column(name = "is_pinch_hitter", nullable = false)
    private Boolean isPinchHitter = Boolean.FALSE;

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
    public String getPlayerOutName() { return playerOutName; }
    public void setPlayerOutName(String playerOutName) { this.playerOutName = playerOutName; }
    public String getPlayerInName() { return playerInName; }
    public void setPlayerInName(String playerInName) { this.playerInName = playerInName; }
    public Boolean getIsPinchHitter() { return isPinchHitter; }
    public void setIsPinchHitter(Boolean isPinchHitter) { this.isPinchHitter = isPinchHitter; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 4: Compile + commit**
```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
git add backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenAtBatEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenStealingEventEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenSubstitutionEntity.java
git commit -m "🗄️ Spielbogen Scoring JPA-Entities"
```

---

### Task 7: Spring Repositories + Mappers + Adapters (consolidated)

This task creates 3 spring repos, 3 mappers, 3 adapters — 9 files. Follow Phase 1 patterns exactly. Each Adapter implements its corresponding domain Port. Each Mapper handles entity ↔ domain translation.

**Spring Repositories** under `backend/src/main/java/com/softball/adapter/out/persistence/repository/`:

- [ ] **SpringSpielbogenAtBatRepository.java**

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenAtBatEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SpringSpielbogenAtBatRepository extends JpaRepository<SpielbogenAtBatEntity, Long> {
    List<SpielbogenAtBatEntity> findByBogen_IdOrderBySequenceAsc(Long bogenId);
    List<SpielbogenAtBatEntity> findByBogen_IdAndSideOrderBySequenceAsc(Long bogenId, String side);

    @Query("SELECT MAX(a.sequence) FROM SpielbogenAtBatEntity a WHERE a.bogen.id = :bogenId AND a.side = :side")
    Integer findMaxSequence(Long bogenId, String side);

    Optional<SpielbogenAtBatEntity> findFirstByBogen_IdAndSideOrderBySequenceDesc(Long bogenId, String side);

    @Query("""
        SELECT COUNT(a) FROM SpielbogenAtBatEntity a
        WHERE a.bogen.id = :bogenId AND a.side = :side AND a.inning = :inning
          AND (a.result = 'STRIKEOUT' OR a.result = 'OUT')
          AND (a.isError = FALSE OR a.isError IS NULL)
    """)
    long countSimpleOutsInInning(Long bogenId, String side, Integer inning);

    @Query("""
        SELECT COALESCE(SUM(CASE
            WHEN a.outType = 'DOUBLE_PLAY' THEN 2
            WHEN a.outType = 'TRIPLE_PLAY' THEN 3
            WHEN a.result = 'STRIKEOUT' THEN 1
            WHEN a.result = 'OUT' THEN 1
            ELSE 0
        END), 0)
        FROM SpielbogenAtBatEntity a
        WHERE a.bogen.id = :bogenId AND a.side = :side AND a.inning = :inning
          AND (a.isError = FALSE OR a.isError IS NULL)
    """)
    long countWeightedOutsInInning(Long bogenId, String side, Integer inning);
}
```

- [ ] **SpringSpielbogenStealingRepository.java**

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenStealingEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpringSpielbogenStealingRepository extends JpaRepository<SpielbogenStealingEventEntity, Long> {
    List<SpielbogenStealingEventEntity> findByBogen_IdOrderByIdAsc(Long bogenId);

    @Query("""
        SELECT COUNT(s) FROM SpielbogenStealingEventEntity s
        WHERE s.bogen.id = :bogenId AND s.side = :side AND s.inning = :inning
          AND (s.type = 'CAUGHT_STEALING' OR s.type = 'OUT_ON_PLAY')
    """)
    long countOutsInInning(Long bogenId, String side, Integer inning);
}
```

- [ ] **SpringSpielbogenSubstitutionRepository.java**

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenSubstitutionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringSpielbogenSubstitutionRepository extends JpaRepository<SpielbogenSubstitutionEntity, Long> {
    List<SpielbogenSubstitutionEntity> findByBogen_IdOrderByInningAscIdAsc(Long bogenId);
}
```

**Mappers** under `mapper/`:

- [ ] **SpielbogenAtBatMapper.java**

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenAtBatEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.domain.model.*;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class SpielbogenAtBatMapper {

    private final SpielbogenMapper bogenMapper;
    private final SpielbogenSlotMapper slotMapper;

    public SpielbogenAtBatMapper(final SpielbogenMapper bogenMapper, final SpielbogenSlotMapper slotMapper) {
        this.bogenMapper = bogenMapper;
        this.slotMapper = slotMapper;
    }

    public SpielbogenAtBat toDomain(final SpielbogenAtBatEntity e) {
        if (e == null) return null;
        SpielbogenAtBat a = new SpielbogenAtBat();
        a.setId(e.getId());
        a.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        a.setSlot(e.getSlot() != null ? slotMapper.toDomain(e.getSlot()) : null);
        a.setSide(BogenSide.valueOf(e.getSide()));
        a.setSequence(e.getSequence());
        a.setInning(e.getInning());
        a.setResult(AtBatResult.valueOf(e.getResult()));
        a.setOutType(e.getOutType() != null ? OutType.valueOf(e.getOutType()) : null);
        a.setFielderChain(e.getFielderChain() != null ? Arrays.asList(e.getFielderChain()) : null);
        a.setIsError(e.getIsError());
        a.setErrorPosition(e.getErrorPosition());
        a.setRunsScored(e.getRunsScored());
        a.setRbi(e.getRbi());
        a.setBaseStateAfter(new BogenBaseState(e.getBaseStateFirst(), e.getBaseStateSecond(), e.getBaseStateThird()));
        a.setCreatedAt(e.getCreatedAt());
        a.setCreatedBy(e.getCreatedBy());
        return a;
    }

    public SpielbogenAtBatEntity toEntity(final SpielbogenAtBat a, final SpielbogenEntity bogenEntity, final SpielbogenSlotEntity slotEntity) {
        SpielbogenAtBatEntity e = new SpielbogenAtBatEntity();
        e.setId(a.getId());
        e.setBogen(bogenEntity);
        e.setSlot(slotEntity);
        applyToEntity(e, a);
        return e;
    }

    public void updateEntity(final SpielbogenAtBatEntity e, final SpielbogenAtBat a) {
        applyToEntity(e, a);
    }

    private void applyToEntity(final SpielbogenAtBatEntity e, final SpielbogenAtBat a) {
        e.setSide(a.getSide().name());
        e.setSequence(a.getSequence());
        e.setInning(a.getInning());
        e.setResult(a.getResult().name());
        e.setOutType(a.getOutType() != null ? a.getOutType().name() : null);
        e.setFielderChain(a.getFielderChain() != null ? a.getFielderChain().toArray(new Integer[0]) : null);
        e.setIsError(a.getIsError() != null ? a.getIsError() : Boolean.FALSE);
        e.setErrorPosition(a.getErrorPosition());
        e.setRunsScored(a.getRunsScored() != null ? a.getRunsScored() : 0);
        e.setRbi(a.getRbi() != null ? a.getRbi() : 0);
        if (a.getBaseStateAfter() != null) {
            e.setBaseStateFirst(a.getBaseStateAfter().getFirstSlotId());
            e.setBaseStateSecond(a.getBaseStateAfter().getSecondSlotId());
            e.setBaseStateThird(a.getBaseStateAfter().getThirdSlotId());
        }
        e.setCreatedBy(a.getCreatedBy());
    }
}
```

- [ ] **SpielbogenStealingMapper.java**

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenStealingEventEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenStealingEvent;
import com.softball.domain.model.StealingEventType;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenStealingMapper {

    private final SpielbogenMapper bogenMapper;
    private final SpielbogenSlotMapper slotMapper;

    public SpielbogenStealingMapper(final SpielbogenMapper bogenMapper, final SpielbogenSlotMapper slotMapper) {
        this.bogenMapper = bogenMapper;
        this.slotMapper = slotMapper;
    }

    public SpielbogenStealingEvent toDomain(final SpielbogenStealingEventEntity e) {
        if (e == null) return null;
        SpielbogenStealingEvent s = new SpielbogenStealingEvent();
        s.setId(e.getId());
        s.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        s.setSlot(e.getSlot() != null ? slotMapper.toDomain(e.getSlot()) : null);
        s.setSide(BogenSide.valueOf(e.getSide()));
        s.setInning(e.getInning());
        s.setType(StealingEventType.valueOf(e.getType()));
        s.setFromBase(e.getFromBase());
        s.setToBase(e.getToBase());
        s.setCreatedAt(e.getCreatedAt());
        return s;
    }

    public SpielbogenStealingEventEntity toEntity(final SpielbogenStealingEvent s, final SpielbogenEntity bogenEntity, final SpielbogenSlotEntity slotEntity) {
        SpielbogenStealingEventEntity e = new SpielbogenStealingEventEntity();
        e.setId(s.getId());
        e.setBogen(bogenEntity);
        e.setSlot(slotEntity);
        e.setSide(s.getSide().name());
        e.setInning(s.getInning());
        e.setType(s.getType().name());
        e.setFromBase(s.getFromBase());
        e.setToBase(s.getToBase());
        return e;
    }
}
```

- [ ] **SpielbogenSubstitutionMapper.java**

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSubstitutionEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSubstitution;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenSubstitutionMapper {

    private final SpielbogenMapper bogenMapper;
    private final SpielbogenSlotMapper slotMapper;

    public SpielbogenSubstitutionMapper(final SpielbogenMapper bogenMapper, final SpielbogenSlotMapper slotMapper) {
        this.bogenMapper = bogenMapper;
        this.slotMapper = slotMapper;
    }

    public SpielbogenSubstitution toDomain(final SpielbogenSubstitutionEntity e) {
        if (e == null) return null;
        SpielbogenSubstitution s = new SpielbogenSubstitution();
        s.setId(e.getId());
        s.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        s.setSlot(e.getSlot() != null ? slotMapper.toDomain(e.getSlot()) : null);
        s.setSide(BogenSide.valueOf(e.getSide()));
        s.setInning(e.getInning());
        s.setPlayerOutName(e.getPlayerOutName());
        s.setPlayerInName(e.getPlayerInName());
        s.setIsPinchHitter(e.getIsPinchHitter());
        s.setCreatedAt(e.getCreatedAt());
        return s;
    }

    public SpielbogenSubstitutionEntity toEntity(final SpielbogenSubstitution s, final SpielbogenEntity bogenEntity, final SpielbogenSlotEntity slotEntity) {
        SpielbogenSubstitutionEntity e = new SpielbogenSubstitutionEntity();
        e.setId(s.getId());
        e.setBogen(bogenEntity);
        e.setSlot(slotEntity);
        e.setSide(s.getSide().name());
        e.setInning(s.getInning());
        e.setPlayerOutName(s.getPlayerOutName());
        e.setPlayerInName(s.getPlayerInName());
        e.setIsPinchHitter(s.getIsPinchHitter() != null ? s.getIsPinchHitter() : Boolean.FALSE);
        return e;
    }
}
```

**Adapters** under `adapter/`:

- [ ] **SpielbogenAtBatRepositoryAdapter.java**

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenAtBatEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenAtBatMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenAtBatRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenStealingRepository;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenAtBat;
import com.softball.domain.port.out.SpielbogenAtBatRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenAtBatRepositoryAdapter implements SpielbogenAtBatRepository {

    private final SpringSpielbogenAtBatRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpringSpielbogenSlotRepository slotRepo;
    private final SpringSpielbogenStealingRepository stealingRepo;
    private final SpielbogenAtBatMapper mapper;

    public SpielbogenAtBatRepositoryAdapter(final SpringSpielbogenAtBatRepository repo,
                                            final SpringSpielbogenRepository bogenRepo,
                                            final SpringSpielbogenSlotRepository slotRepo,
                                            final SpringSpielbogenStealingRepository stealingRepo,
                                            final SpielbogenAtBatMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.stealingRepo = stealingRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenAtBat> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderBySequenceAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<SpielbogenAtBat> findByBogenIdAndSide(final Long bogenId, final BogenSide side) {
        return repo.findByBogen_IdAndSideOrderBySequenceAsc(bogenId, side.name()).stream()
                   .map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SpielbogenAtBat> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<SpielbogenAtBat> findLatestForSide(final Long bogenId, final BogenSide side) {
        return repo.findFirstByBogen_IdAndSideOrderBySequenceDesc(bogenId, side.name()).map(mapper::toDomain);
    }

    @Override
    public SpielbogenAtBat save(final SpielbogenAtBat atBat) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(atBat.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", atBat.getBogen().getId()));
        SpielbogenSlotEntity slotEntity = slotRepo.findById(atBat.getSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", atBat.getSlot().getId()));

        if (atBat.getId() != null) {
            SpielbogenAtBatEntity existing = repo.findById(atBat.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, atBat);
                return mapper.toDomain(repo.save(existing));
            }
        }
        SpielbogenAtBatEntity entity = mapper.toEntity(atBat, bogenEntity, slotEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public Integer findMaxSequenceForBogenSide(final Long bogenId, final BogenSide side) {
        Integer max = repo.findMaxSequence(bogenId, side.name());
        return max != null ? max : 0;
    }

    @Override
    public long countOutsInInning(final Long bogenId, final BogenSide side, final Integer inning) {
        long atBatOuts = repo.countWeightedOutsInInning(bogenId, side.name(), inning);
        long stealingOuts = stealingRepo.countOutsInInning(bogenId, side.name(), inning);
        return atBatOuts + stealingOuts;
    }
}
```

- [ ] **SpielbogenStealingRepositoryAdapter.java**

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenStealingEventEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenStealingMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenStealingRepository;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenStealingEvent;
import com.softball.domain.port.out.SpielbogenStealingRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenStealingRepositoryAdapter implements SpielbogenStealingRepository {

    private final SpringSpielbogenStealingRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpringSpielbogenSlotRepository slotRepo;
    private final SpielbogenStealingMapper mapper;

    public SpielbogenStealingRepositoryAdapter(final SpringSpielbogenStealingRepository repo,
                                               final SpringSpielbogenRepository bogenRepo,
                                               final SpringSpielbogenSlotRepository slotRepo,
                                               final SpielbogenStealingMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenStealingEvent> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderByIdAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SpielbogenStealingEvent> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public SpielbogenStealingEvent save(final SpielbogenStealingEvent event) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(event.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", event.getBogen().getId()));
        SpielbogenSlotEntity slotEntity = slotRepo.findById(event.getSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", event.getSlot().getId()));

        SpielbogenStealingEventEntity entity = mapper.toEntity(event, bogenEntity, slotEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public long countOutsInInning(final Long bogenId, final BogenSide side, final Integer inning) {
        return repo.countOutsInInning(bogenId, side.name(), inning);
    }
}
```

- [ ] **SpielbogenSubstitutionRepositoryAdapter.java**

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSubstitutionEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenSubstitutionMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSubstitutionRepository;
import com.softball.domain.model.SpielbogenSubstitution;
import com.softball.domain.port.out.SpielbogenSubstitutionRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenSubstitutionRepositoryAdapter implements SpielbogenSubstitutionRepository {

    private final SpringSpielbogenSubstitutionRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpringSpielbogenSlotRepository slotRepo;
    private final SpielbogenSubstitutionMapper mapper;

    public SpielbogenSubstitutionRepositoryAdapter(final SpringSpielbogenSubstitutionRepository repo,
                                                   final SpringSpielbogenRepository bogenRepo,
                                                   final SpringSpielbogenSlotRepository slotRepo,
                                                   final SpielbogenSubstitutionMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenSubstitution> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderByInningAscIdAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SpielbogenSubstitution> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public SpielbogenSubstitution save(final SpielbogenSubstitution sub) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(sub.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", sub.getBogen().getId()));
        SpielbogenSlotEntity slotEntity = slotRepo.findById(sub.getSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", sub.getSlot().getId()));

        SpielbogenSubstitutionEntity entity = mapper.toEntity(sub, bogenEntity, slotEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
}
```

- [ ] **Compile + commit**
```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
git add backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenAtBatRepository.java \
        backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenStealingRepository.java \
        backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenSubstitutionRepository.java \
        backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenAtBatMapper.java \
        backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenStealingMapper.java \
        backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenSubstitutionMapper.java \
        backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenAtBatRepositoryAdapter.java \
        backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenStealingRepositoryAdapter.java \
        backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenSubstitutionRepositoryAdapter.java
git commit -m "🔌 Spielbogen Scoring Persistence-Layer (Mappers + Adapters)"
```

---

### Task 8: SpielbogenScoringService (TDD)

This is the core scoring logic. Includes recordAtBat, recordStealingEvent, recordSubstitution, undoLast, switchSide.

**Files:**
- `backend/src/test/java/com/softball/application/SpielbogenScoringServiceTest.java`
- `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`

- [ ] **Step 1: Write tests (~12 tests)**

Tests cover: recordAtBat success path, sequence assignment, runs accumulation, validation (status LIVE, slot belongs to bogen+side, outType only for OUT, fielderChain validations, isError requires errorPosition), recordStealingEvent, recordSubstitution (including pinch-hitter mode), undoLast (rolls back state), switchSide (accepts when 3 outs, rejects gracefully when not).

```java
package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpielbogenScoringServiceTest {

    @Mock private SpielbogenRepository bogenRepo;
    @Mock private SpielbogenSlotRepository slotRepo;
    @Mock private SpielbogenAtBatRepository atBatRepo;
    @Mock private SpielbogenStealingRepository stealingRepo;
    @Mock private SpielbogenSubstitutionRepository subRepo;

    @InjectMocks
    private SpielbogenScoringService service;

    private Spielbogen liveBogen;
    private SpielbogenSlot homeSlot;

    @BeforeEach
    void setUp() {
        liveBogen = new Spielbogen();
        liveBogen.setId(1L);
        liveBogen.setStatus(BogenStatus.LIVE);
        liveBogen.setCurrentInning(1);
        liveBogen.setCurrentSide(BogenSide.AWAY);
        liveBogen.setHomeRuns(0);
        liveBogen.setAwayRuns(0);

        homeSlot = new SpielbogenSlot();
        homeSlot.setId(50L);
        homeSlot.setBogen(liveBogen);
        homeSlot.setSide(BogenSide.HOME);
    }

    @Test
    void recordAtBatRejectsDraftStatus() {
        liveBogen.setStatus(BogenStatus.DRAFT);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));

        assertThatThrownBy(() -> service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.SINGLE,
                                                     null, null, false, null, 0, 0, null))
            .isInstanceOf(BusinessValidationException.class).hasMessageContaining("LIVE");
    }

    @Test
    void recordAtBatAssignsNextSequence() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));
        when(atBatRepo.findMaxSequenceForBogenSide(1L, BogenSide.HOME)).thenReturn(4);
        when(atBatRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SpielbogenAtBat saved = service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.SINGLE,
                                                    null, null, false, null, 0, 0, null);
        assertThat(saved.getSequence()).isEqualTo(5);
    }

    @Test
    void recordAtBatHomerunIncrementsRuns() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));
        when(atBatRepo.findMaxSequenceForBogenSide(any(), any())).thenReturn(0);
        when(atBatRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bogenRepo.save(any())).thenAnswer(inv -> {
            Spielbogen b = inv.getArgument(0);
            return b;
        });

        service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.HOMERUN, null, null, false, null, 1, 1, null);

        assertThat(liveBogen.getHomeRuns()).isEqualTo(1);
    }

    @Test
    void recordAtBatRejectsOutTypeOnNonOutResult() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));

        assertThatThrownBy(() -> service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.SINGLE,
                                                     OutType.GROUNDER, null, false, null, 0, 0, null))
            .isInstanceOf(BusinessValidationException.class).hasMessageContaining("outType");
    }

    @Test
    void recordAtBatRejectsFielderChainOutOfRange() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));

        assertThatThrownBy(() -> service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.OUT,
                                                     OutType.GROUNDER, List.of(0, 3), false, null, 0, 0, null))
            .isInstanceOf(BusinessValidationException.class).hasMessageContaining("fielderChain");
    }

    @Test
    void recordAtBatRejectsErrorWithoutPosition() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));

        assertThatThrownBy(() -> service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.OUT,
                                                     null, null, true, null, 0, 0, null))
            .isInstanceOf(BusinessValidationException.class).hasMessageContaining("errorPosition");
    }

    @Test
    void recordAtBatRejectsSlotFromDifferentBogen() {
        Spielbogen other = new Spielbogen();
        other.setId(99L);
        homeSlot.setBogen(other);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));

        assertThatThrownBy(() -> service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.SINGLE,
                                                     null, null, false, null, 0, 0, null))
            .isInstanceOf(BusinessValidationException.class).hasMessageContaining("Slot");
    }

    @Test
    void recordStealingSavesEvent() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));
        when(stealingRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var event = service.recordStealingEvent(1L, BogenSide.HOME, 50L, 1, StealingEventType.STOLEN_BASE, 1, 2);

        assertThat(event.getType()).isEqualTo(StealingEventType.STOLEN_BASE);
        verify(stealingRepo).save(any());
    }

    @Test
    void recordSubstitutionStores() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));
        homeSlot.setName("Olaf");
        when(subRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var sub = service.recordSubstitution(1L, BogenSide.HOME, 50L, 3, "Klaus", false);

        assertThat(sub.getPlayerOutName()).isEqualTo("Olaf");
        assertThat(sub.getPlayerInName()).isEqualTo("Klaus");
        assertThat(sub.getIsPinchHitter()).isFalse();
    }

    @Test
    void undoLastDeletesAndRecomputesScore() {
        SpielbogenAtBat last = new SpielbogenAtBat();
        last.setId(99L);
        last.setRunsScored(2);
        last.setSide(BogenSide.HOME);
        liveBogen.setHomeRuns(2);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.findLatestForSide(1L, BogenSide.HOME)).thenReturn(Optional.of(last));
        when(atBatRepo.findByBogenId(1L)).thenReturn(List.of()); // After delete: empty
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.undoLast(1L, BogenSide.HOME);

        verify(atBatRepo).deleteById(99L);
        assertThat(liveBogen.getHomeRuns()).isEqualTo(0);
    }

    @Test
    void switchSideFlipsCurrentSideWhenOutsReach3() {
        liveBogen.setCurrentSide(BogenSide.AWAY);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.countOutsInInning(1L, BogenSide.AWAY, 1)).thenReturn(3L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.switchSide(1L);

        assertThat(liveBogen.getCurrentSide()).isEqualTo(BogenSide.HOME);
        assertThat(liveBogen.getCurrentInning()).isEqualTo(1);
    }

    @Test
    void switchSideAdvancesInningAfterBothSidesPlayed() {
        liveBogen.setCurrentSide(BogenSide.HOME);
        liveBogen.setCurrentInning(1);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.countOutsInInning(1L, BogenSide.HOME, 1)).thenReturn(3L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.switchSide(1L);

        assertThat(liveBogen.getCurrentSide()).isEqualTo(BogenSide.AWAY);
        assertThat(liveBogen.getCurrentInning()).isEqualTo(2);
    }
}
```

- [ ] **Step 2: Run tests, verify failure**
```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest
```

- [ ] **Step 3: Implementation**

```java
package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class SpielbogenScoringService {

    private static final Logger log = LoggerFactory.getLogger(SpielbogenScoringService.class);

    private final SpielbogenRepository bogenRepo;
    private final SpielbogenSlotRepository slotRepo;
    private final SpielbogenAtBatRepository atBatRepo;
    private final SpielbogenStealingRepository stealingRepo;
    private final SpielbogenSubstitutionRepository subRepo;

    public SpielbogenScoringService(final SpielbogenRepository bogenRepo,
                                    final SpielbogenSlotRepository slotRepo,
                                    final SpielbogenAtBatRepository atBatRepo,
                                    final SpielbogenStealingRepository stealingRepo,
                                    final SpielbogenSubstitutionRepository subRepo) {
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.atBatRepo = atBatRepo;
        this.stealingRepo = stealingRepo;
        this.subRepo = subRepo;
    }

    @Transactional
    public SpielbogenAtBat recordAtBat(final Long bogenId, final BogenSide side, final Long slotId,
                                       final Integer inning, final AtBatResult result,
                                       final OutType outType, final List<Integer> fielderChain,
                                       final Boolean isError, final Integer errorPosition,
                                       final Integer runsScored, final Integer rbi,
                                       final BogenBaseState baseStateAfter) {
        Spielbogen bogen = requireLive(bogenId);
        SpielbogenSlot slot = requireSlotForBogenAndSide(slotId, bogenId, side);

        if (outType != null && result != AtBatResult.OUT) {
            throw new BusinessValidationException("outType nur bei result=OUT erlaubt");
        }
        if (fielderChain != null && !fielderChain.isEmpty()) {
            if (result != AtBatResult.OUT) {
                throw new BusinessValidationException("fielderChain nur bei result=OUT erlaubt");
            }
            if (fielderChain.size() > 4) {
                throw new BusinessValidationException("fielderChain darf max 4 Einträge haben");
            }
            for (Integer pos : fielderChain) {
                if (pos == null || pos < 1 || pos > 9) {
                    throw new BusinessValidationException("fielderChain-Werte müssen 1-9 sein");
                }
            }
        }
        if (Boolean.TRUE.equals(isError) && (errorPosition == null || errorPosition < 1 || errorPosition > 9)) {
            throw new BusinessValidationException("isError=true erfordert errorPosition 1-9");
        }
        if (runsScored != null && runsScored < 0) {
            throw new BusinessValidationException("runsScored muss >= 0 sein");
        }

        Integer nextSeq = atBatRepo.findMaxSequenceForBogenSide(bogenId, side) + 1;

        SpielbogenAtBat atBat = new SpielbogenAtBat();
        atBat.setBogen(bogen);
        atBat.setSlot(slot);
        atBat.setSide(side);
        atBat.setSequence(nextSeq);
        atBat.setInning(inning);
        atBat.setResult(result);
        atBat.setOutType(outType);
        atBat.setFielderChain(fielderChain);
        atBat.setIsError(isError != null ? isError : Boolean.FALSE);
        atBat.setErrorPosition(errorPosition);
        atBat.setRunsScored(runsScored != null ? runsScored : 0);
        atBat.setRbi(rbi != null ? rbi : 0);
        atBat.setBaseStateAfter(baseStateAfter != null ? baseStateAfter : BogenBaseState.empty());

        SpielbogenAtBat saved = atBatRepo.save(atBat);

        // Update bogen score
        if (saved.getRunsScored() != null && saved.getRunsScored() > 0) {
            if (side == BogenSide.HOME) {
                bogen.setHomeRuns(bogen.getHomeRuns() + saved.getRunsScored());
            } else {
                bogen.setAwayRuns(bogen.getAwayRuns() + saved.getRunsScored());
            }
            bogenRepo.save(bogen);
        }

        log.info("Spielbogen {} AtBat: side={} inning={} result={} seq={}",
                 bogenId, side, inning, result, nextSeq);
        return saved;
    }

    @Transactional
    public SpielbogenStealingEvent recordStealingEvent(final Long bogenId, final BogenSide side,
                                                       final Long slotId, final Integer inning,
                                                       final StealingEventType type,
                                                       final Integer fromBase, final Integer toBase) {
        Spielbogen bogen = requireLive(bogenId);
        SpielbogenSlot slot = requireSlotForBogenAndSide(slotId, bogenId, side);

        if (fromBase == null || fromBase < 1 || fromBase > 3) {
            throw new BusinessValidationException("fromBase muss 1-3 sein");
        }
        if (toBase == null || toBase < 2 || toBase > 4) {
            throw new BusinessValidationException("toBase muss 2-4 sein");
        }

        SpielbogenStealingEvent event = new SpielbogenStealingEvent();
        event.setBogen(bogen);
        event.setSlot(slot);
        event.setSide(side);
        event.setInning(inning);
        event.setType(type);
        event.setFromBase(fromBase);
        event.setToBase(toBase);

        SpielbogenStealingEvent saved = stealingRepo.save(event);
        log.info("Spielbogen {} Stealing: side={} inning={} type={} {}→{}",
                 bogenId, side, inning, type, fromBase, toBase);
        return saved;
    }

    @Transactional
    public SpielbogenSubstitution recordSubstitution(final Long bogenId, final BogenSide side,
                                                     final Long slotId, final Integer inning,
                                                     final String playerInName, final boolean isPinchHitter) {
        Spielbogen bogen = requireLive(bogenId);
        SpielbogenSlot slot = requireSlotForBogenAndSide(slotId, bogenId, side);

        if (playerInName == null || playerInName.isBlank()) {
            throw new BusinessValidationException("playerInName darf nicht leer sein");
        }

        SpielbogenSubstitution sub = new SpielbogenSubstitution();
        sub.setBogen(bogen);
        sub.setSlot(slot);
        sub.setSide(side);
        sub.setInning(inning);
        sub.setPlayerOutName(slot.getName());
        sub.setPlayerInName(playerInName);
        sub.setIsPinchHitter(isPinchHitter);

        // Update slot.name to new player going forward (display logic)
        slot.setName(playerInName);
        slotRepo.save(slot);

        SpielbogenSubstitution saved = subRepo.save(sub);
        log.info("Spielbogen {} Sub: side={} inning={} {} → {} (pinch={})",
                 bogenId, side, inning, sub.getPlayerOutName(), playerInName, isPinchHitter);
        return saved;
    }

    @Transactional
    public void undoLast(final Long bogenId, final BogenSide side) {
        Spielbogen bogen = requireLive(bogenId);
        SpielbogenAtBat last = atBatRepo.findLatestForSide(bogenId, side)
            .orElseThrow(() -> new BusinessValidationException("Kein AtBat zum Rückgängigmachen für Side " + side));

        atBatRepo.deleteById(last.getId());

        // Recompute scores from remaining at-bats
        recomputeScores(bogen);
        bogenRepo.save(bogen);
        log.info("Spielbogen {} Undo: AtBat id={} gelöscht", bogenId, last.getId());
    }

    @Transactional
    public Spielbogen switchSide(final Long bogenId) {
        Spielbogen bogen = requireLive(bogenId);
        BogenSide currentSide = bogen.getCurrentSide();
        Integer currentInning = bogen.getCurrentInning();

        long outs = atBatRepo.countOutsInInning(bogenId, currentSide, currentInning);
        if (outs < 3) {
            throw new BusinessValidationException("Side-Switch nur erlaubt wenn 3 Outs erreicht (aktuell: " + outs + ")");
        }

        BogenSide newSide = currentSide == BogenSide.AWAY ? BogenSide.HOME : BogenSide.AWAY;
        bogen.setCurrentSide(newSide);
        if (currentSide == BogenSide.HOME) {
            bogen.setCurrentInning(currentInning + 1);
        }
        log.info("Spielbogen {} Side-Switch: {} → {} (inning {})",
                 bogenId, currentSide, newSide, bogen.getCurrentInning());
        return bogenRepo.save(bogen);
    }

    @Transactional
    public void deleteStealingEvent(final Long bogenId, final Long eventId) {
        requireLive(bogenId);
        if (stealingRepo.findById(eventId).isEmpty()) {
            throw new ResourceNotFoundException("StealingEvent", eventId);
        }
        stealingRepo.deleteById(eventId);
    }

    @Transactional
    public void deleteSubstitution(final Long bogenId, final Long subId) {
        requireLive(bogenId);
        if (subRepo.findById(subId).isEmpty()) {
            throw new ResourceNotFoundException("Substitution", subId);
        }
        subRepo.deleteById(subId);
    }

    @Transactional(readOnly = true)
    public List<SpielbogenAtBat> findAtBats(final Long bogenId, final BogenSide side) {
        if (side == null) return atBatRepo.findByBogenId(bogenId);
        return atBatRepo.findByBogenIdAndSide(bogenId, side);
    }

    @Transactional(readOnly = true)
    public List<SpielbogenStealingEvent> findStealingEvents(final Long bogenId) {
        return stealingRepo.findByBogenId(bogenId);
    }

    @Transactional(readOnly = true)
    public List<SpielbogenSubstitution> findSubstitutions(final Long bogenId) {
        return subRepo.findByBogenId(bogenId);
    }

    private Spielbogen requireLive(final Long bogenId) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));
        if (bogen.getStatus() != BogenStatus.LIVE) {
            throw new BusinessValidationException("Spielbogen muss im Status LIVE sein (aktuell: " + bogen.getStatus() + ")");
        }
        return bogen;
    }

    private SpielbogenSlot requireSlotForBogenAndSide(final Long slotId, final Long bogenId, final BogenSide side) {
        SpielbogenSlot slot = slotRepo.findById(slotId)
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", slotId));
        if (!slot.getBogen().getId().equals(bogenId)) {
            throw new BusinessValidationException("Slot gehört nicht zu Spielbogen " + bogenId);
        }
        if (slot.getSide() != side) {
            throw new BusinessValidationException("Slot ist auf Side " + slot.getSide() + ", erwartet " + side);
        }
        return slot;
    }

    private void recomputeScores(final Spielbogen bogen) {
        var allAtBats = atBatRepo.findByBogenId(bogen.getId());
        int homeRuns = allAtBats.stream()
            .filter(a -> a.getSide() == BogenSide.HOME)
            .mapToInt(a -> a.getRunsScored() != null ? a.getRunsScored() : 0)
            .sum();
        int awayRuns = allAtBats.stream()
            .filter(a -> a.getSide() == BogenSide.AWAY)
            .mapToInt(a -> a.getRunsScored() != null ? a.getRunsScored() : 0)
            .sum();
        bogen.setHomeRuns(homeRuns);
        bogen.setAwayRuns(awayRuns);
    }
}
```

- [ ] **Step 4: Run tests, all green**
```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest
```

- [ ] **Step 5: Commit**
```bash
git add backend/src/main/java/com/softball/application/SpielbogenScoringService.java \
        backend/src/test/java/com/softball/application/SpielbogenScoringServiceTest.java
git commit -m "🧠 SpielbogenScoringService — AtBats + Stealing + Subs + Undo + ~12 Tests"
```

---

### Task 9: BogenSheetRenderer + BogenScoreCalculator (Domain Services with TDD)

These convert at-bats into RFL-style cell notation and aggregate inning runs.

**Files:**
- `domain/service/BogenSheetRenderer.java` + tests
- `domain/service/BogenScoreCalculator.java` + tests

- [ ] **Step 1: BogenScoreCalculator (smaller, do first)**

```java
package com.softball.domain.service;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenAtBat;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BogenScoreCalculator {

    public Map<Integer, InningRuns> calculateInningRuns(final List<SpielbogenAtBat> atBats) {
        Map<Integer, InningRuns> result = new HashMap<>();
        for (SpielbogenAtBat ab : atBats) {
            if (ab.getRunsScored() == null || ab.getRunsScored() == 0) continue;
            InningRuns existing = result.computeIfAbsent(ab.getInning(), k -> new InningRuns(0, 0));
            if (ab.getSide() == BogenSide.HOME) {
                existing.home += ab.getRunsScored();
            } else {
                existing.away += ab.getRunsScored();
            }
        }
        return result;
    }

    public static class InningRuns {
        public int home;
        public int away;

        public InningRuns(int home, int away) {
            this.home = home;
            this.away = away;
        }

        public int getHome() { return home; }
        public int getAway() { return away; }
    }
}
```

- [ ] **Step 2: BogenSheetRenderer**

```java
package com.softball.domain.service;

import com.softball.domain.model.*;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BogenSheetRenderer {

    public Map<CellKey, CellNotation> renderCells(final List<SpielbogenAtBat> atBats,
                                                   final List<SpielbogenStealingEvent> stealings,
                                                   final List<SpielbogenSubstitution> subs) {
        Map<CellKey, CellNotation> cells = new HashMap<>();

        for (SpielbogenAtBat ab : atBats) {
            CellKey key = new CellKey(ab.getSide(), ab.getSlot().getId(), ab.getInning());
            CellNotation notation = renderAtBat(ab);
            cells.merge(key, notation, this::merge);
        }

        for (SpielbogenStealingEvent st : stealings) {
            CellKey key = new CellKey(st.getSide(), st.getSlot().getId(), st.getInning());
            CellNotation existing = cells.computeIfAbsent(key, k -> new CellNotation("", false, null));
            existing.stealingArrow = new StealingArrow(st.getFromBase(), st.getToBase(), st.getType());
        }

        return cells;
    }

    private CellNotation renderAtBat(final SpielbogenAtBat ab) {
        boolean runScored = ab.getRunsScored() != null && ab.getRunsScored() > 0;
        if (Boolean.TRUE.equals(ab.getIsError()) && ab.getErrorPosition() != null) {
            return new CellNotation("E" + ab.getErrorPosition(), runScored, null);
        }
        return switch (ab.getResult()) {
            case SINGLE -> new CellNotation("1B", runScored, null);
            case DOUBLE -> new CellNotation("2B", runScored, null);
            case TRIPLE -> new CellNotation("3B", runScored, null);
            case HOMERUN -> new CellNotation("HR", true, null);
            case WALK -> new CellNotation("BB", runScored, null);
            case HIT_BY_PITCH -> new CellNotation("HP", runScored, null);
            case STRIKEOUT -> new CellNotation("K", false, null);
            case OUT -> new CellNotation(renderOutNotation(ab), false, null);
        };
    }

    private String renderOutNotation(final SpielbogenAtBat ab) {
        if (ab.getOutType() == null) return "OUT";
        if (ab.getFielderChain() != null && !ab.getFielderChain().isEmpty()) {
            String chain = String.join("-", ab.getFielderChain().stream().map(String::valueOf).toList());
            if (ab.getOutType() == OutType.DOUBLE_PLAY) return chain + " DP";
            if (ab.getOutType() == OutType.TRIPLE_PLAY) return chain + " TP";
            if (ab.getOutType() == OutType.FLY && ab.getFielderChain().size() == 1) return "F" + ab.getFielderChain().get(0);
            return chain;
        }
        return switch (ab.getOutType()) {
            case GROUNDER -> "GO";
            case FLY -> "FO";
            case FOUL -> "FOUL";
            case UNASSISTED -> "U";
            case DOUBLE_PLAY -> "DP";
            case TRIPLE_PLAY -> "TP";
            case FORCE_OUT -> "FO";
            case TAG_OUT -> "TO";
        };
    }

    private CellNotation merge(final CellNotation a, final CellNotation b) {
        // multiple at-bats in same cell — concatenate notations
        return new CellNotation(a.label + " / " + b.label, a.runScored || b.runScored, a.stealingArrow != null ? a.stealingArrow : b.stealingArrow);
    }

    public record CellKey(BogenSide side, Long slotId, Integer inning) {}

    public static class CellNotation {
        public String label;
        public boolean runScored;
        public StealingArrow stealingArrow;

        public CellNotation(String label, boolean runScored, StealingArrow stealingArrow) {
            this.label = label;
            this.runScored = runScored;
            this.stealingArrow = stealingArrow;
        }

        public String getLabel() { return label; }
        public boolean isRunScored() { return runScored; }
        public StealingArrow getStealingArrow() { return stealingArrow; }
    }

    public record StealingArrow(int fromBase, int toBase, StealingEventType type) {}
}
```

- [ ] **Step 3: Tests for both** (~10-15 tests covering each AtBatResult mapping, error notation, fielder chain notation, double-play, fly-out outfield, multiple at-bats in same cell, stealing arrow, run-scored aggregation, empty inning).

```java
// BogenScoreCalculatorTest.java — 4 tests

package com.softball.domain.service;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenAtBat;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BogenScoreCalculatorTest {

    private final BogenScoreCalculator calc = new BogenScoreCalculator();

    @Test
    void emptyAtBatsProduceEmptyMap() {
        assertThat(calc.calculateInningRuns(List.of())).isEmpty();
    }

    @Test
    void aggregatesRunsByInningAndSide() {
        SpielbogenAtBat a1 = atBat(1, BogenSide.HOME, 2);
        SpielbogenAtBat a2 = atBat(1, BogenSide.HOME, 3);
        SpielbogenAtBat a3 = atBat(2, BogenSide.AWAY, 1);
        SpielbogenAtBat a4 = atBat(1, BogenSide.AWAY, 1);

        var result = calc.calculateInningRuns(List.of(a1, a2, a3, a4));

        assertThat(result.get(1).getHome()).isEqualTo(5);
        assertThat(result.get(1).getAway()).isEqualTo(1);
        assertThat(result.get(2).getAway()).isEqualTo(1);
    }

    @Test
    void zeroRunsAreSkipped() {
        SpielbogenAtBat a = atBat(1, BogenSide.HOME, 0);
        var result = calc.calculateInningRuns(List.of(a));
        assertThat(result).isEmpty();
    }

    @Test
    void nullRunsAreSkipped() {
        SpielbogenAtBat a = new SpielbogenAtBat();
        a.setInning(1);
        a.setSide(BogenSide.HOME);
        a.setRunsScored(null);
        var result = calc.calculateInningRuns(List.of(a));
        assertThat(result).isEmpty();
    }

    private SpielbogenAtBat atBat(int inning, BogenSide side, int runs) {
        SpielbogenAtBat a = new SpielbogenAtBat();
        a.setInning(inning);
        a.setSide(side);
        a.setRunsScored(runs);
        return a;
    }
}
```

```java
// BogenSheetRendererTest.java — ~10 tests

package com.softball.domain.service;

import com.softball.domain.model.*;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BogenSheetRendererTest {

    private final BogenSheetRenderer renderer = new BogenSheetRenderer();

    @Test
    void rendersSingle() {
        var ab = build(AtBatResult.SINGLE, null, null, false, null, 0);
        var cell = renderCell(ab);
        assertThat(cell.label).isEqualTo("1B");
        assertThat(cell.runScored).isFalse();
    }

    @Test
    void rendersHomerun() {
        var ab = build(AtBatResult.HOMERUN, null, null, false, null, 1);
        var cell = renderCell(ab);
        assertThat(cell.label).isEqualTo("HR");
        assertThat(cell.runScored).isTrue();
    }

    @Test
    void rendersWalk() {
        var ab = build(AtBatResult.WALK, null, null, false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("BB");
    }

    @Test
    void rendersStrikeoutAsK() {
        var ab = build(AtBatResult.STRIKEOUT, null, null, false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("K");
    }

    @Test
    void rendersOutWithFielderChain63() {
        var ab = build(AtBatResult.OUT, OutType.GROUNDER, List.of(6, 3), false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("6-3");
    }

    @Test
    void rendersDoublePlay() {
        var ab = build(AtBatResult.OUT, OutType.DOUBLE_PLAY, List.of(6, 4, 3), false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("6-4-3 DP");
    }

    @Test
    void rendersFlyOutOutfield() {
        var ab = build(AtBatResult.OUT, OutType.FLY, List.of(8), false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("F8");
    }

    @Test
    void rendersGenericOutWhenNoDetails() {
        var ab = build(AtBatResult.OUT, null, null, false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("OUT");
    }

    @Test
    void rendersErrorWithPosition() {
        var ab = build(AtBatResult.OUT, null, null, true, 5, 0);
        assertThat(renderCell(ab).label).isEqualTo("E5");
    }

    @Test
    void rendersStealingArrow() {
        SpielbogenStealingEvent st = new SpielbogenStealingEvent();
        SpielbogenSlot slot = new SpielbogenSlot();
        slot.setId(50L);
        st.setSlot(slot);
        st.setSide(BogenSide.HOME);
        st.setInning(1);
        st.setType(StealingEventType.STOLEN_BASE);
        st.setFromBase(1);
        st.setToBase(2);

        var cells = renderer.renderCells(List.of(), List.of(st), List.of());
        var cell = cells.get(new BogenSheetRenderer.CellKey(BogenSide.HOME, 50L, 1));
        assertThat(cell).isNotNull();
        assertThat(cell.stealingArrow).isNotNull();
        assertThat(cell.stealingArrow.fromBase()).isEqualTo(1);
        assertThat(cell.stealingArrow.toBase()).isEqualTo(2);
    }

    private BogenSheetRenderer.CellNotation renderCell(final SpielbogenAtBat ab) {
        var cells = renderer.renderCells(List.of(ab), List.of(), List.of());
        return cells.get(new BogenSheetRenderer.CellKey(ab.getSide(), ab.getSlot().getId(), ab.getInning()));
    }

    private SpielbogenAtBat build(AtBatResult result, OutType outType, List<Integer> chain,
                                  boolean isError, Integer errorPos, int runs) {
        SpielbogenAtBat ab = new SpielbogenAtBat();
        SpielbogenSlot slot = new SpielbogenSlot();
        slot.setId(1L);
        ab.setSlot(slot);
        ab.setSide(BogenSide.HOME);
        ab.setInning(1);
        ab.setResult(result);
        ab.setOutType(outType);
        ab.setFielderChain(chain);
        ab.setIsError(isError);
        ab.setErrorPosition(errorPos);
        ab.setRunsScored(runs);
        return ab;
    }
}
```

- [ ] **Step 4: Run + commit**
```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='BogenScoreCalculatorTest,BogenSheetRendererTest'
```

```bash
git add backend/src/main/java/com/softball/domain/service/BogenScoreCalculator.java \
        backend/src/main/java/com/softball/domain/service/BogenSheetRenderer.java \
        backend/src/test/java/com/softball/domain/service/BogenScoreCalculatorTest.java \
        backend/src/test/java/com/softball/domain/service/BogenSheetRendererTest.java
git commit -m "🎯 BogenSheetRenderer + BogenScoreCalculator + Tests"
```

---

### Task 10: SpielbogenSheetService (Read-Aggregate)

Aggregate read endpoint that combines bogen + lineup + atbats + stealings + subs + scoreboard.

**File:** `backend/src/main/java/com/softball/application/SpielbogenSheetService.java`

```java
package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.service.BogenScoreCalculator;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.SpielbogenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class SpielbogenSheetService {

    private final SpielbogenRepository bogenRepo;
    private final SpielbogenSlotService slotService;
    private final SpielbogenScoringService scoringService;
    private final BogenScoreCalculator scoreCalc;

    public SpielbogenSheetService(final SpielbogenRepository bogenRepo,
                                  final SpielbogenSlotService slotService,
                                  final SpielbogenScoringService scoringService,
                                  final BogenScoreCalculator scoreCalc) {
        this.bogenRepo = bogenRepo;
        this.slotService = slotService;
        this.scoringService = scoringService;
        this.scoreCalc = scoreCalc;
    }

    public record SheetData(
        Spielbogen bogen,
        List<SpielbogenSlot> homeLineup,
        List<SpielbogenSlot> awayLineup,
        List<SpielbogenAtBat> homeAtBats,
        List<SpielbogenAtBat> awayAtBats,
        List<SpielbogenStealingEvent> stealings,
        List<SpielbogenSubstitution> subs,
        Map<Integer, BogenScoreCalculator.InningRuns> inningRuns
    ) {}

    @Transactional(readOnly = true)
    public SheetData getSheet(final Long bogenId) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));
        var lineup = slotService.getLineup(bogenId);

        var homeAtBats = scoringService.findAtBats(bogenId, BogenSide.HOME);
        var awayAtBats = scoringService.findAtBats(bogenId, BogenSide.AWAY);

        var allAtBats = new java.util.ArrayList<SpielbogenAtBat>();
        allAtBats.addAll(homeAtBats);
        allAtBats.addAll(awayAtBats);

        return new SheetData(
            bogen,
            lineup.home(),
            lineup.away(),
            homeAtBats,
            awayAtBats,
            scoringService.findStealingEvents(bogenId),
            scoringService.findSubstitutions(bogenId),
            scoreCalc.calculateInningRuns(allAtBats)
        );
    }
}
```

- [ ] **Step 1: Create file**
- [ ] **Step 2: Compile**
- [ ] **Step 3: Commit**
```bash
git add backend/src/main/java/com/softball/application/SpielbogenSheetService.java
git commit -m "🧠 SpielbogenSheetService — Read-Aggregate für Sheet-Endpoint"
```

---

### Task 11: DTOs for Scoring

Create all scoring DTO records under `backend/src/main/java/com/softball/adapter/dto/`.

```java
// BogenBaseStateDto.java
package com.softball.adapter.dto;

public record BogenBaseStateDto(Long firstSlotId, Long secondSlotId, Long thirdSlotId) {}
```

```java
// RecordAtBatRequest.java
package com.softball.adapter.dto;

import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.OutType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record RecordAtBatRequest(
    @NotNull BogenSide side,
    @NotNull Long slotId,
    @NotNull @Min(1) Integer inning,
    @NotNull AtBatResult result,
    OutType outType,
    List<Integer> fielderChain,
    Boolean isError,
    Integer errorPosition,
    @Min(0) Integer runsScored,
    @Min(0) Integer rbi,
    BogenBaseStateDto baseStateAfter
) {}
```

```java
// SpielbogenAtBatResponse.java
package com.softball.adapter.dto;

import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.OutType;
import com.softball.domain.model.SpielbogenAtBat;

import java.time.Instant;
import java.util.List;

public record SpielbogenAtBatResponse(
    Long id,
    Long bogenId,
    Long slotId,
    BogenSide side,
    Integer sequence,
    Integer inning,
    AtBatResult result,
    OutType outType,
    List<Integer> fielderChain,
    Boolean isError,
    Integer errorPosition,
    Integer runsScored,
    Integer rbi,
    BogenBaseStateDto baseStateAfter,
    Instant createdAt
) {
    public static SpielbogenAtBatResponse from(final SpielbogenAtBat a) {
        return new SpielbogenAtBatResponse(
            a.getId(),
            a.getBogen() != null ? a.getBogen().getId() : null,
            a.getSlot() != null ? a.getSlot().getId() : null,
            a.getSide(),
            a.getSequence(),
            a.getInning(),
            a.getResult(),
            a.getOutType(),
            a.getFielderChain(),
            a.getIsError(),
            a.getErrorPosition(),
            a.getRunsScored(),
            a.getRbi(),
            a.getBaseStateAfter() != null ? new BogenBaseStateDto(
                a.getBaseStateAfter().getFirstSlotId(),
                a.getBaseStateAfter().getSecondSlotId(),
                a.getBaseStateAfter().getThirdSlotId()
            ) : null,
            a.getCreatedAt()
        );
    }
}
```

```java
// RecordStealingEventRequest.java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.StealingEventType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RecordStealingEventRequest(
    @NotNull BogenSide side,
    @NotNull Long slotId,
    @NotNull @Min(1) Integer inning,
    @NotNull StealingEventType type,
    @NotNull @Min(1) @Max(3) Integer fromBase,
    @NotNull @Min(2) @Max(4) Integer toBase
) {}
```

```java
// StealingEventResponse.java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenStealingEvent;
import com.softball.domain.model.StealingEventType;

import java.time.Instant;

public record StealingEventResponse(
    Long id,
    Long bogenId,
    Long slotId,
    BogenSide side,
    Integer inning,
    StealingEventType type,
    Integer fromBase,
    Integer toBase,
    Instant createdAt
) {
    public static StealingEventResponse from(final SpielbogenStealingEvent s) {
        return new StealingEventResponse(
            s.getId(),
            s.getBogen() != null ? s.getBogen().getId() : null,
            s.getSlot() != null ? s.getSlot().getId() : null,
            s.getSide(),
            s.getInning(),
            s.getType(),
            s.getFromBase(),
            s.getToBase(),
            s.getCreatedAt()
        );
    }
}
```

```java
// RecordSubstitutionRequest.java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RecordSubstitutionRequest(
    @NotNull BogenSide side,
    @NotNull Long slotId,
    @NotNull @Min(1) Integer inning,
    @NotBlank String playerInName,
    Boolean pinchHitter
) {}
```

```java
// SubstitutionResponse.java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSubstitution;

import java.time.Instant;

public record SubstitutionResponse(
    Long id,
    Long bogenId,
    Long slotId,
    BogenSide side,
    Integer inning,
    String playerOutName,
    String playerInName,
    Boolean isPinchHitter,
    Instant createdAt
) {
    public static SubstitutionResponse from(final SpielbogenSubstitution s) {
        return new SubstitutionResponse(
            s.getId(),
            s.getBogen() != null ? s.getBogen().getId() : null,
            s.getSlot() != null ? s.getSlot().getId() : null,
            s.getSide(),
            s.getInning(),
            s.getPlayerOutName(),
            s.getPlayerInName(),
            s.getIsPinchHitter(),
            s.getCreatedAt()
        );
    }
}
```

```java
// BogenSheetResponse.java
package com.softball.adapter.dto;

import java.util.List;
import java.util.Map;

public record BogenSheetResponse(
    SpielbogenResponse meta,
    List<SpielbogenSlotResponse> homeLineup,
    List<SpielbogenSlotResponse> awayLineup,
    List<SpielbogenAtBatResponse> homeAtBats,
    List<SpielbogenAtBatResponse> awayAtBats,
    List<StealingEventResponse> stealingEvents,
    List<SubstitutionResponse> substitutions,
    Map<Integer, InningRuns> inningRuns
) {
    public record InningRuns(int home, int away) {}
}
```

- [ ] **Compile + commit**
```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
git add backend/src/main/java/com/softball/adapter/dto/BogenBaseStateDto.java \
        backend/src/main/java/com/softball/adapter/dto/RecordAtBatRequest.java \
        backend/src/main/java/com/softball/adapter/dto/SpielbogenAtBatResponse.java \
        backend/src/main/java/com/softball/adapter/dto/RecordStealingEventRequest.java \
        backend/src/main/java/com/softball/adapter/dto/StealingEventResponse.java \
        backend/src/main/java/com/softball/adapter/dto/RecordSubstitutionRequest.java \
        backend/src/main/java/com/softball/adapter/dto/SubstitutionResponse.java \
        backend/src/main/java/com/softball/adapter/dto/BogenSheetResponse.java
git commit -m "📦 Spielbogen Scoring DTOs"
```

---

### Task 12: Extend SpielbogenController with Scoring Endpoints

Append to existing `SpielbogenController.java`:

```java
@PostMapping("/{id}/at-bats")
@ResponseStatus(HttpStatus.CREATED)
public SpielbogenAtBatResponse recordAtBat(@PathVariable Long id,
                                            @Valid @RequestBody RecordAtBatRequest req) {
    com.softball.domain.model.BogenBaseState bs = req.baseStateAfter() != null
        ? new com.softball.domain.model.BogenBaseState(
            req.baseStateAfter().firstSlotId(),
            req.baseStateAfter().secondSlotId(),
            req.baseStateAfter().thirdSlotId())
        : null;
    var saved = scoringService.recordAtBat(id, req.side(), req.slotId(), req.inning(),
        req.result(), req.outType(), req.fielderChain(),
        req.isError(), req.errorPosition(),
        req.runsScored(), req.rbi(), bs);
    return SpielbogenAtBatResponse.from(saved);
}

@GetMapping("/{id}/at-bats")
public List<SpielbogenAtBatResponse> getAtBats(@PathVariable Long id,
                                                @RequestParam(required = false) BogenSide side) {
    return scoringService.findAtBats(id, side).stream().map(SpielbogenAtBatResponse::from).toList();
}

@DeleteMapping("/{id}/at-bats/last")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void undoLast(@PathVariable Long id, @RequestParam BogenSide side) {
    scoringService.undoLast(id, side);
}

@PostMapping("/{id}/stealing-events")
@ResponseStatus(HttpStatus.CREATED)
public StealingEventResponse recordStealing(@PathVariable Long id,
                                             @Valid @RequestBody RecordStealingEventRequest req) {
    var saved = scoringService.recordStealingEvent(id, req.side(), req.slotId(), req.inning(),
        req.type(), req.fromBase(), req.toBase());
    return StealingEventResponse.from(saved);
}

@DeleteMapping("/{id}/stealing-events/{eventId}")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void deleteStealing(@PathVariable Long id, @PathVariable Long eventId) {
    scoringService.deleteStealingEvent(id, eventId);
}

@PostMapping("/{id}/substitutions")
@ResponseStatus(HttpStatus.CREATED)
public SubstitutionResponse recordSubstitution(@PathVariable Long id,
                                                @Valid @RequestBody RecordSubstitutionRequest req) {
    boolean pinch = req.pinchHitter() != null && req.pinchHitter();
    var saved = scoringService.recordSubstitution(id, req.side(), req.slotId(), req.inning(),
        req.playerInName(), pinch);
    return SubstitutionResponse.from(saved);
}

@DeleteMapping("/{id}/substitutions/{subId}")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void deleteSubstitution(@PathVariable Long id, @PathVariable Long subId) {
    scoringService.deleteSubstitution(id, subId);
}

@PostMapping("/{id}/switch-side")
public SpielbogenResponse switchSide(@PathVariable Long id) {
    return SpielbogenResponse.from(scoringService.switchSide(id));
}

@GetMapping("/{id}/sheet")
public BogenSheetResponse getSheet(@PathVariable Long id) {
    var data = sheetService.getSheet(id);
    return new BogenSheetResponse(
        SpielbogenResponse.from(data.bogen()),
        data.homeLineup().stream().map(SpielbogenSlotResponse::from).toList(),
        data.awayLineup().stream().map(SpielbogenSlotResponse::from).toList(),
        data.homeAtBats().stream().map(SpielbogenAtBatResponse::from).toList(),
        data.awayAtBats().stream().map(SpielbogenAtBatResponse::from).toList(),
        data.stealings().stream().map(StealingEventResponse::from).toList(),
        data.subs().stream().map(SubstitutionResponse::from).toList(),
        data.inningRuns().entrySet().stream().collect(java.util.stream.Collectors.toMap(
            java.util.Map.Entry::getKey,
            e -> new BogenSheetResponse.InningRuns(e.getValue().getHome(), e.getValue().getAway())
        ))
    );
}
```

Add fields + constructor parameters to existing `SpielbogenController`:
```java
private final SpielbogenScoringService scoringService;
private final SpielbogenSheetService sheetService;
```

Update constructor to accept these via DI.

Also add imports for new types: `BogenSide`, `RecordAtBatRequest`, `SpielbogenAtBatResponse`, `RecordStealingEventRequest`, `StealingEventResponse`, `RecordSubstitutionRequest`, `SubstitutionResponse`, `BogenSheetResponse`.

- [ ] **Compile + run all tests + commit**
```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
git add backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java
git commit -m "🌐 SpielbogenController erweitert: AtBats + Stealing + Subs + Sheet + Switch-Side"
```

---

### Task 13: Integration Test for Scoring

Create `backend/src/test/java/com/softball/integration/SpielbogenScoringIntegrationTest.java`. Test full flow: create bogen → set lineups → start → record several at-bats → switch side → undo last → end → verify scores aggregated correctly.

(For brevity in this plan, use the same Testcontainers + MockMvc pattern as `SpielbogenIntegrationTest.java`. Full code intentionally omitted — implementer should follow the pattern from Phase 1's Task 19.)

- [ ] **Step 1: Create test with at least 5 scenarios:**
  - Full flow: create + lineups + start + record 3 at-bats + switch + end. Verify final scores.
  - recordAtBat rejects DRAFT bogen.
  - recordAtBat rejects fielderChain values out of range (e.g. `[0, 3]`).
  - undoLast deletes last at-bat and rolls back homeRuns.
  - GET /sheet returns aggregated data.

- [ ] **Step 2: Run all tests**
```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```

- [ ] **Step 3: Commit**
```bash
git commit -am "🧪 SpielbogenScoringIntegrationTest"
```

---

## Frontend Tasks

### Task 14: Frontend Scoring Types + API Client

Add to `frontend/src/types/index.ts`:

```typescript
// Scoring types
export type AtBatResult = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN' | 'WALK' | 'HIT_BY_PITCH' | 'STRIKEOUT' | 'OUT'
export type StealingEventType = 'STOLEN_BASE' | 'CAUGHT_STEALING' | 'OUT_ON_PLAY'
export type OutType = 'GROUNDER' | 'FLY' | 'FOUL' | 'UNASSISTED' | 'DOUBLE_PLAY' | 'TRIPLE_PLAY' | 'FORCE_OUT' | 'TAG_OUT'

export interface BogenBaseStateDto {
  firstSlotId: number | null
  secondSlotId: number | null
  thirdSlotId: number | null
}

export interface SpielbogenAtBatResponse {
  id: number
  bogenId: number
  slotId: number
  side: BogenSide
  sequence: number
  inning: number
  result: AtBatResult
  outType: OutType | null
  fielderChain: number[] | null
  isError: boolean | null
  errorPosition: number | null
  runsScored: number
  rbi: number
  baseStateAfter: BogenBaseStateDto | null
  createdAt: string
}

export interface RecordAtBatRequest {
  side: BogenSide
  slotId: number
  inning: number
  result: AtBatResult
  outType?: OutType
  fielderChain?: number[]
  isError?: boolean
  errorPosition?: number
  runsScored?: number
  rbi?: number
  baseStateAfter?: BogenBaseStateDto
}

export interface StealingEventResponse {
  id: number
  bogenId: number
  slotId: number
  side: BogenSide
  inning: number
  type: StealingEventType
  fromBase: number
  toBase: number
  createdAt: string
}

export interface RecordStealingEventRequest {
  side: BogenSide
  slotId: number
  inning: number
  type: StealingEventType
  fromBase: number
  toBase: number
}

export interface SubstitutionResponse {
  id: number
  bogenId: number
  slotId: number
  side: BogenSide
  inning: number
  playerOutName: string
  playerInName: string
  isPinchHitter: boolean
  createdAt: string
}

export interface RecordSubstitutionRequest {
  side: BogenSide
  slotId: number
  inning: number
  playerInName: string
  pinchHitter?: boolean
}

export interface BogenSheetResponse {
  meta: SpielbogenResponse
  homeLineup: SpielbogenSlotResponse[]
  awayLineup: SpielbogenSlotResponse[]
  homeAtBats: SpielbogenAtBatResponse[]
  awayAtBats: SpielbogenAtBatResponse[]
  stealingEvents: StealingEventResponse[]
  substitutions: SubstitutionResponse[]
  inningRuns: Record<number, { home: number; away: number }>
}
```

Add to `frontend/src/api/client.ts`:

```typescript
// Scoring
export async function recordAtBat(bogenId: number, req: RecordAtBatRequest): Promise<SpielbogenAtBatResponse> {
  return request<SpielbogenAtBatResponse>(`/spielbogen/${bogenId}/at-bats`, {
    method: 'POST', body: JSON.stringify(req)
  })
}

export async function getAtBats(bogenId: number, side?: BogenSide): Promise<SpielbogenAtBatResponse[]> {
  const qs = side ? `?side=${side}` : ''
  return request<SpielbogenAtBatResponse[]>(`/spielbogen/${bogenId}/at-bats${qs}`)
}

export async function undoLastAtBat(bogenId: number, side: BogenSide): Promise<void> {
  return request<void>(`/spielbogen/${bogenId}/at-bats/last?side=${side}`, { method: 'DELETE' })
}

export async function recordStealingEvent(bogenId: number, req: RecordStealingEventRequest): Promise<StealingEventResponse> {
  return request<StealingEventResponse>(`/spielbogen/${bogenId}/stealing-events`, {
    method: 'POST', body: JSON.stringify(req)
  })
}

export async function recordSubstitution(bogenId: number, req: RecordSubstitutionRequest): Promise<SubstitutionResponse> {
  return request<SubstitutionResponse>(`/spielbogen/${bogenId}/substitutions`, {
    method: 'POST', body: JSON.stringify(req)
  })
}

export async function switchSpielbogenSide(bogenId: number): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${bogenId}/switch-side`, { method: 'POST' })
}

export async function getSpielbogenSheet(bogenId: number): Promise<BogenSheetResponse> {
  return request<BogenSheetResponse>(`/spielbogen/${bogenId}/sheet`)
}
```

Add types to existing import block at top of `client.ts`.

- [ ] Build + commit
```bash
cd frontend && npm run build
git commit -am "🔠 Frontend Scoring-Types + API-Wrappers"
```

---

### Task 15: useSpielbogenScoring Hook

Create `frontend/src/hooks/useSpielbogenScoring.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { BogenSheetResponse, RecordAtBatRequest, RecordStealingEventRequest, RecordSubstitutionRequest, BogenSide } from '@/types'

export function useSpielbogenScoring(bogenId: number | null) {
  const [sheet, setSheet] = useState<BogenSheetResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (bogenId == null) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getSpielbogenSheet(bogenId)
      setSheet(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [bogenId])

  useEffect(() => { reload() }, [reload])

  const recordAtBat = useCallback(async (req: RecordAtBatRequest) => {
    if (bogenId == null) return
    await api.recordAtBat(bogenId, req)
    await reload()
  }, [bogenId, reload])

  const recordStealing = useCallback(async (req: RecordStealingEventRequest) => {
    if (bogenId == null) return
    await api.recordStealingEvent(bogenId, req)
    await reload()
  }, [bogenId, reload])

  const recordSubstitution = useCallback(async (req: RecordSubstitutionRequest) => {
    if (bogenId == null) return
    await api.recordSubstitution(bogenId, req)
    await reload()
  }, [bogenId, reload])

  const undoLast = useCallback(async (side: BogenSide) => {
    if (bogenId == null) return
    await api.undoLastAtBat(bogenId, side)
    await reload()
  }, [bogenId, reload])

  const switchSide = useCallback(async () => {
    if (bogenId == null) return
    await api.switchSpielbogenSide(bogenId)
    await reload()
  }, [bogenId, reload])

  return { sheet, loading, error, reload, recordAtBat, recordStealing, recordSubstitution, undoLast, switchSide }
}
```

- [ ] Build + commit

---

### Task 16: Frontend BogenSheetRenderer (TS port)

Create `frontend/src/utils/bogenSheetRenderer.ts` — TypeScript port of the backend's BogenSheetRenderer for client-side rendering.

```typescript
import type { SpielbogenAtBatResponse, StealingEventResponse, BogenSide } from '@/types'

export interface CellNotation {
  label: string
  runScored: boolean
  stealingArrow: { fromBase: number; toBase: number; type: string } | null
}

export type CellMap = Map<string, CellNotation>

function cellKey(side: BogenSide, slotId: number, inning: number): string {
  return `${side}|${slotId}|${inning}`
}

export function renderCells(
  atBats: SpielbogenAtBatResponse[],
  stealings: StealingEventResponse[]
): CellMap {
  const cells: CellMap = new Map()

  for (const ab of atBats) {
    const key = cellKey(ab.side, ab.slotId, ab.inning)
    const notation = renderAtBat(ab)
    const existing = cells.get(key)
    if (existing) {
      cells.set(key, {
        label: existing.label + ' / ' + notation.label,
        runScored: existing.runScored || notation.runScored,
        stealingArrow: existing.stealingArrow ?? notation.stealingArrow,
      })
    } else {
      cells.set(key, notation)
    }
  }

  for (const st of stealings) {
    const key = cellKey(st.side, st.slotId, st.inning)
    const existing = cells.get(key) ?? { label: '', runScored: false, stealingArrow: null }
    existing.stealingArrow = { fromBase: st.fromBase, toBase: st.toBase, type: st.type }
    cells.set(key, existing)
  }

  return cells
}

function renderAtBat(ab: SpielbogenAtBatResponse): CellNotation {
  const runScored = (ab.runsScored ?? 0) > 0
  if (ab.isError && ab.errorPosition != null) {
    return { label: `E${ab.errorPosition}`, runScored, stealingArrow: null }
  }
  switch (ab.result) {
    case 'SINGLE': return { label: '1B', runScored, stealingArrow: null }
    case 'DOUBLE': return { label: '2B', runScored, stealingArrow: null }
    case 'TRIPLE': return { label: '3B', runScored, stealingArrow: null }
    case 'HOMERUN': return { label: 'HR', runScored: true, stealingArrow: null }
    case 'WALK': return { label: 'BB', runScored, stealingArrow: null }
    case 'HIT_BY_PITCH': return { label: 'HP', runScored, stealingArrow: null }
    case 'STRIKEOUT': return { label: 'K', runScored: false, stealingArrow: null }
    case 'OUT': return { label: renderOut(ab), runScored: false, stealingArrow: null }
  }
}

function renderOut(ab: SpielbogenAtBatResponse): string {
  if (!ab.outType) return 'OUT'
  if (ab.fielderChain && ab.fielderChain.length > 0) {
    const chain = ab.fielderChain.join('-')
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
}
```

- [ ] Build + commit

---

### Task 17-22: SpielbogenPage UI Components

These are the substantial frontend components: SpielbogenPage container, BogenScoreboard, BogenActionButtons, OutDetailDrawer (mini-field), LastAtBatPreview, SideToggle, BogenDiamondView, RflSheetDrawer, DiamondCell.

Given the scale and similarity to existing scoring page patterns, the implementer should:
1. Read the existing `frontend/src/components/scoring/ScoringPage.tsx` to understand structure
2. Read `DiamondView.tsx`, `ActionButtons.tsx`, `CorrectionSheet.tsx` for visual patterns
3. Build new components in `frontend/src/components/spielbogen/` following the spec UX-Verbesserungen section

**Key UX rules from spec:**
- Out-Detail flow: Tap AUS → Mini-Feld-SVG drawer → tap position → Sub-Modal with 3 buttons (default highlighted "Wirft zu 1B X-3", "Solo-Out", "Double Play X-Y-3", "Error EX") + Skip-Button "Allgemein OUT"
- Side-Switch is **soft**: at 3 outs, Toast appears with confirm button → calls switchSide endpoint
- LastAtBatPreview always visible: shows last at-bat as `#3 Lara · F8 — Fly Out, gefangen von CF` + Undo button
- Stealing button enabled only when runners on base (in BogenScoreboard.runners — must be tracked client-side from baseStateAfter of last at-bat)
- 3-tier action layout: Tier 1 (TREFFER/STRIKEOUT/AUS), Tier 2 (WALK/HBP), Tier 3 (Stealing/More)
- More-menu (3-dot) opens ResponsiveSheet with: Auswechseln / Cheatsheet / Spiel beenden / Bogen löschen
- RflSheetDrawer: Vaul drawer 90vh, side-toggle pill at top (HEIM/GAST), one side visible at a time, table with rows + diamond cells, "erzielte Runs" footer
- DiamondCell: SVG, navy-700 strokes 1.5px, paths only for present at-bats (Single = home→1B line, Double = home→1B→2B, etc.), HR = full diamond filled, run-scored = schraffur background, stealing arrow = red

Each component should be its own commit with `npm run build` green.

For Task 17-22, dispatch a substantial implementer that will iterate through these components. The plan provides full UX intent. Implementer has latitude on exact pixel-level styling.

**Required deliverables for Phase 2 frontend:**
- `SpielbogenPage.tsx` (default export, route `/spielbogen/:id`)
- All sub-components listed above
- Update `App.tsx` to add route `{ path: '/spielbogen/:id', element: <LazySpielbogenPage />, errorElement: <ChunkErrorBoundary /> }`
- `npm run build` and `npm run lint` both green
- Manual smoke test: create bogen via wizard, navigate to scoring page, tap a few action buttons, see updates

- [ ] **Commit each component separately** with descriptive messages.

---

### Task 23: Manual E2E Test

Run backend + frontend, walk through:
1. New bogen via wizard (already works from Phase 1)
2. Scoring page opens at `/spielbogen/:id`
3. Tap TREFFER → Single → at-bat recorded, last-at-bat preview shows "1B"
4. Tap AUS → mini-field drawer → tap SS → "Wirft zu 1B (6-3)" → recorded, preview shows "6-3"
5. Tap STRIKEOUT → recorded "K"
6. Switch side after 3 outs (toast appears) → switch
7. Open sheet drawer → see notation in cells
8. Tap UNDO → last at-bat reverts
9. End game → DONE state

Commit on success:
```bash
git commit --allow-empty -m "✅ Spielbogen Phase 2 Scoring fertig"
```

---

## Self-Review Checklist

- [ ] Migration V20 applied
- [ ] All 3 scoring tables exist with constraints + indexes
- [ ] Domain models + ports + adapters + mappers + spring repos all in place
- [ ] SpielbogenScoringService with TDD (12+ tests)
- [ ] BogenSheetRenderer with TDD (10+ tests)
- [ ] BogenScoreCalculator with TDD (4 tests)
- [ ] All scoring REST endpoints
- [ ] Frontend scoring types + API client
- [ ] useSpielbogenScoring hook
- [ ] BogenSheetRenderer TS port
- [ ] All Phase 2 UI components
- [ ] /spielbogen/:id route works
- [ ] Backend tests all green: `./mvnw test -s .mvn/local-settings.xml`
- [ ] Frontend build + lint green
- [ ] Manual E2E flow completes

## Out of Scope (Phase 3)

- PDF export (jsPDF rendering of RFL sheet)
- Liga-Result registration endpoint
- Cheatsheet drawer
- copyFromGameDay UI in wizard (backend done, but no frontend yet)
