# Spielbogen Phase 1 Implementation Plan — Backend + Liste + Wizard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data foundation and management UI for Spielbogen — a standalone scoring tool for foreign Liga games. Phase 1 produces working CRUD + Wizard. Scoring (Phase 2) and PDF/Liga-Sync (Phase 3) follow in separate plans.

**Architecture:** New Onion-/Hexagonal slice fully decoupled from existing scoring tables. New domain models (`Spielbogen`, `SpielbogenSlot`), repository ports, JPA adapters, mappers. Application services orchestrate. REST endpoints under `/api/spielbogen/*`. Frontend gets a new top-nav tab `Spielbogen` with list page + 3-step wizard.

**Tech Stack:** Spring Boot 3.4.3 + Java 21, JPA/Hibernate, Flyway, JUnit 5 + Mockito + Testcontainers (PostgreSQL). React 19 + Vite + TypeScript, Tailwind v4, vaul (for later sheet drawer in Phase 2). Backend build: `./mvnw -s .mvn/local-settings.xml`. Frontend: `npm run build` / `npm run lint`.

**Spec reference:** `docs/superpowers/specs/2026-04-30-spielbogen-design.md`

---

## File Structure

### Backend (new files)

**Domain (no Spring/JPA imports):**
- `backend/src/main/java/com/softball/domain/model/Spielbogen.java`
- `backend/src/main/java/com/softball/domain/model/SpielbogenSlot.java`
- `backend/src/main/java/com/softball/domain/model/BogenSide.java` (enum)
- `backend/src/main/java/com/softball/domain/model/BogenStatus.java` (enum)
- `backend/src/main/java/com/softball/domain/model/OutType.java` (enum)
- `backend/src/main/java/com/softball/domain/port/out/SpielbogenRepository.java`
- `backend/src/main/java/com/softball/domain/port/out/SpielbogenSlotRepository.java`
- `backend/src/main/java/com/softball/domain/service/BogenLineupValidator.java`

**Adapter persistence:**
- `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenEntity.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenSlotEntity.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenRepository.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenSlotRepository.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenMapper.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenSlotMapper.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenRepositoryAdapter.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenSlotRepositoryAdapter.java`

**Application services:**
- `backend/src/main/java/com/softball/application/SpielbogenSlotService.java`
- `backend/src/main/java/com/softball/application/SpielbogenService.java`

**Adapter web (REST):**
- `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java`

**DTOs:**
- `backend/src/main/java/com/softball/adapter/dto/CreateSpielbogenRequest.java`
- `backend/src/main/java/com/softball/adapter/dto/UpdateSpielbogenRequest.java`
- `backend/src/main/java/com/softball/adapter/dto/SpielbogenResponse.java`
- `backend/src/main/java/com/softball/adapter/dto/SpielbogenListResponse.java`
- `backend/src/main/java/com/softball/adapter/dto/SetLineupRequest.java`
- `backend/src/main/java/com/softball/adapter/dto/UpdateSlotRequest.java`
- `backend/src/main/java/com/softball/adapter/dto/SpielbogenSlotResponse.java`
- `backend/src/main/java/com/softball/adapter/dto/SpielbogenLineupResponse.java`
- `backend/src/main/java/com/softball/adapter/dto/EndGameRequest.java`
- `backend/src/main/java/com/softball/adapter/dto/CopyFromGameDayRequest.java`

**Migration:**
- `backend/src/main/resources/db/migration/V19__create_spielbogen_tables.sql`

**Tests:**
- `backend/src/test/java/com/softball/domain/service/BogenLineupValidatorTest.java`
- `backend/src/test/java/com/softball/application/SpielbogenSlotServiceTest.java`
- `backend/src/test/java/com/softball/application/SpielbogenServiceTest.java`
- `backend/src/test/java/com/softball/integration/SpielbogenIntegrationTest.java`

### Frontend (new files)

- `frontend/src/components/spielbogen/SpielbogenList.tsx`
- `frontend/src/components/spielbogen/SpielbogenWizard.tsx`
- `frontend/src/components/spielbogen/WizardStepMeta.tsx`
- `frontend/src/components/spielbogen/WizardStepLineup.tsx`
- `frontend/src/components/spielbogen/WizardStepReview.tsx`
- `frontend/src/components/spielbogen/SlotEditor.tsx`
- `frontend/src/hooks/useSpielbogenList.ts`
- `frontend/src/hooks/useSpielbogen.ts`
- `frontend/src/hooks/useGameDayLineupCopy.ts`
- `frontend/src/utils/spielbogenDraft.ts` (localStorage helpers)

### Frontend (modified files)

- `frontend/src/App.tsx` — add 3 lazy routes
- `frontend/src/components/layout/Layout.tsx` — add tab `{ path: '/spielbogen', label: 'Spielbogen', shortLabel: 'Bogen' }`
- `frontend/src/types/index.ts` — add Spielbogen-related types
- `frontend/src/api/client.ts` — add api wrappers

---

## Backend Tasks

### Task 1: Migration V19 — Create Spielbogen Tables

**Files:**
- Create: `backend/src/main/resources/db/migration/V19__create_spielbogen_tables.sql`

- [ ] **Step 1: Create migration file with full schema**

```sql
CREATE TABLE spielbogen (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    location VARCHAR(200),
    home_team_name VARCHAR(100) NOT NULL,
    away_team_name VARCHAR(100) NOT NULL,
    season_id BIGINT REFERENCES seasons(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    current_inning INTEGER NOT NULL DEFAULT 1,
    current_side VARCHAR(10) NOT NULL DEFAULT 'AWAY',
    home_runs INTEGER NOT NULL DEFAULT 0,
    away_runs INTEGER NOT NULL DEFAULT 0,
    league_result_id BIGINT REFERENCES league_result(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    CONSTRAINT spielbogen_status_check CHECK (status IN ('DRAFT', 'LIVE', 'DONE')),
    CONSTRAINT spielbogen_side_check CHECK (current_side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_runs_nonneg CHECK (home_runs >= 0 AND away_runs >= 0)
);

CREATE INDEX idx_spielbogen_season ON spielbogen(season_id);
CREATE INDEX idx_spielbogen_status ON spielbogen(status);
CREATE INDEX idx_spielbogen_date_desc ON spielbogen(date DESC);

CREATE TABLE spielbogen_slot (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    slot INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(10),
    batting_order INTEGER NOT NULL,
    CONSTRAINT spielbogen_slot_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_slot_slot_range CHECK (slot BETWEEN 1 AND 10),
    CONSTRAINT spielbogen_slot_order_range CHECK (batting_order BETWEEN 1 AND 10),
    UNIQUE (bogen_id, side, slot),
    UNIQUE (bogen_id, side, batting_order)
);

CREATE INDEX idx_spielbogen_slot_bogen_side ON spielbogen_slot(bogen_id, side);
```

> **Note:** Phase 1 only creates `spielbogen` and `spielbogen_slot`. Tables for at_bat / stealing_event / substitution arrive in Phase 2.

- [ ] **Step 2: Verify migration runs by starting backend locally**

```bash
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
```

Expected: log shows `Successfully applied 1 migration to schema "public", now at version v19 (execution time PT...)`. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V19__create_spielbogen_tables.sql
git commit -m "🗄️ Migration V19 — spielbogen + spielbogen_slot Tabellen"
```

---

### Task 2: Domain Enums

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/BogenSide.java`
- Create: `backend/src/main/java/com/softball/domain/model/BogenStatus.java`
- Create: `backend/src/main/java/com/softball/domain/model/OutType.java`

- [ ] **Step 1: Create BogenSide enum**

```java
package com.softball.domain.model;

public enum BogenSide {
    HOME, AWAY
}
```

- [ ] **Step 2: Create BogenStatus enum**

```java
package com.softball.domain.model;

public enum BogenStatus {
    DRAFT, LIVE, DONE
}
```

- [ ] **Step 3: Create OutType enum**

```java
package com.softball.domain.model;

public enum OutType {
    GROUNDER, FLY, FOUL, UNASSISTED, DOUBLE_PLAY, TRIPLE_PLAY, FORCE_OUT, TAG_OUT
}
```

- [ ] **Step 4: Build to verify**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/BogenSide.java \
        backend/src/main/java/com/softball/domain/model/BogenStatus.java \
        backend/src/main/java/com/softball/domain/model/OutType.java
git commit -m "🎯 Spielbogen Domain-Enums (BogenSide, BogenStatus, OutType)"
```

---

### Task 3: Domain Model — Spielbogen

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/Spielbogen.java`

- [ ] **Step 1: Create Spielbogen domain class**

```java
package com.softball.domain.model;

import java.time.Instant;
import java.time.LocalDate;

public class Spielbogen {
    private Long id;
    private LocalDate date;
    private String location;
    private String homeTeamName;
    private String awayTeamName;
    private Season season;
    private BogenStatus status;
    private Integer currentInning;
    private BogenSide currentSide;
    private Integer homeRuns;
    private Integer awayRuns;
    private LeagueResult leagueResult;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant endedAt;

    public Spielbogen() {}

    public Spielbogen(final LocalDate date, final String location,
                      final String homeTeamName, final String awayTeamName,
                      final Season season) {
        this.date = date;
        this.location = location;
        this.homeTeamName = homeTeamName;
        this.awayTeamName = awayTeamName;
        this.season = season;
        this.status = BogenStatus.DRAFT;
        this.currentInning = 1;
        this.currentSide = BogenSide.AWAY;
        this.homeRuns = 0;
        this.awayRuns = 0;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LocalDate getDate() { return date; }
    public void setDate(final LocalDate date) { this.date = date; }
    public String getLocation() { return location; }
    public void setLocation(final String location) { this.location = location; }
    public String getHomeTeamName() { return homeTeamName; }
    public void setHomeTeamName(final String homeTeamName) { this.homeTeamName = homeTeamName; }
    public String getAwayTeamName() { return awayTeamName; }
    public void setAwayTeamName(final String awayTeamName) { this.awayTeamName = awayTeamName; }
    public Season getSeason() { return season; }
    public void setSeason(final Season season) { this.season = season; }
    public BogenStatus getStatus() { return status; }
    public void setStatus(final BogenStatus status) { this.status = status; }
    public Integer getCurrentInning() { return currentInning; }
    public void setCurrentInning(final Integer currentInning) { this.currentInning = currentInning; }
    public BogenSide getCurrentSide() { return currentSide; }
    public void setCurrentSide(final BogenSide currentSide) { this.currentSide = currentSide; }
    public Integer getHomeRuns() { return homeRuns; }
    public void setHomeRuns(final Integer homeRuns) { this.homeRuns = homeRuns; }
    public Integer getAwayRuns() { return awayRuns; }
    public void setAwayRuns(final Integer awayRuns) { this.awayRuns = awayRuns; }
    public LeagueResult getLeagueResult() { return leagueResult; }
    public void setLeagueResult(final LeagueResult leagueResult) { this.leagueResult = leagueResult; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(final Instant endedAt) { this.endedAt = endedAt; }
}
```

- [ ] **Step 2: Build to verify**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/Spielbogen.java
git commit -m "🎯 Spielbogen Domain-Model"
```

---

### Task 4: Domain Model — SpielbogenSlot

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/SpielbogenSlot.java`

- [ ] **Step 1: Create SpielbogenSlot domain class**

```java
package com.softball.domain.model;

public class SpielbogenSlot {
    private Long id;
    private Spielbogen bogen;
    private BogenSide side;
    private Integer slot;
    private String name;
    private String position;
    private Integer battingOrder;

    public SpielbogenSlot() {}

    public SpielbogenSlot(final Spielbogen bogen, final BogenSide side,
                          final Integer slot, final String name,
                          final String position, final Integer battingOrder) {
        this.bogen = bogen;
        this.side = side;
        this.slot = slot;
        this.name = name;
        this.position = position;
        this.battingOrder = battingOrder;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Spielbogen getBogen() { return bogen; }
    public void setBogen(final Spielbogen bogen) { this.bogen = bogen; }
    public BogenSide getSide() { return side; }
    public void setSide(final BogenSide side) { this.side = side; }
    public Integer getSlot() { return slot; }
    public void setSlot(final Integer slot) { this.slot = slot; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public String getPosition() { return position; }
    public void setPosition(final String position) { this.position = position; }
    public Integer getBattingOrder() { return battingOrder; }
    public void setBattingOrder(final Integer battingOrder) { this.battingOrder = battingOrder; }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/SpielbogenSlot.java
git commit -m "🎯 SpielbogenSlot Domain-Model"
```

---

### Task 5: Domain Service — BogenLineupValidator (TDD)

**Files:**
- Create: `backend/src/test/java/com/softball/domain/service/BogenLineupValidatorTest.java`
- Create: `backend/src/main/java/com/softball/domain/service/BogenLineupValidator.java`

- [ ] **Step 1: Write failing tests first**

```java
package com.softball.domain.service;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.shared.exception.BusinessValidationException;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BogenLineupValidatorTest {

    private final BogenLineupValidator validator = new BogenLineupValidator();

    @Test
    void accepts9SequentialSlots() {
        List<SpielbogenSlot> slots = buildSlots(9);
        assertThatCode(() -> validator.validate(slots, BogenSide.HOME)).doesNotThrowAnyException();
    }

    @Test
    void accepts10SequentialSlots() {
        List<SpielbogenSlot> slots = buildSlots(10);
        assertThatCode(() -> validator.validate(slots, BogenSide.HOME)).doesNotThrowAnyException();
    }

    @Test
    void rejectsFewerThan9() {
        List<SpielbogenSlot> slots = buildSlots(8);
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("mindestens 9");
    }

    @Test
    void rejectsMoreThan10() {
        List<SpielbogenSlot> slots = buildSlots(11);
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("höchstens 10");
    }

    @Test
    void rejectsDuplicateSlotNumbers() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(1).setSlot(1);
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Slot-Nummern");
    }

    @Test
    void rejectsDuplicateBattingOrder() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(1).setBattingOrder(1);
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Batting-Order");
    }

    @Test
    void rejectsNonSequentialBattingOrder() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(8).setBattingOrder(11);
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("sequenziell");
    }

    @Test
    void rejectsBlankName() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(0).setName("  ");
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Name");
    }

    @Test
    void acceptsNullPosition() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(0).setPosition(null);
        assertThatCode(() -> validator.validate(slots, BogenSide.HOME)).doesNotThrowAnyException();
    }

    @Test
    void rejectsInvalidPosition() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(0).setPosition("XX");
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Position");
    }

    private List<SpielbogenSlot> buildSlots(final int count) {
        List<SpielbogenSlot> slots = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            SpielbogenSlot s = new SpielbogenSlot();
            s.setSlot(i);
            s.setBattingOrder(i);
            s.setName("Spieler " + i);
            s.setPosition(i <= 9 ? String.valueOf(i) : "EH");
            s.setSide(BogenSide.HOME);
            slots.add(s);
        }
        return slots;
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BogenLineupValidatorTest
```

Expected: compilation failure (`BogenLineupValidator` does not exist).

- [ ] **Step 3: Create BogenLineupValidator**

```java
package com.softball.domain.service;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.shared.exception.BusinessValidationException;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class BogenLineupValidator {

    private static final Set<String> VALID_POSITIONS = Set.of(
        "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "EH", "DH",
        "1", "2", "3", "4", "5", "6", "7", "8", "9"
    );

    public void validate(final List<SpielbogenSlot> slots, final BogenSide side) {
        if (slots.size() < 9) {
            throw new BusinessValidationException(
                "Lineup für " + side + " muss mindestens 9 Spieler haben (aktuell: " + slots.size() + ")"
            );
        }
        if (slots.size() > 10) {
            throw new BusinessValidationException(
                "Lineup für " + side + " darf höchstens 10 Spieler haben (aktuell: " + slots.size() + ")"
            );
        }

        Set<Integer> slotNumbers = new HashSet<>();
        Set<Integer> battingOrders = new HashSet<>();
        for (SpielbogenSlot slot : slots) {
            if (slot.getName() == null || slot.getName().isBlank()) {
                throw new BusinessValidationException("Spielername darf nicht leer sein");
            }
            if (!slotNumbers.add(slot.getSlot())) {
                throw new BusinessValidationException("Doppelte Slot-Nummern in " + side + "-Lineup");
            }
            if (!battingOrders.add(slot.getBattingOrder())) {
                throw new BusinessValidationException("Doppelte Batting-Order in " + side + "-Lineup");
            }
            if (slot.getPosition() != null && !VALID_POSITIONS.contains(slot.getPosition())) {
                throw new BusinessValidationException(
                    "Ungültige Position '" + slot.getPosition() + "' in " + side + "-Lineup"
                );
            }
        }

        // Batting-Order muss sequenziell 1..N sein
        for (int i = 1; i <= slots.size(); i++) {
            if (!battingOrders.contains(i)) {
                throw new BusinessValidationException(
                    "Batting-Order muss sequenziell 1.." + slots.size() + " sein (fehlt: " + i + ")"
                );
            }
        }
    }
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BogenLineupValidatorTest
```

Expected: 10 tests, all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/BogenLineupValidator.java \
        backend/src/test/java/com/softball/domain/service/BogenLineupValidatorTest.java
git commit -m "🎯 BogenLineupValidator + 10 Unit-Tests"
```

---

### Task 6: Domain Repository Ports

**Files:**
- Create: `backend/src/main/java/com/softball/domain/port/out/SpielbogenRepository.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/SpielbogenSlotRepository.java`

- [ ] **Step 1: Create SpielbogenRepository port**

```java
package com.softball.domain.port.out;

import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;

import java.util.List;
import java.util.Optional;

public interface SpielbogenRepository {
    List<Spielbogen> findAll();
    List<Spielbogen> findBySeasonId(Long seasonId);
    List<Spielbogen> findByStatus(BogenStatus status);
    Optional<Spielbogen> findById(Long id);
    Spielbogen save(Spielbogen bogen);
    void deleteById(Long id);
    boolean existsById(Long id);
}
```

- [ ] **Step 2: Create SpielbogenSlotRepository port**

```java
package com.softball.domain.port.out;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;

import java.util.List;
import java.util.Optional;

public interface SpielbogenSlotRepository {
    List<SpielbogenSlot> findByBogenId(Long bogenId);
    List<SpielbogenSlot> findByBogenIdAndSide(Long bogenId, BogenSide side);
    Optional<SpielbogenSlot> findById(Long id);
    SpielbogenSlot save(SpielbogenSlot slot);
    List<SpielbogenSlot> saveAll(List<SpielbogenSlot> slots);
    void deleteByBogenIdAndSide(Long bogenId, BogenSide side);
}
```

- [ ] **Step 3: Build to verify**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/domain/port/out/SpielbogenRepository.java \
        backend/src/main/java/com/softball/domain/port/out/SpielbogenSlotRepository.java
git commit -m "🔌 Spielbogen Repository-Ports"
```

---

### Task 7: JPA Entity — SpielbogenEntity

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenEntity.java`

- [ ] **Step 1: Create SpielbogenEntity**

```java
package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "spielbogen")
public class SpielbogenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column
    private String location;

    @Column(name = "home_team_name", nullable = false)
    private String homeTeamName;

    @Column(name = "away_team_name", nullable = false)
    private String awayTeamName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id")
    private SeasonEntity season;

    @Column(nullable = false)
    private String status;

    @Column(name = "current_inning", nullable = false)
    private Integer currentInning;

    @Column(name = "current_side", nullable = false)
    private String currentSide;

    @Column(name = "home_runs", nullable = false)
    private Integer homeRuns;

    @Column(name = "away_runs", nullable = false)
    private Integer awayRuns;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "league_result_id")
    private LeagueResultEntity leagueResult;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @OneToMany(mappedBy = "bogen", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<SpielbogenSlotEntity> slots = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getHomeTeamName() { return homeTeamName; }
    public void setHomeTeamName(String homeTeamName) { this.homeTeamName = homeTeamName; }
    public String getAwayTeamName() { return awayTeamName; }
    public void setAwayTeamName(String awayTeamName) { this.awayTeamName = awayTeamName; }
    public SeasonEntity getSeason() { return season; }
    public void setSeason(SeasonEntity season) { this.season = season; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getCurrentInning() { return currentInning; }
    public void setCurrentInning(Integer currentInning) { this.currentInning = currentInning; }
    public String getCurrentSide() { return currentSide; }
    public void setCurrentSide(String currentSide) { this.currentSide = currentSide; }
    public Integer getHomeRuns() { return homeRuns; }
    public void setHomeRuns(Integer homeRuns) { this.homeRuns = homeRuns; }
    public Integer getAwayRuns() { return awayRuns; }
    public void setAwayRuns(Integer awayRuns) { this.awayRuns = awayRuns; }
    public LeagueResultEntity getLeagueResult() { return leagueResult; }
    public void setLeagueResult(LeagueResultEntity leagueResult) { this.leagueResult = leagueResult; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }
    public List<SpielbogenSlotEntity> getSlots() { return slots; }
    public void setSlots(List<SpielbogenSlotEntity> slots) { this.slots = slots; }
}
```

- [ ] **Step 2: Commit (will not build until Task 8 is also done — entity references SlotEntity)**

> Skip build verification at this step; do it after Task 8.

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenEntity.java
git commit -m "🗄️ SpielbogenEntity (JPA)"
```

---

### Task 8: JPA Entity — SpielbogenSlotEntity

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenSlotEntity.java`

- [ ] **Step 1: Create SpielbogenSlotEntity**

```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "spielbogen_slot",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"bogen_id", "side", "slot"}),
           @UniqueConstraint(columnNames = {"bogen_id", "side", "batting_order"})
       })
public class SpielbogenSlotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bogen_id", nullable = false)
    private SpielbogenEntity bogen;

    @Column(nullable = false)
    private String side;

    @Column(nullable = false)
    private Integer slot;

    @Column(nullable = false)
    private String name;

    @Column
    private String position;

    @Column(name = "batting_order", nullable = false)
    private Integer battingOrder;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SpielbogenEntity getBogen() { return bogen; }
    public void setBogen(SpielbogenEntity bogen) { this.bogen = bogen; }
    public String getSide() { return side; }
    public void setSide(String side) { this.side = side; }
    public Integer getSlot() { return slot; }
    public void setSlot(Integer slot) { this.slot = slot; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }
    public Integer getBattingOrder() { return battingOrder; }
    public void setBattingOrder(Integer battingOrder) { this.battingOrder = battingOrder; }
}
```

- [ ] **Step 2: Build to verify both Entities compile**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenSlotEntity.java
git commit -m "🗄️ SpielbogenSlotEntity (JPA)"
```

---

### Task 9: Spring Repository Interfaces

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenSlotRepository.java`

- [ ] **Step 1: Create SpringSpielbogenRepository**

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpringSpielbogenRepository extends JpaRepository<SpielbogenEntity, Long> {

    @Query("SELECT b FROM SpielbogenEntity b WHERE b.season.id = :seasonId ORDER BY b.date DESC")
    List<SpielbogenEntity> findBySeasonIdOrderByDateDesc(Long seasonId);

    @Query("SELECT b FROM SpielbogenEntity b WHERE b.status = :status ORDER BY b.date DESC")
    List<SpielbogenEntity> findByStatusOrderByDateDesc(String status);

    List<SpielbogenEntity> findAllByOrderByDateDesc();
}
```

- [ ] **Step 2: Create SpringSpielbogenSlotRepository**

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringSpielbogenSlotRepository extends JpaRepository<SpielbogenSlotEntity, Long> {

    List<SpielbogenSlotEntity> findByBogen_IdOrderByBattingOrderAsc(Long bogenId);

    List<SpielbogenSlotEntity> findByBogen_IdAndSideOrderByBattingOrderAsc(Long bogenId, String side);

    void deleteByBogen_IdAndSide(Long bogenId, String side);
}
```

- [ ] **Step 3: Build**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenRepository.java \
        backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenSlotRepository.java
git commit -m "🗄️ Spring-Repositories für Spielbogen + Slot"
```

---

### Task 10: Mapper — SpielbogenMapper

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenMapper.java`

- [ ] **Step 1: Create SpielbogenMapper**

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenMapper {

    private final SeasonMapper seasonMapper;
    private final LeagueResultMapper leagueResultMapper;

    public SpielbogenMapper(final SeasonMapper seasonMapper, final LeagueResultMapper leagueResultMapper) {
        this.seasonMapper = seasonMapper;
        this.leagueResultMapper = leagueResultMapper;
    }

    public Spielbogen toDomain(final SpielbogenEntity e) {
        if (e == null) return null;
        Spielbogen b = new Spielbogen();
        b.setId(e.getId());
        b.setDate(e.getDate());
        b.setLocation(e.getLocation());
        b.setHomeTeamName(e.getHomeTeamName());
        b.setAwayTeamName(e.getAwayTeamName());
        b.setSeason(e.getSeason() != null ? seasonMapper.toDomain(e.getSeason()) : null);
        b.setStatus(BogenStatus.valueOf(e.getStatus()));
        b.setCurrentInning(e.getCurrentInning());
        b.setCurrentSide(BogenSide.valueOf(e.getCurrentSide()));
        b.setHomeRuns(e.getHomeRuns());
        b.setAwayRuns(e.getAwayRuns());
        b.setLeagueResult(e.getLeagueResult() != null ? leagueResultMapper.toDomain(e.getLeagueResult()) : null);
        b.setCreatedAt(e.getCreatedAt());
        b.setUpdatedAt(e.getUpdatedAt());
        b.setEndedAt(e.getEndedAt());
        return b;
    }

    public SpielbogenEntity toEntity(final Spielbogen b) {
        if (b == null) return null;
        SpielbogenEntity e = new SpielbogenEntity();
        e.setId(b.getId());
        applyToEntity(e, b);
        return e;
    }

    public void updateEntity(final SpielbogenEntity e, final Spielbogen b) {
        applyToEntity(e, b);
    }

    private void applyToEntity(final SpielbogenEntity e, final Spielbogen b) {
        e.setDate(b.getDate());
        e.setLocation(b.getLocation());
        e.setHomeTeamName(b.getHomeTeamName());
        e.setAwayTeamName(b.getAwayTeamName());
        e.setSeason(b.getSeason() != null ? seasonMapper.toEntity(b.getSeason()) : null);
        e.setStatus(b.getStatus().name());
        e.setCurrentInning(b.getCurrentInning());
        e.setCurrentSide(b.getCurrentSide().name());
        e.setHomeRuns(b.getHomeRuns());
        e.setAwayRuns(b.getAwayRuns());
        e.setLeagueResult(b.getLeagueResult() != null ? leagueResultMapper.toEntity(b.getLeagueResult()) : null);
        e.setEndedAt(b.getEndedAt());
    }
}
```

- [ ] **Step 2: Build**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenMapper.java
git commit -m "🔄 SpielbogenMapper (Entity ↔ Domain)"
```

---

### Task 11: Mapper — SpielbogenSlotMapper

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenSlotMapper.java`

- [ ] **Step 1: Create SpielbogenSlotMapper**

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenSlotMapper {

    private final SpielbogenMapper bogenMapper;

    public SpielbogenSlotMapper(final SpielbogenMapper bogenMapper) {
        this.bogenMapper = bogenMapper;
    }

    public SpielbogenSlot toDomain(final SpielbogenSlotEntity e) {
        if (e == null) return null;
        SpielbogenSlot s = new SpielbogenSlot();
        s.setId(e.getId());
        s.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        s.setSide(BogenSide.valueOf(e.getSide()));
        s.setSlot(e.getSlot());
        s.setName(e.getName());
        s.setPosition(e.getPosition());
        s.setBattingOrder(e.getBattingOrder());
        return s;
    }

    public SpielbogenSlotEntity toEntity(final SpielbogenSlot s, final SpielbogenEntity bogenEntity) {
        if (s == null) return null;
        SpielbogenSlotEntity e = new SpielbogenSlotEntity();
        e.setId(s.getId());
        e.setBogen(bogenEntity);
        applyToEntity(e, s);
        return e;
    }

    public void updateEntity(final SpielbogenSlotEntity e, final SpielbogenSlot s) {
        applyToEntity(e, s);
    }

    private void applyToEntity(final SpielbogenSlotEntity e, final SpielbogenSlot s) {
        e.setSide(s.getSide().name());
        e.setSlot(s.getSlot());
        e.setName(s.getName());
        e.setPosition(s.getPosition());
        e.setBattingOrder(s.getBattingOrder());
    }
}
```

- [ ] **Step 2: Build**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenSlotMapper.java
git commit -m "🔄 SpielbogenSlotMapper"
```

---

### Task 12: Adapter — SpielbogenRepositoryAdapter

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenRepositoryAdapter.java`

- [ ] **Step 1: Create SpielbogenRepositoryAdapter**

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.port.out.SpielbogenRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenRepositoryAdapter implements SpielbogenRepository {

    private final SpringSpielbogenRepository repo;
    private final SpielbogenMapper mapper;

    public SpielbogenRepositoryAdapter(final SpringSpielbogenRepository repo, final SpielbogenMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<Spielbogen> findAll() {
        return repo.findAllByOrderByDateDesc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<Spielbogen> findBySeasonId(final Long seasonId) {
        return repo.findBySeasonIdOrderByDateDesc(seasonId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<Spielbogen> findByStatus(final BogenStatus status) {
        return repo.findByStatusOrderByDateDesc(status.name()).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<Spielbogen> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Spielbogen save(final Spielbogen bogen) {
        if (bogen.getId() != null) {
            SpielbogenEntity existing = repo.findById(bogen.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, bogen);
                return mapper.toDomain(repo.save(existing));
            }
        }
        SpielbogenEntity entity = mapper.toEntity(bogen);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public boolean existsById(final Long id) {
        return repo.existsById(id);
    }
}
```

- [ ] **Step 2: Build**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenRepositoryAdapter.java
git commit -m "🔌 SpielbogenRepositoryAdapter implementiert Domain-Port"
```

---

### Task 13: Adapter — SpielbogenSlotRepositoryAdapter

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenSlotRepositoryAdapter.java`

- [ ] **Step 1: Create SpielbogenSlotRepositoryAdapter**

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenSlotMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.domain.port.out.SpielbogenSlotRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenSlotRepositoryAdapter implements SpielbogenSlotRepository {

    private final SpringSpielbogenSlotRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpielbogenSlotMapper mapper;

    public SpielbogenSlotRepositoryAdapter(final SpringSpielbogenSlotRepository repo,
                                           final SpringSpielbogenRepository bogenRepo,
                                           final SpielbogenSlotMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenSlot> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderByBattingOrderAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<SpielbogenSlot> findByBogenIdAndSide(final Long bogenId, final BogenSide side) {
        return repo.findByBogen_IdAndSideOrderByBattingOrderAsc(bogenId, side.name()).stream()
                   .map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SpielbogenSlot> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public SpielbogenSlot save(final SpielbogenSlot slot) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(slot.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", slot.getBogen().getId()));
        if (slot.getId() != null) {
            SpielbogenSlotEntity existing = repo.findById(slot.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, slot);
                return mapper.toDomain(repo.save(existing));
            }
        }
        SpielbogenSlotEntity entity = mapper.toEntity(slot, bogenEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    @Transactional
    public List<SpielbogenSlot> saveAll(final List<SpielbogenSlot> slots) {
        return slots.stream().map(this::save).toList();
    }

    @Override
    @Transactional
    public void deleteByBogenIdAndSide(final Long bogenId, final BogenSide side) {
        repo.deleteByBogen_IdAndSide(bogenId, side.name());
    }
}
```

- [ ] **Step 2: Build**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenSlotRepositoryAdapter.java
git commit -m "🔌 SpielbogenSlotRepositoryAdapter"
```

---

### Task 14: SpielbogenSlotService (TDD)

**Files:**
- Create: `backend/src/test/java/com/softball/application/SpielbogenSlotServiceTest.java`
- Create: `backend/src/main/java/com/softball/application/SpielbogenSlotService.java`

- [ ] **Step 1: Write failing test**

```java
package com.softball.application;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.domain.port.out.SpielbogenSlotRepository;
import com.softball.domain.service.BogenLineupValidator;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpielbogenSlotServiceTest {

    @Mock private SpielbogenRepository bogenRepo;
    @Mock private SpielbogenSlotRepository slotRepo;
    @Mock private BogenLineupValidator validator;

    @InjectMocks
    private SpielbogenSlotService service;

    private Spielbogen draftBogen;
    private Spielbogen liveBogen;

    @BeforeEach
    void setUp() {
        draftBogen = new Spielbogen();
        draftBogen.setId(1L);
        draftBogen.setStatus(BogenStatus.DRAFT);

        liveBogen = new Spielbogen();
        liveBogen.setId(2L);
        liveBogen.setStatus(BogenStatus.LIVE);
    }

    @Test
    void setLineupRejectsLiveBogen() {
        when(bogenRepo.findById(2L)).thenReturn(Optional.of(liveBogen));

        assertThatThrownBy(() -> service.setLineup(2L, BogenSide.HOME, sampleSlots(9)))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("LIVE");
    }

    @Test
    void setLineupReplacesAllSlots() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(slotRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<SpielbogenSlot> input = sampleSlots(9);
        service.setLineup(1L, BogenSide.HOME, input);

        verify(validator).validate(any(), any());
        verify(slotRepo).deleteByBogenIdAndSide(1L, BogenSide.HOME);
        verify(slotRepo).saveAll(any());
    }

    @Test
    void setLineupBogenNotFound() {
        when(bogenRepo.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setLineup(99L, BogenSide.HOME, sampleSlots(9)))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getLineupReturnsBothSides() {
        when(bogenRepo.existsById(1L)).thenReturn(true);
        when(slotRepo.findByBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(sampleSlots(9));
        when(slotRepo.findByBogenIdAndSide(1L, BogenSide.AWAY)).thenReturn(sampleSlots(9));

        var result = service.getLineup(1L);

        assertThat(result.home()).hasSize(9);
        assertThat(result.away()).hasSize(9);
    }

    @Test
    void updateSlotChangesNameAndPosition() {
        SpielbogenSlot existing = new SpielbogenSlot();
        existing.setId(50L);
        existing.setBogen(draftBogen);
        existing.setName("Original");
        existing.setPosition("5");
        existing.setBattingOrder(3);
        existing.setSlot(3);
        existing.setSide(BogenSide.HOME);

        when(slotRepo.findById(50L)).thenReturn(Optional.of(existing));
        when(slotRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SpielbogenSlot updated = service.updateSlot(1L, 50L, "Klaus", "6", null);

        assertThat(updated.getName()).isEqualTo("Klaus");
        assertThat(updated.getPosition()).isEqualTo("6");
    }

    @Test
    void updateSlotRejectsBlankName() {
        SpielbogenSlot existing = new SpielbogenSlot();
        existing.setId(50L);
        existing.setBogen(draftBogen);
        existing.setSlot(3);
        existing.setBattingOrder(3);
        existing.setSide(BogenSide.HOME);
        existing.setName("Original");

        when(slotRepo.findById(50L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.updateSlot(1L, 50L, "  ", null, null))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Name");
    }

    @Test
    void updateSlotInvalidPosition() {
        SpielbogenSlot existing = new SpielbogenSlot();
        existing.setId(50L);
        existing.setBogen(draftBogen);
        existing.setSlot(3);
        existing.setBattingOrder(3);
        existing.setSide(BogenSide.HOME);
        existing.setName("Original");

        when(slotRepo.findById(50L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.updateSlot(1L, 50L, "Klaus", "XX", null))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Position");
    }

    @Test
    void updateSlotMismatchedBogenIdReturns404() {
        SpielbogenSlot existing = new SpielbogenSlot();
        existing.setId(50L);
        Spielbogen otherBogen = new Spielbogen();
        otherBogen.setId(99L);
        existing.setBogen(otherBogen);

        when(slotRepo.findById(50L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.updateSlot(1L, 50L, "Klaus", null, null))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    private List<SpielbogenSlot> sampleSlots(final int count) {
        List<SpielbogenSlot> slots = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            SpielbogenSlot s = new SpielbogenSlot();
            s.setSlot(i);
            s.setBattingOrder(i);
            s.setName("Spieler " + i);
            s.setPosition(i <= 9 ? String.valueOf(i) : "EH");
            s.setSide(BogenSide.HOME);
            slots.add(s);
        }
        return slots;
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenSlotServiceTest
```

Expected: compilation failure (`SpielbogenSlotService` does not exist).

- [ ] **Step 3: Create SpielbogenSlotService**

```java
package com.softball.application;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.domain.port.out.SpielbogenSlotRepository;
import com.softball.domain.service.BogenLineupValidator;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class SpielbogenSlotService {

    private static final Logger log = LoggerFactory.getLogger(SpielbogenSlotService.class);
    private static final Set<String> VALID_POSITIONS = Set.of(
        "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "EH", "DH",
        "1", "2", "3", "4", "5", "6", "7", "8", "9"
    );

    private final SpielbogenRepository bogenRepo;
    private final SpielbogenSlotRepository slotRepo;
    private final BogenLineupValidator validator;

    public SpielbogenSlotService(final SpielbogenRepository bogenRepo,
                                 final SpielbogenSlotRepository slotRepo,
                                 final BogenLineupValidator validator) {
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.validator = validator;
    }

    public record LineupResult(List<SpielbogenSlot> home, List<SpielbogenSlot> away) {}

    @Transactional(readOnly = true)
    public LineupResult getLineup(final Long bogenId) {
        if (!bogenRepo.existsById(bogenId)) {
            throw new ResourceNotFoundException("Spielbogen", bogenId);
        }
        return new LineupResult(
            slotRepo.findByBogenIdAndSide(bogenId, BogenSide.HOME),
            slotRepo.findByBogenIdAndSide(bogenId, BogenSide.AWAY)
        );
    }

    @Transactional
    public List<SpielbogenSlot> setLineup(final Long bogenId, final BogenSide side,
                                          final List<SpielbogenSlot> slots) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));

        if (bogen.getStatus() == BogenStatus.LIVE) {
            throw new BusinessValidationException(
                "Lineup-Bulk-Replace ist im Status LIVE nicht erlaubt — nur einzelne Slot-PATCH"
            );
        }

        for (SpielbogenSlot s : slots) {
            s.setBogen(bogen);
            s.setSide(side);
        }
        validator.validate(slots, side);

        slotRepo.deleteByBogenIdAndSide(bogenId, side);
        log.info("Spielbogen {} setLineup für Side {}: {} Slots", bogenId, side, slots.size());
        return slotRepo.saveAll(slots);
    }

    @Transactional
    public SpielbogenSlot updateSlot(final Long bogenId, final Long slotId,
                                     final String name, final String position,
                                     final Integer battingOrder) {
        SpielbogenSlot existing = slotRepo.findById(slotId)
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", slotId));

        if (!existing.getBogen().getId().equals(bogenId)) {
            throw new ResourceNotFoundException("SpielbogenSlot", slotId);
        }

        if (name != null) {
            if (name.isBlank()) {
                throw new BusinessValidationException("Spielername darf nicht leer sein");
            }
            existing.setName(name);
        }
        if (position != null) {
            if (!position.isBlank() && !VALID_POSITIONS.contains(position)) {
                throw new BusinessValidationException("Ungültige Position: " + position);
            }
            existing.setPosition(position.isBlank() ? null : position);
        }
        if (battingOrder != null) {
            existing.setBattingOrder(battingOrder);
        }

        return slotRepo.save(existing);
    }
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenSlotServiceTest
```

Expected: 8 tests, all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/SpielbogenSlotService.java \
        backend/src/test/java/com/softball/application/SpielbogenSlotServiceTest.java
git commit -m "🧠 SpielbogenSlotService + 8 Tests"
```

---

### Task 15: SpielbogenService (TDD — CRUD + Status Transitions)

**Files:**
- Create: `backend/src/test/java/com/softball/application/SpielbogenServiceTest.java`
- Create: `backend/src/main/java/com/softball/application/SpielbogenService.java`

- [ ] **Step 1: Write failing test**

```java
package com.softball.application;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Season;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpielbogenServiceTest {

    @Mock private SpielbogenRepository bogenRepo;
    @Mock private SeasonService seasonService;
    @Mock private SpielbogenSlotService slotService;

    @InjectMocks
    private SpielbogenService service;

    private Spielbogen draftBogen;

    @BeforeEach
    void setUp() {
        draftBogen = new Spielbogen(LocalDate.of(2026, 4, 30), "Krefeld",
                                     "Wuppertal", "Cologne", null);
        draftBogen.setId(1L);
    }

    @Test
    void createRejectsSameTeamNames() {
        assertThatThrownBy(() -> service.create(LocalDate.of(2026, 4, 30), null,
                                                "Team A", "Team A", null))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("unterschiedlich");
    }

    @Test
    void createSavesBogenWithDraftStatus() {
        when(bogenRepo.save(any())).thenAnswer(inv -> {
            Spielbogen b = inv.getArgument(0);
            b.setId(42L);
            return b;
        });

        Spielbogen result = service.create(LocalDate.of(2026, 4, 30), "Krefeld",
                                           "Wuppertal", "Cologne", null);

        assertThat(result.getStatus()).isEqualTo(BogenStatus.DRAFT);
        assertThat(result.getCurrentInning()).isEqualTo(1);
        assertThat(result.getCurrentSide()).isEqualTo(BogenSide.AWAY);
        assertThat(result.getId()).isEqualTo(42L);
    }

    @Test
    void createWithSeasonIdLooksUpSeason() {
        Season season = new Season(10L, "Saison 2026", 2026);
        when(seasonService.findById(10L)).thenReturn(season);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.create(LocalDate.of(2026, 4, 30), null,
                                           "Wuppertal", "Cologne", 10L);

        assertThat(result.getSeason()).isNotNull();
        assertThat(result.getSeason().getId()).isEqualTo(10L);
    }

    @Test
    void deleteRejectsUnknownId() {
        when(bogenRepo.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> service.delete(99L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void startTransitionsDraftToLiveWhenLineupsValid() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(slotService.getLineup(1L)).thenReturn(
            new SpielbogenSlotService.LineupResult(buildSlots(9), buildSlots(9))
        );
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.start(1L);

        assertThat(result.getStatus()).isEqualTo(BogenStatus.LIVE);
    }

    @Test
    void startRejectsIfHomeLineupTooShort() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(slotService.getLineup(1L)).thenReturn(
            new SpielbogenSlotService.LineupResult(buildSlots(8), buildSlots(9))
        );

        assertThatThrownBy(() -> service.start(1L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("HOME");
    }

    @Test
    void startRejectsIfAlreadyLive() {
        draftBogen.setStatus(BogenStatus.LIVE);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));

        assertThatThrownBy(() -> service.start(1L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("DRAFT");
    }

    @Test
    void endTransitionsLiveToDone() {
        draftBogen.setStatus(BogenStatus.LIVE);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.end(1L, null, null);

        assertThat(result.getStatus()).isEqualTo(BogenStatus.DONE);
        assertThat(result.getEndedAt()).isNotNull();
    }

    @Test
    void endAcceptsScoreOverride() {
        draftBogen.setStatus(BogenStatus.LIVE);
        draftBogen.setHomeRuns(7);
        draftBogen.setAwayRuns(3);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.end(1L, 10, 5);

        assertThat(result.getHomeRuns()).isEqualTo(10);
        assertThat(result.getAwayRuns()).isEqualTo(5);
    }

    @Test
    void reopenTransitionsDoneToLive() {
        draftBogen.setStatus(BogenStatus.DONE);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.reopen(1L);

        assertThat(result.getStatus()).isEqualTo(BogenStatus.LIVE);
        assertThat(result.getEndedAt()).isNull();
    }

    @Test
    void reopenRejectsDraft() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));

        assertThatThrownBy(() -> service.reopen(1L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("DONE");
    }

    private List<SpielbogenSlot> buildSlots(final int count) {
        List<SpielbogenSlot> slots = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            SpielbogenSlot s = new SpielbogenSlot();
            s.setSlot(i);
            s.setBattingOrder(i);
            s.setName("Spieler " + i);
            s.setSide(BogenSide.HOME);
            slots.add(s);
        }
        return slots;
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenServiceTest
```

Expected: compilation failure.

- [ ] **Step 3: Create SpielbogenService**

```java
package com.softball.application;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Season;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class SpielbogenService {

    private static final Logger log = LoggerFactory.getLogger(SpielbogenService.class);

    private final SpielbogenRepository bogenRepo;
    private final SeasonService seasonService;
    private final SpielbogenSlotService slotService;

    public SpielbogenService(final SpielbogenRepository bogenRepo,
                             final SeasonService seasonService,
                             @Lazy final SpielbogenSlotService slotService) {
        this.bogenRepo = bogenRepo;
        this.seasonService = seasonService;
        this.slotService = slotService;
    }

    @Transactional(readOnly = true)
    public List<Spielbogen> findAll() {
        return bogenRepo.findAll();
    }

    @Transactional(readOnly = true)
    public List<Spielbogen> findBySeasonId(final Long seasonId) {
        return bogenRepo.findBySeasonId(seasonId);
    }

    @Transactional(readOnly = true)
    public List<Spielbogen> findByStatus(final BogenStatus status) {
        return bogenRepo.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public Spielbogen findById(final Long id) {
        return bogenRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", id));
    }

    @Transactional
    public Spielbogen create(final LocalDate date, final String location,
                             final String homeTeamName, final String awayTeamName,
                             final Long seasonId) {
        if (homeTeamName.equalsIgnoreCase(awayTeamName)) {
            throw new BusinessValidationException("Heim- und Gast-Team-Namen müssen unterschiedlich sein");
        }
        Season season = null;
        if (seasonId != null) {
            season = seasonService.findById(seasonId);
        }
        Spielbogen bogen = new Spielbogen(date, location, homeTeamName, awayTeamName, season);
        Spielbogen saved = bogenRepo.save(bogen);
        log.info("Spielbogen erstellt: id={}, {} vs {} am {}", saved.getId(), homeTeamName, awayTeamName, date);
        return saved;
    }

    @Transactional
    public Spielbogen update(final Long id, final LocalDate date, final String location,
                             final String homeTeamName, final String awayTeamName,
                             final Long seasonId) {
        Spielbogen bogen = findById(id);
        if (bogen.getLeagueResult() != null && seasonId != null
            && (bogen.getSeason() == null || !bogen.getSeason().getId().equals(seasonId))) {
            throw new BusinessValidationException("Spielbogen ist bereits einer Liga zugeordnet — Saison kann nicht geändert werden");
        }
        if (date != null) bogen.setDate(date);
        if (location != null) bogen.setLocation(location);
        if (homeTeamName != null) bogen.setHomeTeamName(homeTeamName);
        if (awayTeamName != null) bogen.setAwayTeamName(awayTeamName);
        if (seasonId != null) bogen.setSeason(seasonService.findById(seasonId));
        return bogenRepo.save(bogen);
    }

    @Transactional
    public void delete(final Long id) {
        if (!bogenRepo.existsById(id)) {
            throw new ResourceNotFoundException("Spielbogen", id);
        }
        bogenRepo.deleteById(id);
        log.info("Spielbogen gelöscht: id={}", id);
    }

    @Transactional
    public Spielbogen start(final Long id) {
        Spielbogen bogen = findById(id);
        if (bogen.getStatus() != BogenStatus.DRAFT) {
            throw new BusinessValidationException("Nur DRAFT-Spielbogen kann gestartet werden (aktuell: " + bogen.getStatus() + ")");
        }
        var lineup = slotService.getLineup(id);
        if (lineup.home().size() < 9) {
            throw new BusinessValidationException("HOME-Lineup unvollständig (mindestens 9 Spieler nötig)");
        }
        if (lineup.away().size() < 9) {
            throw new BusinessValidationException("AWAY-Lineup unvollständig (mindestens 9 Spieler nötig)");
        }
        bogen.setStatus(BogenStatus.LIVE);
        log.info("Spielbogen {} gestartet (LIVE)", id);
        return bogenRepo.save(bogen);
    }

    @Transactional
    public Spielbogen end(final Long id, final Integer homeRunsOverride, final Integer awayRunsOverride) {
        Spielbogen bogen = findById(id);
        if (bogen.getStatus() != BogenStatus.LIVE) {
            throw new BusinessValidationException("Nur LIVE-Spielbogen kann beendet werden (aktuell: " + bogen.getStatus() + ")");
        }
        if (homeRunsOverride != null) {
            if (homeRunsOverride < 0) {
                throw new BusinessValidationException("homeRuns muss >= 0 sein");
            }
            bogen.setHomeRuns(homeRunsOverride);
        }
        if (awayRunsOverride != null) {
            if (awayRunsOverride < 0) {
                throw new BusinessValidationException("awayRuns muss >= 0 sein");
            }
            bogen.setAwayRuns(awayRunsOverride);
        }
        bogen.setStatus(BogenStatus.DONE);
        bogen.setEndedAt(Instant.now());
        log.info("Spielbogen {} beendet (DONE) — Score {} : {}", id, bogen.getHomeRuns(), bogen.getAwayRuns());
        return bogenRepo.save(bogen);
    }

    @Transactional
    public Spielbogen reopen(final Long id) {
        Spielbogen bogen = findById(id);
        if (bogen.getStatus() != BogenStatus.DONE) {
            throw new BusinessValidationException("Nur DONE-Spielbogen kann wieder geöffnet werden (aktuell: " + bogen.getStatus() + ")");
        }
        bogen.setStatus(BogenStatus.LIVE);
        bogen.setEndedAt(null);
        log.info("Spielbogen {} reopened (LIVE)", id);
        return bogenRepo.save(bogen);
    }
}
```

- [ ] **Step 4: Run tests**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenServiceTest
```

Expected: 11 tests, all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/SpielbogenService.java \
        backend/src/test/java/com/softball/application/SpielbogenServiceTest.java
git commit -m "🧠 SpielbogenService — CRUD + Status-Transitions + 11 Tests"
```

---

### Task 16: DTOs für REST API

**Files:**
- Create all DTO records under `backend/src/main/java/com/softball/adapter/dto/`

- [ ] **Step 1: Create CreateSpielbogenRequest**

```java
package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateSpielbogenRequest(
    @NotNull LocalDate date,
    @Size(max = 200) String location,
    @NotBlank @Size(max = 100) String homeTeamName,
    @NotBlank @Size(max = 100) String awayTeamName,
    Long seasonId
) {}
```

- [ ] **Step 2: Create UpdateSpielbogenRequest**

```java
package com.softball.adapter.dto;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateSpielbogenRequest(
    LocalDate date,
    @Size(max = 200) String location,
    @Size(max = 100) String homeTeamName,
    @Size(max = 100) String awayTeamName,
    Long seasonId
) {}
```

- [ ] **Step 3: Create SpielbogenResponse**

```java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;

import java.time.Instant;
import java.time.LocalDate;

public record SpielbogenResponse(
    Long id,
    LocalDate date,
    String location,
    String homeTeamName,
    String awayTeamName,
    SeasonResponse season,
    BogenStatus status,
    Integer currentInning,
    BogenSide currentSide,
    Integer homeRuns,
    Integer awayRuns,
    Long leagueResultId,
    Instant createdAt,
    Instant updatedAt,
    Instant endedAt
) {
    public static SpielbogenResponse from(final Spielbogen b) {
        return new SpielbogenResponse(
            b.getId(),
            b.getDate(),
            b.getLocation(),
            b.getHomeTeamName(),
            b.getAwayTeamName(),
            b.getSeason() != null ? new SeasonResponse(b.getSeason().getId(), b.getSeason().getName(), b.getSeason().getYear()) : null,
            b.getStatus(),
            b.getCurrentInning(),
            b.getCurrentSide(),
            b.getHomeRuns(),
            b.getAwayRuns(),
            b.getLeagueResult() != null ? b.getLeagueResult().getId() : null,
            b.getCreatedAt(),
            b.getUpdatedAt(),
            b.getEndedAt()
        );
    }
}
```

- [ ] **Step 4: Create SpielbogenSlotResponse**

```java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;

public record SpielbogenSlotResponse(
    Long id,
    BogenSide side,
    Integer slot,
    String name,
    String position,
    Integer battingOrder
) {
    public static SpielbogenSlotResponse from(final SpielbogenSlot s) {
        return new SpielbogenSlotResponse(
            s.getId(),
            s.getSide(),
            s.getSlot(),
            s.getName(),
            s.getPosition(),
            s.getBattingOrder()
        );
    }
}
```

- [ ] **Step 5: Create SpielbogenLineupResponse**

```java
package com.softball.adapter.dto;

import java.util.List;

public record SpielbogenLineupResponse(
    List<SpielbogenSlotResponse> home,
    List<SpielbogenSlotResponse> away
) {}
```

- [ ] **Step 6: Create SetLineupRequest**

```java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SetLineupRequest(
    @NotNull BogenSide side,
    @Valid @NotNull List<SlotEntry> slots
) {
    public record SlotEntry(
        @NotNull @Min(1) @Max(10) Integer slot,
        @NotBlank @Size(max = 100) String name,
        String position,
        @NotNull @Min(1) @Max(10) Integer battingOrder
    ) {}
}
```

- [ ] **Step 7: Create UpdateSlotRequest**

```java
package com.softball.adapter.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateSlotRequest(
    @Size(max = 100) String name,
    String position,
    @Min(1) @Max(10) Integer battingOrder
) {}
```

- [ ] **Step 8: Create EndGameRequest**

```java
package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;

public record EndGameRequest(
    @Min(0) Integer homeRuns,
    @Min(0) Integer awayRuns
) {}
```

- [ ] **Step 9: Create CopyFromGameDayRequest**

```java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CopyFromGameDayRequest(
    @NotNull Long gameDayId,
    @NotNull @Min(1) Integer gameNumber,
    @NotNull BogenSide targetSide
) {}
```

- [ ] **Step 10: Build to verify**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/
git commit -m "📦 Spielbogen DTOs (Request + Response Records)"
```

---

### Task 17: REST Controller — SpielbogenController

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java`

- [ ] **Step 1: Create SpielbogenController**

```java
package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.application.SpielbogenService;
import com.softball.application.SpielbogenSlotService;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.model.SpielbogenSlot;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/spielbogen")
public class SpielbogenController {

    private final SpielbogenService bogenService;
    private final SpielbogenSlotService slotService;

    public SpielbogenController(final SpielbogenService bogenService, final SpielbogenSlotService slotService) {
        this.bogenService = bogenService;
        this.slotService = slotService;
    }

    @GetMapping
    public List<SpielbogenResponse> list(@RequestParam(required = false) Long seasonId,
                                         @RequestParam(required = false) BogenStatus status) {
        List<Spielbogen> result;
        if (seasonId != null) {
            result = bogenService.findBySeasonId(seasonId);
        } else if (status != null) {
            result = bogenService.findByStatus(status);
        } else {
            result = bogenService.findAll();
        }
        return result.stream().map(SpielbogenResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SpielbogenResponse create(@Valid @RequestBody CreateSpielbogenRequest req) {
        Spielbogen created = bogenService.create(req.date(), req.location(),
                                                  req.homeTeamName(), req.awayTeamName(),
                                                  req.seasonId());
        return SpielbogenResponse.from(created);
    }

    @GetMapping("/{id}")
    public SpielbogenResponse getById(@PathVariable Long id) {
        return SpielbogenResponse.from(bogenService.findById(id));
    }

    @PatchMapping("/{id}")
    public SpielbogenResponse update(@PathVariable Long id, @Valid @RequestBody UpdateSpielbogenRequest req) {
        Spielbogen updated = bogenService.update(id, req.date(), req.location(),
                                                  req.homeTeamName(), req.awayTeamName(),
                                                  req.seasonId());
        return SpielbogenResponse.from(updated);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        bogenService.delete(id);
    }

    // Status transitions

    @PostMapping("/{id}/start")
    public SpielbogenResponse start(@PathVariable Long id) {
        return SpielbogenResponse.from(bogenService.start(id));
    }

    @PostMapping("/{id}/end")
    public SpielbogenResponse end(@PathVariable Long id, @RequestBody(required = false) EndGameRequest req) {
        Integer hr = req != null ? req.homeRuns() : null;
        Integer ar = req != null ? req.awayRuns() : null;
        return SpielbogenResponse.from(bogenService.end(id, hr, ar));
    }

    @PostMapping("/{id}/reopen")
    public SpielbogenResponse reopen(@PathVariable Long id) {
        return SpielbogenResponse.from(bogenService.reopen(id));
    }

    // Lineup

    @GetMapping("/{id}/lineup")
    public SpielbogenLineupResponse getLineup(@PathVariable Long id) {
        var lineup = slotService.getLineup(id);
        return new SpielbogenLineupResponse(
            lineup.home().stream().map(SpielbogenSlotResponse::from).toList(),
            lineup.away().stream().map(SpielbogenSlotResponse::from).toList()
        );
    }

    @PutMapping("/{id}/lineup")
    public List<SpielbogenSlotResponse> setLineup(@PathVariable Long id, @Valid @RequestBody SetLineupRequest req) {
        List<SpielbogenSlot> slots = req.slots().stream().map(e -> {
            SpielbogenSlot s = new SpielbogenSlot();
            s.setSlot(e.slot());
            s.setName(e.name());
            s.setPosition(e.position());
            s.setBattingOrder(e.battingOrder());
            return s;
        }).toList();
        return slotService.setLineup(id, req.side(), slots).stream()
                          .map(SpielbogenSlotResponse::from).toList();
    }

    @PatchMapping("/{id}/slots/{slotId}")
    public SpielbogenSlotResponse updateSlot(@PathVariable Long id, @PathVariable Long slotId,
                                             @Valid @RequestBody UpdateSlotRequest req) {
        return SpielbogenSlotResponse.from(
            slotService.updateSlot(id, slotId, req.name(), req.position(), req.battingOrder())
        );
    }
}
```

> Note: `copy-from-gameday` endpoint added in Task 18 to keep this task focused.

- [ ] **Step 2: Build**

```bash
cd backend && ./mvnw -s .mvn/local-settings.xml compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Run all backend tests to make sure nothing broke**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java
git commit -m "🌐 SpielbogenController — CRUD + Status + Lineup Endpoints"
```

---

### Task 18: Copy-From-GameDay (Domain + Service Method + Endpoint)

**Files:**
- Modify: `backend/src/main/java/com/softball/application/SpielbogenSlotService.java` (add method)
- Modify: `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java` (add endpoint)

- [ ] **Step 1: Add unit test for copy-from-gameday**

In `SpielbogenSlotServiceTest.java`, add:

```java
@Mock private com.softball.application.GameDayService gameDayService;

@Test
void copyFromGameDayAddsSlotsForOurLineup() {
    when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
    com.softball.domain.model.GameDay gd = new com.softball.domain.model.GameDay();
    com.softball.domain.model.Game game = new com.softball.domain.model.Game();
    game.setId(99L);
    com.softball.domain.model.Player p1 = new com.softball.domain.model.Player();
    p1.setId(1L); p1.setName("Hung");
    com.softball.domain.model.Player p2 = new com.softball.domain.model.Player();
    p2.setId(2L); p2.setName("Klaus");
    com.softball.domain.model.LineupEntry e1 = new com.softball.domain.model.LineupEntry();
    e1.setPlayer(p1); e1.setBattingOrder(1); e1.setPosition(com.softball.domain.model.Position.SS);
    com.softball.domain.model.LineupEntry e2 = new com.softball.domain.model.LineupEntry();
    e2.setPlayer(p2); e2.setBattingOrder(2); e2.setPosition(com.softball.domain.model.Position.P);
    game.setLineupEntries(List.of(e1, e2));
    gd.setGames(List.of(game));
    when(gameDayService.findById(50L)).thenReturn(gd);
    when(slotRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

    service.copyFromGameDay(1L, 50L, 1, BogenSide.HOME);

    verify(slotRepo).saveAll(any());
}
```

> The test references existing domain types `GameDay`, `Game`, `Player`, `LineupEntry`, `Position` — these already exist in the codebase. Adjust imports to match codebase conventions.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenSlotServiceTest#copyFromGameDayAddsSlotsForOurLineup
```

Expected: compilation failure (`copyFromGameDay` does not exist on service).

- [ ] **Step 3: Add `copyFromGameDay` method to SpielbogenSlotService**

In `SpielbogenSlotService.java`, inject `GameDayService`:

```java
private final GameDayService gameDayService;

// constructor parameters get extended with GameDayService gameDayService
public SpielbogenSlotService(final SpielbogenRepository bogenRepo,
                             final SpielbogenSlotRepository slotRepo,
                             final BogenLineupValidator validator,
                             final GameDayService gameDayService) {
    this.bogenRepo = bogenRepo;
    this.slotRepo = slotRepo;
    this.validator = validator;
    this.gameDayService = gameDayService;
}
```

Add new method:

```java
@Transactional
public List<SpielbogenSlot> copyFromGameDay(final Long bogenId, final Long gameDayId,
                                            final Integer gameNumber, final BogenSide targetSide) {
    Spielbogen bogen = bogenRepo.findById(bogenId)
        .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));
    if (bogen.getStatus() == BogenStatus.LIVE) {
        throw new BusinessValidationException("Lineup-Copy ist im Status LIVE nicht erlaubt");
    }

    var gd = gameDayService.findById(gameDayId);
    var game = gd.getGames().stream()
        .filter(g -> g.getGameNumber() != null && g.getGameNumber().equals(gameNumber))
        .findFirst()
        .orElseThrow(() -> new ResourceNotFoundException("Game", gameNumber.longValue()));

    List<SpielbogenSlot> slots = new ArrayList<>();
    for (var entry : game.getLineupEntries()) {
        SpielbogenSlot s = new SpielbogenSlot();
        s.setBogen(bogen);
        s.setSide(targetSide);
        s.setSlot(entry.getBattingOrder());
        s.setBattingOrder(entry.getBattingOrder());
        s.setName(entry.getPlayer().getName());
        s.setPosition(entry.getPosition() != null ? entry.getPosition().name() : null);
        slots.add(s);
    }

    slotRepo.deleteByBogenIdAndSide(bogenId, targetSide);
    log.info("Spielbogen {} copyFromGameDay: gd={} game={} side={} → {} slots",
             bogenId, gameDayId, gameNumber, targetSide, slots.size());
    return slotRepo.saveAll(slots);
}
```

Add `import java.util.ArrayList;` and ensure `import com.softball.application.GameDayService;` is present.

- [ ] **Step 4: Run unit tests**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenSlotServiceTest
```

Expected: all 9 tests pass (8 from before + 1 new).

- [ ] **Step 5: Add controller endpoint**

In `SpielbogenController.java`, add at the end of the class:

```java
@PostMapping("/{id}/lineup/copy-from-gameday")
public List<SpielbogenSlotResponse> copyFromGameDay(@PathVariable Long id,
                                                     @Valid @RequestBody CopyFromGameDayRequest req) {
    return slotService.copyFromGameDay(id, req.gameDayId(), req.gameNumber(), req.targetSide())
                      .stream().map(SpielbogenSlotResponse::from).toList();
}
```

- [ ] **Step 6: Build + run all tests**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/softball/application/SpielbogenSlotService.java \
        backend/src/test/java/com/softball/application/SpielbogenSlotServiceTest.java \
        backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java
git commit -m "🔄 Spielbogen Copy-From-GameDay (Service + Endpoint + Test)"
```

---

### Task 19: Integration Test (Full Lifecycle)

**Files:**
- Create: `backend/src/test/java/com/softball/integration/SpielbogenIntegrationTest.java`

- [ ] **Step 1: Create integration test**

```java
package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
@WithMockUser
class SpielbogenIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;

    @Test
    void fullLifecycle_createDraftSetLineupStartEnd() throws Exception {
        // 1. Create as DRAFT
        var createBody = Map.of(
            "date", "2026-04-30",
            "location", "Krefeld",
            "homeTeamName", "Wuppertal Hilbillies",
            "awayTeamName", "Cologne Cardinals"
        );

        var response = mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("DRAFT"))
            .andExpect(jsonPath("$.currentSide").value("AWAY"))
            .andExpect(jsonPath("$.currentInning").value(1))
            .andReturn();

        Long bogenId = json.readTree(response.getResponse().getContentAsString()).get("id").asLong();

        // 2. Set HOME lineup (9 players)
        var homeLineup = Map.of(
            "side", "HOME",
            "slots", buildSlots(9)
        );
        mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(homeLineup)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(9));

        // 3. Set AWAY lineup
        var awayLineup = Map.of(
            "side", "AWAY",
            "slots", buildSlots(9)
        );
        mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(awayLineup)))
            .andExpect(status().isOk());

        // 4. Start (DRAFT → LIVE)
        mvc.perform(post("/api/spielbogen/" + bogenId + "/start"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("LIVE"));

        // 5. End (LIVE → DONE)
        mvc.perform(post("/api/spielbogen/" + bogenId + "/end")
                .contentType(APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("DONE"))
            .andExpect(jsonPath("$.endedAt").exists());
    }

    @Test
    void startRejectsIfLineupTooShort() throws Exception {
        var createBody = Map.of(
            "date", "2026-04-30",
            "homeTeamName", "Team A",
            "awayTeamName", "Team B"
        );
        var response = mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andReturn();
        Long bogenId = json.readTree(response.getResponse().getContentAsString()).get("id").asLong();

        var shortLineup = Map.of(
            "side", "HOME",
            "slots", buildSlots(9)
        );
        mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(shortLineup)))
            .andExpect(status().isOk());

        // AWAY has no lineup yet — start should fail
        mvc.perform(post("/api/spielbogen/" + bogenId + "/start"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void deleteCascadesSlots() throws Exception {
        var createBody = Map.of(
            "date", "2026-04-30",
            "homeTeamName", "X", "awayTeamName", "Y"
        );
        var response = mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andReturn();
        Long bogenId = json.readTree(response.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("side", "HOME", "slots", buildSlots(9)))))
            .andExpect(status().isOk());

        mvc.perform(delete("/api/spielbogen/" + bogenId))
            .andExpect(status().isNoContent());

        mvc.perform(get("/api/spielbogen/" + bogenId))
            .andExpect(status().isNotFound());
    }

    @Test
    void rejectsSameTeamNames() throws Exception {
        var body = Map.of(
            "date", "2026-04-30",
            "homeTeamName", "Same Name",
            "awayTeamName", "Same Name"
        );
        mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void endWithScoreOverride() throws Exception {
        var createBody = Map.of(
            "date", "2026-04-30",
            "homeTeamName", "X", "awayTeamName", "Y"
        );
        var response = mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andReturn();
        Long bogenId = json.readTree(response.getResponse().getContentAsString()).get("id").asLong();

        // Set both lineups + start
        for (String side : List.of("HOME", "AWAY")) {
            mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                    .contentType(APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("side", side, "slots", buildSlots(9)))))
                .andExpect(status().isOk());
        }
        mvc.perform(post("/api/spielbogen/" + bogenId + "/start"))
            .andExpect(status().isOk());

        // End with override
        mvc.perform(post("/api/spielbogen/" + bogenId + "/end")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("homeRuns", 10, "awayRuns", 5))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.homeRuns").value(10))
            .andExpect(jsonPath("$.awayRuns").value(5));
    }

    private List<Map<String, Object>> buildSlots(final int count) {
        var list = new java.util.ArrayList<Map<String, Object>>();
        for (int i = 1; i <= count; i++) {
            list.add(Map.of(
                "slot", i,
                "name", "Spieler " + i,
                "position", String.valueOf(i),
                "battingOrder", i
            ));
        }
        return list;
    }
}
```

- [ ] **Step 2: Run integration test**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenIntegrationTest
```

Expected: 5 tests, all pass. Testcontainers spins up PostgreSQL — Docker must be running.

- [ ] **Step 3: Run all backend tests to make sure nothing else broke**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/java/com/softball/integration/SpielbogenIntegrationTest.java
git commit -m "🧪 SpielbogenIntegrationTest — Full Lifecycle + Cascade + Validation"
```

---

## Frontend Tasks

### Task 20: Frontend TypeScript Types

**Files:**
- Modify: `frontend/src/types/index.ts` (append)

- [ ] **Step 1: Append Spielbogen types to `frontend/src/types/index.ts`**

```typescript
// Spielbogen
export type BogenSide = 'HOME' | 'AWAY'
export type BogenStatus = 'DRAFT' | 'LIVE' | 'DONE'

export interface SpielbogenResponse {
  id: number
  date: string
  location: string | null
  homeTeamName: string
  awayTeamName: string
  season: { id: number; name: string; year: number } | null
  status: BogenStatus
  currentInning: number
  currentSide: BogenSide
  homeRuns: number
  awayRuns: number
  leagueResultId: number | null
  createdAt: string
  updatedAt: string
  endedAt: string | null
}

export interface SpielbogenSlotResponse {
  id: number
  side: BogenSide
  slot: number
  name: string
  position: string | null
  battingOrder: number
}

export interface SpielbogenLineupResponse {
  home: SpielbogenSlotResponse[]
  away: SpielbogenSlotResponse[]
}

export interface CreateSpielbogenRequest {
  date: string
  location?: string | null
  homeTeamName: string
  awayTeamName: string
  seasonId?: number | null
}

export interface SetLineupRequest {
  side: BogenSide
  slots: Array<{
    slot: number
    name: string
    position?: string | null
    battingOrder: number
  }>
}

export interface UpdateSlotRequest {
  name?: string
  position?: string | null
  battingOrder?: number
}

export interface EndGameRequest {
  homeRuns?: number
  awayRuns?: number
}

export interface CopyFromGameDayRequest {
  gameDayId: number
  gameNumber: number
  targetSide: BogenSide
}

export const POSITION_OPTIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DH'] as const
```

- [ ] **Step 2: Build to verify types compile**

```bash
cd frontend && npm run build
```

Expected: BUILD SUCCESS (no TypeScript errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "🔠 Frontend Spielbogen TypeScript-Typen"
```

---

### Task 21: API Client Wrappers

**Files:**
- Modify: `frontend/src/api/client.ts` (append)

- [ ] **Step 1: Append API wrappers to `frontend/src/api/client.ts`**

```typescript
// Spielbogen
export async function listSpielbogen(filter?: { seasonId?: number; status?: string }): Promise<SpielbogenResponse[]> {
  const qs = new URLSearchParams()
  if (filter?.seasonId) qs.set('seasonId', String(filter.seasonId))
  if (filter?.status) qs.set('status', filter.status)
  return request<SpielbogenResponse[]>(`/spielbogen${qs.toString() ? '?' + qs.toString() : ''}`)
}

export async function createSpielbogen(req: CreateSpielbogenRequest): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>('/spielbogen', { method: 'POST', body: JSON.stringify(req) })
}

export async function getSpielbogen(id: number): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${id}`)
}

export async function updateSpielbogen(id: number, req: Partial<CreateSpielbogenRequest>): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${id}`, { method: 'PATCH', body: JSON.stringify(req) })
}

export async function deleteSpielbogen(id: number): Promise<void> {
  return request<void>(`/spielbogen/${id}`, { method: 'DELETE' })
}

export async function startSpielbogen(id: number): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${id}/start`, { method: 'POST' })
}

export async function endSpielbogen(id: number, req?: EndGameRequest): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${id}/end`, {
    method: 'POST',
    body: JSON.stringify(req ?? {})
  })
}

export async function reopenSpielbogen(id: number): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${id}/reopen`, { method: 'POST' })
}

export async function getSpielbogenLineup(id: number): Promise<SpielbogenLineupResponse> {
  return request<SpielbogenLineupResponse>(`/spielbogen/${id}/lineup`)
}

export async function setSpielbogenLineup(id: number, req: SetLineupRequest): Promise<SpielbogenSlotResponse[]> {
  return request<SpielbogenSlotResponse[]>(`/spielbogen/${id}/lineup`, {
    method: 'PUT',
    body: JSON.stringify(req)
  })
}

export async function updateSpielbogenSlot(id: number, slotId: number, req: UpdateSlotRequest): Promise<SpielbogenSlotResponse> {
  return request<SpielbogenSlotResponse>(`/spielbogen/${id}/slots/${slotId}`, {
    method: 'PATCH',
    body: JSON.stringify(req)
  })
}

export async function copySpielbogenLineupFromGameDay(id: number, req: CopyFromGameDayRequest): Promise<SpielbogenSlotResponse[]> {
  return request<SpielbogenSlotResponse[]>(`/spielbogen/${id}/lineup/copy-from-gameday`, {
    method: 'POST',
    body: JSON.stringify(req)
  })
}
```

> Note: Add new types to the existing `import type { ... }` block at top of file:

```typescript
import type {
  // ...existing types
  SpielbogenResponse,
  SpielbogenLineupResponse,
  SpielbogenSlotResponse,
  CreateSpielbogenRequest,
  SetLineupRequest,
  UpdateSlotRequest,
  EndGameRequest,
  CopyFromGameDayRequest,
} from '@/types'
```

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "🔌 API Client Wrappers für Spielbogen"
```

---

### Task 22: Top-Nav-Tab "Spielbogen"

**Files:**
- Modify: `frontend/src/components/layout/Layout.tsx`

- [ ] **Step 1: Add tab to TABS array in Layout.tsx**

Find the existing TABS array:

```tsx
const TABS = [
  { path: '/', label: 'Spielbetrieb', shortLabel: 'Spiele' },
  { path: '/training', label: 'Training', shortLabel: 'Training' },
  { path: '/training-plan', label: 'Trainingsplan', shortLabel: 'Plan' },
  { path: '/players', label: 'Spieler', shortLabel: 'Spieler' },
  { path: '/stats', label: 'Statistik', shortLabel: 'Stats' },
] as const
```

Replace with:

```tsx
const TABS = [
  { path: '/', label: 'Spielbetrieb', shortLabel: 'Spiele' },
  { path: '/training', label: 'Training', shortLabel: 'Training' },
  { path: '/training-plan', label: 'Trainingsplan', shortLabel: 'Plan' },
  { path: '/players', label: 'Spieler', shortLabel: 'Spieler' },
  { path: '/stats', label: 'Statistik', shortLabel: 'Stats' },
  { path: '/spielbogen', label: 'Spielbogen', shortLabel: 'Bogen' },
] as const
```

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Layout.tsx
git commit -m "🧭 Top-Nav-Tab 'Spielbogen' ergänzt"
```

---

### Task 23: useSpielbogenList Hook

**Files:**
- Create: `frontend/src/hooks/useSpielbogenList.ts`

- [ ] **Step 1: Create useSpielbogenList**

```typescript
import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { SpielbogenResponse } from '@/types'

export function useSpielbogenList(filter?: { seasonId?: number }) {
  const [items, setItems] = useState<SpielbogenResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listSpielbogen(filter)
      setItems(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [filter?.seasonId])

  useEffect(() => {
    reload()
  }, [reload])

  const remove = useCallback(async (id: number) => {
    await api.deleteSpielbogen(id)
    await reload()
  }, [reload])

  return { items, loading, error, reload, remove }
}
```

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSpielbogenList.ts
git commit -m "🎣 useSpielbogenList Hook"
```

---

### Task 24: useSpielbogen Hook (Detail + Lineup)

**Files:**
- Create: `frontend/src/hooks/useSpielbogen.ts`

- [ ] **Step 1: Create useSpielbogen**

```typescript
import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { SpielbogenResponse, SpielbogenLineupResponse, SetLineupRequest, UpdateSlotRequest } from '@/types'

export function useSpielbogen(id: number | null) {
  const [bogen, setBogen] = useState<SpielbogenResponse | null>(null)
  const [lineup, setLineup] = useState<SpielbogenLineupResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (id == null) return
    setLoading(true)
    setError(null)
    try {
      const [b, lu] = await Promise.all([api.getSpielbogen(id), api.getSpielbogenLineup(id)])
      setBogen(b)
      setLineup(lu)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  const setLineupForSide = useCallback(async (req: SetLineupRequest) => {
    if (id == null) return
    await api.setSpielbogenLineup(id, req)
    await reload()
  }, [id, reload])

  const updateSlot = useCallback(async (slotId: number, req: UpdateSlotRequest) => {
    if (id == null) return
    await api.updateSpielbogenSlot(id, slotId, req)
    await reload()
  }, [id, reload])

  const start = useCallback(async () => {
    if (id == null) return
    await api.startSpielbogen(id)
    await reload()
  }, [id, reload])

  const end = useCallback(async (homeRuns?: number, awayRuns?: number) => {
    if (id == null) return
    await api.endSpielbogen(id, { homeRuns, awayRuns })
    await reload()
  }, [id, reload])

  const reopen = useCallback(async () => {
    if (id == null) return
    await api.reopenSpielbogen(id)
    await reload()
  }, [id, reload])

  return { bogen, lineup, loading, error, reload, setLineupForSide, updateSlot, start, end, reopen }
}
```

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSpielbogen.ts
git commit -m "🎣 useSpielbogen Hook (Detail + Lineup-Mutations)"
```

---

### Task 25: localStorage Draft Helpers

**Files:**
- Create: `frontend/src/utils/spielbogenDraft.ts`

- [ ] **Step 1: Create spielbogenDraft helpers**

```typescript
import type { CreateSpielbogenRequest, SetLineupRequest } from '@/types'

const KEY = 'spielbogen_wizard_draft'

export interface WizardDraft {
  step: 1 | 2 | 3
  meta: Partial<CreateSpielbogenRequest>
  homeLineup: SetLineupRequest['slots']
  awayLineup: SetLineupRequest['slots']
  savedAt: number
}

export function saveDraft(draft: WizardDraft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* localStorage full — silent */
  }
}

export function loadDraft(): WizardDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as WizardDraft
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* silent */
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/spielbogenDraft.ts
git commit -m "💾 Wizard-Draft localStorage-Helper"
```

---

### Task 26: SpielbogenList Component (`/spielbogen` Page)

**Files:**
- Create: `frontend/src/components/spielbogen/SpielbogenList.tsx`

- [ ] **Step 1: Create SpielbogenList component**

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSpielbogenList } from '@/hooks/useSpielbogenList'
import { Button, EmptyState, LoadingSkeleton, ConfirmModal } from '@/components/shared'
import { CrossBones, PlusCircle, TrashBin } from '@/icons'
import type { SpielbogenResponse, BogenStatus } from '@/types'

const STATUS_LABEL: Record<BogenStatus, string> = {
  DRAFT: 'Entwurf',
  LIVE: 'Live',
  DONE: 'Abgeschlossen',
}

const STATUS_PILL: Record<BogenStatus, string> = {
  DRAFT: 'bg-cream-200 text-gray-700',
  LIVE: 'bg-softball-red-100 text-softball-red-700',
  DONE: 'bg-emerald-100 text-emerald-700',
}

export default function SpielbogenList() {
  const { items, loading, remove } = useSpielbogenList()
  const [deleteId, setDeleteId] = useState<number | null>(null)

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-wide uppercase text-navy-900">Spielbogen</h1>
        <Link to="/spielbogen/new">
          <Button variant="primary" icon={<PlusCircle size={16} />}>Neuer Spielbogen</Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CrossBones />}
          title="Noch kein Spielbogen"
          message="Lege jetzt einen Spielbogen für ein Liga-Spiel an."
        />
      ) : (
        <div className="space-y-2">
          {items.map(b => (
            <BogenTile key={b.id} bogen={b} onDelete={() => setDeleteId(b.id)} />
          ))}
        </div>
      )}

      {deleteId != null && (
        <ConfirmModal
          title="Spielbogen löschen?"
          message="Alle Lineup-Slots werden mitgelöscht. Aktion nicht umkehrbar."
          confirmLabel="Löschen"
          danger
          onConfirm={async () => {
            await remove(deleteId)
            setDeleteId(null)
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}

function BogenTile({ bogen, onDelete }: { bogen: SpielbogenResponse; onDelete: () => void }) {
  const date = new Date(bogen.date + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
  })
  const score = bogen.status === 'DONE' ? `${bogen.homeRuns}:${bogen.awayRuns}` : null

  return (
    <div className="group bg-cream-50 border border-cream-300 rounded-xl p-3 hover:border-navy-400 hover:bg-white transition-colors">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/spielbogen/${bogen.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-display text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full ${STATUS_PILL[bogen.status]}`}>
              {STATUS_LABEL[bogen.status]}
            </span>
            <span className="font-display text-sm tracking-wide text-gray-600">{date}</span>
            {bogen.location && <span className="font-body text-xs text-gray-500">· {bogen.location}</span>}
          </div>
          <div className="font-display text-lg font-extrabold text-navy-900 truncate">
            {bogen.homeTeamName} <span className="text-gray-400 font-normal">vs</span> {bogen.awayTeamName}
            {score && <span className="ml-2 text-softball-red-600">{score}</span>}
          </div>
          {bogen.leagueResultId != null && (
            <div className="font-body text-[11px] text-emerald-700 mt-0.5">Liga-Tabelle: registriert ✓</div>
          )}
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }}
          className="actions-reveal p-1.5 text-gray-400 hover:text-softball-red-600 cursor-pointer rounded"
          aria-label="Löschen"
        >
          <TrashBin size={16} />
        </button>
      </div>
    </div>
  )
}
```

> Note: This component assumes `EmptyState`, `Button`, `ConfirmModal`, `LoadingSkeleton` exist in `@/components/shared` and have specific signatures. Verify by opening those files; adjust prop names if needed.

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```

If `EmptyState` doesn't accept those props or doesn't exist with that signature, open `frontend/src/components/shared/EmptyState.tsx` and align the call. Same for `ConfirmModal`.

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/spielbogen/SpielbogenList.tsx
git commit -m "📋 SpielbogenList Liste-Page"
```

---

### Task 27: SlotEditor Component

**Files:**
- Create: `frontend/src/components/spielbogen/SlotEditor.tsx`

- [ ] **Step 1: Create SlotEditor**

```tsx
import { POSITION_OPTIONS } from '@/types'
import type { SetLineupRequest } from '@/types'

interface Props {
  slots: SetLineupRequest['slots']
  onChange: (slots: SetLineupRequest['slots']) => void
}

export function SlotEditor({ slots, onChange }: Props) {
  const updateSlot = (idx: number, patch: Partial<SetLineupRequest['slots'][number]>) => {
    const next = slots.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    onChange(next)
  }

  const filled = slots.filter(s => s.name.trim().length > 0).length
  const minOk = filled >= 9

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[36px_36px_1fr_72px] gap-2 items-center pb-1 border-b border-cream-300">
        <span className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">№</span>
        <span className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">BO</span>
        <span className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">Name</span>
        <span className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">Pos</span>
      </div>

      {slots.map((s, idx) => (
        <div key={idx} className="grid grid-cols-[36px_36px_1fr_72px] gap-2 items-center">
          <span className="font-display text-sm font-bold text-navy-800">{s.slot}</span>
          <input
            type="number"
            min={1}
            max={10}
            value={s.battingOrder}
            onChange={(e) => updateSlot(idx, { battingOrder: Number(e.target.value) })}
            className="bg-cream-50 border border-cream-300 rounded-md px-2 py-1.5 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
          />
          <input
            type="text"
            placeholder={`Spieler ${s.slot}`}
            value={s.name}
            onChange={(e) => updateSlot(idx, { name: e.target.value })}
            className="bg-cream-50 border border-cream-300 rounded-md px-2 py-1.5 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
          />
          <select
            value={s.position ?? ''}
            onChange={(e) => updateSlot(idx, { position: e.target.value || null })}
            className="bg-cream-50 border border-cream-300 rounded-md px-2 py-1.5 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none cursor-pointer"
          >
            <option value="">—</option>
            {POSITION_OPTIONS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      ))}

      <div className="text-xs text-gray-500 mt-2">
        {minOk ? (
          <span className="text-emerald-700">✓ Mindestens 9 Spieler eingetragen ({filled}/10)</span>
        ) : (
          <span className="text-amber-600">Mindestens 9 Spieler nötig (aktuell {filled})</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/spielbogen/SlotEditor.tsx
git commit -m "📝 SlotEditor — Lineup-Eingabe-Komponente"
```

---

### Task 28: WizardStepMeta

**Files:**
- Create: `frontend/src/components/spielbogen/WizardStepMeta.tsx`

- [ ] **Step 1: Create WizardStepMeta**

```tsx
import type { CreateSpielbogenRequest } from '@/types'

interface Props {
  meta: Partial<CreateSpielbogenRequest>
  onChange: (meta: Partial<CreateSpielbogenRequest>) => void
}

export function WizardStepMeta({ meta, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-1 block">Datum *</label>
        <input
          type="date"
          value={meta.date ?? ''}
          onChange={(e) => onChange({ ...meta, date: e.target.value })}
          className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
        />
      </div>

      <div>
        <label className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-1 block">Ort</label>
        <input
          type="text"
          value={meta.location ?? ''}
          placeholder="z.B. Krefeld"
          onChange={(e) => onChange({ ...meta, location: e.target.value })}
          className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
        />
      </div>

      <div>
        <label className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-1 block">Heim-Team *</label>
        <input
          type="text"
          value={meta.homeTeamName ?? ''}
          placeholder="z.B. Wuppertal Hilbillies"
          onChange={(e) => onChange({ ...meta, homeTeamName: e.target.value })}
          className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
        />
      </div>

      <div>
        <label className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-1 block">Gast-Team *</label>
        <input
          type="text"
          value={meta.awayTeamName ?? ''}
          placeholder="z.B. Cologne Cardinals"
          onChange={(e) => onChange({ ...meta, awayTeamName: e.target.value })}
          className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
        />
      </div>

      {/* Saison-Dropdown kommt in Phase 3 — Liga-Integration */}
    </div>
  )
}

export function metaIsValid(meta: Partial<CreateSpielbogenRequest>): boolean {
  return !!(meta.date && meta.homeTeamName?.trim() && meta.awayTeamName?.trim()
            && meta.homeTeamName.trim() !== meta.awayTeamName.trim())
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/spielbogen/WizardStepMeta.tsx
git commit -m "🪄 WizardStepMeta — Datum/Ort/Team-Namen"
```

---

### Task 29: WizardStepLineup

**Files:**
- Create: `frontend/src/components/spielbogen/WizardStepLineup.tsx`

- [ ] **Step 1: Create WizardStepLineup**

```tsx
import { useState } from 'react'
import { SlotEditor } from './SlotEditor'
import { Button } from '@/components/shared'
import type { SetLineupRequest, BogenSide } from '@/types'

type Mode = 'manual' | 'fast'

interface Props {
  homeLineup: SetLineupRequest['slots']
  awayLineup: SetLineupRequest['slots']
  onChange: (side: BogenSide, slots: SetLineupRequest['slots']) => void
}

const FAST_DEFAULT = (): SetLineupRequest['slots'] =>
  Array.from({ length: 9 }, (_, i) => ({
    slot: i + 1,
    name: `Spieler ${i + 1}`,
    position: null,
    battingOrder: i + 1,
  }))

const EMPTY_LINEUP = (): SetLineupRequest['slots'] =>
  Array.from({ length: 10 }, (_, i) => ({
    slot: i + 1,
    name: '',
    position: null,
    battingOrder: i + 1,
  }))

export function WizardStepLineup({ homeLineup, awayLineup, onChange }: Props) {
  const [activeSide, setActiveSide] = useState<BogenSide>('HOME')
  const [mode, setMode] = useState<Record<BogenSide, Mode>>({ HOME: 'manual', AWAY: 'manual' })

  const slots = activeSide === 'HOME' ? homeLineup : awayLineup

  // Initialize empty arrays if user hasn't entered anything yet
  if (slots.length === 0) {
    const initial = mode[activeSide] === 'fast' ? FAST_DEFAULT() : EMPTY_LINEUP()
    onChange(activeSide, initial)
  }

  const setFastMode = () => {
    setMode(m => ({ ...m, [activeSide]: 'fast' }))
    onChange(activeSide, FAST_DEFAULT())
  }

  const setManualMode = () => {
    setMode(m => ({ ...m, [activeSide]: 'manual' }))
    onChange(activeSide, EMPTY_LINEUP())
  }

  return (
    <div className="space-y-4">
      {/* Side-Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSide('HOME')}
          className={`flex-1 font-display py-2 rounded-lg text-sm font-extrabold tracking-widest uppercase transition-colors cursor-pointer ${
            activeSide === 'HOME' ? 'bg-navy-900 text-white' : 'bg-cream-100 text-gray-500 hover:bg-cream-200'
          }`}
        >
          Heim {homeLineup.filter(s => s.name.trim()).length >= 9 && <span className="text-emerald-300">✓</span>}
        </button>
        <button
          onClick={() => setActiveSide('AWAY')}
          className={`flex-1 font-display py-2 rounded-lg text-sm font-extrabold tracking-widest uppercase transition-colors cursor-pointer ${
            activeSide === 'AWAY' ? 'bg-navy-900 text-white' : 'bg-cream-100 text-gray-500 hover:bg-cream-200'
          }`}
        >
          Gast {awayLineup.filter(s => s.name.trim()).length >= 9 && <span className="text-emerald-300">✓</span>}
        </button>
      </div>

      {/* Mode-Toggle */}
      <div className="flex gap-2 text-xs">
        <Button
          variant={mode[activeSide] === 'manual' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={setManualMode}
        >
          Manuell
        </Button>
        <Button
          variant={mode[activeSide] === 'fast' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={setFastMode}
        >
          Schnell-Modus
        </Button>
      </div>

      <SlotEditor slots={slots} onChange={(s) => onChange(activeSide, s)} />
    </div>
  )
}

export function lineupIsValid(homeLineup: SetLineupRequest['slots'], awayLineup: SetLineupRequest['slots']): boolean {
  const filledHome = homeLineup.filter(s => s.name.trim()).length
  const filledAway = awayLineup.filter(s => s.name.trim()).length
  return filledHome >= 9 && filledAway >= 9
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/spielbogen/WizardStepLineup.tsx
git commit -m "🪄 WizardStepLineup — Lineup-Eingabe Heim/Gast mit Schnell-Modus"
```

---

### Task 30: WizardStepReview

**Files:**
- Create: `frontend/src/components/spielbogen/WizardStepReview.tsx`

- [ ] **Step 1: Create WizardStepReview**

```tsx
import type { CreateSpielbogenRequest, SetLineupRequest } from '@/types'

interface Props {
  meta: Partial<CreateSpielbogenRequest>
  homeLineup: SetLineupRequest['slots']
  awayLineup: SetLineupRequest['slots']
}

export function WizardStepReview({ meta, homeLineup, awayLineup }: Props) {
  const filteredHome = homeLineup.filter(s => s.name.trim())
  const filteredAway = awayLineup.filter(s => s.name.trim())

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-2">Spiel-Daten</h3>
        <div className="bg-cream-50 border border-cream-300 rounded-lg p-3 space-y-1 text-sm">
          <div><span className="text-gray-500">Datum:</span> {meta.date}</div>
          {meta.location && <div><span className="text-gray-500">Ort:</span> {meta.location}</div>}
          <div><span className="text-gray-500">Heim:</span> <span className="font-bold text-navy-900">{meta.homeTeamName}</span></div>
          <div><span className="text-gray-500">Gast:</span> <span className="font-bold text-navy-900">{meta.awayTeamName}</span></div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-2">
          Heim-Lineup ({filteredHome.length} Spieler)
        </h3>
        <ol className="bg-cream-50 border border-cream-300 rounded-lg p-3 text-sm space-y-1">
          {filteredHome.map((s) => (
            <li key={s.slot} className="flex justify-between">
              <span><span className="text-gray-500">{s.battingOrder}.</span> {s.name}</span>
              {s.position && <span className="text-gray-500">{s.position}</span>}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-2">
          Gast-Lineup ({filteredAway.length} Spieler)
        </h3>
        <ol className="bg-cream-50 border border-cream-300 rounded-lg p-3 text-sm space-y-1">
          {filteredAway.map((s) => (
            <li key={s.slot} className="flex justify-between">
              <span><span className="text-gray-500">{s.battingOrder}.</span> {s.name}</span>
              {s.position && <span className="text-gray-500">{s.position}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/spielbogen/WizardStepReview.tsx
git commit -m "🪄 WizardStepReview — Lineup-Übersicht vor Submit"
```

---

### Task 31: SpielbogenWizard Container

**Files:**
- Create: `frontend/src/components/spielbogen/SpielbogenWizard.tsx`

- [ ] **Step 1: Create SpielbogenWizard**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ConfirmModal } from '@/components/shared'
import { WizardStepMeta, metaIsValid } from './WizardStepMeta'
import { WizardStepLineup, lineupIsValid } from './WizardStepLineup'
import { WizardStepReview } from './WizardStepReview'
import { useToastContext } from '@/components/layout/Layout'
import { saveDraft, loadDraft, clearDraft, type WizardDraft } from '@/utils/spielbogenDraft'
import * as api from '@/api/client'
import type { CreateSpielbogenRequest, SetLineupRequest, BogenSide } from '@/types'

export default function SpielbogenWizard() {
  const navigate = useNavigate()
  const toast = useToastContext()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [meta, setMeta] = useState<Partial<CreateSpielbogenRequest>>({})
  const [homeLineup, setHomeLineup] = useState<SetLineupRequest['slots']>([])
  const [awayLineup, setAwayLineup] = useState<SetLineupRequest['slots']>([])
  const [submitting, setSubmitting] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [resumeDraft, setResumeDraft] = useState<WizardDraft | null>(null)

  // Resume-Prompt on mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setResumeDraft(draft)
      setShowResume(true)
    }
  }, [])

  // Auto-save on state change (debounced 1s)
  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft({ step, meta, homeLineup, awayLineup, savedAt: Date.now() })
    }, 1000)
    return () => clearTimeout(t)
  }, [step, meta, homeLineup, awayLineup])

  const updateLineup = (side: BogenSide, slots: SetLineupRequest['slots']) => {
    if (side === 'HOME') setHomeLineup(slots)
    else setAwayLineup(slots)
  }

  const handleSaveDraft = async () => {
    setSubmitting(true)
    try {
      const created = await api.createSpielbogen(meta as CreateSpielbogenRequest)
      // Set both lineups as DRAFT
      const homeFiltered = homeLineup.filter(s => s.name.trim())
      const awayFiltered = awayLineup.filter(s => s.name.trim())
      if (homeFiltered.length > 0) {
        await api.setSpielbogenLineup(created.id, { side: 'HOME', slots: homeFiltered })
      }
      if (awayFiltered.length > 0) {
        await api.setSpielbogenLineup(created.id, { side: 'AWAY', slots: awayFiltered })
      }
      clearDraft()
      toast.show('Entwurf gespeichert', 'success')
      navigate('/spielbogen')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartScoring = async () => {
    setSubmitting(true)
    try {
      const created = await api.createSpielbogen(meta as CreateSpielbogenRequest)
      await api.setSpielbogenLineup(created.id, {
        side: 'HOME',
        slots: homeLineup.filter(s => s.name.trim())
      })
      await api.setSpielbogenLineup(created.id, {
        side: 'AWAY',
        slots: awayLineup.filter(s => s.name.trim())
      })
      await api.startSpielbogen(created.id)
      clearDraft()
      toast.show('Spielbogen gestartet', 'success')
      navigate(`/spielbogen/${created.id}`)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const canAdvanceStep1 = metaIsValid(meta)
  const canAdvanceStep2 = lineupIsValid(homeLineup, awayLineup)

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <Stepper step={step} />

      {step === 1 && <WizardStepMeta meta={meta} onChange={setMeta} />}
      {step === 2 && <WizardStepLineup homeLineup={homeLineup} awayLineup={awayLineup} onChange={updateLineup} />}
      {step === 3 && <WizardStepReview meta={meta} homeLineup={homeLineup} awayLineup={awayLineup} />}

      <div className="flex justify-between gap-2 pt-2 border-t border-cream-300">
        {step > 1 ? (
          <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>← Zurück</Button>
        ) : (
          <Button variant="ghost" onClick={() => navigate('/spielbogen')}>Abbrechen</Button>
        )}

        {step === 1 && (
          <Button variant="secondary" disabled={!canAdvanceStep1} onClick={() => setStep(2)}>Weiter →</Button>
        )}
        {step === 2 && (
          <Button variant="secondary" disabled={!canAdvanceStep2} onClick={() => setStep(3)}>Weiter →</Button>
        )}
        {step === 3 && (
          <div className="flex gap-2">
            <Button variant="secondary" disabled={submitting} onClick={handleSaveDraft}>Als Entwurf speichern</Button>
            <Button variant="primary" disabled={submitting} onClick={handleStartScoring}>Speichern + Scoren</Button>
          </div>
        )}
      </div>

      {showResume && resumeDraft && (
        <ConfirmModal
          title="Entwurf wiederherstellen?"
          message={`Du hast einen unfertigen Spielbogen vom ${new Date(resumeDraft.savedAt).toLocaleString('de-DE')}.`}
          confirmLabel="Wiederherstellen"
          cancelLabel="Verwerfen + neu starten"
          onConfirm={() => {
            setStep(resumeDraft.step)
            setMeta(resumeDraft.meta)
            setHomeLineup(resumeDraft.homeLineup)
            setAwayLineup(resumeDraft.awayLineup)
            setShowResume(false)
            setResumeDraft(null)
          }}
          onCancel={() => {
            clearDraft()
            setShowResume(false)
            setResumeDraft(null)
          }}
        />
      )}
    </div>
  )
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const stages: Array<{ idx: 1 | 2 | 3; label: string }> = [
    { idx: 1, label: 'Meta' },
    { idx: 2, label: 'Lineup' },
    { idx: 3, label: 'Übersicht' },
  ]
  return (
    <div className="flex items-center justify-between mb-2">
      {stages.map((s, i) => (
        <div key={s.idx} className="flex items-center flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-xs font-extrabold ${
            step >= s.idx ? 'bg-navy-900 text-white' : 'bg-cream-200 text-gray-500'
          }`}>
            {s.idx}
          </div>
          <span className={`ml-2 font-display text-[10px] tracking-widest font-bold uppercase ${
            step === s.idx ? 'text-navy-900' : 'text-gray-500'
          }`}>{s.label}</span>
          {i < stages.length - 1 && <div className="flex-1 h-px bg-cream-300 mx-2" />}
        </div>
      ))}
    </div>
  )
}
```

> **Note:** This component depends on `ConfirmModal` accepting `cancelLabel`. If it doesn't, open `frontend/src/components/shared/ConfirmModal.tsx` and add the prop, or adjust call to use what's there.

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```

If build fails on `ConfirmModal` props, open `frontend/src/components/shared/ConfirmModal.tsx`, check signature, and either pass correct props or extend the component.

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/spielbogen/SpielbogenWizard.tsx
git commit -m "🪄 SpielbogenWizard — 3-Step Container mit Resume-Prompt"
```

---

### Task 32: Add Routes to App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add lazy imports + routes**

In `App.tsx`:

1. Add lazy imports near the top after the existing `lazy()` imports:

```tsx
const SpielbogenList = lazy(() => import('@/components/spielbogen/SpielbogenList'))
const SpielbogenWizard = lazy(() => import('@/components/spielbogen/SpielbogenWizard'))
```

2. Add wrappers similar to existing patterns:

```tsx
function LazySpielbogenList() {
  return <Suspense fallback={<LoadingSkeleton />}><SpielbogenList /></Suspense>
}

function LazySpielbogenWizard() {
  return <Suspense fallback={<LoadingSkeleton />}><SpielbogenWizard /></Suspense>
}
```

3. In the `createBrowserRouter` children array, add (after `/stats`):

```tsx
{ path: '/spielbogen', element: <LazySpielbogenList />, errorElement: <ChunkErrorBoundary /> },
{ path: '/spielbogen/new', element: <LazySpielbogenWizard />, errorElement: <ChunkErrorBoundary /> },
```

> Phase 1 does NOT add `/spielbogen/:id` — that's the Scoring-Page (Phase 2). For now, clicking a tile in the list navigates to `/spielbogen/:id` which 404s. That's expected for Phase 1.

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Lint**

```bash
cd frontend && npm run lint
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "🛣️ Routen /spielbogen und /spielbogen/new ergänzt"
```

---

### Task 33: Manual End-to-End Test

**No code changes — verification only.**

- [ ] **Step 1: Start backend (one terminal)**

```bash
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
```

Wait for Tomcat to come up on :8080.

- [ ] **Step 2: Start frontend (another terminal)**

```bash
cd frontend && npx vite
```

Open `http://localhost:5173`, login with default password.

- [ ] **Step 3: Test Wizard happy-path**

1. Click "Spielbogen" tab in nav → `/spielbogen` shows empty state
2. Click "Neuer Spielbogen" → wizard opens at Step 1
3. Fill date, location, both team names → "Weiter →"
4. Step 2: switch to HOME, manually fill 9 names → switch to GAST, "Schnell-Modus" → 9 default slots → "Weiter →"
5. Step 3: review shows both lineups
6. Click "Als Entwurf speichern" → returns to list with new tile (status: Entwurf)
7. Click tile → 404 (expected, scoring page is Phase 2)
8. Reload page → tile still there (persisted in DB)
9. Hover tile, click trash icon → confirm → tile gone

- [ ] **Step 4: Test Resume-Draft flow**

1. Open wizard, fill Step 1 + Step 2 partially → close tab
2. Reopen `/spielbogen/new` → "Entwurf wiederherstellen?" modal
3. "Wiederherstellen" → state restored at correct step
4. Repeat → "Verwerfen + neu starten" → fresh wizard

- [ ] **Step 5: Test validation errors**

1. Start wizard, leave a field blank → "Weiter →" disabled
2. Enter same name in Heim+Gast → POST returns 400 with German error message → toast displayed
3. Try Step 2 with only 8 names → "Weiter →" disabled

- [ ] **Step 6: Stop servers (Ctrl+C in both terminals)**

- [ ] **Step 7: Commit Phase 1 completion marker (optional)**

```bash
git commit --allow-empty -m "✅ Spielbogen Phase 1 — Backend + Liste + Wizard fertig"
```

---

## Self-Review Checklist

After completing all tasks, verify against the spec:

- [ ] All Backend Phase 1 components created (Migration, Domain, Adapter, Application, Web)
- [ ] All Frontend Phase 1 components created (List, Wizard, Hooks, Types, API)
- [ ] Top-Nav-Tab "Spielbogen" appears
- [ ] Wizard 3 Steps work, validation prevents incomplete state
- [ ] Schnell-Modus generates 9 default slots
- [ ] Status DRAFT on save, status LIVE on "Speichern + Scoren"
- [ ] localStorage Resume-Draft works
- [ ] Cascade-Delete: deleting Bogen removes Slots
- [ ] Same Heim/Gast names rejected (400)
- [ ] Backend tests all green: `./mvnw test -s .mvn/local-settings.xml`
- [ ] Frontend build green: `npm run build`
- [ ] Frontend lint green: `npm run lint`

## Out of Scope (Phase 2 + 3 in separate plans)

- AtBat/Stealing/Substitution recording (Phase 2)
- ScoringPage at `/spielbogen/:id` with action buttons (Phase 2)
- RFL-Sheet-Drawer rendering (Phase 2)
- PDF-Export (Phase 3)
- Liga-Result-Registrierung (Phase 3)
- Cheatsheet-Drawer (Phase 3)
- Saison-Dropdown im Wizard Step 1 (Phase 3 — needed for Liga-Sync)
