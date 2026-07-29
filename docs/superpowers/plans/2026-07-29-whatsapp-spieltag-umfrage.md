# WhatsApp Spieltag-Umfrage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pro Spieltag eine WhatsApp-Umfrage anlegen, die 7 Tage vorher automatisch rausgeht, und ihre Ja-Stimmen per Vorschau-Modal in `GameDay.availablePlayers` übernehmen (inkl. Rücknahme).

**Architecture:** Der bestehende `whatsapp_polls`-Boolean `training_coupled` wird durch ein dreiwertiges `mode` (`TRAINING`/`ONE_OFF`/`GAME_DAY`) ersetzt; `GAME_DAY` hängt an einem `game_day_id` und nutzt den vorhandenen Einmal-Versandpfad (`PollDueEvaluator.isDueOneOff`). Die Übernahme in die Anwesenheit läuft nie automatisch, sondern über zwei Endpoints (Vorschau/Apply-Delta) und ein Modal; geschrieben wird ausschließlich über `AvailabilityService.setAvailablePlayers`, damit die bestehende Kaskade (Lineup, DH-Referenz, Staff, Batting-Order) korrekt greift. Die Mirror-Berechnung liegt als pure Domain-Klasse `GameDayVoteMirror` in `domain/service`.

**Tech Stack:** Java 21 / Spring Boot 3.4.3 / Spring Data JPA / Flyway / Testcontainers · React 19 / TypeScript / Vite 7 / Tailwind v4 / Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-07-29-whatsapp-spieltag-umfrage-design.md`

## Global Constraints

- **Sprache:** Alle UI-Labels, Copy, Toasts und Fehlermeldungen auf Deutsch.
- **Onion-Architektur:** `domain` kennt kein Spring/JPA/DTO. `application` nur `domain`. Domain-Services werden per `new` gebildet (kein `@Component`), wie `LineupValidator`/`VotePresenceEvaluator`.
- **Migrationen:** Schemaänderungen nur als neue `V{n}__*.sql` unter `backend/src/main/resources/db/migration/`. `ddl-auto=validate` — Entity und SQL müssen exakt zusammenpassen.
- **Maven:** Immer `-s .mvn/local-settings.xml`. `~/.m2/settings.xml` NICHT anfassen. Docker-Daemon muss für Testcontainers laufen.
- **Tailwind v4:** Utility-Klassen wie `sm:grid-cols-2`, keine arbitrary brackets für Layout. Theme in `frontend/src/styles/index.css`.
- **Keine Icon-Library:** Icons ausschließlich aus `@/icons`.
- **Modals:** `ResponsiveSheet` aus `@/components/shared` (Bottom-Sheet mobil, Center-Modal Desktop). Kein `confirm()`. Ein Sheet, das aus einem Sheet geöffnet wird, braucht `nested` — sonst bricht der vaul-Drawer auf dem Handy.
- **Commits:** Conventional Commits mit Gitmoji-Prefix (`✨`, `🐛`, `🧹`, `📝`, `✅`). **Keine `Co-Authored-By`-Zeilen.**
- **Verifikation vor Commit:** Backend `./mvnw test -s .mvn/local-settings.xml`, Frontend `npm run build` (tsc + vite) und `npm test`. Scoring-E2E ist nicht betroffen (keine Änderung an Scoring/Spielbogen).
- **Exceptions:** `BusinessValidationException` → 400, `ResourceNotFoundException` → 404.

## File Structure

**Backend — neu**

| Datei | Verantwortung |
|---|---|
| `db/migration/V53__whatsapp_poll_game_day.sql` | `mode`-Spalte, `game_day_id` an Poll + Vote, CHECK/Unique-Indizes |
| `domain/model/PollMode.java` | Enum `TRAINING`/`ONE_OFF`/`GAME_DAY` |
| `domain/service/GameDayVoteMirror.java` | pure Berechnung: Stimmen + aktueller Stand → Delta, Optionsaufschlüsselung, unbekannte Wähler |
| `application/GameDayVoteSyncService.java` | Abruf/Vorschau/Apply, Warnungen, Vote-Upsert |
| `adapter/dto/GameDayVotePreviewResponse.java` | Vorschau-DTO |
| `adapter/dto/ApplyGameDayVotesRequest.java` | Apply-Delta-Request |

**Backend — geändert**

`domain/model/WhatsappPoll.java`, `domain/model/SyncedVote.java`, `domain/port/out/SyncedVoteRepository.java`, `application/WhatsappPollService.java`, `application/WhatsappPollScheduler.java`, `application/PollVoteSyncService.java`, `application/VoterAssignmentService.java`, `adapter/dto/WhatsappPollRequest.java`, `adapter/dto/WhatsappPollResponse.java`, `adapter/dto/UnknownVoterResponse.java`, `adapter/in/web/GameDayController.java`, `adapter/out/persistence/entity/WhatsappPollEntity.java`, `adapter/out/persistence/entity/SyncedVoteEntity.java`, `adapter/out/persistence/mapper/WhatsappPollMapper.java`, `adapter/out/persistence/mapper/SyncedVoteMapper.java`, `adapter/out/persistence/repository/SpringSyncedVoteRepository.java`, `adapter/out/persistence/adapter/SyncedVoteRepositoryAdapter.java`

**Frontend — neu**

| Datei | Verantwortung |
|---|---|
| `components/orga/PollEditor.tsx` | Editor-Sheet (aus `WhatsappPollPage.tsx` extrahiert) + Modus/Spieltag/Vorlagen |
| `components/orga/pollTemplates.ts` | Vorlagen Auswärts/Heim, Platzhalter aus GameDay |
| `components/shared/UnknownVoterRow.tsx` | Zuordnungs-Zeile (Name, Spieler-Select, Zuweisen, neuer Spieler) |
| `components/shared/NewPlayerModal.tsx` | „Spieler neu anlegen"-Sheet mit `nested`-Prop |
| `components/planner/PollVoteSyncSheet.tsx` | Vorschau-Modal, generisch über `target` |
| `hooks/useGameDayPollSync.ts` | Laden/Abrufen/Anwenden + Zustände |

**Frontend — geändert**

`components/orga/WhatsappPollPage.tsx`, `components/players/WhatsappVotersTab.tsx`, `components/planner/GameDayPlanner.tsx`, `components/shared/index.ts`, `api/client.ts`, `types/index.ts`

**Out of scope (eigener Plan):** Umstellung der Trainings-Anwesenheit auf dasselbe Modal — siehe Spec-Abschnitt „Folgeschritt". Task 12 baut das Modal aber schon generisch über `target`, damit das später ein reines Verdrahten ist.

---

### Task 1: PollMode ersetzt training_coupled

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/PollMode.java`
- Create: `backend/src/main/resources/db/migration/V53__whatsapp_poll_game_day.sql`
- Modify: `backend/src/main/java/com/softball/domain/model/WhatsappPoll.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/WhatsappPollEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapper.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/WhatsappPollRequest.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/WhatsappPollResponse.java`
- Modify: `backend/src/main/java/com/softball/application/WhatsappPollService.java`
- Modify: `backend/src/main/java/com/softball/application/WhatsappPollScheduler.java`
- Modify: `backend/src/main/java/com/softball/application/PollVoteSyncService.java`
- Test: `backend/src/test/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapperTest.java`

**Interfaces:**
- Consumes: nichts (erste Task)
- Produces: `PollMode` (Enum `TRAINING`, `ONE_OFF`, `GAME_DAY`), `WhatsappPoll.getMode()/setMode(PollMode)`, `WhatsappPoll.getGameDayId()/setGameDayId(Long)`. `isTrainingCoupled()` existiert danach **nicht** mehr.

- [ ] **Step 1: Migration schreiben**

`V53__whatsapp_poll_game_day.sql`:

```sql
-- Poll-Modus dreiwertig: TRAINING (an Trainingstag gekoppelt), ONE_OFF (einmalig),
-- GAME_DAY (einmalig, an einen Spieltag gekoppelt, bucht Anwesenheit auf Wunsch).
ALTER TABLE whatsapp_polls ADD COLUMN mode VARCHAR(12);
UPDATE whatsapp_polls SET mode = CASE WHEN training_coupled THEN 'TRAINING' ELSE 'ONE_OFF' END;
ALTER TABLE whatsapp_polls ALTER COLUMN mode SET NOT NULL;
ALTER TABLE whatsapp_polls DROP COLUMN training_coupled;

ALTER TABLE whatsapp_polls ADD COLUMN game_day_id BIGINT
    REFERENCES game_days(id) ON DELETE CASCADE;
-- Max. eine Umfrage pro Spieltag: bei zwei Polls waere unklar, dessen
-- last_sent_message_id der Stimmen-Abruf verwenden soll.
CREATE UNIQUE INDEX uq_poll_game_day ON whatsapp_polls (game_day_id)
    WHERE game_day_id IS NOT NULL;

-- Stimmen koennen jetzt auf ein Training ODER einen Spieltag zeigen.
ALTER TABLE whatsapp_synced_vote ALTER COLUMN training_id DROP NOT NULL;
ALTER TABLE whatsapp_synced_vote ADD COLUMN game_day_id BIGINT
    REFERENCES game_days(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_synced_vote ADD CONSTRAINT chk_vote_target
    CHECK ((training_id IS NULL) <> (game_day_id IS NULL));
CREATE UNIQUE INDEX uq_synced_vote_gameday ON whatsapp_synced_vote (game_day_id, voter_name);
```

- [ ] **Step 2: Enum anlegen**

`domain/model/PollMode.java`:

```java
package com.softball.domain.model;

/** Versand- und Kopplungsart einer WhatsApp-Umfrage. */
public enum PollMode {
    /** An einen Trainings-Wochentag gekoppelt, sendet wiederkehrend am Vortag. */
    TRAINING,
    /** Einmalig zu einem festen Datum, ohne Kopplung. */
    ONE_OFF,
    /** Einmalig zu einem festen Datum, an einen Spieltag gekoppelt. */
    GAME_DAY
}
```

- [ ] **Step 3: Failing Mapper-Test schreiben**

In `WhatsappPollMapperTest.java` ergänzen (bestehende `trainingCoupled`-Assertions im File auf `mode` umstellen, zusätzlich):

```java
    @Test
    void shouldMapGameDayModeAndGameDayId() {
        final WhatsappPoll poll = new WhatsappPoll();
        poll.setGroupId("g1");
        poll.setTitle("Heimspieltag");
        poll.setOptions(List.of("Ja, ich spiele", "Ich helfe", "Ich kann nicht"));
        poll.setTime(LocalTime.of(18, 0));
        poll.setMode(PollMode.GAME_DAY);
        poll.setGameDayId(42L);
        poll.setSendDate(LocalDate.of(2026, 8, 2));

        final WhatsappPollEntity entity = mapper.toEntity(poll);
        assertThat(entity.getMode()).isEqualTo("GAME_DAY");
        assertThat(entity.getGameDayId()).isEqualTo(42L);

        final WhatsappPoll back = mapper.toDomain(entity);
        assertThat(back.getMode()).isEqualTo(PollMode.GAME_DAY);
        assertThat(back.getGameDayId()).isEqualTo(42L);
    }
```

- [ ] **Step 4: Test laufen lassen, Fehlschlag prüfen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollMapperTest`
Expected: Compile-Fehler „cannot find symbol: method setMode(PollMode)".

- [ ] **Step 5: Domain-Model umstellen**

In `WhatsappPoll.java`: `private boolean trainingCoupled = false;` → ersetzen durch

```java
    private PollMode mode = PollMode.TRAINING;
    private Long gameDayId;
```

und die Accessoren `isTrainingCoupled()/setTrainingCoupled(boolean)` ersetzen durch

```java
    public PollMode getMode() { return mode; }
    public void setMode(final PollMode v) { this.mode = v != null ? v : PollMode.TRAINING; }
    public Long getGameDayId() { return gameDayId; }
    public void setGameDayId(final Long v) { this.gameDayId = v; }
```

- [ ] **Step 6: Entity + Mapper umstellen**

In `WhatsappPollEntity.java` das Feld `trainingCoupled` ersetzen:

```java
    @Column(nullable = false, length = 12)
    private String mode = "TRAINING";

    @Column(name = "game_day_id")
    private Long gameDayId;

    public String getMode() { return mode; }
    public void setMode(final String v) { this.mode = v; }
    public Long getGameDayId() { return gameDayId; }
    public void setGameDayId(final Long v) { this.gameDayId = v; }
```

In `WhatsappPollMapper.toDomain` die Zeile `p.setTrainingCoupled(e.isTrainingCoupled());` ersetzen durch

```java
        p.setMode(e.getMode() != null ? PollMode.valueOf(e.getMode()) : PollMode.TRAINING);
        p.setGameDayId(e.getGameDayId());
```

und in `applyScalars` `e.setTrainingCoupled(p.isTrainingCoupled());` ersetzen durch

```java
        e.setMode(p.getMode().name());
        e.setGameDayId(p.getGameDayId());
```

- [ ] **Step 7: DTOs umstellen**

`WhatsappPollRequest`: `boolean trainingCoupled` → `@NotNull PollMode mode`, neu `Long gameDayId`; in `toDomain()` entsprechend `p.setMode(mode); p.setGameDayId(gameDayId);`.

`WhatsappPollResponse`: `boolean trainingCoupled` → `PollMode mode`, neu `Long gameDayId`; in `from()` `p.getMode(), p.getGameDayId()`.

- [ ] **Step 8: Call Sites umstellen**

- `WhatsappPollScheduler.tick`: `if (poll.isTrainingCoupled())` → `if (poll.getMode() == PollMode.TRAINING)`.
- `WhatsappPollService.sendNow`: `if (p.isTrainingCoupled())` → `if (p.getMode() == PollMode.TRAINING)`.
- `WhatsappPollService.update`: `final boolean wasCoupled = existing.isTrainingCoupled();` → `final boolean wasCoupled = existing.getMode() == PollMode.TRAINING;`, `existing.setTrainingCoupled(incoming.isTrainingCoupled());` → `existing.setMode(incoming.getMode()); existing.setGameDayId(incoming.getGameDayId());`, und in den beiden Folge-Bedingungen `existing.isTrainingCoupled()` → `existing.getMode() == PollMode.TRAINING`.
- `WhatsappPollService.validate`: `if (p.isTrainingCoupled())` → `if (p.getMode() == PollMode.TRAINING)`; der `else`-Zweig bleibt vorerst wie er ist (Task 4 ergänzt die `GAME_DAY`-Regeln).
- `PollVoteSyncService.sync`: `if (!poll.isTrainingCoupled()) continue;` → `if (poll.getMode() != PollMode.TRAINING) continue;` — Kommentar anpassen auf „Nur Trainings-Polls buchen Trainings-Anwesenheit."

- [ ] **Step 9: Bestehende Tests anpassen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
In allen Testklassen, die `setTrainingCoupled(true/false)` oder `trainingCoupled` im DTO benutzen (`WhatsappPollServiceTest`, `WhatsappPollServiceSendNowTest`, `WhatsappPollSchedulerTest`, `PollVoteSyncServiceTest`, `WhatsappPollDtoMappingTest`, `PollDueEvaluatorTest`), auf `setMode(PollMode.TRAINING)` bzw. `PollMode.ONE_OFF` umstellen. Semantik bleibt identisch, keine Testerwartung ändern.

- [ ] **Step 10: Alle Backend-Tests grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS (Docker muss laufen).

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/PollMode.java \
        backend/src/main/resources/db/migration/V53__whatsapp_poll_game_day.sql \
        backend/src/main/java/com/softball backend/src/test/java/com/softball
git commit -m "🔧 Poll-Modus dreiwertig (TRAINING/ONE_OFF/GAME_DAY) + game_day_id, V53"
```

---

### Task 2: SyncedVote kennt Spieltage

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/SyncedVote.java`
- Modify: `backend/src/main/java/com/softball/domain/port/out/SyncedVoteRepository.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/SyncedVoteEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SyncedVoteMapper.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSyncedVoteRepository.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SyncedVoteRepositoryAdapter.java`
- Test: `backend/src/test/java/com/softball/integration/SyncedVoteGameDayIT.java` (neu)

**Interfaces:**
- Consumes: Migration V53 aus Task 1 (Spalte `game_day_id`, `chk_vote_target`)
- Produces: `SyncedVote.getGameDayId()/setGameDayId(Long)`, Konstruktor `SyncedVote.forGameDay(Long gameDayId, String voterName, Long playerId, boolean present)`, Repository-Methoden `findByGameDayIdAndVoterName(Long, String)`, `findByGameDayId(Long)`

- [ ] **Step 1: Failing Integrationstest schreiben**

`backend/src/test/java/com/softball/integration/SyncedVoteGameDayIT.java` — Muster von `TrainingRepositoryAdapterLazyIT` übernehmen (gleiche Testcontainers-Basisklasse, gleiche Annotationen):

```java
package com.softball.integration;

import com.softball.domain.model.SyncedVote;
import com.softball.domain.port.out.SyncedVoteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class SyncedVoteGameDayIT extends AbstractIntegrationTest {

    @Autowired
    private SyncedVoteRepository voteRepo;

    @Test
    void shouldPersistAndFindGameDayVote() {
        final Long gameDayId = insertGameDay();   // Helper der Basisklasse bzw. via GameDayRepository anlegen

        voteRepo.save(SyncedVote.forGameDay(gameDayId, "Max M.", null, true));

        assertThat(voteRepo.findByGameDayIdAndVoterName(gameDayId, "Max M.")).isPresent();
        assertThat(voteRepo.findByGameDayId(gameDayId)).hasSize(1);
        assertThat(voteRepo.findByGameDayId(gameDayId).getFirst().getTrainingId()).isNull();
    }
}
```

Hinweis: Wenn `AbstractIntegrationTest` keinen GameDay-Helper hat, im Test per `GameDayRepository`/`SeasonRepository` einen Spieltag anlegen — kein neues Test-Fixture-Framework einführen.

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SyncedVoteGameDayIT`
Expected: Compile-Fehler „cannot find symbol: method forGameDay".

- [ ] **Step 3: Domain-Model erweitern**

In `SyncedVote.java` Feld + Factory ergänzen (bestehenden Konstruktor unangetastet lassen, damit der Trainings-Pfad unverändert bleibt):

```java
    private Long gameDayId;

    /** Stimme auf einen Spieltag (statt auf ein Training). */
    public static SyncedVote forGameDay(final Long gameDayId, final String voterName,
                                        final Long playerId, final boolean present) {
        final SyncedVote v = new SyncedVote();
        v.setGameDayId(gameDayId);
        v.setVoterName(voterName);
        v.setPlayerId(playerId);
        v.setPresent(present);
        return v;
    }

    public Long getGameDayId() { return gameDayId; }
    public void setGameDayId(final Long gameDayId) { this.gameDayId = gameDayId; }
```

- [ ] **Step 4: Entity + Mapper + Repos erweitern**

`SyncedVoteEntity`: `@Column(name = "training_id", nullable = false)` → `@Column(name = "training_id")`, zusätzlich

```java
    @Column(name = "game_day_id")
    private Long gameDayId;

    public Long getGameDayId() { return gameDayId; }
    public void setGameDayId(final Long gameDayId) { this.gameDayId = gameDayId; }
```

`SyncedVoteMapper`: `gameDayId` in `toDomain`, `toEntity` und `updateEntity` mitführen.

`SpringSyncedVoteRepository`:

```java
    Optional<SyncedVoteEntity> findByGameDayIdAndVoterName(Long gameDayId, String voterName);
    List<SyncedVoteEntity> findByGameDayId(Long gameDayId);
```

`SyncedVoteRepository` (Port) und `SyncedVoteRepositoryAdapter`: die beiden Methoden analog zu den bestehenden Trainings-Methoden durchreichen.

- [ ] **Step 5: Test grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SyncedVoteGameDayIT`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball backend/src/test/java/com/softball/integration/SyncedVoteGameDayIT.java
git commit -m "🔧 SyncedVote kann auf Spieltag zeigen (game_day_id + Repo-Methoden)"
```

---

### Task 3: GameDayVoteMirror — Delta-Berechnung (pure Domain)

**Files:**
- Create: `backend/src/main/java/com/softball/domain/service/GameDayVoteMirror.java`
- Test: `backend/src/test/java/com/softball/domain/service/GameDayVoteMirrorTest.java`

**Interfaces:**
- Consumes: `WhatsappVote` (Record `voterName()`, `options()`), `Player`
- Produces:
  ```java
  public record OptionVoters(String option, List<String> voterNames) {}
  public record Result(List<Long> toAdd, List<Long> toRemove, List<String> unknownVoters,
                       List<OptionVoters> optionVoters, int voteCount, int yesCount) {}
  public Result compute(List<String> pollOptions, List<WhatsappVote> votes,
                        Set<Long> currentlyAvailableIds, Map<String, Player> byWhatsappName)
  ```
  `byWhatsappName`-Keys sind `whatsappName.trim().toLowerCase()` (gleiche Normalisierung wie `PollVoteSyncService`).

Regeln (aus der Spec): anwesend = die **erste** Antwortoption gewählt; mehrere Aliase auf denselben Spieler → **ein Ja gewinnt**; Nichtwähler bleiben unberührt; `optionVoters` schlüsselt **alle** Optionen mit ihrem Originaltext auf (nicht „Fährt"/„Hilft" hart verdrahten — bei Auswärts ist Option 2 das Auto, bei Heim der Aufbau-Helfer).

- [ ] **Step 1: Failing Test schreiben**

```java
package com.softball.domain.service;

import com.softball.domain.model.Player;
import com.softball.domain.model.WhatsappVote;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class GameDayVoteMirrorTest {

    private static final List<String> AWAY_OPTIONS = List.of(
        "Ja ich will spielen", "Ich habe ein Auto und würde fahren", "Nein");

    private final GameDayVoteMirror mirror = new GameDayVoteMirror();

    private Player player(final long id, final String name, final String whatsappName) {
        final Player p = new Player(id, name, true);
        p.setWhatsappName(whatsappName);
        return p;
    }

    private Map<String, Player> byName(final Player... players) {
        return java.util.Arrays.stream(players)
            .collect(java.util.stream.Collectors.toMap(p -> p.getWhatsappName().toLowerCase(), p -> p));
    }

    @Test
    void shouldAddPlayerWhoPickedFirstOption() {
        final Player max = player(1L, "Max", "Max M.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Max M.", List.of("Ja ich will spielen"))),
            Set.of(), byName(max));

        assertThat(result.toAdd()).containsExactly(1L);
        assertThat(result.toRemove()).isEmpty();
        assertThat(result.yesCount()).isEqualTo(1);
    }

    @Test
    void shouldNotAddPlayerWhoOnlyOfferedACar() {
        final Player ben = player(2L, "Ben", "Ben B.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Ben B.", List.of("Ich habe ein Auto und würde fahren"))),
            Set.of(), byName(ben));

        assertThat(result.toAdd()).isEmpty();
        assertThat(result.optionVoters())
            .anySatisfy(o -> {
                assertThat(o.option()).isEqualTo("Ich habe ein Auto und würde fahren");
                assertThat(o.voterNames()).containsExactly("Ben B.");
            });
    }

    @Test
    void shouldAddPlayerWhoPickedYesAndCar() {
        final Player tim = player(3L, "Tim", "Tim T.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Tim T.", List.of("Ja ich will spielen", "Ich habe ein Auto und würde fahren"))),
            Set.of(), byName(tim));

        assertThat(result.toAdd()).containsExactly(3L);
    }

    @Test
    void shouldRemoveAvailablePlayerWhoNoLongerVotesYes() {
        final Player ben = player(2L, "Ben", "Ben B.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Ben B.", List.of("Nein"))),
            Set.of(2L), byName(ben));

        assertThat(result.toRemove()).containsExactly(2L);
    }

    @Test
    void shouldRemoveAvailablePlayerWhoWithdrewEveryOption() {
        final Player ben = player(2L, "Ben", "Ben B.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Ben B.", List.of())),
            Set.of(2L), byName(ben));

        assertThat(result.toRemove()).containsExactly(2L);
    }

    @Test
    void shouldLeaveNonVotersUntouched() {
        final Player max = player(1L, "Max", "Max M.");
        final var result = mirror.compute(AWAY_OPTIONS, List.of(), Set.of(99L), byName(max));

        assertThat(result.toAdd()).isEmpty();
        assertThat(result.toRemove()).isEmpty();
    }

    @Test
    void shouldLetYesWinWhenTwoAliasesMapToSamePlayer() {
        final Player max = player(1L, "Max", "Max M.");
        final Map<String, Player> map = Map.of("max m.", max, "max mobil", max);
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Max Mobil", List.of("Nein")),
                    new WhatsappVote("Max M.", List.of("Ja ich will spielen"))),
            Set.of(), map);

        assertThat(result.toAdd()).containsExactly(1L);
        assertThat(result.toRemove()).isEmpty();
    }

    @Test
    void shouldListUnknownVotersAndCountAllVotes() {
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Sandra W.", List.of("Ja ich will spielen")),
                    new WhatsappVote("  ", List.of("Nein"))),
            Set.of(), Map.of());

        assertThat(result.unknownVoters()).containsExactly("Sandra W.");
        assertThat(result.voteCount()).isEqualTo(1);
    }

    @Test
    void shouldIgnoreCaseAndWhitespaceOnMatching() {
        final Player max = player(1L, "Max", "Max M.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote(" max m. ", List.of("  ja ich will spielen  "))),
            Set.of(), byName(max));

        assertThat(result.toAdd()).containsExactly(1L);
    }
}
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameDayVoteMirrorTest`
Expected: FAIL — „cannot find symbol: class GameDayVoteMirror".

- [ ] **Step 3: Implementieren**

```java
package com.softball.domain.service;

import com.softball.domain.model.Player;
import com.softball.domain.model.WhatsappVote;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Berechnet aus den WhatsApp-Stimmen einer Spieltag-Umfrage das Delta zur aktuellen
 * Anwesenheitsliste. Rein rechnend, ohne Repository- oder Sender-Zugriff.
 * <ul>
 *   <li>Anwesend ist, wer die <b>erste</b> Antwortoption gewaehlt hat (beide Vorlagen stellen
 *       die Ja-Option an Position 1).</li>
 *   <li>Zeigen zwei WhatsApp-Namen auf denselben Spieler, gewinnt ein Ja.</li>
 *   <li>Wer nicht abgestimmt hat, wird nicht angetastet.</li>
 * </ul>
 */
public class GameDayVoteMirror {

    public record OptionVoters(String option, List<String> voterNames) {}

    public record Result(List<Long> toAdd, List<Long> toRemove, List<String> unknownVoters,
                         List<OptionVoters> optionVoters, int voteCount, int yesCount) {}

    public Result compute(final List<String> pollOptions, final List<WhatsappVote> votes,
                          final Set<Long> currentlyAvailableIds, final Map<String, Player> byWhatsappName) {
        final List<String> options = pollOptions != null ? pollOptions : List.of();
        final String yesOption = options.isEmpty() ? null : normalize(options.getFirst());
        final Set<Long> currently = currentlyAvailableIds != null ? currentlyAvailableIds : Set.of();
        final Map<String, Player> players = byWhatsappName != null ? byWhatsappName : Map.of();

        final Map<Long, Boolean> yesByPlayer = new LinkedHashMap<>();
        final Set<String> unknown = new LinkedHashSet<>();
        final Map<String, List<String>> votersByOption = new LinkedHashMap<>();
        for (final String option : options) votersByOption.put(option, new ArrayList<>());

        int voteCount = 0;
        int yesCount = 0;

        for (final WhatsappVote vote : votes != null ? votes : List.<WhatsappVote>of()) {
            if (vote.voterName() == null || vote.voterName().isBlank()) continue;
            voteCount++;
            final String voterName = vote.voterName().trim();
            final boolean yes = pickedYes(vote, yesOption);
            if (yes) yesCount++;

            for (final String option : options) {
                if (contains(vote, option)) votersByOption.get(option).add(voterName);
            }

            final Player player = players.get(voterName.toLowerCase());
            if (player == null) {
                unknown.add(voterName);
                continue;
            }
            // Ein Ja gewinnt: sobald irgendeine Stimme dieses Spielers "Ja" ist, bleibt es dabei.
            yesByPlayer.merge(player.getId(), yes, (a, b) -> a || b);
        }

        final List<Long> toAdd = new ArrayList<>();
        final List<Long> toRemove = new ArrayList<>();
        yesByPlayer.forEach((playerId, yes) -> {
            if (yes && !currently.contains(playerId)) toAdd.add(playerId);
            if (!yes && currently.contains(playerId)) toRemove.add(playerId);
        });

        final List<OptionVoters> optionVoters = new ArrayList<>();
        votersByOption.forEach((option, voters) -> optionVoters.add(new OptionVoters(option, List.copyOf(voters))));

        return new Result(List.copyOf(toAdd), List.copyOf(toRemove), List.copyOf(unknown),
                List.copyOf(optionVoters), voteCount, yesCount);
    }

    private boolean pickedYes(final WhatsappVote vote, final String yesOption) {
        if (yesOption == null) return false;
        return vote.options() != null && vote.options().stream()
                .anyMatch(o -> o != null && yesOption.equals(normalize(o)));
    }

    private boolean contains(final WhatsappVote vote, final String option) {
        final String wanted = normalize(option);
        return vote.options() != null && vote.options().stream()
                .anyMatch(o -> o != null && wanted.equals(normalize(o)));
    }

    private String normalize(final String s) {
        return s.trim().toLowerCase();
    }
}
```

- [ ] **Step 4: Test grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameDayVoteMirrorTest`
Expected: PASS (9 Tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/GameDayVoteMirror.java \
        backend/src/test/java/com/softball/domain/service/GameDayVoteMirrorTest.java
git commit -m "✨ GameDayVoteMirror: Delta-Berechnung für Spieltag-Umfrage-Stimmen"
```

---

### Task 4: GAME_DAY-Validierung + Versand

**Files:**
- Modify: `backend/src/main/java/com/softball/application/WhatsappPollService.java`
- Modify: `backend/src/main/java/com/softball/domain/service/PollDueEvaluator.java` (nur Javadoc)
- Test: `backend/src/test/java/com/softball/application/WhatsappPollServiceTest.java`
- Test: `backend/src/test/java/com/softball/domain/service/PollDueEvaluatorTest.java`

**Interfaces:**
- Consumes: `PollMode`, `WhatsappPoll.getGameDayId()` (Task 1)
- Produces: Validierungsverhalten für `GAME_DAY`; `sendNow` stempelt bei `GAME_DAY` `lastSentMessageId`

- [ ] **Step 1: Failing Tests schreiben**

In `WhatsappPollServiceTest`:

```java
    @Test
    void shouldRejectGameDayPollWithoutGameDay() {
        final WhatsappPoll poll = gameDayPoll();
        poll.setGameDayId(null);

        assertThatThrownBy(() -> service.create(poll))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Spieltag");
    }

    @Test
    void shouldRejectGameDayPollWithPastSendDate() {
        final WhatsappPoll poll = gameDayPoll();
        poll.setSendDate(LocalDate.now(FIXED_CLOCK).minusDays(1));

        assertThatThrownBy(() -> service.create(poll))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Vergangenheit");
    }

    @Test
    void shouldClearWeekdayAndForceEnabledForGameDayPoll() {
        final WhatsappPoll poll = gameDayPoll();
        poll.setWeekday(DayOfWeek.FRIDAY);
        poll.setEnabled(false);

        final WhatsappPoll saved = service.create(poll);

        assertThat(saved.getWeekday()).isNull();
        assertThat(saved.isEnabled()).isTrue();
    }

    @Test
    void shouldDropGameDayLinkWhenSwitchingAwayFromGameDayMode() {
        final WhatsappPoll saved = service.create(gameDayPoll());
        final WhatsappPoll incoming = gameDayPoll();
        incoming.setMode(PollMode.ONE_OFF);
        incoming.setGameDayId(null);

        final WhatsappPoll updated = service.update(saved.getId(), incoming);

        assertThat(updated.getGameDayId()).isNull();
        assertThat(updated.getLastSentMessageId()).isNull();
    }

    // Helper: gueltiger Spieltag-Poll (Ja-Option zuerst, wie in beiden Vorlagen)
    private WhatsappPoll gameDayPoll() {
        final WhatsappPoll poll = new WhatsappPoll();
        poll.setGroupId("g1");
        poll.setTitle("CoSe Spieltag in Aachen dabei?");
        poll.setOptions(List.of("Ja ich will spielen", "Ich habe ein Auto und würde fahren", "Nein"));
        poll.setAllowMultipleAnswers(true);
        poll.setTime(LocalTime.of(18, 0));
        poll.setMode(PollMode.GAME_DAY);
        poll.setGameDayId(42L);
        poll.setSendDate(LocalDate.now(FIXED_CLOCK).plusDays(7));
        return poll;
    }
```

Falls die Testklasse noch keine feste Clock hat: dieselbe Clock verwenden, die dem Service im Test übergeben wird (`WhatsappPollService`-Konstruktor mit `Clock`), und `FIXED_CLOCK` als Konstante anlegen.

In `PollDueEvaluatorTest`:

```java
    @Test
    void shouldTreatGameDayPollLikeOneOff() {
        final WhatsappPoll poll = new WhatsappPoll();
        poll.setMode(PollMode.GAME_DAY);
        poll.setGameDayId(42L);
        poll.setTime(LocalTime.of(18, 0));
        poll.setSendDate(LocalDate.of(2026, 8, 2));

        assertThat(evaluator.isDueOneOff(poll, LocalDateTime.of(2026, 8, 2, 18, 0))).isTrue();
        assertThat(evaluator.isDueOneOff(poll, LocalDateTime.of(2026, 8, 2, 17, 59))).isFalse();
        assertThat(evaluator.isDueOneOff(poll, LocalDateTime.of(2026, 8, 3, 18, 0))).isFalse();

        poll.setLastSentAt(LocalDateTime.of(2026, 8, 2, 18, 0));
        assertThat(evaluator.isDueOneOff(poll, LocalDateTime.of(2026, 8, 2, 18, 5))).isFalse();
    }
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='WhatsappPollServiceTest,PollDueEvaluatorTest'`
Expected: FAIL — Spieltag-Poll wird ohne `gameDayId` akzeptiert, kein „Vergangenheit"-Fehler.

- [ ] **Step 3: Validierung implementieren**

In `WhatsappPollService.validate` den Modus-Block ersetzen:

```java
        if (p.getMode() == PollMode.TRAINING) {
            if (p.getWeekday() == null) {
                throw new BusinessValidationException("Trainingstag muss gesetzt sein");
            }
            p.setSendDate(null);
            p.setGameDayId(null);
        } else {
            if (p.getSendDate() == null) {
                throw new BusinessValidationException("Datum muss gesetzt sein");
            }
            p.setWeekday(null);
            // Einmalige Polls kennen kein Pausieren — ohne UI zum Reaktivieren wuerde ein
            // deaktivierter One-off sonst nie mehr gesendet (isDueOneOff verlangt enabled).
            p.setEnabled(true);
            if (p.getMode() == PollMode.GAME_DAY) {
                if (p.getGameDayId() == null) {
                    throw new BusinessValidationException("Spieltag muss gewählt sein");
                }
                if (p.getSendDate().isBefore(LocalDate.now(clock))) {
                    // isDueOneOff feuert nur genau am sendDate — ein vergangenes Datum wuerde
                    // stillschweigend nie senden.
                    throw new BusinessValidationException("Sendedatum liegt in der Vergangenheit");
                }
            } else {
                p.setGameDayId(null);
            }
        }
```

- [ ] **Step 4: Modus-Wechsel + sendNow anpassen**

In `WhatsappPollService.update` den Wechsel-Block erweitern, sodass ein Wechsel **weg von** `GAME_DAY` die Kopplung und Sendehistorie verwirft:

```java
        final boolean wasGameDay = existing.getMode() == PollMode.GAME_DAY;
        // ... setter wie in Task 1 ...
        if ((wasCoupled && existing.getMode() != PollMode.TRAINING)
                || (wasGameDay && existing.getMode() != PollMode.GAME_DAY)) {
            existing.setLastSentAt(null);
            existing.setLastSentMessageId(null);
            existing.setLastSentTrainingId(null);
            if (existing.getMode() != PollMode.GAME_DAY) existing.setGameDayId(null);
        } else if (...)   // bestehender Umplanungs-Zweig bleibt
```

In `WhatsappPollService.sendNow` nach dem `TRAINING`-Block ergänzen:

```java
        if (p.getMode() == PollMode.GAME_DAY) {
            // Message-ID stempeln, damit der Stimmen-Abruf einen Testversand schon findet.
            // lastSentAt bleibt leer, damit der geplante Versand danach noch feuert.
            p.setLastSentMessageId(messageId);
            repository.save(p);
        }
```

- [ ] **Step 5: Javadoc in PollDueEvaluator präzisieren**

`isDueOneOff`-Javadoc: „Einmalig (ONE_OFF und GAME_DAY): genau am sendDate zur Uhrzeit fällig, solange noch nie gesendet."

- [ ] **Step 6: Tests grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='WhatsappPollServiceTest,PollDueEvaluatorTest,WhatsappPollSchedulerTest,WhatsappPollServiceSendNowTest'`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/softball backend/src/test/java/com/softball
git commit -m "✨ Spieltag-Umfrage: Validierung, Modus-Wechsel, Message-ID bei Testversand"
```

---

### Task 5: Vorschau-Endpoint (Abruf + Upsert + Warnungen)

**Files:**
- Create: `backend/src/main/java/com/softball/application/GameDayVoteSyncService.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/GameDayVotePreviewResponse.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/GameDayController.java`
- Modify: `backend/src/main/java/com/softball/domain/port/out/WhatsappPollRepository.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringWhatsappPollRepository.java` + `adapter/out/persistence/adapter/WhatsappPollRepositoryAdapter.java`
- Test: `backend/src/test/java/com/softball/application/GameDayVoteSyncServiceTest.java`

**Interfaces:**
- Consumes: `GameDayVoteMirror.compute(...)` (Task 3), `SyncedVoteRepository.findByGameDayIdAndVoterName/findByGameDayId` (Task 2), `WhatsappSender.fetchVotes/status`, `GameDayRepository.findByIdWithGamesAndPlayers`, `LineupEntryRepository.findByGameIdOrderByBattingOrderAsc`, `GameStaffRepository.findByGameId`
- Produces:
  ```java
  public record PlayerRef(Long id, String name) {}
  public record Removal(Long playerId, String playerName, List<String> warnings) {}
  public record Preview(boolean pollExists, boolean sent, List<PlayerRef> toAdd, List<Removal> toRemove,
                        List<GameDayVoteMirror.OptionVoters> optionVoters, List<String> unknownVoters,
                        int voteCount, int yesCount) {}
  public Preview fetchAndPreview(Long gameDayId)
  public Preview stored(Long gameDayId)
  ```
  Neue Port-Methode: `Optional<WhatsappPoll> findByGameDayId(Long gameDayId)`

- [ ] **Step 1: Failing Test schreiben**

`GameDayVoteSyncServiceTest` mit Mockito (Muster: `PollVoteSyncServiceTest`):

```java
    @Test
    void shouldThrowWhenNoPollForGameDay() {
        when(pollRepo.findByGameDayId(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.fetchAndPreview(7L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("keine Umfrage");
    }

    @Test
    void shouldThrowWhenWhatsappNotConnected() {
        givenPoll();
        when(sender.status()).thenReturn(new WhatsappAccountStatus(false, null, null, true));

        assertThatThrownBy(() -> service.fetchAndPreview(7L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("nicht verbunden");
    }

    @Test
    void shouldPersistVotesAndReturnDeltaWithoutTouchingAvailability() {
        givenPoll();
        givenConnected();
        givenGameDayWithAvailable(ben);
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(
            new WhatsappVote("Max M.", List.of("Ja ich will spielen")),
            new WhatsappVote("Ben B.", List.of("Nein"))));

        final var preview = service.fetchAndPreview(7L);

        assertThat(preview.toAdd()).extracting(GameDayVoteSyncService.PlayerRef::name).containsExactly("Max");
        assertThat(preview.toRemove()).extracting(GameDayVoteSyncService.Removal::playerName).containsExactly("Ben");
        verify(voteRepo, times(2)).save(any());
        verifyNoInteractions(availabilityService);
    }

    @Test
    void shouldWarnAboutLineupEntryOfRemovedPlayer() {
        givenPoll();
        givenConnected();
        givenGameDayWithAvailable(ben);
        givenBenInLineup(2, 4, Position.SS);          // Spiel 2, Schlagposition 4, Shortstop
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Ben B.", List.of("Nein"))));

        final var preview = service.fetchAndPreview(7L);

        assertThat(preview.toRemove()).singleElement()
            .satisfies(r -> assertThat(r.warnings()).anyMatch(w -> w.contains("Spiel 2") && w.contains("SS")));
    }

    @Test
    void shouldReturnStoredVotesWithoutFetching() {
        givenPoll();
        when(voteRepo.findByGameDayId(7L)).thenReturn(List.of(
            SyncedVote.forGameDay(7L, "Sandra W.", null, true)));

        final var preview = service.stored(7L);

        assertThat(preview.unknownVoters()).containsExactly("Sandra W.");
        verify(sender, never()).fetchVotes(any());
    }
```

Fixtures (`givenPoll`, `givenConnected`, `givenGameDayWithAvailable`, `givenBenInLineup`) im Test als private Helper anlegen; `givenPoll` liefert einen `WhatsappPoll` mit `mode = GAME_DAY`, `gameDayId = 7L`, `lastSentMessageId = "msg-1"`, Optionen wie in Task 3.

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameDayVoteSyncServiceTest`
Expected: FAIL — Klasse existiert nicht.

- [ ] **Step 3: Port-Methode ergänzen**

`WhatsappPollRepository`: `Optional<WhatsappPoll> findByGameDayId(Long gameDayId);`
`SpringWhatsappPollRepository`: `Optional<WhatsappPollEntity> findByGameDayId(Long gameDayId);`
`WhatsappPollRepositoryAdapter`: durchreichen + mappen (wie die bestehenden Methoden).

- [ ] **Step 4: Service implementieren**

```java
package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.domain.service.GameDayVoteMirror;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Holt die Stimmen der Spieltag-Umfrage und berechnet daraus das Delta zur Anwesenheitsliste.
 * Schreibt selbst NIE in {@code availablePlayers} — das macht erst {@link #apply} ueber
 * {@link AvailabilityService}, weil dort die destruktive Kaskade (Lineup, Staff) haengt.
 */
@Service
public class GameDayVoteSyncService {

    private static final Logger log = LoggerFactory.getLogger(GameDayVoteSyncService.class);

    public record PlayerRef(Long id, String name) {}
    public record Removal(Long playerId, String playerName, List<String> warnings) {}
    public record Preview(boolean pollExists, boolean sent, List<PlayerRef> toAdd, List<Removal> toRemove,
                          List<GameDayVoteMirror.OptionVoters> optionVoters, List<String> unknownVoters,
                          int voteCount, int yesCount) {}

    private final WhatsappPollRepository pollRepo;
    private final WhatsappSender sender;
    private final GameDayRepository gameDayRepo;
    private final PlayerRepository playerRepo;
    private final SyncedVoteRepository voteRepo;
    private final LineupEntryRepository lineupRepo;
    private final GameStaffRepository staffRepo;
    private final GameDayVoteMirror mirror = new GameDayVoteMirror();

    public GameDayVoteSyncService(final WhatsappPollRepository pollRepo, final WhatsappSender sender,
                                  final GameDayRepository gameDayRepo, final PlayerRepository playerRepo,
                                  final SyncedVoteRepository voteRepo, final LineupEntryRepository lineupRepo,
                                  final GameStaffRepository staffRepo) {
        this.pollRepo = pollRepo; this.sender = sender; this.gameDayRepo = gameDayRepo;
        this.playerRepo = playerRepo; this.voteRepo = voteRepo; this.lineupRepo = lineupRepo;
        this.staffRepo = staffRepo;
    }

    @Transactional
    public Preview fetchAndPreview(final Long gameDayId) {
        final WhatsappPoll poll = pollRepo.findByGameDayId(gameDayId)
            .orElseThrow(() -> new BusinessValidationException("Für diesen Spieltag gibt es keine Umfrage"));
        if (poll.getLastSentMessageId() == null) {
            throw new BusinessValidationException("Die Umfrage wurde noch nicht gesendet");
        }
        if (!sender.status().connected()) {
            // fetchVotes schluckt Fehler und liefert eine leere Liste — ohne diese Pruefung
            // waere "Sidecar tot" nicht von "niemand hat abgestimmt" zu unterscheiden.
            throw new BusinessValidationException("WhatsApp ist nicht verbunden — Stimmen konnten nicht abgerufen werden");
        }

        final GameDay gameDay = loadGameDay(gameDayId);
        final Map<String, Player> byName = playersByWhatsappName();
        final List<WhatsappVote> votes = sender.fetchVotes(poll.getLastSentMessageId());
        final Set<Long> available = gameDay.getAvailablePlayers().stream().map(Player::getId).collect(Collectors.toSet());

        final GameDayVoteMirror.Result result = mirror.compute(poll.getOptions(), votes, available, byName);
        persist(gameDayId, votes, byName, poll.getOptions());
        log.info("Spieltag {}: {} Stimmen abgerufen, +{} / -{}", gameDayId, result.voteCount(),
                result.toAdd().size(), result.toRemove().size());
        return toPreview(gameDay, result, true);
    }

    @Transactional(readOnly = true)
    public Preview stored(final Long gameDayId) {
        final Optional<WhatsappPoll> poll = pollRepo.findByGameDayId(gameDayId);
        final List<SyncedVote> stored = voteRepo.findByGameDayId(gameDayId);
        final List<String> unknown = stored.stream().filter(v -> v.getPlayerId() == null)
            .map(SyncedVote::getVoterName).toList();
        return new Preview(poll.isPresent(), poll.map(p -> p.getLastSentMessageId() != null).orElse(false),
                List.of(), List.of(), List.of(), unknown, stored.size(),
                (int) stored.stream().filter(SyncedVote::isPresent).count());
    }

    private void persist(final Long gameDayId, final List<WhatsappVote> votes,
                         final Map<String, Player> byName, final List<String> options) {
        final String yesOption = options.isEmpty() ? null : options.getFirst().trim().toLowerCase();
        for (final WhatsappVote vote : votes) {
            if (vote.voterName() == null || vote.voterName().isBlank()) continue;
            final String voterName = vote.voterName().trim();
            final Player player = byName.get(voterName.toLowerCase());
            final boolean present = yesOption != null && vote.options() != null && vote.options().stream()
                .anyMatch(o -> o != null && yesOption.equals(o.trim().toLowerCase()));
            final SyncedVote row = voteRepo.findByGameDayIdAndVoterName(gameDayId, voterName)
                .orElseGet(() -> SyncedVote.forGameDay(gameDayId, voterName, null, present));
            row.setPlayerId(player != null ? player.getId() : null);
            row.setPresent(present);
            voteRepo.save(row);
        }
    }

    private Preview toPreview(final GameDay gameDay, final GameDayVoteMirror.Result result, final boolean sent) {
        final Map<Long, Player> all = playerRepo.findAll().stream()
            .collect(Collectors.toMap(Player::getId, p -> p, (a, b) -> a));
        final List<PlayerRef> toAdd = result.toAdd().stream()
            .map(id -> new PlayerRef(id, name(all, id))).toList();
        final List<Removal> toRemove = result.toRemove().stream()
            .map(id -> new Removal(id, name(all, id), warningsFor(gameDay, id))).toList();
        return new Preview(true, sent, toAdd, toRemove, result.optionVoters(), result.unknownVoters(),
                result.voteCount(), result.yesCount());
    }

    /** Was der Anwesenheits-Entzug dieses Spielers zerstoert (Kaskade in AvailabilityService). */
    private List<String> warningsFor(final GameDay gameDay, final Long playerId) {
        final List<String> warnings = new ArrayList<>();
        int gameNumber = 0;
        for (final Game game : gameDay.getGames()) {
            gameNumber++;
            for (final LineupEntry entry : lineupRepo.findByGameIdOrderByBattingOrderAsc(game.getId())) {
                if (entry.getPlayer() != null && playerId.equals(entry.getPlayer().getId())) {
                    warnings.add("Lineup Spiel " + gameNumber + " (#" + entry.getBattingOrder()
                        + (entry.getPosition() != null ? ", " + entry.getPosition().name() : "") + ") wird gelöscht");
                }
                if (entry.getDhBatterPlayer() != null && playerId.equals(entry.getDhBatterPlayer().getId())) {
                    warnings.add("DH-Zuordnung in Spiel " + gameNumber + " wird entfernt");
                }
            }
            for (final GameStaff staff : staffRepo.findByGameId(game.getId())) {
                if (staff.getPlayer() != null && playerId.equals(staff.getPlayer().getId())) {
                    warnings.add(staff.getRole().name() + " in Spiel " + gameNumber + " wird entfernt");
                }
            }
        }
        return warnings;
    }

    private GameDay loadGameDay(final Long gameDayId) {
        return gameDayRepo.findByIdWithGamesAndPlayers(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
    }

    private Map<String, Player> playersByWhatsappName() {
        return playerRepo.findAll().stream()
            .filter(p -> p.getWhatsappName() != null && !p.getWhatsappName().isBlank())
            .collect(Collectors.toMap(p -> p.getWhatsappName().trim().toLowerCase(), p -> p, (a, b) -> a));
    }

    private String name(final Map<Long, Player> all, final Long id) {
        final Player p = all.get(id);
        return p != null ? p.getName() : "Spieler " + id;
    }
}
```

- [ ] **Step 5: DTO + Endpoints**

`GameDayVotePreviewResponse`:

```java
package com.softball.adapter.dto;

import com.softball.application.GameDayVoteSyncService.Preview;

import java.util.List;

public record GameDayVotePreviewResponse(
        boolean pollExists,
        boolean sent,
        List<PlayerRefDto> toAdd,
        List<RemovalDto> toRemove,
        List<OptionVotersDto> optionVoters,
        List<String> unknownVoters,
        int voteCount,
        int yesCount) {

    public record PlayerRefDto(Long id, String name) {}
    public record RemovalDto(Long playerId, String playerName, List<String> warnings) {}
    public record OptionVotersDto(String option, List<String> voters) {}

    public static GameDayVotePreviewResponse from(final Preview p) {
        return new GameDayVotePreviewResponse(
                p.pollExists(), p.sent(),
                p.toAdd().stream().map(a -> new PlayerRefDto(a.id(), a.name())).toList(),
                p.toRemove().stream().map(r -> new RemovalDto(r.playerId(), r.playerName(), r.warnings())).toList(),
                p.optionVoters().stream().map(o -> new OptionVotersDto(o.option(), o.voterNames())).toList(),
                p.unknownVoters(), p.voteCount(), p.yesCount());
    }
}
```

In `GameDayController` (Service im Konstruktor ergänzen):

```java
    @PostMapping("/gamedays/{id}/poll-votes/fetch")
    public GameDayVotePreviewResponse fetchPollVotes(@PathVariable final Long id) {
        return GameDayVotePreviewResponse.from(voteSyncService.fetchAndPreview(id));
    }

    @GetMapping("/gamedays/{id}/poll-votes")
    public GameDayVotePreviewResponse storedPollVotes(@PathVariable final Long id) {
        return GameDayVotePreviewResponse.from(voteSyncService.stored(id));
    }
```

- [ ] **Step 6: Tests grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameDayVoteSyncServiceTest`
Expected: PASS (5 Tests)

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/softball backend/src/test/java/com/softball
git commit -m "✨ Vorschau-Endpoint für Spieltag-Stimmen (Abruf, Upsert, Kaskaden-Warnungen)"
```

---

### Task 6: Apply-Endpoint (Delta auf aktuellen Stand)

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/ApplyGameDayVotesRequest.java`
- Modify: `backend/src/main/java/com/softball/application/GameDayVoteSyncService.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/GameDayController.java`
- Test: `backend/src/test/java/com/softball/application/GameDayVoteSyncServiceTest.java`

**Interfaces:**
- Consumes: `AvailabilityService.setAvailablePlayers(Long, List<Long>)`, `GameDayVoteSyncService.Preview` (Task 5)
- Produces: `GameDay apply(Long gameDayId, List<Long> add, List<Long> remove)`; Endpoint `POST /api/gamedays/{id}/poll-votes/apply` mit Body `{ "add": [1,2], "remove": [3] }`, Antwort `GameDayResponse`

- [ ] **Step 1: Failing Tests schreiben**

```java
    @Test
    void shouldApplyDeltaOnCurrentAvailability() {
        givenGameDayWithAvailable(ben, jana);      // aktuell: Ben(2), Jana(4)
        when(availabilityService.setAvailablePlayers(eq(7L), any())).thenReturn(new GameDay());

        service.apply(7L, List.of(1L), List.of(2L));   // +Max(1), -Ben(2)

        final ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(availabilityService).setAvailablePlayers(eq(7L), captor.capture());
        assertThat(captor.getValue()).containsExactlyInAnyOrder(1L, 4L);   // Jana bleibt unberührt
    }

    @Test
    void shouldIgnoreRemovalOfPlayerWhoIsNotAvailable() {
        givenGameDayWithAvailable(jana);
        when(availabilityService.setAvailablePlayers(eq(7L), any())).thenReturn(new GameDay());

        service.apply(7L, List.of(), List.of(2L));

        final ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(availabilityService).setAvailablePlayers(eq(7L), captor.capture());
        assertThat(captor.getValue()).containsExactly(4L);
    }

    @Test
    void shouldRejectPlayerInBothAddAndRemove() {
        assertThatThrownBy(() -> service.apply(7L, List.of(1L), List.of(1L)))
            .isInstanceOf(BusinessValidationException.class);
    }
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameDayVoteSyncServiceTest`
Expected: FAIL — „cannot find symbol: method apply".

- [ ] **Step 3: apply implementieren**

`AvailabilityService` in den Konstruktor von `GameDayVoteSyncService` aufnehmen, dann:

```java
    /**
     * Rechnet das Vorschau-Delta auf die AKTUELLE Anwesenheitsliste (nicht auf die aus der
     * Vorschau), damit parallele Aenderungen in einem anderen Tab nicht ueberschrieben werden.
     */
    @Transactional
    public GameDay apply(final Long gameDayId, final List<Long> add, final List<Long> remove) {
        final List<Long> toAdd = add != null ? add : List.of();
        final List<Long> toRemove = remove != null ? remove : List.of();
        final Set<Long> overlap = new HashSet<>(toAdd);
        overlap.retainAll(toRemove);
        if (!overlap.isEmpty()) {
            throw new BusinessValidationException("Spieler kann nicht gleichzeitig hinzugefügt und entfernt werden");
        }

        final GameDay gameDay = loadGameDay(gameDayId);
        final Set<Long> next = gameDay.getAvailablePlayers().stream()
            .map(Player::getId).collect(Collectors.toCollection(LinkedHashSet::new));
        next.addAll(toAdd);
        toRemove.forEach(next::remove);
        log.info("Spieltag {}: Anwesenheit aus Umfrage übernommen (+{} / -{})", gameDayId, toAdd.size(), toRemove.size());
        return availabilityService.setAvailablePlayers(gameDayId, new ArrayList<>(next));
    }
```

- [ ] **Step 4: Request-DTO + Endpoint**

```java
package com.softball.adapter.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ApplyGameDayVotesRequest(@NotNull List<Long> add, @NotNull List<Long> remove) {}
```

```java
    @PostMapping("/gamedays/{id}/poll-votes/apply")
    public GameDayResponse applyPollVotes(@PathVariable final Long id,
                                          @Valid @RequestBody final ApplyGameDayVotesRequest req) {
        return GameDayResponse.from(voteSyncService.apply(id, req.add(), req.remove()));
    }
```

(Falls `GameDayResponse.from` eine andere Signatur hat, die im Controller schon benutzte Variante verwenden.)

- [ ] **Step 5: Tests grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameDayVoteSyncServiceTest`
Expected: PASS (8 Tests)

- [ ] **Step 6: Alle Backend-Tests + Commit**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
git add backend/src/main/java/com/softball backend/src/test/java/com/softball
git commit -m "✨ Apply-Endpoint: Umfrage-Delta auf Spieltag-Anwesenheit (über AvailabilityService)"
```

---

### Task 7: Unbekannte Wähler kennen ihre Quelle

**Files:**
- Modify: `backend/src/main/java/com/softball/application/VoterAssignmentService.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/UnknownVoterResponse.java`
- Test: `backend/src/test/java/com/softball/application/VoterAssignmentServiceTest.java` (anlegen, falls nicht vorhanden)

**Interfaces:**
- Consumes: `SyncedVote.getGameDayId()` (Task 2), `GameDayRepository.findAll()`
- Produces: `VoterAssignmentService.UnknownVoter(String voterName, String source, Long targetId, LocalDate date)` mit `source` ∈ `"TRAINING"`, `"GAME_DAY"`; `UnknownVoterResponse` mit denselben Feldern

- [ ] **Step 1: Failing Test schreiben**

```java
    @Test
    void shouldReportGameDayVotersWithSourceAndDate() {
        when(voteRepo.findByPlayerIdIsNull()).thenReturn(List.of(
            SyncedVote.forGameDay(7L, "Sandra W.", null, true)));
        when(gameDayRepo.findAll()).thenReturn(List.of(gameDay(7L, LocalDate.of(2026, 8, 9))));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of());

        final var voters = service.unknownVoters();

        assertThat(voters).singleElement().satisfies(v -> {
            assertThat(v.voterName()).isEqualTo("Sandra W.");
            assertThat(v.source()).isEqualTo("GAME_DAY");
            assertThat(v.targetId()).isEqualTo(7L);
            assertThat(v.date()).isEqualTo(LocalDate.of(2026, 8, 9));
        });
    }
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=VoterAssignmentServiceTest`
Expected: FAIL — Record hat keine `source()`.

- [ ] **Step 3: Implementieren**

Record ersetzen und `unknownVoters()` beide Quellen abdecken lassen:

```java
    public record UnknownVoter(String voterName, String source, Long targetId, LocalDate date) {}

    @Transactional(readOnly = true)
    public List<UnknownVoter> unknownVoters() {
        final Map<Long, LocalDate> trainingDates = trainingRepo.findAllByOrderByDateDesc().stream()
            .collect(Collectors.toMap(Training::getId, Training::getDate, (a, b) -> a));
        final Map<Long, LocalDate> gameDayDates = gameDayRepo.findAll().stream()
            .collect(Collectors.toMap(GameDay::getId, GameDay::getDate, (a, b) -> a));
        return voteRepo.findByPlayerIdIsNull().stream()
            .map(v -> v.getGameDayId() != null
                ? new UnknownVoter(v.getVoterName(), "GAME_DAY", v.getGameDayId(), gameDayDates.get(v.getGameDayId()))
                : new UnknownVoter(v.getVoterName(), "TRAINING", v.getTrainingId(), trainingDates.get(v.getTrainingId())))
            .toList();
    }
```

`rematch(...)` bleibt unverändert: es bucht weiter nur Trainings-Anwesenheit. Spieltag-Stimmen werden absichtlich nicht automatisch gebucht — Kommentar im Code ergänzen:

```java
    // Spieltag-Stimmen werden hier NICHT gebucht: das Setzen der Anwesenheit loest die
    // destruktive Kaskade aus und passiert nur bewusst ueber das Vorschau-Modal.
```

`UnknownVoterResponse.from` auf die neuen Felder umstellen.

- [ ] **Step 4: Tests grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS. `WhatsappVoteControllerIT` ggf. auf die neuen Response-Felder anpassen.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball backend/src/test/java/com/softball
git commit -m "✨ Unbekannte Wähler mit Quelle (Training / Spieltag)"
```

---

### Task 8: Frontend-Typen + API-Client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`

**Interfaces:**
- Consumes: Endpoints aus Task 5–7
- Produces:
  ```ts
  export type PollMode = 'TRAINING' | 'ONE_OFF' | 'GAME_DAY'
  export interface GameDayVotePreview {
    pollExists: boolean; sent: boolean
    toAdd: { id: number; name: string }[]
    toRemove: { playerId: number; playerName: string; warnings: string[] }[]
    optionVoters: { option: string; voters: string[] }[]
    unknownVoters: string[]
    voteCount: number; yesCount: number
  }
  ```
  API: `fetchGameDayPollVotes(gameDayId)`, `getGameDayPollVotes(gameDayId)`, `applyGameDayPollVotes(gameDayId, add, remove)`

- [ ] **Step 1: Typen anpassen**

In `types/index.ts`:

```ts
export type PollMode = 'TRAINING' | 'ONE_OFF' | 'GAME_DAY'

export interface GameDayVotePreview {
  pollExists: boolean
  sent: boolean
  toAdd: { id: number; name: string }[]
  toRemove: { playerId: number; playerName: string; warnings: string[] }[]
  optionVoters: { option: string; voters: string[] }[]
  unknownVoters: string[]
  voteCount: number
  yesCount: number
}
```

In `WhatsappPollResponse` und `WhatsappPollRequest` jeweils `trainingCoupled: boolean` ersetzen durch `mode: PollMode` und `gameDayId: number | null` ergänzen.

In `UnknownVoter`: `trainingId`/`trainingDate` ersetzen durch `source: 'TRAINING' | 'GAME_DAY'`, `targetId: number`, `date: string | null`.

- [ ] **Step 2: API-Funktionen ergänzen**

In `api/client.ts` bei den GameDay-Funktionen:

```ts
export const fetchGameDayPollVotes = (gameDayId: number) =>
  request<GameDayVotePreview>(`/gamedays/${gameDayId}/poll-votes/fetch`, { method: 'POST' })

export const getGameDayPollVotes = (gameDayId: number) =>
  request<GameDayVotePreview>(`/gamedays/${gameDayId}/poll-votes`)

export const applyGameDayPollVotes = (gameDayId: number, add: number[], remove: number[]) =>
  request<GameDayResponse>(`/gamedays/${gameDayId}/poll-votes/apply`, {
    method: 'POST',
    body: JSON.stringify({ add, remove }),
  })
```

- [ ] **Step 3: Typecheck — Fehler sind erwartet und leiten Task 9–13**

Run: `cd frontend && npm run build`
Expected: FAIL mit Fehlern in `WhatsappPollPage.tsx`, `WhatsappVotersTab.tsx` (`trainingCoupled`/`trainingDate` existieren nicht mehr). Diese Dateien werden in Task 9–11 angefasst — hier noch **nicht** committen.

- [ ] **Step 4: Minimal-Anpassung der Call Sites, damit der Build grün ist**

In `WhatsappPollPage.tsx` alle `trainingCoupled: true/false` → `mode: 'TRAINING'` / `mode: 'ONE_OFF'` und `form.trainingCoupled` → `form.mode === 'TRAINING'`; `blankDraft` und `toRequest` um `gameDayId: null` bzw. `p.gameDayId` erweitern. In `WhatsappVotersTab.tsx` `formatDate(voter.trainingDate)` → `formatDate(voter.date)`. Noch keine neuen Features — nur Kompilierfähigkeit.

- [ ] **Step 5: Build + Tests grün**

Run: `cd frontend && npm run build && npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts \
        frontend/src/components/orga/WhatsappPollPage.tsx frontend/src/components/players/WhatsappVotersTab.tsx
git commit -m "🔧 Frontend: PollMode + Spieltag-Vote-Endpoints in Typen und API-Client"
```

---

### Task 9: PollEditor in eigene Datei

**Files:**
- Create: `frontend/src/components/orga/PollEditor.tsx`
- Modify: `frontend/src/components/orga/WhatsappPollPage.tsx`
- Test: `frontend/src/components/orga/PollEditor.test.tsx` (Import umstellen)

**Interfaces:**
- Consumes: `WhatsappPollRequest`, `WhatsappGroup`, `TrainingResponse`
- Produces: `PollEditor` + `PollEditorProps` aus `@/components/orga/PollEditor`; die Hilfsfunktionen `todayIso`, `tomorrowIso`, `isoDate`, `WEEKDAYS`, `JS_TO_WEEKDAY`, `labelCls`, `inputCls` werden aus `WhatsappPollPage.tsx` exportiert oder in `pollSchedule.ts` verschoben, damit beide Dateien sie nutzen

Reiner Umzug — **kein** Verhaltensänderung. Das trennt die 894-Zeilen-Datei auf, bevor Task 10 fachlich draufbaut.

- [ ] **Step 1: Bestehende Tests als Sicherung laufen lassen**

Run: `cd frontend && npm test -- PollEditor WhatsappPollPage`
Expected: PASS (Ausgangszustand festhalten)

- [ ] **Step 2: Code verschieben**

`PollEditor`, `SendPreview`, `PollEditorProps` aus `WhatsappPollPage.tsx` nach `PollEditor.tsx` verschieben. Gemeinsam genutzte Konstanten (`WEEKDAYS`, `JS_TO_WEEKDAY`, `labelCls`, `inputCls`, `todayIso`, `tomorrowIso`, `isoDate`) nach `pollSchedule.ts` verschieben und in beiden Dateien importieren. In `WhatsappPollPage.tsx` `import { PollEditor } from './PollEditor'`.

- [ ] **Step 3: Test-Import umstellen**

In `PollEditor.test.tsx`: `import { PollEditor } from './WhatsappPollPage'` → `from './PollEditor'`.

- [ ] **Step 4: Build + Tests grün**

Run: `cd frontend && npm run build && npm test`
Expected: PASS, gleiche Testanzahl wie in Step 1.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/orga/
git commit -m "🧹 PollEditor in eigene Datei (WhatsappPollPage entlasten)"
```

---

### Task 10: Editor: Modus „Spieltag" + Vorlagen

**Files:**
- Create: `frontend/src/components/orga/pollTemplates.ts`
- Modify: `frontend/src/components/orga/PollEditor.tsx`
- Modify: `frontend/src/components/orga/WhatsappPollPage.tsx` (GameDays laden, an Editor geben)
- Test: `frontend/src/components/orga/pollTemplates.test.ts` (neu)
- Test: `frontend/src/components/orga/PollEditor.test.tsx`

**Interfaces:**
- Consumes: `GameDayResponse` (`id`, `date`, `label`, `location`), `WhatsappPollRequest` mit `mode`/`gameDayId` (Task 8)
- Produces:
  ```ts
  export function awayTemplate(gameDay: GameDayResponse): Pick<WhatsappPollRequest,
    'title' | 'message' | 'options' | 'allowMultipleAnswers'>
  export function homeTemplate(gameDay: GameDayResponse): Pick<WhatsappPollRequest,
    'title' | 'message' | 'options' | 'allowMultipleAnswers'>
  export function defaultSendDate(gameDayDate: string, todayIso: string): string  // Spieltag − 7 Tage, min. heute
  ```
  `PollEditorProps` bekommt zusätzlich `gameDays: GameDayResponse[]`

- [ ] **Step 1: Failing Vorlagen-Test schreiben**

```ts
import { describe, expect, it } from 'vitest'
import { awayTemplate, homeTemplate, defaultSendDate } from './pollTemplates'
import type { GameDayResponse } from '@/types'

const gameDay = {
  id: 42, date: '2026-08-09', label: 'CoSe Spieltag', location: 'Aachen',
  seasonId: 1, availablePlayers: [], games: [],
} as GameDayResponse

describe('pollTemplates', () => {
  it('Auswärts-Vorlage: Ja-Option zuerst, Mehrfachauswahl, Ort im Titel', () => {
    const t = awayTemplate(gameDay)
    expect(t.options[0]).toBe('Ja ich will spielen')
    expect(t.options).toHaveLength(3)
    expect(t.allowMultipleAnswers).toBe(true)
    expect(t.title).toContain('Aachen')
    expect(t.message).toContain('Sonntag')
  })

  it('Heim-Vorlage: Ja-Option zuerst, Einzelauswahl', () => {
    const t = homeTemplate(gameDay)
    expect(t.options[0]).toBe('Ja, ich spiele (und helfe natürlich mit)')
    expect(t.allowMultipleAnswers).toBe(false)
    expect(t.title).toContain('09.08.')
  })

  it('Sendedatum ist 7 Tage vor dem Spieltag', () => {
    expect(defaultSendDate('2026-08-09', '2026-07-29')).toBe('2026-08-02')
  })

  it('Sendedatum wird auf heute geklemmt, wenn Spieltag näher als 7 Tage ist', () => {
    expect(defaultSendDate('2026-08-01', '2026-07-29')).toBe('2026-07-29')
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npm test -- pollTemplates`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Vorlagen implementieren**

```ts
import type { GameDayResponse, WhatsappPollRequest } from '@/types'

type TemplateFields = Pick<WhatsappPollRequest, 'title' | 'message' | 'options' | 'allowMultipleAnswers'>

const WEEKDAY_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

function parts(gameDay: GameDayResponse) {
  const d = new Date(gameDay.date + 'T00:00:00')
  return {
    weekday: WEEKDAY_LONG[d.getDay()],
    short: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    place: gameDay.location?.trim() || gameDay.label?.trim() || '',
  }
}

/** Auswärtsspiel: Mehrfachauswahl, damit Spielen + Auto zusammen gehen. */
export function awayTemplate(gameDay: GameDayResponse): TemplateFields {
  const { weekday, short, place } = parts(gameDay)
  return {
    message: `Wer ist am ${weekday} (${short}) dabei?`,
    title: place ? `Spieltag in ${place} dabei?` : `Spieltag am ${short} dabei?`,
    options: ['Ja ich will spielen', 'Ich habe ein Auto und würde fahren', 'Nein'],
    allowMultipleAnswers: true,
  }
}

/** Heimspieltag: Einzelauswahl — spielen ODER helfen ODER nicht können. */
export function homeTemplate(gameDay: GameDayResponse): TemplateFields {
  const { weekday, short } = parts(gameDay)
  return {
    message: `Heimspieltag am ${weekday} (${short}) — wer ist dabei?`,
    title: `Heimspieltag ${short}`,
    options: [
      'Ja, ich spiele (und helfe natürlich mit)',
      'Ich komme zum Aufbauen/Anfeuern/Catering helfen',
      'Ich kann nicht :(',
    ],
    allowMultipleAnswers: false,
  }
}

/** 7 Tage vor dem Spieltag, aber nie in der Vergangenheit (Backend lehnt das ab). */
export function defaultSendDate(gameDayDate: string, todayIso: string): string {
  const d = new Date(gameDayDate + 'T00:00:00')
  d.setDate(d.getDate() - 7)
  const iso = d.toISOString().slice(0, 10)
  return iso < todayIso ? todayIso : iso
}
```

- [ ] **Step 4: Vorlagen-Test grün**

Run: `cd frontend && npm test -- pollTemplates`
Expected: PASS (4 Tests)

- [ ] **Step 5: Failing Editor-Test schreiben**

In `PollEditor.test.tsx`:

```tsx
  it('Modus Spieltag: Spieltag-Wahl setzt Sendedatum auf 7 Tage vorher', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-02')
  })

  it('Vorlage Auswärtsspiel füllt Antworten und Mehrfachauswahl', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')
    await userEvent.click(screen.getByRole('button', { name: /Auswärtsspiel/ }))

    expect(screen.getByDisplayValue('Ja ich will spielen')).toBeInTheDocument()
    expect(screen.getByLabelText(/Mehrfachauswahl/)).toBeChecked()
  })

  it('manuell geändertes Datum wird beim Spieltag-Wechsel nicht überschrieben', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')
    const dateInput = screen.getByLabelText('Datum')
    await userEvent.clear(dateInput)
    await userEvent.type(dateInput, '2026-08-05')
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '43')

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-05')
  })
```

`props.gameDays` mit zwei Spieltagen (42: 2026-08-09, 43: 2026-08-16) mocken; Systemzeit mit `vi.setSystemTime(new Date('2026-07-29T10:00:00'))` fixieren.

- [ ] **Step 6: Test laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npm test -- PollEditor`
Expected: FAIL — Button „Spieltag" existiert nicht.

- [ ] **Step 7: Editor umbauen**

Die `trainingCoupled`-Checkbox durch einen dreiwertigen Segment-Switch ersetzen (Markup-Muster vom bestehenden „Umfrage / Nur Nachricht"-Switch übernehmen, `bg-navy-800 text-white` für aktiv):

```tsx
        <div>
          <label className={labelCls}>Wann senden</label>
          <div className="inline-flex rounded-lg border border-cream-300 bg-cream-50 p-0.5">
            {(['TRAINING', 'ONE_OFF', 'GAME_DAY'] as PollMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchSchedule(m)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                  form.mode === m ? 'bg-navy-800 text-white' : 'text-navy-700 hover:bg-navy-100'
                }`}
              >
                {m === 'TRAINING' ? 'Training' : m === 'ONE_OFF' ? 'Einmalig' : 'Spieltag'}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {form.mode === 'TRAINING'
              ? 'Sendet automatisch 1 Tag vor jedem Training und bucht die Anwesenheit.'
              : form.mode === 'ONE_OFF'
                ? 'Sendet einmalig zum gewählten Zeitpunkt.'
                : 'Sendet einmalig 7 Tage vor dem Spieltag. Die Stimmen lassen sich am Spieltag in die Anwesenheit übernehmen.'}
          </p>
        </div>
```

`switchSchedule` setzt beim Wechsel sinnvolle Defaults (Trainingstag wie bisher, `sendDate` morgen bei `ONE_OFF`, bei `GAME_DAY` nächster kommender Spieltag + `defaultSendDate`).

Für `GAME_DAY` einen Block mit Spieltag-Select, Datum, Uhrzeit und den zwei Vorlage-Buttons rendern:

```tsx
        {form.mode === 'GAME_DAY' && (
          <>
            <div>
              <label className={labelCls} htmlFor="poll-game-day">Spieltag</label>
              <select
                id="poll-game-day"
                value={form.gameDayId ?? ''}
                onChange={e => pickGameDay(Number(e.target.value))}
                className={inputCls}
              >
                <option value="">Spieltag wählen…</option>
                {gameDays.map(gd => (
                  <option key={gd.id} value={gd.id}>
                    {new Date(gd.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    {gd.label ? ` · ${gd.label}` : ''}{gd.location ? ` · ${gd.location}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vorlage</label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={!selectedGameDay}
                        onClick={() => applyTemplate(awayTemplate)}>Auswärtsspiel</Button>
                <Button type="button" variant="secondary" disabled={!selectedGameDay}
                        onClick={() => applyTemplate(homeTemplate)}>Heimspieltag</Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Füllt Frage, Nachricht und Antworten aus dem Spieltag — danach frei editierbar.</p>
            </div>
          </>
        )}
```

`pickGameDay` merkt sich in einem `dateTouched`-State, ob der Nutzer das Datum selbst angefasst hat, und setzt `sendDate` nur dann neu, wenn nicht:

```tsx
  const pickGameDay = (gameDayId: number) => {
    const gd = gameDays.find(g => g.id === gameDayId)
    setForm(prev => ({
      ...prev,
      gameDayId,
      sendDate: !dateTouched && gd ? defaultSendDate(gd.date, todayIso()) : prev.sendDate,
    }))
  }
```

An Option 1 im Antwort-Block einen Hinweis rendern, wenn `form.mode === 'GAME_DAY'`:

```tsx
                  {i === 0 && form.mode === 'GAME_DAY' && (
                    <span className="shrink-0 font-display text-[10px] tracking-widest uppercase font-bold text-navy-600">
                      zählt als anwesend
                    </span>
                  )}
```

Datum/Uhrzeit-Grid und `SendPreview` für `GAME_DAY` wie bei `ONE_OFF` verwenden (`form.mode !== 'TRAINING'`), im Preview-Text zusätzlich „(7 Tage vor dem Spieltag)" ausgeben, wenn `mode === 'GAME_DAY'`. `canSave` erweitern: bei `GAME_DAY` zusätzlich `form.gameDayId !== null`. `WhatsappPollPage` lädt die Spieltage via `getAllGameDays()` und gibt sie an den Editor.

- [ ] **Step 8: Tests grün**

Run: `cd frontend && npm test -- PollEditor pollTemplates && npm run build`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/orga/
git commit -m "✨ Poll-Editor: Modus Spieltag mit Vorlagen (Auswärts/Heim) und 7-Tage-Vorlauf"
```

---

### Task 11: Poll-Übersicht: Gruppe „Spieltag-Umfragen"

**Files:**
- Modify: `frontend/src/components/orga/WhatsappPollPage.tsx`
- Test: `frontend/src/components/orga/WhatsappPollPage.test.tsx`

**Interfaces:**
- Consumes: `WhatsappPollResponse.mode`, `.gameDayId`, `GameDayResponse[]` (Task 8/10)
- Produces: nichts für Folge-Tasks

- [ ] **Step 1: Failing Test schreiben**

```tsx
  it('gruppiert Spieltag-Umfragen separat und zeigt den Spieltag auf der Karte', async () => {
    mockPolls([
      poll({ id: 1, mode: 'TRAINING', weekday: 'TUESDAY' }),
      poll({ id: 2, mode: 'ONE_OFF', sendDate: '2026-08-01' }),
      poll({ id: 3, mode: 'GAME_DAY', gameDayId: 42, sendDate: '2026-08-02', title: 'Spieltag in Aachen dabei?' }),
    ])
    render(<WhatsappPollPage />)

    expect(await screen.findByText('Spieltag-Umfragen')).toBeInTheDocument()
    expect(screen.getByText(/09\.08\./)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npm test -- WhatsappPollPage`
Expected: FAIL — Überschrift „Spieltag-Umfragen" fehlt.

- [ ] **Step 3: Gruppierung implementieren**

Die bestehende Zweiteilung („Trainingsumfragen" / „Einmalig & Nachrichten") um eine dritte Gruppe erweitern: `polls.filter(p => p.mode === 'GAME_DAY')`, sortiert nach `sendDate`. Bestehende Filter auf `mode === 'TRAINING'` bzw. `mode === 'ONE_OFF'` umstellen. In `PollCard` bei `mode === 'GAME_DAY'` eine Zeile mit dem Spieltag rendern (Datum + Label/Ort aus der `gameDays`-Prop) und `formatNextSend` den Einmal-Pfad nutzen lassen.

- [ ] **Step 4: Tests + Build grün**

Run: `cd frontend && npm test -- WhatsappPollPage && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/orga/WhatsappPollPage.tsx frontend/src/components/orga/WhatsappPollPage.test.tsx
git commit -m "✨ Poll-Übersicht: eigene Gruppe für Spieltag-Umfragen"
```

---

### Task 12: UnknownVoterRow + NewPlayerModal als geteilte Komponenten

**Files:**
- Create: `frontend/src/components/shared/UnknownVoterRow.tsx`
- Create: `frontend/src/components/shared/NewPlayerModal.tsx`
- Modify: `frontend/src/components/shared/index.ts`
- Modify: `frontend/src/components/players/WhatsappVotersTab.tsx`
- Test: `frontend/src/components/shared/UnknownVoterRow.test.tsx` (neu)
- Test: `frontend/src/components/players/WhatsappVotersTab.test.tsx` (grün halten)

**Interfaces:**
- Consumes: `UnknownVoter` (mit `source`/`date`), `Player`, API `assignVoter`, `assignNewVoter`
- Produces:
  ```tsx
  interface UnknownVoterRowProps {
    voterName: string
    subline?: string                      // z.B. "Spieltag 09.08."
    players: Player[]
    busy?: boolean
    onAssign: (playerId: number) => void | Promise<void>
    onCreate: (playerName: string) => void | Promise<void>
    nestedDialog?: boolean                // true, wenn die Zeile in einem Sheet steckt
  }
  interface NewPlayerModalProps { voterName: string; nested?: boolean; onCancel: () => void; onConfirm: (name: string) => void }
  ```

- [ ] **Step 1: Failing Test schreiben**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UnknownVoterRow } from './UnknownVoterRow'

const players = [{ id: 1, name: 'Max', regular: true }, { id: 2, name: 'Ben', regular: true }]

describe('UnknownVoterRow', () => {
  it('weist den gewählten Spieler zu', async () => {
    const onAssign = vi.fn()
    render(<UnknownVoterRow voterName="Sandra W." subline="Spieltag 09.08." players={players}
                            onAssign={onAssign} onCreate={vi.fn()} />)

    await userEvent.selectOptions(screen.getByLabelText('Spieler für Sandra W.'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Zuweisen' }))

    expect(onAssign).toHaveBeenCalledWith(2)
  })

  it('Zuweisen ist ohne Auswahl deaktiviert', () => {
    render(<UnknownVoterRow voterName="Sandra W." players={players} onAssign={vi.fn()} onCreate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Zuweisen' })).toBeDisabled()
  })

  it('legt über den Plus-Button einen neuen Spieler an', async () => {
    const onCreate = vi.fn()
    render(<UnknownVoterRow voterName="Sandra W." players={players} onAssign={vi.fn()} onCreate={onCreate} />)

    await userEvent.click(screen.getByRole('button', { name: 'Neuer Spieler' }))
    await userEvent.click(screen.getByRole('button', { name: /Anlegen/ }))

    expect(onCreate).toHaveBeenCalledWith('Sandra W.')
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npm test -- UnknownVoterRow`
Expected: FAIL — Komponente existiert nicht.

- [ ] **Step 3: Komponenten extrahieren**

`UnknownVoterRow.tsx`: das Zeilen-Markup aus `WhatsappVotersTab.tsx` (Container `flex items-center gap-2 px-3 py-2 border border-cream-300 rounded-lg bg-cream-50`, Select, `Button variant="primary"` „Zuweisen", Plus-Button) 1:1 übernehmen, Zustände aber über Props steuern. Select bekommt `aria-label={`Spieler für ${voterName}`}`. Der Plus-Button öffnet `NewPlayerModal` mit `nested={nestedDialog}`.

`NewPlayerModal.tsx`: bestehende gleichnamige Komponente aus `WhatsappVotersTab.tsx` verschieben, `nested`-Prop an `ResponsiveSheet` durchreichen.

Beide in `components/shared/index.ts` exportieren.

- [ ] **Step 4: WhatsappVotersTab auf die geteilten Komponenten umstellen**

Zeilen-Markup und lokales `NewPlayerModal` entfernen, stattdessen `UnknownVoterRow` je Wähler rendern mit `subline={voter.source === 'GAME_DAY' ? `Spieltag ${formatDate(voter.date)}` : `Training ${formatDate(voter.date)}`}`. Verhalten (Toasts, Reload) bleibt.

- [ ] **Step 5: Tests + Build grün**

Run: `cd frontend && npm test -- UnknownVoterRow WhatsappVotersTab && npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/shared/ frontend/src/components/players/
git commit -m "🧹 UnknownVoterRow + NewPlayerModal geteilt (Alias-Zuordnung wiederverwendbar)"
```

---

### Task 13: PollVoteSyncSheet — das Vorschau-Modal

**Files:**
- Create: `frontend/src/components/planner/PollVoteSyncSheet.tsx`
- Create: `frontend/src/hooks/useGameDayPollSync.ts`
- Test: `frontend/src/components/planner/PollVoteSyncSheet.test.tsx` (neu)

**Interfaces:**
- Consumes: `GameDayVotePreview`, API `fetchGameDayPollVotes`/`applyGameDayPollVotes` (Task 8), `UnknownVoterRow` (Task 12), `ResponsiveSheet`, `Badge`, `Button`, `EmptyState`, `LoadingSkeleton`, `CollapsibleSection` aus `@/components/shared`
- Produces:
  ```tsx
  interface PollVoteSyncSheetProps {
    target: { type: 'GAME_DAY' | 'TRAINING'; id: number }
    players: Player[]
    onApplied: () => void | Promise<void>     // Planner lädt Spieltag neu
    onClose: () => void
  }
  ```
  `useGameDayPollSync(gameDayId)` → `{ preview, loading, applying, error, fetchVotes, apply, reload }`

`target.type === 'TRAINING'` ist vorgesehen, aber in diesem Plan nicht verdrahtet (siehe Spec-Folgeschritt) — die Komponente wirft dafür bewusst noch keinen Code-Pfad, sondern nimmt den Typ nur in die Props auf, damit der Aufrufer später ohne Signaturänderung wechseln kann.

- [ ] **Step 1: Failing Tests schreiben**

```tsx
const preview = {
  pollExists: true, sent: true, voteCount: 16, yesCount: 11,
  toAdd: [{ id: 1, name: 'Max' }, { id: 3, name: 'Tim' }],
  toRemove: [{ playerId: 2, playerName: 'Ben', warnings: ['Lineup Spiel 2 (#4, SS) wird gelöscht'] }],
  optionVoters: [
    { option: 'Ja ich will spielen', voters: ['Max M.', 'Tim T.'] },
    { option: 'Ich habe ein Auto und würde fahren', voters: ['Lisa L.'] },
    { option: 'Nein', voters: ['Ben B.'] },
  ],
  unknownVoters: ['Sandra W.'],
}

it('zeigt Zugänge, Abgänge und die Kaskaden-Warnung', async () => {
  vi.mocked(fetchGameDayPollVotes).mockResolvedValue(preview)
  render(<PollVoteSyncSheet target={{ type: 'GAME_DAY', id: 7 }} players={players} onApplied={vi.fn()} onClose={vi.fn()} />)

  expect(await screen.findByText('Max')).toBeInTheDocument()
  expect(screen.getByText('Ben')).toBeInTheDocument()
  expect(screen.getByText(/Lineup Spiel 2 \(#4, SS\) wird gelöscht/)).toBeInTheDocument()
})

it('Übernehmen schickt genau das Delta', async () => {
  vi.mocked(fetchGameDayPollVotes).mockResolvedValue(preview)
  vi.mocked(applyGameDayPollVotes).mockResolvedValue({} as never)
  const onApplied = vi.fn()
  render(<PollVoteSyncSheet target={{ type: 'GAME_DAY', id: 7 }} players={players} onApplied={onApplied} onClose={vi.fn()} />)

  await userEvent.click(await screen.findByRole('button', { name: /Übernehmen/ }))

  expect(applyGameDayPollVotes).toHaveBeenCalledWith(7, [1, 3], [2])
  expect(onApplied).toHaveBeenCalled()
})

it('leeres Delta deaktiviert den Übernehmen-Button', async () => {
  vi.mocked(fetchGameDayPollVotes).mockResolvedValue({ ...preview, toAdd: [], toRemove: [] })
  render(<PollVoteSyncSheet target={{ type: 'GAME_DAY', id: 7 }} players={players} onApplied={vi.fn()} onClose={vi.fn()} />)

  expect(await screen.findByText('Anwesenheit ist aktuell')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Übernehmen/ })).toBeDisabled()
})

it('zeigt bei nicht verbundenem WhatsApp die Fehlermeldung statt leerer Liste', async () => {
  vi.mocked(fetchGameDayPollVotes).mockRejectedValue(new Error('WhatsApp ist nicht verbunden — Stimmen konnten nicht abgerufen werden'))
  render(<PollVoteSyncSheet target={{ type: 'GAME_DAY', id: 7 }} players={players} onApplied={vi.fn()} onClose={vi.fn()} />)

  expect(await screen.findByText(/nicht verbunden/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Übernehmen/ })).toBeDisabled()
})

it('Abbrechen wendet nichts an', async () => {
  vi.mocked(fetchGameDayPollVotes).mockResolvedValue(preview)
  const onClose = vi.fn()
  render(<PollVoteSyncSheet target={{ type: 'GAME_DAY', id: 7 }} players={players} onApplied={vi.fn()} onClose={onClose} />)

  await userEvent.click(await screen.findByRole('button', { name: 'Abbrechen' }))

  expect(applyGameDayPollVotes).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalled()
})

it('nach Zuordnung eines unbekannten Wählers wird die Vorschau neu geholt', async () => {
  vi.mocked(fetchGameDayPollVotes).mockResolvedValue(preview)
  vi.mocked(assignVoter).mockResolvedValue({} as never)
  render(<PollVoteSyncSheet target={{ type: 'GAME_DAY', id: 7 }} players={players} onApplied={vi.fn()} onClose={vi.fn()} />)

  await userEvent.selectOptions(await screen.findByLabelText('Spieler für Sandra W.'), '1')
  await userEvent.click(screen.getByRole('button', { name: 'Zuweisen' }))

  expect(assignVoter).toHaveBeenCalledWith('Sandra W.', 1)
  expect(fetchGameDayPollVotes).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npm test -- PollVoteSyncSheet`
Expected: FAIL — Komponente existiert nicht.

- [ ] **Step 3: Hook implementieren**

`hooks/useGameDayPollSync.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { applyGameDayPollVotes, fetchGameDayPollVotes } from '@/api/client'
import type { GameDayVotePreview } from '@/types'

export function useGameDayPollSync(gameDayId: number) {
  const [preview, setPreview] = useState<GameDayVotePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPreview(await fetchGameDayPollVotes(gameDayId))
    } catch (e: unknown) {
      setError((e as Error).message)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [gameDayId])

  useEffect(() => { load() }, [load])

  const apply = useCallback(async () => {
    if (!preview) return
    setApplying(true)
    try {
      await applyGameDayPollVotes(
        gameDayId,
        preview.toAdd.map(p => p.id),
        preview.toRemove.map(p => p.playerId),
      )
    } finally {
      setApplying(false)
    }
  }, [gameDayId, preview])

  return { preview, loading, applying, error, reload: load, apply }
}
```

- [ ] **Step 4: Sheet implementieren**

Aufbau exakt nach Spec-Abschnitt „Gestaltung des Sync-Modals":

```tsx
export function PollVoteSyncSheet({ target, players, onApplied, onClose }: PollVoteSyncSheetProps) {
  const { preview, loading, applying, error, reload, apply } = useGameDayPollSync(target.id)
  const toast = useToast()
  const [busyVoter, setBusyVoter] = useState<string | null>(null)

  const addCount = preview?.toAdd.length ?? 0
  const removeCount = preview?.toRemove.length ?? 0
  const hasDelta = addCount + removeCount > 0

  const handleApply = async () => {
    try {
      await apply()
      toast.show(`Anwesenheit übernommen (+${addCount} / −${removeCount})`)
      await onApplied()
      onClose()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" onClick={onClose}
              className="font-display px-4 py-2 text-xs font-bold tracking-widest uppercase">
        Abbrechen
      </Button>
      <Button variant="navy" onClick={handleApply} disabled={!hasDelta || applying || loading}
              className="font-display px-4 py-2 text-xs font-extrabold tracking-widest uppercase">
        {applying ? 'Übernehmen…' : hasDelta ? `Übernehmen (+${addCount} / −${removeCount})` : 'Übernehmen'}
      </Button>
    </div>
  )

  return (
    <ResponsiveSheet open onClose={onClose} title="WhatsApp-Stimmen übernehmen" maxWidth="xl" footer={footer}>
      {/* 1 Bilanz-Badges, 2 Diff, 3 Unbekannte, 4 Optionen eingeklappt */}
    </ResponsiveSheet>
  )
}
```

Inhalt der vier Blöcke:

1. **Bilanz** — `Badge color="green"` mit `aria-label={`${preview.yesCount} Spieler spielen`}`, dazu ein Badge pro weiterer Option mit Anzahl. Bei `loading` stattdessen `LoadingSkeleton variant="list" rows={2}`.
2. **Diff** — zwei Listen. Zugänge: `border-l-4 border-green-500 bg-green-50/50 rounded-r-lg`, Zeile mit `Plus`-Icon + Name. Abgänge: `border-l-4 border-softball-red-500 bg-softball-red-50/50`, Zeile mit `Minus`-Icon + Name, darunter je Warnung `<p className="text-xs text-softball-red-700 flex items-start gap-1">` mit `AlertCircle`. Bei leerem Diff `EmptyState title="Anwesenheit ist aktuell" description="Alle Ja-Stimmen sind schon übernommen." icon={<CrossBones size={40} />}`. Bei `preview.voteCount === 0`: `EmptyState title="Noch keine Stimmen" description="Die Umfrage wurde gesendet, aber niemand hat abgestimmt."`.
3. **Unbekannte** — `SectionHeader` mit Count, je Wähler `UnknownVoterRow` mit `nestedDialog` (das Sheet ist selbst schon ein Sheet), `onAssign` ruft `assignVoter(name, playerId)` und danach `reload()`, `onCreate` ruft `assignNewVoter(name, playerName)` und danach `reload()`; `busy` über `busyVoter`.
4. **Optionen** — `CollapsibleSection title="Wer hat was gewählt"`, je Option Überschrift mit Optionstext + Anzahl, Wähler als Chips `inline-flex items-center px-3 py-1 rounded-full bg-navy-50 border border-navy-100 text-sm`. Die erste Option trägt zusätzlich den Hinweis „zählt als anwesend".

Bei `error`: Karte statt Inhalt — `<div className="m-4 p-4 rounded-lg bg-softball-red-50 border border-softball-red-200">` mit `AlertCircle`, `error`-Text und Link `Zur WhatsApp-Einrichtung` (`navigate('/orga/whatsapp')`).

Responsiveness: Listenzeilen `flex flex-wrap items-baseline gap-x-2`, Chips umbrechend, `maxWidth="xl"` greift nur ab `sm` — mobil ist es das Bottom-Sheet mit `max-h-[90vh]` und eigenem Scrollbereich (kommt aus `ResponsiveSheet`).

- [ ] **Step 5: Tests grün**

Run: `cd frontend && npm test -- PollVoteSyncSheet`
Expected: PASS (6 Tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/planner/PollVoteSyncSheet.tsx \
        frontend/src/components/planner/PollVoteSyncSheet.test.tsx \
        frontend/src/hooks/useGameDayPollSync.ts
git commit -m "✨ Vorschau-Modal für WhatsApp-Stimmen (Diff, Warnungen, Inline-Zuordnung)"
```

---

### Task 14: Verdrahtung im GameDayPlanner

**Files:**
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx`
- Test: `frontend/src/components/planner/GameDayPlanner.test.tsx` (bestehende Datei; falls keine existiert, Test in `PollVoteSyncSheet.test.tsx` ergänzen und hier nur Build prüfen)

**Interfaces:**
- Consumes: `PollVoteSyncSheet` (Task 13), `getGameDayPollVotes` (Task 8)
- Produces: nichts für Folge-Tasks

- [ ] **Step 1: Failing Test schreiben**

```tsx
it('zeigt den Stimmen-Button nur wenn eine gesendete Umfrage existiert', async () => {
  vi.mocked(getGameDayPollVotes).mockResolvedValue({ pollExists: true, sent: true, unknownVoters: ['Sandra W.'],
    toAdd: [], toRemove: [], optionVoters: [], voteCount: 3, yesCount: 2 })
  renderPlanner()

  expect(await screen.findByRole('button', { name: /WhatsApp-Stimmen/ })).toBeInTheDocument()
  expect(screen.getByText(/1 unbekannte/)).toBeInTheDocument()
})

it('versteckt den Button ohne Umfrage', async () => {
  vi.mocked(getGameDayPollVotes).mockResolvedValue({ pollExists: false, sent: false, unknownVoters: [],
    toAdd: [], toRemove: [], optionVoters: [], voteCount: 0, yesCount: 0 })
  renderPlanner()

  await waitFor(() => expect(screen.queryByRole('button', { name: /WhatsApp-Stimmen/ })).not.toBeInTheDocument())
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npm test -- GameDayPlanner`
Expected: FAIL — Button existiert nicht.

- [ ] **Step 3: Button + Badge einbauen**

Beim Laden des Spieltags `getGameDayPollVotes(gameDay.id)` aufrufen und Ergebnis in `pollStatus` halten. Button in **beide** Toolbar-Zeilen einhängen — er sitzt direkt neben „Anwesend (N)", damit das Sync-Sheet auf oberster Ebene öffnet (nur der „neuer Spieler"-Dialog darin ist `nested`; ein Sheet-im-Sheet-im-Sheet würde vaul auf dem Handy brechen):

Mobile (`sm:hidden`, unter der `grid-cols-2`-Zeile):

```tsx
            {pollStatus?.pollExists && pollStatus.sent && (
              <button
                onClick={() => setShowPollSync(true)}
                className="px-3 py-2.5 text-sm rounded-lg font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 bg-white border border-cream-300 text-navy-800 hover:bg-navy-800 hover:text-white transition-colors"
              >
                <UsersIcon size={16} />
                <span>WhatsApp-Stimmen</span>
                {pollStatus.unknownVoters.length > 0 && (
                  <Badge color="red" size="sm">⚠️ {pollStatus.unknownVoters.length} unbekannt</Badge>
                )}
              </button>
            )}
```

Desktop (`hidden sm:flex`-Zeile): gleicher Button im `font-display px-3 py-2 text-xs font-extrabold tracking-widest uppercase`-Stil der Nachbarbuttons.

Sheet rendern:

```tsx
      {showPollSync && (
        <PollVoteSyncSheet
          target={{ type: 'GAME_DAY', id: gameDay.id }}
          players={players}
          onApplied={async () => {
            const updated = await api.getGameDay(gameDay.id)
            setGameDay(updated)
            setPollStatus(await getGameDayPollVotes(gameDay.id))
          }}
          onClose={() => setShowPollSync(false)}
        />
      )}
```

- [ ] **Step 4: Manuell auf Desktop und Handy prüfen**

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml   # Terminal 2
cd frontend && npx vite                                          # Terminal 3
```

Prüfen: (a) Desktop-Breite — Center-Modal, Footer sichtbar, Diff scrollt innen; (b) `375px` Breite in den DevTools — Bottom-Sheet, Drag-Handle, Footer über der Safe-Area, Chips brechen um; (c) „Neuer Spieler" im Sheet öffnet auf dem Handy als verschachtelter Drawer und schließt zurück auf das Sync-Sheet, ohne dass beide verschwinden.

- [ ] **Step 5: Tests + Build grün**

Run: `cd frontend && npm test && npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/planner/
git commit -m "✨ Spieltag: WhatsApp-Stimmen holen direkt neben der Anwesenheit"
```

---

### Task 15: Dokumentation + Abschluss-Verifikation

**Files:**
- Modify: `docs/GAMEDAY.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: alles aus Task 1–14
- Produces: nichts

- [ ] **Step 1: docs/GAMEDAY.md ergänzen**

Abschnitt „WhatsApp-Spieltag-Umfrage" mit: Poll-Modus `GAME_DAY`, Versand 7 Tage vorher, erste Antwortoption = anwesend, Vorschau-Endpoints, Delta-Apply über `AvailabilityService` (Kaskade!), max. eine Umfrage pro Spieltag, Alias-Zuordnung im Modal.

- [ ] **Step 2: CLAUDE.md korrigieren**

Im Abschnitt „Architecture — Onion / Hexagonal" `CarService` aus der Service-Liste entfernen (existiert nicht) und `GameDayVoteSyncService` ergänzen; bei „Key domain rules" den Satz zur Cascade um den Hinweis erweitern, dass die Spieltag-Umfrage nur über die Vorschau schreibt.

- [ ] **Step 3: Volle Verifikation**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
cd frontend && npm run lint && npm test && npm run build
```
Expected: alles PASS. Scoring-E2E ist nicht nötig — keine Änderung an Scoring/Spielbogen/`useScoring`.

- [ ] **Step 4: Production-Build-Smoketest**

```bash
cd backend && ./mvnw package -s .mvn/local-settings.xml -DskipTests
java -jar target/lineup-planner-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```
Expected: Start ohne Flyway-Fehler (V53 läuft gegen die lokale DB durch), `ddl-auto=validate` meldet keine Schema-Abweichung.

- [ ] **Step 5: Commit**

```bash
git add docs/GAMEDAY.md CLAUDE.md
git commit -m "📝 Doku: Spieltag-Umfrage in GAMEDAY.md, CLAUDE.md korrigiert"
```

---

## Self-Review

**Spec-Coverage:**

| Spec-Anforderung | Task |
|---|---|
| Migration V53 (mode, game_day_id, Unique-Index) | 1 |
| `whatsapp_synced_vote` generalisiert, alle Stimmen per Upsert | 1 (SQL), 2 (Code), 5 (`persist`) |
| `PollMode`-Enum + Domain/Entity/Mapper/DTO | 1 |
| `PollVoteSyncService` nur noch `mode == TRAINING` | 1 |
| `GAME_DAY` nutzt `isDueOneOff`, `lastSentMessageId` bei „Jetzt senden" | 4 |
| Validierung (`gameDayId`, `sendDate`, kein Vergangenheitsdatum, `enabled=true`) | 4 |
| Modus-Wechsel verwirft Kopplung + Historie | 4 |
| Erste Option = anwesend, Ja gewinnt bei Alias-Konflikt | 3 |
| Optionsaufschlüsselung statt hart verdrahteter Fährt/Hilft-Listen | 3, 13 |
| Vorschau-Endpoint + Sidecar-Verbindungsprüfung | 5 |
| Kaskaden-Warnungen (Lineup, DH, Staff) | 5 |
| Apply als Delta auf aktuellen Stand über `AvailabilityService` | 6 |
| Unbekannte Wähler mit Quelle Training/Spieltag | 7 |
| Editor: dritter Modus, Spieltag-Dropdown, `sendDate` = −7 Tage (manuell nicht überschreiben) | 10 |
| Zwei Vorlagen mit Platzhaltern | 10 |
| Poll-Übersicht: dritte Gruppe | 11 |
| Inline-Alias-Zuordnung, geteilte Zeilen-Komponente | 12 |
| Modal-Gestaltung (Bilanz, Diff, Zustände, a11y), Desktop + Handy | 13, 14 |
| Button + Badge im Spieltag | 14 |
| Generischer `target` für den Trainings-Folgeschritt | 13 |

**Abweichung von der Spec:** „Fährt"/„Hilft" sind nicht als feste Kategorien umgesetzt, sondern als Aufschlüsselung pro Antwortoption mit dem Optionstext als Überschrift. Grund: Bei der Auswärts-Vorlage ist Option 2 das Auto, bei der Heim-Vorlage der Aufbau-Helfer — eine feste Zuordnung wäre für eine der beiden Vorlagen falsch.

**Placeholder-Scan:** keine „TBD"/„TODO"/„analog implementieren"-Schritte; jede Code-Änderung ist als Snippet oder als exakte Ersetzungsanweisung ausgeschrieben.

**Typkonsistenz geprüft:** `PollMode` (Task 1) wird in 4/8/10/11 identisch benutzt; `GameDayVoteMirror.Result`/`OptionVoters` (3) fließen unverändert in `Preview` (5) und `GameDayVotePreviewResponse` (5) und dort feldgleich in `GameDayVotePreview` (8) und `PollVoteSyncSheet` (13); `SyncedVote.forGameDay` (2) wird in 5 und 7 verwendet; `UnknownVoter.source/targetId/date` (7) passt zu `UnknownVoterRow.subline` (12).
