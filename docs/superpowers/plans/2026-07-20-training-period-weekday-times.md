# Zeit je Wochentag in Trainingsperioden — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Jede `TrainingPeriod` hat pro Wochentag eine eigene Uhrzeit (statt einer generellen); Trainings-Generierung + UI nutzen sie.

**Architecture:** Neues Feld `weekdayTimes: Map<Integer,String>` (Wochentag→"HH:mm") als CSV-Spalte (`"1=18:00,4=19:00"`), konsistent zum bestehenden CSV-Stil von `weekdays`. Generierung setzt je Training die Zeit seines Wochentags. Alte generelle `time`-Spalte bleibt liegen (ungenutzt).

**Tech Stack:** Java 21, Spring Boot, JPA, Flyway (Postgres), JUnit5+Mockito; React/TS.

## Global Constraints

- Onion-Architektur; `domain` kennt kein Spring/JPA. `PeriodRhythmSync` ist plain Domain-Service.
- `TrainingPeriod` persistiert Listen als **CSV** (VARCHAR), nicht JSONB — `weekdayTimes` ebenso als CSV `"wd=HH:mm,..."`. Kein ObjectMapper im `TrainingPeriodMapper`.
- Flyway: neue Migration `V49__*.sql`, `ddl-auto=validate`. Letzte ist V48. Postgres 17 (Prod + Testcontainers).
- `Training.time` ist String ("18:00"). Wochentag ISO 1=Mo…7=So.
- Backend-Tests: `cd backend && ./mvnw test -s .mvn/local-settings.xml` (`-s` PFLICHT; Testcontainers braucht Docker — `docker compose up -d db`). Frontend: `cd frontend && npm run build`.
- Kein `Co-Authored-By`; gitmoji.
- Bash-Sandbox defekt (bwrap) → bei "Operation not permitted" `dangerouslyDisableSandbox: true`.

---

### Task 1: Feld `weekdayTimes` (Migration + Model + Entity + Mapper)

**Files:**
- Create: `backend/src/main/resources/db/migration/V49__training_period_weekday_times.sql`
- Modify: `backend/src/main/java/com/softball/domain/model/TrainingPeriod.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/TrainingPeriodEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/TrainingPeriodMapper.java`
- Test: `backend/src/test/java/com/softball/adapter/out/persistence/mapper/TrainingPeriodMapperTest.java` (neu, falls nicht vorhanden)

**Interfaces:**
- Produces: `TrainingPeriod.getWeekdayTimes(): Map<Integer,String>` / `setWeekdayTimes(Map<Integer,String>)`.

- [ ] **Step 1: Migration + Backfill**

`V49__training_period_weekday_times.sql`:
```sql
ALTER TABLE training_periods ADD COLUMN weekday_times VARCHAR(255);

-- Backfill: bestehende generelle time für alle Wochentage der Periode übernehmen.
UPDATE training_periods SET weekday_times = (
    SELECT string_agg(wd || '=' || time, ',' ORDER BY wd::int)
    FROM regexp_split_to_table(weekdays, ',') AS wd
)
WHERE weekdays IS NOT NULL AND weekdays <> '' AND time IS NOT NULL AND time <> '';
```

- [ ] **Step 2: Model** (`TrainingPeriod.java`) — Feld + Getter/Setter (Map, null-safe wie `weekdays`):
```java
    private Map<Integer, String> weekdayTimes = new LinkedHashMap<>();
    // ...
    public Map<Integer, String> getWeekdayTimes() { return weekdayTimes; }
    public void setWeekdayTimes(final Map<Integer, String> v) { this.weekdayTimes = v != null ? v : new LinkedHashMap<>(); }
```
Imports: `java.util.Map`, `java.util.LinkedHashMap`.

- [ ] **Step 3: Entity** (`TrainingPeriodEntity.java`) — CSV-Spalte:
```java
    @Column(name = "weekday_times")
    private String weekdayTimes;
```
plus Getter/Setter.

- [ ] **Step 4: Mapper** (`TrainingPeriodMapper.java`) — Map↔CSV. In `toDomain`: `domain.setWeekdayTimes(timesFromCsv(entity.getWeekdayTimes()));`; in `toEntity`/`updateEntity`: `entity.setWeekdayTimes(timesToCsv(domain.getWeekdayTimes()));`. Helper:
```java
    private String timesToCsv(final Map<Integer, String> m) {
        if (m == null || m.isEmpty()) return null;
        return m.entrySet().stream().sorted(Map.Entry.comparingByKey())
            .map(e -> e.getKey() + "=" + e.getValue())
            .collect(Collectors.joining(","));
    }
    private Map<Integer, String> timesFromCsv(final String csv) {
        final Map<Integer, String> out = new LinkedHashMap<>();
        if (csv == null || csv.isBlank()) return out;
        for (final String part : csv.split(",")) {
            final String[] kv = part.split("=", 2);
            if (kv.length == 2 && !kv[0].isBlank()) out.put(Integer.valueOf(kv[0].trim()), kv[1].trim());
        }
        return out;
    }
```
Imports: `java.util.Map`, `java.util.LinkedHashMap`.

- [ ] **Step 5: Mapper-Test** (round-trip):
```java
@Test
void weekdayTimesRoundTrip() {
    final TrainingPeriod p = new TrainingPeriod(1L, "P", LocalDate.now(), LocalDate.now().plusDays(30));
    p.setWeekdays(List.of(1, 4, 6));
    p.setWeekdayTimes(new LinkedHashMap<>(Map.of(1, "18:00", 4, "19:00", 6, "10:00")));
    final var back = mapper.toDomain(mapper.toEntity(p));
    assertThat(back.getWeekdayTimes()).containsEntry(1, "18:00").containsEntry(4, "19:00").containsEntry(6, "10:00");
}
```

- [ ] **Step 6: Testen** `docker compose up -d db` dann `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPeriodMapperTest,TrainingPeriod*'` → PASS (Flyway V49 sauber).

- [ ] **Step 7: Commit**
```bash
git add backend/src/main/resources/db/migration/V49__training_period_weekday_times.sql backend/src/main/java/com/softball/domain/model/TrainingPeriod.java backend/src/main/java/com/softball/adapter/out/persistence/entity/TrainingPeriodEntity.java backend/src/main/java/com/softball/adapter/out/persistence/mapper/TrainingPeriodMapper.java backend/src/test/java/com/softball/adapter/out/persistence/mapper/TrainingPeriodMapperTest.java
git commit -m "✨ TrainingPeriod: weekdayTimes (Zeit je Wochentag, CSV)"
```

---

### Task 2: Generierung + Validierung nutzen `weekdayTimes`

**Files:**
- Modify: `backend/src/main/java/com/softball/application/TrainingPeriodService.java` (`update(...)`)
- Modify: `backend/src/main/java/com/softball/application/TrainingService.java` (`createBulk(...)`)
- Test: `backend/src/test/java/com/softball/application/TrainingPeriodServiceTest.java` + `TrainingServiceTest.java` (erweitern)

**Interfaces:**
- Consumes: `TrainingPeriod.getWeekdayTimes()` (Task 1).
- `update(...)` und `createBulk(...)` erhalten einen zusätzlichen Parameter `Map<Integer,String> weekdayTimes` (Signatur-Erweiterung; Controller in Task 3 füttert ihn).

- [ ] **Step 1: `TrainingPeriodService.update` erweitern** — Signatur um `Map<Integer,String> weekdayTimes` ergänzen. Validierung nach der weekday-Validierung:
```java
for (final Integer d : safeWeekdays) {
    final String t = weekdayTimes != null ? weekdayTimes.get(d) : null;
    if (t == null || !t.matches("^\\d{2}:\\d{2}$")) {
        throw new IllegalArgumentException("Für jeden Trainingstag muss eine Uhrzeit (HH:mm) gesetzt sein");
    }
}
```
`period.setWeekdayTimes(weekdayTimes)` setzen (statt/zusätzlich zu `setTime`). Bei der Trainings-Erzeugung die Zeit des Wochentags nehmen:
```java
final String t = weekdayTimes.get(date.getDayOfWeek().getValue());
Training training = new Training(date, t, location);
```
Ebenso: bestehende zukünftige Trainings, deren Zeit von der neuen Wochentags-Zeit abweicht, auf die neue Zeit aktualisieren (im Rhythmus-Sync-Block; für die behaltenen `existing` mit `date >= today`).

- [ ] **Step 2: `TrainingService.createBulk` erweitern** — analog `weekdayTimes`-Parameter; beim Erzeugen/Aktualisieren je Training `weekdayTimes.get(date.getDayOfWeek().getValue())` statt der einen `time`. `period.setWeekdayTimes(...)`.

- [ ] **Step 3: Tests** — `TrainingPeriodServiceTest`: (a) generiert Trainings mit korrekter Zeit je Wochentag (Mo 18:00 / Do 19:00); (b) fehlende Zeit für einen weekday → `IllegalArgumentException`; (c) Update ändert Zeit eines Wochentags → zukünftige Trainings dieses Tags bekommen neue Zeit, Vergangenheit unverändert. `TrainingServiceTest`: createBulk setzt Zeit je Wochentag.

- [ ] **Step 4: Testen** `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPeriodServiceTest,TrainingServiceTest'` → PASS.

- [ ] **Step 5: Commit** `git commit -m "✨ Trainings-Generierung nutzt Zeit je Wochentag + Validierung"`

---

### Task 3: DTOs + Controller

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/` — `TrainingPeriodRequest`, `TrainingPeriodResponse`, `CreateBulkTrainingRequest` (weekdayTimes ergänzen)
- Modify: die zugehörigen Controller (`TrainingController`/`TrainingPeriodController` — die die obigen Services aufrufen), sodass `weekdayTimes` durchgereicht wird.
- Test: bestehende Controller-ITs anpassen.

**Interfaces:**
- Consumes: Service-Signaturen aus Task 2.

- [ ] **Step 1:** DTOs lesen, `Map<Integer,String> weekdayTimes` als Feld ergänzen (Request: `@NotNull`; Response: aus `period.getWeekdayTimes()`). `time` im Request optional/deprecated lassen (nicht entfernen — Rückwärtskompat des JSON), aber Services nutzen `weekdayTimes`.
- [ ] **Step 2:** Controller-Methoden: `weekdayTimes` aus dem Request an `service.update(...)`/`createBulk(...)` weiterreichen.
- [ ] **Step 3:** Controller-ITs anpassen (Request-Bodies mit `weekdayTimes`), Response prüft `weekdayTimes`.
- [ ] **Step 4:** Testen `./mvnw test -s .mvn/local-settings.xml -Dtest='*TrainingPeriod*IT,*Training*Controller*'` → PASS.
- [ ] **Step 5:** Commit `git commit -m "✨ Perioden-DTOs/Controller reichen weekdayTimes durch"`

---

### Task 4: Frontend — pro-Wochentag-Zeit-Felder im Perioden-Editor

**Files:**
- Modify: Perioden-Editor-Komponente (im `training/`-Ordner; die den Wochentag+Zeit-Input rendert — via grep `weekday`/`Uhrzeit`/`periods` finden)
- Modify: `frontend/src/hooks/useTraining.ts` (createBulk/updatePeriod payload)
- Modify: `frontend/src/api/client.ts` + `frontend/src/types/index.ts` (weekdayTimes im Request/Response)

**Interfaces:** API-Feld `weekdayTimes: Record<number,string>` in Period-Request/Response.

- [ ] **Step 1:** Editor lesen, das eine Zeit-Feld durch **ein Zeit-Feld je angehaktem Wochentag** ersetzen. State: `weekdayTimes: Record<number,string>`. Wochentag anhaken → Feld mit Default (letzte/erste vorhandene Zeit) erscheint; abhaken → Eintrag raus.
- [ ] **Step 2:** Types + client: `weekdayTimes` in Period-Request/Response. Hook reicht es durch.
- [ ] **Step 3:** Build `cd frontend && npm run build` → `✓ built`.
- [ ] **Step 4:** Commit `git commit -m "🎨 Perioden-Editor: Zeit je Wochentag"`

---

### Task 5: Verifikation

- [ ] Volle Suite: `docker compose up -d db && cd backend && ./mvnw test -s .mvn/local-settings.xml` → BUILD SUCCESS.
- [ ] `cd frontend && npm run build` → `✓ built`.
- [ ] Merge + Deploy (nach Freigabe; V49-Backfill gegen Prod).
- [ ] Prod-Rauchtest: Periode mit unterschiedlichen Zeiten anlegen → Trainings tragen je Wochentag die richtige Zeit.

## Self-Review-Notizen

- Spec-Abdeckung: Feld+Migration+Backfill (T1), Generierung+Validierung (T2), DTO/Controller (T3), UI (T4). Location bleibt generell (nicht angefasst) ✓.
- Prüfpunkte für Implementierer: exakte DTO-/Controller-Namen (Task 3 zuerst lesen); ob ein `TrainingPeriodMapperTest` schon existiert; ob `createBulk` in einem Bulk-Request oder Einzel-Flow genutzt wird; genauer Perioden-Editor-Dateiname (grep).
- `time`-Spalte + Request-Feld bleiben (Rückwärtskompat), werden aber von der Logik nicht mehr gelesen.
