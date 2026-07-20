# WhatsApp-Umfrage an Trainingstag koppeln — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Automatik-Schalter (`enabled`) einer WhatsApp-Umfrage koppelt sie fest an den nächsten gültigen Trainingstag: senden 1 Tag vorher, syncen am Trainingstag +1h, Auto-Abstellen bei Periodenwechsel.

**Architecture:** Neuer Domain-Service `CoupledPollTargetResolver` findet das Zieltraining (nächstes gültiges am Wochentag). Scheduler/DueEvaluator senden am Vortag des Zieltrainings und speichern dessen ID (`lastSentTrainingId`). `PollVoteSyncService` nutzt diese ID direkt statt des 7-Tage-Datumsfensters.

**Tech Stack:** Java 21, Spring Boot, JPA, Flyway, JUnit5 + Mockito; React/TS Frontend.

## Global Constraints

- Onion-Architektur: `domain` kennt kein Spring/JPA. Domain-Services (`CoupledPollTargetResolver`, `PollDueEvaluator`) sind plain Klassen, per `new` gebildet (kein `@Component`), wie `TargetTrainingResolver`.
- `Training.time` ist ein **String** (z.B. `"20:00"`), kein LocalTime — parsen wo nötig, unparsebar → als ganztägig behandeln (bestehende Konvention in `VotePresenceEvaluator`).
- Flyway: Schemaänderung nur als neues `V{n}__*.sql`, `ddl-auto=validate`. Letzte Migration ist V47 → neue ist **V48**.
- Backend-Tests: `./mvnw test -s .mvn/local-settings.xml`. Unit-Tests (Mockito) brauchen kein Docker; IT (Testcontainers) braucht Docker.
- Zeitzone Europe/Berlin (Clock wie in bestehenden Services).
- Kein `Co-Authored-By` in Commits; gitmoji-Prefix.

---

### Task 1: Datenfeld `lastSentTrainingId` (Migration + Model + Entity + Mapper)

**Files:**
- Create: `backend/src/main/resources/db/migration/V48__whatsapp_poll_last_sent_training.sql`
- Modify: `backend/src/main/java/com/softball/domain/model/WhatsappPoll.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/WhatsappPollEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapper.java`

**Interfaces:**
- Produces: `WhatsappPoll.getLastSentTrainingId(): Long` / `setLastSentTrainingId(Long)`.

- [ ] **Step 1: Migration schreiben**

`V48__whatsapp_poll_last_sent_training.sql`:
```sql
ALTER TABLE whatsapp_polls
  ADD COLUMN last_sent_training_id BIGINT REFERENCES trainings(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Model-Feld ergänzen** (`WhatsappPoll.java`)

Nach `private String lastSentMessageId;`:
```java
    private Long lastSentTrainingId;
```
Getter/Setter (Stil wie im File):
```java
    public Long getLastSentTrainingId() { return lastSentTrainingId; }
    public void setLastSentTrainingId(final Long v) { this.lastSentTrainingId = v; }
```

- [ ] **Step 3: Entity-Spalte ergänzen** (`WhatsappPollEntity.java`)

Nach `private String lastSentMessageId;`:
```java
    @Column(name = "last_sent_training_id")
    private Long lastSentTrainingId;
```
Plus Getter/Setter im File-Stil.

- [ ] **Step 4: Mapper ergänzen** (`WhatsappPollMapper.java`)

In `toDomain`: `p.setLastSentTrainingId(e.getLastSentTrainingId());`
In `applyScalars`: `e.setLastSentTrainingId(p.getLastSentTrainingId());`

- [ ] **Step 5: Kompilieren + bestehende Tests grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPoll*`
Expected: PASS (kompiliert, bestehende Poll-Tests unverändert grün).

- [ ] **Step 6: Commit**
```bash
git add backend/src/main/resources/db/migration/V48__whatsapp_poll_last_sent_training.sql backend/src/main/java/com/softball/domain/model/WhatsappPoll.java backend/src/main/java/com/softball/adapter/out/persistence/entity/WhatsappPollEntity.java backend/src/main/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapper.java
git commit -m "✨ WhatsappPoll: last_sent_training_id (feste Trainings-Kopplung)"
```

---

### Task 2: `CoupledPollTargetResolver` — nächstes gültiges Training am Wochentag

**Files:**
- Create: `backend/src/main/java/com/softball/domain/service/CoupledPollTargetResolver.java`
- Test: `backend/src/test/java/com/softball/domain/service/CoupledPollTargetResolverTest.java`

**Interfaces:**
- Produces: `Optional<Training> resolve(List<Training> candidates, DayOfWeek weekday, List<LocalDate> skipDates, LocalDate today)` — frühestes Training mit `date >= today`, `getDate().getDayOfWeek() == weekday`, `!isCancelled()`, `!skipDates.contains(date)`.

- [ ] **Step 1: Failing test schreiben** (`CoupledPollTargetResolverTest.java`)
```java
package com.softball.domain.service;

import com.softball.domain.model.Training;
import org.junit.jupiter.api.Test;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class CoupledPollTargetResolverTest {
    private final CoupledPollTargetResolver resolver = new CoupledPollTargetResolver();
    private final LocalDate today = LocalDate.of(2026, 7, 20); // Montag

    private Training t(long id, LocalDate d, boolean cancelled) {
        final Training tr = new Training(id, d, "20:00", "Park");
        tr.setCancelled(cancelled);
        return tr;
    }

    @Test
    void nextValidTrainingOnWeekday() {
        final Training thu = t(1, LocalDate.of(2026, 7, 23), false); // Do
        final var out = resolver.resolve(List.of(thu), DayOfWeek.THURSDAY, List.of(), today);
        assertThat(out).contains(thu);
    }

    @Test
    void skipsCancelledAndSkipDates_takesNext() {
        final Training thu1 = t(1, LocalDate.of(2026, 7, 23), true);  // Do, abgesagt
        final Training thu2 = t(2, LocalDate.of(2026, 7, 30), false); // Do, skip-date
        final Training thu3 = t(3, LocalDate.of(2026, 8, 6), false);  // Do, gültig
        final var out = resolver.resolve(List.of(thu3, thu1, thu2), DayOfWeek.THURSDAY,
                List.of(LocalDate.of(2026, 7, 30)), today);
        assertThat(out).contains(thu3);
    }

    @Test
    void emptyWhenNoFutureTrainingOnWeekday() {
        final Training mon = t(1, LocalDate.of(2026, 7, 27), false); // Mo
        final var out = resolver.resolve(List.of(mon), DayOfWeek.THURSDAY, List.of(), today);
        assertThat(out).isEmpty();
    }
}
```

- [ ] **Step 2: Test läuft, schlägt fehl (Klasse fehlt)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=CoupledPollTargetResolverTest`
Expected: FAIL (compile / cannot find symbol `CoupledPollTargetResolver`).

- [ ] **Step 3: Resolver implementieren**
```java
package com.softball.domain.service;

import com.softball.domain.model.Training;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** Findet das nächste gültige Training an einem Wochentag (für gekoppelte WhatsApp-Umfragen). */
public class CoupledPollTargetResolver {

    public Optional<Training> resolve(final List<Training> candidates, final DayOfWeek weekday,
                                      final List<LocalDate> skipDates, final LocalDate today) {
        if (candidates == null || weekday == null || today == null) return Optional.empty();
        final List<LocalDate> skips = skipDates != null ? skipDates : List.of();
        return candidates.stream()
            .filter(t -> t.getDate() != null)
            .filter(t -> !t.isCancelled())
            .filter(t -> t.getDate().getDayOfWeek() == weekday)
            .filter(t -> !t.getDate().isBefore(today))
            .filter(t -> !skips.contains(t.getDate()))
            .min(Comparator.comparing(Training::getDate));
    }
}
```

- [ ] **Step 4: Test grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=CoupledPollTargetResolverTest`
Expected: PASS (3 Tests).

- [ ] **Step 5: Commit**
```bash
git add backend/src/main/java/com/softball/domain/service/CoupledPollTargetResolver.java backend/src/test/java/com/softball/domain/service/CoupledPollTargetResolverTest.java
git commit -m "✨ CoupledPollTargetResolver: nächstes gültiges Training am Wochentag"
```

---

### Task 3: Gekoppelter Sende-Zeitpunkt (`PollDueEvaluator` + Scheduler)

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/service/PollDueEvaluator.java`
- Modify: `backend/src/main/java/com/softball/application/WhatsappPollScheduler.java`
- Test: `backend/src/test/java/com/softball/domain/service/PollDueEvaluatorTest.java` (neu oder erweitern falls vorhanden)

**Interfaces:**
- Consumes: `CoupledPollTargetResolver.resolve(...)` (Task 2), `WhatsappPoll.getLastSentTrainingId()` (Task 1).
- Produces: `PollDueEvaluator.isDue(WhatsappPoll poll, Training targetTraining, LocalDateTime now): boolean` — neue Signatur mit Zieltraining.

Neue Due-Logik (gekoppelt): senden am **Vortag des Zieltrainings** zur `poll.getTime()`, sofern noch nicht für dieses Training gesendet.

- [ ] **Step 1: Failing test** (`PollDueEvaluatorTest.java`)
```java
package com.softball.domain.service;

import com.softball.domain.model.Training;
import com.softball.domain.model.WhatsappPoll;
import org.junit.jupiter.api.Test;
import java.time.*;
import static org.assertj.core.api.Assertions.assertThat;

class PollDueEvaluatorTest {
    private final PollDueEvaluator ev = new PollDueEvaluator();

    private WhatsappPoll poll() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setEnabled(true);
        p.setWeekday(DayOfWeek.THURSDAY);
        p.setTime(LocalTime.of(18, 0));
        return p;
    }
    private Training thu() { return new Training(1L, LocalDate.of(2026, 7, 23), "20:00", "Park"); }

    @Test
    void dueOnDayBeforeTrainingAtSendTime() {
        // Mittwoch 18:00, Zieltraining Do 23.7. -> due
        assertThat(ev.isDue(poll(), thu(), LocalDateTime.of(2026, 7, 22, 18, 0))).isTrue();
    }

    @Test
    void notDueWrongDay() {
        assertThat(ev.isDue(poll(), thu(), LocalDateTime.of(2026, 7, 21, 18, 0))).isFalse();
    }

    @Test
    void notDueWrongTime() {
        assertThat(ev.isDue(poll(), thu(), LocalDateTime.of(2026, 7, 22, 17, 0))).isFalse();
    }

    @Test
    void notDueWhenNoTarget() {
        assertThat(ev.isDue(poll(), null, LocalDateTime.of(2026, 7, 22, 18, 0))).isFalse();
    }

    @Test
    void notDueWhenAlreadySentForThatTraining() {
        final WhatsappPoll p = poll();
        p.setLastSentTrainingId(1L); // schon für Training #1 gesendet
        assertThat(ev.isDue(p, thu(), LocalDateTime.of(2026, 7, 22, 18, 0))).isFalse();
    }

    @Test
    void notDueWhenDisabled() {
        final WhatsappPoll p = poll();
        p.setEnabled(false);
        assertThat(ev.isDue(p, thu(), LocalDateTime.of(2026, 7, 22, 18, 0))).isFalse();
    }
}
```

- [ ] **Step 2: Test läuft, schlägt fehl** (alte `isDue`-Signatur nimmt kein Training)

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PollDueEvaluatorTest`
Expected: FAIL (compile — Methode `isDue(poll, training, now)` fehlt).

- [ ] **Step 3: `PollDueEvaluator` neu schreiben**
```java
package com.softball.domain.service;

import com.softball.domain.model.Training;
import com.softball.domain.model.WhatsappPoll;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class PollDueEvaluator {

    /** Gekoppelt: senden am Vortag des Zieltrainings zur Umfrage-Zeit, sofern für dieses Training noch nicht gesendet. */
    public boolean isDue(final WhatsappPoll poll, final Training targetTraining, final LocalDateTime now) {
        if (poll == null || !poll.isEnabled() || poll.getWeekday() == null || poll.getTime() == null) return false;
        if (targetTraining == null || targetTraining.getDate() == null) return false;

        final LocalDate sendDate = targetTraining.getDate().minusDays(1);
        if (!now.toLocalDate().equals(sendDate)) return false;
        if (now.getHour() != poll.getTime().getHour() || now.getMinute() != poll.getTime().getMinute()) return false;

        // Dedup: nicht erneut für dasselbe Zieltraining senden
        if (poll.getLastSentTrainingId() != null && poll.getLastSentTrainingId().equals(targetTraining.getId())) return false;
        return true;
    }
}
```
Hinweis: `skipDates` wird NICHT mehr hier geprüft — das erledigt der Resolver (das Zieltraining ist bereits gültig).

- [ ] **Step 4: Test grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PollDueEvaluatorTest`
Expected: PASS.

- [ ] **Step 5: Scheduler anpassen** (`WhatsappPollScheduler.java`)

Konstruktor: `CoupledPollTargetResolver` + `TrainingRepository` ergänzen (wie `PollDueEvaluator` per `new` im Default-Konstruktor; `TrainingRepository` per DI). `tick`:
```java
public void tick(final LocalDateTime now) {
    final List<Training> trainings = trainingRepo.findAllByOrderByDateDesc();
    for (final WhatsappPoll poll : repository.findAll()) {
        final Optional<Training> target = resolver.resolve(trainings, poll.getWeekday(), poll.getSkipDates(), now.toLocalDate());
        if (target.isEmpty() || !evaluator.isDue(poll, target.get(), now)) continue;
        try {
            final String messageId = sender.sendPoll(poll.getGroupId(), poll.getTitle(), poll.getOptions(), poll.isAllowMultipleAnswers(), poll.getMessage());
            poll.setLastSentAt(now);
            poll.setLastSentMessageId(messageId);
            poll.setLastSentTrainingId(target.get().getId());   // feste Kopplung
            repository.save(poll);
            log.info("Gekoppelter WhatsApp-Poll gesendet: {} ({}) → Training {}", poll.getTitle(), poll.getId(), target.get().getId());
        } catch (final Exception e) {
            log.warn("WhatsApp-Poll fehlgeschlagen: {} ({}): {}", poll.getTitle(), poll.getId(), e.getMessage());
        }
    }
}
```
Default-Konstruktor: `new CoupledPollTargetResolver()`, `TrainingRepository` injizieren. Imports ergänzen (`Training`, `CoupledPollTargetResolver`, `TrainingRepository`, `List`, `Optional`).

- [ ] **Step 6: Scheduler-Tests grün** (falls `WhatsappPollSchedulerTest` existiert, an neue Signatur anpassen)

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollScheduler*,PollDueEvaluatorTest`
Expected: PASS (bestehende Scheduler-Tests an Resolver/TrainingRepo-Mock anpassen: Zieltraining mocken).

- [ ] **Step 7: Commit**
```bash
git add backend/src/main/java/com/softball/domain/service/PollDueEvaluator.java backend/src/main/java/com/softball/application/WhatsappPollScheduler.java backend/src/test/java/com/softball/domain/service/PollDueEvaluatorTest.java
git commit -m "✨ Poll-Versand koppelt an Zieltraining (Vortag), speichert Training-ID"
```

---

### Task 4: `sendNow` (manuelles Senden) koppelt ebenfalls

**Files:**
- Modify: `backend/src/main/java/com/softball/application/WhatsappPollService.java`
- Test: `backend/src/test/java/com/softball/application/WhatsappPollServiceTest.java` (erweitern)

**Interfaces:**
- Consumes: `CoupledPollTargetResolver`, `TrainingRepository`, `WhatsappPoll.setLastSentTrainingId(...)`.

- [ ] **Step 1: Failing test** — `sendNow` speichert `lastSentTrainingId` des nächsten gültigen Trainings.
```java
@Test
void sendNow_setsLastSentTrainingId() {
    // Poll (Do), ein gültiges Do-Training #7 in der Zukunft gemockt
    // erwartet: nach sendNow ist poll.lastSentTrainingId == 7
}
```
(Test analog zu bestehenden `WhatsappPollServiceTest`-Mocks aufbauen: `sender.sendPoll(...)` → messageId; `trainingRepo.findAllByOrderByDateDesc()` → [Do-Training #7]; verify `save` mit `lastSentTrainingId==7`.)

- [ ] **Step 2: Test läuft, schlägt fehl**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollServiceTest#sendNow_setsLastSentTrainingId`
Expected: FAIL.

- [ ] **Step 3: `sendNow` anpassen**

`WhatsappPollService` bekommt `CoupledPollTargetResolver` (per `new`) + `TrainingRepository` (DI). In `sendNow(id)` nach erfolgreichem `sender.sendPoll(...)`:
```java
resolver.resolve(trainingRepo.findAllByOrderByDateDesc(), poll.getWeekday(), poll.getSkipDates(), LocalDate.now(clock))
    .ifPresent(t -> poll.setLastSentTrainingId(t.getId()));
```
(vor `repository.save(poll)`; `lastSentAt`/`lastSentMessageId` wie bisher).

- [ ] **Step 4: Test grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollServiceTest`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/src/main/java/com/softball/application/WhatsappPollService.java backend/src/test/java/com/softball/application/WhatsappPollServiceTest.java
git commit -m "✨ sendNow koppelt an nächstes gültiges Training"
```

---

### Task 5: Sync nutzt `lastSentTrainingId` + Gate Trainingsstart +1h

**Files:**
- Modify: `backend/src/main/java/com/softball/application/PollVoteSyncService.java`
- Modify: `backend/src/main/java/com/softball/domain/service/VotePresenceEvaluator.java` (Gate +1h)
- Test: `backend/src/test/java/com/softball/application/PollVoteSyncServiceTest.java` (erweitern/anpassen)
- Test: `backend/src/test/java/com/softball/domain/service/VotePresenceEvaluatorTest.java` (Gate +1h)

**Interfaces:**
- Consumes: `WhatsappPoll.getLastSentTrainingId()`, `TrainingRepository.findById(...)`.
- Produces: `VotePresenceEvaluator.gateOpen(String trainingTime, LocalDateTime now, LocalDate trainingDate, int offsetHours)` — Gate erst ab `trainingTime + offsetHours` am Trainingstag (unparsebare Zeit → ganztägig wie bisher).

- [ ] **Step 1: `VotePresenceEvaluator.gateOpen` Test (+1h)**

Lies zuerst die aktuelle `gateOpen`-Signatur/Impl. Neuer Test: bei `offsetHours=1`, Trainingszeit `"20:00"`, `now` = Trainingstag 20:30 → **geschlossen**; 21:00 → **offen**.

- [ ] **Step 2: `gateOpen` um `offsetHours` erweitern**

Bestehende Zeit-Parse-Logik beibehalten; nach dem Parsen `trainingStart = parsed.plusHours(offsetHours)` vergleichen. Bestehende Aufrufer (falls im ungekoppelten Sync-Pfad) mit `offsetHours=0` aufrufen ODER überladene Methode `gateOpen(time, now, date)` → `gateOpen(time, now, date, 0)`.

- [ ] **Step 3: `PollVoteSyncService.sync` gekoppelten Pfad einbauen**

In `sync(...)` den Block „Zieltraining bestimmen" ersetzen: statt `resolver.resolve(trainings, poll.getLastSentAt().toLocalDate())` →
```java
if (!poll.isEnabled() || poll.getLastSentMessageId() == null || poll.getLastSentTrainingId() == null) continue;
final Training training = trainingRepo.findById(poll.getLastSentTrainingId()).orElse(null);
if (training == null || training.isCancelled()) continue;
if (enforceGate && !evaluator.gateOpen(training.getTime(), now, training.getDate(), 1)) continue;
```
Rest (fetchVotes, mirror/additiv, buchen, upsertVote) unverändert. `TargetTrainingResolver` aus diesem Service entfernen (wird nicht mehr gebraucht — prüfen ob noch woanders genutzt; falls nein, Feld/Import entfernen).

- [ ] **Step 4: Sync-Tests anpassen**

Bestehende `PollVoteSyncServiceTest`-Setups: statt `trainingRepo.findAllByOrderByDateDesc()` nun `poll.setLastSentTrainingId(10L)` + `trainingRepo.findById(10L) → training`. Gate-Tests auf +1h umstellen (Trainingszeit "20:00" → `now` 21:00 = offen). Mirror-/additiv-Tests bleiben inhaltlich gleich.

- [ ] **Step 5: Alle betroffenen Tests grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PollVoteSyncServiceTest,VotePresenceEvaluatorTest`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add backend/src/main/java/com/softball/application/PollVoteSyncService.java backend/src/main/java/com/softball/domain/service/VotePresenceEvaluator.java backend/src/test/java/com/softball/application/PollVoteSyncServiceTest.java backend/src/test/java/com/softball/domain/service/VotePresenceEvaluatorTest.java
git commit -m "✨ Sync nutzt feste Training-Kopplung + Gate Trainingsstart+1h"
```

---

### Task 6: Frontend — Labels + Hinweis (Automatik = an Training gekoppelt)

**Files:**
- Modify: `frontend/src/components/orga/WhatsappPollPage.tsx`
- (evtl.) Modify: `frontend/src/hooks/useWhatsappPoll.ts` (keine API-Änderung nötig — Request/Response-Felder unverändert)

**Interfaces:** keine API-Änderung (weekday/time/enabled bleiben). Nur UI-Texte/Labels.

- [ ] **Step 1: Labels + Hinweistext anpassen**

Im Umfrage-Formular:
- `weekday`-Label → **"Trainingstag"** (statt "Wochentag").
- `time`-Label → **"Sende-Uhrzeit (am Vortag)"**.
- `enabled`-Toggle-Label/Hilfetext → **"Automatisch senden — an den Trainingstag gekoppelt (sendet 1 Tag vorher, bucht Anwesenheit am Trainingstag)."**
- Optional Hinweis: "Kein Training an diesem Wochentag in der Periode → Umfrage pausiert automatisch."

- [ ] **Step 2: Build/Typecheck grün**

Run: `cd frontend && npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/orga/WhatsappPollPage.tsx
git commit -m "🎨 WhatsApp-Umfrage: Labels an Trainings-Kopplung (Trainingstag, Vortag-Zeit)"
```

---

### Task 7: Verifikation end-to-end

- [ ] **Step 1: Volle Test-Suite (Docker läuft)**

Run: `docker compose up -d db && cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS (inkl. IT).

- [ ] **Step 2: Frontend build**

Run: `cd frontend && npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Merge + Deploy** (nach User-Freigabe; Deploy verifiziert Migration V48 gegen `ddl-auto=validate`).

- [ ] **Step 4: Prod-Rauchtest** — eine gekoppelte Umfrage: Zieltraining prüfen, am Vortag Sende-Zeitpunkt, Sync +1h.

---

## Self-Review-Notizen

- **Spec-Abdeckung:** Feld `lastSentTrainingId` (T1), Zieltraining-Resolver mit cancelled+skipDates (T2), Senden Vortag + Auto-Abstellen + feste Kopplung (T3), sendNow koppelt (T4), Sync via ID + Gate +1h + Absage-nachher (T5), Frontend-Labels (T6). Alle Spec-Punkte abgedeckt.
- **Offene Prüfpunkte für den Implementierer:** exakte `VotePresenceEvaluator.gateOpen`-Signatur (Task 5 Step 1 zuerst lesen); ob `TargetTrainingResolver` nach dem Umbau noch irgendwo referenziert wird (sonst entfernen); ob ein `WhatsappPollSchedulerTest` existiert (Signatur-Anpassung).
- **Ungekoppelter Modus entfällt:** `PollDueEvaluator.isDue(poll, now)` alte Signatur wird ersetzt — alle Aufrufer (nur Scheduler) migrieren auf die neue.
