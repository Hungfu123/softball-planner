# Lineup-Set = voller Gameday-Snapshot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Lineup-Set speichert & stellt den kompletten Gameday-Zustand wieder her — verfügbare Spieler (Roster) + Lineup je Spiel + Base-Coaches je Spiel — und das Anwenden überschreibt alles konfliktfrei, mit Confirm-Dialog.

**Architecture:** `LineupSet` erhält zwei neue Kind-Listen (Staff + verfügbare Spieler), 1:1 nach dem bestehenden `lineup_set_entry`-Muster. `snapshot()` erfasst zusätzlich `GameStaff` je Spiel + die `GameDay.availablePlayers`. Das Anwenden bleibt Frontend-orchestriert, aber in fester Reihenfolge: erst verfügbare Spieler setzen (Cascade), dann pro Spiel Coaches leeren → Lineup → Set-Coaches.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway (PostgreSQL, Testcontainers), React 19 + TS, Vite.

## Global Constraints

- Onion/Hexagonal: `domain` kennt kein Spring/JPA; `application` nur `domain`; `*RepositoryAdapter` implementiert Port. Keine Schichtverletzung.
- Maven immer mit `-s .mvn/local-settings.xml`. `~/.m2/settings.xml` NICHT anfassen.
- Testcontainers braucht laufenden Docker-Daemon.
- Schema-Änderungen nur via neuer `V{n}__*.sql`; `ddl-auto=validate`. Nächste freie Version: **V51** (V50 belegt).
- Commits: Conventional + gitmoji, **kein** `Co-Authored-By`. Nur gezielt per Pfad stagen (kein `git add -A`).
- Deutsch in aller UI-Copy und Toasts.
- Sandbox bwrap kaputt → read-only Bash mit `dangerouslyDisableSandbox`.
- Base-Coach-Rollen: `StaffRole.BASE_COACH_1ST`, `StaffRole.BASE_COACH_3RD`.
- Apply-Reihenfolge ist zwingend: (0) verfügbare Spieler → pro Spiel (1) `setStaff([])` → (2) `setLineup` → (3) `setStaff(set-Coaches)`.

---

### Task 1: Persistenz — Staff + verfügbare Spieler im LineupSet (Migration V51)

Zwei neue Kind-Tabellen + Entities + Model-Felder + Mapper/Adapter-Round-Trip, nach dem `lineup_set_entry`-Muster. Kein Snapshot-Verhalten (Task 2). Gate: Boot + Flyway-Migrate + `validate` + Save/Load-Round-Trip grün.

**Files:**
- Create: `backend/src/main/resources/db/migration/V51__lineup_set_staff_and_available.sql`
- Create: `backend/src/main/java/com/softball/domain/model/LineupSetStaffEntry.java`
- Modify: `backend/src/main/java/com/softball/domain/model/LineupSet.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/LineupSetStaffEntity.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/LineupSetAvailablePlayerEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/LineupSetEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/LineupSetMapper.java`

**Interfaces:**
- Produces:
  - `LineupSetStaffEntry(Integer gameNumber, Player player, StaffRole role)` + `getId/setId`
  - `LineupSet.getStaffEntries()/setStaffEntries(List<LineupSetStaffEntry>)`
  - `LineupSet.getAvailablePlayerIds()/setAvailablePlayerIds(List<Long>)`

- [ ] **Step 1: Migration**

`V51__lineup_set_staff_and_available.sql`:

```sql
CREATE TABLE lineup_set_staff (
    id            BIGSERIAL PRIMARY KEY,
    lineup_set_id BIGINT NOT NULL REFERENCES lineup_set(id) ON DELETE CASCADE,
    game_number   INT NOT NULL,
    player_id     BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    role          VARCHAR(32) NOT NULL
);
CREATE INDEX idx_lineup_set_staff_set ON lineup_set_staff(lineup_set_id);

CREATE TABLE lineup_set_available_player (
    id            BIGSERIAL PRIMARY KEY,
    lineup_set_id BIGINT NOT NULL REFERENCES lineup_set(id) ON DELETE CASCADE,
    player_id     BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX idx_lineup_set_avail_set ON lineup_set_available_player(lineup_set_id);
```

- [ ] **Step 2: Domain-Model `LineupSetStaffEntry`**

`domain/model/LineupSetStaffEntry.java`:

```java
package com.softball.domain.model;

public class LineupSetStaffEntry {
    private Long id;
    private Integer gameNumber;
    private Player player;
    private StaffRole role;

    public LineupSetStaffEntry() {}

    public LineupSetStaffEntry(final Integer gameNumber, final Player player, final StaffRole role) {
        this.gameNumber = gameNumber;
        this.player = player;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public Player getPlayer() { return player; }
    public void setPlayer(final Player player) { this.player = player; }
    public StaffRole getRole() { return role; }
    public void setRole(final StaffRole role) { this.role = role; }
}
```

- [ ] **Step 3: `LineupSet` um zwei Listen erweitern**

In `domain/model/LineupSet.java` bei den Feldern ergänzen:

```java
    private List<LineupSetStaffEntry> staffEntries = new ArrayList<>();
    private List<Long> availablePlayerIds = new ArrayList<>();
```

und Getter/Setter:

```java
    public List<LineupSetStaffEntry> getStaffEntries() { return staffEntries; }
    public void setStaffEntries(final List<LineupSetStaffEntry> staffEntries) { this.staffEntries = staffEntries; }
    public List<Long> getAvailablePlayerIds() { return availablePlayerIds; }
    public void setAvailablePlayerIds(final List<Long> availablePlayerIds) { this.availablePlayerIds = availablePlayerIds; }
```

- [ ] **Step 4: Entity `LineupSetStaffEntity`**

`adapter/out/persistence/entity/LineupSetStaffEntity.java`:

```java
package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.StaffRole;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "lineup_set_staff")
public class LineupSetStaffEntity {

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
    @Column(name = "role", nullable = false, length = 32)
    private StaffRole role;

    public LineupSetStaffEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LineupSetEntity getLineupSet() { return lineupSet; }
    public void setLineupSet(final LineupSetEntity lineupSet) { this.lineupSet = lineupSet; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public PlayerEntity getPlayer() { return player; }
    public void setPlayer(final PlayerEntity player) { this.player = player; }
    public StaffRole getRole() { return role; }
    public void setRole(final StaffRole role) { this.role = role; }
}
```

- [ ] **Step 5: Entity `LineupSetAvailablePlayerEntity`**

`adapter/out/persistence/entity/LineupSetAvailablePlayerEntity.java`:

```java
package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "lineup_set_available_player")
public class LineupSetAvailablePlayerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lineup_set_id", nullable = false)
    @JsonIgnore
    private LineupSetEntity lineupSet;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_id", nullable = false)
    private PlayerEntity player;

    public LineupSetAvailablePlayerEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LineupSetEntity getLineupSet() { return lineupSet; }
    public void setLineupSet(final LineupSetEntity lineupSet) { this.lineupSet = lineupSet; }
    public PlayerEntity getPlayer() { return player; }
    public void setPlayer(final PlayerEntity player) { this.player = player; }
}
```

- [ ] **Step 6: `LineupSetEntity` um beide OneToMany erweitern**

In `LineupSetEntity.java` bei den Feldern (analog `entries`):

```java
    @OneToMany(mappedBy = "lineupSet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<LineupSetStaffEntity> staff = new ArrayList<>();

    @OneToMany(mappedBy = "lineupSet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<LineupSetAvailablePlayerEntity> availablePlayers = new ArrayList<>();
```

und Getter/Setter:

```java
    public List<LineupSetStaffEntity> getStaff() { return staff; }
    public void setStaff(final List<LineupSetStaffEntity> staff) { this.staff = staff; }
    public List<LineupSetAvailablePlayerEntity> getAvailablePlayers() { return availablePlayers; }
    public void setAvailablePlayers(final List<LineupSetAvailablePlayerEntity> availablePlayers) { this.availablePlayers = availablePlayers; }
```

(Hinweis: mehrere EAGER-Collections auf einer Entity — bereits `entries` ist EAGER; drei EAGER-Bags können eine `MultipleBagFetchException` auslösen. Falls beim Boot dieser Fehler auftritt, die drei Collections auf `Set` statt `List` umstellen ODER `@Fetch(FetchMode.SUBSELECT)` (org.hibernate.annotations.Fetch) auf alle drei setzen. Bevorzugt SUBSELECT, da Reihenfolge in den Mappern ohnehin sortiert wird.)

- [ ] **Step 7: Mapper erweitern**

In `LineupSetMapper.java` — `toDomain`: nach `set.setEntries(...)` ergänzen:

```java
        set.setStaffEntries(entity.getStaff().stream()
            .map(s -> {
                final LineupSetStaffEntry e = new LineupSetStaffEntry(
                    s.getGameNumber(), playerMapper.toDomain(s.getPlayer()), s.getRole());
                e.setId(s.getId());
                return e;
            })
            .toList());
        set.setAvailablePlayerIds(entity.getAvailablePlayers().stream()
            .map(a -> a.getPlayer().getId())
            .toList());
```

`toEntity`: nach `entity.setEntries(...)` ergänzen:

```java
        entity.setStaff(domain.getStaffEntries().stream().map(d -> {
            final LineupSetStaffEntity e = new LineupSetStaffEntity();
            e.setLineupSet(entity);
            e.setGameNumber(d.getGameNumber());
            e.setPlayer(playerRepo.getReferenceById(d.getPlayer().getId()));
            e.setRole(d.getRole());
            return e;
        }).toList());
        entity.setAvailablePlayers(domain.getAvailablePlayerIds().stream().map(pid -> {
            final LineupSetAvailablePlayerEntity a = new LineupSetAvailablePlayerEntity();
            a.setLineupSet(entity);
            a.setPlayer(playerRepo.getReferenceById(pid));
            return a;
        }).toList());
```

Nötige Imports in `LineupSetMapper.java`: `LineupSetStaffEntity`, `LineupSetAvailablePlayerEntity`, `LineupSetStaffEntry`.

- [ ] **Step 8: Round-Trip-Gate laufen lassen**

Docker muss laufen. Zuerst prüfen, ob ein LineupSet-Integrationstest existiert:

```bash
cd backend && ls src/test/java -R | grep -i "LineupSet"
```

Wenn ja: diesen Test laufen. Wenn nein: einen booten, der Flyway+validate triggert:

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringScenarioTest
```

Expected: BUILD SUCCESS (V51 migriert, Hibernate `validate` matcht `lineup_set_staff` + `lineup_set_available_player`, Context bootet mit den erweiterten Entities — kein `MultipleBagFetchException`). Tritt die Bag-Exception auf → Step-6-Hinweis anwenden und erneut laufen.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/resources/db/migration/V51__lineup_set_staff_and_available.sql \
        backend/src/main/java/com/softball/domain/model/LineupSetStaffEntry.java \
        backend/src/main/java/com/softball/domain/model/LineupSet.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/LineupSetStaffEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/LineupSetAvailablePlayerEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/LineupSetEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/mapper/LineupSetMapper.java
git commit -m "✨ LineupSet: Staff + verfügbare Spieler Persistenz-Layer (V51)"
```

---

### Task 2: Snapshot erfasst Staff + verfügbare Spieler + DTO-Response (TDD)

`snapshot()` speichert zusätzlich GameStaff je Spiel und die verfügbaren Spieler des Gamedays. DTO-Responses tragen die neuen Felder, damit das Frontend sie bekommt.

**Files:**
- Modify: `backend/src/main/java/com/softball/application/LineupSetService.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/LineupSetStaffEntryResponse.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/LineupSetResponse.java`
- Test: `backend/src/test/java/com/softball/application/LineupSetServiceTest.java` (neu, falls nicht vorhanden)

**Interfaces:**
- Consumes: `LineupSet.setStaffEntries/setAvailablePlayerIds`, `GameStaffRepository.findByGameIdIn`, `GameDayRepository.findByIdWithPlayers`
- Produces:
  - `LineupSetStaffEntryResponse(Integer gameNumber, PlayerResponse player, String role)`
  - `LineupSetResponse` mit zusätzlichen Feldern `List<LineupSetStaffEntryResponse> staff`, `List<Long> availablePlayerIds`

- [ ] **Step 1: Failing Test schreiben**

`backend/src/test/java/com/softball/application/LineupSetServiceTest.java` — Mockito-Unit-Test. Er verifiziert, dass `snapshot` GameStaff + availablePlayerIds erfasst. Konstruktor von `LineupSetService` bekommt in Task 2 zwei neue Deps (`GameStaffRepository`, `GameDayRepository`) — Test mockt alle.

```java
package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LineupSetServiceTest {

    @Mock LineupSetRepository lineupSetRepository;
    @Mock GameRepository gameRepository;
    @Mock LineupEntryRepository lineupEntryRepository;
    @Mock GameStaffRepository gameStaffRepository;
    @Mock GameDayRepository gameDayRepository;

    private LineupSetService service() {
        return new LineupSetService(lineupSetRepository, gameRepository, lineupEntryRepository,
            gameStaffRepository, gameDayRepository);
    }

    @Test
    void snapshot_capturesStaffAndAvailablePlayers() {
        final Game g1 = new Game(10L, 1);
        final Player hung = new Player(1L, "Hung", false, 1);
        final Player anne = new Player(2L, "Anne", true, 2);
        when(gameRepository.findByGameDayIdOrderByGameNumberAsc(99L)).thenReturn(List.of(g1));
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L))).thenReturn(List.of());
        when(gameStaffRepository.findByGameIdIn(List.of(10L)))
            .thenReturn(List.of(new GameStaff(g1, hung, StaffRole.BASE_COACH_1ST)));
        final GameDay gd = new GameDay();
        gd.setId(99L);
        gd.setAvailablePlayers(Set.of(hung, anne));
        when(gameDayRepository.findByIdWithPlayers(99L)).thenReturn(Optional.of(gd));
        when(lineupSetRepository.maxSortOrder(99L)).thenReturn(0);
        when(lineupSetRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service().snapshot(99L, "Set A");

        final ArgumentCaptor<LineupSet> captor = ArgumentCaptor.forClass(LineupSet.class);
        verify(lineupSetRepository).save(captor.capture());
        final LineupSet saved = captor.getValue();
        assertThat(saved.getStaffEntries()).hasSize(1);
        assertThat(saved.getStaffEntries().get(0).getRole()).isEqualTo(StaffRole.BASE_COACH_1ST);
        assertThat(saved.getStaffEntries().get(0).getGameNumber()).isEqualTo(1);
        assertThat(saved.getAvailablePlayerIds()).containsExactlyInAnyOrder(1L, 2L);
    }
}
```

(Falls die `Game`/`Player`/`GameDay`-Konstruktoren abweichen: an bestehende Tests wie `GameScoringServiceTest` angleichen — dort werden `new Game(id, number)` und `new Player(id, name, female, number)` verwendet.)

- [ ] **Step 2: Test laufen — muss fehlschlagen**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=LineupSetServiceTest
```

Expected: FAIL — Compile-Error (`LineupSetService`-Konstruktor hat noch 3 Args, `getStaffEntries` liefert leer).

- [ ] **Step 3: `LineupSetService.snapshot` implementieren**

Konstruktor + Felder erweitern:

```java
    private final GameStaffRepository gameStaffRepository;
    private final GameDayRepository gameDayRepository;

    public LineupSetService(final LineupSetRepository lineupSetRepository,
                            final GameRepository gameRepository,
                            final LineupEntryRepository lineupEntryRepository,
                            final GameStaffRepository gameStaffRepository,
                            final GameDayRepository gameDayRepository) {
        this.lineupSetRepository = lineupSetRepository;
        this.gameRepository = gameRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.gameStaffRepository = gameStaffRepository;
        this.gameDayRepository = gameDayRepository;
    }
```

In `snapshot(...)` nach dem Aufbau von `set.setEntries(...)` und vor `lineupSetRepository.save(set)`:

```java
        // Base-Coaches je Spiel
        set.setStaffEntries(gameStaffRepository.findByGameIdIn(gameIds).stream()
            .map(s -> new LineupSetStaffEntry(
                gameNumberById.get(s.getGame().getId()),
                s.getPlayer(),
                s.getRole()))
            .toList());

        // Verfügbare Spieler des Gamedays (Fallback: Vereinigung der Lineup-/DH-Spieler)
        final java.util.List<Long> availableIds = gameDayRepository.findByIdWithPlayers(gameDayId)
            .map(gd -> gd.getAvailablePlayers().stream().map(Player::getId).toList())
            .orElse(java.util.List.of());
        if (availableIds.isEmpty()) {
            final java.util.LinkedHashSet<Long> fallback = new java.util.LinkedHashSet<>();
            for (final LineupSetEntry e : set.getEntries()) {
                if (e.getPlayer() != null) fallback.add(e.getPlayer().getId());
                if (e.getDhBatterPlayer() != null) fallback.add(e.getDhBatterPlayer().getId());
            }
            set.setAvailablePlayerIds(new java.util.ArrayList<>(fallback));
        } else {
            set.setAvailablePlayerIds(new java.util.ArrayList<>(availableIds));
        }
```

Imports ergänzen: `com.softball.domain.model.LineupSetStaffEntry`, `com.softball.domain.model.Player`, `com.softball.domain.port.out.GameStaffRepository`, `com.softball.domain.port.out.GameDayRepository`.

- [ ] **Step 4: Test laufen — grün**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=LineupSetServiceTest
```

Expected: PASS.

- [ ] **Step 5: DTO `LineupSetStaffEntryResponse`**

`adapter/dto/LineupSetStaffEntryResponse.java`:

```java
package com.softball.adapter.dto;

import com.softball.domain.model.LineupSetStaffEntry;

public record LineupSetStaffEntryResponse(Integer gameNumber, PlayerResponse player, String role) {
    public static LineupSetStaffEntryResponse from(final LineupSetStaffEntry e) {
        return new LineupSetStaffEntryResponse(
            e.getGameNumber(),
            PlayerResponse.from(e.getPlayer()),
            e.getRole() != null ? e.getRole().name() : null
        );
    }
}
```

- [ ] **Step 6: `LineupSetResponse` erweitern**

`adapter/dto/LineupSetResponse.java`:

```java
package com.softball.adapter.dto;

import com.softball.domain.model.LineupSet;
import java.util.List;

public record LineupSetResponse(Long id, Long gameDayId, String name,
                                List<LineupSetEntryResponse> entries,
                                List<LineupSetStaffEntryResponse> staff,
                                List<Long> availablePlayerIds) {
    public static LineupSetResponse from(final LineupSet set) {
        return new LineupSetResponse(
            set.getId(),
            set.getGameDayId(),
            set.getName(),
            set.getEntries().stream().map(LineupSetEntryResponse::from).toList(),
            set.getStaffEntries().stream().map(LineupSetStaffEntryResponse::from).toList(),
            set.getAvailablePlayerIds()
        );
    }
}
```

- [ ] **Step 7: Kompilieren + Test grün**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=LineupSetServiceTest
```

Expected: PASS (inkl. Compile aller DTO-Änderungen).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/softball/application/LineupSetService.java \
        backend/src/main/java/com/softball/adapter/dto/LineupSetStaffEntryResponse.java \
        backend/src/main/java/com/softball/adapter/dto/LineupSetResponse.java \
        backend/src/test/java/com/softball/application/LineupSetServiceTest.java
git commit -m "✨ LineupSet-Snapshot erfasst Base-Coaches + verfügbare Spieler"
```

---

### Task 3: Frontend-Types erweitern

**Files:**
- Modify: `frontend/src/types/index.ts` (rund um Zeile 92-106)

**Interfaces:**
- Produces: `LineupSetStaffEntryResponse`; `LineupSetResponse.staff`, `LineupSetResponse.availablePlayerIds`

- [ ] **Step 1: Types ergänzen**

In `frontend/src/types/index.ts`. Zuerst das Feld `player` in `LineupSetEntryResponse` ansehen (Zeile 92-99), um denselben Player-Typ für Staff zu verwenden. Neuen Typ direkt nach `LineupSetEntryResponse` einfügen:

```ts
export interface LineupSetStaffEntryResponse {
  gameNumber: number
  player: PlayerResponse
  role: string
}
```

(`PlayerResponse` = derselbe Typ, den `LineupSetEntryResponse.player` nutzt. Falls dieser Typ anders heißt — z.B. `Player` — denselben Namen verwenden wie in `LineupSetEntryResponse`.)

Dann `LineupSetResponse` (Zeile 101-106) um zwei Felder erweitern:

```ts
export interface LineupSetResponse {
  id: number
  gameDayId: number
  name: string
  entries: LineupSetEntryResponse[]
  staff: LineupSetStaffEntryResponse[]
  availablePlayerIds: number[]
}
```

- [ ] **Step 2: Build (Typecheck)**

```bash
cd frontend && npm run build
```

Expected: erfolgreich.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "✨ Frontend-Types: LineupSet Staff + availablePlayerIds"
```

---

### Task 4: Frontend-Apply — verfügbare Spieler + Coaches überschreiben, Confirm immer

`applySet` überschreibt pro Spiel Coaches, `GameDayPlanner` setzt zuerst die verfügbaren Spieler, lädt Staff neu, und der Confirm-Dialog erscheint immer.

**Files:**
- Modify: `frontend/src/hooks/useLineup.ts` (`applySet`, ca. Zeile 380-445; `buildGameDraft` ca. 352)
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx` (`doApplySet`, `handleApplySet`, ca. 175-201; Confirm-JSX)

**Interfaces:**
- Consumes: `LineupSetStaffEntryResponse` (Task 3), `useStaff().save`, `useGameDay().setAvailablePlayers`
- Produces: `applySet(entries, staffEntries, games)` (neue Signatur — `availablePlayers`-Param entfällt)

- [ ] **Step 1: `applySet`-Signatur + Spieler-Map aus Set + Coaches-Schritte**

In `frontend/src/hooks/useLineup.ts`, `applySet` umbauen. Neue Signatur + `availableById` aus den Set-Entries selbst (alle Set-Spieler auflösbar → keine Skips), plus Staff nach dem Lineup-Save schreiben.

Signatur + Map-Aufbau ersetzen:

```ts
  const applySet = useCallback(async (
    setItems: LineupSetEntryResponse[],
    staffItems: LineupSetStaffEntryResponse[],
    games: { id: number; gameNumber: number }[],
  ): Promise<number[]> => {
    // Spieler-Map direkt aus den Set-Daten (Field-Player + DH-Batter) — jeder
    // Set-Spieler ist damit auflösbar; die verfügbaren Spieler wurden vom Planner
    // vorher passend gesetzt.
    const availableById = new Map<number, Player>()
    for (const e of setItems) {
      availableById.set(e.player.id, e.player)
      if (e.dhBatterPlayer) availableById.set(e.dhBatterPlayer.id, e.dhBatterPlayer)
    }
    const staffByGameNumber = new Map<number, { playerId: number; role: string }[]>()
    for (const s of staffItems) {
      const arr = staffByGameNumber.get(s.gameNumber) ?? []
      arr.push({ playerId: s.player.id, role: s.role })
      staffByGameNumber.set(s.gameNumber, arr)
    }
    const byGameNumber = new Map<number, LineupSetEntryResponse[]>()
    for (const e of setItems) {
      const arr = byGameNumber.get(e.gameNumber) ?? []
      arr.push(e)
      byGameNumber.set(e.gameNumber, arr)
    }
    const activeId = activeIdRef.current
    const skipped: number[] = []
```

Import `LineupSetStaffEntryResponse` oben in `useLineup.ts` ergänzen (neben `LineupSetEntryResponse`).

Im „Complete lineup — persist immediately"-Zweig: nach dem erfolgreichen `await api.setLineup(g.id, payload)` die Coaches konfliktfrei setzen — erst leeren, dann Set-Coaches. Genauer die Reihenfolge pro Spiel: **vor** `setLineup` einmal `setStaff([])`, danach `setStaff(set-coaches)`. Den persist-Zweig so anpassen:

```ts
      // Complete lineup — persist. Reihenfolge: Coaches leeren → Lineup → Set-Coaches.
      await api.setStaff(g.id, [])
      const payload = draft.map((e, i) => ({
        playerId: e.player.id,
        position: e.position ?? null,
        battingOrder: i + 1,
        dhBatterPlayerId: e.dhBatterId,
      }))
      const saved = await api.setLineup(g.id, payload)
      const setCoaches = staffByGameNumber.get(g.gameNumber) ?? []
      if (setCoaches.length > 0) await api.setStaff(g.id, setCoaches)
```

(Der bestehende Skip-Zweig für Games mit leeren Slots bleibt unverändert als Sicherheitsnetz. Da `availableById` jetzt alle Set-Spieler enthält, entstehen im Normalfall keine leeren Slots mehr.)

Am Ende die Dependency-Liste des `useCallback` prüfen: `applySet` hängt von nichts Externem ab, `[]` bleibt korrekt (nutzt nur `api`, `activeIdRef`, `cache`, `setEntries`, `setSavedEntries` — alle stabil/Refs). Falls ESLint eine Dep verlangt, entsprechend ergänzen.

- [ ] **Step 2: Build (Signatur bricht Aufrufer — erwartet)**

```bash
cd frontend && npm run build
```

Expected: FAIL — `GameDayPlanner.doApplySet` ruft `applySet` noch mit alter Signatur (`set.entries, games, availablePlayers`). Wird in Step 3 gefixt.

- [ ] **Step 3: `GameDayPlanner` — verfügbare Spieler zuerst, Staff neu laden, Confirm immer**

In `frontend/src/components/planner/GameDayPlanner.tsx`.

`doApplySet` ersetzen:

```tsx
  const doApplySet = async (set: LineupSetResponse) => {
    const games = (gameDay?.games ?? []).map(g => ({ id: g.id, gameNumber: g.gameNumber }))
    try {
      // 0. Verfügbare Spieler aus dem Set setzen (Cascade räumt Fremde aus allen Spielen)
      if (set.availablePlayerIds && set.availablePlayerIds.length > 0) {
        await gameDay.setAvailablePlayers(set.availablePlayerIds)
      }
      // 1-3. pro Spiel: Coaches leeren → Lineup → Set-Coaches (in applySet)
      const skipped = await lineup.applySet(set.entries, set.staff, games)
      setActiveSetId(set.id)
      // Staff des aktiven Spiels neu laden, damit CoachSlots stimmen
      if (activeGame) await staff.load(activeGame.id)
      await refreshStats()
      if (skipped.length === 0) {
        toast.show(`Set „${set.name}" angewendet & gespeichert`, 'success')
      } else {
        toast.show(
          `Set „${set.name}" angewendet. Spiel ${skipped.join(', ')}: freie Slots — bitte füllen & speichern`,
        )
      }
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }
```

(`activeGame` ist in `GameDayPlanner` bereits vorhanden — dieselbe Referenz, die im First-Load-Gate `staff.load(activeGame.id)` nutzt. Falls der Name im lokalen Scope abweicht, den dort verwendeten aktiven-Spiel-Wert verwenden.)

`handleApplySet` ersetzen — Confirm **immer**:

```tsx
  const handleApplySet = (set: LineupSetResponse) => {
    setPendingApplySet(set)
  }
```

- [ ] **Step 4: Confirm-Dialog-Text anpassen**

Das `ConfirmModal` für `pendingApplySet` finden (`grep -n "pendingApplySet" frontend/src/components/planner/GameDayPlanner.tsx`) und `message` (und ggf. `title`) auf den vollen Snapshot anpassen:

```tsx
          title="Set anwenden?"
          message="Verfügbare Spieler, Lineups und Base-Coaches des ganzen Spieltags werden mit dem Set überschrieben."
          confirmLabel="Ja, anwenden"
```

`onConfirm` muss `doApplySet(pendingApplySet)` aufrufen und `pendingApplySet` danach zurücksetzen (bestehende Verdrahtung beibehalten, nur Texte ändern).

- [ ] **Step 5: Lint + Build**

```bash
cd frontend && npm run lint && npm run build
```

Expected: keine Fehler.

- [ ] **Step 6: Manuelle Verifikation (falls lokal lauffähig)**

DB + Backend + Frontend starten. Szenario:
1. Lineup + Base-Coach bauen, als Set „A" speichern.
2. Verfügbare Spieler ändern (einen entfernen, anderen dazu), anderes Lineup bauen.
3. Set „A" anwenden → Confirm erscheint → bestätigen.
4. Erwartung: verfügbare Spieler = Set-A-Roster, Lineup + Base-Coach von A wiederhergestellt, **kein** „bereits als Base Coach"-Fehler, keine Skip-Meldung.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/useLineup.ts frontend/src/components/planner/GameDayPlanner.tsx
git commit -m "✨ Set anwenden: verfügbare Spieler + Base-Coaches überschreiben, Confirm immer"
```

---

## Self-Review

**Spec coverage:**
- Set speichert Base-Coaches → Task 1 (Persistenz) + Task 2 (snapshot). ✓
- Set speichert verfügbare Spieler → Task 1 + Task 2 (availablePlayerIds, inkl. Fallback). ✓
- Anwenden überschreibt verfügbare Spieler (Cascade) → Task 4 Step 3 (setAvailablePlayers zuerst). ✓
- Anwenden überschreibt Lineup + Coaches konfliktfrei (Reihenfolge clear→lineup→coaches) → Task 4 Step 1. ✓
- Confirm immer → Task 4 Step 3 (`handleApplySet` setzt immer `pendingApplySet`) + Step 4 (Text). ✓
- Skips entfallen (Spieler-Map aus Set) → Task 4 Step 1. ✓
- Alte Sets → Fallback availablePlayerIds + leere Coaches → Task 2 Step 3 (Fallback), Task 4 (leere staffByGameNumber → nur `setStaff([])`). ✓
- DTO liefert neue Felder ans FE → Task 2 Step 5/6, Task 3. ✓

**Placeholder scan:** Keine TBD/TODO; jeder Code-Step zeigt vollständigen Code. Der `MultipleBagFetchException`-Hinweis in Task 1 Step 6 ist eine konkrete Fallback-Anweisung, kein Platzhalter.

**Type consistency:** `applySet(setItems, staffItems, games)` — neue Signatur in Task 4 Step 1 definiert, in Step 3 exakt so aufgerufen (`lineup.applySet(set.entries, set.staff, games)`). `LineupSetStaffEntryResponse` Felder (`gameNumber`, `player`, `role`) konsistent zwischen BE-DTO (Task 2 Step 5), FE-Type (Task 3), FE-Nutzung (Task 4). Rollen als String (`BASE_COACH_1ST`/`_3RD`) durchgängig; `api.setStaff` erwartet `{ playerId, role }[]` (bestätigt in `useStaff.save`). Tabellen `lineup_set_staff` / `lineup_set_available_player` identisch in Migration + Entity-`@Table`.
