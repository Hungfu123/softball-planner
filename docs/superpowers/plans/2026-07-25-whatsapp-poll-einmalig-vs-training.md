# WhatsApp-Umfrage einmalig/Nachricht vs. Trainingsumfrage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Haken „Trainingsumfrage" schaltet eine WhatsApp-Umfrage/Nachricht zwischen wiederkehrend-trainingsgekoppelt und einmalig-geplant um; die UI zeigt den echten Versandtag.

**Architecture:** Onion/Hexagonal wie im Repo. Domain-Modell `WhatsappPoll` bekommt `trainingCoupled` + `sendDate`, `weekday` wird optional. Scheduler verzweigt je Modus. Frontend schaltet Felder um und zeigt einen Live-Versand-Hinweis via reinem Helfer (spiegelt `CoupledPollTargetResolver`, nur Anzeige). Anwesenheits-Sync unverändert.

**Tech Stack:** Java 21 / Spring Boot 3.4 / Spring Data JPA / Flyway / Testcontainers (Backend); React 19 / TypeScript / Vitest / Testing-Library (Frontend).

## Global Constraints

- Backend-Tests: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml` (Docker-Daemon nötig für Testcontainers).
- Maven immer mit `-s .mvn/local-settings.xml` (Firmen-Nexus in `~/.m2` nicht anfassen).
- Neue Schemaänderung MUSS als `V52__*.sql` unter `backend/src/main/resources/db/migration/` (ddl-auto=validate).
- Keine `Co-Authored-By`-Zeilen in Commits. Gitmoji-Prefix (`✨ 🐛 🎨 ✅ 🔧`).
- Frontend-Build/Typecheck: `cd frontend && npm run build`. FE-Tests: `npm run test`.
- German UI durchgehend.
- Kein `git add -A` — nur gezielt per Pfad stagen.
- Fachlogik im Backend; der FE-Versand-Helfer ist reine Anzeige.

---

### Task 1: Domain-Modell + DTOs (Felder `trainingCoupled`, `sendDate`)

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/WhatsappPoll.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/WhatsappPollRequest.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/WhatsappPollResponse.java`
- Test: `backend/src/test/java/com/softball/adapter/dto/WhatsappPollDtoMappingTest.java` (neu)

**Interfaces:**
- Produces: `WhatsappPoll.isTrainingCoupled()/setTrainingCoupled(boolean)`, `WhatsappPoll.getSendDate()/setSendDate(LocalDate)`; `WhatsappPollRequest`-Record mit zusätzlichen Komponenten `boolean trainingCoupled, LocalDate sendDate` und nullbarem `DayOfWeek weekday`; `WhatsappPollResponse` mit `boolean trainingCoupled, LocalDate sendDate`.

- [ ] **Step 1: Failing test — DTO round-trips new fields**

Create `backend/src/test/java/com/softball/adapter/dto/WhatsappPollDtoMappingTest.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.WhatsappPoll;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WhatsappPollDtoMappingTest {

    @Test
    void request_toDomain_mapsOneOffFields() {
        final WhatsappPollRequest req = new WhatsappPollRequest(
                "g@g.us", "Gruppe", "Titel", List.of("Ja", "Nein"),
                null, LocalTime.of(18, 0), true, false, null,
                false, LocalDate.of(2026, 8, 5));
        final WhatsappPoll p = req.toDomain();
        assertThat(p.isTrainingCoupled()).isFalse();
        assertThat(p.getSendDate()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(p.getWeekday()).isNull();
    }

    @Test
    void response_from_exposesCoupledFields() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setTrainingCoupled(true);
        p.setWeekday(DayOfWeek.MONDAY);
        p.setTime(LocalTime.of(9, 0));
        final WhatsappPollResponse r = WhatsappPollResponse.from(p);
        assertThat(r.trainingCoupled()).isTrue();
        assertThat(r.sendDate()).isNull();
        assertThat(r.weekday()).isEqualTo(DayOfWeek.MONDAY);
    }
}
```

- [ ] **Step 2: Run test — verify compile failure**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollDtoMappingTest`
Expected: FAIL — compile error (constructor arity / missing methods).

- [ ] **Step 3: Add domain fields**

In `WhatsappPoll.java`, after the `lastSentTrainingId` field declaration add:
```java
    private boolean trainingCoupled = false;
    private LocalDate sendDate;
```
After the `getLastSentTrainingId`/`setLastSentTrainingId` accessors add:
```java
    public boolean isTrainingCoupled() { return trainingCoupled; }
    public void setTrainingCoupled(final boolean v) { this.trainingCoupled = v; }
    public LocalDate getSendDate() { return sendDate; }
    public void setSendDate(final LocalDate v) { this.sendDate = v; }
```
(`LocalDate` is already imported.)

- [ ] **Step 4: Extend request DTO**

In `WhatsappPollRequest.java`: add `import java.time.LocalDate;`. Change the record header — remove `@NotNull` from `weekday` and append the two components:
```java
public record WhatsappPollRequest(
        @NotBlank String groupId,
        String groupName,
        String title,
        @NotNull List<String> options,
        DayOfWeek weekday,
        @NotNull LocalTime time,
        boolean enabled,
        boolean allowMultipleAnswers,
        String message,
        boolean trainingCoupled,
        LocalDate sendDate) {
```
In `toDomain()`, before `return p;` add:
```java
        p.setTrainingCoupled(trainingCoupled);
        p.setSendDate(sendDate);
```

- [ ] **Step 5: Extend response DTO**

In `WhatsappPollResponse.java`, append two components after `lastSentAt`:
```java
        LocalDateTime lastSentAt,
        boolean trainingCoupled,
        LocalDate sendDate) {
```
Update `from(...)` last argument list:
```java
        return new WhatsappPollResponse(p.getId(), p.getGroupId(), p.getGroupName(), p.getTitle(),
                p.getOptions(), p.getWeekday(), p.getTime(), p.isEnabled(),
                p.isAllowMultipleAnswers(), p.getMessage(), p.getSkipDates(), p.getLastSentAt(),
                p.isTrainingCoupled(), p.getSendDate());
```

- [ ] **Step 6: Run test — verify pass**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollDtoMappingTest`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**
```bash
git add backend/src/main/java/com/softball/domain/model/WhatsappPoll.java backend/src/main/java/com/softball/adapter/dto/WhatsappPollRequest.java backend/src/main/java/com/softball/adapter/dto/WhatsappPollResponse.java backend/src/test/java/com/softball/adapter/dto/WhatsappPollDtoMappingTest.java
git commit -m "✨ WhatsappPoll-Domain+DTOs: trainingCoupled + sendDate, weekday optional"
```

---

### Task 2: Persistenz (Entity, Flyway V52, Mapper)

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/WhatsappPollEntity.java`
- Create: `backend/src/main/resources/db/migration/V52__whatsapp_poll_one_off.sql`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapper.java`
- Test: `backend/src/test/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapperTest.java` (neu)

**Interfaces:**
- Consumes: `WhatsappPoll` getters/setters from Task 1.
- Produces: `WhatsappPollEntity.isTrainingCoupled()/setTrainingCoupled`, `getSendDate()/setSendDate`; DB-Spalten `training_coupled`, `send_date`, `weekday` nullable.

- [ ] **Step 1: Failing test — mapper round-trips both modes**

Create `backend/src/test/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapperTest.java`:
```java
package com.softball.adapter.out.persistence.mapper;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.WhatsappPollEntity;
import com.softball.domain.model.WhatsappPoll;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WhatsappPollMapperTest {

    private final WhatsappPollMapper mapper = new WhatsappPollMapper(new ObjectMapper());

    @Test
    void roundTrip_oneOff() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId("g@g.us");
        p.setTitle("Titel");
        p.setOptions(List.of("Ja", "Nein"));
        p.setTime(LocalTime.of(18, 0));
        p.setTrainingCoupled(false);
        p.setSendDate(LocalDate.of(2026, 8, 5));

        final WhatsappPollEntity e = mapper.toEntity(p);
        assertThat(e.isTrainingCoupled()).isFalse();
        assertThat(e.getSendDate()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(e.getWeekday()).isNull();

        final WhatsappPoll back = mapper.toDomain(e);
        assertThat(back.isTrainingCoupled()).isFalse();
        assertThat(back.getSendDate()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(back.getWeekday()).isNull();
    }

    @Test
    void roundTrip_coupled() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId("g@g.us");
        p.setTitle("Titel");
        p.setOptions(List.of("Ja", "Nein"));
        p.setTime(LocalTime.of(9, 0));
        p.setTrainingCoupled(true);
        p.setWeekday(DayOfWeek.MONDAY);

        final WhatsappPoll back = mapper.toDomain(mapper.toEntity(p));
        assertThat(back.isTrainingCoupled()).isTrue();
        assertThat(back.getWeekday()).isEqualTo(DayOfWeek.MONDAY);
        assertThat(back.getSendDate()).isNull();
    }
}
```

- [ ] **Step 2: Run test — verify fail**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollMapperTest`
Expected: FAIL — compile error (missing entity methods).

- [ ] **Step 3: Extend entity**

In `WhatsappPollEntity.java`: change the `weekday` column to nullable and add two fields. Replace:
```java
    @Column(nullable = false, length = 10)
    private String weekday;
```
with:
```java
    @Column(length = 10)
    private String weekday;
```
After the `lastSentTrainingId` field add:
```java
    @Column(name = "training_coupled", nullable = false)
    private boolean trainingCoupled = false;

    @Column(name = "send_date")
    private java.time.LocalDate sendDate;
```
After the `getLastSentTrainingId`/`setLastSentTrainingId` accessors add:
```java
    public boolean isTrainingCoupled() { return trainingCoupled; }
    public void setTrainingCoupled(final boolean v) { this.trainingCoupled = v; }
    public java.time.LocalDate getSendDate() { return sendDate; }
    public void setSendDate(final java.time.LocalDate v) { this.sendDate = v; }
```

- [ ] **Step 4: Create Flyway migration**

Create `backend/src/main/resources/db/migration/V52__whatsapp_poll_one_off.sql`:
```sql
-- Umfrage kann jetzt einmalig (nicht trainingsgekoppelt) sein.
-- Bestehende Zeilen sind alle Trainings-Polls -> training_coupled = true (via DEFAULT).
ALTER TABLE whatsapp_polls ADD COLUMN training_coupled boolean NOT NULL DEFAULT true;
ALTER TABLE whatsapp_polls ADD COLUMN send_date date;
ALTER TABLE whatsapp_polls ALTER COLUMN weekday DROP NOT NULL;
-- DEFAULT nur zum Backfill; neue Zeilen setzen den Wert explizit.
ALTER TABLE whatsapp_polls ALTER COLUMN training_coupled DROP DEFAULT;
```

- [ ] **Step 5: Extend mapper**

In `WhatsappPollMapper.java` `toDomain(...)`, before `return p;` add:
```java
        p.setTrainingCoupled(e.isTrainingCoupled());
        p.setSendDate(e.getSendDate());
```
In `applyScalars(...)`, before the method closes add:
```java
        e.setTrainingCoupled(p.isTrainingCoupled());
        e.setSendDate(p.getSendDate());
```

- [ ] **Step 6: Run mapper test + a context-boot IT (Flyway + Hibernate validate)**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollMapperTest,TrainingRepositoryAdapterLazyIT`
Expected: PASS. The IT boots the full Spring context → Flyway applies V52 and Hibernate validates the entity against the new schema (catches column/nullability mismatches).

- [ ] **Step 7: Commit**
```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/entity/WhatsappPollEntity.java backend/src/main/resources/db/migration/V52__whatsapp_poll_one_off.sql backend/src/main/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapper.java backend/src/test/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapperTest.java
git commit -m "✨ WhatsappPoll-Persistenz: training_coupled + send_date (V52), weekday nullable"
```

---

### Task 3: Service — bedingte Validierung, `update`-Felder, `sendNow` nur coupled

**Files:**
- Modify: `backend/src/main/java/com/softball/application/WhatsappPollService.java`
- Test: `backend/src/test/java/com/softball/application/WhatsappPollServiceTest.java`

**Interfaces:**
- Consumes: `WhatsappPoll.isTrainingCoupled/getSendDate/setSendDate/setWeekday`.
- Produces: `create`/`update` akzeptieren beide Modi; `validate` erzwingt bedingte Pflichtfelder; `sendNow` löst Training nur bei `trainingCoupled` auf.

- [ ] **Step 1: Failing tests — conditional validation**

Add to `WhatsappPollServiceTest.java` (match the existing constructor/mocking style used there; the service ctor is `new WhatsappPollService(repository, sender, trainingRepo, resolver, clock)`):
```java
    @Test
    void create_coupledWithoutWeekday_throws() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId("g@g.us");
        p.setTitle("T");
        p.setOptions(java.util.List.of("Ja", "Nein"));
        p.setTime(java.time.LocalTime.of(9, 0));
        p.setTrainingCoupled(true);
        p.setWeekday(null);
        org.junit.jupiter.api.Assertions.assertThrows(
                com.softball.shared.exception.BusinessValidationException.class,
                () -> service.create(p));
    }

    @Test
    void create_oneOffWithoutSendDate_throws() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId("g@g.us");
        p.setTitle("T");
        p.setOptions(java.util.List.of("Ja", "Nein"));
        p.setTime(java.time.LocalTime.of(9, 0));
        p.setTrainingCoupled(false);
        p.setSendDate(null);
        org.junit.jupiter.api.Assertions.assertThrows(
                com.softball.shared.exception.BusinessValidationException.class,
                () -> service.create(p));
    }

    @Test
    void create_oneOff_clearsWeekday() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId("g@g.us");
        p.setTitle("T");
        p.setOptions(java.util.List.of("Ja", "Nein"));
        p.setTime(java.time.LocalTime.of(9, 0));
        p.setTrainingCoupled(false);
        p.setSendDate(java.time.LocalDate.of(2026, 8, 5));
        p.setWeekday(java.time.DayOfWeek.MONDAY);
        org.mockito.Mockito.when(repository.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(i -> i.getArgument(0));
        final WhatsappPoll saved = service.create(p);
        org.junit.jupiter.api.Assertions.assertNull(saved.getWeekday());
    }
```
> Note: if the existing test file names the repository mock differently than `repository`, use that name. Inspect the top of the file first.

- [ ] **Step 2: Run — verify fail**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollServiceTest`
Expected: FAIL — the three new tests fail (validation not yet conditional / weekday not cleared).

- [ ] **Step 3: Rewrite `validate(...)`**

Replace the `validate` method's first weekday/time guard. Change:
```java
        if (p.getWeekday() == null || p.getTime() == null) {
            throw new BusinessValidationException("Wochentag und Uhrzeit müssen gesetzt sein");
        }
```
to:
```java
        if (p.getTime() == null) {
            throw new BusinessValidationException("Uhrzeit muss gesetzt sein");
        }
        if (p.isTrainingCoupled()) {
            if (p.getWeekday() == null) {
                throw new BusinessValidationException("Trainingstag muss gesetzt sein");
            }
            p.setSendDate(null);
        } else {
            if (p.getSendDate() == null) {
                throw new BusinessValidationException("Datum muss gesetzt sein");
            }
            p.setWeekday(null);
        }
```
(Rest of `validate` — options/message/title checks — unchanged.)

- [ ] **Step 4: Copy new fields in `update(...)`**

In `update(...)`, after `existing.setMessage(incoming.getMessage());` add:
```java
        existing.setTrainingCoupled(incoming.isTrainingCoupled());
        existing.setSendDate(incoming.getSendDate());
```

- [ ] **Step 5: Guard training-resolution in `sendNow(...)`**

In `sendNow(...)`, replace the block:
```java
        final LocalDate today = LocalDate.now(clock);
        final Optional<Training> target = resolver.resolve(trainingRepo.findAllByOrderByDateDesc(),
                p.getWeekday(), p.getSkipDates(), today);
        target.ifPresent(t -> p.setLastSentTrainingId(t.getId()));
```
with:
```java
        // Nur Trainingsumfragen ans nächste Training koppeln (für Vote-Sync-Zuordnung).
        if (p.isTrainingCoupled()) {
            final LocalDate today = LocalDate.now(clock);
            resolver.resolve(trainingRepo.findAllByOrderByDateDesc(), p.getWeekday(), p.getSkipDates(), today)
                    .ifPresent(t -> p.setLastSentTrainingId(t.getId()));
        }
```

- [ ] **Step 6: Run — verify pass**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollServiceTest`
Expected: PASS (existing + 3 new).

- [ ] **Step 7: Commit**
```bash
git add backend/src/main/java/com/softball/application/WhatsappPollService.java backend/src/test/java/com/softball/application/WhatsappPollServiceTest.java
git commit -m "✨ WhatsappPollService: bedingte Validierung coupled/einmalig + sendNow nur coupled"
```

---

### Task 4: `PollDueEvaluator.isDueOneOff`

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/service/PollDueEvaluator.java`
- Test: `backend/src/test/java/com/softball/domain/service/PollDueEvaluatorTest.java`

**Interfaces:**
- Produces: `boolean isDueOneOff(WhatsappPoll poll, LocalDateTime now)`.

- [ ] **Step 1: Failing tests**

Add to `PollDueEvaluatorTest.java`:
```java
    @Test
    void oneOff_dueAtSendDateAndTime() {
        final PollDueEvaluator ev = new PollDueEvaluator();
        final WhatsappPoll p = new WhatsappPoll();
        p.setEnabled(true);
        p.setTrainingCoupled(false);
        p.setSendDate(java.time.LocalDate.of(2026, 8, 5));
        p.setTime(java.time.LocalTime.of(10, 25));
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 5, 10, 25))).isTrue();
    }

    @Test
    void oneOff_notDueOnceSent() {
        final PollDueEvaluator ev = new PollDueEvaluator();
        final WhatsappPoll p = new WhatsappPoll();
        p.setEnabled(true);
        p.setTrainingCoupled(false);
        p.setSendDate(java.time.LocalDate.of(2026, 8, 5));
        p.setTime(java.time.LocalTime.of(10, 25));
        p.setLastSentAt(java.time.LocalDateTime.of(2026, 8, 5, 10, 25));
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 5, 10, 25))).isFalse();
    }

    @Test
    void oneOff_notDueWrongMinute() {
        final PollDueEvaluator ev = new PollDueEvaluator();
        final WhatsappPoll p = new WhatsappPoll();
        p.setEnabled(true);
        p.setTrainingCoupled(false);
        p.setSendDate(java.time.LocalDate.of(2026, 8, 5));
        p.setTime(java.time.LocalTime.of(10, 25));
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 5, 10, 26))).isFalse();
    }
```
(`assertThat` static import already present in this test file.)

- [ ] **Step 2: Run — verify fail**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml -Dtest=PollDueEvaluatorTest`
Expected: FAIL — `isDueOneOff` undefined.

- [ ] **Step 3: Implement**

In `PollDueEvaluator.java`, add a method after `isDue`:
```java
    /** Einmalig: genau am sendDate zur Uhrzeit fällig, solange noch nie gesendet. */
    public boolean isDueOneOff(final WhatsappPoll poll, final LocalDateTime now) {
        if (poll == null || !poll.isEnabled() || poll.getSendDate() == null || poll.getTime() == null) return false;
        if (poll.getLastSentAt() != null) return false;
        if (!now.toLocalDate().equals(poll.getSendDate())) return false;
        return now.getHour() == poll.getTime().getHour() && now.getMinute() == poll.getTime().getMinute();
    }
```

- [ ] **Step 4: Run — verify pass**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml -Dtest=PollDueEvaluatorTest`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/src/main/java/com/softball/domain/service/PollDueEvaluator.java backend/src/test/java/com/softball/domain/service/PollDueEvaluatorTest.java
git commit -m "✨ PollDueEvaluator.isDueOneOff für einmalige Polls"
```

---

### Task 5: Scheduler verzweigt coupled/einmalig

**Files:**
- Modify: `backend/src/main/java/com/softball/application/WhatsappPollScheduler.java`
- Test: `backend/src/test/java/com/softball/application/WhatsappPollSchedulerTest.java`

**Interfaces:**
- Consumes: `PollDueEvaluator.isDueOneOff`, `WhatsappPoll.isTrainingCoupled`.

- [ ] **Step 1: Failing tests — one-off path**

Add to `WhatsappPollSchedulerTest.java`:
```java
    private WhatsappPoll oneOffDue() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(9L);
        p.setGroupId("g@g.us");
        p.setTitle("Einmalig");
        p.setOptions(List.of("Ja", "Nein"));
        p.setTrainingCoupled(false);
        p.setSendDate(LocalDate.of(2026, 8, 5));
        p.setTime(LocalTime.of(10, 25));
        p.setEnabled(true);
        return p;
    }

    @Test
    void tick_sendsDueOneOff_withoutTrainingId() {
        final WhatsappPoll poll = oneOffDue();
        when(repo.findAll()).thenReturn(List.of(poll));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of());
        when(sender.sendPoll(any(), any(), anyList(), anyBoolean(), any())).thenReturn("msg-1");

        scheduler.tick(LocalDateTime.of(2026, 8, 5, 10, 25));

        verify(sender).sendPoll(eq("g@g.us"), eq("Einmalig"), anyList(), anyBoolean(), any());
        assertThat(poll.getLastSentMessageId()).isEqualTo("msg-1");
        assertThat(poll.getLastSentTrainingId()).isNull();
    }

    @Test
    void tick_oneOffNotResentAfterSent() {
        final WhatsappPoll poll = oneOffDue();
        poll.setLastSentAt(LocalDateTime.of(2026, 8, 5, 10, 25));
        when(repo.findAll()).thenReturn(List.of(poll));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of());

        scheduler.tick(LocalDateTime.of(2026, 8, 5, 10, 25));

        verify(sender, never()).sendPoll(any(), any(), anyList(), anyBoolean(), any());
    }
```
(`LocalDate` import: add `import java.time.LocalDate;` to the test if absent.)

- [ ] **Step 2: Run — verify fail**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollSchedulerTest`
Expected: FAIL — one-off poll not sent (current tick only handles coupled).

- [ ] **Step 3: Rewrite `tick(...)` with a branch + shared send**

Replace the body of `tick(...)` with:
```java
    public void tick(final LocalDateTime now) {
        final List<Training> trainings = trainingRepo.findAllByOrderByDateDesc();
        for (final WhatsappPoll poll : repository.findAll()) {
            if (poll.isTrainingCoupled()) {
                final Optional<Training> target = resolver.resolve(trainings, poll.getWeekday(), poll.getSkipDates(), now.toLocalDate());
                if (target.isEmpty() || !evaluator.isDue(poll, target.get(), now)) continue;
                send(poll, now, target.get().getId());
            } else {
                if (!evaluator.isDueOneOff(poll, now)) continue;
                send(poll, now, null);
            }
        }
    }

    private void send(final WhatsappPoll poll, final LocalDateTime now, final Long trainingId) {
        try {
            final String messageId = sender.sendPoll(poll.getGroupId(), poll.getTitle(), poll.getOptions(),
                    poll.isAllowMultipleAnswers(), poll.getMessage());
            poll.setLastSentAt(now);
            poll.setLastSentMessageId(messageId);
            poll.setLastSentTrainingId(trainingId);
            repository.save(poll);
            log.info("WhatsApp-Poll gesendet: {} ({}) -> {}", poll.getTitle(), poll.getId(),
                    trainingId != null ? "Training " + trainingId : "einmalig");
        } catch (final Exception e) {
            log.warn("WhatsApp-Poll fehlgeschlagen: {} ({}): {}", poll.getTitle(), poll.getId(), e.getMessage());
        }
    }
```

- [ ] **Step 4: Run — verify pass (incl. existing coupled tests)**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollSchedulerTest`
Expected: PASS (existing coupled tests + 2 new one-off tests).

- [ ] **Step 5: Commit**
```bash
git add backend/src/main/java/com/softball/application/WhatsappPollScheduler.java backend/src/test/java/com/softball/application/WhatsappPollSchedulerTest.java
git commit -m "✨ WhatsappPollScheduler: einmalige Polls senden (Zweig coupled/one-off)"
```

---

### Task 6: Frontend Types + Hook (Trainings laden, Felder)

**Files:**
- Modify: `frontend/src/types/index.ts:758` (WhatsappPollResponse) und `:773` (WhatsappPollRequest)
- Modify: `frontend/src/hooks/useWhatsappPoll.ts`

**Interfaces:**
- Consumes: `getTrainings()` from `@/api/client` (exists: `request<TrainingResponse[]>('/trainings')`).
- Produces: `WhatsappPollResponse.weekday: Weekday | null`, `.trainingCoupled: boolean`, `.sendDate: string | null`; same on request. Hook returns additional `trainings: TrainingResponse[]`.

- [ ] **Step 1: Update types**

In `frontend/src/types/index.ts`, `WhatsappPollResponse`: change `weekday: Weekday` → `weekday: Weekday | null`, and add after `time`:
```ts
  trainingCoupled: boolean
  sendDate: string | null // ISO "2026-08-05" oder null (nur einmalig)
```
`WhatsappPollRequest`: change `weekday: Weekday` → `weekday: Weekday | null`, add after `time`:
```ts
  trainingCoupled: boolean
  sendDate: string | null
```

- [ ] **Step 2: Load trainings in the hook**

In `useWhatsappPoll.ts`: extend the type import line to include `TrainingResponse`:
```ts
import type { WhatsappPollResponse, WhatsappAccountStatus, WhatsappGroup, WhatsappPollRequest, TrainingResponse } from '@/types'
```
Add state after `groups`:
```ts
  const [trainings, setTrainings] = useState<TrainingResponse[]>([])
```
In `load`, extend the Promise.all and set trainings:
```ts
      const [s, p, t] = await Promise.all([api.getWhatsappStatus(), api.getWhatsappPolls(), api.getTrainings()])
      setStatus(s)
      setPolls(p)
      setTrainings(t)
```
Add `trainings` to the returned object:
```ts
  return {
    polls, status, groups, trainings, loading, error, reload,
    createPoll, updatePoll, deletePoll, sendNow, addSkipDate, removeSkipDate, resetSent,
  }
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npm run build`
Expected: tsc reports errors in `WhatsappPollPage.tsx` (missing `trainingCoupled`/`sendDate` in `blankDraft`/`toRequest`, and `weekday` now nullable). That is expected — fixed in Task 7/8. To keep this task green on its own, temporarily add the fields in `blankDraft`/`toRequest` (finalized in Task 8):
- In `blankDraft`, add `trainingCoupled: false,` and `sendDate: null,` to the returned object.
- In `toRequest`, add `trainingCoupled: p.trainingCoupled,` and `sendDate: p.sendDate,`.
- `weekday` ist jetzt nullbar → `weekdayShort` null-sicher machen. Ändere die Signatur:
  ```ts
  const weekdayShort = (w: Weekday | null) => (w ? WEEKDAYS.find(d => d.value === w)?.short ?? w : '')
  ```
  (Die Meta-Badge-Zeile in `PollCard` wird in Task 9 modusabhängig; hier reicht die Null-Sicherheit für den grünen Build.)

Re-run: `cd frontend && npm run build`
Expected: PASS (build succeeds).

- [ ] **Step 4: Commit**
```bash
git add frontend/src/types/index.ts frontend/src/hooks/useWhatsappPoll.ts frontend/src/components/orga/WhatsappPollPage.tsx
git commit -m "✨ FE-Types+Hook: trainingCoupled/sendDate, Trainings laden"
```

---

### Task 7: Versand-Vorschau-Helfer (ersetzt fehlerhaftes `nextSend`)

**Files:**
- Create: `frontend/src/components/orga/pollSchedule.ts`
- Create: `frontend/src/components/orga/pollSchedule.test.ts`
- Modify: `frontend/src/components/orga/WhatsappPollPage.tsx` (nutzt Helfer statt lokalem `nextSend`)

**Interfaces:**
- Produces:
  - `nextTrainingOn(weekday: Weekday, trainings: TrainingLite[], skipDates: string[], today: Date): Date | null`
  - `coupledSendDate(weekday: Weekday, timeHHmm: string, trainings: TrainingLite[], skipDates: string[], today: Date): Date | null`
  - `type TrainingLite = { date: string; cancelled: boolean }`

- [ ] **Step 1: Failing test**

Create `frontend/src/components/orga/pollSchedule.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { nextTrainingOn, coupledSendDate } from './pollSchedule'

const trainings = [
  { date: '2026-07-27', cancelled: false }, // Montag
  { date: '2026-08-01', cancelled: false }, // Samstag
  { date: '2026-08-03', cancelled: false }, // Montag
]

describe('pollSchedule', () => {
  it('findet nächstes Training am Wochentag', () => {
    const today = new Date(2026, 6, 25) // 25.07.2026 (Sa)
    const d = nextTrainingOn('MONDAY', trainings, [], today)
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(6) // Juli
    expect(d?.getDate()).toBe(27)
  })

  it('Versand = Vortag des Trainings zur Uhrzeit', () => {
    const today = new Date(2026, 6, 25)
    const d = coupledSendDate('MONDAY', '09:00', trainings, [], today)
    expect(d?.getDate()).toBe(26) // Sonntag, Vortag
    expect(d?.getHours()).toBe(9)
  })

  it('kein Training am Wochentag -> null', () => {
    const today = new Date(2026, 6, 25)
    expect(coupledSendDate('WEDNESDAY', '09:00', trainings, [], today)).toBeNull()
  })

  it('überspringt abgesagte + skipDates', () => {
    const today = new Date(2026, 6, 25)
    const withCancel = [{ date: '2026-07-27', cancelled: true }, ...trainings.slice(1)]
    const d = nextTrainingOn('MONDAY', withCancel, [], today)
    expect(d?.getDate()).toBe(3) // 03.08. statt 27.07.
  })
})
```

- [ ] **Step 2: Run — verify fail**

Run: `cd frontend && npm run test -- pollSchedule`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helper**

Create `frontend/src/components/orga/pollSchedule.ts`:
```ts
import type { Weekday } from '@/types'

export type TrainingLite = { date: string; cancelled: boolean }

const WEEKDAY_JS: Record<Weekday, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
}

/** Nächstes gültiges Training am Wochentag: nicht abgesagt, Datum >= heute, nicht in skipDates. */
export function nextTrainingOn(
  weekday: Weekday, trainings: TrainingLite[], skipDates: string[], today: Date,
): Date | null {
  const target = WEEKDAY_JS[weekday]
  const skip = new Set(skipDates)
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const hits = trainings
    .filter(t => !t.cancelled && !skip.has(t.date))
    .map(t => new Date(t.date + 'T00:00:00'))
    .filter(d => d.getDay() === target && d >= todayMid)
    .sort((a, b) => a.getTime() - b.getTime())
  return hits.length ? hits[0] : null
}

/** Versandzeitpunkt einer Trainingsumfrage = Vortag des nächsten Trainings zur Uhrzeit. null = kein Training. */
export function coupledSendDate(
  weekday: Weekday, timeHHmm: string, trainings: TrainingLite[], skipDates: string[], today: Date,
): Date | null {
  const t = nextTrainingOn(weekday, trainings, skipDates, today)
  if (!t) return null
  const [h, m] = timeHHmm.split(':').map(Number)
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1, h, m, 0, 0)
}
```

- [ ] **Step 4: Run — verify pass**

Run: `cd frontend && npm run test -- pollSchedule`
Expected: PASS (4 tests).

- [ ] **Step 5: Rewire the card to the helper**

In `WhatsappPollPage.tsx`: remove **only** the local `WEEKDAY_JS` const, the `nextSend` function, and the old `formatNextSend` function. **KEEP** `WEEKDAY_ORDER` und `byWeekdayTime` (Sortierung der Liste) sowie `isSentToday` (weiter in `PollCard` genutzt). Add import at top:
```ts
import { coupledSendDate, type TrainingLite } from './pollSchedule'
```
Add a new formatter that takes trainings:
```ts
function formatNextSend(poll: WhatsappPollResponse, trainings: TrainingLite[]): string {
  if (poll.trainingCoupled) {
    if (!poll.enabled) return 'Pausiert'
    if (!poll.weekday) return 'Kein Trainingstag'
    const d = coupledSendDate(poll.weekday, formatTime(poll.time), trainings, poll.skipDates, new Date())
    if (!d) return 'Pausiert — kein Training'
    return `${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  }
  // Einmalig
  if (poll.lastSentAt) return 'Gesendet'
  if (!poll.sendDate) return 'Kein Datum'
  const d = new Date(poll.sendDate + 'T' + formatTime(poll.time))
  return `${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
}
```
Thread `trainings` from the page into `PollCard` (add `trainings` to `PollCardProps` and pass `trainings={trainings}` in the `.map`), and change the card's call to `formatNextSend(poll, trainings)`. Get `trainings` from the hook in `WhatsappPollPage`:
```ts
  const { polls, status, groups, trainings, loading, error, reload,
    createPoll, updatePoll, deletePoll, sendNow, addSkipDate, removeSkipDate, resetSent } = useWhatsappPoll()
```

- [ ] **Step 6: Typecheck + card label**

Run: `cd frontend && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**
```bash
git add frontend/src/components/orga/pollSchedule.ts frontend/src/components/orga/pollSchedule.test.ts frontend/src/components/orga/WhatsappPollPage.tsx
git commit -m "✨ FE: korrekter Versandtag-Helfer (Vortag) für Karte, ersetzt buggy nextSend"
```

---

### Task 8: Editor — Modus-Haken + Feld-Umschaltung + Live-Hinweis

**Files:**
- Modify: `frontend/src/components/orga/WhatsappPollPage.tsx` (`PollEditor`, `blankDraft`)
- Create: `frontend/src/components/orga/PollEditor.test.tsx`

**Interfaces:**
- Consumes: `coupledSendDate`/`nextTrainingOn` from `pollSchedule`, `trainings` prop.
- Produces: `PollEditor` erhält zusätzlich `trainings: TrainingResponse[]`.

- [ ] **Step 1: Failing component test**

Create `frontend/src/components/orga/PollEditor.test.tsx` (modeled on `WhatsappVotersTab.test.tsx` harness):
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PollEditor } from './WhatsappPollPage'
import type { WhatsappPollRequest, TrainingResponse } from '@/types'

const groups = [{ id: 'g@g.us', name: 'Gruppe' }]
const trainings: TrainingResponse[] = [
  { id: 1, date: '2026-07-27', time: '20:00', location: null, cancelled: false, attendeeCount: 0, periodId: 8, type: 'REGULAR' },
]
const draft: WhatsappPollRequest = {
  groupId: 'g@g.us', groupName: 'Gruppe', title: 'T', options: ['Ja', 'Nein'],
  weekday: null, time: '18:00', enabled: true, allowMultipleAnswers: false,
  message: null, trainingCoupled: false, sendDate: '2026-08-05',
}

describe('PollEditor', () => {
  it('einmalig zeigt Datum-Feld, nicht Trainingstag', () => {
    render(<PollEditor draft={draft} groups={groups} trainings={trainings} saving={false} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Datum/i)).toBeTruthy()
    expect(screen.queryByText(/Trainingstag/i)).toBeNull()
  })

  it('Haken an -> Trainingstag erscheint + Warnung bei Wochentag ohne Training', () => {
    render(<PollEditor draft={draft} groups={groups} trainings={trainings} saving={false} onSave={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText(/Trainingsumfrage/i))
    expect(screen.getByText(/Trainingstag/i)).toBeTruthy()
  })
})
```
> `PollEditor` must be exported from `WhatsappPollPage.tsx` (`export function PollEditor`). Add the `export` keyword if missing.

- [ ] **Step 2: Run — verify fail**

Run: `cd frontend && npm run test -- PollEditor`
Expected: FAIL — `PollEditor` not exported / props mismatch / no date field.

- [ ] **Step 3: Update `blankDraft` default (einmalig)**

In `blankDraft`, set the one-off default: `weekday: null`, `trainingCoupled: false`, `sendDate` = tomorrow ISO. Replace the return object with:
```ts
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  return {
    groupId: groups[0]?.id ?? '',
    groupName: groups[0]?.name ?? null,
    title: '',
    options: ['Ja', 'Nein', 'Vielleicht'],
    weekday: null,
    time: '18:00',
    enabled: true,
    allowMultipleAnswers: false,
    message: null,
    trainingCoupled: false,
    sendDate: iso,
  }
```

- [ ] **Step 4: Editor — export + props + mode switch**

Make `PollEditor` exported and accept trainings:
```ts
export interface PollEditorProps {
  draft: WhatsappPollRequest
  groups: WhatsappGroup[]
  trainings: TrainingResponse[]
  saving: boolean
  onSave: (request: WhatsappPollRequest) => void
  onClose: () => void
}

export function PollEditor({ draft, groups, trainings, saving, onSave, onClose }: PollEditorProps) {
```
Pass `trainings` where `PollEditor` is rendered in `WhatsappPollPage`:
```tsx
        <PollEditor
          draft={editor.draft}
          groups={groups}
          trainings={trainings}
          saving={saving}
          onSave={handleSave}
          onClose={() => setEditor(null)}
        />
```
Add the `TrainingResponse` import to `WhatsappPollPage.tsx` types import.

- [ ] **Step 5: Editor — replace the Trainingstag/Sende-Uhrzeit block + coupling checkbox**

Replace the current `grid grid-cols-2` block (Trainingstag + Sende-Uhrzeit) **and** the "Automatisch senden — an den Trainingstag gekoppelt" checkbox label with:
```tsx
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.trainingCoupled}
            onChange={e => {
              const on = e.target.checked
              setForm(prev => {
                if (on && !prev.weekday) {
                  // beim Anschalten sinnvollen Trainingstag vorbelegen (frühestes kommendes Training)
                  const upcoming = [...trainings]
                    .filter(t => !t.cancelled && t.date >= new Date().toISOString().slice(0, 10))
                    .sort((a, b) => a.date.localeCompare(b.date))[0]
                  const wd = upcoming ? JS_TO_WEEKDAY[new Date(upcoming.date + 'T00:00:00').getDay()] : 'MONDAY'
                  return { ...prev, trainingCoupled: true, weekday: wd }
                }
                return { ...prev, trainingCoupled: on }
              })
            }}
            className="accent-navy-700 w-4 h-4 mt-0.5 cursor-pointer"
          />
          <span>
            <span className="block text-sm font-semibold text-navy-800">Trainingsumfrage</span>
            <span className="block text-xs text-gray-500">An den Trainingstag gekoppelt: sendet automatisch 1 Tag vor jedem Training und bucht die Anwesenheit. Aus = einmalig zu einem festen Zeitpunkt.</span>
          </span>
        </label>

        {form.trainingCoupled ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Trainingstag</label>
              <select value={form.weekday ?? 'MONDAY'} onChange={e => set('weekday', e.target.value as Weekday)} className={inputCls}>
                {WEEKDAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sende-Uhrzeit (am Vortag)</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputCls} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="poll-send-date">Datum</label>
              <input id="poll-send-date" type="date" value={form.sendDate ?? ''} onChange={e => set('sendDate', e.target.value || null)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Uhrzeit</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        <SendPreview form={form} trainings={trainings} />
```
Add the JS-weekday→Weekday map near the top of the file (next to `WEEKDAYS`):
```ts
const JS_TO_WEEKDAY: Record<number, Weekday> = {
  0: 'SUNDAY', 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY', 4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY',
}
```

- [ ] **Step 6: Add the `SendPreview` component**

Add at the bottom of `WhatsappPollPage.tsx`:
```tsx
function SendPreview({ form, trainings }: { form: WhatsappPollRequest; trainings: TrainingResponse[] }) {
  const t: TrainingLite[] = trainings.map(x => ({ date: x.date, cancelled: x.cancelled }))
  if (form.trainingCoupled) {
    if (!form.weekday) return null
    const d = coupledSendDate(form.weekday, form.time, t, [], new Date())
    const wdLabel = WEEKDAYS.find(w => w.value === form.weekday)?.label ?? ''
    if (!d) {
      return <p className="text-xs font-semibold text-softball-red-600 bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">⚠ Kein {wdLabel}-Training in der Saison — die Umfrage wird nie automatisch gesendet.</p>
    }
    return <p className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">→ Wird {d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} um {d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} gesendet (Vortag des Trainings).</p>
  }
  if (!form.sendDate) return null
  const d = new Date(form.sendDate + 'T' + form.time)
  const past = d.getTime() < Date.now()
  if (past) {
    return <p className="text-xs font-semibold text-softball-red-600 bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">⚠ Zeitpunkt liegt in der Vergangenheit — es wird nicht gesendet.</p>
  }
  return <p className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">→ Wird am {d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} um {d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} einmalig gesendet.</p>
}
```

- [ ] **Step 7: `buildRequest` carries new fields**

In `PollEditor`'s `buildRequest`, ensure the spread keeps `trainingCoupled`/`sendDate` (spread of `form` already includes them; no change needed). Verify by inspection that `form` holds both.

- [ ] **Step 8: Run tests + build**

Run: `cd frontend && npm run test -- PollEditor && npm run build`
Expected: PASS (2 tests) + build OK.

- [ ] **Step 9: Commit**
```bash
git add frontend/src/components/orga/WhatsappPollPage.tsx frontend/src/components/orga/PollEditor.test.tsx
git commit -m "✨ FE-Editor: Trainingsumfrage-Haken + Datum/Trainingstag-Umschaltung + Live-Versand-Hinweis"
```

---

### Task 9: Karte — Einmalig-Anzeige, Badges, Pausieren im ⋮-Menü

**Files:**
- Modify: `frontend/src/components/orga/WhatsappPollPage.tsx` (`PollCard`, `PollCardProps`, `WhatsappPollPage` handler)

**Interfaces:**
- Consumes: `updatePoll`, `toRequest` (bereits in der Datei).
- Produces: Karte zeigt „Einmalig/Training"-Badge + korrekten Status; ⋮-Menü hat „Pausieren/Fortsetzen" (nur bei `trainingCoupled`).

- [ ] **Step 1: Add pause handler in `WhatsappPollPage`**

Add near the other handlers:
```ts
  const handleTogglePause = async (poll: WhatsappPollResponse) => {
    try {
      await updatePoll(poll.id, { ...toRequest(poll), enabled: !poll.enabled })
      toast.show(poll.enabled ? 'Umfrage pausiert' : 'Umfrage fortgesetzt')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }
```
Pass to the card in the `.map`: add `onTogglePause={() => handleTogglePause(poll)}`.

- [ ] **Step 2: Extend `PollCardProps` + menu item**

Add to `PollCardProps`: `onTogglePause: () => void`. Destructure it in `PollCard`. In the ⋮ menu, after the „Absage-Termine" button and only for coupled polls, add:
```tsx
                  {poll.trainingCoupled && (
                    <button
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); onTogglePause() }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-navy-800 hover:bg-navy-50 cursor-pointer"
                    >
                      <CalendarIcon size={15} /> {poll.enabled ? 'Pausieren' : 'Fortsetzen'}
                    </button>
                  )}
```

- [ ] **Step 3: Type badge in the card meta row**

In the meta row (the `mt-1 flex flex-wrap …` block), replace the `Aktiv/Pausiert` badge line so pause only shows for coupled, and add a mode badge. Replace:
```tsx
          <Badge color={poll.enabled ? 'emerald' : 'gray'} size="sm">{poll.enabled ? 'Aktiv' : 'Pausiert'}</Badge>
```
with:
```tsx
          <span className="font-body text-[11px] font-semibold text-navy-600 bg-navy-50 border border-navy-100 rounded-md px-1.5 py-0.5">{poll.trainingCoupled ? 'Training' : 'Einmalig'}</span>
          {poll.trainingCoupled && <Badge color={poll.enabled ? 'emerald' : 'gray'} size="sm">{poll.enabled ? 'Aktiv' : 'Pausiert'}</Badge>}
          {!poll.trainingCoupled && poll.lastSentAt && <Badge color="gray" size="sm">Gesendet</Badge>}
```

- [ ] **Step 4: Modusabhängige Zeit-Badge in der Meta-Zeile**

Die obere Badge zeigt `{weekdayShort(poll.weekday)} · {formatTime(poll.time)}` — für einmalige Polls (kein `weekday`) falsch. Ersetze in `PollCard` die Badge:
```tsx
          <span className="inline-flex items-center gap-1 font-display font-bold tabular-nums text-white bg-navy-900 rounded-md px-2 py-0.5">
            {poll.trainingCoupled
              ? `${weekdayShort(poll.weekday)} · ${formatTime(poll.time)}`
              : (poll.sendDate ? `${formatDate(poll.sendDate)} · ${formatTime(poll.time)}` : formatTime(poll.time))}
          </span>
```
(`formatDate` existiert bereits in der Datei.)

- [ ] **Step 5: Label for the „Nächster Versand" block for one-off**

In the "Nächster Versand — Kern-Info" block, change the eyebrow label to be mode-aware:
```tsx
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy-400">{poll.trainingCoupled ? 'Nächster Versand' : (poll.lastSentAt ? 'Status' : 'Geplant')}</p>
```
(The value line already calls `formatNextSend(poll, trainings)` from Task 7, which returns „Gesendet" / „Sa · 10:25" appropriately.)

- [ ] **Step 6: Build**

Run: `cd frontend && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**
```bash
git add frontend/src/components/orga/WhatsappPollPage.tsx
git commit -m "🎨 FE-Karte: Einmalig/Training-Badge, Gesendet-Status, Pausieren im Menü"
```

---

### Task 10: Voller Testlauf + Prod-Deploy

**Files:** keine (Verifikation)

- [ ] **Step 1: Backend voll**

Run: `cd backend && DOCKER_HOST=unix:///var/run/docker.sock ./mvnw test -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS, 0 Failures/Errors.

- [ ] **Step 2: Frontend voll**

Run: `cd frontend && npm run lint && npm run test && npm run build`
Expected: alle grün.

- [ ] **Step 3: Push (löst Auto-Deploy aus) — nur nach OK des Nutzers**
```bash
git push origin master
```
- [ ] **Step 4: Deploy beobachten**

Run: `gh run list --limit 2` → auf „Deploy to Hetzner" success warten (`gh run watch <id> --exit-status`).

- [ ] **Step 5: Smoke-Test auf Prod**

Im Orga-UI: eine einmalige Umfrage in der Testgruppe mit Datum morgen + naher Uhrzeit anlegen → prüfen dass der Hinweis „→ wird am … einmalig gesendet" stimmt und die Karte „Geplant" zeigt. Trainingsumfrage-Haken an → Trainingstag wählen ohne Training → Warnung erscheint.

---

## Notizen zur Ausführung
- Reihenfolge strikt Task 1→10 (spätere Tasks nutzen frühere Signaturen).
- Anwesenheits-Sync (`PollVoteSyncService`) wird bewusst NICHT angefasst — er ignoriert einmalige Polls automatisch (Guard auf `lastSentTrainingId != null`, Zeile 105).
- Der FE-Helfer `coupledSendDate` ist reine Anzeige; die verbindliche Sende-Entscheidung trifft weiter der Backend-Scheduler.
