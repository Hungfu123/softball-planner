# Lineup-Sets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Speichere pro Spieltag mehrere benannte Lineup-Varianten ("Sets") und wende sie in den Editor-Draft an; abwesende Spieler hinterlassen einen leeren Slot zum Nachbesetzen.

**Architecture:** Backend Onion-Slice (Flyway → Domain-Model → Port → Persistence-Adapter → Application-Service → REST-Controller), gespiegelt am bestehenden `GameStaff`/`LineupEntry`-Code. Frontend: neuer `useLineupSets`-Hook (CRUD) + Erweiterung von `useLineup` um `applySet`/Empty-Slot-Handling; UI-Leiste im `GameDayPlanner`-Header.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway, PostgreSQL 17, Testcontainers, MockMvc · React 19, TypeScript, Vite, Tailwind v4, @dnd-kit.

**Spec:** `docs/superpowers/specs/2026-06-10-lineup-sets-design.md`

---

## File Structure

**Backend (new):**
- `backend/src/main/resources/db/migration/V38__create_lineup_sets.sql`
- `backend/src/main/java/com/softball/domain/model/LineupSet.java`
- `backend/src/main/java/com/softball/domain/model/LineupSetEntry.java`
- `backend/src/main/java/com/softball/domain/port/out/LineupSetRepository.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/entity/LineupSetEntity.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/entity/LineupSetEntryEntity.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringLineupSetRepository.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/mapper/LineupSetMapper.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/adapter/LineupSetRepositoryAdapter.java`
- `backend/src/main/java/com/softball/application/LineupSetService.java`
- `backend/src/main/java/com/softball/adapter/in/web/LineupSetController.java`
- `backend/src/main/java/com/softball/adapter/dto/LineupSetResponse.java`
- `backend/src/main/java/com/softball/adapter/dto/LineupSetEntryResponse.java`
- `backend/src/main/java/com/softball/adapter/dto/CreateLineupSetRequest.java`
- `backend/src/main/java/com/softball/adapter/dto/RenameLineupSetRequest.java`
- `backend/src/test/java/com/softball/integration/LineupSetIntegrationTest.java`

**Frontend (new):**
- `frontend/src/hooks/useLineupSets.ts`
- `frontend/src/components/planner/LineupSetBar.tsx`
- `frontend/src/components/planner/SaveSetModal.tsx`

**Frontend (modify):**
- `frontend/src/types/index.ts` — add `LineupSetResponse`, `LineupSetEntryResponse`; add `isEmptySlot?` to `LocalLineupEntry`
- `frontend/src/api/client.ts` — add `getLineupSets`/`createLineupSet`/`renameLineupSet`/`deleteLineupSet`
- `frontend/src/hooks/useLineup.ts` — add `applySet`, `fillEmptySlot`, `hasEmptySlots`
- `frontend/src/components/planner/LineupRow.tsx` — render empty-slot row + fill picker
- `frontend/src/components/planner/GameDayPlanner.tsx` — wire set bar + apply + save-guard

---

## PHASE 1 — Backend

### Task 1: Flyway migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V38__create_lineup_sets.sql`

- [ ] **Step 1: Write the migration**

```sql
CREATE TABLE lineup_set (
    id          BIGSERIAL PRIMARY KEY,
    game_day_id BIGINT NOT NULL REFERENCES game_day(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE lineup_set_entry (
    id                  BIGSERIAL PRIMARY KEY,
    lineup_set_id       BIGINT NOT NULL REFERENCES lineup_set(id) ON DELETE CASCADE,
    game_number         INT NOT NULL,
    player_id           BIGINT NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    position            VARCHAR(255),
    batting_order       INT NOT NULL,
    dh_batter_player_id BIGINT REFERENCES player(id) ON DELETE CASCADE
);

CREATE INDEX idx_lineup_set_game_day ON lineup_set(game_day_id);
CREATE INDEX idx_lineup_set_entry_set ON lineup_set_entry(lineup_set_id);
```

> NOTE: confirm the actual table names of the referenced tables before running — this plan assumes `game_day(id)` and `player(id)`. If the live schema uses `game_days`/`players`, adjust the `REFERENCES`. Verify with: `grep -ri "create table" backend/src/main/resources/db/migration/ | grep -iE "player|game_day"`.

- [ ] **Step 2: Verify referenced table names**

Run: `grep -riE "create table (game_day|game_days|player|players)\b" backend/src/main/resources/db/migration/`
Expected: shows the canonical table names. Fix the `REFERENCES` in the migration if they differ.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V38__create_lineup_sets.sql
git commit -m "🗃️ Flyway V38: lineup_set + lineup_set_entry Tabellen"
```

---

### Task 2: Domain models

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/LineupSet.java`
- Create: `backend/src/main/java/com/softball/domain/model/LineupSetEntry.java`

- [ ] **Step 1: Write `LineupSetEntry`**

```java
package com.softball.domain.model;

public class LineupSetEntry {
    private Long id;
    private Integer gameNumber;
    private Player player;
    private Position position;
    private Integer battingOrder;
    private Player dhBatterPlayer;

    public LineupSetEntry() {}

    public LineupSetEntry(final Integer gameNumber, final Player player, final Position position,
                          final Integer battingOrder, final Player dhBatterPlayer) {
        this.gameNumber = gameNumber;
        this.player = player;
        this.position = position;
        this.battingOrder = battingOrder;
        this.dhBatterPlayer = dhBatterPlayer;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public Player getPlayer() { return player; }
    public void setPlayer(final Player player) { this.player = player; }
    public Position getPosition() { return position; }
    public void setPosition(final Position position) { this.position = position; }
    public Integer getBattingOrder() { return battingOrder; }
    public void setBattingOrder(final Integer battingOrder) { this.battingOrder = battingOrder; }
    public Player getDhBatterPlayer() { return dhBatterPlayer; }
    public void setDhBatterPlayer(final Player dhBatterPlayer) { this.dhBatterPlayer = dhBatterPlayer; }
}
```

- [ ] **Step 2: Write `LineupSet`**

```java
package com.softball.domain.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class LineupSet {
    private Long id;
    private Long gameDayId;
    private String name;
    private Instant createdAt;
    private int sortOrder;
    private List<LineupSetEntry> entries = new ArrayList<>();

    public LineupSet() {}

    public LineupSet(final Long gameDayId, final String name, final int sortOrder) {
        this.gameDayId = gameDayId;
        this.name = name;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Long getGameDayId() { return gameDayId; }
    public void setGameDayId(final Long gameDayId) { this.gameDayId = gameDayId; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(final int sortOrder) { this.sortOrder = sortOrder; }
    public List<LineupSetEntry> getEntries() { return entries; }
    public void setEntries(final List<LineupSetEntry> entries) { this.entries = entries; }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/LineupSet.java backend/src/main/java/com/softball/domain/model/LineupSetEntry.java
git commit -m "✨ Domain: LineupSet + LineupSetEntry Models"
```

---

### Task 3: Repository port

**Files:**
- Create: `backend/src/main/java/com/softball/domain/port/out/LineupSetRepository.java`

- [ ] **Step 1: Write the port**

```java
package com.softball.domain.port.out;

import com.softball.domain.model.LineupSet;
import java.util.List;
import java.util.Optional;

public interface LineupSetRepository {
    List<LineupSet> findByGameDayId(Long gameDayId);
    Optional<LineupSet> findById(Long id);
    LineupSet save(LineupSet lineupSet);
    void deleteById(Long id);
    int maxSortOrder(Long gameDayId);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/softball/domain/port/out/LineupSetRepository.java
git commit -m "✨ Port: LineupSetRepository"
```

---

### Task 4: Persistence — entities, Spring repo, mapper, adapter

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/LineupSetEntity.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/LineupSetEntryEntity.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringLineupSetRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/LineupSetMapper.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/LineupSetRepositoryAdapter.java`

- [ ] **Step 1: Write `LineupSetEntryEntity`**

```java
package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.Position;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "lineup_set_entry")
public class LineupSetEntryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lineup_set_id", nullable = false)
    @JsonIgnore
    private LineupSetEntity lineupSet;

    @Column(name = "game_number", nullable = false)
    private Integer gameNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_id", nullable = false)
    private PlayerEntity player;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(255)")
    private Position position;

    @Column(name = "batting_order", nullable = false)
    private Integer battingOrder;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dh_batter_player_id")
    private PlayerEntity dhBatterPlayer;

    public LineupSetEntryEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LineupSetEntity getLineupSet() { return lineupSet; }
    public void setLineupSet(final LineupSetEntity lineupSet) { this.lineupSet = lineupSet; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public PlayerEntity getPlayer() { return player; }
    public void setPlayer(final PlayerEntity player) { this.player = player; }
    public Position getPosition() { return position; }
    public void setPosition(final Position position) { this.position = position; }
    public Integer getBattingOrder() { return battingOrder; }
    public void setBattingOrder(final Integer battingOrder) { this.battingOrder = battingOrder; }
    public PlayerEntity getDhBatterPlayer() { return dhBatterPlayer; }
    public void setDhBatterPlayer(final PlayerEntity dhBatterPlayer) { this.dhBatterPlayer = dhBatterPlayer; }
}
```

- [ ] **Step 2: Write `LineupSetEntity`** (cascade so set-entries persist/delete with the set)

```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lineup_set")
public class LineupSetEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_day_id", nullable = false)
    private Long gameDayId;

    @Column(nullable = false)
    private String name;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @OneToMany(mappedBy = "lineupSet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<LineupSetEntryEntity> entries = new ArrayList<>();

    public LineupSetEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Long getGameDayId() { return gameDayId; }
    public void setGameDayId(final Long gameDayId) { this.gameDayId = gameDayId; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(final int sortOrder) { this.sortOrder = sortOrder; }
    public List<LineupSetEntryEntity> getEntries() { return entries; }
    public void setEntries(final List<LineupSetEntryEntity> entries) { this.entries = entries; }
}
```

- [ ] **Step 3: Write `SpringLineupSetRepository`**

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.LineupSetEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SpringLineupSetRepository extends JpaRepository<LineupSetEntity, Long> {

    List<LineupSetEntity> findByGameDayIdOrderBySortOrderAsc(Long gameDayId);

    @Query("SELECT COALESCE(MAX(s.sortOrder), -1) FROM LineupSetEntity s WHERE s.gameDayId = :gameDayId")
    int maxSortOrder(Long gameDayId);
}
```

- [ ] **Step 4: Write `LineupSetMapper`** (mirrors `LineupEntryMapper`; uses `PlayerMapper` for domain players and `getReferenceById` on Spring side for FK-only writes)

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.LineupSetEntity;
import com.softball.adapter.out.persistence.entity.LineupSetEntryEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.domain.model.LineupSet;
import com.softball.domain.model.LineupSetEntry;
import org.springframework.stereotype.Component;

@Component
public class LineupSetMapper {

    private final PlayerMapper playerMapper;
    private final SpringPlayerRepository playerRepo;

    public LineupSetMapper(final PlayerMapper playerMapper, final SpringPlayerRepository playerRepo) {
        this.playerMapper = playerMapper;
        this.playerRepo = playerRepo;
    }

    public LineupSet toDomain(final LineupSetEntity entity) {
        if (entity == null) return null;
        final LineupSet set = new LineupSet(entity.getGameDayId(), entity.getName(), entity.getSortOrder());
        set.setId(entity.getId());
        set.setCreatedAt(entity.getCreatedAt());
        set.setEntries(entity.getEntries().stream()
            .sorted((a, b) -> {
                final int g = Integer.compare(a.getGameNumber(), b.getGameNumber());
                return g != 0 ? g : Integer.compare(a.getBattingOrder(), b.getBattingOrder());
            })
            .map(this::toDomainEntry)
            .toList());
        return set;
    }

    private LineupSetEntry toDomainEntry(final LineupSetEntryEntity e) {
        final LineupSetEntry entry = new LineupSetEntry(
            e.getGameNumber(),
            playerMapper.toDomain(e.getPlayer()),
            e.getPosition(),
            e.getBattingOrder(),
            playerMapper.toDomain(e.getDhBatterPlayer())
        );
        entry.setId(e.getId());
        return entry;
    }

    /** Build a fresh entity graph for INSERT. IDs ignored — save() always creates. */
    public LineupSetEntity toEntity(final LineupSet domain) {
        final LineupSetEntity entity = new LineupSetEntity();
        entity.setId(domain.getId());
        entity.setGameDayId(domain.getGameDayId());
        entity.setName(domain.getName());
        if (domain.getCreatedAt() != null) entity.setCreatedAt(domain.getCreatedAt());
        entity.setSortOrder(domain.getSortOrder());
        entity.setEntries(domain.getEntries().stream().map(d -> {
            final LineupSetEntryEntity e = new LineupSetEntryEntity();
            e.setLineupSet(entity);
            e.setGameNumber(d.getGameNumber());
            e.setPlayer(playerRepo.getReferenceById(d.getPlayer().getId()));
            e.setPosition(d.getPosition());
            e.setBattingOrder(d.getBattingOrder());
            if (d.getDhBatterPlayer() != null) {
                e.setDhBatterPlayer(playerRepo.getReferenceById(d.getDhBatterPlayer().getId()));
            }
            return e;
        }).toList());
        return entity;
    }
}
```

- [ ] **Step 5: Write `LineupSetRepositoryAdapter`**

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.LineupSetEntity;
import com.softball.adapter.out.persistence.mapper.LineupSetMapper;
import com.softball.adapter.out.persistence.repository.SpringLineupSetRepository;
import com.softball.domain.model.LineupSet;
import com.softball.domain.port.out.LineupSetRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class LineupSetRepositoryAdapter implements LineupSetRepository {

    private final SpringLineupSetRepository repo;
    private final LineupSetMapper mapper;

    public LineupSetRepositoryAdapter(final SpringLineupSetRepository repo, final LineupSetMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LineupSet> findByGameDayId(final Long gameDayId) {
        return repo.findByGameDayIdOrderBySortOrderAsc(gameDayId).stream().map(mapper::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<LineupSet> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    @Transactional
    public LineupSet save(final LineupSet lineupSet) {
        final LineupSetEntity entity = mapper.toEntity(lineupSet);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    @Transactional
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public int maxSortOrder(final Long gameDayId) {
        return repo.maxSortOrder(gameDayId);
    }
}
```

- [ ] **Step 6: Compile**

Run: `cd backend && ./mvnw -q compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS (no references to the not-yet-written service/controller).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/
git commit -m "✨ Persistence: LineupSet Entity/Repo/Mapper/Adapter"
```

---

### Task 5: Application service

**Files:**
- Create: `backend/src/main/java/com/softball/application/LineupSetService.java`

- [ ] **Step 1: Write `LineupSetService`**

Snapshot reads all games of the gameday (ordered by gameNumber) + their lineup entries, copies each into a `LineupSetEntry` keyed by `gameNumber`.

```java
package com.softball.application;

import com.softball.domain.model.Game;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.LineupSet;
import com.softball.domain.model.LineupSetEntry;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.LineupSetRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LineupSetService {

    private static final Logger log = LoggerFactory.getLogger(LineupSetService.class);

    private final LineupSetRepository lineupSetRepository;
    private final GameRepository gameRepository;
    private final LineupEntryRepository lineupEntryRepository;

    public LineupSetService(final LineupSetRepository lineupSetRepository,
                            final GameRepository gameRepository,
                            final LineupEntryRepository lineupEntryRepository) {
        this.lineupSetRepository = lineupSetRepository;
        this.gameRepository = gameRepository;
        this.lineupEntryRepository = lineupEntryRepository;
    }

    @Transactional(readOnly = true)
    public List<LineupSet> findByGameDay(final Long gameDayId) {
        return lineupSetRepository.findByGameDayId(gameDayId);
    }

    @Transactional
    public LineupSet snapshot(final Long gameDayId, final String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessValidationException("Set-Name darf nicht leer sein");
        }
        final List<Game> games = gameRepository.findByGameDayIdOrderByGameNumberAsc(gameDayId);
        if (games.isEmpty()) {
            throw new ResourceNotFoundException("GameDay", gameDayId);
        }
        final Map<Long, Integer> gameNumberById = games.stream()
            .collect(Collectors.toMap(Game::getId, Game::getGameNumber));
        final List<Long> gameIds = games.stream().map(Game::getId).toList();
        final List<LineupEntry> entries = lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds);

        final int sortOrder = lineupSetRepository.maxSortOrder(gameDayId) + 1;
        final LineupSet set = new LineupSet(gameDayId, name.trim(), sortOrder);
        set.setEntries(entries.stream().map(e -> new LineupSetEntry(
            gameNumberById.get(e.getGame().getId()),
            e.getPlayer(),
            e.getPosition(),
            e.getBattingOrder(),
            e.getDhBatterPlayer()
        )).toList());

        final LineupSet saved = lineupSetRepository.save(set);
        log.info("Lineup-Set '{}' für GameDay {} mit {} Eintraegen gespeichert", name, gameDayId, saved.getEntries().size());
        return saved;
    }

    @Transactional
    public LineupSet rename(final Long setId, final String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessValidationException("Set-Name darf nicht leer sein");
        }
        final LineupSet set = lineupSetRepository.findById(setId)
            .orElseThrow(() -> new ResourceNotFoundException("LineupSet", setId));
        set.setName(name.trim());
        final LineupSet saved = lineupSetRepository.save(set);
        log.info("Lineup-Set {} umbenannt zu '{}'", setId, name);
        return saved;
    }

    @Transactional
    public void delete(final Long setId) {
        lineupSetRepository.findById(setId)
            .orElseThrow(() -> new ResourceNotFoundException("LineupSet", setId));
        lineupSetRepository.deleteById(setId);
        log.info("Lineup-Set {} geloescht", setId);
    }
}
```

> NOTE on `rename` via `save`: `mapper.toEntity` rebuilds the entity from the domain `id`, and because `cascade=ALL`+`orphanRemoval` are set, `repo.save` will merge. Since `findById` loaded the full entry graph into the domain model and we only changed the name, the entries are re-written with their existing IDs — a no-op merge. This is acceptable for a rarely-called rename. (If the merge proves problematic in the integration test, switch `rename` to a dedicated `SpringLineupSetRepository` `@Modifying update name` query — note this alternative here and use it.)

- [ ] **Step 2: Compile**

Run: `cd backend && ./mvnw -q compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/application/LineupSetService.java
git commit -m "✨ LineupSetService: Snapshot/Rename/Delete"
```

---

### Task 6: DTOs + REST controller

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/LineupSetEntryResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/LineupSetResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/CreateLineupSetRequest.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/RenameLineupSetRequest.java`
- Create: `backend/src/main/java/com/softball/adapter/in/web/LineupSetController.java`

- [ ] **Step 1: Write `LineupSetEntryResponse`** (mirrors `LineupEntryResponse`: position emitted as `displayName`)

```java
package com.softball.adapter.dto;

import com.softball.domain.model.LineupSetEntry;

public record LineupSetEntryResponse(Long id, Integer gameNumber, PlayerResponse player,
                                     String position, Integer battingOrder, PlayerResponse dhBatterPlayer) {
    public static LineupSetEntryResponse from(final LineupSetEntry e) {
        return new LineupSetEntryResponse(
            e.getId(),
            e.getGameNumber(),
            PlayerResponse.from(e.getPlayer()),
            e.getPosition() != null ? e.getPosition().displayName() : null,
            e.getBattingOrder(),
            e.getDhBatterPlayer() != null ? PlayerResponse.from(e.getDhBatterPlayer()) : null
        );
    }
}
```

- [ ] **Step 2: Write `LineupSetResponse`**

```java
package com.softball.adapter.dto;

import com.softball.domain.model.LineupSet;
import java.util.List;

public record LineupSetResponse(Long id, Long gameDayId, String name, List<LineupSetEntryResponse> entries) {
    public static LineupSetResponse from(final LineupSet set) {
        return new LineupSetResponse(
            set.getId(),
            set.getGameDayId(),
            set.getName(),
            set.getEntries().stream().map(LineupSetEntryResponse::from).toList()
        );
    }
}
```

- [ ] **Step 3: Write request records**

`CreateLineupSetRequest.java`:
```java
package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateLineupSetRequest(@NotBlank String name) {}
```

`RenameLineupSetRequest.java`:
```java
package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record RenameLineupSetRequest(@NotBlank String name) {}
```

- [ ] **Step 4: Write `LineupSetController`**

```java
package com.softball.adapter.in.web;

import com.softball.adapter.dto.CreateLineupSetRequest;
import com.softball.adapter.dto.LineupSetResponse;
import com.softball.adapter.dto.RenameLineupSetRequest;
import com.softball.application.LineupSetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class LineupSetController {

    private final LineupSetService lineupSetService;

    public LineupSetController(final LineupSetService lineupSetService) {
        this.lineupSetService = lineupSetService;
    }

    @GetMapping("/gamedays/{gameDayId}/lineup-sets")
    public List<LineupSetResponse> list(@PathVariable final Long gameDayId) {
        return lineupSetService.findByGameDay(gameDayId).stream().map(LineupSetResponse::from).toList();
    }

    @PostMapping("/gamedays/{gameDayId}/lineup-sets")
    @ResponseStatus(HttpStatus.CREATED)
    public LineupSetResponse create(@PathVariable final Long gameDayId,
                                    @Valid @RequestBody final CreateLineupSetRequest request) {
        return LineupSetResponse.from(lineupSetService.snapshot(gameDayId, request.name()));
    }

    @PatchMapping("/lineup-sets/{id}")
    public LineupSetResponse rename(@PathVariable final Long id,
                                    @Valid @RequestBody final RenameLineupSetRequest request) {
        return LineupSetResponse.from(lineupSetService.rename(id, request.name()));
    }

    @DeleteMapping("/lineup-sets/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        lineupSetService.delete(id);
    }
}
```

- [ ] **Step 5: Compile**

Run: `cd backend && ./mvnw -q compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/LineupSet*.java backend/src/main/java/com/softball/adapter/dto/CreateLineupSetRequest.java backend/src/main/java/com/softball/adapter/dto/RenameLineupSetRequest.java backend/src/main/java/com/softball/adapter/in/web/LineupSetController.java
git commit -m "✨ LineupSet DTOs + REST-Controller"
```

---

### Task 7: Integration test (TDD verification of the whole slice)

**Files:**
- Create: `backend/src/test/java/com/softball/integration/LineupSetIntegrationTest.java`

- [ ] **Step 1: Write the integration test**

Mirrors `LineupIntegrationTest` setup (gameday auto-creates games; set available players; PUT a lineup; snapshot; assert).

```java
package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.*;
import com.softball.TestcontainersConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class LineupSetIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SpringSeasonRepository seasonRepository;
    @Autowired private SpringPlayerRepository playerRepository;

    private Long gameDayId;
    private Long gameId;
    private PlayerEntity p1, p2, p3;

    @BeforeEach
    void setUp() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        p1 = playerRepository.save(new PlayerEntity("Max"));
        p2 = playerRepository.save(new PlayerEntity("Lisa"));
        p3 = playerRepository.save(new PlayerEntity("Tom"));

        final MvcResult res = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();
        final var json = objectMapper.readTree(res.getResponse().getContentAsString());
        gameDayId = json.get("id").asLong();
        gameId = json.get("games").get(0).get("id").asLong();

        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(p1.getId(), p2.getId(), p3.getId())))));

        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", p1.getId(), "position", "P", "battingOrder", 1),
                Map.of("playerId", p2.getId(), "position", "1B", "battingOrder", 2),
                Map.of("playerId", p3.getId(), "position", "C", "battingOrder", 3)
            )))).andExpect(status().isOk());
    }

    @Test
    void snapshotCapturesCurrentLineup() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup-sets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Variante A"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Variante A"))
            .andExpect(jsonPath("$.entries.length()").value(3))
            .andExpect(jsonPath("$.entries[0].gameNumber").value(1))
            .andExpect(jsonPath("$.entries[0].player.name").value("Max"))
            .andExpect(jsonPath("$.entries[1].position").value("1B"));

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/lineup-sets"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void blankNameRejected() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup-sets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "  "))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void renameAndDelete() throws Exception {
        final MvcResult created = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup-sets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Alt"))))
            .andReturn();
        final Long setId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(patch("/api/lineup-sets/" + setId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Neu"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Neu"))
            .andExpect(jsonPath("$.entries.length()").value(3));

        mockMvc.perform(delete("/api/lineup-sets/" + setId)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/lineup-sets"))
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void deletingGameDayCascadesSets() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup-sets")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("name", "Variante A"))));

        mockMvc.perform(delete("/api/gamedays/" + gameDayId)).andExpect(status().is2xxSuccessful());
        // Sets gone with the gameday (ON DELETE CASCADE) — re-listing a deleted gameday returns empty/404.
        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/lineup-sets"))
            .andExpect(jsonPath("$.length()").value(0));
    }
}
```

- [ ] **Step 2: Run — expect FAIL first if any wiring missing, then iterate to green**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=LineupSetIntegrationTest`
Expected: All 4 tests PASS. (Docker must be running for Testcontainers.)

If `renameAndDelete` fails on the merge described in Task 5 NOTE, switch `rename` to a `@Modifying` update query and re-run.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/softball/integration/LineupSetIntegrationTest.java
git commit -m "✅ LineupSet Integrationstest (Snapshot/Rename/Delete/Cascade)"
```

---

## PHASE 2 — Frontend foundation

### Task 8: Types + API client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add response types** (after the `LocalLineupEntry` block, ~line 88 in `types/index.ts`)

```ts
export interface LineupSetEntryResponse {
  id: number
  gameNumber: number
  player: Player
  position: string | null
  battingOrder: number
  dhBatterPlayer: Player | null
}

export interface LineupSetResponse {
  id: number
  gameDayId: number
  name: string
  entries: LineupSetEntryResponse[]
}
```

- [ ] **Step 2: Add `isEmptySlot` to `LocalLineupEntry`** (modify the existing interface)

```ts
export interface LocalLineupEntry {
  player: Player
  position: string | null
  dhBatterId: number | null
  dhBatterName: string | null
  isEmptySlot?: boolean   // draft-only: placeholder for an absent player (player is a synthetic sentinel)
}
```

- [ ] **Step 3: Add API functions** (in `api/client.ts`; add `LineupSetResponse` to the type import block at top)

```ts
// Lineup-Sets
export const getLineupSets = (gameDayId: number) =>
  request<LineupSetResponse[]>(`/gamedays/${gameDayId}/lineup-sets`)

export const createLineupSet = (gameDayId: number, name: string) =>
  request<LineupSetResponse>(`/gamedays/${gameDayId}/lineup-sets`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

export const renameLineupSet = (setId: number, name: string) =>
  request<LineupSetResponse>(`/lineup-sets/${setId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })

export const deleteLineupSet = (setId: number) =>
  request<void>(`/lineup-sets/${setId}`, { method: 'DELETE' })
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts
git commit -m "✨ FE: LineupSet Types + API-Client"
```

---

### Task 9: `useLineupSets` hook

**Files:**
- Create: `frontend/src/hooks/useLineupSets.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useState, useCallback, useEffect } from 'react'
import type { LineupSetResponse } from '@/types'
import * as api from '@/api/client'

export function useLineupSets(gameDayId: number | null) {
  const [sets, setSets] = useState<LineupSetResponse[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (gameDayId == null) return
    setLoading(true)
    try {
      setSets(await api.getLineupSets(gameDayId))
    } finally {
      setLoading(false)
    }
  }, [gameDayId])

  useEffect(() => { void reload() }, [reload])

  const create = useCallback(async (name: string) => {
    if (gameDayId == null) return
    const created = await api.createLineupSet(gameDayId, name)
    setSets(prev => [...prev, created])
    return created
  }, [gameDayId])

  const rename = useCallback(async (setId: number, name: string) => {
    const updated = await api.renameLineupSet(setId, name)
    setSets(prev => prev.map(s => s.id === setId ? updated : s))
  }, [])

  const remove = useCallback(async (setId: number) => {
    await api.deleteLineupSet(setId)
    setSets(prev => prev.filter(s => s.id !== setId))
  }, [])

  return { sets, loading, reload, create, rename, remove }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useLineupSets.ts
git commit -m "✨ FE: useLineupSets Hook (CRUD)"
```

---

### Task 10: `useLineup` — apply set + empty slots

**Files:**
- Modify: `frontend/src/hooks/useLineup.ts`

The empty-slot placeholder is a synthetic `Player` with a unique **negative** id (keeps dnd-kit `useSortable` ids stable, never collides with real players) plus `isEmptySlot: true`.

- [ ] **Step 1: Add the sentinel helper + imports** (top of file, after the existing imports)

```ts
import type { Player, LocalLineupEntry, LocalSubstitution, LineupEntryResponse, SubstitutionResponse, LineupSuggestionEntry, LineupSetEntryResponse } from '@/types'
```

Add below the imports (module scope):

```ts
let emptySlotSeq = 0
function makeEmptySlot(position: string | null): LocalLineupEntry {
  emptySlotSeq -= 1
  return {
    player: { id: emptySlotSeq, name: '— frei —' } as Player,
    position,
    dhBatterId: null,
    dhBatterName: null,
    isEmptySlot: true,
  }
}
```

- [ ] **Step 2: Add a builder that turns set-entries for one game into a draft array**

Place inside `useLineup`, near `applySuggestion`:

```ts
  // Build a single game's draft from set entries; absent players -> empty placeholder slot.
  const buildGameDraft = (
    setEntries: LineupSetEntryResponse[],
    availableById: Map<number, Player>,
  ): LocalLineupEntry[] => {
    return [...setEntries]
      .sort((a, b) => a.battingOrder - b.battingOrder)
      .map(e => {
        const player = availableById.get(e.player.id)
        if (!player) {
          // field player absent -> empty slot (DH annotation dropped with it)
          return makeEmptySlot(e.position)
        }
        const dhPresent = e.dhBatterPlayer != null && availableById.has(e.dhBatterPlayer.id)
        return {
          player,
          position: e.position,
          dhBatterId: dhPresent ? e.dhBatterPlayer!.id : null,
          dhBatterName: dhPresent ? e.dhBatterPlayer!.name : null,
        }
      })
      .slice(0, 10)
  }
```

- [ ] **Step 3: Add `applySet`** — applies a whole-day set across all games via the cache; active game updates live state.

```ts
  const applySet = useCallback((
    setEntries: LineupSetEntryResponse[],
    games: { id: number; gameNumber: number }[],
    availablePlayers: Player[],
  ) => {
    const availableById = new Map(availablePlayers.map(p => [p.id, p]))
    const byGameNumber = new Map<number, LineupSetEntryResponse[]>()
    for (const e of setEntries) {
      const arr = byGameNumber.get(e.gameNumber) ?? []
      arr.push(e)
      byGameNumber.set(e.gameNumber, arr)
    }
    const activeId = activeIdRef.current
    for (const g of games) {
      const draft = buildGameDraft(byGameNumber.get(g.gameNumber) ?? [], availableById)
      if (g.id === activeId) {
        setEntries_(draft)   // see Step 4 rename note
      } else {
        const existing = cache.current.get(g.id)
        cache.current.set(g.id, {
          entries: draft,
          savedEntries: existing?.savedEntries ?? [],
          substitutions: existing?.substitutions ?? [],
          savedSubstitutions: existing?.savedSubstitutions ?? [],
        })
      }
    }
  }, [])
```

> RENAME NOTE: the hook's state setter is `setEntries` (from `useState`). The builder helper param above was also named `setEntries`, which would shadow it. To avoid confusion, in `applySet` call the **state setter** — i.e. use the real `setEntries(draft)` and rename the function parameter in `buildGameDraft`/`applySet` from `setEntries` to `setItems`. Apply this rename consistently in Steps 2–3 (param `setItems: LineupSetEntryResponse[]`). The `setEntries_` token above is a placeholder — replace with `setEntries`.

- [ ] **Step 4: Add `fillEmptySlot` + `hasEmptySlots`**

`fillEmptySlot` replaces a placeholder row (by its negative sentinel id) with a real pool player, clearing the flag:

```ts
  const fillEmptySlot = useCallback((slotId: number, player: Player) => {
    setEntries(prev => prev.map(e =>
      e.player.id === slotId
        ? { player, position: e.position, dhBatterId: null, dhBatterName: null }
        : e
    ))
  }, [])
```

`hasEmptySlots` derived value (place near `hasChanges`):

```ts
  const hasEmptySlots = entries.some(e => e.isEmptySlot)
```

- [ ] **Step 5: Export the new members** (extend the returned object)

```ts
  return {
    entries, substitutions, saving, hasChanges, hasEmptySlots, activeGameId,
    load, addPlayer, removePlayer, setPosition, setDhBatter,
    moveUp, moveDown, reorder, replacePlayer, swapEntries, save, importEntries, clearAll, removeUnavailable,
    applySuggestion, applySet, fillEmptySlot, invalidateCache, addSubstitution, removeSubstitution, revert,
  }
```

- [ ] **Step 6: Guard `save` against empty slots** (defensive — UI also blocks). Modify the start of `save`:

```ts
  const save = useCallback(async (gameId: number) => {
    if (entries.some(e => e.isEmptySlot)) {
      throw new Error('Lineup hat freie Slots — bitte füllen oder entfernen')
    }
    const toSave = entries
```

- [ ] **Step 7: Typecheck**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/hooks/useLineup.ts
git commit -m "✨ FE: useLineup applySet + Empty-Slot-Handling"
```

---

## PHASE 3 — Frontend UI

### Task 11: Empty-slot rendering + fill picker in `LineupRow`

**Files:**
- Modify: `frontend/src/components/planner/LineupRow.tsx`

The row must, when `entry.isEmptySlot`, show "— frei —" plus a player picker to fill it. Reuse the existing `<select>` pattern (like the DH picker). Needs the new props `poolPlayers` (already passed) and a new `onFillSlot`.

- [ ] **Step 1: Extend `Props`** (add to the interface)

```ts
  onFillSlot: (slotId: number, player: Player) => void
```

- [ ] **Step 2: Destructure the new prop** (add to the function params, near `onSetDhBatter`)

```ts
  onFillSlot,
```

- [ ] **Step 3: Render empty-slot branch.** Replace the Name button block (lines ~83-97) so empty slots show a picker instead of the swap button:

```tsx
      {/* Name — empty slot shows a fill-picker; normal rows open the Swap-Sheet */}
      {entry.isEmptySlot ? (
        <div className="flex-1 min-w-[3rem] flex items-center gap-1.5">
          <span className="text-sm font-medium text-amber-700 shrink-0">— frei —</span>
          <div className="relative">
            <select
              value=""
              onChange={e => {
                const p = poolPlayers.find(pl => pl.id === Number(e.target.value))
                if (p) onFillSlot(entry.player.id, p)
              }}
              className="appearance-none text-xs border border-amber-400 bg-amber-50 rounded-lg pl-2 pr-6 py-1 outline-none focus:ring-2 focus:ring-amber-100 cursor-pointer"
            >
              <option value="">Spieler…</option>
              {poolPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="text-amber-600 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpenSwap(entry)}
          className="flex-1 min-w-[3rem] flex items-center gap-1.5 text-left text-sm font-medium text-gray-900 px-1.5 py-1 -mx-1.5 -my-1 rounded hover:bg-cream-100 cursor-pointer group/swap"
          title="Spieler tauschen"
        >
          <span className="truncate min-w-0">{entry.player.name}</span>
          {is1BCoach && <CoachBadge label="1B" />}
          {is3BCoach && <CoachBadge label="3B" />}
          <ArrowsSwap
            size={12}
            className="shrink-0 text-gray-300 sm:opacity-0 sm:group-hover/swap:opacity-100 sm:group-hover/swap:text-navy-600 transition-opacity"
          />
        </button>
      )}
```

- [ ] **Step 4: Make sure `Player` is imported** in `LineupRow.tsx` (it already imports from `@/types`; add `Player` if missing):

```ts
import type { CoachRotationPair, LocalLineupEntry, Player } from '@/types'
```

- [ ] **Step 5: Visual check (manual, deferred to Task 14)** — note it; build verifies compile only.

- [ ] **Step 6: Typecheck**

Run: `cd frontend && npx tsc -b`
Expected: errors at the `LineupRow` callsite in `LineupEditor.tsx` (missing `onFillSlot`) — fixed in Task 13. If you want a clean checkpoint, temporarily mark `onFillSlot` optional, OR proceed to Task 13 before committing. Recommended: do Task 13 then commit both.

---

### Task 12: `SaveSetModal` + `LineupSetBar` components

**Files:**
- Create: `frontend/src/components/planner/SaveSetModal.tsx`
- Create: `frontend/src/components/planner/LineupSetBar.tsx`

- [ ] **Step 1: Write `SaveSetModal`** (dark-backdrop name modal; reused for create + rename). Check the existing modal markup in the codebase (e.g. `ConfirmModal`) and match its backdrop classes; the version below follows the dark-navy convention.

```tsx
import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  title: string
  initialName?: string
  onCancel: () => void
  onConfirm: (name: string) => void
}

export function SaveSetModal({ open, title, initialName = '', onCancel, onConfirm }: Props) {
  const [name, setName] = useState(initialName)
  useEffect(() => { if (open) setName(initialName) }, [open, initialName])
  if (!open) return null

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4" onClick={onCancel}>
      <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-sm font-extrabold tracking-widest uppercase text-navy-900 mb-3">{title}</h2>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="z.B. Variante A"
          className="w-full text-sm border border-cream-300 rounded-lg px-3 py-2 outline-none focus:border-navy-600 focus:ring-2 focus:ring-cream-200 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="font-display px-3 py-2 text-xs font-bold tracking-widest uppercase rounded-lg text-gray-600 hover:bg-navy-800 hover:text-white transition-colors cursor-pointer">Abbrechen</button>
          <button onClick={submit} disabled={!name.trim()} className="font-display px-3 py-2 text-xs font-extrabold tracking-widest uppercase rounded-lg bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-50 transition-colors cursor-pointer">Speichern</button>
        </div>
      </div>
    </div>
  )
}
```

> NOTE: confirm `bg-navy-950` exists in the Tailwind theme (`frontend/src/styles/index.css`). If not, use `bg-black/60`. Match whatever `ConfirmModal` uses.

- [ ] **Step 2: Write `LineupSetBar`** (chips + save button; hover-reveal rename/delete per convention). Uses existing icons `Pencil`, `TrashBin`.

```tsx
import type { LineupSetResponse } from '@/types'
import { Pencil, TrashBin } from '@/icons'

interface Props {
  sets: LineupSetResponse[]
  onApply: (set: LineupSetResponse) => void
  onSaveNew: () => void
  onRename: (set: LineupSetResponse) => void
  onDelete: (set: LineupSetResponse) => void
}

export function LineupSetBar({ sets, onApply, onSaveNew, onRename, onDelete }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-display text-[10px] font-bold tracking-widest uppercase text-gray-400 shrink-0">Sets</span>
      {sets.map(set => (
        <div key={set.id} className="group/set inline-flex items-center rounded-lg border border-cream-300 bg-cream-50 hover:border-navy-400 transition-colors">
          <button
            onClick={() => onApply(set)}
            className="font-display px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase text-navy-800 cursor-pointer"
            title={`"${set.name}" in Editor laden`}
          >
            {set.name}
          </button>
          <span className="flex items-center pr-1.5 gap-0.5 sm:opacity-0 sm:group-hover/set:opacity-100 transition-opacity">
            <button onClick={() => onRename(set)} className="p-0.5 text-gray-400 hover:text-navy-700 cursor-pointer" title="Umbenennen"><Pencil size={12} /></button>
            <button onClick={() => onDelete(set)} className="p-0.5 text-gray-400 hover:text-softball-red-600 cursor-pointer" title="Löschen"><TrashBin size={12} /></button>
          </span>
        </div>
      ))}
      <button
        onClick={onSaveNew}
        className="font-display px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1"
        title="Aktuellen Stand als Set speichern"
      >
        + Als Set speichern
      </button>
    </div>
  )
}
```

> NOTE: confirm `Pencil` and `TrashBin` are the actual export names in `frontend/src/icons/index.tsx` (the planner imports `Pencil, TrashBin`). Adjust if different.

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc -b`
Expected: errors only from unused components until wired (Task 13). OK to proceed.

---

### Task 13: Wire into `GameDayPlanner`

**Files:**
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx`

- [ ] **Step 1: Imports** (add near the other planner imports)

```ts
import { useLineupSets } from '@/hooks/useLineupSets'
import { LineupSetBar } from './LineupSetBar'
import { SaveSetModal } from './SaveSetModal'
import type { LineupSetResponse } from '@/types'
```

- [ ] **Step 2: Hook + local state** (near `const lineup = useLineup()`, ~line 33)

```ts
  const lineupSets = useLineupSets(gameDayId)
  const [saveSetOpen, setSaveSetOpen] = useState(false)
  const [renameSet, setRenameSet] = useState<LineupSetResponse | null>(null)
  const [deleteSet, setDeleteSet] = useState<LineupSetResponse | null>(null)
```

> Verify `gameDayId` in scope is a `number` (the file uses it elsewhere). If it's a string from route params, pass `Number(gameDayId)`.

- [ ] **Step 3: Handlers** (add with the other handlers, e.g. near `handleSave`)

```ts
  const handleApplySet = (set: LineupSetResponse) => {
    const games = (gameDay?.games ?? []).map(g => ({ id: g.id, gameNumber: g.gameNumber }))
    lineup.applySet(set.entries, games, availablePlayers)
    showToast(`Set "${set.name}" geladen — prüfen & speichern`, 'info')
  }

  const handleSaveSet = async (name: string) => {
    await lineupSets.create(name)
    setSaveSetOpen(false)
    showToast(`Set "${name}" gespeichert`, 'success')
  }

  const handleRenameSet = async (name: string) => {
    if (!renameSet) return
    await lineupSets.rename(renameSet.id, name)
    setRenameSet(null)
  }

  const handleDeleteSet = async () => {
    if (!deleteSet) return
    await lineupSets.remove(deleteSet.id)
    setDeleteSet(null)
  }
```

> Match the real toast API. The codebase uses a toast (check `useToast`/`showToast` signature in this file) — adapt `showToast(msg, variant)` to whatever exists. If the planner already destructures `toast`, use that.

- [ ] **Step 4: Block save while empty slots exist.** Find `handleSave` (passed to `LineupEditor` as `onSave`, ~line 749/930). Add at its top:

```ts
    if (lineup.hasEmptySlots) {
      showToast('Bitte freie Slots füllen, bevor du speicherst', 'error')
      return
    }
```

- [ ] **Step 5: Pass `onFillSlot` down to `LineupRow`.** In `LineupEditor.tsx`, the `<LineupRow ... />` (line ~151) needs `onFillSlot`. Add an `onFillSlot` prop to `LineupEditor`'s Props, thread it from the planner (the planner renders `LineupEditor` with `onSave={handleSave}`), and pass `onFillSlot={lineup.fillEmptySlot}` from the planner. Concretely:

In `LineupEditor.tsx` Props interface add:
```ts
  onFillSlot: (slotId: number, player: Player) => void
```
Destructure it and pass to the row:
```tsx
                  <LineupRow
                    ...
                    onFillSlot={onFillSlot}
                  />
```
In `GameDayPlanner.tsx`, every `<LineupEditor ... />` render gains:
```tsx
                onFillSlot={lineup.fillEmptySlot}
```

> Find all `<LineupEditor` usages: `grep -n "<LineupEditor" frontend/src/components/planner/GameDayPlanner.tsx` and add the prop to each.

- [ ] **Step 6: Render the set bar.** Place `LineupSetBar` in the header toolbar area (below the toolbar-strip with Auto/Aufstellung/PDF/Liste — both the mobile `sm:hidden` block ~line 466 and desktop block ~line 519, OR a single shared row beneath them). Minimal single placement beneath the game tabs works too. Example, right after the toolbar-strip closing `</div>` of the desktop block:

```tsx
          {gameDay && gameDay.games.length > 0 && (
            <div className="mt-2 w-full">
              <LineupSetBar
                sets={lineupSets.sets}
                onApply={handleApplySet}
                onSaveNew={() => setSaveSetOpen(true)}
                onRename={s => setRenameSet(s)}
                onDelete={s => setDeleteSet(s)}
              />
            </div>
          )}
```

- [ ] **Step 7: Render the modals** (near the other modals at the bottom of the planner JSX)

```tsx
      <SaveSetModal
        open={saveSetOpen}
        title="Als Set speichern"
        onCancel={() => setSaveSetOpen(false)}
        onConfirm={handleSaveSet}
      />
      <SaveSetModal
        open={renameSet !== null}
        title="Set umbenennen"
        initialName={renameSet?.name ?? ''}
        onCancel={() => setRenameSet(null)}
        onConfirm={handleRenameSet}
      />
```

For delete, reuse the existing `ConfirmModal` pattern already used in the planner (search `setShowDeleteConfirm`/`ConfirmModal` in the file and mirror it):

```tsx
      <ConfirmModal
        open={deleteSet !== null}
        title="Set löschen"
        message={`Set "${deleteSet?.name}" wirklich löschen?`}
        confirmLabel="Löschen"
        onConfirm={handleDeleteSet}
        onCancel={() => setDeleteSet(null)}
      />
```

> Match the actual `ConfirmModal` prop names used elsewhere in this file.

- [ ] **Step 8: Build (typecheck + bundle)**

Run: `cd frontend && npm run build`
Expected: `✓ built` with no TS errors.

- [ ] **Step 9: Lint**

Run: `cd frontend && npm run lint`
Expected: no new errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/planner/LineupRow.tsx frontend/src/components/planner/LineupEditor.tsx frontend/src/components/planner/LineupSetBar.tsx frontend/src/components/planner/SaveSetModal.tsx frontend/src/components/planner/GameDayPlanner.tsx
git commit -m "✨ FE: Lineup-Set-Leiste + Apply-to-Draft + Empty-Slot-UI"
```

---

## PHASE 4 — Polish & verification

### Task 14: Design polish (frontend-design skill)

**Files:**
- Modify: `frontend/src/components/planner/LineupSetBar.tsx`, `SaveSetModal.tsx`, `LineupRow.tsx` (empty-slot row)

- [ ] **Step 1: Invoke the frontend-design skill** to refine chip styling, empty-slot row treatment, save/rename modal, and responsive behaviour (mobile toolbar-strip vs desktop). Keep the dark-navy hover convention and German copy.

- [ ] **Step 2: Manual visual check** — run the app locally and verify on desktop + mobile widths:

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml   # :8080
cd frontend && npx vite                                            # :5173
```
Verify: save a set, apply it, mark a set-player absent (Anwesend modal), re-apply → that batting slot shows "— frei —" with a fill-picker; filling it + saving works; saving with an open slot is blocked with a toast.

- [ ] **Step 3: Build + lint + commit**

```bash
cd frontend && npm run build && npm run lint
git add frontend/src
git commit -m "💄 FE: Lineup-Set UI Politur"
```

---

### Task 15: Full verification

- [ ] **Step 1: Backend tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=LineupSetIntegrationTest`
Expected: all PASS.

- [ ] **Step 2: Full backend regression** (DH/lineup rules untouched, but confirm)

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=LineupIntegrationTest`
Expected: PASS.

- [ ] **Step 3: Frontend build**

Run: `cd frontend && npm run build`
Expected: `✓ built`.

- [ ] **Step 4: Final review + commit any leftovers**

Confirm `git status` is clean. The feature is complete.

---

## Self-Review (filled by plan author)

**Spec coverage:**
- Set-Inhalt (nur Lineups, alle Games) → Task 1 (schema), Task 5 (snapshot copies position/battingOrder/DH per gameNumber). ✓
- Scope pro Spieltag → `game_day_id` FK, list endpoint per gameday. ✓
- Erstellen via Snapshot + Name, mehrere Sets, rename/delete → Tasks 5, 6, 9, 12, 13. ✓
- Apply = Draft-Load, Abwesende → leerer Slot → Tasks 10 (`applySet`/`makeEmptySlot`), 11 (render), 13 (wire). ✓
- Storage backend normalized → Tasks 1–6. ✓
- game_number key → schema + snapshot + applySet mapping. ✓
- Multi-game draft → `applySet` writes cache for non-active games. ✓
- Save blocks on empty slots → Task 10 Step 6 + Task 13 Step 4. ✓
- DH-batter absent handling → Task 10 Step 2 (`dhPresent`). ✓
- Edge: gameday gains/loses game → `applySet` only iterates current `games`; missing gameNumber entries ignored; games without set entries get empty draft → NOTE: a game with no set entries currently gets an empty `[]` draft (clears it). **Refine in Task 13:** skip games whose gameNumber has no set entries (leave their current draft untouched) — implement by `if (!byGameNumber.has(g.gameNumber)) continue` in `applySet`. Added to applySet below.

**Placeholder scan:** No TBD/TODO left. Two explicit "confirm in codebase" NOTEs (table names, modal/icon/toast names) are verification steps, not placeholders — each has a concrete grep/fallback.

**Type consistency:** `applySet(setEntries, games, availablePlayers)`, `fillEmptySlot(slotId, player)`, `hasEmptySlots` used consistently across Tasks 10/11/13. `LineupSetEntryResponse.position: string | null` (displayName) matches `LocalLineupEntry.position`. Backend `position` Enum ↔ DTO `displayName` mirrors `LineupEntryResponse`.

**Fix applied:** add to `applySet` loop, before building draft:
```ts
      if (!byGameNumber.has(g.gameNumber)) continue   // game not in set -> leave its draft untouched
```
