# Heimspieltag-Material Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wiederverwendbarer Material-Katalog ("was brauchen wir, wo liegt es") + Abhaken pro Heimspieltag, live am Platz pflegbar.

**Architecture:** Onion/Hexagonal wie der Rest des Backends. Katalog = globale Tabelle `equipment_item`. Nutzung pro Spieltag = `game_day_equipment` (Row-Präsenz = "used", kein Boolean-State — toggle on = insert, off = delete). Frontend: `useEquipment(gameDayId)`-Hook + Material-Sheet im GameDayPlanner.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway, PostgreSQL (Testcontainers). React 19, TypeScript, Tailwind v4.

## Global Constraints

- Maven IMMER mit `-s .mvn/local-settings.xml` (Backend). Niemals `~/.m2/settings.xml` anfassen.
- Backend-Tests brauchen laufenden Docker-Daemon (Testcontainers).
- Schema-Änderung nur als neue `V{n}__*.sql` — nächste freie Nummer ist **V40** (letzte ist V39).
- `spring.jpa.hibernate.ddl-auto=validate` — Entity-Spalten MÜSSEN exakt zur Migration passen.
- Dependency-Regel: `domain` kennt kein Spring/JPA/DTO. `application` nur `domain`. Adapter implementieren Ports.
- DTOs sind Java-Records in `adapter/dto/` mit Bean-Validation. Fehler über `BusinessValidationException` (400) / `ResourceNotFoundException` (404). State-Changes auf INFO loggen.
- Frontend: Path-Alias `@/` → `frontend/src/`. Tailwind v4 (`lg:grid-cols-3`, KEINE arbitrary brackets). Nur eigene SVG-Icons aus `src/icons/index.tsx` (kein lucide). Modals mit dark backdrop, kein `confirm()`. Hover-reveal für Edit/Delete.
- German UI durchgehend.
- Conventional commits mit gitmoji-Prefix, **kein `Co-Authored-By`**.
- Pre-Commit bei nicht-trivialen Changes: `npm run build` (frontend) + `./mvnw test -s .mvn/local-settings.xml` (backend).

---

## File Structure

**Backend (neu):**
- `domain/model/EquipmentItem.java` — Katalog-POJO
- `domain/port/out/EquipmentItemRepository.java` — Katalog-Port
- `domain/port/out/GameDayEquipmentRepository.java` — Nutzungs-Port
- `adapter/out/persistence/entity/EquipmentItemEntity.java`
- `adapter/out/persistence/entity/GameDayEquipmentEntity.java`
- `adapter/out/persistence/mapper/EquipmentItemMapper.java`
- `adapter/out/persistence/repository/SpringEquipmentItemRepository.java`
- `adapter/out/persistence/repository/SpringGameDayEquipmentRepository.java`
- `adapter/out/persistence/adapter/EquipmentItemRepositoryAdapter.java`
- `adapter/out/persistence/adapter/GameDayEquipmentRepositoryAdapter.java`
- `application/EquipmentService.java`
- `adapter/in/web/EquipmentController.java`
- `adapter/dto/EquipmentRequest.java`, `EquipmentResponse.java`, `GameDayEquipmentResponse.java`, `ToggleEquipmentRequest.java`
- `src/main/resources/db/migration/V40__create_equipment.sql`
- Tests: `integration/EquipmentIntegrationTest.java`, `service/EquipmentServiceCarryOverTest.java`

**Frontend (neu/geändert):**
- `src/types/index.ts` — `EquipmentItem` Typ (modify)
- `src/api/client.ts` — Equipment-Endpoints (modify)
- `src/hooks/useEquipment.ts` — neu
- `src/components/planner/MaterialSheet.tsx` — neu
- `src/components/planner/GameDayPlanner.tsx` — Button + Sheet einbinden (modify)
- `src/icons/index.tsx` — nur falls `ClipboardListIcon` fehlt (prüfen; existiert bereits)

---

### Task 1: Persistenz-Slice (Migration + Domain + Adapter)

**Files:**
- Create: `backend/src/main/resources/db/migration/V40__create_equipment.sql`
- Create: `backend/src/main/java/com/softball/domain/model/EquipmentItem.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/EquipmentItemRepository.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/GameDayEquipmentRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/EquipmentItemEntity.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/GameDayEquipmentEntity.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/EquipmentItemMapper.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringEquipmentItemRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringGameDayEquipmentRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/EquipmentItemRepositoryAdapter.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/GameDayEquipmentRepositoryAdapter.java`
- Test: `backend/src/test/java/com/softball/integration/EquipmentIntegrationTest.java` (angelegt, eine Persistenz-Smoke-Methode; in Task 3 erweitert)

**Interfaces:**
- Produces:
  - `EquipmentItem` { `Long getId/setId`, `String getName/setName`, `String getCategory/setCategory`, `int getQuantity/setQuantity`, `String getStorageLocation/setStorageLocation`, `String getNotes/setNotes` }
  - `EquipmentItemRepository` { `List<EquipmentItem> findAllOrdered()`, `Optional<EquipmentItem> findById(Long)`, `EquipmentItem save(EquipmentItem)`, `void deleteById(Long)` }
  - `GameDayEquipmentRepository` { `Set<Long> findUsedItemIds(Long gameDayId)`, `void markUsed(Long gameDayId, Long itemId)`, `void markUnused(Long gameDayId, Long itemId)`, `Optional<Long> findMostRecentGameDayIdWithUsageBefore(Long seasonId, java.time.LocalDate date)` }

- [ ] **Step 1: Migration schreiben**

Create `backend/src/main/resources/db/migration/V40__create_equipment.sql`:

```sql
CREATE TABLE equipment_item (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(120) NOT NULL,
    category         VARCHAR(60)  NOT NULL DEFAULT 'Sonstiges',
    quantity         INT          NOT NULL DEFAULT 1,
    storage_location VARCHAR(120),
    notes            TEXT
);

CREATE TABLE game_day_equipment (
    id                BIGSERIAL PRIMARY KEY,
    game_day_id       BIGINT NOT NULL REFERENCES game_days(id) ON DELETE CASCADE,
    equipment_item_id BIGINT NOT NULL REFERENCES equipment_item(id) ON DELETE CASCADE,
    CONSTRAINT uq_game_day_equipment UNIQUE (game_day_id, equipment_item_id)
);

CREATE INDEX idx_gde_game_day ON game_day_equipment(game_day_id);
CREATE INDEX idx_gde_item ON game_day_equipment(equipment_item_id);
```

- [ ] **Step 2: Domain-Modell + Ports schreiben**

Create `domain/model/EquipmentItem.java`:

```java
package com.softball.domain.model;

public class EquipmentItem {
    private Long id;
    private String name;
    private String category;
    private int quantity;
    private String storageLocation;
    private String notes;

    public EquipmentItem() {}

    public EquipmentItem(final Long id, final String name, final String category,
                         final int quantity, final String storageLocation, final String notes) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.quantity = quantity;
        this.storageLocation = storageLocation;
        this.notes = notes;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(final String category) { this.category = category; }
    public int getQuantity() { return quantity; }
    public void setQuantity(final int quantity) { this.quantity = quantity; }
    public String getStorageLocation() { return storageLocation; }
    public void setStorageLocation(final String storageLocation) { this.storageLocation = storageLocation; }
    public String getNotes() { return notes; }
    public void setNotes(final String notes) { this.notes = notes; }
}
```

Create `domain/port/out/EquipmentItemRepository.java`:

```java
package com.softball.domain.port.out;

import com.softball.domain.model.EquipmentItem;
import java.util.List;
import java.util.Optional;

public interface EquipmentItemRepository {
    List<EquipmentItem> findAllOrdered();
    Optional<EquipmentItem> findById(Long id);
    EquipmentItem save(EquipmentItem item);
    void deleteById(Long id);
}
```

Create `domain/port/out/GameDayEquipmentRepository.java`:

```java
package com.softball.domain.port.out;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;

public interface GameDayEquipmentRepository {
    Set<Long> findUsedItemIds(Long gameDayId);
    void markUsed(Long gameDayId, Long itemId);
    void markUnused(Long gameDayId, Long itemId);
    Optional<Long> findMostRecentGameDayIdWithUsageBefore(Long seasonId, LocalDate date);
}
```

- [ ] **Step 3: JPA-Entities schreiben**

Create `adapter/out/persistence/entity/EquipmentItemEntity.java`:

```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "equipment_item")
public class EquipmentItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category = "Sonstiges";

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "storage_location")
    private String storageLocation;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public EquipmentItemEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(final String category) { this.category = category; }
    public int getQuantity() { return quantity; }
    public void setQuantity(final int quantity) { this.quantity = quantity; }
    public String getStorageLocation() { return storageLocation; }
    public void setStorageLocation(final String storageLocation) { this.storageLocation = storageLocation; }
    public String getNotes() { return notes; }
    public void setNotes(final String notes) { this.notes = notes; }
}
```

Create `adapter/out/persistence/entity/GameDayEquipmentEntity.java`:

```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "game_day_equipment", uniqueConstraints = {
    @UniqueConstraint(name = "uq_game_day_equipment", columnNames = {"game_day_id", "equipment_item_id"})
})
public class GameDayEquipmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_day_id", nullable = false)
    private GameDayEntity gameDay;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_item_id", nullable = false)
    private EquipmentItemEntity item;

    public GameDayEquipmentEntity() {}

    public GameDayEquipmentEntity(final GameDayEntity gameDay, final EquipmentItemEntity item) {
        this.gameDay = gameDay;
        this.item = item;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameDayEntity getGameDay() { return gameDay; }
    public void setGameDay(final GameDayEntity gameDay) { this.gameDay = gameDay; }
    public EquipmentItemEntity getItem() { return item; }
    public void setItem(final EquipmentItemEntity item) { this.item = item; }
}
```

- [ ] **Step 4: Mapper schreiben**

Create `adapter/out/persistence/mapper/EquipmentItemMapper.java`:

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.EquipmentItemEntity;
import com.softball.domain.model.EquipmentItem;
import org.springframework.stereotype.Component;

@Component
public class EquipmentItemMapper {

    public EquipmentItem toDomain(final EquipmentItemEntity e) {
        if (e == null) return null;
        return new EquipmentItem(e.getId(), e.getName(), e.getCategory(),
            e.getQuantity(), e.getStorageLocation(), e.getNotes());
    }

    public EquipmentItemEntity toEntity(final EquipmentItem d) {
        final EquipmentItemEntity e = new EquipmentItemEntity();
        e.setId(d.getId());
        applyFields(e, d);
        return e;
    }

    public void updateEntity(final EquipmentItemEntity e, final EquipmentItem d) {
        applyFields(e, d);
    }

    private void applyFields(final EquipmentItemEntity e, final EquipmentItem d) {
        e.setName(d.getName());
        e.setCategory(d.getCategory() == null || d.getCategory().isBlank() ? "Sonstiges" : d.getCategory());
        e.setQuantity(d.getQuantity());
        e.setStorageLocation(d.getStorageLocation());
        e.setNotes(d.getNotes());
    }
}
```

- [ ] **Step 5: Spring-Repositories schreiben**

Create `adapter/out/persistence/repository/SpringEquipmentItemRepository.java`:

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.EquipmentItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SpringEquipmentItemRepository extends JpaRepository<EquipmentItemEntity, Long> {
    List<EquipmentItemEntity> findAllByOrderByCategoryAscNameAsc();
}
```

Create `adapter/out/persistence/repository/SpringGameDayEquipmentRepository.java`:

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.GameDayEquipmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SpringGameDayEquipmentRepository extends JpaRepository<GameDayEquipmentEntity, Long> {

    @Query("SELECT e.item.id FROM GameDayEquipmentEntity e WHERE e.gameDay.id = :gameDayId")
    List<Long> findItemIdsByGameDayId(@Param("gameDayId") Long gameDayId);

    boolean existsByGameDay_IdAndItem_Id(Long gameDayId, Long itemId);

    void deleteByGameDay_IdAndItem_Id(Long gameDayId, Long itemId);

    @Query("SELECT DISTINCT e.gameDay.id FROM GameDayEquipmentEntity e "
        + "WHERE e.gameDay.season.id = :seasonId AND e.gameDay.date < :date "
        + "ORDER BY e.gameDay.date DESC")
    List<Long> findGameDayIdsWithUsageBefore(@Param("seasonId") Long seasonId, @Param("date") LocalDate date);
}
```

- [ ] **Step 6: Repository-Adapter schreiben**

Create `adapter/out/persistence/adapter/EquipmentItemRepositoryAdapter.java`:

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.mapper.EquipmentItemMapper;
import com.softball.adapter.out.persistence.repository.SpringEquipmentItemRepository;
import com.softball.domain.model.EquipmentItem;
import com.softball.domain.port.out.EquipmentItemRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class EquipmentItemRepositoryAdapter implements EquipmentItemRepository {

    private final SpringEquipmentItemRepository repo;
    private final EquipmentItemMapper mapper;

    public EquipmentItemRepositoryAdapter(final SpringEquipmentItemRepository repo,
                                          final EquipmentItemMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<EquipmentItem> findAllOrdered() {
        return repo.findAllByOrderByCategoryAscNameAsc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<EquipmentItem> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public EquipmentItem save(final EquipmentItem item) {
        if (item.getId() != null) {
            final var existing = repo.findById(item.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, item);
                return mapper.toDomain(repo.save(existing));
            }
        }
        return mapper.toDomain(repo.save(mapper.toEntity(item)));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
}
```

Create `adapter/out/persistence/adapter/GameDayEquipmentRepositoryAdapter.java`:

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameDayEquipmentEntity;
import com.softball.adapter.out.persistence.repository.SpringEquipmentItemRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayEquipmentRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.domain.port.out.GameDayEquipmentRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class GameDayEquipmentRepositoryAdapter implements GameDayEquipmentRepository {

    private final SpringGameDayEquipmentRepository repo;
    private final SpringGameDayRepository gameDayRepo;
    private final SpringEquipmentItemRepository itemRepo;

    public GameDayEquipmentRepositoryAdapter(final SpringGameDayEquipmentRepository repo,
                                             final SpringGameDayRepository gameDayRepo,
                                             final SpringEquipmentItemRepository itemRepo) {
        this.repo = repo;
        this.gameDayRepo = gameDayRepo;
        this.itemRepo = itemRepo;
    }

    @Override
    public Set<Long> findUsedItemIds(final Long gameDayId) {
        return new HashSet<>(repo.findItemIdsByGameDayId(gameDayId));
    }

    @Override
    public void markUsed(final Long gameDayId, final Long itemId) {
        if (repo.existsByGameDay_IdAndItem_Id(gameDayId, itemId)) return;
        repo.save(new GameDayEquipmentEntity(
            gameDayRepo.getReferenceById(gameDayId),
            itemRepo.getReferenceById(itemId)));
    }

    @Override
    @Transactional
    public void markUnused(final Long gameDayId, final Long itemId) {
        repo.deleteByGameDay_IdAndItem_Id(gameDayId, itemId);
    }

    @Override
    public Optional<Long> findMostRecentGameDayIdWithUsageBefore(final Long seasonId, final LocalDate date) {
        final List<Long> ids = repo.findGameDayIdsWithUsageBefore(seasonId, date);
        return ids.isEmpty() ? Optional.empty() : Optional.of(ids.get(0));
    }
}
```

- [ ] **Step 7: Migration-Smoke-Test schreiben (failing)**

Create `backend/src/test/java/com/softball/integration/EquipmentIntegrationTest.java`:

```java
package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import org.junit.jupiter.api.AfterEach;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class EquipmentIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SpringSeasonRepository seasonRepository;

    private SeasonEntity season;

    @BeforeEach
    void setUp() {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
    }

    @AfterEach
    void tearDown() {
        seasonRepository.deleteAll();
    }

    @Test
    void gameDayEquipment_emptyByDefault() throws Exception {
        final var result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("date", "2026-06-27"))))
            .andExpect(status().isCreated())
            .andReturn();
        final Long gameDayId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/equipment"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }
}
```

- [ ] **Step 8: Test laufen lassen — muss fehlschlagen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=EquipmentIntegrationTest`
Expected: FAIL — Endpoint `/api/gamedays/{id}/equipment` existiert noch nicht (404), Controller kommt erst in Task 3. (Migration/Entities validieren aber schon beim Boot — schlägt die App beim Start fehl, ist die Migration kaputt.)

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/resources/db/migration/V40__create_equipment.sql \
  backend/src/main/java/com/softball/domain/model/EquipmentItem.java \
  backend/src/main/java/com/softball/domain/port/out/EquipmentItemRepository.java \
  backend/src/main/java/com/softball/domain/port/out/GameDayEquipmentRepository.java \
  backend/src/main/java/com/softball/adapter/out/persistence/entity/EquipmentItemEntity.java \
  backend/src/main/java/com/softball/adapter/out/persistence/entity/GameDayEquipmentEntity.java \
  backend/src/main/java/com/softball/adapter/out/persistence/mapper/EquipmentItemMapper.java \
  backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringEquipmentItemRepository.java \
  backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringGameDayEquipmentRepository.java \
  backend/src/main/java/com/softball/adapter/out/persistence/adapter/EquipmentItemRepositoryAdapter.java \
  backend/src/main/java/com/softball/adapter/out/persistence/adapter/GameDayEquipmentRepositoryAdapter.java \
  backend/src/test/java/com/softball/integration/EquipmentIntegrationTest.java
git commit -m "🗃️ BE: Equipment-Persistenz — Migration V40, Domain, Ports, Adapter"
```

---

### Task 2: EquipmentService + Carry-Over

**Files:**
- Create: `backend/src/main/java/com/softball/application/EquipmentService.java`
- Test: `backend/src/test/java/com/softball/service/EquipmentServiceCarryOverTest.java`

**Interfaces:**
- Consumes: `EquipmentItemRepository`, `GameDayEquipmentRepository` (Task 1), `GameDayRepository` (vorhanden, `Optional<GameDay> findById(Long)`; `GameDay.getSeasonId()`, `GameDay.getDate()`).
- Produces (alle `@Transactional`):
  - `List<EquipmentItem> findAll()`
  - `Set<Long> usedItemIds(Long gameDayId)`
  - `EquipmentItem create(String name, String category, int quantity, String storageLocation, String notes)`
  - `EquipmentItem createAndMarkUsed(Long gameDayId, String name, String category, int quantity, String storageLocation, String notes)`
  - `EquipmentItem update(Long itemId, String name, String category, int quantity, String storageLocation, String notes)`
  - `void delete(Long itemId)`
  - `void setUsed(Long gameDayId, Long itemId, boolean used)`
  - `Set<Long> carryOverFromLast(Long gameDayId)` — kopiert used-Items vom jüngsten früheren Spieltag mit Nutzung, gibt die neuen usedIds zurück.

- [ ] **Step 1: Carry-Over-Test schreiben (failing)**

Create `backend/src/test/java/com/softball/service/EquipmentServiceCarryOverTest.java`:

```java
package com.softball.service;

import com.softball.TestcontainersConfig;
import com.softball.application.EquipmentService;
import com.softball.application.GameDayService;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.domain.model.EquipmentItem;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class EquipmentServiceCarryOverTest {

    @Autowired private EquipmentService equipmentService;
    @Autowired private GameDayService gameDayService;
    @Autowired private SpringSeasonRepository seasonRepository;

    private Long seasonId;

    @BeforeEach
    void setUp() {
        seasonId = seasonRepository.save(new SeasonEntity("Saison 2026", 2026)).getId();
    }

    @AfterEach
    void tearDown() {
        seasonRepository.deleteAll();
    }

    @Test
    void carryOver_copiesUsedItemsFromMostRecentEarlierGameDay() {
        final Long oldGameDay = gameDayService.create(seasonId, LocalDate.parse("2026-05-01"), null, null, 1).id();
        final Long newGameDay = gameDayService.create(seasonId, LocalDate.parse("2026-06-27"), null, null, 1).id();

        final EquipmentItem pavillon = equipmentService.create("Pavillon", "Aufbau", 3, "Garage", null);
        final EquipmentItem bases = equipmentService.create("Bases", "Spielmaterial", 4, "Raum", null);
        equipmentService.setUsed(oldGameDay, pavillon.getId(), true);
        equipmentService.setUsed(oldGameDay, bases.getId(), true);

        final Set<Long> carried = equipmentService.carryOverFromLast(newGameDay);

        assertThat(carried).containsExactlyInAnyOrder(pavillon.getId(), bases.getId());
        assertThat(equipmentService.usedItemIds(newGameDay))
            .containsExactlyInAnyOrder(pavillon.getId(), bases.getId());
    }
}
```

Note: `GameDayService.create(...)` gibt `GameDayResponse` zurück; `.id()` ist dessen Record-Accessor (siehe `GameDayResponse`).

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=EquipmentServiceCarryOverTest`
Expected: FAIL — `EquipmentService` existiert nicht (Compile-Fehler).

- [ ] **Step 3: EquipmentService implementieren**

Create `application/EquipmentService.java`:

```java
package com.softball.application;

import com.softball.domain.model.EquipmentItem;
import com.softball.domain.model.GameDay;
import com.softball.domain.port.out.EquipmentItemRepository;
import com.softball.domain.port.out.GameDayEquipmentRepository;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class EquipmentService {

    private static final Logger log = LoggerFactory.getLogger(EquipmentService.class);

    private final EquipmentItemRepository itemRepository;
    private final GameDayEquipmentRepository usageRepository;
    private final GameDayRepository gameDayRepository;

    public EquipmentService(final EquipmentItemRepository itemRepository,
                            final GameDayEquipmentRepository usageRepository,
                            final GameDayRepository gameDayRepository) {
        this.itemRepository = itemRepository;
        this.usageRepository = usageRepository;
        this.gameDayRepository = gameDayRepository;
    }

    @Transactional(readOnly = true)
    public List<EquipmentItem> findAll() {
        return itemRepository.findAllOrdered();
    }

    @Transactional(readOnly = true)
    public Set<Long> usedItemIds(final Long gameDayId) {
        return usageRepository.findUsedItemIds(gameDayId);
    }

    @Transactional
    public EquipmentItem create(final String name, final String category, final int quantity,
                                final String storageLocation, final String notes) {
        log.info("Material anlegen: {} ({}, x{})", name, category, quantity);
        return itemRepository.save(new EquipmentItem(null, name, category, quantity, storageLocation, notes));
    }

    @Transactional
    public EquipmentItem createAndMarkUsed(final Long gameDayId, final String name, final String category,
                                           final int quantity, final String storageLocation, final String notes) {
        requireGameDay(gameDayId);
        final EquipmentItem created = create(name, category, quantity, storageLocation, notes);
        usageRepository.markUsed(gameDayId, created.getId());
        return created;
    }

    @Transactional
    public EquipmentItem update(final Long itemId, final String name, final String category, final int quantity,
                                final String storageLocation, final String notes) {
        final EquipmentItem item = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("EquipmentItem", itemId));
        item.setName(name);
        item.setCategory(category);
        item.setQuantity(quantity);
        item.setStorageLocation(storageLocation);
        item.setNotes(notes);
        log.info("Material bearbeiten: {} ({})", name, itemId);
        return itemRepository.save(item);
    }

    @Transactional
    public void delete(final Long itemId) {
        log.info("Material löschen: {}", itemId);
        itemRepository.deleteById(itemId);
    }

    @Transactional
    public void setUsed(final Long gameDayId, final Long itemId, final boolean used) {
        requireGameDay(gameDayId);
        itemRepository.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("EquipmentItem", itemId));
        if (used) {
            usageRepository.markUsed(gameDayId, itemId);
        } else {
            usageRepository.markUnused(gameDayId, itemId);
        }
    }

    @Transactional
    public Set<Long> carryOverFromLast(final Long gameDayId) {
        final GameDay gameDay = requireGameDay(gameDayId);
        usageRepository.findMostRecentGameDayIdWithUsageBefore(gameDay.getSeasonId(), gameDay.getDate())
            .ifPresent(prevId -> usageRepository.findUsedItemIds(prevId)
                .forEach(itemId -> usageRepository.markUsed(gameDayId, itemId)));
        return usageRepository.findUsedItemIds(gameDayId);
    }

    private GameDay requireGameDay(final Long gameDayId) {
        return gameDayRepository.findById(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
    }
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=EquipmentServiceCarryOverTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/EquipmentService.java \
  backend/src/test/java/com/softball/service/EquipmentServiceCarryOverTest.java
git commit -m "✨ BE: EquipmentService — CRUD, Toggle, Carry-Over vom letzten Spieltag"
```

---

### Task 3: REST-Controller + DTOs + Persistenz-/Cascade-Tests

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/EquipmentRequest.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/EquipmentResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/GameDayEquipmentResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/ToggleEquipmentRequest.java`
- Create: `backend/src/main/java/com/softball/adapter/in/web/EquipmentController.java`
- Test: `backend/src/test/java/com/softball/integration/EquipmentIntegrationTest.java` (erweitern)

**Interfaces:**
- Consumes: `EquipmentService` (Task 2).
- Produces (REST):
  - `GET  /api/gamedays/{id}/equipment` → `GameDayEquipmentResponse[]`
  - `POST /api/gamedays/{id}/equipment` (`EquipmentRequest`) → 201 `GameDayEquipmentResponse` (used=true)
  - `PUT  /api/gamedays/{id}/equipment/{itemId}` (`ToggleEquipmentRequest`) → 204
  - `POST /api/gamedays/{id}/equipment/carry-over` → `GameDayEquipmentResponse[]`
  - `PUT  /api/equipment/{itemId}` (`EquipmentRequest`) → `EquipmentResponse`
  - `DELETE /api/equipment/{itemId}` → 204

- [ ] **Step 1: DTOs schreiben**

Create `adapter/dto/EquipmentRequest.java`:

```java
package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record EquipmentRequest(
    @NotBlank String name,
    String category,
    @Min(0) int quantity,
    String storageLocation,
    String notes
) {}
```

Create `adapter/dto/ToggleEquipmentRequest.java`:

```java
package com.softball.adapter.dto;

public record ToggleEquipmentRequest(boolean used) {}
```

Create `adapter/dto/EquipmentResponse.java`:

```java
package com.softball.adapter.dto;

import com.softball.domain.model.EquipmentItem;

public record EquipmentResponse(
    Long id, String name, String category, int quantity, String storageLocation, String notes
) {
    public static EquipmentResponse from(final EquipmentItem i) {
        return new EquipmentResponse(i.getId(), i.getName(), i.getCategory(),
            i.getQuantity(), i.getStorageLocation(), i.getNotes());
    }
}
```

Create `adapter/dto/GameDayEquipmentResponse.java`:

```java
package com.softball.adapter.dto;

import com.softball.domain.model.EquipmentItem;

public record GameDayEquipmentResponse(
    Long id, String name, String category, int quantity, String storageLocation, String notes, boolean used
) {
    public static GameDayEquipmentResponse from(final EquipmentItem i, final boolean used) {
        return new GameDayEquipmentResponse(i.getId(), i.getName(), i.getCategory(),
            i.getQuantity(), i.getStorageLocation(), i.getNotes(), used);
    }
}
```

- [ ] **Step 2: Controller schreiben**

Create `adapter/in/web/EquipmentController.java`:

```java
package com.softball.adapter.in.web;

import com.softball.adapter.dto.EquipmentRequest;
import com.softball.adapter.dto.EquipmentResponse;
import com.softball.adapter.dto.GameDayEquipmentResponse;
import com.softball.adapter.dto.ToggleEquipmentRequest;
import com.softball.application.EquipmentService;
import com.softball.domain.model.EquipmentItem;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class EquipmentController {

    private final EquipmentService equipmentService;

    public EquipmentController(final EquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    @GetMapping("/gamedays/{gameDayId}/equipment")
    public List<GameDayEquipmentResponse> getForGameDay(@PathVariable final Long gameDayId) {
        final Set<Long> used = equipmentService.usedItemIds(gameDayId);
        return equipmentService.findAll().stream()
            .map(i -> GameDayEquipmentResponse.from(i, used.contains(i.getId())))
            .toList();
    }

    @PostMapping("/gamedays/{gameDayId}/equipment")
    @ResponseStatus(HttpStatus.CREATED)
    public GameDayEquipmentResponse createForGameDay(@PathVariable final Long gameDayId,
                                                     @Valid @RequestBody final EquipmentRequest req) {
        final EquipmentItem created = equipmentService.createAndMarkUsed(
            gameDayId, req.name(), req.category(), req.quantity(), req.storageLocation(), req.notes());
        return GameDayEquipmentResponse.from(created, true);
    }

    @PutMapping("/gamedays/{gameDayId}/equipment/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void toggle(@PathVariable final Long gameDayId, @PathVariable final Long itemId,
                       @RequestBody final ToggleEquipmentRequest req) {
        equipmentService.setUsed(gameDayId, itemId, req.used());
    }

    @PostMapping("/gamedays/{gameDayId}/equipment/carry-over")
    public List<GameDayEquipmentResponse> carryOver(@PathVariable final Long gameDayId) {
        equipmentService.carryOverFromLast(gameDayId);
        return getForGameDay(gameDayId);
    }

    @PutMapping("/equipment/{itemId}")
    public EquipmentResponse update(@PathVariable final Long itemId,
                                    @Valid @RequestBody final EquipmentRequest req) {
        return EquipmentResponse.from(equipmentService.update(
            itemId, req.name(), req.category(), req.quantity(), req.storageLocation(), req.notes()));
    }

    @DeleteMapping("/equipment/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long itemId) {
        equipmentService.delete(itemId);
    }
}
```

- [ ] **Step 3: Integrationstest erweitern (failing) — Persistenz + Cascade**

Ersetze in `EquipmentIntegrationTest.java` den Body (Methoden hinzufügen). Füge nach `gameDayEquipment_emptyByDefault` ein:

```java
    @Test
    void addToggleAndReload_persists() throws Exception {
        final Long gameDayId = createGameDay("2026-06-27");

        // Sache am Spieltag anlegen -> direkt used
        final var created = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/equipment")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of(
                    "name", "Pavillon", "category", "Aufbau", "quantity", 3,
                    "storageLocation", "Garage", "notes", "Häringe nicht vergessen"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.used").value(true))
            .andExpect(jsonPath("$.quantity").value(3))
            .andReturn();
        final Long itemId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        // Reload: Haken ist persistiert
        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/equipment"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].name").value("Pavillon"))
            .andExpect(jsonPath("$[0].storageLocation").value("Garage"))
            .andExpect(jsonPath("$[0].used").value(true));

        // Abhaken weg -> bleibt im Katalog, used=false
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/equipment/" + itemId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("used", false))))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/equipment"))
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].used").value(false));
    }

    @Test
    void deleteItem_cascadesUsage() throws Exception {
        final Long gameDayId = createGameDay("2026-06-27");
        final var created = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/equipment")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of(
                    "name", "Bases", "category", "Spielmaterial", "quantity", 4))))
            .andReturn();
        final Long itemId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(delete("/api/equipment/" + itemId)).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/equipment"))
            .andExpect(jsonPath("$.length()").value(0));
    }

    private Long createGameDay(final String date) throws Exception {
        final var result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("date", date))))
            .andExpect(status().isCreated())
            .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }
```

Außerdem `tearDown()` ergänzen, damit Equipment-Tabellen zwischen Tests leer sind. Importiere `SpringEquipmentItemRepository` + `SpringGameDayEquipmentRepository`, autowire beide, und in `tearDown()` VOR `seasonRepository.deleteAll()`:

```java
        gameDayEquipmentRepository.deleteAll();
        equipmentItemRepository.deleteAll();
```

(Reihenfolge: erst `game_day_equipment`, dann `equipment_item`; GameDays werden über bestehende Tests/keinen Bezug hier separat erzeugt — füge `gameDayRepository.deleteAll()` hinzu falls nötig: autowire `SpringGameDayRepository` und leere es vor `seasonRepository`.)

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=EquipmentIntegrationTest`
Expected: PASS (alle 3 Methoden).

- [ ] **Step 5: Volle Backend-Suite**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS (keine Regression).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/EquipmentRequest.java \
  backend/src/main/java/com/softball/adapter/dto/EquipmentResponse.java \
  backend/src/main/java/com/softball/adapter/dto/GameDayEquipmentResponse.java \
  backend/src/main/java/com/softball/adapter/dto/ToggleEquipmentRequest.java \
  backend/src/main/java/com/softball/adapter/in/web/EquipmentController.java \
  backend/src/test/java/com/softball/integration/EquipmentIntegrationTest.java
git commit -m "✨ BE: Equipment-REST — GET/POST/PUT/DELETE + Carry-Over, Persistenz-Tests"
```

---

### Task 4: Frontend — Typen, API-Client, useEquipment-Hook

**Files:**
- Modify: `frontend/src/types/index.ts` (Typ anhängen)
- Modify: `frontend/src/api/client.ts` (Endpoints anhängen)
- Create: `frontend/src/hooks/useEquipment.ts`

**Interfaces:**
- Produces:
  - Type `EquipmentItem { id: number; name: string; category: string; quantity: number; storageLocation: string | null; notes: string | null; used: boolean }`
  - Type `EquipmentInput { name: string; category: string; quantity: number; storageLocation: string | null; notes: string | null }`
  - API: `getEquipment(gameDayId)`, `createEquipment(gameDayId, input)`, `toggleEquipment(gameDayId, itemId, used)`, `carryOverEquipment(gameDayId)`, `updateEquipment(itemId, input)`, `deleteEquipment(itemId)`
  - Hook `useEquipment(gameDayId)` → `{ items, loading, toggle, add, edit, remove, carryOver }`

- [ ] **Step 1: Typen anhängen**

In `frontend/src/types/index.ts` am Dateiende anhängen:

```typescript
export interface EquipmentItem {
  id: number
  name: string
  category: string
  quantity: number
  storageLocation: string | null
  notes: string | null
  used: boolean
}

export interface EquipmentInput {
  name: string
  category: string
  quantity: number
  storageLocation: string | null
  notes: string | null
}
```

- [ ] **Step 2: API-Client-Funktionen anhängen**

In `frontend/src/api/client.ts`: `EquipmentItem`, `EquipmentInput` zum Typ-Import oben hinzufügen, dann am Dateiende:

```typescript
export const getEquipment = (gameDayId: number) =>
  request<EquipmentItem[]>(`/gamedays/${gameDayId}/equipment`)
export const createEquipment = (gameDayId: number, input: EquipmentInput) =>
  request<EquipmentItem>(`/gamedays/${gameDayId}/equipment`, { method: 'POST', body: JSON.stringify(input) })
export const toggleEquipment = (gameDayId: number, itemId: number, used: boolean) =>
  request<void>(`/gamedays/${gameDayId}/equipment/${itemId}`, { method: 'PUT', body: JSON.stringify({ used }) })
export const carryOverEquipment = (gameDayId: number) =>
  request<EquipmentItem[]>(`/gamedays/${gameDayId}/equipment/carry-over`, { method: 'POST' })
export const updateEquipment = (itemId: number, input: EquipmentInput) =>
  request<Omit<EquipmentItem, 'used'>>(`/equipment/${itemId}`, { method: 'PUT', body: JSON.stringify(input) })
export const deleteEquipment = (itemId: number) =>
  request<void>(`/equipment/${itemId}`, { method: 'DELETE' })
```

- [ ] **Step 3: Hook schreiben**

Create `frontend/src/hooks/useEquipment.ts`:

```typescript
import { useState, useCallback, useEffect } from 'react'
import type { EquipmentItem, EquipmentInput } from '@/types'
import * as api from '@/api/client'

export function useEquipment(gameDayId: number | null) {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (gameDayId == null) return
    setLoading(true)
    try { setItems(await api.getEquipment(gameDayId)) } finally { setLoading(false) }
  }, [gameDayId])

  useEffect(() => { void reload() }, [reload])

  // Optimistic toggle: sofort umschalten, bei Fehler zurückrollen.
  const toggle = useCallback(async (itemId: number, used: boolean) => {
    if (gameDayId == null) return
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, used } : i))
    try {
      await api.toggleEquipment(gameDayId, itemId, used)
    } catch (e) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, used: !used } : i))
      throw e
    }
  }, [gameDayId])

  const add = useCallback(async (input: EquipmentInput) => {
    if (gameDayId == null) return
    const created = await api.createEquipment(gameDayId, input)
    setItems(prev => [...prev, created])
    return created
  }, [gameDayId])

  const edit = useCallback(async (itemId: number, input: EquipmentInput) => {
    const updated = await api.updateEquipment(itemId, input)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updated } : i))
  }, [])

  const remove = useCallback(async (itemId: number) => {
    await api.deleteEquipment(itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }, [])

  const carryOver = useCallback(async () => {
    if (gameDayId == null) return
    setItems(await api.carryOverEquipment(gameDayId))
  }, [gameDayId])

  return { items, loading, toggle, add, edit, remove, carryOver, reload }
}
```

- [ ] **Step 4: Typecheck/Build**

Run: `cd frontend && npm run build`
Expected: PASS (tsc clean). Falls `EquipmentItem`/`EquipmentInput` im client-Import fehlen → ergänzen.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts frontend/src/hooks/useEquipment.ts
git commit -m "✨ FE: useEquipment-Hook + API-Client + Typen"
```

---

### Task 5: Frontend — MaterialSheet + GameDayPlanner-Integration

**Files:**
- Create: `frontend/src/components/planner/MaterialSheet.tsx`
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx`

**Interfaces:**
- Consumes: `useEquipment` (Task 4), Icons aus `@/icons` (`ClipboardListIcon`, `CheckCircle`, `PlusCircle`, `Pencil`, `TrashBin`, `AlertTriangle`, `XMark`, `CrossBones`), `ConfirmModal` aus `@/components/shared/ConfirmModal`.
- Produces: `<MaterialSheet gameDayId={number} gameDayLabel={string} onClose={() => void} />`

- [ ] **Step 1: Prüfen welche Icons existieren**

Run: `cd frontend && grep -oE "export (const|function) (ClipboardListIcon|CheckCircle|PlusCircle|Pencil|TrashBin|AlertTriangle|XMark|CrossBones)" src/icons/index.tsx`
Expected: alle 8 gelistet. Fehlt eins, im selben Stil wie Nachbar-Icons ergänzen (gleiche `size`/`className`-Props-Signatur).

- [ ] **Step 2: MaterialSheet-Komponente schreiben**

Create `frontend/src/components/planner/MaterialSheet.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useEquipment } from '@/hooks/useEquipment'
import { useToastContext } from '@/components/layout/Layout'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ClipboardListIcon, CheckCircle, PlusCircle, Pencil, TrashBin, AlertTriangle, XMark, CrossBones } from '@/icons'
import type { EquipmentItem, EquipmentInput } from '@/types'

const CATEGORY_SUGGESTIONS = ['Aufbau', 'Spielmaterial', 'Catering']
const LOCATION_SUGGESTIONS = ['Garage', 'Raum']

interface Props {
  gameDayId: number
  gameDayLabel: string
  onClose: () => void
}

type GroupMode = 'category' | 'location'

const emptyInput: EquipmentInput = { name: '', category: 'Aufbau', quantity: 1, storageLocation: '', notes: '' }

export function MaterialSheet({ gameDayId, gameDayLabel, onClose }: Props) {
  const { items, loading, toggle, add, edit, remove, carryOver } = useEquipment(gameDayId)
  const toast = useToastContext()
  const [groupMode, setGroupMode] = useState<GroupMode>('category')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteItem, setDeleteItem] = useState<EquipmentItem | null>(null)
  const [expandedNote, setExpandedNote] = useState<number | null>(null)

  const usedCount = items.filter(i => i.used).length
  const hasAnyUsed = usedCount > 0

  const groups = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>()
    for (const i of items) {
      const key = groupMode === 'category'
        ? (i.category || 'Sonstiges')
        : (i.storageLocation?.trim() || 'Ohne Ort')
      const arr = map.get(key) ?? []
      arr.push(i)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'))
  }, [items, groupMode])

  const handleToggle = async (item: EquipmentItem) => {
    try { await toggle(item.id, !item.used) }
    catch { toast.show('Konnte nicht speichern', 'error') }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try { await remove(deleteItem.id); toast.show('Sache gelöscht') }
    catch (e) { toast.show((e as Error).message, 'error') }
    finally { setDeleteItem(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-navy-950/70">
      <div className="bg-cream-50 w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-[640px] sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-cream-300 sticky top-0 bg-cream-50">
          <ClipboardListIcon size={18} className="text-navy-800" />
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900 truncate">Material</div>
            <div className="text-[11px] text-gray-500 truncate">{gameDayLabel} · Dabei {usedCount}/{items.length}</div>
          </div>
          <button onClick={onClose} aria-label="Schließen" className="p-2 text-gray-400 hover:text-navy-800 cursor-pointer rounded-md hover:bg-cream-100">
            <XMark size={18} />
          </button>
        </div>

        {/* Group toggle */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-cream-200">
          <div className="flex bg-cream-100 border border-cream-300 rounded-lg p-0.5">
            <button onClick={() => setGroupMode('category')}
              className={`px-3 h-8 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors ${groupMode === 'category' ? 'bg-navy-800 text-white' : 'text-navy-700'}`}>
              Kategorie
            </button>
            <button onClick={() => setGroupMode('location')}
              className={`px-3 h-8 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors ${groupMode === 'location' ? 'bg-navy-800 text-white' : 'text-navy-700'}`}>
              Lagerort
            </button>
          </div>
          {!hasAnyUsed && items.length > 0 && (
            <button onClick={() => carryOver().catch(() => toast.show('Konnte nicht übernehmen', 'error'))}
              className="ml-auto text-xs font-bold uppercase tracking-wider text-navy-700 hover:text-navy-900 hover:bg-cream-100 px-2.5 h-8 rounded-md cursor-pointer">
              Letztes Mal übernehmen
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-10">Lädt…</p>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <CrossBones size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-gray-500 text-sm">Noch keine Sachen — leg los, baut sich beim Aufbau von selbst auf.</p>
            </div>
          ) : groups.map(([groupName, groupItems]) => {
            const groupUsed = groupItems.filter(i => i.used).length
            return (
              <div key={groupName} className="mb-3">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="font-display text-[11px] font-extrabold uppercase tracking-widest text-navy-900">{groupName}</span>
                  <span className="text-[10px] font-display text-gray-400">{groupUsed}/{groupItems.length}</span>
                </div>
                {groupItems.map(item => (
                  <div key={item.id} className="group flex items-center gap-2 min-h-[52px] px-2 rounded-lg hover:bg-cream-100">
                    <button onClick={() => handleToggle(item)} aria-label={item.used ? 'Abwählen' : 'Dabei'} className="shrink-0 cursor-pointer">
                      {item.used
                        ? <CheckCircle size={22} className="text-softball-red-600" />
                        : <span className="block w-[22px] h-[22px] rounded-full border-2 border-cream-400" />}
                    </button>
                    <button onClick={() => handleToggle(item)} className="flex-1 min-w-0 text-left cursor-pointer py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-navy-900 truncate">{item.name}</span>
                        <span className="text-xs text-gray-400 tabular-nums shrink-0">×{item.quantity}</span>
                        {item.notes && (
                          <button onClick={e => { e.stopPropagation(); setExpandedNote(expandedNote === item.id ? null : item.id) }}
                            aria-label="Notiz" className="shrink-0 cursor-pointer">
                            <AlertTriangle size={13} className="text-amber-400" />
                          </button>
                        )}
                      </div>
                      {item.storageLocation && groupMode === 'category' && (
                        <span className="inline-block mt-0.5 text-[11px] bg-cream-100 text-navy-800 px-1.5 py-0.5 rounded">📍 {item.storageLocation}</span>
                      )}
                      {expandedNote === item.id && item.notes && (
                        <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                      )}
                    </button>
                    <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingId(item.id)} aria-label="Bearbeiten" className="p-1.5 text-gray-400 hover:text-navy-700 cursor-pointer">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteItem(item)} aria-label="Löschen" className="p-1.5 text-gray-400 hover:text-softball-red-600 cursor-pointer">
                        <TrashBin size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {editingId != null && groupItems.some(i => i.id === editingId) && (
                  <ItemForm
                    initial={groupItems.find(i => i.id === editingId)!}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async input => { await edit(editingId, input); setEditingId(null) }}
                  />
                )}
              </div>
            )
          })}

          {adding && (
            <ItemForm
              initial={emptyInput}
              onCancel={() => setAdding(false)}
              onSubmit={async input => { await add(input); setAdding(false) }}
            />
          )}
        </div>

        {/* Add button (sticky bottom) */}
        <div className="border-t border-cream-300 p-3 bg-cream-50">
          <button onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-navy-800 text-white font-bold text-sm hover:bg-navy-900 cursor-pointer">
            <PlusCircle size={18} /> Sache hinzufügen
          </button>
        </div>
      </div>

      {deleteItem && (
        <ConfirmModal
          title="Aus Katalog löschen"
          message={`„${deleteItem.name}" dauerhaft aus dem Material-Katalog löschen? Wird aus allen Spieltagen entfernt.`}
          confirmLabel="Löschen"
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}

interface FormProps {
  initial: EquipmentInput | EquipmentItem
  onCancel: () => void
  onSubmit: (input: EquipmentInput) => Promise<void>
}

function ItemForm({ initial, onCancel, onSubmit }: FormProps) {
  const [name, setName] = useState(initial.name)
  const [category, setCategory] = useState(initial.category || 'Aufbau')
  const [quantity, setQuantity] = useState(initial.quantity || 1)
  const [storageLocation, setStorageLocation] = useState(initial.storageLocation ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), category: category.trim() || 'Sonstiges', quantity, storageLocation: storageLocation.trim() || null, notes: notes.trim() || null })
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-cream-100 border border-cream-300 rounded-lg p-3 space-y-2 mx-2 my-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (z.B. Pavillon)" autoFocus
        className="w-full px-2 py-1.5 rounded border border-cream-300 text-sm" />
      <div className="flex gap-2">
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Kategorie" list="cat-suggestions"
          className="flex-1 px-2 py-1.5 rounded border border-cream-300 text-sm" />
        <input type="number" min={0} value={quantity} onChange={e => setQuantity(Math.max(0, Number(e.target.value)))}
          className="w-20 px-2 py-1.5 rounded border border-cream-300 text-sm tabular-nums" />
      </div>
      <datalist id="cat-suggestions">{CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
      <input value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="Lagerort (z.B. Garage)" list="loc-suggestions"
        className="w-full px-2 py-1.5 rounded border border-cream-300 text-sm" />
      <datalist id="loc-suggestions">{LOCATION_SUGGESTIONS.map(l => <option key={l} value={l} />)}</datalist>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notiz (optional)"
        className="w-full px-2 py-1.5 rounded border border-cream-300 text-sm" />
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-cream-200 rounded cursor-pointer">Abbrechen</button>
        <button onClick={submit} disabled={!name.trim() || saving}
          className="px-3 py-1.5 text-sm font-bold text-white bg-navy-800 hover:bg-navy-900 rounded cursor-pointer disabled:opacity-50">Speichern</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: GameDayPlanner — Button + Sheet einbinden**

In `frontend/src/components/planner/GameDayPlanner.tsx`:

Import ergänzen (bei den anderen planner-Imports):
```tsx
import { MaterialSheet } from './MaterialSheet'
```
Icon-Import erweitern (vorhandene Zeile aus `@/icons` um `ClipboardListIcon` ergänzen).

State neben den anderen `useState`-Zeilen:
```tsx
const [showMaterial, setShowMaterial] = useState(false)
```

Im DESKTOP-Toolbar-Strip (nach dem „Liste"-Button, vor `</div>`) und im MOBILE-Toolbar-Strip je einen Eintrag hinzufügen. Desktop:
```tsx
<button
  onClick={() => setShowMaterial(true)}
  className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
  title="Material / Aufbau"
>
  <ClipboardListIcon size={14} />
  <span>Material</span>
</button>
```
Mobile (im `ToolbarBtn`-Strip):
```tsx
<ToolbarBtn icon={<ClipboardListIcon size={16} />} label="Material" onClick={() => setShowMaterial(true)} />
```

Sheet rendern (bei den anderen Modals am Ende, z.B. neben `showPlayersModal`):
```tsx
{showMaterial && (
  <MaterialSheet
    gameDayId={gameDayId}
    gameDayLabel={`${gameDay.label || 'Spieltag'} · ${formatDate(gameDay.date)}`}
    onClose={() => setShowMaterial(false)}
  />
)}
```

- [ ] **Step 4: Lint + Build**

Run: `cd frontend && npm run lint && npm run build`
Expected: 0 ESLint-Fehler (Warnings ok), tsc/vite build PASS.

- [ ] **Step 5: Manuell verifizieren (lokal, Docker nötig)**

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml   # :8080
cd frontend && npx vite                                            # :5173
```
Prüfen: GameDay öffnen → „Material" → Sache anlegen (Garage) → abhaken → **Seite neu laden** → Haken + Lagerort bleiben. Toggle Kategorie↔Lagerort. Edit. Delete → ConfirmModal. Zweiter Spieltag → „Letztes Mal übernehmen".

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/planner/MaterialSheet.tsx frontend/src/components/planner/GameDayPlanner.tsx
git commit -m "✨ FE: Material-Sheet am Heimspieltag — Abhaken, Lagerort-Gruppierung, Carry-Over"
```

---

## Self-Review

**Spec-Coverage:**
- Stamm-Katalog + Abhaken pro Spieltag → Task 1 (Tabellen) + 2 (Service) + 3 (Endpoints) ✓
- Kein Snapshot (Lagerort/Menge am Katalog) → Modell Task 1 ✓
- Felder name/category/quantity/storageLocation/notes → Entity/DTO ✓
- Kategorie frei + Vorschläge → `ItemForm` datalist ✓
- v1 nur Sheet am Spieltag → Task 5, kein /orga ✓
- „nach Lagerort"-Ansicht → `groupMode` Task 5 ✓
- „letztes Mal übernehmen" → carry-over Task 2/3 + Button Task 5 ✓
- Persistenz reload-fest + expliziter Test → Task 3 `addToggleAndReload_persists` ✓
- Cascade-Delete → Migration ON DELETE CASCADE + Test `deleteItem_cascadesUsage` ✓
- Icons nur eigenes Set → Task 5 Step 1 prüft, kein lucide ✓
- Zwei Lösch-Bedeutungen (untick vs Katalog-Delete + ConfirmModal) → Task 5 ✓
- Responsive (vollflächig mobil / Modal Desktop) → MaterialSheet Klassen ✓
- Optimistic toggle + Rollback → `useEquipment.toggle` ✓

**Placeholder-Scan:** Keine TBD/TODO; alle Steps mit vollständigem Code. ✓

**Typ-Konsistenz:** `EquipmentItem`-Felder identisch über Domain/Entity/DTO/TS. Port-Methoden (`findAllOrdered`, `markUsed/markUnused`, `findMostRecentGameDayIdWithUsageBefore`, `findUsedItemIds`) in Adapter Task 1 = Aufrufe in Service Task 2. Service-Signaturen = Controller-Aufrufe Task 3. Hook-Funktionen = MaterialSheet-Nutzung Task 5. ✓

**Verifiziert:** `GameDay.getDate()` (Z.36) + `GameDay.getSeasonId()` (Z.48) existieren — Carry-Over-Query parametrisierbar.
