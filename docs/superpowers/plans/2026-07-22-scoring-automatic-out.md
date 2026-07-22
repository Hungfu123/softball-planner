# Automatisches Aus (Legacy Scoring) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Tap auf die Outs-Dots (oben rechts in der Legacy-`ScoringPage`) bucht nach Confirm ein persistiertes, undo-bares „automatisches Aus", das im aktuellen Inning mitzählt, ohne dem Batter zugerechnet zu werden.

**Architecture:** Neues Domain-Event `AutomaticOutEvent` (1:1 nach Muster `InningAdvanceEvent`, kein Player/BaseState). Zählt im `ScoreboardResponse.outsInCurrentInning` mit, integriert in die chronologische Undo-Kette, wird bei `deleteCurrentInning`/`resetScoring` mitgelöscht. Frontend baut die bestehende cosmetic `extraOuts`-Geste zu einem echten Backend-Call um.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway (PostgreSQL, Testcontainers), React 19 + TS, Vite, Playwright.

## Global Constraints

- Onion/Hexagonal: `domain` kennt kein Spring/JPA; `application` nur `domain`; `*RepositoryAdapter` implementiert Port. Keine Schichtverletzung.
- Maven immer mit `-s .mvn/local-settings.xml`. `~/.m2/settings.xml` NICHT anfassen.
- Testcontainers braucht laufenden Docker-Daemon (`docker compose up -d db` für e2e).
- Schema-Änderungen nur via neuer `V{n}__*.sql`; `ddl-auto=validate`. Nächste freie Version: **V50**.
- Commits: Conventional + gitmoji, **kein** `Co-Authored-By`. Nur gezielt per Pfad stagen (kein `git add -A`).
- Deutsch in aller UI-Copy und Toasts.
- Sandbox bwrap ist kaputt → read-only Bash mit `dangerouslyDisableSandbox`.

---

### Task 1: Persistenz-Layer + Migration für `AutomaticOutEvent`

Scaffolding — alle Schichten für das neue Event, plus Verdrahtung in `GameScoringService` (Konstruktor-Param, noch ungenutzt) damit es kompiliert. Kein Verhalten. Gate: App bootet, Flyway migriert, `ddl-auto=validate` passt (bewiesen durch einen Testcontainers-Integrationstest).

**Files:**
- Create: `backend/src/main/resources/db/migration/V50__automatic_out_event.sql`
- Create: `backend/src/main/java/com/softball/domain/model/AutomaticOutEvent.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/AutomaticOutEventRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/AutomaticOutEventEntity.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/AutomaticOutEventMapper.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringAutomaticOutEventRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/AutomaticOutEventRepositoryAdapter.java`
- Modify: `backend/src/main/java/com/softball/application/GameScoringService.java` (Konstruktor + Feld)
- Modify: `backend/src/test/java/com/softball/application/GameScoringServiceTest.java` (neues `@Mock`-Feld)

**Interfaces:**
- Produces:
  - `AutomaticOutEvent(Game game, Integer inning, String createdBy)` + Getter/Setter für `id, game, inning, createdAt, createdBy`
  - `interface AutomaticOutEventRepository { List<AutomaticOutEvent> findByGameIdOrderByCreatedAtAsc(Long gameId); AutomaticOutEvent save(AutomaticOutEvent e); void deleteById(Long id); }`
  - `GameScoringService`-Feld `private final AutomaticOutEventRepository automaticOutEventRepository;`

- [ ] **Step 1: Migration schreiben**

`backend/src/main/resources/db/migration/V50__automatic_out_event.sql`:

```sql
CREATE TABLE automatic_out_events (
    id          BIGSERIAL PRIMARY KEY,
    game_id     BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    inning      INTEGER NOT NULL CHECK (inning >= 1),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(64) NOT NULL DEFAULT 'unknown'
);

CREATE INDEX idx_automatic_out_events_game_id ON automatic_out_events(game_id);
CREATE INDEX idx_automatic_out_events_game_created ON automatic_out_events(game_id, created_at);
```

- [ ] **Step 2: Domain-Model**

`domain/model/AutomaticOutEvent.java`:

```java
package com.softball.domain.model;

import java.time.Instant;

public class AutomaticOutEvent {
    private Long id;
    private Game game;
    private Integer inning;
    private Instant createdAt;
    private String createdBy;

    public AutomaticOutEvent() {}

    public AutomaticOutEvent(final Game game, final Integer inning, final String createdBy) {
        this.game = game;
        this.inning = inning;
        this.createdBy = createdBy;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Game getGame() { return game; }
    public void setGame(final Game game) { this.game = game; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }
}
```

- [ ] **Step 3: Port**

`domain/port/out/AutomaticOutEventRepository.java`:

```java
package com.softball.domain.port.out;

import com.softball.domain.model.AutomaticOutEvent;
import java.util.List;

public interface AutomaticOutEventRepository {
    List<AutomaticOutEvent> findByGameIdOrderByCreatedAtAsc(Long gameId);
    AutomaticOutEvent save(AutomaticOutEvent event);
    void deleteById(Long id);
}
```

- [ ] **Step 4: Entity**

`adapter/out/persistence/entity/AutomaticOutEventEntity.java`:

```java
package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "automatic_out_events")
public class AutomaticOutEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    @JsonIgnore
    private GameEntity game;

    @Column(name = "inning", nullable = false)
    private Integer inning;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", nullable = false, length = 64)
    private String createdBy;

    public AutomaticOutEventEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameEntity getGame() { return game; }
    public void setGame(final GameEntity game) { this.game = game; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
```

- [ ] **Step 5: Mapper**

`adapter/out/persistence/mapper/AutomaticOutEventMapper.java`:

```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.AutomaticOutEventEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.domain.model.AutomaticOutEvent;
import com.softball.domain.model.Game;
import org.springframework.stereotype.Component;

@Component
public class AutomaticOutEventMapper {

    public AutomaticOutEvent toDomain(final AutomaticOutEventEntity entity) {
        if (entity == null) return null;
        final Game game = new Game();
        game.setId(entity.getGame().getId());
        final AutomaticOutEvent event = new AutomaticOutEvent(game, entity.getInning(), entity.getCreatedBy());
        event.setId(entity.getId());
        event.setCreatedAt(entity.getCreatedAt());
        return event;
    }

    public AutomaticOutEventEntity toEntity(final AutomaticOutEvent domain, final GameEntity gameEntity) {
        final AutomaticOutEventEntity entity = new AutomaticOutEventEntity();
        entity.setId(domain.getId());
        entity.setGame(gameEntity);
        entity.setInning(domain.getInning());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setCreatedBy(domain.getCreatedBy());
        return entity;
    }
}
```

- [ ] **Step 6: Spring-Repo**

`adapter/out/persistence/repository/SpringAutomaticOutEventRepository.java`:

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.AutomaticOutEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpringAutomaticOutEventRepository extends JpaRepository<AutomaticOutEventEntity, Long> {

    @Query("SELECT e FROM AutomaticOutEventEntity e WHERE e.game.id = :gameId ORDER BY e.createdAt ASC")
    List<AutomaticOutEventEntity> findByGameIdOrderByCreatedAtAsc(Long gameId);
}
```

- [ ] **Step 7: Adapter**

`adapter/out/persistence/adapter/AutomaticOutEventRepositoryAdapter.java`:

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.mapper.AutomaticOutEventMapper;
import com.softball.adapter.out.persistence.repository.SpringAutomaticOutEventRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.domain.model.AutomaticOutEvent;
import com.softball.domain.port.out.AutomaticOutEventRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class AutomaticOutEventRepositoryAdapter implements AutomaticOutEventRepository {

    private final SpringAutomaticOutEventRepository repo;
    private final SpringGameRepository gameRepo;
    private final AutomaticOutEventMapper mapper;

    public AutomaticOutEventRepositoryAdapter(final SpringAutomaticOutEventRepository repo,
                                              final SpringGameRepository gameRepo,
                                              final AutomaticOutEventMapper mapper) {
        this.repo = repo;
        this.gameRepo = gameRepo;
        this.mapper = mapper;
    }

    @Override
    public List<AutomaticOutEvent> findByGameIdOrderByCreatedAtAsc(final Long gameId) {
        return repo.findByGameIdOrderByCreatedAtAsc(gameId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public AutomaticOutEvent save(final AutomaticOutEvent event) {
        final GameEntity gameEntity = gameRepo.getReferenceById(event.getGame().getId());
        return mapper.toDomain(repo.save(mapper.toEntity(event, gameEntity)));
    }

    @Override
    @Transactional
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
}
```

- [ ] **Step 8: `GameScoringService`-Konstruktor erweitern**

In `application/GameScoringService.java`: Feld + Konstruktor-Param ergänzen (analog `inningAdvanceEventRepository`).

Feld (bei den anderen `private final ...Repository` Feldern, ~Zeile 37):

```java
    private final com.softball.domain.port.out.AutomaticOutEventRepository automaticOutEventRepository;
```

Konstruktor-Signatur um letzten Parameter erweitern und zuweisen:

```java
    public GameScoringService(final GameRepository gameRepository,
                               final PlayerRepository playerRepository,
                               final LineupEntryRepository lineupEntryRepository,
                               final AtBatRepository atBatRepository,
                               final BaseRunningEventRepository stealingRepository,
                               final SubstitutionRepository substitutionRepository,
                               final com.softball.domain.port.out.InningAdvanceEventRepository inningAdvanceEventRepository,
                               final com.softball.domain.port.out.AutomaticOutEventRepository automaticOutEventRepository) {
        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.atBatRepository = atBatRepository;
        this.stealingRepository = stealingRepository;
        this.substitutionRepository = substitutionRepository;
        this.inningAdvanceEventRepository = inningAdvanceEventRepository;
        this.automaticOutEventRepository = automaticOutEventRepository;
    }
```

- [ ] **Step 9: Test-Mock ergänzen (damit bestehende Unit-Tests grün bleiben)**

In `backend/src/test/java/com/softball/application/GameScoringServiceTest.java` neben den anderen `@Mock`-Feldern:

```java
    @Mock private com.softball.domain.port.out.AutomaticOutEventRepository automaticOutEventRepository;
```

(`@InjectMocks` verdrahtet den neuen Konstruktor-Param automatisch.)

- [ ] **Step 10: Boot-/Schema-Gate laufen lassen**

Docker muss laufen. Run:

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringScenarioTest
```

Expected: BUILD SUCCESS. Beweist: Flyway migriert V50, Hibernate `validate` matcht die neue Tabelle, Context lädt mit dem neuen Bean.

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/resources/db/migration/V50__automatic_out_event.sql \
        backend/src/main/java/com/softball/domain/model/AutomaticOutEvent.java \
        backend/src/main/java/com/softball/domain/port/out/AutomaticOutEventRepository.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/AutomaticOutEventEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/mapper/AutomaticOutEventMapper.java \
        backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringAutomaticOutEventRepository.java \
        backend/src/main/java/com/softball/adapter/out/persistence/adapter/AutomaticOutEventRepositoryAdapter.java \
        backend/src/main/java/com/softball/application/GameScoringService.java \
        backend/src/test/java/com/softball/application/GameScoringServiceTest.java
git commit -m "✨ AutomaticOutEvent Persistenz-Layer + V50-Migration"
```

---

### Task 2: `recordAutomaticOut` + Scoreboard-Zählung (TDD)

Service-Methode + `outsInCurrentInning` inkl. Auto-Outs, DRY über einen Helper. Reiner Mockito-Unit-Test.

**Files:**
- Modify: `backend/src/main/java/com/softball/application/GameScoringService.java`
- Test: `backend/src/test/java/com/softball/application/GameScoringServiceTest.java`

**Interfaces:**
- Consumes: `automaticOutEventRepository` (Task 1)
- Produces:
  - `public void recordAutomaticOut(Long gameId)` — bucht Auto-Aus im aktuellen Inning; wirft `BusinessValidationException` wenn bereits 3 Outs.
  - Privater Helper `private int outsInInning(List<AtBat> atBats, List<BaseRunningEvent> stealingEvents, List<AutomaticOutEvent> autoOuts, int inning)`

- [ ] **Step 1: Failing Tests schreiben**

In `GameScoringServiceTest.java` ans Ende der Klasse (vor der schließenden `}`) einfügen. `import com.softball.shared.exception.BusinessValidationException;` oben ergänzen falls nicht vorhanden.

```java
    @Test
    void automaticOut_incrementsOutsWithoutRotatingBatter() {
        mockGame();
        final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(automaticOutEventRepository.findByGameIdOrderByCreatedAtAsc(1L))
            .thenReturn(List.of(autoOut(1L, 1)));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.outsInCurrentInning()).isEqualTo(1);
    }

    @Test
    void automaticOut_recordsEventInCurrentInning() {
        mockGame();
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(automaticOutEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
        when(automaticOutEventRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.recordAutomaticOut(1L);

        final ArgumentCaptor<AutomaticOutEvent> captor = ArgumentCaptor.forClass(AutomaticOutEvent.class);
        verify(automaticOutEventRepository).save(captor.capture());
        assertThat(captor.getValue().getInning()).isEqualTo(1);
    }

    @Test
    void automaticOut_rejectedWhenThreeOutsAlready() {
        mockGame();
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(
            atBat(1, 1, hung, AtBatResult.STRIKEOUT, BaseState.empty()),
            atBat(2, 1, anne, AtBatResult.STRIKEOUT, BaseState.empty()),
            atBat(3, 1, khang, AtBatResult.STRIKEOUT, BaseState.empty())
        ));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(automaticOutEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.recordAutomaticOut(1L))
            .isInstanceOf(BusinessValidationException.class);
        verify(automaticOutEventRepository, never()).save(any());
    }
```

Test-Helper ans Klassenende (falls `autoOut(...)` noch nicht existiert):

```java
    private AutomaticOutEvent autoOut(final Long id, final int inning) {
        final AutomaticOutEvent e = new AutomaticOutEvent(game, inning, "test");
        e.setId(id);
        e.setCreatedAt(Instant.now());
        return e;
    }
```

Fehlende statische Imports oben in der Testdatei ergänzen (einige existieren evtl. schon — dann überspringen):

```java
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import org.mockito.ArgumentCaptor;
```

- [ ] **Step 2: Tests laufen — müssen fehlschlagen**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameScoringServiceTest
```

Expected: FAIL — `recordAutomaticOut` existiert nicht (Compile-Error) bzw. `outsInCurrentInning` == 0.

- [ ] **Step 3: Helper + Scoreboard-Zählung implementieren**

In `getScoreboard` die Auto-Outs laden und in `outsInCurrent` einrechnen. Der bestehende Block (ca. Zeile 357–371) berechnet `atBatOuts`, `runnerOuts`, `outsInCurrent`. Ersetze die Berechnung von `outsInCurrent` so, dass Auto-Outs dazukommen. Direkt nach dem Laden von `stealingEvents`/vor der Rückgabe die Events laden:

```java
        final List<AutomaticOutEvent> autoOutEvents = automaticOutEventRepository.findByGameIdOrderByCreatedAtAsc(gameId);
```

und die Zeile

```java
        final int outsInCurrent = atBatOuts + runnerOuts;
```

ersetzen durch

```java
        final int autoOuts = (int) autoOutEvents.stream()
            .filter(e -> e.getInning() != null && e.getInning() == currentInning)
            .count();
        final int outsInCurrent = atBatOuts + runnerOuts + autoOuts;
```

- [ ] **Step 4: `recordAutomaticOut` implementieren**

Neue Methode (z.B. direkt nach `advanceInning`) in `GameScoringService`:

```java
    @Transactional
    public void recordAutomaticOut(final Long gameId) {
        final Game game = findGame(gameId);

        final List<AtBat> atBats = atBatRepository.findByGameIdOrderBySequenceAsc(gameId);
        final List<BaseRunningEvent> stealings = stealingRepository.findByGameIdOrderByIdAsc(gameId);
        final List<AutomaticOutEvent> autoOuts = automaticOutEventRepository.findByGameIdOrderByCreatedAtAsc(gameId);

        final int lastABInning = atBats.stream()
            .mapToInt(a -> a.getInning() != null ? a.getInning() : 1)
            .max().orElse(1);
        final int lastEventInning = inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(gameId).stream()
            .mapToInt(e -> e.getToInning() != null ? e.getToInning() : 1)
            .max().orElse(1);
        final int currentInning = Math.max(lastABInning, lastEventInning);

        if (outsInInning(atBats, stealings, autoOuts, currentInning) >= 3) {
            throw new com.softball.shared.exception.BusinessValidationException(
                "Inning hat bereits 3 Outs — kein automatisches Aus möglich");
        }

        final AutomaticOutEvent event = new AutomaticOutEvent(game, currentInning, currentUser());
        automaticOutEventRepository.save(event);
        log.info("Automatisches Aus gebucht für Game {} in Inning {}", gameId, currentInning);
    }

    private int outsInInning(final List<AtBat> atBats,
                             final List<BaseRunningEvent> stealingEvents,
                             final List<AutomaticOutEvent> autoOuts,
                             final int inning) {
        final int abOuts = (int) atBats.stream()
            .filter(a -> a.getInning() != null && a.getInning() == inning)
            .filter(a -> a.getResult() != null && a.getResult().isOut())
            .count();
        final int runnerOuts = (int) stealingEvents.stream()
            .filter(e -> e.getType() == BaseRunningEventType.CAUGHT_STEALING
                      || e.getType() == BaseRunningEventType.OUT_ON_PLAY
                      || e.getType() == BaseRunningEventType.PICKOFF)
            .filter(e -> e.getInning() != null && e.getInning() == inning)
            .count();
        final int autoOutCount = (int) autoOuts.stream()
            .filter(e -> e.getInning() != null && e.getInning() == inning)
            .count();
        return abOuts + runnerOuts + autoOutCount;
    }
```

- [ ] **Step 5: Tests laufen — müssen grün sein**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameScoringServiceTest
```

Expected: PASS (alle inkl. der 3 neuen).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/application/GameScoringService.java \
        backend/src/test/java/com/softball/application/GameScoringServiceTest.java
git commit -m "✨ recordAutomaticOut + Auto-Aus in Scoreboard-Out-Zählung"
```

---

### Task 3: Undo-Integration + Cleanup bei Reset/Delete-Inning (TDD)

Auto-Aus in die chronologische Undo-Kette und in `deleteCurrentInning`/`resetScoring`.

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/UndoResultResponse.java`
- Modify: `backend/src/main/java/com/softball/application/GameScoringService.java`
- Test: `backend/src/test/java/com/softball/application/GameScoringServiceTest.java`

**Interfaces:**
- Consumes: `automaticOutEventRepository`, `UndoResultResponse` (Task 1)
- Produces: `UndoResultResponse.UndoType.AUTOMATIC_OUT`, `UndoResultResponse.automaticOut(Long id)`

- [ ] **Step 1: Failing Test schreiben**

In `GameScoringServiceTest.java`:

```java
    @Test
    void undo_removesNewestAutomaticOut() {
        mockGame();
        final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
        ab.setCreatedAt(Instant.parse("2026-07-22T10:00:00Z"));
        final AutomaticOutEvent auto = autoOut(5L, 1);
        auto.setCreatedAt(Instant.parse("2026-07-22T10:05:00Z")); // jünger als AB

        when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());
        when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
        when(automaticOutEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(auto));

        final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

        assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.AUTOMATIC_OUT);
        assertThat(result.removedId()).isEqualTo(5L);
        verify(automaticOutEventRepository).deleteById(5L);
    }
```

- [ ] **Step 2: Test laufen — muss fehlschlagen**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameScoringServiceTest#undo_removesNewestAutomaticOut
```

Expected: FAIL (Compile-Error `AUTOMATIC_OUT`/`automaticOut` fehlen).

- [ ] **Step 3: `UndoResultResponse` erweitern**

`adapter/dto/UndoResultResponse.java`: Enum-Wert + Factory:

```java
    public enum UndoType { AT_BAT, STEALING, SUBSTITUTION, INNING_ADVANCE, AUTOMATIC_OUT, NONE }
```

und Factory-Methode ergänzen:

```java
    public static UndoResultResponse automaticOut(final Long id) {
        return new UndoResultResponse(UndoType.AUTOMATIC_OUT, id);
    }
```

- [ ] **Step 4: `undoLastAction` erweitern**

In `GameScoringService.undoLastAction` — Auto-Outs laden, `newestAutoOut` berechnen, in den Null-Check + alle Vorrang-Guards aufnehmen, `if (newestEvent != null)` zu `eventIsNewest` umbauen und Auto-Out-Branch anhängen.

Nach dem Laden von `allInningEvents` ergänzen:

```java
        final java.util.List<AutomaticOutEvent> allAutoOuts = automaticOutEventRepository.findByGameIdOrderByCreatedAtAsc(gameId);
```

Nach `newestEvent` ergänzen:

```java
        final java.time.Instant newestAutoOut = allAutoOuts.stream()
            .map(AutomaticOutEvent::getCreatedAt)
            .filter(java.util.Objects::nonNull)
            .max(java.time.Instant::compareTo)
            .orElse(null);
```

Null-Check ersetzen:

```java
        if (newestAB == null && newestStealing == null && newestSub == null
                && newestEvent == null && newestAutoOut == null) {
            return com.softball.adapter.dto.UndoResultResponse.none();
        }
```

`abIsNewest` um Auto-Out-Guard erweitern:

```java
        final boolean abIsNewest = newestAB != null
            && (newestStealing == null || !newestStealing.isAfter(newestAB))
            && (newestSub == null || !newestSub.isAfter(newestAB))
            && (newestEvent == null || !newestEvent.isAfter(newestAB))
            && (newestAutoOut == null || !newestAutoOut.isAfter(newestAB));
```

`stealingIsNewest` erweitern:

```java
        final boolean stealingIsNewest = newestStealing != null
            && (newestSub == null || !newestSub.isAfter(newestStealing))
            && (newestEvent == null || !newestEvent.isAfter(newestStealing))
            && (newestAutoOut == null || !newestAutoOut.isAfter(newestStealing));
```

`subIsNewest` erweitern:

```java
        final boolean subIsNewest = newestSub != null
            && (newestEvent == null || !newestEvent.isAfter(newestSub))
            && (newestAutoOut == null || !newestAutoOut.isAfter(newestSub));
```

Den bestehenden Inning-Advance-Branch von `if (newestEvent != null) {` auf einen Guard umstellen, damit Auto-Out gewinnen kann. Die Zeile

```java
        if (newestEvent != null) {
```

ersetzen durch

```java
        final boolean eventIsNewest = newestEvent != null
            && (newestAutoOut == null || !newestAutoOut.isAfter(newestEvent));
        if (eventIsNewest) {
```

Direkt vor dem abschließenden `return com.softball.adapter.dto.UndoResultResponse.none();` den Auto-Out-Branch anhängen:

```java
        if (newestAutoOut != null) {
            final AutomaticOutEvent latest = allAutoOuts.stream()
                .filter(e -> e.getCreatedAt() != null)
                .max(java.util.Comparator.comparing(AutomaticOutEvent::getCreatedAt))
                .orElseThrow();
            automaticOutEventRepository.deleteById(latest.getId());
            return com.softball.adapter.dto.UndoResultResponse.automaticOut(latest.getId());
        }
```

- [ ] **Step 5: Cleanup in `deleteCurrentInning` + `resetScoring`**

In `deleteCurrentInning`, nachdem `currentInning` bestimmt ist und ABs/Steals gelöscht wurden, Auto-Outs des aktuellen Innings mitlöschen:

```java
        for (final AutomaticOutEvent e : automaticOutEventRepository.findByGameIdOrderByCreatedAtAsc(gameId)) {
            if (e.getInning() != null && e.getInning() == currentInning) {
                automaticOutEventRepository.deleteById(e.getId());
            }
        }
```

In `resetScoring`, bei den anderen Lösch-Schleifen (z.B. nach dem Löschen der `inningEvents`):

```java
        for (final AutomaticOutEvent e : automaticOutEventRepository.findByGameIdOrderByCreatedAtAsc(gameId)) {
            automaticOutEventRepository.deleteById(e.getId());
        }
```

- [ ] **Step 6: Tests laufen — grün**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameScoringServiceTest
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/UndoResultResponse.java \
        backend/src/main/java/com/softball/application/GameScoringService.java \
        backend/src/test/java/com/softball/application/GameScoringServiceTest.java
git commit -m "✨ Auto-Aus in Undo-Kette + Reset/Delete-Inning-Cleanup"
```

---

### Task 4: REST-Endpoint

`POST /api/games/{gameId}/scoring/automatic-out`.

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/in/web/ScoringController.java`

**Interfaces:**
- Consumes: `GameScoringService.recordAutomaticOut(Long)` (Task 2)
- Produces: HTTP `POST /api/games/{gameId}/scoring/automatic-out` → 204 No Content

- [ ] **Step 1: Endpoint ergänzen**

In `ScoringController` (z.B. direkt nach `advanceInning`):

```java
    @PostMapping("/{gameId}/scoring/automatic-out")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void recordAutomaticOut(@PathVariable final Long gameId) {
        scoringService.recordAutomaticOut(gameId);
    }
```

- [ ] **Step 2: Kompilieren/Backend-Tests**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameScoringServiceTest
```

Expected: PASS (Compile inkl. Controller).

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/in/web/ScoringController.java
git commit -m "✨ POST /scoring/automatic-out Endpoint"
```

---

### Task 5: Frontend API-Client + Hook + Types

Dünne Wrapper; Gate = TypeScript-Build.

**Files:**
- Modify: `frontend/src/types/index.ts:312`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/hooks/useScoring.ts`

**Interfaces:**
- Produces:
  - `api.recordAutomaticOut(gameId: number): Promise<void>`
  - `useScoring(...).recordAutomaticOut: () => Promise<void>`
  - `UndoResultType` inkl. `'AUTOMATIC_OUT'`

- [ ] **Step 1: Type erweitern**

`frontend/src/types/index.ts` — Zeile 312:

```ts
export type UndoResultType = 'AT_BAT' | 'STEALING' | 'SUBSTITUTION' | 'INNING_ADVANCE' | 'AUTOMATIC_OUT' | 'NONE'
```

- [ ] **Step 2: API-Client**

`frontend/src/api/client.ts` — direkt nach `deleteCurrentInning` (ca. Zeile 419):

```ts
export const recordAutomaticOut = (gameId: number) =>
  request<void>(`/games/${gameId}/scoring/automatic-out`, { method: 'POST' })
```

- [ ] **Step 3: Hook**

`frontend/src/hooks/useScoring.ts` — Wrapper analog `recordStealingEvent`, und im Return-Objekt exportieren:

```ts
  const recordAutomaticOut = useCallback(async () => {
    if (gameId == null) throw new Error('Kein Spiel aktiv')
    await api.recordAutomaticOut(gameId)
    await reload()
  }, [gameId, reload])
```

Im `return { ... }` ergänzen:

```ts
    recordAutomaticOut,
```

- [ ] **Step 4: Build (Typecheck)**

```bash
cd frontend && npm run build
```

Expected: erfolgreich (tsc + vite build ohne Fehler).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts frontend/src/hooks/useScoring.ts
git commit -m "✨ Frontend: recordAutomaticOut API/Hook + UndoResultType"
```

---

### Task 6: `ScoringPage` umbauen — Outs-Tap → Confirm → Auto-Aus

Cosmetic `extraOuts` entfernen, Outs-Button an ConfirmModal + `recordAutomaticOut` hängen, Undo-Toast ergänzen.

**Files:**
- Modify: `frontend/src/components/scoring/ScoringPage.tsx`

**Interfaces:**
- Consumes: `useScoring(...).recordAutomaticOut` (Task 5), `ConfirmModal`, `toast`

- [ ] **Step 1: `recordAutomaticOut` aus dem Hook destrukturieren**

Zeile 104 erweitern:

```ts
  const { atBats, stealingEvents, scoreboard, reload, recordAtBat, undo, recordStealingEvent, recordAutomaticOut } = useScoring(currentGame?.id ?? null)
```

- [ ] **Step 2: `extraOuts`-State entfernen + Confirm-State ergänzen**

Zeile 36 löschen:

```ts
  const [extraOuts, setExtraOuts] = useState(0)
```

Stattdessen (bei den anderen Confirm-States, z.B. nach Zeile 61) einfügen:

```ts
  const [showAutoOutConfirm, setShowAutoOutConfirm] = useState(false)
```

- [ ] **Step 3: Inning-Change-Effect (nur für extraOuts) entfernen**

Den Block Zeile ~169–176 (Kommentar „extraOuts zurücksetzen bei Inning-Wechsel" + `prevInningRef` + `useEffect`) komplett löschen:

```ts
  // extraOuts zurücksetzen bei Inning-Wechsel — Server-Inning-Diff detection
  const prevInningRef = useRef(serverInning)
  useEffect(() => {
    if (serverInning !== prevInningRef.current) {
      setExtraOuts(0)
      prevInningRef.current = serverInning
    }
  }, [serverInning])
```

(Falls `useRef` dann nirgends mehr genutzt wird, Import in Zeile 1 bereinigen — sonst ESLint-Fehler. Prüfen mit `grep -n "useRef" frontend/src/components/scoring/ScoringPage.tsx`; nur entfernen wenn 0 Treffer übrig.)

- [ ] **Step 4: `totalOuts` von `extraOuts` entkoppeln**

Zeile ~603:

```ts
  const totalOuts = Math.min(3, displayOuts + extraOuts)
```

ersetzen durch:

```ts
  const totalOuts = Math.min(3, displayOuts)
```

- [ ] **Step 5: `setExtraOuts(0)`-Aufrufe in Reset/Delete-Inning entfernen**

In `handleDeleteCurrentInning` (~Zeile 610) und `handleReset` (~Zeile 625) je die Zeile `setExtraOuts(0)` löschen.

- [ ] **Step 6: `handleAutomaticOut` hinzufügen**

Bei den anderen Handlern (z.B. neben `handleDeleteCurrentInning`) einfügen:

```ts
  const handleAutomaticOut = async () => {
    setShowAutoOutConfirm(false)
    try {
      await recordAutomaticOut()
      toast.show('Automatisches Aus gebucht', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }
```

- [ ] **Step 7: Outs-Button umverdrahten**

Der Button bei Zeile ~713. `onClick`, `title`, `aria-label` ersetzen:

```tsx
        <button
          onClick={() => { if (!halfInningOver) setShowAutoOutConfirm(true) }}
          disabled={halfInningOver}
          className="flex items-center gap-2 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
          title="Automatisches Aus buchen (fehlende Spielerin) — zählt als Aus im Inning"
          aria-label="Automatisches Aus"
        >
```

(Die inneren `<span>`-Dots bleiben unverändert — sie nutzen `totalOuts`.)

- [ ] **Step 8: Undo-Toast ergänzen**

Im Undo-Handler (~Zeile 446–450) die Message-Kette um Auto-Out erweitern:

```ts
      const message =
        result.type === 'AT_BAT' ? 'Letzter At-Bat rückgängig gemacht' :
        result.type === 'STEALING' ? 'Letztes Stealing-Event rückgängig gemacht' :
        result.type === 'SUBSTITUTION' ? 'Letzte Substitution rückgängig gemacht' :
        result.type === 'INNING_ADVANCE' ? 'Letzter Inning-Wechsel rückgängig gemacht' :
        result.type === 'AUTOMATIC_OUT' ? 'Letztes automatisches Aus rückgängig gemacht' :
        'Nichts zum Rückgängigmachen'
```

- [ ] **Step 9: ConfirmModal-JSX ergänzen**

Bei den anderen `ConfirmModal`-Blöcken (z.B. nach dem Reset-Block ~Zeile 2512) einfügen:

```tsx
      {/* Automatisches Aus Confirmation */}
      {showAutoOutConfirm && (
        <ConfirmModal
          title="Automatisches Aus?"
          message="Wird als Aus im aktuellen Inning gezählt (nicht dem Batter zugerechnet). Beim 3. Aus endet das Half-Inning."
          confirmLabel="Ja, Aus buchen"
          onConfirm={handleAutomaticOut}
          onCancel={() => setShowAutoOutConfirm(false)}
        />
      )}
```

- [ ] **Step 10: Lint + Build**

```bash
cd frontend && npm run lint && npm run build
```

Expected: keine Fehler. (Falls „`extraOuts`/`setExtraOuts`/`prevInningRef` is not defined" o.ä. → übersehene Referenz; `grep -n "extraOuts\|prevInningRef"` und bereinigen.)

- [ ] **Step 11: Commit**

```bash
git add frontend/src/components/scoring/ScoringPage.tsx
git commit -m "✨ Outs-Tap bucht persistiertes automatisches Aus (Confirm-Modal)"
```

---

### Task 7: E2E-Test + Pflicht-Suite

Neuer Playwright-Case + komplette 43er-Suite (Refactor-Safety-Net).

**Files:**
- Create: `frontend/e2e/scoring/scoring-automatic-out.spec.ts`

**Interfaces:**
- Consumes: `fixtures` (`test`, `scoringPage`), `getScoreboard` aus `../helpers/api`

- [ ] **Step 1: Spec schreiben**

`frontend/e2e/scoring/scoring-automatic-out.spec.ts`:

```ts
import { test, expect } from '../helpers/fixtures'
import { getScoreboard } from '../helpers/api'

test.describe('Scoring — Automatisches Aus', () => {
  test('Outs-Tap + Confirm bucht einen persistierten Out @smoke', async ({ page, scoringPage }) => {
    await page.getByRole('button', { name: 'Automatisches Aus' }).click()
    await page.getByRole('button', { name: 'Ja, Aus buchen' }).click()

    await expect.poll(async () => (await getScoreboard(scoringPage.gameId)).outsInCurrentInning).toBe(1)

    // überlebt Reload (persistiert)
    await page.reload()
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(1)
  })

  test('Drittes Aus sperrt Batter-Buttons', async ({ page, scoringPage }) => {
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Automatisches Aus' }).click()
      await page.getByRole('button', { name: 'Ja, Aus buchen' }).click()
      await expect.poll(async () => (await getScoreboard(scoringPage.gameId)).outsInCurrentInning).toBe(i + 1)
    }
    // Batter-Buttons disabled bei halfInningOver
    await expect(page.getByRole('button', { name: 'AUS', exact: false }).first()).toBeDisabled()
  })
})
```

(Falls die Selektoren in der Fixture abweichen: an einem bestehenden Spec unter `frontend/e2e/scoring/` orientieren — `scoring-inning-advance.spec.ts` zeigt das `scoringPage`-Fixture-Muster.)

- [ ] **Step 2: Neuen Case isoliert laufen**

```bash
docker compose up -d db
cd frontend && npx playwright test scoring/scoring-automatic-out.spec.ts
```

Expected: 2 passed. Bei Selektor-Fehlschlag Selektoren an tatsächliches DOM anpassen (`npx playwright test --ui`).

- [ ] **Step 3: PFLICHT — komplette Scoring-E2E-Suite**

```bash
cd frontend && npm run test:e2e
```

Expected: alle Tests grün (43 bestehende + 2 neue). Bei Rot: **vor Merge untersuchen** — Live-Scoring ist eng gekoppelt.

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/scoring/scoring-automatic-out.spec.ts
git commit -m "✅ E2E: automatisches Aus (Tap+Confirm, Persistenz, 3-Aus-Lock)"
```

---

## Self-Review

**Spec coverage:**
- Verhalten Tap→Confirm→Buchen → Task 6 (Modal), Task 4 (Endpoint), Task 2 (Service). ✓
- Zählt in `outsInCurrentInning` → Task 2. ✓
- Batter rotiert nicht → keine Order-Änderung (recordAutomaticOut fasst Batter nicht an); Test `automaticOut_incrementsOutsWithoutRotatingBatter`. ✓
- 3. Aus sperrt Batter/beendet Half-Inning über bestehenden Flow → Task 6 (`halfInningOver` unverändert) + Task 7 E2E. ✓
- Undo → Task 3. ✓
- Guard bei 3 Outs (Backend) → Task 2 Test `automaticOut_rejectedWhenThreeOutsAlready`; (Frontend) → Task 6 `disabled={halfInningOver}`. ✓
- Persistenz-Layer + Migration → Task 1. ✓
- `deleteCurrentInning`/`resetScoring`-Cleanup → Task 3. ✓
- `extraOuts` entfernen → Task 6. ✓
- Nicht-Ziele (kein Extra-Button, kein Lineup-Slot, kein Spielbogen) → eingehalten. ✓

**Placeholder scan:** Keine TBD/TODO; alle Code-Steps zeigen vollständigen Code.

**Type consistency:** `recordAutomaticOut` (Service void, API void, Hook void) konsistent. `UndoType.AUTOMATIC_OUT` (BE) ↔ `'AUTOMATIC_OUT'` (FE UndoResultType) matcht. `automaticOutEventRepository` Name in Konstruktor (Task 1), Nutzung (Task 2/3) identisch. Tabelle `automatic_out_events` in Migration + Entity `@Table` identisch. Helper `outsInInning(...)`-Signatur in Task 2 definiert, dort genutzt.
