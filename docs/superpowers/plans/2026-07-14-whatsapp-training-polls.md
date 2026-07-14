# WhatsApp Training-Polls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mehrere wiederkehrende native WhatsApp-Polls je Training automatisch in Team-Gruppen senden, konfigurierbar im Orga-Bereich.

**Architecture:** Node-Sidecar (whatsapp-web.js) hält die WhatsApp-Session und bietet eine interne HTTP-API (status/qr/groups/send-poll). Das Spring-Backend speichert die Poll-Definitionen (Onion: Domain-Model → Port → JPA-Adapter), ein `@Scheduled`-Job feuert fällige Polls über einen `WhatsappSender`-Port an den Node-Dienst. Das React-Frontend im Orga-Bereich verwaltet Polls + Kopplung.

**Tech Stack:** Java 21 / Spring Boot 3.4.3 / Spring Data JPA / Flyway / PostgreSQL 17 (Testcontainers); Node.js + Express + whatsapp-web.js; React 19 / TypeScript / Vite / Tailwind v4; Docker Compose.

## Global Constraints

- **Architektur:** Onion/Hexagonal. `domain` kennt kein Spring/JPA/HTTP. Ports in `domain/port/out/`, Adapter in `adapter/out/...`, Entity ≠ Domain-Model (Mapper dazwischen). Niemals Outer-Layer aus Inner-Layer importieren.
- **Migrations:** Neue Schema-Änderung als `V43__*.sql` unter `backend/src/main/resources/db/migration/`. `ddl-auto=validate` — Entity muss exakt zur Migration passen.
- **List-Persistenz:** Wie bestehend über `@JdbcTypeCode(SqlTypes.JSON)` + `jsonb`-Spalte + Jackson im Mapper (Muster: `InvitationEntity`/`InvitationMapper`).
- **Backend-Build/Test:** `cd backend && ./mvnw test -s .mvn/local-settings.xml` (Docker-Daemon nötig für Testcontainers).
- **Frontend-Build:** `cd frontend && npm run build` (tsc + vite) und `npm run lint`.
- **Exceptions:** `BusinessValidationException` → 400, `ResourceNotFoundException` → 404. DTOs = Java records in `adapter/dto/` mit Bean-Validation.
- **Logging:** SLF4J INFO für State-Changes, WARN für behandelte Fehler.
- **Commits:** Conventional + gitmoji, **kein `Co-Authored-By`**.
- **UI:** Deutsch, Modals statt confirm(), Dark-Navy-Hover, Hover-Reveal Edit/Delete, custom SVG-Icons aus `@/icons`.
- **Secrets:** Node-Service-Token/URL nur aus Env, nie hardcoden/committen.

---

## File Structure

**Node-Sidecar (neu):** `whatsapp-service/`
- `whatsapp-service/package.json` — Deps (express, whatsapp-web.js, qrcode)
- `whatsapp-service/server.js` — HTTP-API + WhatsApp-Client
- `whatsapp-service/Dockerfile` — Container-Build
- `whatsapp-service/.dockerignore`, `whatsapp-service/README.md`

**Backend (neu, unter `backend/src/main/java/com/softball/`):**
- `domain/model/WhatsappPoll.java`
- `domain/port/out/WhatsappPollRepository.java`
- `domain/port/out/WhatsappSender.java` (+ record `WhatsappAccountStatus`, `WhatsappGroup` in `domain/model/`)
- `domain/service/PollDueEvaluator.java`
- `adapter/out/persistence/entity/WhatsappPollEntity.java`
- `adapter/out/persistence/repository/SpringWhatsappPollRepository.java`
- `adapter/out/persistence/mapper/WhatsappPollMapper.java`
- `adapter/out/persistence/adapter/WhatsappPollRepositoryAdapter.java`
- `adapter/out/whatsapp/WhatsappSenderHttpAdapter.java`
- `application/WhatsappPollService.java`
- `application/WhatsappPollScheduler.java`
- `shared/config/SchedulingConfig.java`
- `adapter/dto/WhatsappPollRequest.java`, `adapter/dto/WhatsappPollResponse.java`, `adapter/dto/WhatsappAccountStatusResponse.java`, `adapter/dto/WhatsappGroupResponse.java`
- `adapter/in/web/WhatsappController.java`
- `backend/src/main/resources/db/migration/V43__create_whatsapp_polls.sql`
- Tests: `domain/service/PollDueEvaluatorTest.java`, `application/WhatsappPollServiceTest.java` (Testcontainers), `application/WhatsappPollSchedulerTest.java`

**Frontend (neu, unter `frontend/src/`):**
- `types` erweitern (`types/index.ts` oder bestehende Types-Datei) — `WhatsappPoll`, `WhatsappAccountStatus`, `WhatsappGroup`
- `api/client.ts` — Methoden ergänzen
- `hooks/useWhatsappPoll.ts`
- `components/orga/WhatsappPollPage.tsx`
- `components/orga/OrgaHome.tsx` — Kachel ergänzen
- `App.tsx` — Route ergänzen

**Deployment:**
- `docker-compose.yml` — Service `whatsapp` + Volume
- `.env.example` / `docs/deployment.md` — Env-Doku

---

## HTTP-Kontrakt Node-Sidecar (verbindlich für alle Tasks)

```
GET  /status         -> 200 {"connected": bool, "number": string|null, "needsQr": bool}
GET  /qr             -> 200 {"qr": string|null}          # qr = data:image/png;base64,... oder null wenn verbunden
GET  /groups         -> 200 {"groups": [{"id": string, "name": string}]}
POST /send-poll      -> 200 {"sent": true}  body: {"groupId": string, "title": string, "options": string[]}
                        4xx/5xx {"error": string} bei Fehler
Auth: Header  X-Service-Token: <WHATSAPP_SERVICE_TOKEN>  auf ALLEN Routen
```

---

## Phase A — Node WhatsApp-Sidecar

### Task A1: Node-Service mit whatsapp-web.js + HTTP-API

**Files:**
- Create: `whatsapp-service/package.json`
- Create: `whatsapp-service/server.js`
- Create: `whatsapp-service/Dockerfile`
- Create: `whatsapp-service/.dockerignore`
- Create: `whatsapp-service/README.md`

**Interfaces:**
- Produces: HTTP-API exakt nach obigem Kontrakt. Env: `PORT` (default 3000), `WHATSAPP_SERVICE_TOKEN`, `SESSION_PATH` (default `/data/session`).

- [ ] **Step 1: package.json anlegen**

```json
{
  "name": "whatsapp-service",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "express": "^4.19.2",
    "qrcode": "^1.5.4",
    "whatsapp-web.js": "^1.26.0"
  }
}
```

- [ ] **Step 2: server.js schreiben**

```js
const express = require('express');
const QRCode = require('qrcode');
const { Client, LocalAuth, Poll } = require('whatsapp-web.js');

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.WHATSAPP_SERVICE_TOKEN || '';
const SESSION_PATH = process.env.SESSION_PATH || '/data/session';

let currentQrDataUrl = null;   // gesetzt solange Kopplung aussteht
let connected = false;
let myNumber = null;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

client.on('qr', async (qr) => {
  currentQrDataUrl = await QRCode.toDataURL(qr);
  connected = false;
  console.log('[wa] QR bereit — koppeln nötig');
});
client.on('ready', () => {
  connected = true;
  currentQrDataUrl = null;
  myNumber = client.info?.wid?.user ? '+' + client.info.wid.user : null;
  console.log('[wa] verbunden als', myNumber);
});
client.on('disconnected', (r) => {
  connected = false;
  console.log('[wa] getrennt:', r);
});
client.initialize();

const app = express();
app.use(express.json());

// Token-Guard auf allen Routen
app.use((req, res, next) => {
  if (!TOKEN || req.get('X-Service-Token') !== TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

app.get('/status', (_req, res) => {
  res.json({ connected, number: myNumber, needsQr: !connected && currentQrDataUrl !== null });
});

app.get('/qr', (_req, res) => {
  res.json({ qr: connected ? null : currentQrDataUrl });
});

app.get('/groups', async (_req, res) => {
  if (!connected) return res.status(409).json({ error: 'not_connected' });
  try {
    const chats = await client.getChats();
    const groups = chats.filter((c) => c.isGroup).map((c) => ({ id: c.id._serialized, name: c.name }));
    res.json({ groups });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

app.post('/send-poll', async (req, res) => {
  const { groupId, title, options } = req.body || {};
  if (!connected) return res.status(409).json({ error: 'not_connected' });
  if (!groupId || !title || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  try {
    await client.sendMessage(groupId, new Poll(title, options, { allowMultipleAnswers: false }));
    res.json({ sent: true });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

app.listen(PORT, () => console.log('[wa] HTTP auf :' + PORT));
```

- [ ] **Step 3: Dockerfile schreiben**

whatsapp-web.js braucht Chromium (Puppeteer). Puppeteer-Base-Image nutzen, das Chromium bündelt.

```dockerfile
FROM ghcr.io/puppeteer/puppeteer:22.15.0
USER root
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && chown -R pptruser:pptruser /app
USER pptruser
ENV SESSION_PATH=/data/session
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: .dockerignore + README schreiben**

`.dockerignore`:
```
node_modules
npm-debug.log
```

`README.md` (kurz): Zweck, Env (`WHATSAPP_SERVICE_TOKEN`, `SESSION_PATH`, `PORT`), Kopplung via `/qr` in der Orga-UI, Session liegt im Volume unter `SESSION_PATH`, Wartungsrisiko whatsapp-web.js bei WhatsApp-Web-Änderungen.

- [ ] **Step 5: Lokaler Smoke-Test**

```bash
cd whatsapp-service && npm install
WHATSAPP_SERVICE_TOKEN=devtoken SESSION_PATH=./.session PORT=3000 npm start
```
In zweitem Terminal:
```bash
curl -s -H "X-Service-Token: devtoken" localhost:3000/status
```
Erwartet: `{"connected":false,"number":null,"needsQr":true}` (nach ein paar Sekunden). `/qr` liefert eine data-URL — im Browser als Bild anzeigen, mit WhatsApp am Handy scannen (WhatsApp → Verknüpfte Geräte). Danach `/status` → `connected:true` + Nummer, `/groups` listet Gruppen.

- [ ] **Step 6: Commit**

```bash
git add whatsapp-service
git commit -m "✨ WhatsApp-Sidecar: whatsapp-web.js HTTP-API (status/qr/groups/send-poll)"
```

---

## Phase B — Backend

### Task B1: Domain-Model + Ports

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/WhatsappPoll.java`
- Create: `backend/src/main/java/com/softball/domain/model/WhatsappGroup.java`
- Create: `backend/src/main/java/com/softball/domain/model/WhatsappAccountStatus.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/WhatsappPollRepository.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/WhatsappSender.java`

**Interfaces:**
- Produces: `WhatsappPoll` (Model), `WhatsappGroup(String id, String name)`, `WhatsappAccountStatus(boolean connected, String number, boolean needsQr, String qr)`, Ports `WhatsappPollRepository`, `WhatsappSender`.

- [ ] **Step 1: WhatsappPoll Model**

```java
package com.softball.domain.model;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class WhatsappPoll {
    private Long id;
    private String groupId;
    private String groupName;
    private String title;
    private List<String> options = new ArrayList<>();
    private DayOfWeek weekday;
    private LocalTime time;
    private boolean enabled = true;
    private List<LocalDate> skipDates = new ArrayList<>();
    private LocalDateTime lastSentAt;

    public WhatsappPoll() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getGroupId() { return groupId; }
    public void setGroupId(final String v) { this.groupId = v; }
    public String getGroupName() { return groupName; }
    public void setGroupName(final String v) { this.groupName = v; }
    public String getTitle() { return title; }
    public void setTitle(final String v) { this.title = v; }
    public List<String> getOptions() { return options; }
    public void setOptions(final List<String> v) { this.options = v != null ? v : new ArrayList<>(); }
    public DayOfWeek getWeekday() { return weekday; }
    public void setWeekday(final DayOfWeek v) { this.weekday = v; }
    public LocalTime getTime() { return time; }
    public void setTime(final LocalTime v) { this.time = v; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(final boolean v) { this.enabled = v; }
    public List<LocalDate> getSkipDates() { return skipDates; }
    public void setSkipDates(final List<LocalDate> v) { this.skipDates = v != null ? v : new ArrayList<>(); }
    public LocalDateTime getLastSentAt() { return lastSentAt; }
    public void setLastSentAt(final LocalDateTime v) { this.lastSentAt = v; }
}
```

- [ ] **Step 2: Value-Objekte (records)**

`WhatsappGroup.java`:
```java
package com.softball.domain.model;

public record WhatsappGroup(String id, String name) {}
```

`WhatsappAccountStatus.java`:
```java
package com.softball.domain.model;

public record WhatsappAccountStatus(boolean connected, String number, boolean needsQr, String qr) {}
```

- [ ] **Step 3: Ports**

`WhatsappPollRepository.java`:
```java
package com.softball.domain.port.out;

import com.softball.domain.model.WhatsappPoll;
import java.util.List;
import java.util.Optional;

public interface WhatsappPollRepository {
    List<WhatsappPoll> findAll();
    Optional<WhatsappPoll> findById(Long id);
    WhatsappPoll save(WhatsappPoll poll);
    void deleteById(Long id);
    boolean existsById(Long id);
}
```

`WhatsappSender.java`:
```java
package com.softball.domain.port.out;

import com.softball.domain.model.WhatsappAccountStatus;
import com.softball.domain.model.WhatsappGroup;
import java.util.List;

public interface WhatsappSender {
    WhatsappAccountStatus status();
    String qr();                         // null wenn verbunden
    List<WhatsappGroup> listGroups();
    void sendPoll(String groupId, String title, List<String> options);
}
```

- [ ] **Step 4: Kompilieren**

Run: `cd backend && ./mvnw -q -o compile -s .mvn/local-settings.xml || ./mvnw -q compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS (nur neue Klassen, keine Verdrahtung).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain
git commit -m "✨ WhatsApp-Polls: Domain-Model + Ports (WhatsappPoll, WhatsappSender)"
```

---

### Task B2: PollDueEvaluator (Domain-Service, reine Logik — TDD)

**Files:**
- Create: `backend/src/main/java/com/softball/domain/service/PollDueEvaluator.java`
- Test: `backend/src/test/java/com/softball/domain/service/PollDueEvaluatorTest.java`

**Interfaces:**
- Consumes: `WhatsappPoll`.
- Produces: `boolean isDue(WhatsappPoll poll, LocalDateTime now)`.

- [ ] **Step 1: Failing test schreiben**

```java
package com.softball.domain.service;

import com.softball.domain.model.WhatsappPoll;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PollDueEvaluatorTest {

    private final PollDueEvaluator evaluator = new PollDueEvaluator();

    private WhatsappPoll poll() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setWeekday(DayOfWeek.TUESDAY);
        p.setTime(LocalTime.of(18, 0));
        p.setEnabled(true);
        return p;
    }

    // Dienstag 2026-07-14 18:00
    private final LocalDateTime tueAt1800 = LocalDateTime.of(2026, 7, 14, 18, 0);

    @Test
    void due_whenWeekdayTimeMatchEnabledNotSkippedNotSentToday() {
        assertThat(evaluator.isDue(poll(), tueAt1800)).isTrue();
    }

    @Test
    void notDue_whenDisabled() {
        final WhatsappPoll p = poll();
        p.setEnabled(false);
        assertThat(evaluator.isDue(p, tueAt1800)).isFalse();
    }

    @Test
    void notDue_whenWrongWeekday() {
        assertThat(evaluator.isDue(poll(), tueAt1800.plusDays(1))).isFalse();
    }

    @Test
    void notDue_whenWrongMinute() {
        assertThat(evaluator.isDue(poll(), tueAt1800.plusMinutes(1))).isFalse();
    }

    @Test
    void notDue_whenTodayInSkipDates() {
        final WhatsappPoll p = poll();
        p.setSkipDates(List.of(LocalDate.of(2026, 7, 14)));
        assertThat(evaluator.isDue(p, tueAt1800)).isFalse();
    }

    @Test
    void notDue_whenAlreadySentToday() {
        final WhatsappPoll p = poll();
        p.setLastSentAt(LocalDateTime.of(2026, 7, 14, 18, 0));
        assertThat(evaluator.isDue(p, tueAt1800)).isFalse();
    }

    @Test
    void due_whenSentOnPreviousDay() {
        final WhatsappPoll p = poll();
        p.setLastSentAt(LocalDateTime.of(2026, 7, 7, 18, 0));
        assertThat(evaluator.isDue(p, tueAt1800)).isTrue();
    }
}
```

- [ ] **Step 2: Test rot laufen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PollDueEvaluatorTest`
Expected: FAIL / Compile-Error (`PollDueEvaluator` existiert nicht).

- [ ] **Step 3: Implementierung**

```java
package com.softball.domain.service;

import com.softball.domain.model.WhatsappPoll;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class PollDueEvaluator {

    public boolean isDue(final WhatsappPoll poll, final LocalDateTime now) {
        if (poll == null || !poll.isEnabled() || poll.getWeekday() == null || poll.getTime() == null) {
            return false;
        }
        final LocalDate today = now.toLocalDate();
        if (poll.getSkipDates().contains(today)) {
            return false;
        }
        if (now.getDayOfWeek() != poll.getWeekday()) {
            return false;
        }
        if (now.getHour() != poll.getTime().getHour() || now.getMinute() != poll.getTime().getMinute()) {
            return false;
        }
        if (poll.getLastSentAt() != null && poll.getLastSentAt().toLocalDate().equals(today)) {
            return false;
        }
        return true;
    }
}
```

- [ ] **Step 4: Test grün laufen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PollDueEvaluatorTest`
Expected: PASS (7 Tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/PollDueEvaluator.java backend/src/test/java/com/softball/domain/service/PollDueEvaluatorTest.java
git commit -m "✨ WhatsApp-Polls: PollDueEvaluator (Wochentag/Zeit/Skip/Dedup-Logik)"
```

---

### Task B3: Persistenz (Entity, Migration, Mapper, Spring-Repo, Adapter)

**Files:**
- Create: `backend/src/main/resources/db/migration/V43__create_whatsapp_polls.sql`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/entity/WhatsappPollEntity.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringWhatsappPollRepository.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/WhatsappPollMapper.java`
- Create: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/WhatsappPollRepositoryAdapter.java`

**Interfaces:**
- Consumes: `WhatsappPoll`, `WhatsappPollRepository`.
- Produces: JPA-Persistenz; `WhatsappPollRepositoryAdapter implements WhatsappPollRepository`.

- [ ] **Step 1: Migration V43**

```sql
CREATE TABLE whatsapp_polls (
    id BIGSERIAL PRIMARY KEY,
    group_id VARCHAR(120) NOT NULL,
    group_name VARCHAR(200),
    title VARCHAR(200) NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    weekday VARCHAR(10) NOT NULL,
    send_time TIME NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    skip_dates JSONB NOT NULL DEFAULT '[]',
    last_sent_at TIMESTAMP
);
```

- [ ] **Step 2: Entity**

`weekday` als String (`DayOfWeek` Enum-Name), `skip_dates` als JSON-Array von ISO-Datum-Strings, `options` als JSON-Array (Muster `InvitationEntity`).

```java
package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "whatsapp_polls")
public class WhatsappPollEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false, length = 120)
    private String groupId;

    @Column(name = "group_name", length = 200)
    private String groupName;

    @Column(nullable = false, length = 200)
    private String title;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String options = "[]";

    @Column(nullable = false, length = 10)
    private String weekday;

    @Column(name = "send_time", nullable = false)
    private LocalTime sendTime;

    @Column(nullable = false)
    private boolean enabled = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "skip_dates", columnDefinition = "jsonb", nullable = false)
    private String skipDates = "[]";

    @Column(name = "last_sent_at")
    private LocalDateTime lastSentAt;

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getGroupId() { return groupId; }
    public void setGroupId(final String v) { this.groupId = v; }
    public String getGroupName() { return groupName; }
    public void setGroupName(final String v) { this.groupName = v; }
    public String getTitle() { return title; }
    public void setTitle(final String v) { this.title = v; }
    public String getOptions() { return options; }
    public void setOptions(final String v) { this.options = v; }
    public String getWeekday() { return weekday; }
    public void setWeekday(final String v) { this.weekday = v; }
    public LocalTime getSendTime() { return sendTime; }
    public void setSendTime(final LocalTime v) { this.sendTime = v; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(final boolean v) { this.enabled = v; }
    public String getSkipDates() { return skipDates; }
    public void setSkipDates(final String v) { this.skipDates = v; }
    public LocalDateTime getLastSentAt() { return lastSentAt; }
    public void setLastSentAt(final LocalDateTime v) { this.lastSentAt = v; }
}
```

- [ ] **Step 3: Spring-Repo**

```java
package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.WhatsappPollEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringWhatsappPollRepository extends JpaRepository<WhatsappPollEntity, Long> {
}
```

- [ ] **Step 4: Mapper**

```java
package com.softball.adapter.out.persistence.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.WhatsappPollEntity;
import com.softball.domain.model.WhatsappPoll;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

@Component
public class WhatsappPollMapper {

    private final ObjectMapper objectMapper;

    public WhatsappPollMapper(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public WhatsappPoll toDomain(final WhatsappPollEntity e) {
        if (e == null) return null;
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(e.getId());
        p.setGroupId(e.getGroupId());
        p.setGroupName(e.getGroupName());
        p.setTitle(e.getTitle());
        p.setOptions(readStrings(e.getOptions()));
        p.setWeekday(e.getWeekday() != null ? DayOfWeek.valueOf(e.getWeekday()) : null);
        p.setTime(e.getSendTime());
        p.setEnabled(e.isEnabled());
        p.setSkipDates(readDates(e.getSkipDates()));
        p.setLastSentAt(e.getLastSentAt());
        return p;
    }

    public WhatsappPollEntity toEntity(final WhatsappPoll p) {
        final WhatsappPollEntity e = new WhatsappPollEntity();
        e.setId(p.getId());
        applyScalars(e, p);
        return e;
    }

    public void updateEntity(final WhatsappPollEntity e, final WhatsappPoll p) {
        applyScalars(e, p);
    }

    private void applyScalars(final WhatsappPollEntity e, final WhatsappPoll p) {
        e.setGroupId(p.getGroupId());
        e.setGroupName(p.getGroupName());
        e.setTitle(p.getTitle());
        e.setOptions(write(p.getOptions()));
        e.setWeekday(p.getWeekday() != null ? p.getWeekday().name() : null);
        e.setSendTime(p.getTime());
        e.setEnabled(p.isEnabled());
        e.setSkipDates(write(p.getSkipDates()));
        e.setLastSentAt(p.getLastSentAt());
    }

    private List<String> readStrings(final String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<List<String>>() {}); }
        catch (final JsonProcessingException ex) { throw new RuntimeException("options json", ex); }
    }

    private List<LocalDate> readDates(final String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<List<LocalDate>>() {}); }
        catch (final JsonProcessingException ex) { throw new RuntimeException("skipDates json", ex); }
    }

    private String write(final Object value) {
        try { return objectMapper.writeValueAsString(value != null ? value : List.of()); }
        catch (final JsonProcessingException ex) { throw new RuntimeException("write json", ex); }
    }
}
```

Hinweis: `LocalDate`/`LocalTime`-Serialisierung braucht das JavaTimeModule — im Projekt bereits über Spring Boot's Jackson-Autokonfiguration registriert (wie bei bestehenden Date-Feldern). Falls der Test in B4 an der Zeit-Serialisierung scheitert, im Mapper eine `objectMapper.copy().registerModule(new JavaTimeModule())`-Instanz nutzen.

- [ ] **Step 5: Adapter**

```java
package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.WhatsappPollEntity;
import com.softball.adapter.out.persistence.mapper.WhatsappPollMapper;
import com.softball.adapter.out.persistence.repository.SpringWhatsappPollRepository;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class WhatsappPollRepositoryAdapter implements WhatsappPollRepository {

    private final SpringWhatsappPollRepository repo;
    private final WhatsappPollMapper mapper;

    public WhatsappPollRepositoryAdapter(final SpringWhatsappPollRepository repo, final WhatsappPollMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<WhatsappPoll> findAll() {
        return repo.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<WhatsappPoll> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public WhatsappPoll save(final WhatsappPoll poll) {
        if (poll.getId() != null) {
            final WhatsappPollEntity existing = repo.findById(poll.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, poll);
                return mapper.toDomain(repo.save(existing));
            }
        }
        return mapper.toDomain(repo.save(mapper.toEntity(poll)));
    }

    @Override
    public void deleteById(final Long id) { repo.deleteById(id); }

    @Override
    public boolean existsById(final Long id) { return repo.existsById(id); }
}
```

- [ ] **Step 6: Kompilieren**

Run: `cd backend && ./mvnw -q compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V43__create_whatsapp_polls.sql backend/src/main/java/com/softball/adapter/out/persistence
git commit -m "✨ WhatsApp-Polls: Persistenz (V43, Entity, Mapper, Adapter)"
```

---

### Task B4: WhatsappSender HTTP-Adapter (RestClient)

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/whatsapp/WhatsappSenderHttpAdapter.java`

**Interfaces:**
- Consumes: `WhatsappSender`, `WhatsappAccountStatus`, `WhatsappGroup`.
- Produces: `WhatsappSenderHttpAdapter implements WhatsappSender`; Env `WHATSAPP_SERVICE_URL`, `WHATSAPP_SERVICE_TOKEN`.

- [ ] **Step 1: Adapter mit RestClient (Muster: OpenMeteoWeatherAdapter)**

```java
package com.softball.adapter.out.whatsapp;

import com.softball.domain.model.WhatsappAccountStatus;
import com.softball.domain.model.WhatsappGroup;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.shared.exception.BusinessValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class WhatsappSenderHttpAdapter implements WhatsappSender {

    private static final Logger log = LoggerFactory.getLogger(WhatsappSenderHttpAdapter.class);

    private final RestClient client;

    public WhatsappSenderHttpAdapter(
            final RestClient.Builder builder,
            @Value("${whatsapp.service.url:http://localhost:3000}") final String baseUrl,
            @Value("${whatsapp.service.token:}") final String token) {
        this.client = builder
                .baseUrl(baseUrl)
                .defaultHeader("X-Service-Token", token)
                .build();
    }

    @Override
    public WhatsappAccountStatus status() {
        try {
            final StatusDto s = client.get().uri("/status").retrieve().body(StatusDto.class);
            if (s == null) return new WhatsappAccountStatus(false, null, false, null);
            return new WhatsappAccountStatus(s.connected(), s.number(), s.needsQr(), null);
        } catch (final Exception e) {
            log.warn("WhatsApp-Status nicht erreichbar: {}", e.getMessage());
            return new WhatsappAccountStatus(false, null, false, null);
        }
    }

    @Override
    public String qr() {
        try {
            final QrDto q = client.get().uri("/qr").retrieve().body(QrDto.class);
            return q != null ? q.qr() : null;
        } catch (final Exception e) {
            log.warn("WhatsApp-QR nicht erreichbar: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public List<WhatsappGroup> listGroups() {
        try {
            final GroupsDto g = client.get().uri("/groups").retrieve().body(GroupsDto.class);
            if (g == null || g.groups() == null) return List.of();
            return g.groups().stream().map(x -> new WhatsappGroup(x.id(), x.name())).toList();
        } catch (final Exception e) {
            log.warn("WhatsApp-Gruppen nicht erreichbar: {}", e.getMessage());
            throw new BusinessValidationException("WhatsApp-Dienst nicht erreichbar oder nicht gekoppelt");
        }
    }

    @Override
    public void sendPoll(final String groupId, final String title, final List<String> options) {
        try {
            client.post().uri("/send-poll")
                    .body(Map.of("groupId", groupId, "title", title, "options", options))
                    .retrieve()
                    .toBodilessEntity();
            log.info("WhatsApp-Poll gesendet: '{}' -> {}", title, groupId);
        } catch (final Exception e) {
            log.warn("WhatsApp-Poll senden fehlgeschlagen ({} -> {}): {}", title, groupId, e.getMessage());
            throw new BusinessValidationException("WhatsApp-Poll konnte nicht gesendet werden: " + e.getMessage());
        }
    }

    private record StatusDto(boolean connected, String number, boolean needsQr) {}
    private record QrDto(String qr) {}
    private record GroupsDto(List<GroupDto> groups) {}
    private record GroupDto(String id, String name) {}
}
```

- [ ] **Step 2: application.properties / application-prod ergänzen**

In `backend/src/main/resources/application.properties`:
```properties
whatsapp.service.url=${WHATSAPP_SERVICE_URL:http://localhost:3000}
whatsapp.service.token=${WHATSAPP_SERVICE_TOKEN:}
```

- [ ] **Step 3: Kompilieren**

Run: `cd backend && ./mvnw -q compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/whatsapp backend/src/main/resources/application.properties
git commit -m "✨ WhatsApp-Polls: WhatsappSender HTTP-Adapter (RestClient zum Node-Dienst)"
```

---

### Task B5: WhatsappPollService (CRUD + Skip-Dates + Passthrough) — TDD gegen Testcontainers

**Files:**
- Create: `backend/src/main/java/com/softball/application/WhatsappPollService.java`
- Test: `backend/src/test/java/com/softball/application/WhatsappPollServiceTest.java`

**Interfaces:**
- Consumes: `WhatsappPollRepository`, `WhatsappSender`, `PollDueEvaluator` (nicht hier), `WhatsappPoll`.
- Produces: `findAll()`, `findById(Long)`, `create(WhatsappPoll)`, `update(Long, WhatsappPoll)`, `delete(Long)`, `addSkipDate(Long, LocalDate)`, `removeSkipDate(Long, LocalDate)`, `sendNow(Long)`, `status()`, `qr()`, `groups()`.

- [ ] **Step 1: Failing test (Testcontainers-Integration; Muster bestehender `*ServiceTest`)**

Sieh dir zuerst einen bestehenden Service-Test an (z.B. `backend/src/test/java/com/softball/.../` mit `@SpringBootTest`/Testcontainers) und übernimm dessen Container-Setup-Annotationen 1:1. Dann:

```java
package com.softball.application;

import com.softball.domain.model.WhatsappPoll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
// + dieselben Testcontainers-/@SpringBootTest-Annotationen wie bestehende ServiceTests

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// @SpringBootTest (+ Testcontainers-Setup wie im Repo üblich)
class WhatsappPollServiceTest {

    @Autowired WhatsappPollService service;

    private WhatsappPoll sample() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId("123@g.us");
        p.setGroupName("Dead Sox Team");
        p.setTitle("Wer kommt zum Training morgen?");
        p.setOptions(List.of("Ja", "Nein", "Vielleicht"));
        p.setWeekday(DayOfWeek.TUESDAY);
        p.setTime(LocalTime.of(18, 0));
        p.setEnabled(true);
        return p;
    }

    @Test
    void create_persistsAndAssignsId() {
        final WhatsappPoll saved = service.create(sample());
        assertThat(saved.getId()).isNotNull();
        assertThat(service.findById(saved.getId()).getOptions()).containsExactly("Ja", "Nein", "Vielleicht");
    }

    @Test
    void addAndRemoveSkipDate() {
        final Long id = service.create(sample()).getId();
        service.addSkipDate(id, LocalDate.of(2026, 7, 14));
        assertThat(service.findById(id).getSkipDates()).containsExactly(LocalDate.of(2026, 7, 14));
        service.removeSkipDate(id, LocalDate.of(2026, 7, 14));
        assertThat(service.findById(id).getSkipDates()).isEmpty();
    }

    @Test
    void update_changesFields() {
        final Long id = service.create(sample()).getId();
        final WhatsappPoll upd = sample();
        upd.setTitle("Wer kommt zum P/C oder Basic Training morgen?");
        upd.setWeekday(DayOfWeek.SATURDAY);
        service.update(id, upd);
        assertThat(service.findById(id).getWeekday()).isEqualTo(DayOfWeek.SATURDAY);
        assertThat(service.findById(id).getTitle()).contains("P/C");
    }

    @Test
    void delete_removes() {
        final Long id = service.create(sample()).getId();
        service.delete(id);
        assertThat(service.findAll()).noneMatch(p -> p.getId().equals(id));
    }
}
```

- [ ] **Step 2: Test rot**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollServiceTest`
Expected: FAIL (Service existiert nicht).

- [ ] **Step 3: Service implementieren**

```java
package com.softball.application;

import com.softball.domain.model.WhatsappAccountStatus;
import com.softball.domain.model.WhatsappGroup;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class WhatsappPollService {

    private static final Logger log = LoggerFactory.getLogger(WhatsappPollService.class);

    private final WhatsappPollRepository repository;
    private final WhatsappSender sender;

    public WhatsappPollService(final WhatsappPollRepository repository, final WhatsappSender sender) {
        this.repository = repository;
        this.sender = sender;
    }

    @Transactional(readOnly = true)
    public List<WhatsappPoll> findAll() { return repository.findAll(); }

    @Transactional(readOnly = true)
    public WhatsappPoll findById(final Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("WhatsappPoll", id));
    }

    @Transactional
    public WhatsappPoll create(final WhatsappPoll poll) {
        poll.setId(null);
        validate(poll);
        log.info("WhatsApp-Poll erstellt: {}", poll.getTitle());
        return repository.save(poll);
    }

    @Transactional
    public WhatsappPoll update(final Long id, final WhatsappPoll incoming) {
        final WhatsappPoll existing = findById(id);
        existing.setGroupId(incoming.getGroupId());
        existing.setGroupName(incoming.getGroupName());
        existing.setTitle(incoming.getTitle());
        existing.setOptions(incoming.getOptions());
        existing.setWeekday(incoming.getWeekday());
        existing.setTime(incoming.getTime());
        existing.setEnabled(incoming.isEnabled());
        validate(existing);
        log.info("WhatsApp-Poll aktualisiert: {} ({})", existing.getTitle(), id);
        return repository.save(existing);
    }

    @Transactional
    public void delete(final Long id) {
        if (!repository.existsById(id)) throw new ResourceNotFoundException("WhatsappPoll", id);
        log.info("WhatsApp-Poll gelöscht: {}", id);
        repository.deleteById(id);
    }

    @Transactional
    public WhatsappPoll addSkipDate(final Long id, final LocalDate date) {
        final WhatsappPoll p = findById(id);
        if (!p.getSkipDates().contains(date)) {
            final List<LocalDate> dates = new ArrayList<>(p.getSkipDates());
            dates.add(date);
            p.setSkipDates(dates);
            repository.save(p);
        }
        return findById(id);
    }

    @Transactional
    public WhatsappPoll removeSkipDate(final Long id, final LocalDate date) {
        final WhatsappPoll p = findById(id);
        final List<LocalDate> dates = new ArrayList<>(p.getSkipDates());
        dates.remove(date);
        p.setSkipDates(dates);
        repository.save(p);
        return findById(id);
    }

    @Transactional
    public void sendNow(final Long id) {
        final WhatsappPoll p = findById(id);
        sender.sendPoll(p.getGroupId(), p.getTitle(), p.getOptions());
    }

    public WhatsappAccountStatus status() { return sender.status(); }

    public String qr() { return sender.qr(); }

    public List<WhatsappGroup> groups() { return sender.listGroups(); }

    private void validate(final WhatsappPoll p) {
        if (p.getTitle() == null || p.getTitle().isBlank()) {
            throw new BusinessValidationException("Titel darf nicht leer sein");
        }
        if (p.getGroupId() == null || p.getGroupId().isBlank()) {
            throw new BusinessValidationException("Gruppe muss gewählt sein");
        }
        if (p.getOptions() == null || p.getOptions().size() < 2) {
            throw new BusinessValidationException("Mindestens 2 Antwortoptionen nötig");
        }
        if (p.getWeekday() == null || p.getTime() == null) {
            throw new BusinessValidationException("Wochentag und Uhrzeit müssen gesetzt sein");
        }
    }
}
```

Hinweis: Im Test ist der `WhatsappSender` ein echtes Bean, das versucht `localhost:3000` zu erreichen. Die Tests rufen nur CRUD/Skip (nicht `sendNow`/`status`) — der Sender wird dort nie aufgerufen, also kein Node-Dienst nötig. Falls ein Kontextproblem auftritt, `WhatsappSender` im Test mit `@MockBean` überschreiben.

- [ ] **Step 4: Test grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollServiceTest`
Expected: PASS (4 Tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/WhatsappPollService.java backend/src/test/java/com/softball/application/WhatsappPollServiceTest.java
git commit -m "✨ WhatsApp-Polls: WhatsappPollService (CRUD, Skip-Dates, Send/Status-Passthrough)"
```

---

### Task B6: Scheduler + @EnableScheduling — TDD

**Files:**
- Create: `backend/src/main/java/com/softball/shared/config/SchedulingConfig.java`
- Create: `backend/src/main/java/com/softball/application/WhatsappPollScheduler.java`
- Test: `backend/src/test/java/com/softball/application/WhatsappPollSchedulerTest.java`

**Interfaces:**
- Consumes: `WhatsappPollRepository`, `WhatsappSender`, `PollDueEvaluator`.
- Produces: `WhatsappPollScheduler` mit `void tick(LocalDateTime now)` (testbar) + `@Scheduled`-Methode die `tick(LocalDateTime.now())` ruft.

- [ ] **Step 1: Failing test (Mockito, kein Spring nötig)**

```java
package com.softball.application;

import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.domain.service.PollDueEvaluator;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class WhatsappPollSchedulerTest {

    private final WhatsappPollRepository repo = mock(WhatsappPollRepository.class);
    private final WhatsappSender sender = mock(WhatsappSender.class);
    private final WhatsappPollScheduler scheduler =
            new WhatsappPollScheduler(repo, sender, new PollDueEvaluator());

    private WhatsappPoll due() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(1L);
        p.setGroupId("g@g.us");
        p.setTitle("Training?");
        p.setOptions(List.of("Ja", "Nein"));
        p.setWeekday(DayOfWeek.TUESDAY);
        p.setTime(LocalTime.of(18, 0));
        p.setEnabled(true);
        return p;
    }

    private final LocalDateTime tueAt1800 = LocalDateTime.of(2026, 7, 14, 18, 0);

    @Test
    void tick_sendsDuePoll_andStampsLastSentAt() {
        when(repo.findAll()).thenReturn(List.of(due()));
        scheduler.tick(tueAt1800);
        verify(sender).sendPoll(eq("g@g.us"), eq("Training?"), anyList());
        verify(repo).save(argThat(p -> p.getLastSentAt() != null));
    }

    @Test
    void tick_skipsNotDuePoll() {
        when(repo.findAll()).thenReturn(List.of(due()));
        scheduler.tick(tueAt1800.plusMinutes(1));  // falsche Minute
        verify(sender, never()).sendPoll(any(), any(), anyList());
        verify(repo, never()).save(any());
    }

    @Test
    void tick_sendFailure_doesNotStampLastSentAt() {
        when(repo.findAll()).thenReturn(List.of(due()));
        doThrow(new RuntimeException("offline")).when(sender).sendPoll(any(), any(), anyList());
        scheduler.tick(tueAt1800);
        verify(repo, never()).save(any());
    }
}
```

- [ ] **Step 2: Test rot**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollSchedulerTest`
Expected: FAIL (Scheduler existiert nicht).

- [ ] **Step 3: PollDueEvaluator als Bean verfügbar machen**

`PollDueEvaluator` ist ein reines Domain-Objekt (kein `@Component`, damit `domain` Spring-frei bleibt). Als Bean in `SchedulingConfig` bereitstellen:

```java
package com.softball.shared.config;

import com.softball.domain.service.PollDueEvaluator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulingConfig {

    @Bean
    public PollDueEvaluator pollDueEvaluator() {
        return new PollDueEvaluator();
    }
}
```

- [ ] **Step 4: Scheduler implementieren**

```java
package com.softball.application;

import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.domain.service.PollDueEvaluator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class WhatsappPollScheduler {

    private static final Logger log = LoggerFactory.getLogger(WhatsappPollScheduler.class);

    private final WhatsappPollRepository repository;
    private final WhatsappSender sender;
    private final PollDueEvaluator evaluator;

    public WhatsappPollScheduler(final WhatsappPollRepository repository,
                                 final WhatsappSender sender,
                                 final PollDueEvaluator evaluator) {
        this.repository = repository;
        this.sender = sender;
        this.evaluator = evaluator;
    }

    // Jede Minute zur Sekunde 0
    @Scheduled(cron = "0 * * * * *")
    public void run() {
        tick(LocalDateTime.now());
    }

    public void tick(final LocalDateTime now) {
        for (final WhatsappPoll poll : repository.findAll()) {
            if (!evaluator.isDue(poll, now)) continue;
            try {
                sender.sendPoll(poll.getGroupId(), poll.getTitle(), poll.getOptions());
                poll.setLastSentAt(now);
                repository.save(poll);
                log.info("Geplanter WhatsApp-Poll gesendet: {} ({})", poll.getTitle(), poll.getId());
            } catch (final Exception e) {
                log.warn("Geplanter WhatsApp-Poll fehlgeschlagen: {} ({}): {}",
                        poll.getTitle(), poll.getId(), e.getMessage());
                // lastSentAt NICHT stempeln → nächster Tick im selben Minutenfenster kann erneut versuchen
            }
        }
    }
}
```

- [ ] **Step 5: Test grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WhatsappPollSchedulerTest`
Expected: PASS (3 Tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/shared/config/SchedulingConfig.java backend/src/main/java/com/softball/application/WhatsappPollScheduler.java backend/src/test/java/com/softball/application/WhatsappPollSchedulerTest.java
git commit -m "✨ WhatsApp-Polls: Scheduler (@Scheduled minütlich) + @EnableScheduling"
```

---

### Task B7: DTOs + Controller

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/WhatsappPollRequest.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/WhatsappPollResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/WhatsappAccountStatusResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/WhatsappGroupResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/in/web/WhatsappController.java`

**Interfaces:**
- Consumes: `WhatsappPollService`, Domain-Modelle.
- Produces: REST unter `/api/orga/whatsapp` (Setup) + `/api/orga/whatsapp/polls` (CRUD).

- [ ] **Step 1: Request-DTO**

```java
package com.softball.adapter.dto;

import com.softball.domain.model.WhatsappPoll;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

public record WhatsappPollRequest(
        @NotBlank String groupId,
        String groupName,
        @NotBlank String title,
        @NotNull List<String> options,
        @NotNull DayOfWeek weekday,
        @NotNull LocalTime time,
        boolean enabled) {

    public WhatsappPoll toDomain() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId(groupId);
        p.setGroupName(groupName);
        p.setTitle(title);
        p.setOptions(options != null ? options : List.of());
        p.setWeekday(weekday);
        p.setTime(time);
        p.setEnabled(enabled);
        return p;
    }
}
```

- [ ] **Step 2: Response-DTOs**

`WhatsappPollResponse.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.WhatsappPoll;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record WhatsappPollResponse(
        Long id,
        String groupId,
        String groupName,
        String title,
        List<String> options,
        DayOfWeek weekday,
        LocalTime time,
        boolean enabled,
        List<LocalDate> skipDates,
        LocalDateTime lastSentAt) {

    public static WhatsappPollResponse from(final WhatsappPoll p) {
        return new WhatsappPollResponse(p.getId(), p.getGroupId(), p.getGroupName(), p.getTitle(),
                p.getOptions(), p.getWeekday(), p.getTime(), p.isEnabled(), p.getSkipDates(), p.getLastSentAt());
    }
}
```

`WhatsappAccountStatusResponse.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.WhatsappAccountStatus;

public record WhatsappAccountStatusResponse(boolean connected, String number, boolean needsQr) {
    public static WhatsappAccountStatusResponse from(final WhatsappAccountStatus s) {
        return new WhatsappAccountStatusResponse(s.connected(), s.number(), s.needsQr());
    }
}
```

`WhatsappGroupResponse.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.WhatsappGroup;

public record WhatsappGroupResponse(String id, String name) {
    public static WhatsappGroupResponse from(final WhatsappGroup g) {
        return new WhatsappGroupResponse(g.id(), g.name());
    }
}
```

- [ ] **Step 3: Controller**

```java
package com.softball.adapter.in.web;

import com.softball.adapter.dto.WhatsappAccountStatusResponse;
import com.softball.adapter.dto.WhatsappGroupResponse;
import com.softball.adapter.dto.WhatsappPollRequest;
import com.softball.adapter.dto.WhatsappPollResponse;
import com.softball.application.WhatsappPollService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orga/whatsapp")
public class WhatsappController {

    private final WhatsappPollService service;

    public WhatsappController(final WhatsappPollService service) {
        this.service = service;
    }

    // --- Konto / Setup ---
    @GetMapping("/status")
    public WhatsappAccountStatusResponse status() {
        return WhatsappAccountStatusResponse.from(service.status());
    }

    @GetMapping("/qr")
    public Map<String, String> qr() {
        return java.util.Collections.singletonMap("qr", service.qr());
    }

    @GetMapping("/groups")
    public List<WhatsappGroupResponse> groups() {
        return service.groups().stream().map(WhatsappGroupResponse::from).toList();
    }

    // --- Polls ---
    @GetMapping("/polls")
    public List<WhatsappPollResponse> all() {
        return service.findAll().stream().map(WhatsappPollResponse::from).toList();
    }

    @PostMapping("/polls")
    @ResponseStatus(HttpStatus.CREATED)
    public WhatsappPollResponse create(@Valid @RequestBody final WhatsappPollRequest req) {
        return WhatsappPollResponse.from(service.create(req.toDomain()));
    }

    @PutMapping("/polls/{id}")
    public WhatsappPollResponse update(@PathVariable final Long id, @Valid @RequestBody final WhatsappPollRequest req) {
        return WhatsappPollResponse.from(service.update(id, req.toDomain()));
    }

    @DeleteMapping("/polls/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        service.delete(id);
    }

    @PostMapping("/polls/{id}/send-now")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sendNow(@PathVariable final Long id) {
        service.sendNow(id);
    }

    @PostMapping("/polls/{id}/skip-dates")
    public WhatsappPollResponse addSkip(@PathVariable final Long id, @RequestBody final Map<String, String> body) {
        return WhatsappPollResponse.from(service.addSkipDate(id, LocalDate.parse(body.get("date"))));
    }

    @DeleteMapping("/polls/{id}/skip-dates/{date}")
    public WhatsappPollResponse removeSkip(@PathVariable final Long id, @PathVariable final String date) {
        return WhatsappPollResponse.from(service.removeSkipDate(id, LocalDate.parse(date)));
    }
}
```

- [ ] **Step 4: Voller Backend-Test-Lauf**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS (alle Tests inkl. neuer grün).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto backend/src/main/java/com/softball/adapter/in/web/WhatsappController.java
git commit -m "✨ WhatsApp-Polls: DTOs + Controller (/api/orga/whatsapp)"
```

---

## Phase C — Frontend

### Task C1: Types + API-Client + Hook

**Files:**
- Modify: `frontend/src/types/index.ts` (bzw. bestehende Types-Datei — vorher prüfen wo Types liegen)
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/hooks/useWhatsappPoll.ts`

**Interfaces:**
- Produces: Types `WhatsappPoll`, `WhatsappAccountStatus`, `WhatsappGroup`; `client`-Methoden; Hook `useWhatsappPoll()`.

- [ ] **Step 1: Types ergänzen**

```ts
export interface WhatsappPoll {
  id: number
  groupId: string
  groupName: string | null
  title: string
  options: string[]
  weekday: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
  time: string      // "18:00" / "18:00:00"
  enabled: boolean
  skipDates: string[]   // ISO-Daten "2026-07-14"
  lastSentAt: string | null
}

export interface WhatsappAccountStatus {
  connected: boolean
  number: string | null
  needsQr: boolean
}

export interface WhatsappGroup {
  id: string
  name: string
}

export type WhatsappPollInput = Omit<WhatsappPoll, 'id' | 'skipDates' | 'lastSentAt'>
```

- [ ] **Step 2: client.ts Methoden ergänzen**

Am Ende des Client-Objekts/Exports (Muster der bestehenden `request<T>`-Aufrufe übernehmen):
```ts
export const whatsappApi = {
  status: () => request<WhatsappAccountStatus>('/orga/whatsapp/status'),
  qr: () => request<{ qr: string | null }>('/orga/whatsapp/qr'),
  groups: () => request<WhatsappGroup[]>('/orga/whatsapp/groups'),
  listPolls: () => request<WhatsappPoll[]>('/orga/whatsapp/polls'),
  createPoll: (p: WhatsappPollInput) =>
    request<WhatsappPoll>('/orga/whatsapp/polls', { method: 'POST', body: JSON.stringify(p) }),
  updatePoll: (id: number, p: WhatsappPollInput) =>
    request<WhatsappPoll>(`/orga/whatsapp/polls/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  deletePoll: (id: number) =>
    request<void>(`/orga/whatsapp/polls/${id}`, { method: 'DELETE' }),
  sendNow: (id: number) =>
    request<void>(`/orga/whatsapp/polls/${id}/send-now`, { method: 'POST' }),
  addSkipDate: (id: number, date: string) =>
    request<WhatsappPoll>(`/orga/whatsapp/polls/${id}/skip-dates`, { method: 'POST', body: JSON.stringify({ date }) }),
  removeSkipDate: (id: number, date: string) =>
    request<WhatsappPoll>(`/orga/whatsapp/polls/${id}/skip-dates/${date}`, { method: 'DELETE' }),
}
```
Passe Import/Export exakt an die Struktur von `client.ts` an (falls dort ein einzelnes `api`-Objekt existiert, dort einhängen statt neuem Export). `request` und die Types importieren wo nötig.

- [ ] **Step 3: Hook**

```ts
import { useCallback, useEffect, useState } from 'react'
import { whatsappApi } from '@/api/client'
import type { WhatsappPoll, WhatsappAccountStatus, WhatsappGroup, WhatsappPollInput } from '@/types'

export function useWhatsappPoll() {
  const [polls, setPolls] = useState<WhatsappPoll[]>([])
  const [status, setStatus] = useState<WhatsappAccountStatus | null>(null)
  const [groups, setGroups] = useState<WhatsappGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([whatsappApi.status(), whatsappApi.listPolls()])
      setStatus(s)
      setPolls(p)
      if (s.connected) setGroups(await whatsappApi.groups())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const createPoll = async (p: WhatsappPollInput) => { await whatsappApi.createPoll(p); await refresh() }
  const updatePoll = async (id: number, p: WhatsappPollInput) => { await whatsappApi.updatePoll(id, p); await refresh() }
  const deletePoll = async (id: number) => { await whatsappApi.deletePoll(id); await refresh() }
  const sendNow = async (id: number) => { await whatsappApi.sendNow(id) }
  const addSkipDate = async (id: number, date: string) => { await whatsappApi.addSkipDate(id, date); await refresh() }
  const removeSkipDate = async (id: number, date: string) => { await whatsappApi.removeSkipDate(id, date); await refresh() }

  return { polls, status, groups, loading, error, refresh,
           createPoll, updatePoll, deletePoll, sendNow, addSkipDate, removeSkipDate }
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run build`
Expected: tsc ok (Hook noch ungenutzt → evtl. „declared but never used" nur wenn importiert; solange nicht importiert, kein Fehler).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types frontend/src/api/client.ts frontend/src/hooks/useWhatsappPoll.ts
git commit -m "✨ FE WhatsApp-Polls: Types, API-Client, useWhatsappPoll-Hook"
```

---

### Task C2: WhatsappPollPage (mit frontend-design-Skill)

**Files:**
- Create: `frontend/src/components/orga/WhatsappPollPage.tsx`

**Interfaces:**
- Consumes: `useWhatsappPoll`, Shared-Komponenten (`Card`, ggf. `ConfirmModal`), Icons aus `@/icons`.

- [ ] **Step 1: `frontend-design`-Skill ziehen**

**Vor dem Schreiben der Seite:** `Skill(frontend-design)` aufrufen und dessen Leitlinien auf diese Seite anwenden. Rahmen: bestehende App-Konventionen (navy, `Card`, `font-display`, Dark-Navy-Hover, Hover-Reveal, deutsche Labels), aber mit der Design-Sorgfalt des Skills. Orientiere dich an bestehenden Orga-Seiten (`InvitationListPage.tsx`, `EquipmentCatalogPage.tsx`) für Look & Zurück-Link.

- [ ] **Step 2: Seite implementieren**

Funktionaler Aufbau (Design-Feinschliff via Skill):
- **Kopf:** „← Zurück zur Orga" (Link `/orga`), Titel „WhatsApp-Umfragen".
- **Konto-Block:**
  - Wenn `status.connected`: grüner Badge „Verbunden als {number}".
  - Wenn `!connected`: QR laden (`whatsappApi.qr()`), als `<img src={qr}>` anzeigen mit Anleitung „WhatsApp → Verknüpfte Geräte → Gerät verknüpfen". Poll-Bereich disabled/ausgegraut solange nicht verbunden. Poll-abhängige Buttons deaktivieren.
- **Poll-Liste:** je Poll eine `Card`: Titel, `weekday`+`time` (deutsch: Mo/Di/…, „18:00"), `groupName`, Aktiv-Badge, Aussetz-Daten als Chips (mit ×), „lastSentAt" klein. Hover-Reveal: Pencil (Edit), TrashBin (Delete via `ConfirmModal`), SendIcon („Jetzt testen" → `ConfirmModal` „Poll jetzt wirklich senden?").
- **„+ Neue Umfrage"** öffnet Editor-Modal.
- **Editor-Modal (Create/Edit):** Felder — Gruppen-Dropdown (`groups`, disabled wenn leer/nicht verbunden, speichert `groupId`+`groupName`), Titel (Text), Antwortoptionen (dynamische Liste add/remove, vorbefüllt `['Ja','Nein','Vielleicht']` bei Neu), Wochentag-Dropdown (Mo–So → Enum-Wert), Uhrzeit (`<input type="time">`), Aktiv-Switch. Speichern ruft `createPoll`/`updatePoll` mit `WhatsappPollInput`.
- **Aussetz-Daten:** im Editor oder auf der Card ein `<input type="date">` + „hinzufügen" → `addSkipDate`; Chips mit × → `removeSkipDate`.

Wochentag-Mapping-Helfer (deutsch):
```ts
const WEEKDAYS: { value: WhatsappPoll['weekday']; label: string }[] = [
  { value: 'MONDAY', label: 'Montag' }, { value: 'TUESDAY', label: 'Dienstag' },
  { value: 'WEDNESDAY', label: 'Mittwoch' }, { value: 'THURSDAY', label: 'Donnerstag' },
  { value: 'FRIDAY', label: 'Freitag' }, { value: 'SATURDAY', label: 'Samstag' },
  { value: 'SUNDAY', label: 'Sonntag' },
]
```

Fehler/Empty-States: `error` anzeigen; Empty-State mit `CrossBones` wenn keine Polls.

- [ ] **Step 3: Typecheck + Lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: beide grün.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/orga/WhatsappPollPage.tsx
git commit -m "✨ FE WhatsApp-Polls: Orga-Seite (Konto-Status, QR, Poll-Liste, Editor)"
```

---

### Task C3: Orga-Kachel + Route

**Files:**
- Modify: `frontend/src/components/orga/OrgaHome.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `WhatsappPollPage`.

- [ ] **Step 1: Route in App.tsx**

Neben den bestehenden `/orga/*`-Routen:
```tsx
import { WhatsappPollPage } from '@/components/orga/WhatsappPollPage'
// ...
{ path: '/orga/whatsapp-umfrage', element: <WhatsappPollPage />, errorElement: <ChunkErrorBoundary /> },
```

- [ ] **Step 2: Kachel in OrgaHome.tsx**

Nach der Aufbau-Kachel eine dritte `Link`-Card (Muster identisch, Icon `SendIcon` aus `@/icons`):
```tsx
<Link to="/orga/whatsapp-umfrage">
  <Card padding="lg" className="hover:border-navy-400 hover:shadow-md transition-all cursor-pointer h-full">
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 text-white shrink-0"><SendIcon size={20} /></span>
      <div>
        <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">WhatsApp-Umfragen</div>
        <div className="text-xs text-gray-500 mt-0.5">Wöchentliche Trainings-Abstimmungen</div>
      </div>
    </div>
  </Card>
</Link>
```
`import { SendIcon } from '@/icons'` ergänzen.

- [ ] **Step 3: Build + Lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: grün.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/orga/OrgaHome.tsx frontend/src/App.tsx
git commit -m "✨ FE WhatsApp-Polls: Orga-Kachel + Route /orga/whatsapp-umfrage"
```

---

## Phase D — Deployment & Verifikation

### Task D1: Docker-Compose-Service + Env-Doku

**Files:**
- Modify: `docker-compose.yml`
- Modify/Create: `.env.example` (falls vorhanden) + `docs/deployment.md`

**Interfaces:**
- Consumes: `whatsapp-service/` (Task A1). Backend liest `WHATSAPP_SERVICE_URL`, `WHATSAPP_SERVICE_TOKEN`.

- [ ] **Step 1: Service in docker-compose.yml**

Vorhandene Struktur prüfen, dann Service + Volume ergänzen:
```yaml
  whatsapp:
    build: ./whatsapp-service
    restart: unless-stopped
    environment:
      - WHATSAPP_SERVICE_TOKEN=${WHATSAPP_SERVICE_TOKEN}
      - SESSION_PATH=/data/session
    volumes:
      - whatsapp_session:/data/session
    # kein Port nach außen — nur im internen Compose-Netz erreichbar

volumes:
  whatsapp_session:
```
Beim `backend`-Service ergänzen:
```yaml
      - WHATSAPP_SERVICE_URL=http://whatsapp:3000
      - WHATSAPP_SERVICE_TOKEN=${WHATSAPP_SERVICE_TOKEN}
```

- [ ] **Step 2: Env-Doku**

In `docs/deployment.md` + `.env.example`: `WHATSAPP_SERVICE_TOKEN` (frei gewähltes Geheimnis, in beiden Services identisch), Hinweis Erst-Kopplung via QR in der Orga-UI, Session persistiert im Volume `whatsapp_session`.

- [ ] **Step 3: Lokaler End-to-End-Smoke**

```bash
docker compose up -d db whatsapp
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml   # WHATSAPP_SERVICE_URL=http://localhost:3000 (Port des whatsapp-Containers ggf. lokal mappen)
cd frontend && npx vite
```
Im Browser `/orga/whatsapp-umfrage`: QR erscheint → mit Handy koppeln → Status „verbunden" → Gruppen-Dropdown gefüllt → Poll anlegen → „Jetzt testen" → Poll erscheint in WhatsApp-Gruppe. (Für den lokalen Lauf den `whatsapp`-Container-Port temporär mappen, z.B. `ports: ["3000:3000"]`, oder den Node-Dienst wie in A1-Step-5 direkt laufen lassen.)

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docs/deployment.md .env.example
git commit -m "🔧 WhatsApp-Polls: Docker-Compose-Service + Env-Doku"
```

---

### Task D2: Verifikation vor Merge

- [ ] **Step 1: Backend voll**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 2: Frontend voll**

Run: `cd frontend && npm run build && npm run lint`
Expected: beide grün.

- [ ] **Step 3: Scheduler-Live-Check (optional, manuell)**

Einen Poll mit Wochentag/Uhrzeit = „in 2 Minuten" anlegen, warten, prüfen dass er in der Gruppe erscheint und `lastSentAt` gesetzt ist. Danach Poll auf realistischen Zeitpunkt zurückstellen.

- [ ] **Step 4: `verify`-Skill**

`Skill(verify)` zur End-to-End-Bestätigung des Poll-Flows (Anlegen → Senden sichtbar).

---

## Self-Review Notes

- **Spec-Coverage:** Node-Sidecar (A1) ✓; Liste wiederkehrender Polls je Wochentag (B1/B3) ✓; QR-Kopplung + Nummer aus Status (A1/B4/C2) ✓; Gruppen-Dropdown via `groupId` (A1/B7/C2) ✓; Aussetz-Daten (B5/B7/C2) ✓; Speichern≠Senden (Scheduler B6 + kein Send in create/update) ✓; frei editierbare Optionen, Default Ja/Nein/Vielleicht (C2) ✓; Fire-and-forget (kein Rücklauf) ✓; Deployment + Volume (D1) ✓; frontend-design-Skill (C2) ✓.
- **Offene Spec-Punkte:** Scheduler-Retry = „im selben Minutenfenster erneut versuchen, lastSentAt erst bei Erfolg" (B6). Persistenz Optionen+skipDates = jsonb (B3). Rate-Limit „Jetzt testen": im Plan NICHT hart implementiert (bewusst weggelassen; Bestätigungs-Modal als Schutz — bei Bedarf später serverseitig ergänzen). whatsapp-web.js-Wartungsrisiko = im README dokumentiert (A1).
- **Typkonsistenz:** `isDue(WhatsappPoll, LocalDateTime)` einheitlich B2/B6; `sendPoll(String,String,List<String>)` einheitlich B1/B4/B5/B6; `time`↔`send_time`-Spalte B3; Weekday als Enum-Name persistiert B3, DayOfWeek im Model/DTO.
