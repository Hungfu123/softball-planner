# WhatsApp-Poll-Stimmen → Trainings-Anwesenheit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** „Ja"-Stimmen der wiederkehrenden WhatsApp-Umfrage werden automatisch zur Trainingszeit als anwesend in die Trainings-Anwesenheit geschrieben; unbekannte Wähler werden auf einem neuen WhatsApp-Tab der Spieler-Seite zugeordnet.

**Architecture:** Onion/Hexagonal (Domain → Application → Adapter). Der Node-Sidecar (`whatsapp-service`) liest Poll-Stimmen live über `vote_update` und stellt sie per HTTP bereit. Ein Backend-`@Scheduled`-Service pullt sie zur Trainingszeit, matcht Push-Namen gegen `Player.whatsappName`, persistiert jede Stimme in `whatsapp_synced_vote` und bucht bekannte „Ja"-Wähler als anwesend. Unbekannte Wähler (kein Match) werden als `player_id = null` gehalten und im Frontend zugeordnet.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway, PostgreSQL 17, Testcontainers/JUnit5; Node.js + whatsapp-web.js (Sidecar); React 19 + TypeScript + Vite + Tailwind v4.

## Global Constraints

- Onion-Regel: `domain` kennt kein Spring/JPA/DTO. `application` hängt nur an `domain`. Adapter implementieren Domain-Ports. Niemals eine Outer-Layer-Klasse aus einer Inner-Layer importieren.
- Schemaänderungen ausschließlich per neuer `V{n}__*.sql` unter `backend/src/main/resources/db/migration/`. `spring.jpa.hibernate.ddl-auto=validate` — Entity muss zur Migration passen. Nächste freie Version: **V45** (V44 ist höchste).
- Maven immer mit `-s .mvn/local-settings.xml`. Tests brauchen laufenden Docker (Testcontainers).
- Deutsche UI/Fehlermeldungen. `BusinessValidationException` → 400, `ResourceNotFoundException` → 404.
- Tabellennamen (verifiziert): `players`, `trainings`, `training_attendance`, `whatsapp_polls`, `training_periods`.
- WhatsApp-REST-Basis im Backend: `/api/orga/whatsapp`. Sidecar-Basis-URL über `whatsapp.service.url` (default `http://localhost:3000`), Header `X-Service-Token`.
- Commits: Conventional Commits mit gitmoji-Prefix, **keine** `Co-Authored-By`-Zeilen.
- Vor Merge: `cd frontend && npm run build` + `cd backend && ./mvnw test -s .mvn/local-settings.xml`.

---

## File Structure

**Domain (neu):**
- `domain/model/WhatsappVote.java` — Record `{ String voterName, List<String> options }` (Sidecar-Rohstimme).
- `domain/model/SyncedVote.java` — POJO `{ id, Long trainingId, String voterName, Long playerId, boolean present }`.
- `domain/port/out/SyncedVoteRepository.java` — Port für `whatsapp_synced_vote`.
- `domain/service/TargetTrainingResolver.java` — reine Datums-Auflösung Poll→Training.
- `domain/service/VotePresenceEvaluator.java` — reine „Ja"-Erkennung + Zeit-Gate-Parsing.

**Domain (geändert):**
- `domain/model/Player.java` — Feld `whatsappName`.
- `domain/model/WhatsappPoll.java` — Feld `lastSentMessageId`.
- `domain/port/out/WhatsappSender.java` — `sendPoll` gibt `String` zurück; neu `fetchVotes`.
- `domain/port/out/TrainingRepository.java` — neu `findFirstUpcomingNonCancelled(...)` (oder in-memory über bestehende Methoden — siehe Task).

**Application (neu):**
- `application/PollVoteSyncService.java` — Sync-Orchestrierung + `@Scheduled` + Test-Trigger.
- `application/VoterAssignmentService.java` — Zuweisen/Neuer-Spieler + Re-Match.

**Application (geändert):**
- `application/WhatsappPollScheduler.java` — `lastSentMessageId` stempeln.

**Adapter (neu):**
- `adapter/out/persistence/entity/SyncedVoteEntity.java`, `mapper/SyncedVoteMapper.java`, `repository/SpringSyncedVoteRepository.java`, `adapter/SyncedVoteRepositoryAdapter.java`.
- `adapter/dto/UnknownVoterResponse.java`, `AssignVoterRequest.java`, `AssignNewVoterRequest.java`, `SetWhatsappNameRequest.java`.
- `adapter/in/web/WhatsappVoteController.java` — Sync/Unknown/Assign-Endpoints.

**Adapter (geändert):**
- `adapter/out/whatsapp/WhatsappSenderHttpAdapter.java` — Rückgabe-ID + `fetchVotes`.
- `adapter/out/persistence/entity/PlayerEntity.java` + `mapper/PlayerMapper.java` — `whatsappName`.
- `adapter/out/persistence/entity/WhatsappPollEntity.java` + `mapper/WhatsappPollMapper.java` — `lastSentMessageId`.
- `adapter/dto/PlayerResponse` (falls vorhanden) — `whatsappName` exponieren; `PlayerController` — PUT whatsapp-name.

**Migrations (neu):** `V45__player_whatsapp_name.sql`, `V46__whatsapp_poll_last_message.sql`, `V47__whatsapp_synced_vote.sql`.

**Sidecar (geändert):** `whatsapp-service/server.js` — `vote_update`-Store, `send-poll` gibt ID, `GET /poll-votes/:msgId`.

**Frontend (neu/geändert):** neuer WhatsApp-Tab in der Spieler-Seite (`components/players/`), Training-Badge, `api/client.ts` + Typen.

---

## PHASE 1 — Datenmodell + Alias-Pflege

### Task 1: `Player.whatsappName` (Domain + Persistenz + Migration)

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/Player.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/PlayerEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/PlayerMapper.java`
- Create: `backend/src/main/resources/db/migration/V45__player_whatsapp_name.sql`
- Test: `backend/src/test/java/com/softball/adapter/out/persistence/mapper/PlayerMapperTest.java`

**Interfaces:**
- Produces: `Player.getWhatsappName()/setWhatsappName(String)`; DB-Spalte `players.whatsapp_name`.

- [ ] **Step 1: Migration schreiben**

`V45__player_whatsapp_name.sql`:
```sql
ALTER TABLE players ADD COLUMN whatsapp_name VARCHAR(255);
```

- [ ] **Step 2: Failing test — Mapper überträgt whatsappName**

`PlayerMapperTest.java`:
```java
package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.domain.model.Player;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerMapperTest {

    private final PlayerMapper mapper = new PlayerMapper();

    @Test
    void mapsWhatsappNameBothDirections() {
        final Player domain = new Player(1L, "Max", true, null);
        domain.setWhatsappName("Max ⚾");

        final PlayerEntity entity = mapper.toEntity(domain);
        assertThat(entity.getWhatsappName()).isEqualTo("Max ⚾");

        final Player back = mapper.toDomain(entity);
        assertThat(back.getWhatsappName()).isEqualTo("Max ⚾");
    }
}
```

- [ ] **Step 3: Run test — fails to compile**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PlayerMapperTest`
Expected: FAIL (compile error — `setWhatsappName` fehlt).

- [ ] **Step 4: `Player` erweitern**

In `Player.java` Feld + Getter/Setter ergänzen:
```java
    private String whatsappName;
    // ...
    public String getWhatsappName() { return whatsappName; }
    public void setWhatsappName(final String whatsappName) { this.whatsappName = whatsappName; }
```

- [ ] **Step 5: `PlayerEntity` erweitern**

In `PlayerEntity.java`:
```java
    @Column(name = "whatsapp_name")
    private String whatsappName;
    // ...
    public String getWhatsappName() { return whatsappName; }
    public void setWhatsappName(String whatsappName) { this.whatsappName = whatsappName; }
```

- [ ] **Step 6: `PlayerMapper` erweitern**

`toDomain`: nach `new Player(...)` `player.setWhatsappName(entity.getWhatsappName());` (Variable statt Fluent — Konstruktor unverändert lassen):
```java
    public Player toDomain(final PlayerEntity entity) {
        if (entity == null) return null;
        final Player player = new Player(entity.getId(), entity.getName(), entity.isRegular(), entity.getDefaultBattingOrder());
        player.setWhatsappName(entity.getWhatsappName());
        return player;
    }
```
`toEntity` + `updateEntity`: `entity.setWhatsappName(domain.getWhatsappName());` ergänzen.

- [ ] **Step 7: Run test — passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PlayerMapperTest`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/Player.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/PlayerEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/mapper/PlayerMapper.java \
        backend/src/main/resources/db/migration/V45__player_whatsapp_name.sql \
        backend/src/test/java/com/softball/adapter/out/persistence/mapper/PlayerMapperTest.java
git commit -m "✨ Player.whatsappName (Alias für WhatsApp-Poll-Zuordnung)"
```

### Task 2: WhatsApp-Name über API pflegen (PUT)

**Files:**
- Modify: `backend/src/main/java/com/softball/application/PlayerService.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/PlayerController.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/SetWhatsappNameRequest.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/PlayerResponse.java` (whatsappName exponieren)
- Test: `backend/src/test/java/com/softball/application/PlayerServiceWhatsappNameTest.java`

**Interfaces:**
- Consumes: `PlayerRepository.findById/save`, `Player.setWhatsappName`.
- Produces: `PlayerService.setWhatsappName(Long id, String whatsappName): Player`; Endpoint `PUT /api/players/{id}/whatsapp-name`.

> Vor Start: `PlayerService.java`, `PlayerController.java`, `PlayerResponse.java` lesen, um exakte Konstruktor-/Response-Signaturen zu übernehmen. `whatsappName` im `PlayerResponse`-Record ergänzen (Feld + `from(...)`-Mapping).

- [ ] **Step 1: Failing test**

`PlayerServiceWhatsappNameTest.java`:
```java
package com.softball.application;

import com.softball.domain.model.Player;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PlayerServiceWhatsappNameTest {

    private final PlayerRepository repo = mock(PlayerRepository.class);
    // WICHTIG: echten PlayerService-Konstruktor mit allen Abhängigkeiten verwenden.
    private final PlayerService service = new PlayerService(repo);

    @Test
    void setsWhatsappName() {
        final Player p = new Player(1L, "Max", true, null);
        when(repo.findById(1L)).thenReturn(Optional.of(p));
        when(repo.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));

        final Player result = service.setWhatsappName(1L, "Max ⚾");

        assertThat(result.getWhatsappName()).isEqualTo("Max ⚾");
        verify(repo).save(argThat(x -> "Max ⚾".equals(x.getWhatsappName())));
    }

    @Test
    void throwsWhenPlayerMissing() {
        when(repo.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.setWhatsappName(9L, "x"))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
```

- [ ] **Step 2: Run — fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PlayerServiceWhatsappNameTest`
Expected: FAIL (Methode fehlt; ggf. Konstruktor-Signatur anpassen an echten `PlayerService`).

- [ ] **Step 3: Service-Methode**

In `PlayerService.java` (leeren String zu `null` normalisieren):
```java
    @Transactional
    public Player setWhatsappName(final Long id, final String whatsappName) {
        final Player player = playerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Spieler", id));
        final String normalized = (whatsappName == null || whatsappName.isBlank()) ? null : whatsappName.trim();
        player.setWhatsappName(normalized);
        return playerRepository.save(player);
    }
```

- [ ] **Step 4: DTO + Controller**

`SetWhatsappNameRequest.java`:
```java
package com.softball.adapter.dto;

public record SetWhatsappNameRequest(String whatsappName) {}
```
In `PlayerController.java`:
```java
    @PutMapping("/{id}/whatsapp-name")
    public PlayerResponse setWhatsappName(@PathVariable final Long id,
                                          @RequestBody final SetWhatsappNameRequest req) {
        return PlayerResponse.from(playerService.setWhatsappName(id, req.whatsappName()));
    }
```
`PlayerResponse`: `whatsappName` als Feld + im `from(...)` befüllen.

- [ ] **Step 5: Run — passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PlayerServiceWhatsappNameTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/application/PlayerService.java \
        backend/src/main/java/com/softball/adapter/in/web/PlayerController.java \
        backend/src/main/java/com/softball/adapter/dto/SetWhatsappNameRequest.java \
        backend/src/main/java/com/softball/adapter/dto/PlayerResponse.java \
        backend/src/test/java/com/softball/application/PlayerServiceWhatsappNameTest.java
git commit -m "✨ PUT /players/{id}/whatsapp-name — Alias pflegen"
```

### Task 3: `whatsapp_synced_vote` (Domain-Modell + Port + Persistenz + Migration)

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/SyncedVote.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/SyncedVoteRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/SyncedVoteEntity.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SyncedVoteMapper.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSyncedVoteRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SyncedVoteRepositoryAdapter.java`
- Create: `backend/src/main/resources/db/migration/V47__whatsapp_synced_vote.sql`
- Test: `backend/src/test/java/com/softball/adapter/out/persistence/SyncedVoteRepositoryAdapterIT.java`

**Interfaces:**
- Produces:
  - `SyncedVote { Long id; Long trainingId; String voterName; Long playerId; boolean present; }` (POJO, keine Training/Player-Referenzen — nur IDs, hält das Modell schlank).
  - `SyncedVoteRepository`:
    ```java
    Optional<SyncedVote> findByTrainingIdAndVoterName(Long trainingId, String voterName);
    List<SyncedVote> findByTrainingId(Long trainingId);
    List<SyncedVote> findByVoterNameAndPlayerIdIsNull(String voterName);
    List<SyncedVote> findByPlayerIdIsNull();
    SyncedVote save(SyncedVote vote);
    ```

- [ ] **Step 1: Migration**

`V47__whatsapp_synced_vote.sql`:
```sql
CREATE TABLE whatsapp_synced_vote (
    id          BIGSERIAL PRIMARY KEY,
    training_id BIGINT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    voter_name  VARCHAR(255) NOT NULL,
    player_id   BIGINT REFERENCES players(id) ON DELETE SET NULL,
    present     BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_synced_vote UNIQUE (training_id, voter_name)
);
CREATE INDEX idx_synced_vote_unknown ON whatsapp_synced_vote (player_id) WHERE player_id IS NULL;
```

- [ ] **Step 2: Domain-Modell + Port**

`SyncedVote.java` — POJO mit Feldern, Konstruktoren (leer + `(trainingId, voterName, playerId, present)`), Gettern/Settern.
`SyncedVoteRepository.java` — Interface mit den 5 Methoden oben.

- [ ] **Step 3: Entity + Mapper + Spring-Repo**

`SyncedVoteEntity.java`:
```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "whatsapp_synced_vote", uniqueConstraints = {
    @UniqueConstraint(name = "uq_synced_vote", columnNames = {"training_id", "voter_name"})
})
public class SyncedVoteEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "training_id", nullable = false)
    private Long trainingId;
    @Column(name = "voter_name", nullable = false)
    private String voterName;
    @Column(name = "player_id")
    private Long playerId;
    @Column(nullable = false)
    private boolean present;
    // Getter/Setter für alle Felder
}
```
`SpringSyncedVoteRepository.java`:
```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SyncedVoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpringSyncedVoteRepository extends JpaRepository<SyncedVoteEntity, Long> {
    Optional<SyncedVoteEntity> findByTrainingIdAndVoterName(Long trainingId, String voterName);
    List<SyncedVoteEntity> findByTrainingId(Long trainingId);
    List<SyncedVoteEntity> findByVoterNameAndPlayerIdIsNull(String voterName);
    List<SyncedVoteEntity> findByPlayerIdIsNull();
}
```
`SyncedVoteMapper.java` — `toDomain`/`toEntity`/`updateEntity` (Feld-für-Feld). `SyncedVoteRepositoryAdapter.java` — implementiert Port, delegiert an Spring-Repo + Mapper (Muster wie andere `*RepositoryAdapter`).

- [ ] **Step 4: Integration-Test (Testcontainers)**

`SyncedVoteRepositoryAdapterIT.java` — analog zu bestehenden `*IT`/Repository-Tests (bestehendes Muster prüfen, `@DataJpaTest` oder `@SpringBootTest` wie im Repo üblich). Testfälle:
```java
// 1. save + findByTrainingIdAndVoterName findet die Zeile
// 2. Upsert: zweites save mit gleicher (trainingId, voterName) via zuvor gefundene id → 1 Zeile, present aktualisiert
// 3. findByVoterNameAndPlayerIdIsNull liefert nur unbekannte
// 4. findByPlayerIdIsNull liefert alle unbekannten
```

- [ ] **Step 5: Run**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SyncedVoteRepositoryAdapterIT`
Expected: PASS (Docker läuft).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/SyncedVote.java \
        backend/src/main/java/com/softball/domain/port/out/SyncedVoteRepository.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/SyncedVoteEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/mapper/SyncedVoteMapper.java \
        backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSyncedVoteRepository.java \
        backend/src/main/java/com/softball/adapter/out/persistence/adapter/SyncedVoteRepositoryAdapter.java \
        backend/src/main/resources/db/migration/V47__whatsapp_synced_vote.sql \
        backend/src/test/java/com/softball/adapter/out/persistence/SyncedVoteRepositoryAdapterIT.java
git commit -m "✨ whatsapp_synced_vote — Persistenz für gesyncte Poll-Stimmen"
```

---

## PHASE 2 — Sidecar + Sender-Port

### Task 4: Sidecar — Message-ID zurückgeben, Stimmen tracken, Route

**Files:**
- Modify: `whatsapp-service/server.js`

**Interfaces:**
- Produces:
  - `POST /send-poll` → `{ sent: true, pollMessageId: string|null }`.
  - `GET /poll-votes/:msgId` → `[{ voterName: string, options: string[] }]`.

> Kein Java-Testrahmen — manuell verifizieren (Node). Bestehende Struktur (`client`, `connected`, `Poll`-Import) beibehalten.

- [ ] **Step 1: Vote-Store + `vote_update`-Listener**

Nach der Client-Initialisierung (bei den anderen `client.on(...)`-Handlern):
```js
// pollMsgId -> Map(voterWid -> { name, options: [] }); letzter Stand je Wähler
const pollVotes = new Map();

client.on('vote_update', async (vote) => {
  try {
    const msgId = vote.parentMessage?.id?._serialized;
    if (!msgId) return;
    const voterWid = vote.voter;
    let name = voterWid;
    try {
      const contact = await client.getContactById(voterWid);
      name = contact.pushname || contact.name || contact.number || voterWid;
    } catch (_) { /* Name nicht auflösbar → Wid als Fallback */ }
    const options = (vote.selectedOptions || []).map((o) => o.name);
    if (!pollVotes.has(msgId)) pollVotes.set(msgId, new Map());
    pollVotes.get(msgId).set(voterWid, { name, options });
    console.log('[wa] vote_update', msgId, name, options);
  } catch (e) {
    console.warn('[wa] vote_update Fehler:', e && e.message || e);
  }
});
```

- [ ] **Step 2: `send-poll` gibt Message-ID zurück**

Poll-Zweig so ändern, dass die gesendete Message-ID zurückkommt:
```js
    let pollMessageId = null;
    if (hasPoll) {
      const sent = await client.sendMessage(groupId, new Poll(title, options, { allowMultipleAnswers: allowMultiple === true }));
      pollMessageId = sent?.id?._serialized ?? null;
    }
    res.json({ sent: true, pollMessageId });
```

- [ ] **Step 3: Neue Route `GET /poll-votes/:msgId`**

```js
app.get('/poll-votes/:msgId', (req, res) => {
  const voters = pollVotes.get(req.params.msgId);
  if (!voters) return res.json([]);
  res.json(Array.from(voters.values()).map((v) => ({ voterName: v.name, options: v.options })));
});
```

- [ ] **Step 4: Manuell verifizieren**

`node server.js` starten (oder Container), gekoppelt. Poll senden → Response enthält `pollMessageId`. In WhatsApp abstimmen → `GET /poll-votes/<id>` liefert `[{voterName, options}]`. Umwählen → nur letzter Stand.

- [ ] **Step 5: Commit**

```bash
git add whatsapp-service/server.js
git commit -m "✨ WhatsApp-Sidecar: vote_update-Store, send-poll gibt Message-ID, GET /poll-votes/:msgId"
```

### Task 5: `WhatsappSender` — Rückgabe-ID + `fetchVotes`

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/port/out/WhatsappSender.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/whatsapp/WhatsappSenderHttpAdapter.java`
- Create: `backend/src/main/java/com/softball/domain/model/WhatsappVote.java`

**Interfaces:**
- Produces:
  - `WhatsappVote { String voterName; List<String> options; }` (Record).
  - `WhatsappSender.sendPoll(...)` → `String` (pollMessageId, `null` bei reiner Nachricht).
  - `WhatsappSender.fetchVotes(String msgId)` → `List<WhatsappVote>` (leer bei Fehler/unbekannt).

> Alle bestehenden `sendPoll`-Aufrufer anpassen (Scheduler + `WhatsappPollService`). Rückgabewert wird in Task 6 genutzt; Aufrufer, die ihn nicht brauchen, ignorieren ihn.

- [ ] **Step 1: Domain-Record**

`WhatsappVote.java`:
```java
package com.softball.domain.model;

import java.util.List;

public record WhatsappVote(String voterName, List<String> options) {}
```

- [ ] **Step 2: Port ändern**

In `WhatsappSender.java`:
```java
    String sendPoll(String groupId, String title, List<String> options, boolean allowMultipleAnswers, String message);
    List<WhatsappVote> fetchVotes(String msgId);
```

- [ ] **Step 3: Adapter — sendPoll gibt ID zurück**

In `WhatsappSenderHttpAdapter.java` `sendPoll` auf `String` umstellen; Response parsen:
```java
    @Override
    public String sendPoll(final String groupId, final String title, final List<String> options,
                           final boolean allowMultipleAnswers, final String message) {
        try {
            final List<String> uniqueOptions = options == null ? List.of()
                    : options.stream().map(o -> o != null ? o.trim() : "").filter(o -> !o.isEmpty()).distinct().toList();
            final Map<String, Object> body = new HashMap<>();
            body.put("groupId", groupId);
            body.put("title", title);
            body.put("options", uniqueOptions);
            body.put("allowMultiple", allowMultipleAnswers);
            body.put("message", message);
            final SendResultDto result = client.post().uri("/send-poll")
                    .body(body)
                    .retrieve()
                    .body(SendResultDto.class);
            log.info("WhatsApp-Poll gesendet: '{}' -> {}", title, groupId);
            return result != null ? result.pollMessageId() : null;
        } catch (final Exception e) {
            log.warn("WhatsApp-Poll senden fehlgeschlagen ({} -> {}): {}", title, groupId, e.getMessage());
            throw new BusinessValidationException("WhatsApp-Poll konnte nicht gesendet werden: " + e.getMessage());
        }
    }
```

- [ ] **Step 4: Adapter — fetchVotes**

```java
    @Override
    public List<WhatsappVote> fetchVotes(final String msgId) {
        try {
            final VoteDto[] votes = client.get().uri("/poll-votes/{id}", msgId)
                    .retrieve().body(VoteDto[].class);
            if (votes == null) return List.of();
            return java.util.Arrays.stream(votes)
                    .map(v -> new WhatsappVote(v.voterName(), v.options() != null ? v.options() : List.of()))
                    .toList();
        } catch (final Exception e) {
            log.warn("WhatsApp-Stimmen nicht abrufbar ({}): {}", msgId, e.getMessage());
            return List.of();
        }
    }
```
Records ergänzen:
```java
    private record SendResultDto(boolean sent, String pollMessageId) {}
    private record VoteDto(String voterName, List<String> options) {}
```

- [ ] **Step 5: Aufrufer anpassen**

`WhatsappPollService` (manueller Send): Rückgabewert ignorieren oder durchreichen. `WhatsappPollScheduler`: siehe Task 6. Kompilieren:
Run: `cd backend && ./mvnw -q -o compile -s .mvn/local-settings.xml` (falls offline nicht geht: normaler `test-compile`).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/domain/port/out/WhatsappSender.java \
        backend/src/main/java/com/softball/adapter/out/whatsapp/WhatsappSenderHttpAdapter.java \
        backend/src/main/java/com/softball/domain/model/WhatsappVote.java \
        backend/src/main/java/com/softball/application/WhatsappPollService.java
git commit -m "✨ WhatsappSender: sendPoll gibt Message-ID, neu fetchVotes"
```

### Task 6: `WhatsappPoll.lastSentMessageId` + Scheduler stempelt

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/WhatsappPoll.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/WhatsappPollEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapper.java`
- Modify: `backend/src/main/java/com/softball/application/WhatsappPollScheduler.java`
- Create: `backend/src/main/resources/db/migration/V46__whatsapp_poll_last_message.sql`
- Test: `backend/src/test/java/com/softball/application/WhatsappPollSchedulerTest.java` (bestehend erweitern)

**Interfaces:**
- Produces: `WhatsappPoll.getLastSentMessageId()/setLastSentMessageId(String)`; Spalte `whatsapp_polls.last_sent_message_id`.

- [ ] **Step 1: Migration**

`V46__whatsapp_poll_last_message.sql`:
```sql
ALTER TABLE whatsapp_polls ADD COLUMN last_sent_message_id VARCHAR(255);
```

- [ ] **Step 2: Failing test — Scheduler stempelt Message-ID**

In `WhatsappPollSchedulerTest.java` neuen Test ergänzen (bestehendes Setup/Mocks wiederverwenden — vorher lesen):
```java
    @Test
    void stampsLastSentMessageIdWhenDue() {
        final WhatsappPoll poll = /* fälliger Poll aus bestehendem Helper */ duePoll();
        when(repository.findAll()).thenReturn(List.of(poll));
        when(evaluator.isDue(eq(poll), any())).thenReturn(true);
        when(sender.sendPoll(any(), any(), any(), anyBoolean(), any())).thenReturn("msg-123");

        scheduler.tick(LocalDateTime.of(2026, 4, 13, 20, 0)); // Montag 20:00

        assertThat(poll.getLastSentMessageId()).isEqualTo("msg-123");
        verify(repository).save(poll);
    }
```

- [ ] **Step 3: Run — fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollSchedulerTest`
Expected: FAIL (`getLastSentMessageId` fehlt / wird nicht gesetzt).

- [ ] **Step 4: Modell + Entity + Mapper**

`WhatsappPoll.java`: Feld `lastSentMessageId` + Getter/Setter.
`WhatsappPollEntity.java`:
```java
    @Column(name = "last_sent_message_id", length = 255)
    private String lastSentMessageId;
    public String getLastSentMessageId() { return lastSentMessageId; }
    public void setLastSentMessageId(String v) { this.lastSentMessageId = v; }
```
`WhatsappPollMapper.java`: in beide Richtungen mappen.

- [ ] **Step 5: Scheduler**

In `WhatsappPollScheduler.tick(...)` den Rückgabewert stempeln:
```java
                final String messageId = sender.sendPoll(poll.getGroupId(), poll.getTitle(), poll.getOptions(), poll.isAllowMultipleAnswers(), poll.getMessage());
                poll.setLastSentAt(now);
                poll.setLastSentMessageId(messageId);
                repository.save(poll);
```

- [ ] **Step 6: Run — passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollSchedulerTest`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/WhatsappPoll.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/WhatsappPollEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapper.java \
        backend/src/main/java/com/softball/application/WhatsappPollScheduler.java \
        backend/src/main/resources/db/migration/V46__whatsapp_poll_last_message.sql \
        backend/src/test/java/com/softball/application/WhatsappPollSchedulerTest.java
git commit -m "✨ WhatsappPoll.lastSentMessageId — Scheduler stempelt gesendete Poll-ID"
```

---

## PHASE 3 — Sync-Logik

### Task 7: `TargetTrainingResolver` (Domain — Datumsauflösung)

**Files:**
- Create: `backend/src/main/java/com/softball/domain/service/TargetTrainingResolver.java`
- Test: `backend/src/test/java/com/softball/domain/service/TargetTrainingResolverTest.java`

**Interfaces:**
- Consumes: `Training.getDate()/isCancelled()`.
- Produces: `Optional<Training> resolve(List<Training> candidates, LocalDate sentDate)` — nächstes nicht-abgesagtes Training mit `date >= sentDate` und `date <= sentDate+7`, kleinstes Datum; sonst `Optional.empty()`.

- [ ] **Step 1: Failing test**

`TargetTrainingResolverTest.java`:
```java
package com.softball.domain.service;

import com.softball.domain.model.Training;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class TargetTrainingResolverTest {

    private final TargetTrainingResolver resolver = new TargetTrainingResolver();
    private final LocalDate sent = LocalDate.of(2026, 4, 13); // Montag

    private Training t(long id, LocalDate date, boolean cancelled) {
        final Training tr = new Training(id, date, "20:00", "Park");
        tr.setCancelled(cancelled);
        return tr;
    }

    @Test
    void picksNearestUpcomingNonCancelled() {
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, sent.plusDays(1), false),
            t(2, sent.plusDays(3), false)
        ), sent);
        assertThat(r).map(Training::getId).contains(1L);
    }

    @Test
    void includesSameDay() {
        final Optional<Training> r = resolver.resolve(List.of(t(1, sent, false)), sent);
        assertThat(r).map(Training::getId).contains(1L);
    }

    @Test
    void skipsCancelled() {
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, sent.plusDays(1), true),
            t(2, sent.plusDays(2), false)
        ), sent);
        assertThat(r).map(Training::getId).contains(2L);
    }

    @Test
    void ignoresPast() {
        final Optional<Training> r = resolver.resolve(List.of(t(1, sent.minusDays(1), false)), sent);
        assertThat(r).isEmpty();
    }

    @Test
    void ignoresBeyondSevenDays() {
        final Optional<Training> r = resolver.resolve(List.of(t(1, sent.plusDays(8), false)), sent);
        assertThat(r).isEmpty();
    }

    @Test
    void emptyWhenNoCandidates() {
        assertThat(resolver.resolve(List.of(), sent)).isEmpty();
    }
}
```

- [ ] **Step 2: Run — fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TargetTrainingResolverTest`
Expected: FAIL (Klasse fehlt).

- [ ] **Step 3: Implementierung**

```java
package com.softball.domain.service;

import com.softball.domain.model.Training;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public class TargetTrainingResolver {

    private static final int WINDOW_DAYS = 7;

    public Optional<Training> resolve(final List<Training> candidates, final LocalDate sentDate) {
        if (candidates == null || sentDate == null) return Optional.empty();
        final LocalDate limit = sentDate.plusDays(WINDOW_DAYS);
        return candidates.stream()
            .filter(t -> !t.isCancelled())
            .filter(t -> t.getDate() != null)
            .filter(t -> !t.getDate().isBefore(sentDate))
            .filter(t -> !t.getDate().isAfter(limit))
            .min(Comparator.comparing(Training::getDate));
    }
}
```

- [ ] **Step 4: Run — passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TargetTrainingResolverTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/TargetTrainingResolver.java \
        backend/src/test/java/com/softball/domain/service/TargetTrainingResolverTest.java
git commit -m "✨ TargetTrainingResolver — Poll-Sendedatum → Ziel-Training (7-Tage-Fenster)"
```

### Task 8: `VotePresenceEvaluator` (Domain — Ja-Erkennung + Zeit-Gate)

**Files:**
- Create: `backend/src/main/java/com/softball/domain/service/VotePresenceEvaluator.java`
- Test: `backend/src/test/java/com/softball/domain/service/VotePresenceEvaluatorTest.java`

**Interfaces:**
- Produces:
  - `boolean isPresent(List<String> options)` — true, wenn eine Option getrimmt-case-insensitive „ja" ist.
  - `boolean gateOpen(String trainingTime, LocalDateTime now, LocalDate trainingDate)` — true, wenn `now.toLocalDate() == trainingDate` **und** `now.time >= parse(trainingTime)`. Unparsebare/leere Zeit → true (ganztägig syncen), damit nichts crasht.

- [ ] **Step 1: Failing test**

`VotePresenceEvaluatorTest.java`:
```java
package com.softball.domain.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class VotePresenceEvaluatorTest {

    private final VotePresenceEvaluator ev = new VotePresenceEvaluator();
    private final LocalDate day = LocalDate.of(2026, 4, 14);

    @Test
    void presentWhenJaSelected() {
        assertThat(ev.isPresent(List.of("Ja"))).isTrue();
        assertThat(ev.isPresent(List.of(" ja "))).isTrue();
        assertThat(ev.isPresent(List.of("Nein"))).isFalse();
        assertThat(ev.isPresent(List.of())).isFalse();
    }

    @Test
    void gateClosedBeforeTrainingTime() {
        assertThat(ev.gateOpen("20:00", LocalDateTime.of(2026, 4, 14, 19, 59), day)).isFalse();
    }

    @Test
    void gateOpenAtOrAfterTrainingTime() {
        assertThat(ev.gateOpen("20:00", LocalDateTime.of(2026, 4, 14, 20, 0), day)).isTrue();
        assertThat(ev.gateOpen("20:00", LocalDateTime.of(2026, 4, 14, 22, 0), day)).isTrue();
    }

    @Test
    void gateClosedOnDifferentDay() {
        assertThat(ev.gateOpen("20:00", LocalDateTime.of(2026, 4, 15, 20, 0), day)).isFalse();
    }

    @Test
    void gateOpenWhenTimeUnparseable() {
        assertThat(ev.gateOpen("kaputt", LocalDateTime.of(2026, 4, 14, 6, 0), day)).isTrue();
        assertThat(ev.gateOpen(null, LocalDateTime.of(2026, 4, 14, 6, 0), day)).isTrue();
    }
}
```

- [ ] **Step 2: Run — fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=VotePresenceEvaluatorTest`
Expected: FAIL.

- [ ] **Step 3: Implementierung**

```java
package com.softball.domain.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class VotePresenceEvaluator {

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("H:mm");

    public boolean isPresent(final List<String> options) {
        if (options == null) return false;
        return options.stream().anyMatch(o -> o != null && "ja".equalsIgnoreCase(o.trim()));
    }

    public boolean gateOpen(final String trainingTime, final LocalDateTime now, final LocalDate trainingDate) {
        if (now == null || trainingDate == null) return false;
        if (!now.toLocalDate().equals(trainingDate)) return false;
        final LocalTime start = parse(trainingTime);
        if (start == null) return true; // unparsebar → ganztägig syncen statt crashen
        return !now.toLocalTime().isBefore(start);
    }

    private LocalTime parse(final String time) {
        if (time == null || time.isBlank()) return null;
        try {
            return LocalTime.parse(time.trim(), HH_MM);
        } catch (final Exception e) {
            return null;
        }
    }
}
```

- [ ] **Step 4: Run — passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=VotePresenceEvaluatorTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/VotePresenceEvaluator.java \
        backend/src/test/java/com/softball/domain/service/VotePresenceEvaluatorTest.java
git commit -m "✨ VotePresenceEvaluator — Ja-Erkennung + defensives Zeit-Gate"
```

### Task 9: `PollVoteSyncService` (Application — Orchestrierung)

**Files:**
- Create: `backend/src/main/java/com/softball/application/PollVoteSyncService.java`
- Test: `backend/src/test/java/com/softball/application/PollVoteSyncServiceTest.java`

**Interfaces:**
- Consumes: `WhatsappPollRepository.findAll`, `WhatsappSender.fetchVotes`, `TrainingRepository.findAllByOrderByDateDesc`, `TargetTrainingResolver.resolve`, `VotePresenceEvaluator`, `PlayerRepository.findAll`, `SyncedVoteRepository`, `TrainingAttendanceRepository`.
- Produces:
  - `int syncAll(LocalDateTime now)` — respektiert Zeit-Gate; Anzahl geschriebener/aktualisierter Votes.
  - `int syncNow()` — Test-Trigger, **ohne** Zeit-Gate (ruft interne Logik mit `enforceGate=false`).
  - `@Scheduled(cron = "0 * * * * *", zone = "Europe/Berlin")` `run()` → `syncAll(now)`.

**Algorithmus je enabled Poll mit `lastSentMessageId != null`:**
1. Ziel-Training via `TargetTrainingResolver.resolve(allTrainings, poll.lastSentAt.toLocalDate())`. Keins → skip.
2. Wenn `enforceGate` und `!evaluator.gateOpen(training.time, now, training.date)` → skip.
3. `sender.fetchVotes(poll.lastSentMessageId)`. Leer → skip.
4. Spieler nach `whatsappName` indizieren (case-insensitive, getrimmt), nur nicht-leere Namen.
5. Je Stimme: `present = evaluator.isPresent(options)`; `playerId = index.get(voterName.trim().toLowerCase())` (oder null). Upsert `SyncedVote(training.id, voterName, playerId, present)` via `findByTrainingIdAndVoterName` (id übernehmen → save).
6. Bei `playerId != null && present` → Anwesenheit buchen: bestehende `TrainingAttendance` (via `attendanceRepository.findByTrainingId`) suchen; existiert eine für den Spieler → nur wenn `!present` auf `true` setzen (nie zurücknehmen); sonst neue `TrainingAttendance(training, player, true)` `saveAll`.

> **Attendance nie zurücknehmen:** Sync setzt ausschließlich `present=true`. Manuell gesetzte/abweichende Einträge bleiben unangetastet. Kein `deleteByTrainingId` hier (anders als `TrainingAttendanceService.setAttendance`).

- [ ] **Step 1: Failing test (Mockito)**

`PollVoteSyncServiceTest.java` — deckt: bekannter Ja-Wähler → Attendance + SyncedVote(playerId gesetzt); unbekannter Wähler → SyncedVote(playerId=null), keine Attendance; Nein-Wähler → keine Attendance; Zeit-Gate zu → nichts; `syncNow()` ignoriert Gate; kein Ziel-Training → skip; bestehende Attendance wird nicht auf false gesetzt.
```java
package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.domain.service.TargetTrainingResolver;
import com.softball.domain.service.VotePresenceEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PollVoteSyncServiceTest {

    private final WhatsappPollRepository pollRepo = mock(WhatsappPollRepository.class);
    private final WhatsappSender sender = mock(WhatsappSender.class);
    private final TrainingRepository trainingRepo = mock(TrainingRepository.class);
    private final PlayerRepository playerRepo = mock(PlayerRepository.class);
    private final SyncedVoteRepository voteRepo = mock(SyncedVoteRepository.class);
    private final TrainingAttendanceRepository attendanceRepo = mock(TrainingAttendanceRepository.class);
    private PollVoteSyncService service;

    private final LocalDateTime now = LocalDateTime.of(2026, 4, 14, 20, 0); // Di 20:00
    private Training training;
    private WhatsappPoll poll;

    @BeforeEach
    void setup() {
        service = new PollVoteSyncService(pollRepo, sender, trainingRepo, playerRepo, voteRepo,
                attendanceRepo, new TargetTrainingResolver(), new VotePresenceEvaluator());
        training = new Training(10L, LocalDate.of(2026, 4, 14), "20:00", "Park");
        poll = new WhatsappPoll();
        poll.setId(1L); poll.setEnabled(true);
        poll.setLastSentMessageId("msg-1");
        poll.setLastSentAt(LocalDateTime.of(2026, 4, 13, 20, 0)); // Mo
        when(pollRepo.findAll()).thenReturn(List.of(poll));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of(training));
        when(voteRepo.findByTrainingIdAndVoterName(anyLong(), anyString())).thenReturn(Optional.empty());
        when(voteRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(attendanceRepo.findByTrainingId(10L)).thenReturn(List.of());
    }

    @Test
    void knownYesVoterBooksAttendance() {
        final Player max = new Player(5L, "Max", true, null); max.setWhatsappName("Max ⚾");
        when(playerRepo.findAll()).thenReturn(List.of(max));
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Max ⚾", List.of("Ja"))));

        service.syncAll(now);

        verify(voteRepo).save(argThat(v -> v.getPlayerId() != null && v.getPlayerId() == 5L && v.isPresent()));
        verify(attendanceRepo).saveAll(argThat((List<TrainingAttendance> l) ->
            l.size() == 1 && l.get(0).getPlayer().getId() == 5L && l.get(0).isPresent()));
    }

    @Test
    void unknownVoterStoredWithoutPlayer() {
        when(playerRepo.findAll()).thenReturn(List.of());
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Gast", List.of("Ja"))));

        service.syncAll(now);

        verify(voteRepo).save(argThat(v -> v.getPlayerId() == null && v.isPresent()));
        verify(attendanceRepo, never()).saveAll(any());
    }

    @Test
    void gateClosedDoesNothing() {
        when(sender.fetchVotes(any())).thenReturn(List.of(new WhatsappVote("Max ⚾", List.of("Ja"))));
        service.syncAll(LocalDateTime.of(2026, 4, 14, 19, 0)); // vor 20:00
        verify(voteRepo, never()).save(any());
    }

    @Test
    void syncNowIgnoresGate() {
        final Player max = new Player(5L, "Max", true, null); max.setWhatsappName("Max ⚾");
        when(playerRepo.findAll()).thenReturn(List.of(max));
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Max ⚾", List.of("Ja"))));

        // syncNow nutzt intern "jetzt"; Gate wird ignoriert → auch außerhalb Trainingszeit gebucht.
        // Da syncNow() ohne Argument arbeitet, hier stattdessen die interne gate-freie Methode testen,
        // falls vorhanden: service.syncAll(now, false). Ansonsten via Clock injizieren (siehe Impl-Hinweis).
        service.syncAllUngated(List.of(poll));
        verify(voteRepo).save(argThat(v -> v.getPlayerId() != null && v.isPresent()));
    }
}
```

> Impl-Hinweis: Um `syncNow()` deterministisch testbar zu machen, package-private `syncAllUngated(List<WhatsappPoll>)` oder `syncAll(LocalDateTime now, boolean enforceGate)` extrahieren; der Scheduler ruft `syncAll(LocalDateTime.now(clock), true)`. Für `run()` `Clock` (Europe/Berlin) im Konstruktor injizieren — Muster wie `WhatsappPollScheduler`.

- [ ] **Step 2: Run — fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PollVoteSyncServiceTest`
Expected: FAIL (Klasse fehlt).

- [ ] **Step 3: Implementierung**

```java
package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.domain.service.TargetTrainingResolver;
import com.softball.domain.service.VotePresenceEvaluator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PollVoteSyncService {

    private static final Logger log = LoggerFactory.getLogger(PollVoteSyncService.class);

    private final WhatsappPollRepository pollRepo;
    private final WhatsappSender sender;
    private final TrainingRepository trainingRepo;
    private final PlayerRepository playerRepo;
    private final SyncedVoteRepository voteRepo;
    private final TrainingAttendanceRepository attendanceRepo;
    private final TargetTrainingResolver resolver;
    private final VotePresenceEvaluator evaluator;
    private final Clock clock;

    public PollVoteSyncService(final WhatsappPollRepository pollRepo, final WhatsappSender sender,
                               final TrainingRepository trainingRepo, final PlayerRepository playerRepo,
                               final SyncedVoteRepository voteRepo, final TrainingAttendanceRepository attendanceRepo,
                               final TargetTrainingResolver resolver, final VotePresenceEvaluator evaluator) {
        this(pollRepo, sender, trainingRepo, playerRepo, voteRepo, attendanceRepo, resolver, evaluator,
             Clock.system(ZoneId.of("Europe/Berlin")));
    }

    public PollVoteSyncService(final WhatsappPollRepository pollRepo, final WhatsappSender sender,
                               final TrainingRepository trainingRepo, final PlayerRepository playerRepo,
                               final SyncedVoteRepository voteRepo, final TrainingAttendanceRepository attendanceRepo,
                               final TargetTrainingResolver resolver, final VotePresenceEvaluator evaluator,
                               final Clock clock) {
        this.pollRepo = pollRepo; this.sender = sender; this.trainingRepo = trainingRepo;
        this.playerRepo = playerRepo; this.voteRepo = voteRepo; this.attendanceRepo = attendanceRepo;
        this.resolver = resolver; this.evaluator = evaluator; this.clock = clock;
    }

    @Scheduled(cron = "0 * * * * *", zone = "Europe/Berlin")
    public void run() {
        syncAll(LocalDateTime.now(clock));
    }

    @Transactional
    public int syncAll(final LocalDateTime now) {
        return sync(pollRepo.findAll(), now, true);
    }

    @Transactional
    public int syncNow() {
        return sync(pollRepo.findAll(), LocalDateTime.now(clock), false);
    }

    // package-private für Test
    int syncAllUngated(final List<WhatsappPoll> polls) {
        return sync(polls, LocalDateTime.now(clock), false);
    }

    private int sync(final List<WhatsappPoll> polls, final LocalDateTime now, final boolean enforceGate) {
        int written = 0;
        final List<Training> trainings = trainingRepo.findAllByOrderByDateDesc();
        final Map<String, Player> byName = playerRepo.findAll().stream()
            .filter(p -> p.getWhatsappName() != null && !p.getWhatsappName().isBlank())
            .collect(Collectors.toMap(p -> p.getWhatsappName().trim().toLowerCase(), p -> p, (a, b) -> a));

        for (final WhatsappPoll poll : polls) {
            if (!poll.isEnabled() || poll.getLastSentMessageId() == null || poll.getLastSentAt() == null) continue;
            final Optional<Training> target = resolver.resolve(trainings, poll.getLastSentAt().toLocalDate());
            if (target.isEmpty()) continue;
            final Training training = target.get();
            if (enforceGate && !evaluator.gateOpen(training.getTime(), now, training.getDate())) continue;

            final List<WhatsappVote> votes = sender.fetchVotes(poll.getLastSentMessageId());
            if (votes.isEmpty()) continue;

            final List<TrainingAttendance> existing = attendanceRepo.findByTrainingId(training.getId());
            final Set<Long> presentPlayerIds = existing.stream()
                .filter(TrainingAttendance::isPresent)
                .map(a -> a.getPlayer().getId()).collect(Collectors.toSet());
            final List<TrainingAttendance> toBook = new ArrayList<>();

            for (final WhatsappVote vote : votes) {
                final boolean present = evaluator.isPresent(vote.options());
                final Player player = vote.voterName() == null ? null
                    : byName.get(vote.voterName().trim().toLowerCase());
                final Long playerId = player != null ? player.getId() : null;
                upsertVote(training.getId(), vote.voterName(), playerId, present);
                written++;
                if (player != null && present && !presentPlayerIds.contains(playerId)) {
                    toBook.add(new TrainingAttendance(training, player, true));
                    presentPlayerIds.add(playerId);
                }
            }
            if (!toBook.isEmpty()) attendanceRepo.saveAll(toBook);
            log.info("Poll {} → Training {}: {} Stimmen gesynct, {} neu anwesend",
                poll.getId(), training.getId(), votes.size(), toBook.size());
        }
        return written;
    }

    private void upsertVote(final Long trainingId, final String voterName, final Long playerId, final boolean present) {
        final SyncedVote vote = voteRepo.findByTrainingIdAndVoterName(trainingId, voterName)
            .orElseGet(() -> new SyncedVote(trainingId, voterName, playerId, present));
        vote.setPlayerId(playerId);
        vote.setPresent(present);
        voteRepo.save(vote);
    }
}
```

- [ ] **Step 4: Run — passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PollVoteSyncServiceTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/PollVoteSyncService.java \
        backend/src/test/java/com/softball/application/PollVoteSyncServiceTest.java
git commit -m "✨ PollVoteSyncService — Stimmen zur Trainingszeit in Anwesenheit buchen"
```

### Task 10: `VoterAssignmentService` (Application — Zuweisen / Neuer Spieler + Re-Match)

**Files:**
- Create: `backend/src/main/java/com/softball/application/VoterAssignmentService.java`
- Test: `backend/src/test/java/com/softball/application/VoterAssignmentServiceTest.java`

**Interfaces:**
- Consumes: `PlayerRepository`, `SyncedVoteRepository`, `TrainingRepository`, `TrainingAttendanceRepository`.
- Produces:
  - `Player assignExisting(String voterName, Long playerId)` — setzt `whatsappName`, re-matcht offene Votes.
  - `Player assignNew(String voterName, String playerName)` — legt Spieler an, `whatsappName = voterName`, re-matcht.
  - `List<UnknownVoter> unknownVoters()` — `record UnknownVoter(String voterName, Long trainingId, LocalDate trainingDate)` (Domain-Record oder application-lokal).

**Re-Match-Logik** (nach Alias setzen): alle `SyncedVote` mit diesem `voterName` und `player_id == null` holen → `player_id` setzen; bei `present` → Attendance buchen (gleiche „nie zurücknehmen"-Regel wie Task 9); `voteRepo.save`.

- [ ] **Step 1: Failing test**

`VoterAssignmentServiceTest.java` — deckt: `assignExisting` setzt whatsappName + re-matcht offene Ja-Vote → Attendance + Vote.playerId gesetzt; `assignNew` legt Spieler an; unbekannter Player → `ResourceNotFoundException`.
```java
// Mocks wie in PollVoteSyncServiceTest.
// assignExisting("Gast", 5L):
//   when(playerRepo.findById(5L)).thenReturn(Optional.of(player));
//   when(voteRepo.findByVoterNameAndPlayerIdIsNull("Gast")).thenReturn(List.of(openVote(trainingId=10, present=true)));
//   when(trainingRepo.findById(10L)).thenReturn(Optional.of(training));
//   when(attendanceRepo.findByTrainingId(10L)).thenReturn(List.of());
// assert: player.whatsappName == "Gast"; voteRepo.save(playerId=5); attendanceRepo.saveAll(player 5 present).
```

- [ ] **Step 2: Run — fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=VoterAssignmentServiceTest`
Expected: FAIL.

- [ ] **Step 3: Implementierung**

```java
package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VoterAssignmentService {

    public record UnknownVoter(String voterName, Long trainingId, LocalDate trainingDate) {}

    private final PlayerRepository playerRepo;
    private final SyncedVoteRepository voteRepo;
    private final TrainingRepository trainingRepo;
    private final TrainingAttendanceRepository attendanceRepo;

    public VoterAssignmentService(final PlayerRepository playerRepo, final SyncedVoteRepository voteRepo,
                                  final TrainingRepository trainingRepo, final TrainingAttendanceRepository attendanceRepo) {
        this.playerRepo = playerRepo; this.voteRepo = voteRepo;
        this.trainingRepo = trainingRepo; this.attendanceRepo = attendanceRepo;
    }

    @Transactional(readOnly = true)
    public List<UnknownVoter> unknownVoters() {
        final List<SyncedVote> open = voteRepo.findByPlayerIdIsNull();
        final Map<Long, LocalDate> dates = trainingRepo.findAllByOrderByDateDesc().stream()
            .collect(Collectors.toMap(Training::getId, Training::getDate, (a, b) -> a));
        return open.stream()
            .map(v -> new UnknownVoter(v.getVoterName(), v.getTrainingId(), dates.get(v.getTrainingId())))
            .toList();
    }

    @Transactional
    public Player assignExisting(final String voterName, final Long playerId) {
        final Player player = playerRepo.findById(playerId)
            .orElseThrow(() -> new ResourceNotFoundException("Spieler", playerId));
        player.setWhatsappName(voterName);
        final Player saved = playerRepo.save(player);
        rematch(voterName, saved);
        return saved;
    }

    @Transactional
    public Player assignNew(final String voterName, final String playerName) {
        if (playerName == null || playerName.isBlank()) {
            throw new BusinessValidationException("Spielername darf nicht leer sein");
        }
        final Player player = new Player(playerName.trim());
        player.setWhatsappName(voterName);
        final Player saved = playerRepo.save(player);
        rematch(voterName, saved);
        return saved;
    }

    private void rematch(final String voterName, final Player player) {
        final List<SyncedVote> open = voteRepo.findByVoterNameAndPlayerIdIsNull(voterName);
        for (final SyncedVote vote : open) {
            vote.setPlayerId(player.getId());
            voteRepo.save(vote);
            if (vote.isPresent()) bookAttendance(vote.getTrainingId(), player);
        }
    }

    private void bookAttendance(final Long trainingId, final Player player) {
        final Training training = trainingRepo.findById(trainingId).orElse(null);
        if (training == null) return;
        final boolean already = attendanceRepo.findByTrainingId(trainingId).stream()
            .anyMatch(a -> a.isPresent() && a.getPlayer().getId().equals(player.getId()));
        if (!already) {
            attendanceRepo.saveAll(List.of(new TrainingAttendance(training, player, true)));
        }
    }
}
```

- [ ] **Step 4: Run — passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=VoterAssignmentServiceTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/VoterAssignmentService.java \
        backend/src/test/java/com/softball/application/VoterAssignmentServiceTest.java
git commit -m "✨ VoterAssignmentService — unbekannten Wähler zuweisen/anlegen + Re-Match"
```

### Task 11: REST-Endpoints (Sync-Trigger, Unknown-Liste, Assign)

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/in/web/WhatsappVoteController.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/UnknownVoterResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/AssignVoterRequest.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/AssignNewVoterRequest.java`
- Test: `backend/src/test/java/com/softball/adapter/in/web/WhatsappVoteControllerIT.java` (optional, MockMvc; mind. Smoke)

**Interfaces:**
- Produces:
  - `POST /api/orga/whatsapp/sync` → `{ synced: <int> }` (Test-Button, ruft `syncNow()`).
  - `GET /api/orga/whatsapp/unknown-voters` → `UnknownVoterResponse[]` `{ voterName, trainingId, trainingDate }`.
  - `POST /api/orga/whatsapp/assign` (`AssignVoterRequest { voterName, playerId }`) → `PlayerResponse`.
  - `POST /api/orga/whatsapp/assign-new` (`AssignNewVoterRequest { voterName, playerName }`) → `PlayerResponse`.

- [ ] **Step 1: DTOs**

```java
// UnknownVoterResponse.java
package com.softball.adapter.dto;
import com.softball.application.VoterAssignmentService.UnknownVoter;
import java.time.LocalDate;
public record UnknownVoterResponse(String voterName, Long trainingId, LocalDate trainingDate) {
    public static UnknownVoterResponse from(final UnknownVoter u) {
        return new UnknownVoterResponse(u.voterName(), u.trainingId(), u.trainingDate());
    }
}
```
```java
// AssignVoterRequest.java
package com.softball.adapter.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
public record AssignVoterRequest(@NotBlank String voterName, @NotNull Long playerId) {}
```
```java
// AssignNewVoterRequest.java
package com.softball.adapter.dto;
import jakarta.validation.constraints.NotBlank;
public record AssignNewVoterRequest(@NotBlank String voterName, @NotBlank String playerName) {}
```

- [ ] **Step 2: Controller**

```java
package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.application.PollVoteSyncService;
import com.softball.application.VoterAssignmentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orga/whatsapp")
public class WhatsappVoteController {

    private final PollVoteSyncService syncService;
    private final VoterAssignmentService assignmentService;

    public WhatsappVoteController(final PollVoteSyncService syncService,
                                  final VoterAssignmentService assignmentService) {
        this.syncService = syncService;
        this.assignmentService = assignmentService;
    }

    @PostMapping("/sync")
    public Map<String, Integer> sync() {
        return Map.of("synced", syncService.syncNow());
    }

    @GetMapping("/unknown-voters")
    public List<UnknownVoterResponse> unknownVoters() {
        return assignmentService.unknownVoters().stream().map(UnknownVoterResponse::from).toList();
    }

    @PostMapping("/assign")
    public PlayerResponse assign(@Valid @RequestBody final AssignVoterRequest req) {
        return PlayerResponse.from(assignmentService.assignExisting(req.voterName(), req.playerId()));
    }

    @PostMapping("/assign-new")
    public PlayerResponse assignNew(@Valid @RequestBody final AssignNewVoterRequest req) {
        return PlayerResponse.from(assignmentService.assignNew(req.voterName(), req.playerName()));
    }
}
```

- [ ] **Step 3: Kompilieren + (optional) MockMvc-Smoke**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappVoteControllerIT` (falls Test geschrieben), sonst voller `./mvnw test`.
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/in/web/WhatsappVoteController.java \
        backend/src/main/java/com/softball/adapter/dto/UnknownVoterResponse.java \
        backend/src/main/java/com/softball/adapter/dto/AssignVoterRequest.java \
        backend/src/main/java/com/softball/adapter/dto/AssignNewVoterRequest.java
git commit -m "✨ WhatsappVoteController — Sync-Trigger, Unbekannte-Liste, Zuweisung"
```

---

## PHASE 4 — Frontend

### Task 12: API-Client + Typen

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/types.ts` (o.ä. — Typ-Datei ermitteln)

**Interfaces:**
- Produces (client-Funktionen):
  - `setPlayerWhatsappName(id: number, whatsappName: string): Promise<Player>` → `PUT /players/{id}/whatsapp-name`.
  - `getUnknownVoters(): Promise<UnknownVoter[]>` → `GET /orga/whatsapp/unknown-voters`.
  - `syncWhatsappVotes(): Promise<{ synced: number }>` → `POST /orga/whatsapp/sync`.
  - `assignVoter(voterName, playerId): Promise<Player>` → `POST /orga/whatsapp/assign`.
  - `assignNewVoter(voterName, playerName): Promise<Player>` → `POST /orga/whatsapp/assign-new`.
- Typen: `Player.whatsappName?: string | null`; `UnknownVoter { voterName: string; trainingId: number; trainingDate: string }`.

- [ ] **Step 1: Typen ergänzen** — `Player` um `whatsappName?: string | null`; `UnknownVoter` neu.
- [ ] **Step 2: Client-Funktionen** (Muster der bestehenden `getWhatsappPolls` etc. übernehmen):
```ts
export const setPlayerWhatsappName = (id: number, whatsappName: string) =>
  request<Player>(`/players/${id}/whatsapp-name`, { method: 'PUT', body: JSON.stringify({ whatsappName }) })
export const getUnknownVoters = () =>
  request<UnknownVoter[]>('/orga/whatsapp/unknown-voters')
export const syncWhatsappVotes = () =>
  request<{ synced: number }>('/orga/whatsapp/sync', { method: 'POST' })
export const assignVoter = (voterName: string, playerId: number) =>
  request<Player>('/orga/whatsapp/assign', { method: 'POST', body: JSON.stringify({ voterName, playerId }) })
export const assignNewVoter = (voterName: string, playerName: string) =>
  request<Player>('/orga/whatsapp/assign-new', { method: 'POST', body: JSON.stringify({ voterName, playerName }) })
```
- [ ] **Step 3: `npm run build`**

Run: `cd frontend && npm run build`
Expected: typecheck + build ok.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/types.ts
git commit -m "✨ API-Client: WhatsApp-Name pflegen, Unbekannte, Sync, Zuweisen"
```

### Task 13: WhatsApp-Tab in der Spieler-Seite

**Files:**
- Modify: `frontend/src/components/players/PlayerManager.tsx` (Tab-Umschaltung ergänzen)
- Create: `frontend/src/components/players/WhatsappVotersTab.tsx`

> Vor Start `PlayerManager.tsx` lesen — prüfen ob schon Tabs existieren; falls nicht, minimalen Tab-Switch (Stammdaten | WhatsApp) im Projekt-Stil ergänzen (Tailwind v4, navy/cream, Modals statt confirm).

**Tab-Inhalt (`WhatsappVotersTab.tsx`):**
1. **Test-Button** „Jetzt syncen" → `syncWhatsappVotes()` → Toast „N Stimmen gesynct".
2. **Unbekannte Wähler** (`getUnknownVoters()`): je Zeile Name + Trainingsdatum + Aktionen:
   - Dropdown bestehender Spieler + „Zuweisen" → `assignVoter` → Liste neu laden, Toast.
   - „Neuer Spieler" → Modal (Name vorbefüllt mit `voterName`) → `assignNewVoter` → neu laden.
3. **Alias-Pflege**: Spielerliste mit editierbarem `whatsappName`-Feld (Pencil-Cursor) → `setPlayerWhatsappName` on blur/save.

- [ ] **Step 1: `WhatsappVotersTab.tsx` bauen** — Komponente mit den 3 Sektionen; State über `usePlayers` (bestehend) + lokalem Fetch der Unknown-Liste; Toasts über `useToast`; Modals im ConfirmModal/Modal-Muster.
- [ ] **Step 2: In `PlayerManager.tsx` einhängen** — Tab-Switch „Stammdaten | WhatsApp".
- [ ] **Step 3: `npm run build` + `npm run lint`**

Run: `cd frontend && npm run build && npm run lint`
Expected: ok.

- [ ] **Step 4: Manuell im Browser prüfen** (Skill `run`/`verify`): Tab sichtbar, Alias speichern, Sync-Button, Zuweisung.
- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/players/WhatsappVotersTab.tsx \
        frontend/src/components/players/PlayerManager.tsx
git commit -m "✨ Spieler-Seite: WhatsApp-Tab (Alias, Unbekannte zuweisen, Test-Sync)"
```

### Task 14: Training-Badge für unbekannte Wähler

**Files:**
- Modify: Training-Übersicht/-Zeile-Komponente (ermitteln, z.B. `frontend/src/components/training/*`)
- ggf. Modify: `frontend/src/api/client.ts` (falls Badge-Count pro Training gebraucht — `getUnknownVoters()` liefert `trainingId`, clientseitig gruppieren)

**Interfaces:**
- Consumes: `getUnknownVoters()` → gruppiert nach `trainingId` → Count je Training.

- [ ] **Step 1: Training-Liste lädt `getUnknownVoters()`** einmalig, gruppiert nach `trainingId`.
- [ ] **Step 2: Badge rendern** — bei Count > 0 pro Training „⚠️ N unbekannte Wähler" (navy/red-Style), Klick → Navigation zum WhatsApp-Tab der Spieler-Seite.
- [ ] **Step 3: `npm run build`**

Run: `cd frontend && npm run build`
Expected: ok.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/training frontend/src/api/client.ts
git commit -m "✨ Training-Badge: unbekannte WhatsApp-Wähler → Link zum Zuordnungs-Tab"
```

---

## PHASE 5 — Verifikation

### Task 15: Voller Build + Test + manuelle E2E

- [ ] **Step 1: Backend-Tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: alle grün (Docker läuft).

- [ ] **Step 2: Frontend-Build + Lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: ok.

- [ ] **Step 3: Manuelle E2E (Sidecar gekoppelt, nicht-anonymer Poll)**
  1. Poll senden → `whatsapp_polls.last_sent_message_id` gesetzt.
  2. In WhatsApp „Ja" wählen (bekannter + unbekannter Name).
  3. „Jetzt syncen" → bekannter Spieler anwesend im Ziel-Training; unbekannter als Badge/Unknown.
  4. Unbekannten zuweisen → Badge weg, Spieler anwesend.
  5. Umwählen (Ja→Nein) + erneut syncen → keine Rücknahme bereits manuell gesetzter Anwesenheit (Sync setzt nur `true`).

- [ ] **Step 4: Abschluss-Commit (falls offene Änderungen)** + Hinweis auf VPS-Deploy (Sidecar-Image neu bauen wegen `server.js`).

---

## Self-Review (Autor)

- **Spec-Abdeckung:** Datenmodell (T1,T3,T6) ✓; Datumsauflösung (T7) ✓; Sidecar (T4) ✓; Sender-Port (T5) ✓; Sync-Flow + Zeit-Gate + Ja-Erkennung + „nie zurücknehmen" (T8,T9) ✓; Zuweisung/Neuer-Spieler + Re-Match (T10) ✓; Endpoints inkl. Test-Button (T2,T11) ✓; UI Player-Tab + Alias + Unknown + Training-Badge (T12–T14) ✓; Tests (T7–T10 unit, T3 IT, T15 E2E) ✓.
- **Grenzen aus Spec:** nicht-anonymer Poll + Unofficial-Client-Risiko → in T15/Doku vermerkt. Namensgleichheit → `toMap`-Merge `(a,b)->a` (erster gewinnt), Rest über Zuweisung.
- **Typkonsistenz:** `sendPoll → String` konsistent in Port/Adapter/Scheduler/Test; `SyncedVote(trainingId, voterName, playerId, present)` einheitlich; Repo-Methodennamen identisch in Port/Spring-Repo/Service.
- **Offene Verifikationspunkte für Implementierer:** echte Konstruktor-Signaturen von `PlayerService`/`WhatsappPollService`/`PlayerResponse` sowie bestehende Tab-Struktur in `PlayerManager.tsx` vor den jeweiligen Tasks lesen (in den Tasks vermerkt).
