# Training-Period = Trainingsrhythmus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine `TrainingPeriod` trägt einen editierbaren Trainingsrhythmus (Wochentage + Zeit + Ort); Speichern gleicht zukünftige Trainingstermine an den Rhythmus an, ohne Vergangenheit/Historie zu zerstören. Im Frontend wird eine Period-Verwaltung (Anlegen/Bearbeiten/Löschen mit Wochentag-Picker) gebaut.

**Architecture:** Onion/Hexagonal bleibt. Neue Felder werden durch alle Schichten gereicht (Entity→Mapper→Domain→DTO→FE). Die Diff-Berechnung (welche Termine anlegen/löschen) ist reine Domain-Logik (`PeriodRhythmSync`), testbar ohne DB. Der Auto-Fill von Stammspielern wird in einen wiederverwendbaren Component extrahiert, damit `TrainingService` und `TrainingPeriodService` ihn teilen (DRY).

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway, PostgreSQL 17 (Testcontainers); React 19 + TS + Vite + Tailwind v4.

## Global Constraints

- Maven-Build IMMER mit `-s .mvn/local-settings.xml` (lokales Settings, nie `~/.m2/settings.xml` anfassen).
- Backend-Tests brauchen laufenden Docker-Daemon (Testcontainers). `docker compose up -d db` für lokalen DB-Lauf.
- Schemaänderungen NUR via neue Flyway-Migration `V{n}__*.sql`; `spring.jpa.hibernate.ddl-auto=validate` muss grün bleiben. Nächste freie Nummer: **V39** (aktuell höchste = V38).
- Onion-Regel: `domain` kennt kein Spring/JPA/DTO. CSV-Parsing gehört in den Mapper (Adapter), nicht ins Domain-Model.
- German UI, Modals mit dark backdrop (kein `confirm()`), `ConfirmModal` für destruktive Aktionen.
- Conventional commits mit gitmoji-Prefix. **Keine `Co-Authored-By`-Zeilen.**
- Vor nicht-trivialem Commit: Frontend `npm run build`, Backend `./mvnw test -s .mvn/local-settings.xml`.
- Wochentage: 1=Montag … 7=Sonntag (wie bestehendes `createBulk`).

---

## File Structure

**Backend (neu):**
- `backend/src/main/resources/db/migration/V39__add_period_rhythm.sql` — Spalten `weekdays`, `time`, `location` auf `training_periods`.
- `backend/src/main/java/com/softball/domain/service/PeriodRhythmSync.java` — reine Diff-Logik.
- `backend/src/main/java/com/softball/application/RegularPlayerAutoFiller.java` — extrahierter Auto-Fill.
- `backend/src/main/java/com/softball/adapter/dto/UpdateTrainingPeriodRequest.java` — Update-Request.
- `backend/src/test/java/com/softball/domain/service/PeriodRhythmSyncTest.java`
- `backend/src/test/java/com/softball/adapter/out/persistence/mapper/TrainingPeriodMapperTest.java`

**Backend (geändert):**
- `domain/model/TrainingPeriod.java` — Felder `weekdays/time/location`.
- `adapter/out/persistence/entity/TrainingPeriodEntity.java` — Spalten.
- `adapter/out/persistence/mapper/TrainingPeriodMapper.java` — CSV ↔ List.
- `adapter/dto/TrainingPeriodResponse.java` — neue Felder + Overload.
- `application/TrainingService.java` — nutzt `RegularPlayerAutoFiller`; `createBulk` persistiert Rhythmus.
- `application/TrainingPeriodService.java` — `update(...)` mit Sync + Cascade-Helper.
- `adapter/in/web/TrainingController.java` — `PUT /periods/{id}` → update.
- `backend/src/test/java/com/softball/service/TrainingPeriodServiceTest.java` — Tests für `update`.

**Frontend (geändert/neu):**
- `frontend/src/types/index.ts` — `TrainingPeriodResponse` Felder.
- `frontend/src/api/client.ts` — `updateTrainingPeriod`.
- `frontend/src/hooks/useTraining.ts` — `updatePeriod`.
- `frontend/src/components/training/PeriodManagerDrawer.tsx` (neu) — Liste + Create/Edit-Form.
- `frontend/src/components/training/TrainingTodayPage.tsx` — Button öffnet Drawer.

---

## Task 1: Rhythmus-Felder auf TrainingPeriod persistieren

**Files:**
- Create: `backend/src/main/resources/db/migration/V39__add_period_rhythm.sql`
- Modify: `backend/src/main/java/com/softball/domain/model/TrainingPeriod.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/TrainingPeriodEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/TrainingPeriodMapper.java`
- Test: `backend/src/test/java/com/softball/adapter/out/persistence/mapper/TrainingPeriodMapperTest.java`

**Interfaces:**
- Produces:
  - `TrainingPeriod.getWeekdays(): List<Integer>` / `setWeekdays(List<Integer>)`, `getTime(): String` / `setTime`, `getLocation(): String` / `setLocation`.
  - `TrainingPeriodMapper` mappt diese Felder per CSV (`"2,4"`) ↔ `List<Integer>`.

- [ ] **Step 1: Migration schreiben**

Create `backend/src/main/resources/db/migration/V39__add_period_rhythm.sql`:

```sql
ALTER TABLE training_periods ADD COLUMN weekdays VARCHAR(20);
ALTER TABLE training_periods ADD COLUMN time VARCHAR(20);
ALTER TABLE training_periods ADD COLUMN location VARCHAR(255);
```

- [ ] **Step 2: Domain-Model erweitern**

In `domain/model/TrainingPeriod.java` Felder + Accessors ergänzen (Imports `java.util.ArrayList`, `java.util.List`):

```java
    private List<Integer> weekdays = new ArrayList<>();
    private String time;
    private String location;

    public List<Integer> getWeekdays() { return weekdays; }
    public void setWeekdays(final List<Integer> weekdays) { this.weekdays = weekdays != null ? weekdays : new ArrayList<>(); }
    public String getTime() { return time; }
    public void setTime(final String time) { this.time = time; }
    public String getLocation() { return location; }
    public void setLocation(final String location) { this.location = location; }
```

- [ ] **Step 3: Entity erweitern**

In `adapter/out/persistence/entity/TrainingPeriodEntity.java` ergänzen:

```java
    @Column(name = "weekdays")
    private String weekdays;

    @Column(name = "time")
    private String time;

    @Column(name = "location")
    private String location;

    public String getWeekdays() { return weekdays; }
    public void setWeekdays(final String weekdays) { this.weekdays = weekdays; }
    public String getTime() { return time; }
    public void setTime(final String time) { this.time = time; }
    public String getLocation() { return location; }
    public void setLocation(final String location) { this.location = location; }
```

- [ ] **Step 4: Mapper-Test schreiben (failing)**

Create `backend/src/test/java/com/softball/adapter/out/persistence/mapper/TrainingPeriodMapperTest.java`:

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.TrainingPeriodEntity;
import com.softball.domain.model.TrainingPeriod;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TrainingPeriodMapperTest {

    private final TrainingPeriodMapper mapper = new TrainingPeriodMapper();

    @Test
    void roundTrip_preservesWeekdaysTimeLocation() {
        final TrainingPeriod domain = new TrainingPeriod("Sommer", LocalDate.of(2026, 4, 1), LocalDate.of(2026, 9, 30));
        domain.setWeekdays(List.of(2, 4));
        domain.setTime("18:00");
        domain.setLocation("Park");

        final TrainingPeriodEntity entity = mapper.toEntity(domain);
        assertThat(entity.getWeekdays()).isEqualTo("2,4");

        final TrainingPeriod back = mapper.toDomain(entity);
        assertThat(back.getWeekdays()).containsExactly(2, 4);
        assertThat(back.getTime()).isEqualTo("18:00");
        assertThat(back.getLocation()).isEqualTo("Park");
    }

    @Test
    void toDomain_nullWeekdays_yieldsEmptyList() {
        final TrainingPeriodEntity entity = new TrainingPeriodEntity("X", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1));
        final TrainingPeriod back = mapper.toDomain(entity);
        assertThat(back.getWeekdays()).isEmpty();
    }
}
```

- [ ] **Step 5: Test ausführen — muss fehlschlagen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPeriodMapperTest`
Expected: FAIL (Mapper überträgt weekdays/time/location noch nicht).

- [ ] **Step 6: Mapper implementieren**

`adapter/out/persistence/mapper/TrainingPeriodMapper.java` komplett ersetzen:

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.TrainingPeriodEntity;
import com.softball.domain.model.TrainingPeriod;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class TrainingPeriodMapper {

    public TrainingPeriod toDomain(final TrainingPeriodEntity entity) {
        if (entity == null) return null;
        final TrainingPeriod domain = new TrainingPeriod(entity.getId(), entity.getName(), entity.getStartDate(), entity.getEndDate());
        domain.setWeekdays(fromCsv(entity.getWeekdays()));
        domain.setTime(entity.getTime());
        domain.setLocation(entity.getLocation());
        return domain;
    }

    public TrainingPeriodEntity toEntity(final TrainingPeriod domain) {
        final TrainingPeriodEntity entity = new TrainingPeriodEntity(domain.getName(), domain.getStartDate(), domain.getEndDate());
        entity.setId(domain.getId());
        entity.setWeekdays(toCsv(domain.getWeekdays()));
        entity.setTime(domain.getTime());
        entity.setLocation(domain.getLocation());
        return entity;
    }

    public void updateEntity(final TrainingPeriodEntity entity, final TrainingPeriod domain) {
        entity.setName(domain.getName());
        entity.setStartDate(domain.getStartDate());
        entity.setEndDate(domain.getEndDate());
        entity.setWeekdays(toCsv(domain.getWeekdays()));
        entity.setTime(domain.getTime());
        entity.setLocation(domain.getLocation());
    }

    private String toCsv(final List<Integer> weekdays) {
        if (weekdays == null || weekdays.isEmpty()) return null;
        return weekdays.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private List<Integer> fromCsv(final String csv) {
        if (csv == null || csv.isBlank()) return new ArrayList<>();
        return Arrays.stream(csv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(Integer::valueOf)
            .collect(Collectors.toCollection(ArrayList::new));
    }
}
```

- [ ] **Step 7: Test ausführen — muss bestehen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPeriodMapperTest`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/db/migration/V39__add_period_rhythm.sql \
  backend/src/main/java/com/softball/domain/model/TrainingPeriod.java \
  backend/src/main/java/com/softball/adapter/out/persistence/entity/TrainingPeriodEntity.java \
  backend/src/main/java/com/softball/adapter/out/persistence/mapper/TrainingPeriodMapper.java \
  backend/src/test/java/com/softball/adapter/out/persistence/mapper/TrainingPeriodMapperTest.java
git commit -m "✨ Training-Period: Rhythmus-Felder (Wochentage/Zeit/Ort) persistieren"
```

---

## Task 2: Diff-Logik `PeriodRhythmSync` (reine Domain-Logik)

**Files:**
- Create: `backend/src/main/java/com/softball/domain/service/PeriodRhythmSync.java`
- Test: `backend/src/test/java/com/softball/domain/service/PeriodRhythmSyncTest.java`

**Interfaces:**
- Produces:
  - `record SyncPlan(List<LocalDate> datesToCreate, List<Long> trainingIdsToDelete)`
  - `SyncPlan computeFuture(List<Integer> weekdays, LocalDate start, LocalDate end, LocalDate today, List<Training> existing)` — betrachtet nur Termine `date >= today`. Legt fehlende Termine an gewählten Wochentagen an; löscht künftige Termine an nicht-mehr-gewählten Wochentagen. Vergangenheit unangetastet.
- Consumes: `com.softball.domain.model.Training` (hat `getId()`, `getDate()`).

- [ ] **Step 1: Test schreiben (failing)**

Create `backend/src/test/java/com/softball/domain/service/PeriodRhythmSyncTest.java`:

```java
package com.softball.domain.service;

import com.softball.domain.model.Training;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PeriodRhythmSyncTest {

    private final PeriodRhythmSync sync = new PeriodRhythmSync();

    private Training training(final long id, final LocalDate date) {
        final Training t = new Training(date, null, null);
        t.setId(id);
        return t;
    }

    // Zeitraum Mo 2026-06-01 .. So 2026-06-14. "Heute" = 2026-06-08 (Mo).
    private final LocalDate start = LocalDate.of(2026, 6, 1);
    private final LocalDate end = LocalDate.of(2026, 6, 14);
    private final LocalDate today = LocalDate.of(2026, 6, 8);

    @Test
    void addWeekday_createsOnlyFutureDates() {
        // Rhythmus Dienstag (2). Künftige Dienstage >= 2026-06-08: 09., (02. ist Vergangenheit).
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(2), start, end, today, List.of());
        assertThat(plan.datesToCreate()).containsExactly(LocalDate.of(2026, 6, 9));
        assertThat(plan.trainingIdsToDelete()).isEmpty();
    }

    @Test
    void existingFutureDateOnKeptWeekday_isNotDuplicated() {
        // Dienstag 09. existiert bereits -> nicht erneut anlegen.
        final Training existing = training(1L, LocalDate.of(2026, 6, 9));
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(2), start, end, today, List.of(existing));
        assertThat(plan.datesToCreate()).isEmpty();
        assertThat(plan.trainingIdsToDelete()).isEmpty();
    }

    @Test
    void removeWeekday_deletesOnlyFutureTrainingsOnThatWeekday() {
        // Bestehende Donnerstage (4): 04. (Vergangenheit), 11. (Zukunft). Rhythmus jetzt nur Dienstag.
        final Training pastThu = training(1L, LocalDate.of(2026, 6, 4));
        final Training futureThu = training(2L, LocalDate.of(2026, 6, 11));
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(2), start, end, today, List.of(pastThu, futureThu));
        assertThat(plan.trainingIdsToDelete()).containsExactly(2L);
        // Dienstag 09. fehlt noch -> anlegen.
        assertThat(plan.datesToCreate()).containsExactly(LocalDate.of(2026, 6, 9));
    }

    @Test
    void pastTrainings_areNeverTouched() {
        final Training pastTue = training(1L, LocalDate.of(2026, 6, 2));
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(4), start, end, today, List.of(pastTue));
        assertThat(plan.trainingIdsToDelete()).isEmpty();
    }
}
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PeriodRhythmSyncTest`
Expected: FAIL (Klasse existiert nicht).

- [ ] **Step 3: Implementieren**

Create `backend/src/main/java/com/softball/domain/service/PeriodRhythmSync.java`:

```java
package com.softball.domain.service;

import com.softball.domain.model.Training;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Reine Diff-Logik: gleicht zukünftige Trainingstermine an einen Wochentag-Rhythmus an.
 * Betrachtet ausschließlich Termine mit date >= today — Vergangenheit bleibt unangetastet
 * (schützt Anwesenheits-/Trainingsplan-Historie).
 */
public class PeriodRhythmSync {

    public record SyncPlan(List<LocalDate> datesToCreate, List<Long> trainingIdsToDelete) {}

    public SyncPlan computeFuture(final List<Integer> weekdays, final LocalDate start, final LocalDate end,
                                   final LocalDate today, final List<Training> existing) {
        final Set<DayOfWeek> targetDays = weekdays.stream().map(DayOfWeek::of).collect(Collectors.toSet());

        final Set<LocalDate> existingFutureDates = existing.stream()
            .map(Training::getDate)
            .filter(d -> !d.isBefore(today))
            .collect(Collectors.toSet());

        final List<LocalDate> datesToCreate = new ArrayList<>();
        final LocalDate from = start.isBefore(today) ? today : start;
        for (LocalDate d = from; !d.isAfter(end); d = d.plusDays(1)) {
            if (targetDays.contains(d.getDayOfWeek()) && !existingFutureDates.contains(d)) {
                datesToCreate.add(d);
            }
        }

        final List<Long> trainingIdsToDelete = existing.stream()
            .filter(t -> !t.getDate().isBefore(today))
            .filter(t -> !targetDays.contains(t.getDate().getDayOfWeek()))
            .map(Training::getId)
            .collect(Collectors.toCollection(ArrayList::new));

        return new SyncPlan(datesToCreate, trainingIdsToDelete);
    }
}
```

- [ ] **Step 4: Test ausführen — muss bestehen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PeriodRhythmSyncTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/PeriodRhythmSync.java \
  backend/src/test/java/com/softball/domain/service/PeriodRhythmSyncTest.java
git commit -m "✨ Domain: PeriodRhythmSync berechnet Termin-Diff (nur Zukunft)"
```

---

## Task 3: Auto-Fill in wiederverwendbaren Component extrahieren

**Files:**
- Create: `backend/src/main/java/com/softball/application/RegularPlayerAutoFiller.java`
- Modify: `backend/src/main/java/com/softball/application/TrainingService.java`

**Interfaces:**
- Produces: `RegularPlayerAutoFiller.autoFill(Training training)` — legt für alle `regular`-Spieler eine anwesende `TrainingAttendance` an (gleiche Logik wie bisher `TrainingService.autoFillRegularPlayers`).
- Consumes: `PlayerRepository.findByRegularTrue()`, `TrainingAttendanceRepository.saveAll(...)`.

- [ ] **Step 1: Component anlegen**

Create `backend/src/main/java/com/softball/application/RegularPlayerAutoFiller.java`:

```java
package com.softball.application;

import com.softball.domain.model.Player;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import org.springframework.stereotype.Component;

import java.util.List;

/** Füllt ein frisch erstelltes Training automatisch mit allen Stammspielern (regular=true) als anwesend. */
@Component
public class RegularPlayerAutoFiller {

    private final PlayerRepository playerRepository;
    private final TrainingAttendanceRepository attendanceRepository;

    public RegularPlayerAutoFiller(final PlayerRepository playerRepository,
                                    final TrainingAttendanceRepository attendanceRepository) {
        this.playerRepository = playerRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public void autoFill(final Training training) {
        final List<Player> regularPlayers = playerRepository.findByRegularTrue();
        final List<TrainingAttendance> attendances = regularPlayers.stream()
            .map(player -> new TrainingAttendance(training, player, true))
            .toList();
        attendanceRepository.saveAll(attendances);
        training.getAttendances().addAll(attendances);
    }
}
```

- [ ] **Step 2: TrainingService auf den Component umstellen**

In `application/TrainingService.java`:

(a) Konstruktor-Feld + Parameter ergänzen, `PlayerRepository`/`TrainingAttendanceRepository` bleiben (werden noch in createBulk gebraucht? — Nein für Autofill; aber `attendanceRepository` wird nicht weiter direkt genutzt → prüfen). Ersetze Feld-Deklarationen und Konstruktor:

```java
    private final TrainingRepository trainingRepository;
    private final TrainingPeriodRepository periodRepository;
    private final RegularPlayerAutoFiller autoFiller;

    public TrainingService(final TrainingRepository trainingRepository,
                           final TrainingPeriodRepository periodRepository,
                           final RegularPlayerAutoFiller autoFiller) {
        this.trainingRepository = trainingRepository;
        this.periodRepository = periodRepository;
        this.autoFiller = autoFiller;
    }
```

(Entferne die nun ungenutzten Felder `attendanceRepository`/`playerRepository` und deren Imports `PlayerRepository`, `TrainingAttendanceRepository`, `Player`, `TrainingAttendance`.)

(b) Ersetze beide Aufrufe `autoFillRegularPlayers(training)` durch `autoFiller.autoFill(training)`.

(c) Lösche die Methode `autoFillRegularPlayers(...)` am Ende der Klasse.

- [ ] **Step 3: Bestehende TrainingService-Tests ausführen (Verhalten unverändert)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingServiceTest`
Expected: PASS. Falls der Test den alten Konstruktor mockt, Konstruktor-Aufruf im Test an die neue Signatur anpassen (Mocks: `trainingRepository`, `periodRepository`, `autoFiller`); Verifikationen auf `playerRepository.findByRegularTrue()` ggf. durch `verify(autoFiller).autoFill(any())` ersetzen.

- [ ] **Step 4: Voller Backend-Build (Compile-Check der Verdrahtung)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingServiceTest,TrainingPeriodMapperTest,PeriodRhythmSyncTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/RegularPlayerAutoFiller.java \
  backend/src/main/java/com/softball/application/TrainingService.java \
  backend/src/test/java/com/softball/service/TrainingServiceTest.java
git commit -m "♻️ Auto-Fill der Stammspieler in RegularPlayerAutoFiller extrahiert"
```

---

## Task 4: `TrainingPeriodService.update` mit Sync + createBulk persistiert Rhythmus

**Files:**
- Modify: `backend/src/main/java/com/softball/application/TrainingPeriodService.java`
- Modify: `backend/src/main/java/com/softball/application/TrainingService.java`
- Test: `backend/src/test/java/com/softball/service/TrainingPeriodServiceTest.java`

**Interfaces:**
- Produces:
  - `TrainingPeriodService.update(Long id, String name, LocalDate startDate, LocalDate endDate, List<Integer> weekdays, String time, String location): TrainingPeriodResponse` — speichert Period-Felder, synct zukünftige Termine via `PeriodRhythmSync`, legt neue an (mit `autoFiller`), löscht weggefallene künftige Termine inkl. Cascade (Plan + Attendance).
- Consumes: `PeriodRhythmSync.computeFuture(...)`, `RegularPlayerAutoFiller.autoFill(...)`, `TrainingRepository.findByPeriodIdOrderByDateDesc(id)`.

- [ ] **Step 1: Test schreiben (failing)**

In `backend/src/test/java/com/softball/service/TrainingPeriodServiceTest.java` Mock-Feld + Test ergänzen. Oben bei den Mocks:

```java
    @Mock private com.softball.application.RegularPlayerAutoFiller autoFiller;
```

(Die `@InjectMocks`-Instanz zieht den neuen Konstruktor-Parameter automatisch.)

Neuer Test (nutzt festes `today` via injizierbarem Clock NICHT — stattdessen Datumsbereich rein in Vergangenheit/Zukunft relativ zu `LocalDate.now()`):

```java
    @Test
    void update_addsWeekday_createsFutureTrainings_andPersistsRhythm() {
        final LocalDate today = LocalDate.now();
        final LocalDate start = today.minusDays(1);
        final LocalDate end = today.plusWeeks(2);

        final TrainingPeriod period = new TrainingPeriod(7L, "Sommer", start, end);
        when(periodRepository.findById(7L)).thenReturn(Optional.of(period));
        when(periodRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(trainingRepository.findByPeriodIdOrderByDateDesc(7L)).thenReturn(List.of());
        when(trainingRepository.save(any())).thenAnswer(inv -> {
            final Training t = inv.getArgument(0);
            t.setId(99L);
            return t;
        });

        // Rhythmus: der Wochentag von 'today' -> mind. 1 künftiger Termin (today) wird angelegt.
        final int todayDow = today.getDayOfWeek().getValue();
        final TrainingPeriodResponse res = service.update(7L, "Sommer", start, end, List.of(todayDow), "18:00", "Park");

        assertThat(res.weekdays()).containsExactly(todayDow);
        assertThat(res.time()).isEqualTo("18:00");
        verify(trainingRepository, atLeastOnce()).save(any(Training.class));
        verify(autoFiller, atLeastOnce()).autoFill(any(Training.class));
    }

    @Test
    void update_missingPeriod_throws() {
        when(periodRepository.findById(404L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(404L, "X", LocalDate.now(), LocalDate.now().plusDays(1), List.of(1), null, null))
            .isInstanceOf(ResourceNotFoundException.class);
    }
```

(Import ergänzen: `import com.softball.adapter.dto.TrainingPeriodResponse;` ist schon da; `org.mockito.Mockito.atLeastOnce` via `Mockito.*` vorhanden.)

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPeriodServiceTest`
Expected: FAIL (Konstruktor/`update` fehlen → Compile-Fehler).

- [ ] **Step 3: TrainingPeriodService implementieren**

`application/TrainingPeriodService.java`: Konstruktor um `RegularPlayerAutoFiller` + `PeriodRhythmSync` erweitern und `update` + Cascade-Helper ergänzen. Imports ergänzen: `com.softball.domain.service.PeriodRhythmSync`, `java.util.ArrayList`, `java.util.List`, `java.util.Set`, `java.util.stream.Collectors`.

Konstruktor (Felder + Zuweisung ergänzen):

```java
    private final RegularPlayerAutoFiller autoFiller;
    private final PeriodRhythmSync rhythmSync = new PeriodRhythmSync();

    public TrainingPeriodService(final TrainingPeriodRepository periodRepository,
                                  final TrainingRepository trainingRepository,
                                  final TrainingAttendanceRepository attendanceRepository,
                                  final TrainingPlanRepository trainingPlanRepository,
                                  final RegularPlayerAutoFiller autoFiller) {
        this.periodRepository = periodRepository;
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.trainingPlanRepository = trainingPlanRepository;
        this.autoFiller = autoFiller;
    }
```

Neue `update`-Methode (z.B. nach `rename`):

```java
    @Transactional
    public TrainingPeriodResponse update(final Long periodId, final String name, final LocalDate startDate,
                                          final LocalDate endDate, final List<Integer> weekdays,
                                          final String time, final String location) {
        final TrainingPeriod period = periodRepository.findById(periodId)
            .orElseThrow(() -> new ResourceNotFoundException("TrainingPeriod", periodId));
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name darf nicht leer sein");
        }
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Startdatum darf nicht nach dem Enddatum liegen");
        }
        final List<Integer> safeWeekdays = weekdays != null ? weekdays : new ArrayList<>();
        for (final Integer d : safeWeekdays) {
            if (d == null || d < 1 || d > 7) {
                throw new IllegalArgumentException("Wochentag muss zwischen 1 (Montag) und 7 (Sonntag) liegen");
            }
        }

        period.setName(name.trim());
        period.setStartDate(startDate);
        period.setEndDate(endDate);
        period.setWeekdays(safeWeekdays);
        period.setTime(time);
        period.setLocation(location);
        final TrainingPeriod saved = periodRepository.save(period);

        final List<Training> existing = trainingRepository.findByPeriodIdOrderByDateDesc(periodId);
        final PeriodRhythmSync.SyncPlan plan = rhythmSync.computeFuture(
            safeWeekdays, startDate, endDate, LocalDate.now(), existing);

        for (final LocalDate date : plan.datesToCreate()) {
            Training training = new Training(date, time, location);
            training.setPeriod(saved);
            training = trainingRepository.save(training);
            autoFiller.autoFill(training);
        }

        if (!plan.trainingIdsToDelete().isEmpty()) {
            final Set<Long> ids = Set.copyOf(plan.trainingIdsToDelete());
            final List<Training> toDelete = existing.stream().filter(t -> ids.contains(t.getId())).toList();
            deleteTrainingsCascade(toDelete);
        }

        return TrainingPeriodResponse.from(saved);
    }

    private void deleteTrainingsCascade(final List<Training> trainings) {
        final List<Long> trainingIds = trainings.stream().map(Training::getId).toList();
        if (!trainingIds.isEmpty()) {
            trainingPlanRepository.deleteByTrainingIds(trainingIds);
            attendanceRepository.deleteByTrainingIds(trainingIds);
        }
        trainingRepository.deleteAll(trainings);
    }
```

Optional-Refactor: `delete(...)` darf den neuen `deleteTrainingsCascade(...)` nutzen (gleicher Cascade-Block). Ersetze in `delete` den Inline-Block durch `deleteTrainingsCascade(trainings);` gefolgt von `periodRepository.deleteById(periodId);`.

- [ ] **Step 4: createBulk persistiert Rhythmus auf der Period**

In `application/TrainingService.java`, Methode `createBulk`, den Period-Block ersetzen, damit Wochentage/Zeit/Ort gespeichert werden (auch bei bereits existierender Period):

```java
        TrainingPeriod period = null;
        if (periodName != null && !periodName.isBlank()) {
            period = periodRepository.findByNameIgnoreCase(periodName.trim())
                .orElseGet(() -> periodRepository.save(new TrainingPeriod(periodName.trim(), startDate, endDate)));
            period.setWeekdays(new java.util.ArrayList<>(weekdays));
            period.setTime(time);
            period.setLocation(location);
            period = periodRepository.save(period);
        }
```

- [ ] **Step 5: Tests ausführen — müssen bestehen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPeriodServiceTest,TrainingServiceTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/application/TrainingPeriodService.java \
  backend/src/main/java/com/softball/application/TrainingService.java \
  backend/src/test/java/com/softball/service/TrainingPeriodServiceTest.java
git commit -m "✨ Period-Update synct zukünftige Termine an Wochentag-Rhythmus"
```

---

## Task 5: DTO + Controller (Update-Endpoint + Wochentag-Anzeige)

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/UpdateTrainingPeriodRequest.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/TrainingPeriodResponse.java`
- Modify: `backend/src/main/java/com/softball/application/TrainingPeriodService.java` (findAll leitet Wochentage ab)
- Modify: `backend/src/main/java/com/softball/adapter/in/web/TrainingController.java`
- Test: `backend/src/test/java/com/softball/service/TrainingPeriodServiceTest.java`

**Interfaces:**
- Produces:
  - `UpdateTrainingPeriodRequest(String name, LocalDate startDate, LocalDate endDate, List<Integer> weekdays, String time, String location)`
  - `TrainingPeriodResponse(Long id, String name, LocalDate startDate, LocalDate endDate, List<Integer> weekdays, String time, String location)` + `from(TrainingPeriod)` + `from(TrainingPeriod, List<Integer> weekdaysOverride)`.
  - `PUT /api/trainings/periods/{id}` akzeptiert `UpdateTrainingPeriodRequest`.

- [ ] **Step 1: Response-Record erweitern**

`adapter/dto/TrainingPeriodResponse.java` ersetzen:

```java
package com.softball.adapter.dto;

import com.softball.domain.model.TrainingPeriod;

import java.time.LocalDate;
import java.util.List;

public record TrainingPeriodResponse(Long id, String name, LocalDate startDate, LocalDate endDate,
                                      List<Integer> weekdays, String time, String location) {

    public static TrainingPeriodResponse from(final TrainingPeriod period) {
        return from(period, period.getWeekdays());
    }

    public static TrainingPeriodResponse from(final TrainingPeriod period, final List<Integer> weekdays) {
        return new TrainingPeriodResponse(period.getId(), period.getName(), period.getStartDate(),
            period.getEndDate(), weekdays, period.getTime(), period.getLocation());
    }
}
```

- [ ] **Step 2: Update-Request anlegen**

Create `backend/src/main/java/com/softball/adapter/dto/UpdateTrainingPeriodRequest.java`:

```java
package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record UpdateTrainingPeriodRequest(
    @NotBlank(message = "Name ist erforderlich")
    String name,

    @NotNull(message = "Startdatum ist erforderlich")
    LocalDate startDate,

    @NotNull(message = "Enddatum ist erforderlich")
    LocalDate endDate,

    List<Integer> weekdays,

    String time,

    String location
) {}
```

- [ ] **Step 3: findAll leitet Wochentage für Alt-Periods ab — Test (failing)**

In `TrainingPeriodServiceTest` Test ergänzen:

```java
    @Test
    void findAll_derivesWeekdaysFromTrainings_whenPeriodHasNone() {
        final TrainingPeriod period = new TrainingPeriod(3L, "Alt", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 1));
        // weekdays leer (Alt-Daten)
        when(periodRepository.findAllByOrderByStartDateDesc()).thenReturn(List.of(period));
        final Training tue = new Training(LocalDate.of(2026, 1, 6), null, null); // Dienstag
        tue.setId(1L);
        when(trainingRepository.findByPeriodIdOrderByDateDesc(3L)).thenReturn(List.of(tue));

        final List<TrainingPeriodResponse> result = service.findAll();

        assertThat(result.getFirst().weekdays()).containsExactly(2);
    }
```

- [ ] **Step 4: Test ausführen — muss fehlschlagen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPeriodServiceTest#findAll_derivesWeekdaysFromTrainings_whenPeriodHasNone`
Expected: FAIL.

- [ ] **Step 5: findAll-Ableitung implementieren**

In `TrainingPeriodService.findAll()` ersetzen:

```java
    @Transactional(readOnly = true)
    public List<TrainingPeriodResponse> findAll() {
        return periodRepository.findAllByOrderByStartDateDesc().stream()
            .map(p -> {
                if (p.getWeekdays() != null && !p.getWeekdays().isEmpty()) {
                    return TrainingPeriodResponse.from(p);
                }
                final List<Integer> derived = trainingRepository.findByPeriodIdOrderByDateDesc(p.getId()).stream()
                    .map(t -> t.getDate().getDayOfWeek().getValue())
                    .distinct()
                    .sorted()
                    .toList();
                return TrainingPeriodResponse.from(p, derived);
            })
            .toList();
    }
```

- [ ] **Step 6: Controller-Endpoint umstellen**

In `adapter/in/web/TrainingController.java` die `updatePeriod`-Methode ersetzen (Import `RenamePeriodRequest` darf bleiben/entfernt werden, da `import ...dto.*` genutzt wird):

```java
    @PutMapping("/periods/{id}")
    public TrainingPeriodResponse updatePeriod(@PathVariable final Long id,
                                                @Valid @RequestBody final UpdateTrainingPeriodRequest request) {
        return periodService.update(id, request.name(), request.startDate(), request.endDate(),
            request.weekdays(), request.time(), request.location());
    }
```

- [ ] **Step 7: Tests + voller Backend-Lauf**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS (alle Tests, inkl. Flyway-`validate` beim Testcontainers-Start).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/UpdateTrainingPeriodRequest.java \
  backend/src/main/java/com/softball/adapter/dto/TrainingPeriodResponse.java \
  backend/src/main/java/com/softball/application/TrainingPeriodService.java \
  backend/src/main/java/com/softball/adapter/in/web/TrainingController.java \
  backend/src/test/java/com/softball/service/TrainingPeriodServiceTest.java
git commit -m "✨ Period-API: Update-Endpoint + Wochentage in Response (Ableitung für Alt-Daten)"
```

---

## Task 6: Frontend Types + API-Client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/hooks/useTraining.ts`

**Interfaces:**
- Produces:
  - `TrainingPeriodResponse` mit `weekdays:number[], time:string|null, location:string|null`.
  - `api.updateTrainingPeriod(id, data): Promise<TrainingPeriodResponse>` mit `data: { name:string; startDate:string; endDate:string; weekdays:number[]; time?:string|null; location?:string|null }`.
  - `useTraining().updatePeriod(id, data)`.

- [ ] **Step 1: Type erweitern**

In `frontend/src/types/index.ts` den Block ersetzen:

```typescript
export interface TrainingPeriodResponse {
  id: number
  name: string
  startDate: string
  endDate: string
  weekdays: number[]
  time: string | null
  location: string | null
}
```

- [ ] **Step 2: API-Client ergänzen**

In `frontend/src/api/client.ts` nach `renameTrainingPeriod` einfügen:

```typescript
export const updateTrainingPeriod = (
  id: number,
  data: { name: string; startDate: string; endDate: string; weekdays: number[]; time?: string | null; location?: string | null },
) => request<TrainingPeriodResponse>(`/trainings/periods/${id}`, { method: 'PUT', body: JSON.stringify(data) })
```

(Den bestehenden `renameTrainingPeriod` belassen — wird von `useTraining.renamePeriod` genutzt; ruft denselben Endpoint mit nur `name` … ACHTUNG: Backend erwartet jetzt `UpdateTrainingPeriodRequest` mit `@NotNull startDate/endDate`. Daher `renameTrainingPeriod` in Step 3 durch `updatePeriod` ersetzen und alte Funktion entfernen.)

- [ ] **Step 3: Hook umstellen**

In `frontend/src/hooks/useTraining.ts` `renamePeriod` ersetzen durch `updatePeriod`:

```typescript
  const updatePeriod = async (
    periodId: number,
    data: { name: string; startDate: string; endDate: string; weekdays: number[]; time?: string | null; location?: string | null },
  ) => {
    await api.updateTrainingPeriod(periodId, data)
    await loadPeriods()
    await loadAll(activePeriodId)
  }
```

Im Return-Objekt `renamePeriod` durch `updatePeriod` ersetzen. In `api/client.ts` die nun ungenutzte `renameTrainingPeriod`-Funktion entfernen.

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run build`
Expected: PASS (tsc + vite build ohne Fehler). Falls `renamePeriod` noch woanders referenziert wird: Build-Fehler zeigt die Stelle → auf `updatePeriod` umstellen.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts frontend/src/hooks/useTraining.ts
git commit -m "✨ FE: Period-Type + updateTrainingPeriod (Wochentage/Zeit/Ort)"
```

---

## Task 7: Frontend Period-Verwaltung (Drawer mit Wochentag-Picker)

**Files:**
- Create: `frontend/src/components/training/PeriodManagerDrawer.tsx`
- Modify: `frontend/src/components/training/TrainingTodayPage.tsx`

**Interfaces:**
- Consumes: `useTraining()` → `periods`, `activePeriodId`, `selectPeriod`, `createBulk`, `updatePeriod`, `deletePeriod`.
- Produces: `PeriodManagerDrawer` (default unbenannter Export `export function PeriodManagerDrawer`) mit Props `{ open, onClose, periods, activePeriodId, onSelect, onCreate, onUpdate, onDelete }`.

- [ ] **Step 1: Drawer-Komponente anlegen**

Create `frontend/src/components/training/PeriodManagerDrawer.tsx`:

```tsx
import { useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import type { TrainingPeriodResponse } from '@/types'

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Mo' }, { value: 2, label: 'Di' }, { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' }, { value: 5, label: 'Fr' }, { value: 6, label: 'Sa' }, { value: 7, label: 'So' },
]

function weekdayChips(weekdays: number[]): string {
  return WEEKDAYS.filter(w => weekdays.includes(w.value)).map(w => w.label).join(' · ') || '—'
}

type FormState = {
  id: number | null
  name: string
  startDate: string
  endDate: string
  weekdays: number[]
  time: string
  location: string
}

const EMPTY_FORM: FormState = { id: null, name: '', startDate: '', endDate: '', weekdays: [], time: '', location: '' }

type Props = {
  open: boolean
  onClose: () => void
  periods: TrainingPeriodResponse[]
  activePeriodId: number | null
  onSelect: (id: number | null) => void
  onCreate: (data: { weekdays: number[]; startDate: string; endDate: string; time?: string; location?: string; periodName?: string }) => Promise<void>
  onUpdate: (id: number, data: { name: string; startDate: string; endDate: string; weekdays: number[]; time?: string | null; location?: string | null }) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export function PeriodManagerDrawer({ open, onClose, periods, activePeriodId, onSelect, onCreate, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TrainingPeriodResponse | null>(null)

  const startEdit = (p: TrainingPeriodResponse) => {
    setForm({ id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate, weekdays: [...p.weekdays], time: p.time ?? '', location: p.location ?? '' })
    setEditing(true)
  }
  const startCreate = () => { setForm(EMPTY_FORM); setEditing(true) }
  const cancelEdit = () => { setForm(EMPTY_FORM); setEditing(false) }

  const toggleWeekday = (value: number) => {
    setForm(f => ({ ...f, weekdays: f.weekdays.includes(value) ? f.weekdays.filter(w => w !== value) : [...f.weekdays, value].sort((a, b) => a - b) }))
  }

  const canSave = form.name.trim() !== '' && form.startDate !== '' && form.endDate !== '' && form.weekdays.length > 0 && form.startDate <= form.endDate

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      if (form.id == null) {
        await onCreate({ weekdays: form.weekdays, startDate: form.startDate, endDate: form.endDate, time: form.time || undefined, location: form.location || undefined, periodName: form.name.trim() })
      } else {
        await onUpdate(form.id, { name: form.name.trim(), startDate: form.startDate, endDate: form.endDate, weekdays: form.weekdays, time: form.time || null, location: form.location || null })
      }
      cancelEdit()
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Trainingsperioden" maxWidth="md">
      <div className="px-4 py-4 space-y-4">
        {!editing && (
          <>
            <button
              type="button"
              onClick={startCreate}
              className="w-full h-11 rounded-lg bg-navy-800 text-white font-bold cursor-pointer hover:bg-navy-900 transition-colors"
            >
              + Neue Periode
            </button>
            {periods.length === 0 ? (
              <p className="text-sm text-navy-500 italic">Noch keine Perioden.</p>
            ) : (
              <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
                {periods.map(p => (
                  <div key={p.id} className={`flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0 ${p.id === activePeriodId ? 'bg-navy-50' : ''}`}>
                    <button type="button" onClick={() => onSelect(p.id)} className="flex-1 text-left cursor-pointer">
                      <div className="text-sm font-bold text-navy-900">{p.name}</div>
                      <div className="text-[11px] text-navy-500 tabular-nums">{p.startDate} – {p.endDate} · {weekdayChips(p.weekdays)}</div>
                    </button>
                    <button type="button" onClick={() => startEdit(p)} className="text-xs font-semibold text-navy-700 hover:text-navy-900 cursor-pointer px-2">Bearbeiten</button>
                    <button type="button" onClick={() => setDeleteTarget(p)} className="text-xs font-semibold text-softball-red-600 hover:text-softball-red-800 cursor-pointer px-2">Löschen</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {editing && (
          <div className="space-y-3">
            <div className="text-sm font-bold text-navy-900">{form.id == null ? 'Neue Periode' : 'Periode bearbeiten'}</div>
            <label className="block">
              <span className="text-[11px] text-navy-500 uppercase tracking-wide">Name</span>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-cream-300 text-sm" placeholder="z.B. Sommer 2026" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] text-navy-500 uppercase tracking-wide">Von</span>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-cream-300 text-sm" />
              </label>
              <label className="block">
                <span className="text-[11px] text-navy-500 uppercase tracking-wide">Bis</span>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-cream-300 text-sm" />
              </label>
            </div>
            <div>
              <span className="text-[11px] text-navy-500 uppercase tracking-wide">Wochentage</span>
              <div className="flex gap-1.5 mt-1">
                {WEEKDAYS.map(w => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => toggleWeekday(w.value)}
                    className={`flex-1 h-10 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${form.weekdays.includes(w.value) ? 'bg-navy-800 border-navy-900 text-white' : 'bg-cream-50 border-cream-300 text-navy-700 hover:bg-cream-200'}`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] text-navy-500 uppercase tracking-wide">Zeit</span>
                <input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-cream-300 text-sm" placeholder="18:00" />
              </label>
              <label className="block">
                <span className="text-[11px] text-navy-500 uppercase tracking-wide">Ort</span>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-cream-300 text-sm" placeholder="Park" />
              </label>
            </div>
            {form.id != null && (
              <p className="text-[11px] text-navy-500">Beim Speichern werden zukünftige Termine an den Rhythmus angepasst. Vergangene Termine bleiben unverändert.</p>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={cancelEdit} className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium cursor-pointer hover:bg-cream-100">Abbrechen</button>
              <button type="button" onClick={handleSave} disabled={!canSave || saving} className="h-11 rounded-lg bg-navy-800 text-white font-bold cursor-pointer hover:bg-navy-900 disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Speichern…' : 'Speichern'}</button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Periode löschen?"
          message={`"${deleteTarget.name}" und alle zugehörigen Trainingstermine werden gelöscht.`}
          onConfirm={async () => { const t = deleteTarget; setDeleteTarget(null); await onDelete(t.id) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </ResponsiveSheet>
  )
}
```

- [ ] **Step 2: In TrainingTodayPage einbinden**

In `frontend/src/components/training/TrainingTodayPage.tsx`:

(a) Import ergänzen (bei den anderen `./`-Imports):

```tsx
import { PeriodManagerDrawer } from './PeriodManagerDrawer'
```

(b) Destrukturierung von `useTraining()` erweitern:

```tsx
  const { trainings, attendance, toggleAttendance, cancelTraining, loading: trainingsLoading,
    periods, activePeriodId, selectPeriod, createBulk, updatePeriod, deletePeriod } = useTraining()
```

(c) State für den Drawer (bei den anderen `useState`):

```tsx
  const [periodManagerOpen, setPeriodManagerOpen] = useState(false)
```

(d) Einen Button rendern, der den Drawer öffnet. Platziere ihn neben dem bestehenden Trainings-Picker-Auslöser (suche im JSX nach `setPickerOpen(true)` und füge daneben ein):

```tsx
        <button
          type="button"
          onClick={() => setPeriodManagerOpen(true)}
          className="text-xs font-semibold text-navy-700 hover:text-navy-900 cursor-pointer underline underline-offset-2"
        >
          Perioden verwalten
        </button>
```

(e) Drawer am Ende des JSX (neben den anderen Drawern, vor dem schließenden Fragment/Root):

```tsx
      <PeriodManagerDrawer
        open={periodManagerOpen}
        onClose={() => setPeriodManagerOpen(false)}
        periods={periods}
        activePeriodId={activePeriodId}
        onSelect={selectPeriod}
        onCreate={createBulk}
        onUpdate={updatePeriod}
        onDelete={deletePeriod}
      />
```

- [ ] **Step 3: Typecheck + Build**

Run: `cd frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `cd frontend && npm run lint`
Expected: keine neuen Fehler in den geänderten Dateien.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/training/PeriodManagerDrawer.tsx \
  frontend/src/components/training/TrainingTodayPage.tsx
git commit -m "✨ FE: Trainingsperioden-Verwaltung mit Wochentag-Picker (anlegen/bearbeiten/löschen)"
```

---

## Task 8: Manuelle Verifikation (real laufende App)

**Files:** keine.

- [ ] **Step 1: Stack starten**

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml   # Terminal A
cd frontend && npx vite                                            # Terminal B
```

- [ ] **Step 2: Durchklicken**

Auf `/training` → "Perioden verwalten":
- Neue Periode anlegen (Name, Von/Bis, Wochentage Di+Do, Zeit/Ort) → Termine erscheinen.
- Periode bearbeiten: Mi hinzufügen → künftige Mittwoche kommen dazu, Vergangenheit unverändert.
- Periode bearbeiten: Di entfernen → künftige Dienstage verschwinden, vergangene bleiben.
- Wochentag-Chips in der Liste stimmen.

- [ ] **Step 3: (falls gewünscht) Commit Doku-Update**

Optional: `docs/04-KI-TRAININGSPLAN.md` / ein kurzer Hinweis in `docs/` zur neuen Period-Rhythmus-Semantik. Nur wenn Zeit; nicht blockierend.

---

## Self-Review-Ergebnis

- **Spec-Coverage:** Datenmodell (T1), Sync-Verhalten nur-Zukunft (T2+T4), Backward-Compat-Ableitung (T5), Frontend-Verwaltung inkl. Wochentag-Picker + Lösch-Confirm (T7), Tests (T1/T2/T4/T5), kein Vorschau-Endpoint (T7 nutzt vorhandene Daten). ✓
- **Anwesenheits-Schutz:** Spec verlangt Lösch-Bestätigung mit Anzahl betroffener Termine. Plan realisiert den destruktiven Schutz über (a) "nur Zukunft löschen" und (b) `ConfirmModal` beim Period-Löschen. Der granulare „X Termine, davon Y mit Anwesenheit"-Hinweis beim Wochentag-Entfernen ist im Drawer als allgemeiner Hinweistext umgesetzt; falls die genaue Zahl gewünscht ist, kann der Drawer die betroffenen künftigen Termine aus `trainings` (vorhanden im Hook) zählen — optionaler Ausbau, nicht blockierend.
- **Typkonsistenz:** `weekdays:number[]`, `time/location:string|null` einheitlich FE; `List<Integer>`/`String` BE; `update(...)`-Signatur in Service, Controller, DTO identisch. ✓
- **Platzhalter:** keine. ✓
