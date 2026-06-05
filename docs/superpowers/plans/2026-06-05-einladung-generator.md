# Einladungs-Generator (Orga) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Speicherbare Heimspiel-Einladungen (Indoor/Cose) anlegen, bearbeiten, duplizieren und als PDF (WhatsApp-teilbar) generieren — neuer Orga-Bereich.

**Architecture:** Neue `Invitation`-Entity (Skalar-Felder + JSONB für `guestTeams`/`games`/`contacts`, Mapping via Jackson wie `TrainingPlanMapper`). Onion-CRUD-Slice (domain/application/adapter). Frontend: Orga-Nav → Liste + Editor (Kopf-Felder + Spielplan-Editor + Kontakt-Editor) + clientseitige jsPDF-Generierung. Keine spezielle Domain-Logik außer `duplicate`.

**Tech Stack:** Java 21 / Spring Boot / Jackson / Flyway · React 19 / TS / Vite / jsPDF + jspdf-autotable

---

## File Structure

**Backend**
- Create `domain/model/Invitation.java`, `InvitationGame.java`, `InvitationContact.java`, `PairingMode.java`
- Create `domain/port/out/InvitationRepository.java`
- Create `application/InvitationService.java` + test `InvitationServiceTest.java`
- Create `adapter/out/persistence/entity/InvitationEntity.java`, `repository/SpringInvitationRepository.java`, `mapper/InvitationMapper.java`, `adapter/InvitationRepositoryAdapter.java`
- Create `adapter/dto/InvitationResponse.java`, `InvitationRequest.java`
- Create `adapter/in/web/InvitationController.java`
- Create `resources/db/migration/V35__create_invitations.sql`

**Frontend**
- Modify `src/types/index.ts` — Invitation types
- Modify `src/api/client.ts` — invitation CRUD
- Create `src/hooks/useInvitations.ts`
- Modify `src/components/layout/Layout.tsx` — Orga nav tab
- Modify `src/App.tsx` — route
- Create `src/components/orga/InvitationListPage.tsx`, `InvitationEditor.tsx`, `GameScheduleEditor.tsx`, `ContactEditor.tsx`
- Create `src/utils/invitationPdf.ts`

---

## Task 1: Backend domain models

**Files:** Create the 4 domain classes.

- [ ] **Step 1: Create the enum + models**

`domain/model/PairingMode.java`:
```java
package com.softball.domain.model;

public enum PairingMode { HEIM_GAST, TEAM_1_2 }
```

`domain/model/InvitationGame.java`:
```java
package com.softball.domain.model;

public class InvitationGame {
    private String time;
    private String teamA;
    private String teamB;
    private String ump;

    public InvitationGame() {}

    public String getTime() { return time; }
    public void setTime(final String time) { this.time = time; }
    public String getTeamA() { return teamA; }
    public void setTeamA(final String teamA) { this.teamA = teamA; }
    public String getTeamB() { return teamB; }
    public void setTeamB(final String teamB) { this.teamB = teamB; }
    public String getUmp() { return ump; }
    public void setUmp(final String ump) { this.ump = ump; }
}
```

`domain/model/InvitationContact.java`:
```java
package com.softball.domain.model;

public class InvitationContact {
    private String role;
    private String name;
    private String email;
    private String phone;

    public InvitationContact() {}

    public String getRole() { return role; }
    public void setRole(final String role) { this.role = role; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(final String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(final String phone) { this.phone = phone; }
}
```

`domain/model/Invitation.java`:
```java
package com.softball.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Invitation {
    private Long id;
    private String title;
    private LocalDate letterDate;
    private LocalDate eventDate;
    private String venue;
    private PairingMode pairingMode = PairingMode.HEIM_GAST;
    private String bodyText;
    private List<String> guestTeams = new ArrayList<>();
    private List<InvitationGame> games = new ArrayList<>();
    private List<InvitationContact> contacts = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Invitation() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(final String title) { this.title = title; }
    public LocalDate getLetterDate() { return letterDate; }
    public void setLetterDate(final LocalDate letterDate) { this.letterDate = letterDate; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(final LocalDate eventDate) { this.eventDate = eventDate; }
    public String getVenue() { return venue; }
    public void setVenue(final String venue) { this.venue = venue; }
    public PairingMode getPairingMode() { return pairingMode != null ? pairingMode : PairingMode.HEIM_GAST; }
    public void setPairingMode(final PairingMode pairingMode) { this.pairingMode = pairingMode; }
    public String getBodyText() { return bodyText; }
    public void setBodyText(final String bodyText) { this.bodyText = bodyText; }
    public List<String> getGuestTeams() { return guestTeams; }
    public void setGuestTeams(final List<String> guestTeams) { this.guestTeams = guestTeams != null ? guestTeams : new ArrayList<>(); }
    public List<InvitationGame> getGames() { return games; }
    public void setGames(final List<InvitationGame> games) { this.games = games != null ? games : new ArrayList<>(); }
    public List<InvitationContact> getContacts() { return contacts; }
    public void setContacts(final List<InvitationContact> contacts) { this.contacts = contacts != null ? contacts : new ArrayList<>(); }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(final LocalDateTime v) { this.createdAt = v; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final LocalDateTime v) { this.updatedAt = v; }
}
```

- [ ] **Step 2: Create the port** `domain/port/out/InvitationRepository.java`:
```java
package com.softball.domain.port.out;

import com.softball.domain.model.Invitation;
import java.util.List;
import java.util.Optional;

public interface InvitationRepository {
    List<Invitation> findAllOrderByUpdatedAtDesc();
    Optional<Invitation> findById(Long id);
    Invitation save(Invitation invitation);
    void deleteById(Long id);
    boolean existsById(Long id);
}
```

- [ ] **Step 3: Compile** — `cd backend && ./mvnw -q -s .mvn/local-settings.xml compile`. Expected: success.
- [ ] **Step 4: Commit** — `git add backend/src/main/java/com/softball/domain && git commit -m "✨ Invitation Domain-Modelle + Port"`

---

## Task 2: Migration + persistence (entity, repo, mapper, adapter)

**Files:** migration + 4 persistence classes.

- [ ] **Step 1: Migration** `resources/db/migration/V35__create_invitations.sql`:
```sql
CREATE TABLE invitations (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    letter_date DATE,
    event_date DATE,
    venue VARCHAR(200),
    pairing_mode VARCHAR(10) NOT NULL DEFAULT 'HEIM_GAST',
    body_text TEXT,
    guest_teams JSONB NOT NULL DEFAULT '[]',
    games JSONB NOT NULL DEFAULT '[]',
    contacts JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Entity** `adapter/out/persistence/entity/InvitationEntity.java`:
```java
package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.PairingMode;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "invitations")
public class InvitationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(name = "letter_date")
    private LocalDate letterDate;

    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(length = 200)
    private String venue;

    @Enumerated(EnumType.STRING)
    @Column(name = "pairing_mode", nullable = false, length = 10)
    private PairingMode pairingMode = PairingMode.HEIM_GAST;

    @Column(name = "body_text", columnDefinition = "text")
    private String bodyText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "guest_teams", columnDefinition = "jsonb", nullable = false)
    private String guestTeams = "[]";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "games", columnDefinition = "jsonb", nullable = false)
    private String games = "[]";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contacts", columnDefinition = "jsonb", nullable = false)
    private String contacts = "[]";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        final LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(final String title) { this.title = title; }
    public LocalDate getLetterDate() { return letterDate; }
    public void setLetterDate(final LocalDate v) { this.letterDate = v; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(final LocalDate v) { this.eventDate = v; }
    public String getVenue() { return venue; }
    public void setVenue(final String venue) { this.venue = venue; }
    public PairingMode getPairingMode() { return pairingMode; }
    public void setPairingMode(final PairingMode v) { this.pairingMode = v; }
    public String getBodyText() { return bodyText; }
    public void setBodyText(final String v) { this.bodyText = v; }
    public String getGuestTeams() { return guestTeams; }
    public void setGuestTeams(final String v) { this.guestTeams = v; }
    public String getGames() { return games; }
    public void setGames(final String v) { this.games = v; }
    public String getContacts() { return contacts; }
    public void setContacts(final String v) { this.contacts = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(final LocalDateTime v) { this.createdAt = v; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final LocalDateTime v) { this.updatedAt = v; }
}
```

- [ ] **Step 3: Spring repo** `adapter/out/persistence/repository/SpringInvitationRepository.java`:
```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.InvitationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringInvitationRepository extends JpaRepository<InvitationEntity, Long> {
    List<InvitationEntity> findAllByOrderByUpdatedAtDesc();
}
```

- [ ] **Step 4: Mapper** `adapter/out/persistence/mapper/InvitationMapper.java` (JSONB via Jackson, mirror TrainingPlanMapper):
```java
package com.softball.adapter.out.persistence.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.softball.adapter.out.persistence.entity.InvitationEntity;
import com.softball.domain.model.Invitation;
import com.softball.domain.model.InvitationContact;
import com.softball.domain.model.InvitationGame;
import com.softball.domain.model.PairingMode;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class InvitationMapper {

    private final ObjectMapper objectMapper;

    public InvitationMapper(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public Invitation toDomain(final InvitationEntity e) {
        if (e == null) return null;
        final Invitation inv = new Invitation();
        inv.setId(e.getId());
        inv.setTitle(e.getTitle());
        inv.setLetterDate(e.getLetterDate());
        inv.setEventDate(e.getEventDate());
        inv.setVenue(e.getVenue());
        inv.setPairingMode(e.getPairingMode() != null ? e.getPairingMode() : PairingMode.HEIM_GAST);
        inv.setBodyText(e.getBodyText());
        inv.setGuestTeams(readList(e.getGuestTeams(), new TypeReference<List<String>>() {}));
        inv.setGames(readList(e.getGames(), new TypeReference<List<InvitationGame>>() {}));
        inv.setContacts(readList(e.getContacts(), new TypeReference<List<InvitationContact>>() {}));
        inv.setCreatedAt(e.getCreatedAt());
        inv.setUpdatedAt(e.getUpdatedAt());
        return inv;
    }

    public InvitationEntity toEntity(final Invitation inv) {
        if (inv == null) return null;
        final InvitationEntity e = new InvitationEntity();
        e.setId(inv.getId());
        applyScalars(e, inv);
        return e;
    }

    public void updateEntity(final InvitationEntity e, final Invitation inv) {
        applyScalars(e, inv);
    }

    private void applyScalars(final InvitationEntity e, final Invitation inv) {
        e.setTitle(inv.getTitle());
        e.setLetterDate(inv.getLetterDate());
        e.setEventDate(inv.getEventDate());
        e.setVenue(inv.getVenue());
        e.setPairingMode(inv.getPairingMode());
        e.setBodyText(inv.getBodyText());
        e.setGuestTeams(write(inv.getGuestTeams()));
        e.setGames(write(inv.getGames()));
        e.setContacts(write(inv.getContacts()));
    }

    private <T> List<T> readList(final String json, final TypeReference<List<T>> type) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, type);
        } catch (final JsonProcessingException ex) {
            throw new RuntimeException("Failed to deserialize invitation json", ex);
        }
    }

    private String write(final Object value) {
        try {
            return objectMapper.writeValueAsString(value != null ? value : List.of());
        } catch (final JsonProcessingException ex) {
            throw new RuntimeException("Failed to serialize invitation json", ex);
        }
    }
}
```

- [ ] **Step 5: Adapter** `adapter/out/persistence/adapter/InvitationRepositoryAdapter.java`:
```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.InvitationEntity;
import com.softball.adapter.out.persistence.mapper.InvitationMapper;
import com.softball.adapter.out.persistence.repository.SpringInvitationRepository;
import com.softball.domain.model.Invitation;
import com.softball.domain.port.out.InvitationRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class InvitationRepositoryAdapter implements InvitationRepository {

    private final SpringInvitationRepository repo;
    private final InvitationMapper mapper;

    public InvitationRepositoryAdapter(final SpringInvitationRepository repo, final InvitationMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<Invitation> findAllOrderByUpdatedAtDesc() {
        return repo.findAllByOrderByUpdatedAtDesc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<Invitation> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Invitation save(final Invitation invitation) {
        if (invitation.getId() != null) {
            final InvitationEntity existing = repo.findById(invitation.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, invitation);
                return mapper.toDomain(repo.save(existing));
            }
        }
        return mapper.toDomain(repo.save(mapper.toEntity(invitation)));
    }

    @Override
    public void deleteById(final Long id) { repo.deleteById(id); }

    @Override
    public boolean existsById(final Long id) { return repo.existsById(id); }
}
```

- [ ] **Step 6: Compile** — `cd backend && ./mvnw -q -s .mvn/local-settings.xml compile`. Expected: success.
- [ ] **Step 7: Commit** — `git add backend/src/main/java/com/softball/adapter/out backend/src/main/resources/db/migration/V35__create_invitations.sql && git commit -m "✨ Invitation Persistence (JSONB) + V35-Migration"`

---

## Task 3: Application service (CRUD + duplicate) + test

**Files:** `application/InvitationService.java`, test `InvitationServiceTest.java`.

- [ ] **Step 1: Write the failing test** `backend/src/test/java/com/softball/application/InvitationServiceTest.java`:
```java
package com.softball.application;

import com.softball.domain.model.Invitation;
import com.softball.domain.model.InvitationGame;
import com.softball.domain.port.out.InvitationRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InvitationServiceTest {

    /** In-Memory-Fake des Ports — kein Spring/DB nötig. */
    static class FakeRepo implements InvitationRepository {
        final List<Invitation> store = new ArrayList<>();
        final AtomicLong seq = new AtomicLong(1);
        public List<Invitation> findAllOrderByUpdatedAtDesc() { return List.copyOf(store); }
        public Optional<Invitation> findById(Long id) { return store.stream().filter(i -> id.equals(i.getId())).findFirst(); }
        public Invitation save(Invitation inv) {
            if (inv.getId() == null) { inv.setId(seq.getAndIncrement()); store.add(inv); }
            return inv;
        }
        public void deleteById(Long id) { store.removeIf(i -> id.equals(i.getId())); }
        public boolean existsById(Long id) { return store.stream().anyMatch(i -> id.equals(i.getId())); }
    }

    private Invitation sample() {
        final Invitation inv = new Invitation();
        inv.setTitle("Indoor Series Turnier");
        inv.setGuestTeams(List.of("Padres", "Aixplosives", "Roadrunners"));
        final InvitationGame g = new InvitationGame();
        g.setTime("10:00"); g.setTeamA("Dead Sox"); g.setTeamB("Padres"); g.setUmp("Aixplosives");
        inv.setGames(new ArrayList<>(List.of(g)));
        return inv;
    }

    @Test
    void createAssignsIdAndDuplicateCopiesContentWithNewTitle() {
        final InvitationService service = new InvitationService(new FakeRepo());
        final Invitation saved = service.create(sample());
        assertThat(saved.getId()).isNotNull();

        final Invitation dup = service.duplicate(saved.getId());
        assertThat(dup.getId()).isNotEqualTo(saved.getId());
        assertThat(dup.getTitle()).isEqualTo("Indoor Series Turnier (Kopie)");
        assertThat(dup.getGuestTeams()).containsExactly("Padres", "Aixplosives", "Roadrunners");
        assertThat(dup.getGames()).hasSize(1);
    }

    @Test
    void deleteMissingThrows() {
        final InvitationService service = new InvitationService(new FakeRepo());
        assertThatThrownBy(() -> service.delete(999L))
            .isInstanceOf(com.softball.shared.exception.ResourceNotFoundException.class);
    }
}
```

- [ ] **Step 2: Run, confirm fail** — `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=InvitationServiceTest`. Expected: COMPILE FAIL (InvitationService missing).

- [ ] **Step 3: Implement** `application/InvitationService.java`:
```java
package com.softball.application;

import com.softball.domain.model.Invitation;
import com.softball.domain.model.InvitationContact;
import com.softball.domain.model.InvitationGame;
import com.softball.domain.port.out.InvitationRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class InvitationService {

    private static final Logger log = LoggerFactory.getLogger(InvitationService.class);

    private final InvitationRepository repository;

    public InvitationService(final InvitationRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Invitation> findAll() {
        return repository.findAllOrderByUpdatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Invitation findById(final Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Invitation", id));
    }

    @Transactional
    public Invitation create(final Invitation invitation) {
        invitation.setId(null);
        log.info("Einladung erstellt: {}", invitation.getTitle());
        return repository.save(invitation);
    }

    @Transactional
    public Invitation update(final Long id, final Invitation incoming) {
        final Invitation existing = findById(id);
        existing.setTitle(incoming.getTitle());
        existing.setLetterDate(incoming.getLetterDate());
        existing.setEventDate(incoming.getEventDate());
        existing.setVenue(incoming.getVenue());
        existing.setPairingMode(incoming.getPairingMode());
        existing.setBodyText(incoming.getBodyText());
        existing.setGuestTeams(incoming.getGuestTeams());
        existing.setGames(incoming.getGames());
        existing.setContacts(incoming.getContacts());
        log.info("Einladung aktualisiert: {} ({})", id, incoming.getTitle());
        return repository.save(existing);
    }

    @Transactional
    public Invitation duplicate(final Long id) {
        final Invitation src = findById(id);
        final Invitation copy = new Invitation();
        copy.setTitle(src.getTitle() + " (Kopie)");
        copy.setLetterDate(src.getLetterDate());
        copy.setEventDate(src.getEventDate());
        copy.setVenue(src.getVenue());
        copy.setPairingMode(src.getPairingMode());
        copy.setBodyText(src.getBodyText());
        copy.setGuestTeams(new ArrayList<>(src.getGuestTeams()));
        copy.setGames(copyGames(src.getGames()));
        copy.setContacts(copyContacts(src.getContacts()));
        log.info("Einladung dupliziert: {} -> Kopie", id);
        return repository.save(copy);
    }

    @Transactional
    public void delete(final Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Invitation", id);
        }
        log.info("Einladung geloescht: {}", id);
        repository.deleteById(id);
    }

    private List<InvitationGame> copyGames(final List<InvitationGame> src) {
        final List<InvitationGame> out = new ArrayList<>();
        for (final InvitationGame g : src) {
            final InvitationGame c = new InvitationGame();
            c.setTime(g.getTime()); c.setTeamA(g.getTeamA()); c.setTeamB(g.getTeamB()); c.setUmp(g.getUmp());
            out.add(c);
        }
        return out;
    }

    private List<InvitationContact> copyContacts(final List<InvitationContact> src) {
        final List<InvitationContact> out = new ArrayList<>();
        for (final InvitationContact c0 : src) {
            final InvitationContact c = new InvitationContact();
            c.setRole(c0.getRole()); c.setName(c0.getName()); c.setEmail(c0.getEmail()); c.setPhone(c0.getPhone());
            out.add(c);
        }
        return out;
    }
}
```

- [ ] **Step 4: Run, confirm pass** — `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=InvitationServiceTest`. Expected: PASS (2 tests).
- [ ] **Step 5: Commit** — `git add backend/src/main/java/com/softball/application/InvitationService.java backend/src/test/java/com/softball/application/InvitationServiceTest.java && git commit -m "✨ InvitationService CRUD + duplicate"`

---

## Task 4: DTOs + controller

**Files:** `adapter/dto/InvitationRequest.java`, `InvitationResponse.java`, `adapter/in/web/InvitationController.java`.

- [ ] **Step 1: Request DTO** `adapter/dto/InvitationRequest.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.Invitation;
import com.softball.domain.model.InvitationContact;
import com.softball.domain.model.InvitationGame;
import com.softball.domain.model.PairingMode;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.List;

public record InvitationRequest(
        @NotBlank String title,
        LocalDate letterDate,
        LocalDate eventDate,
        String venue,
        PairingMode pairingMode,
        String bodyText,
        List<String> guestTeams,
        List<GameDto> games,
        List<ContactDto> contacts) {

    public record GameDto(String time, String teamA, String teamB, String ump) {}
    public record ContactDto(String role, String name, String email, String phone) {}

    public Invitation toDomain() {
        final Invitation inv = new Invitation();
        inv.setTitle(title);
        inv.setLetterDate(letterDate);
        inv.setEventDate(eventDate);
        inv.setVenue(venue);
        inv.setPairingMode(pairingMode != null ? pairingMode : PairingMode.HEIM_GAST);
        inv.setBodyText(bodyText);
        inv.setGuestTeams(guestTeams != null ? guestTeams : List.of());
        inv.setGames(games != null ? games.stream().map(g -> {
            final InvitationGame x = new InvitationGame();
            x.setTime(g.time()); x.setTeamA(g.teamA()); x.setTeamB(g.teamB()); x.setUmp(g.ump());
            return x;
        }).toList() : List.of());
        inv.setContacts(contacts != null ? contacts.stream().map(c -> {
            final InvitationContact x = new InvitationContact();
            x.setRole(c.role()); x.setName(c.name()); x.setEmail(c.email()); x.setPhone(c.phone());
            return x;
        }).toList() : List.of());
        return inv;
    }
}
```

- [ ] **Step 2: Response DTO** `adapter/dto/InvitationResponse.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.Invitation;
import com.softball.domain.model.PairingMode;

import java.time.LocalDate;
import java.util.List;

public record InvitationResponse(
        Long id,
        String title,
        LocalDate letterDate,
        LocalDate eventDate,
        String venue,
        PairingMode pairingMode,
        String bodyText,
        List<String> guestTeams,
        List<GameDto> games,
        List<ContactDto> contacts) {

    public record GameDto(String time, String teamA, String teamB, String ump) {}
    public record ContactDto(String role, String name, String email, String phone) {}

    public static InvitationResponse from(final Invitation i) {
        return new InvitationResponse(
            i.getId(), i.getTitle(), i.getLetterDate(), i.getEventDate(), i.getVenue(),
            i.getPairingMode(), i.getBodyText(), i.getGuestTeams(),
            i.getGames().stream().map(g -> new GameDto(g.getTime(), g.getTeamA(), g.getTeamB(), g.getUmp())).toList(),
            i.getContacts().stream().map(c -> new ContactDto(c.getRole(), c.getName(), c.getEmail(), c.getPhone())).toList()
        );
    }
}
```

- [ ] **Step 3: Controller** `adapter/in/web/InvitationController.java`:
```java
package com.softball.adapter.in.web;

import com.softball.adapter.dto.InvitationRequest;
import com.softball.adapter.dto.InvitationResponse;
import com.softball.application.InvitationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invitations")
public class InvitationController {

    private final InvitationService service;

    public InvitationController(final InvitationService service) {
        this.service = service;
    }

    @GetMapping
    public List<InvitationResponse> getAll() {
        return service.findAll().stream().map(InvitationResponse::from).toList();
    }

    @GetMapping("/{id}")
    public InvitationResponse getById(@PathVariable final Long id) {
        return InvitationResponse.from(service.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationResponse create(@Valid @RequestBody final InvitationRequest request) {
        return InvitationResponse.from(service.create(request.toDomain()));
    }

    @PutMapping("/{id}")
    public InvitationResponse update(@PathVariable final Long id, @Valid @RequestBody final InvitationRequest request) {
        return InvitationResponse.from(service.update(id, request.toDomain()));
    }

    @PostMapping("/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationResponse duplicate(@PathVariable final Long id) {
        return InvitationResponse.from(service.duplicate(id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        service.delete(id);
    }
}
```

- [ ] **Step 4: Full backend test (Testcontainers, Docker running)** — `cd backend && ./mvnw test -s .mvn/local-settings.xml`. Expected: BUILD SUCCESS (existing + new test).
- [ ] **Step 5: Commit** — `git add backend/src/main/java/com/softball/adapter/dto backend/src/main/java/com/softball/adapter/in/web/InvitationController.java && git commit -m "✨ Invitation DTOs + REST-Controller"`

---

## Task 5: Frontend types + api client + hook

**Files:** modify `src/types/index.ts`, `src/api/client.ts`; create `src/hooks/useInvitations.ts`.

- [ ] **Step 1: Types** — append to `src/types/index.ts`:
```ts
export type PairingMode = 'HEIM_GAST' | 'TEAM_1_2'
export interface InvitationGame { time: string; teamA: string; teamB: string; ump: string }
export interface InvitationContact { role: string; name: string; email: string; phone: string }
export interface InvitationResponse {
  id: number
  title: string
  letterDate: string | null
  eventDate: string | null
  venue: string | null
  pairingMode: PairingMode
  bodyText: string | null
  guestTeams: string[]
  games: InvitationGame[]
  contacts: InvitationContact[]
}
export interface InvitationRequest {
  title: string
  letterDate: string | null
  eventDate: string | null
  venue: string | null
  pairingMode: PairingMode
  bodyText: string | null
  guestTeams: string[]
  games: InvitationGame[]
  contacts: InvitationContact[]
}
```

- [ ] **Step 2: API client** — append to `src/api/client.ts`:
```ts
export const getInvitations = () =>
  request<InvitationResponse[]>(`/invitations`)
export const getInvitation = (id: number) =>
  request<InvitationResponse>(`/invitations/${id}`)
export const createInvitation = (data: InvitationRequest) =>
  request<InvitationResponse>(`/invitations`, { method: 'POST', body: JSON.stringify(data) })
export const updateInvitation = (id: number, data: InvitationRequest) =>
  request<InvitationResponse>(`/invitations/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const duplicateInvitation = (id: number) =>
  request<InvitationResponse>(`/invitations/${id}/duplicate`, { method: 'POST' })
export const deleteInvitation = (id: number) =>
  request<void>(`/invitations/${id}`, { method: 'DELETE' })
```
Ensure `InvitationResponse`/`InvitationRequest` are imported from `@/types` at the top of client.ts (add to the existing type import).

- [ ] **Step 3: Hook** `src/hooks/useInvitations.ts` (mirror useSeasons):
```ts
import { useState, useEffect, useCallback } from 'react'
import type { InvitationResponse, InvitationRequest } from '@/types'
import * as api from '@/api/client'

export function useInvitations() {
  const [invitations, setInvitations] = useState<InvitationResponse[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setInvitations(await api.getInvitations()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (data: InvitationRequest) => {
    const inv = await api.createInvitation(data)
    setInvitations(prev => [inv, ...prev])
    return inv
  }
  const update = async (id: number, data: InvitationRequest) => {
    const inv = await api.updateInvitation(id, data)
    setInvitations(prev => prev.map(x => x.id === id ? inv : x))
    return inv
  }
  const duplicate = async (id: number) => {
    const inv = await api.duplicateInvitation(id)
    setInvitations(prev => [inv, ...prev])
    return inv
  }
  const remove = async (id: number) => {
    await api.deleteInvitation(id)
    setInvitations(prev => prev.filter(x => x.id !== id))
  }

  return { invitations, loading, create, update, duplicate, remove, reload: load }
}
```

- [ ] **Step 4: typecheck** — `cd frontend && npx tsc -b`. Expected: no errors.
- [ ] **Step 5: Commit** — `git add frontend/src/types/index.ts frontend/src/api/client.ts frontend/src/hooks/useInvitations.ts && git commit -m "✨ Invitation Frontend-Types + API + Hook"`

---

## Task 6: PDF generation

**Files:** create `src/utils/invitationPdf.ts`.

- [ ] **Step 1: Implement** `src/utils/invitationPdf.ts`:
```ts
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { InvitationResponse } from '@/types'

const OWN_TEAM = 'Dead Sox'

let cachedLogo: string | null = null
async function loadLogo(): Promise<string | null> {
  if (cachedLogo) return cachedLogo
  try {
    const res = await fetch('/deadsox.jpeg')
    const blob = await res.blob()
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
    return cachedLogo
  } catch { return null }
}

function deDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function deDateLong(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}
function joinTeams(teams: string[]): string {
  const t = teams.filter(Boolean)
  if (t.length <= 1) return t.join('')
  return `${t.slice(0, -1).join(', ')} und ${t[t.length - 1]}`
}

export async function generateInvitationPdf(inv: InvitationResponse): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const left = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Briefkopf
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0, 0, 0)
  doc.text('Düsseldorf Dead Sox', left, y); y += 5
  doc.text('Heinrich-Heine-Universität Düsseldorf', left, y); y += 5
  doc.text(`Düsseldorf, ${deDate(inv.letterDate)}`, left, y)

  const logo = await loadLogo()
  if (logo) doc.addImage(logo, 'JPEG', pageWidth - 20 - 22, 16, 22, 22)
  y += 14

  // Titel
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text('Einladung', left, y); y += 8
  doc.setFontSize(11)
  doc.text(`Zum ${inv.title} in Düsseldorf am Samstag, den ${deDate(inv.eventDate)}`, left, y); y += 9

  // Begrüßung + Intro
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  doc.text(`Hallo ${joinTeams(inv.guestTeams)},`, left, y); y += 7
  const intro = `wir laden euch herzlich zum ${inv.title} am ${deDateLong(inv.eventDate)} in Düsseldorf ein.`
  for (const line of doc.splitTextToSize(intro, pageWidth - 2 * left)) { doc.text(line, left, y); y += 6 }
  y += 3

  // Spielplan
  doc.setFont('helvetica', 'bold'); doc.text('Spielplan:', left, y); y += 2
  const colA = inv.pairingMode === 'TEAM_1_2' ? 'Team 1' : 'Heim'
  const colB = inv.pairingMode === 'TEAM_1_2' ? 'Team 2' : 'Gast'
  autoTable(doc, {
    startY: y + 2,
    margin: { left, right: left },
    head: [['', colA, colB, 'Ump']],
    body: inv.games.map(g => [g.time ?? '', g.teamA ?? '', g.teamB ?? '', g.ump ?? '']),
    theme: 'grid',
    headStyles: { fillColor: [19, 40, 74], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 22 } },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // Body-Text (Anfahrt + leibliches Wohl) — frei umbrochen
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  for (const para of (inv.bodyText ?? '').split('\n')) {
    if (para.trim() === '') { y += 3; continue }
    for (const line of doc.splitTextToSize(para, pageWidth - 2 * left)) { doc.text(line, left, y); y += 6 }
  }
  y += 4

  // Fixer Schluss
  doc.text('Wir freuen uns auf euch', left, y); y += 6
  doc.text('Eure Düsseldorf Dead Sox', left, y); y += 10

  // Kontakt
  doc.setFont('helvetica', 'bold'); doc.text('Kontakt', left, y); y += 6
  doc.setFont('helvetica', 'normal')
  for (const c of inv.contacts) {
    const parts = [c.name, c.email, c.phone].filter(Boolean).join(', ')
    doc.text(`${c.role ? c.role + ': ' : ''}${parts}`, left, y); y += 5
  }

  const year = inv.eventDate ? inv.eventDate.slice(0, 4) : ''
  const safeTitle = (inv.title || 'Einladung').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_')
  doc.save(`Einladung_${safeTitle}${year ? '_' + year : ''}.pdf`)
}
```

- [ ] **Step 2: typecheck** — `cd frontend && npx tsc -b`. Expected: no errors.
- [ ] **Step 3: Commit** — `git add frontend/src/utils/invitationPdf.ts && git commit -m "✨ Einladungs-PDF-Generierung (jsPDF)"`

---

## Task 7: Frontend nav + list page + editor

**Files:** modify `Layout.tsx`, `App.tsx`; create `InvitationListPage.tsx`, `InvitationEditor.tsx`, `GameScheduleEditor.tsx`, `ContactEditor.tsx`.

- [ ] **Step 1: Nav tab** — in `src/components/layout/Layout.tsx`, add to the `TABS` array (after `spielbogen`), using an existing lucide icon already imported or import `Mail`:
```tsx
  { path: '/orga', label: 'Orga', shortLabel: 'Orga', Icon: Mail },
```
Add `Mail` to the existing `lucide-react` import in that file if not present.

- [ ] **Step 2: Route** — in `src/App.tsx`, add inside the Layout children:
```tsx
      { path: '/orga', element: <InvitationListPage />, errorElement: <ChunkErrorBoundary /> },
```
and import at top: `import { InvitationListPage } from '@/components/orga/InvitationListPage'`.

- [ ] **Step 3: List page** `src/components/orga/InvitationListPage.tsx` — uses `useInvitations`. Shows:
  - Heading "Einladungen" + "Neu"-Button (opens editor with a blank draft).
  - For each invitation a card: `title` + `deDate(eventDate)`; row-hover actions (custom icons `Pencil`, `TrashBin` from `@/icons`): **Bearbeiten** (open editor), **Duplizieren** (`duplicate(id)`), **PDF** (`generateInvitationPdf(inv)` from `@/utils/invitationPdf`), **Löschen** (ConfirmModal then `remove(id)`).
  - Editor shown inline/drawer: render `<InvitationEditor invitation={draft|selected} onSave={...} onClose={...} />`.
  Empty state: CrossBones icon + "Noch keine Einladungen".
  Blank draft default:
```tsx
const blankDraft: InvitationRequest = {
  title: '', letterDate: new Date().toISOString().slice(0, 10), eventDate: null,
  venue: '', pairingMode: 'HEIM_GAST', guestTeams: ['', '', ''],
  games: [], contacts: [{ role: 'Trainer', name: '', email: '', phone: '' }, { role: 'Obfrau', name: '', email: '', phone: '' }],
  bodyText: DEFAULT_BODY,
}
```
  with module-level:
```tsx
const DEFAULT_BODY = `Anfahrt:
Das Turnier findet auf dem Gelände der Heinrich-Heine-Universität Düsseldorf statt. Am Besten parkt ihr auf dem Park & Ride Parkplatz an der Haltestelle Düsseldorf Südpark. Von da aus geht ihr an dem beschrankten Bahnübergang vorbei, den Fußweg an den Bahngleisen entlang. Ihr kommt dann "ins Grüne" und geht bei der ersten Möglichkeit rechts. Dann nur noch durch die Tür im Zaun und schon seid ihr auf unserem Platz.

Für das leibliche Wohl ist wie immer gesorgt.`
```

- [ ] **Step 4: Editor** `src/components/orga/InvitationEditor.tsx` — controlled form over `InvitationRequest`. Fields: `title` (text), `letterDate` + `eventDate` (date inputs), `venue` (text), `pairingMode` (select Heim/Gast ↔ Team 1/2), 3 `guestTeams` (3 text inputs), `bodyText` (textarea, ~8 rows). Renders `<GameScheduleEditor games teams onChange />` (teams = `['Dead Sox', ...guestTeams.filter(Boolean)]`) and `<ContactEditor contacts onChange />`. Footer: "Abbrechen" + "Speichern" → calls `onSave(request)` (parent does create vs update by presence of id). Use app form styling (cream inputs, navy buttons, dark-navy hover).

- [ ] **Step 5: Schedule editor** `src/components/orga/GameScheduleEditor.tsx` — props `{ games: InvitationGame[]; teams: string[]; onChange: (g: InvitationGame[]) => void }`. Table-ish rows: `time` (text e.g. "10:00"), `teamA`/`teamB`/`ump` (selects from `teams`, plus empty option), trash to remove row, "+ Spiel" to append `{ time:'', teamA:'', teamB:'', ump:'' }`. No sorting needed beyond array order; provide up/down optional (YAGNI: skip).

- [ ] **Step 6: Contact editor** `src/components/orga/ContactEditor.tsx` — props `{ contacts: InvitationContact[]; onChange }`. Rows: `role`, `name`, `email`, `phone` text inputs + trash; "+ Kontakt" appends blank.

- [ ] **Step 7: typecheck + lint + build** — `cd frontend && npx tsc -b && npm run lint && npm run build`. Expected: no errors; pre-existing warnings only.
- [ ] **Step 8: Commit** — `git add frontend/src/components/orga frontend/src/components/layout/Layout.tsx frontend/src/App.tsx && git commit -m "✨ Orga: Einladungs-Liste + Editor + Spielplan/Kontakt-Editor"`

---

## Task 8: Full verification

- [ ] **Step 1: Backend** — `cd backend && ./mvnw test -s .mvn/local-settings.xml` → BUILD SUCCESS.
- [ ] **Step 2: Frontend** — `cd frontend && npx tsc -b && npm run lint && npm run build && npx vitest run` → all green.
- [ ] **Step 3: Manual smoke** (db+backend+frontend): Orga-Tab → Neu → Indoor-Einladung (Titel, Daten, Ort, 3 Gäste, Spielplan-Zeilen mit Ump, Kontakte) → Speichern → PDF generieren → mit `Einladung Indoor Series 2026-6.pdf` vergleichen. Dann Cose anlegen (pairingMode HEIM_GAST), duplizieren, Datum ändern, PDF.
- [ ] **Step 4: Final commit** (falls Smoke Anpassungen brachte) — `git add -A && git commit -m "💄 Einladungs-Generator: Feinschliff nach Smoke-Test"`

---

## Notes for the implementer

- **JSONB:** `guest_teams`/`games`/`contacts` als JSONB-Strings im Entity, Jackson-Mapping im `InvitationMapper` (mirror `TrainingPlanMapper`). Domain hält echte Listen.
- **Kein DH-/ownTeam-Eintrag** gespeichert — „Dead Sox" ist Konstante (`OWN_TEAM` im PDF, und im Editor den Teams-Dropdown vorangestellt).
- **PDF:** Logo `/deadsox.jpeg` via fetch→dataURL, `addImage(..., 'JPEG', ...)`. jsPDF + jspdf-autotable sind bereits Dependencies.
- **Konventionen:** deutsche Labels, Modals statt confirm(), Hover-Reveal für Edit/Delete, dark-navy Hover auf Sekundär-Buttons, Custom-SVG-Icons aus `@/icons`.
- **Datum:** ISO-Strings (`yyyy-mm-dd`) zwischen FE/BE; PDF formatiert nach de-DE.
