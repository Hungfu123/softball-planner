# College-Series Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin holt per Knopfdruck Liga-Tabelle der College Series aus der externen
`strikeout-scoring.com`-API in den Softball-Planner; alle 16 Teams + Fremd-vs-Fremd-Ergebnisse
landen im bestehenden Modell, die berechnete Standings-Tabelle zeigt sie im eigenen Design.

**Architecture:** Onion. Neuer Outbound-Port `CollegeSeriesClient` (Domain) → HTTP-Adapter
`StrikeoutScoringClient` (RestClient, wie `OpenMeteoWeatherAdapter`). `CollegeSeriesImportService`
(Application) orchestriert + transaktional: Teams per `findOrCreateByName` upserten (Dead Sox per
externer ID `406716409` überspringen), Fremd-vs-Fremd-`Final`-Spiele per natürlichem Key
`(season, home, away, date)` als `LeagueResult` upserten. Reine Mapping-Logik in
`CollegeSeriesImportMapper`. Standings rechnet `StandingsCalculator` unverändert weiter.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring `RestClient`, JPA/Flyway (keine Migration
nötig), JUnit5 + Testcontainers (PostgreSQL); React 19 + TS, `api/client.ts`, `ConfirmModal`,
`useToast`.

**Spec:** `docs/superpowers/specs/2026-06-07-college-series-import-design.md`

**Konstanten (in Code):**
- Dead-Sox externe Team-ID: `406716409`
- Externe League-ID: `243398103`, Season-ID: `455890221` (über `application.properties`)
- Basis-URL: `https://api.strikeout-scoring.com/index.php`

---

## File Structure

**Erstellen:**
- `backend/.../domain/port/out/CollegeSeriesClient.java` — Port-Interface + Daten-Records
- `backend/.../application/CollegeSeriesImportMapper.java` — pure Mapping-/Filter-Logik
- `backend/.../application/CollegeSeriesImportService.java` — Orchestrierung + Transaktion
- `backend/.../application/CollegeSeriesImportResult.java` — Ergebnis-Zähler (Domain-nah)
- `backend/.../adapter/out/external/StrikeoutScoringClient.java` — HTTP-Adapter + API-Response-Records
- `backend/.../adapter/out/external/CollegeSeriesProperties.java` — `@ConfigurationProperties`
- `backend/.../adapter/dto/CollegeSeriesImportResponse.java` — REST-Response-Record
- `backend/.../adapter/in/web/CollegeSeriesImportController.java` — POST-Endpoint
- Tests: `CollegeSeriesImportMapperTest`, `StrikeoutScoringClientMappingTest`,
  `CollegeSeriesImportServiceTest`, `CollegeSeriesImportIntegrationTest`

**Modifizieren:**
- `backend/src/main/resources/application.properties` — `college-series.*` Properties
- `frontend/src/api/client.ts` — `importCollegeSeries()` + Response-Typ
- `frontend/src/components/dashboard/Standings.tsx` — Import-Knopf + ConfirmModal + Toast

> Package-Basis: `com.softball`. Quellpfad-Präfix:
> `backend/src/main/java/com/softball/`, Test-Präfix: `backend/src/test/java/com/softball/`.

---

## Task 1: Port-Interface + Daten-Records

Reine Definitionen (Interface + Records), kein Verhalten → kein eigener Test. Werden von Task 2/3/4
gebraucht.

**Files:**
- Create: `backend/src/main/java/com/softball/domain/port/out/CollegeSeriesClient.java`

- [ ] **Step 1: Port + Records anlegen**

```java
package com.softball.domain.port.out;

import java.util.List;

/**
 * Outbound-Port: holt rohe Liga-Daten einer externen Scoring-Plattform.
 * Implementierung im Adapter (adapter/out/external). Domain bleibt frei von HTTP.
 */
public interface CollegeSeriesClient {

    /** Holt Teams + Spielplan einer Liga/Season. Wirft bei Netzwerk-/Parse-Fehler. */
    CollegeSeriesData fetch();

    record CollegeSeriesData(List<ExternalTeam> teams, List<ExternalGame> games) {}

    record ExternalTeam(String externalId, String name) {}

    record ExternalGame(
        String externalId,
        String homeTeamId,
        String awayTeamId,
        String homeTeamName,
        String awayTeamName,
        Integer homeScore,
        Integer awayScore,
        String status,
        Long gameDateEpochSeconds
    ) {}
}
```

- [ ] **Step 2: Kompiliert?**

Run: `cd backend && ./mvnw -q -o compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS (kein neuer Code nutzt es noch — nur Compile).

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/domain/port/out/CollegeSeriesClient.java
git commit -m "✨ Port: CollegeSeriesClient + externe Daten-Records"
```

---

## Task 2: Mapping-/Filter-Logik (TDD, pure)

`CollegeSeriesImportMapper` kapselt: Dead-Sox-Erkennung, Epoch→LocalDate (Europe/Berlin),
importierbare Teams (ohne Dead Sox), Fremd-vs-Fremd-`Final`-Spiele. Keine Spring-Abhängigkeit.

**Files:**
- Create: `backend/src/main/java/com/softball/application/CollegeSeriesImportMapper.java`
- Test: `backend/src/test/java/com/softball/application/CollegeSeriesImportMapperTest.java`

- [ ] **Step 1: Failing test schreiben**

```java
package com.softball.application;

import com.softball.domain.port.out.CollegeSeriesClient.ExternalGame;
import com.softball.domain.port.out.CollegeSeriesClient.ExternalTeam;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CollegeSeriesImportMapperTest {

    private final CollegeSeriesImportMapper mapper = new CollegeSeriesImportMapper();

    private ExternalGame game(String id, String homeId, String awayId, String status,
                              Integer hs, Integer as, long epoch) {
        return new ExternalGame(id, homeId, awayId, "Home " + homeId, "Away " + awayId,
            hs, as, status, epoch);
    }

    @Test
    void epochToBerlinDate() {
        // 1777629600 = 2026-05-01 00:00 UTC -> 2026-05-01 in Europe/Berlin
        assertThat(mapper.toLocalDate(1777629600L)).isEqualTo(LocalDate.of(2026, 5, 1));
    }

    @Test
    void importableTeamsExcludesDeadSox() {
        List<ExternalTeam> teams = List.of(
            new ExternalTeam("994247751", "Aachen Aixplosives"),
            new ExternalTeam("406716409", "Düsseldorf Dead Sox"),
            new ExternalTeam("699936608", "Freiburg Warthogs"));

        List<ExternalTeam> result = mapper.importableTeams(teams);

        assertThat(result).extracting(ExternalTeam::name)
            .containsExactly("Aachen Aixplosives", "Freiburg Warthogs");
    }

    @Test
    void foreignFinalGamesOnly() {
        List<ExternalGame> games = List.of(
            game("g1", "994247751", "699936608", "Final", 5, 3, 1777629600L),   // foreign final -> keep
            game("g2", "406716409", "699936608", "Final", 4, 2, 1777629600L),   // Dead Sox home -> drop
            game("g3", "699936608", "406716409", "Final", 1, 9, 1777629600L),   // Dead Sox away -> drop
            game("g4", "994247751", "699936608", "Scheduled", null, null, 1777629600L)); // not final -> drop

        List<ExternalGame> result = mapper.foreignFinalGames(games);

        assertThat(result).extracting(ExternalGame::externalId).containsExactly("g1");
    }

    @Test
    void isDeadSoxByExternalId() {
        assertThat(mapper.isDeadSox("406716409")).isTrue();
        assertThat(mapper.isDeadSox("994247751")).isFalse();
        assertThat(mapper.isDeadSox(null)).isFalse();
    }
}
```

- [ ] **Step 2: Test ausführen, MUSS fehlschlagen**

Run: `cd backend && ./mvnw -q -o test -s .mvn/local-settings.xml -Dtest=CollegeSeriesImportMapperTest`
Expected: FAIL — `CollegeSeriesImportMapper` existiert nicht (Compile-Fehler).

- [ ] **Step 3: Minimale Implementierung**

```java
package com.softball.application;

import com.softball.domain.port.out.CollegeSeriesClient.ExternalGame;
import com.softball.domain.port.out.CollegeSeriesClient.ExternalTeam;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Component
public class CollegeSeriesImportMapper {

    static final String DEAD_SOX_EXTERNAL_ID = "406716409";
    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

    public boolean isDeadSox(final String externalTeamId) {
        return DEAD_SOX_EXTERNAL_ID.equals(externalTeamId);
    }

    public LocalDate toLocalDate(final long epochSeconds) {
        return Instant.ofEpochSecond(epochSeconds).atZone(BERLIN).toLocalDate();
    }

    public List<ExternalTeam> importableTeams(final List<ExternalTeam> teams) {
        return teams.stream()
            .filter(t -> !isDeadSox(t.externalId()))
            .toList();
    }

    public List<ExternalGame> foreignFinalGames(final List<ExternalGame> games) {
        return games.stream()
            .filter(g -> "Final".equalsIgnoreCase(g.status()))
            .filter(g -> !isDeadSox(g.homeTeamId()) && !isDeadSox(g.awayTeamId()))
            .filter(g -> g.homeScore() != null && g.awayScore() != null
                && g.gameDateEpochSeconds() != null)
            .toList();
    }
}
```

- [ ] **Step 4: Test ausführen, MUSS grün sein**

Run: `cd backend && ./mvnw -q -o test -s .mvn/local-settings.xml -Dtest=CollegeSeriesImportMapperTest`
Expected: PASS (4 Tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/CollegeSeriesImportMapper.java \
        backend/src/test/java/com/softball/application/CollegeSeriesImportMapperTest.java
git commit -m "✨ Mapper: College-Series Epoch/Dead-Sox-Filter/Fremd-Final-Games"
```

---

## Task 3: Config-Properties

Externe IDs + Basis-URL aus `application.properties`, nicht hartkodiert im Adapter.

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/external/CollegeSeriesProperties.java`
- Modify: `backend/src/main/resources/application.properties`

- [ ] **Step 1: Properties-Klasse anlegen**

```java
package com.softball.adapter.out.external;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "college-series")
public record CollegeSeriesProperties(
    String baseUrl,
    String leagueId,
    String seasonId
) {}
```

- [ ] **Step 2: Properties registrieren**

Finde die `@SpringBootApplication`-Klasse (z.B. `LineupPlannerApplication`) und ergänze die
Annotation `@ConfigurationPropertiesScan` (falls noch nicht vorhanden). Prüfe zuerst:

Run: `cd backend && grep -rn "ConfigurationPropertiesScan\|@SpringBootApplication" src/main/java`

Falls `@ConfigurationPropertiesScan` fehlt, neben `@SpringBootApplication` ergänzen:

```java
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
// ...
@SpringBootApplication
@ConfigurationPropertiesScan
public class LineupPlannerApplication { /* ... */ }
```

- [ ] **Step 3: Werte in `application.properties` ergänzen**

Am Ende von `backend/src/main/resources/application.properties` anhängen:

```properties
# College-Series Import (externe Liga-API strikeout-scoring.com)
college-series.base-url=${COLLEGE_SERIES_BASE_URL:https://api.strikeout-scoring.com/index.php}
college-series.league-id=${COLLEGE_SERIES_LEAGUE_ID:243398103}
college-series.season-id=${COLLEGE_SERIES_SEASON_ID:455890221}
```

- [ ] **Step 4: Kompiliert + startet?**

Run: `cd backend && ./mvnw -q -o compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/external/CollegeSeriesProperties.java \
        backend/src/main/resources/application.properties \
        backend/src/main/java/com/softball/*Application.java
git commit -m "🔧 Config: college-series.* Properties (URL/League/Season)"
```

---

## Task 4: HTTP-Adapter `StrikeoutScoringClient` (Mapping getestet)

Implementiert `CollegeSeriesClient` via `RestClient` (wie `OpenMeteoWeatherAdapter`). Die rohe
JSON-Struktur wird in package-private Response-Records deserialisiert; die Übersetzung in
`CollegeSeriesData` liegt in einer statischen, unit-testbaren Methode `toData(...)`.

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/out/external/StrikeoutScoringClient.java`
- Test: `backend/src/test/java/com/softball/adapter/out/external/StrikeoutScoringClientMappingTest.java`

- [ ] **Step 1: Failing test schreiben** (testet `toData`-Übersetzung der API-Shape)

```java
package com.softball.adapter.out.external;

import com.softball.adapter.out.external.StrikeoutScoringClient.ScheduleResponse;
import com.softball.adapter.out.external.StrikeoutScoringClient.Stage;
import com.softball.adapter.out.external.StrikeoutScoringClient.ScheduleGame;
import com.softball.adapter.out.external.StrikeoutScoringClient.TeamsResponse;
import com.softball.adapter.out.external.StrikeoutScoringClient.TeamEntry;
import com.softball.domain.port.out.CollegeSeriesClient.CollegeSeriesData;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StrikeoutScoringClientMappingTest {

    @Test
    void mapsTeamsAndGamesIntoData() {
        TeamsResponse teams = new TeamsResponse("College Series", List.of(
            new TeamEntry("994247751", "Aachen Aixplosives"),
            new TeamEntry("406716409", "Düsseldorf Dead Sox")));

        ScheduleResponse schedule = new ScheduleResponse(List.of(
            new Stage("Vorrunde", List.of(
                new ScheduleGame("463226334", "692783220", "747601448",
                    "UCE Travellers", "Mainz Sputniks", "14", "4", "Final", "1777629600"),
                // Score-Strings + tba: Score null bleibt null
                new ScheduleGame("999", "692783220", "747601448",
                    "UCE Travellers", "Mainz Sputniks", null, null, "Scheduled", null)))));

        CollegeSeriesData data = StrikeoutScoringClient.toData(teams, schedule);

        assertThat(data.teams()).extracting("externalId", "name")
            .containsExactly(
                org.assertj.core.groups.Tuple.tuple("994247751", "Aachen Aixplosives"),
                org.assertj.core.groups.Tuple.tuple("406716409", "Düsseldorf Dead Sox"));

        assertThat(data.games()).hasSize(2);
        var g = data.games().get(0);
        assertThat(g.externalId()).isEqualTo("463226334");
        assertThat(g.homeScore()).isEqualTo(14);
        assertThat(g.awayScore()).isEqualTo(4);
        assertThat(g.status()).isEqualTo("Final");
        assertThat(g.gameDateEpochSeconds()).isEqualTo(1777629600L);
        // tba-Game: Scores + Datum null
        assertThat(data.games().get(1).homeScore()).isNull();
        assertThat(data.games().get(1).gameDateEpochSeconds()).isNull();
    }
}
```

- [ ] **Step 2: Test ausführen, MUSS fehlschlagen**

Run: `cd backend && ./mvnw -q -o test -s .mvn/local-settings.xml -Dtest=StrikeoutScoringClientMappingTest`
Expected: FAIL — Klasse/Records existieren nicht.

- [ ] **Step 3: Adapter implementieren**

```java
package com.softball.adapter.out.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.softball.domain.port.out.CollegeSeriesClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

@Component
public class StrikeoutScoringClient implements CollegeSeriesClient {

    private static final Logger log = LoggerFactory.getLogger(StrikeoutScoringClient.class);

    private final RestClient client;
    private final CollegeSeriesProperties props;

    public StrikeoutScoringClient(final RestClient.Builder builder,
                                  final CollegeSeriesProperties props) {
        this.client = builder.build();
        this.props = props;
    }

    @Override
    public CollegeSeriesData fetch() {
        final String league = props.leagueId();
        final String season = props.seasonId();
        final TeamsResponse teams = client.get()
            .uri(props.baseUrl() + "/league/teams/{league}", league)
            .retrieve().body(TeamsResponse.class);
        final ScheduleResponse schedule = client.get()
            .uri(props.baseUrl() + "/schedule/league/{league}/{season}", league, season)
            .retrieve().body(ScheduleResponse.class);
        if (teams == null || schedule == null) {
            throw new IllegalStateException("Leere Antwort von strikeout-scoring API");
        }
        final CollegeSeriesData data = toData(teams, schedule);
        log.info("College-Series API: {} Teams, {} Spiele geholt",
            data.teams().size(), data.games().size());
        return data;
    }

    /** Übersetzt rohe API-Shapes in den domänenneutralen Port-Typ. Package-private für Test. */
    static CollegeSeriesData toData(final TeamsResponse teams, final ScheduleResponse schedule) {
        final List<ExternalTeam> teamList = new ArrayList<>();
        if (teams.teams() != null) {
            for (final TeamEntry t : teams.teams()) {
                teamList.add(new ExternalTeam(t.ID(), t.name()));
            }
        }
        final List<ExternalGame> gameList = new ArrayList<>();
        if (schedule.stages() != null) {
            for (final Stage stage : schedule.stages()) {
                if (stage.games() == null) continue;
                for (final ScheduleGame g : stage.games()) {
                    gameList.add(new ExternalGame(
                        g.ID(), g.homeTeamID(), g.awayTeamID(),
                        g.homeTeamName(), g.awayTeamName(),
                        parseIntOrNull(g.homeScore()), parseIntOrNull(g.awayScore()),
                        g.status(), parseLongOrNull(g.gameDate())));
                }
            }
        }
        return new CollegeSeriesData(teamList, gameList);
    }

    private static Integer parseIntOrNull(final String s) {
        if (s == null || s.isBlank()) return null;
        try { return Integer.valueOf(s); } catch (final NumberFormatException e) { return null; }
    }

    private static Long parseLongOrNull(final String s) {
        if (s == null || s.isBlank()) return null;
        try { return Long.valueOf(s); } catch (final NumberFormatException e) { return null; }
    }

    // --- rohe API-Response-Records (nur die genutzten Felder) ---

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TeamsResponse(String name, List<TeamEntry> teams) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TeamEntry(String ID, String name) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ScheduleResponse(List<Stage> stages) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Stage(String name, List<ScheduleGame> games) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ScheduleGame(
        String ID,
        String homeTeamID,
        String awayTeamID,
        String homeTeamName,
        String awayTeamName,
        String homeScore,
        String awayScore,
        String status,
        String gameDate
    ) {}
}
```

- [ ] **Step 4: Test ausführen, MUSS grün sein**

Run: `cd backend && ./mvnw -q -o test -s .mvn/local-settings.xml -Dtest=StrikeoutScoringClientMappingTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/external/StrikeoutScoringClient.java \
        backend/src/test/java/com/softball/adapter/out/external/StrikeoutScoringClientMappingTest.java
git commit -m "✨ Adapter: StrikeoutScoringClient (RestClient + JSON->CollegeSeriesData)"
```

---

## Task 5: Import-Service (Orchestrierung, Integration-Test)

`CollegeSeriesImportService` ruft den (im Test gestubbten) Client, mappt, upsertet Teams + Results
transaktional. Liefert `CollegeSeriesImportResult` mit Zählern.

**Files:**
- Create: `backend/src/main/java/com/softball/application/CollegeSeriesImportResult.java`
- Create: `backend/src/main/java/com/softball/application/CollegeSeriesImportService.java`
- Test: `backend/src/test/java/com/softball/integration/CollegeSeriesImportIntegrationTest.java`

- [ ] **Step 1: Ergebnis-Record anlegen**

```java
package com.softball.application;

public record CollegeSeriesImportResult(
    int teamsCreated,
    int teamsExisting,
    int resultsCreated,
    int resultsUpdated,
    int gamesSkipped
) {}
```

- [ ] **Step 2: Failing Integration-Test schreiben**

> Orientiere dich an einem bestehenden Integration-Test (z.B.
> `backend/src/test/java/com/softball/integration/LeagueResultIntegrationTest.java`) für
> Testcontainers-Setup, Basis-Klasse und Season-Anlage. Übernimm dessen `@SpringBootTest`-/
> Container-Annotationen wörtlich. Der Test stubbt `CollegeSeriesClient` als `@TestConfiguration`-
> Bean, damit kein echter HTTP-Call passiert.

```java
package com.softball.integration;

import com.softball.application.CollegeSeriesImportResult;
import com.softball.application.CollegeSeriesImportService;
import com.softball.application.SeasonService;
import com.softball.domain.model.LeagueResult;
import com.softball.domain.model.LeagueTeam;
import com.softball.domain.model.Season;
import com.softball.domain.port.out.CollegeSeriesClient;
import com.softball.domain.port.out.LeagueResultRepository;
import com.softball.domain.port.out.LeagueTeamRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.util.List;

import static com.softball.domain.port.out.CollegeSeriesClient.*;
import static org.assertj.core.api.Assertions.assertThat;

// NOTE: @SpringBootTest + Testcontainers-Basis vom bestehenden Integration-Test übernehmen.
@SpringBootTest
class CollegeSeriesImportIntegrationTest /* extends <BasisklasseMitContainer> */ {

    @TestConfiguration
    static class StubClientConfig {
        @Bean @Primary
        CollegeSeriesClient stubClient() {
            return () -> new CollegeSeriesData(
                List.of(
                    new ExternalTeam("994247751", "Aachen Aixplosives"),
                    new ExternalTeam("699936608", "Freiburg Warthogs"),
                    new ExternalTeam("406716409", "Düsseldorf Dead Sox")),
                List.of(
                    // Fremd-vs-Fremd Final -> LeagueResult
                    new ExternalGame("g1", "994247751", "699936608",
                        "Aachen Aixplosives", "Freiburg Warthogs", 5, 3, "Final", 1777629600L),
                    // Dead Sox beteiligt -> skip
                    new ExternalGame("g2", "406716409", "699936608",
                        "Düsseldorf Dead Sox", "Freiburg Warthogs", 4, 2, "Final", 1777629600L),
                    // nicht final -> skip
                    new ExternalGame("g3", "994247751", "699936608",
                        "Aachen Aixplosives", "Freiburg Warthogs", null, null, "Scheduled", 1777629600L)));
        }
    }

    @Autowired CollegeSeriesImportService service;
    @Autowired SeasonService seasonService;
    @Autowired LeagueTeamRepository leagueTeamRepository;
    @Autowired LeagueResultRepository leagueResultRepository;

    @Test
    void importsForeignTeamsAndFinalResultsSkippingDeadSox() {
        final Season season = seasonService.create("Test-Season", 2026);
        final Long seasonId = season.getId();

        final CollegeSeriesImportResult result = service.importForSeason(seasonId);

        // Dead Sox NICHT als Fremd-Team angelegt; ownTeam (von SeasonService autocreated) bleibt.
        final List<LeagueTeam> teams = leagueTeamRepository.findBySeasonIdOrderByNameAsc(seasonId);
        assertThat(teams).extracting(LeagueTeam::getName)
            .contains("Aachen Aixplosives", "Freiburg Warthogs")
            .doesNotContain("Düsseldorf Dead Sox");

        // Nur g1 als LeagueResult
        final List<LeagueResult> results = leagueResultRepository.findBySeasonIdOrderByDateAsc(seasonId);
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getHomeTeam().getName()).isEqualTo("Aachen Aixplosives");
        assertThat(results.get(0).getHomeScore()).isEqualTo(5);
        assertThat(results.get(0).getAwayScore()).isEqualTo(3);

        assertThat(result.resultsCreated()).isEqualTo(1);
        assertThat(result.gamesSkipped()).isEqualTo(2);
    }

    @Test
    void reimportIsIdempotentAndUpdatesScores() {
        final Season season = seasonService.create("Test-Season-2", 2026);
        final Long seasonId = season.getId();

        service.importForSeason(seasonId);
        final CollegeSeriesImportResult second = service.importForSeason(seasonId);

        // kein Duplikat
        assertThat(leagueResultRepository.findBySeasonIdOrderByDateAsc(seasonId)).hasSize(1);
        assertThat(second.resultsCreated()).isZero();
        assertThat(second.resultsUpdated()).isEqualTo(1);
        assertThat(second.teamsCreated()).isZero();
    }
}
```

- [ ] **Step 3: Test ausführen, MUSS fehlschlagen**

Run: `cd backend && ./mvnw -q -o test -s .mvn/local-settings.xml -Dtest=CollegeSeriesImportIntegrationTest`
Expected: FAIL — `CollegeSeriesImportService.importForSeason` existiert nicht.

- [ ] **Step 4: Service implementieren**

```java
package com.softball.application;

import com.softball.domain.model.LeagueResult;
import com.softball.domain.model.LeagueTeam;
import com.softball.domain.model.Season;
import com.softball.domain.port.out.CollegeSeriesClient;
import com.softball.domain.port.out.CollegeSeriesClient.CollegeSeriesData;
import com.softball.domain.port.out.CollegeSeriesClient.ExternalGame;
import com.softball.domain.port.out.CollegeSeriesClient.ExternalTeam;
import com.softball.domain.port.out.LeagueResultRepository;
import com.softball.shared.exception.BusinessValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class CollegeSeriesImportService {

    private static final Logger log = LoggerFactory.getLogger(CollegeSeriesImportService.class);

    private final CollegeSeriesClient client;
    private final CollegeSeriesImportMapper mapper;
    private final SeasonService seasonService;
    private final LeagueTeamService leagueTeamService;
    private final LeagueResultRepository leagueResultRepository;

    public CollegeSeriesImportService(final CollegeSeriesClient client,
                                      final CollegeSeriesImportMapper mapper,
                                      final SeasonService seasonService,
                                      final LeagueTeamService leagueTeamService,
                                      final LeagueResultRepository leagueResultRepository) {
        this.client = client;
        this.mapper = mapper;
        this.seasonService = seasonService;
        this.leagueTeamService = leagueTeamService;
        this.leagueResultRepository = leagueResultRepository;
    }

    @Transactional
    public CollegeSeriesImportResult importForSeason(final Long seasonId) {
        final Season season = seasonService.findById(seasonId);

        final CollegeSeriesData data;
        try {
            data = client.fetch();
        } catch (final Exception e) {
            log.warn("College-Series Import fehlgeschlagen: {}", e.getMessage());
            throw new BusinessValidationException(
                "College-Series-Daten konnten nicht geladen werden: " + e.getMessage());
        }

        int teamsCreated = 0, teamsExisting = 0;
        for (final ExternalTeam t : mapper.importableTeams(data.teams())) {
            final boolean existedBefore = leagueTeamService.findBySeasonId(seasonId).stream()
                .anyMatch(lt -> lt.getName().equalsIgnoreCase(t.name()));
            leagueTeamService.findOrCreateByName(seasonId, t.name());
            if (existedBefore) { teamsExisting++; } else { teamsCreated++; }
        }

        final List<LeagueResult> existing = leagueResultRepository.findBySeasonIdOrderByDateAsc(seasonId);
        int resultsCreated = 0, resultsUpdated = 0;
        final List<ExternalGame> finals = mapper.foreignFinalGames(data.games());
        for (final ExternalGame g : finals) {
            final LeagueTeam home = leagueTeamService.findOrCreateByName(seasonId, g.homeTeamName());
            final LeagueTeam away = leagueTeamService.findOrCreateByName(seasonId, g.awayTeamName());
            final LocalDate date = mapper.toLocalDate(g.gameDateEpochSeconds());

            final LeagueResult match = existing.stream()
                .filter(r -> r.getHomeTeam().getId().equals(home.getId())
                    && r.getAwayTeam().getId().equals(away.getId())
                    && date.equals(r.getDate()))
                .findFirst().orElse(null);

            if (match != null) {
                match.setHomeScore(g.homeScore());
                match.setAwayScore(g.awayScore());
                leagueResultRepository.save(match);
                resultsUpdated++;
            } else {
                leagueResultRepository.save(
                    new LeagueResult(season, home, away, g.homeScore(), g.awayScore(), date));
                resultsCreated++;
            }
        }

        final int skipped = data.games().size() - finals.size();
        log.info("College-Series Import Saison {}: Teams +{}/={}, Results +{}/~{}, übersprungen {}",
            seasonId, teamsCreated, teamsExisting, resultsCreated, resultsUpdated, skipped);
        return new CollegeSeriesImportResult(teamsCreated, teamsExisting,
            resultsCreated, resultsUpdated, skipped);
    }
}
```

- [ ] **Step 5: Test ausführen, MUSS grün sein** (Docker muss laufen)

Run: `cd backend && docker compose -f ../docker-compose.yml up -d db && ./mvnw -q -o test -s .mvn/local-settings.xml -Dtest=CollegeSeriesImportIntegrationTest`
Expected: PASS (2 Tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/application/CollegeSeriesImportService.java \
        backend/src/main/java/com/softball/application/CollegeSeriesImportResult.java \
        backend/src/test/java/com/softball/integration/CollegeSeriesImportIntegrationTest.java
git commit -m "✨ Service: CollegeSeriesImportService (Teams+Fremd-Final upsert, idempotent)"
```

---

## Task 6: REST-Endpoint

`POST /api/seasons/{seasonId}/import/college-series` → triggert Import, gibt Zähler zurück.

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/CollegeSeriesImportResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/in/web/CollegeSeriesImportController.java`

- [ ] **Step 1: Response-DTO anlegen**

```java
package com.softball.adapter.dto;

import com.softball.application.CollegeSeriesImportResult;

public record CollegeSeriesImportResponse(
    int teamsCreated,
    int teamsExisting,
    int resultsCreated,
    int resultsUpdated,
    int gamesSkipped
) {
    public static CollegeSeriesImportResponse from(final CollegeSeriesImportResult r) {
        return new CollegeSeriesImportResponse(r.teamsCreated(), r.teamsExisting(),
            r.resultsCreated(), r.resultsUpdated(), r.gamesSkipped());
    }
}
```

- [ ] **Step 2: Controller anlegen**

```java
package com.softball.adapter.in.web;

import com.softball.adapter.dto.CollegeSeriesImportResponse;
import com.softball.application.CollegeSeriesImportService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CollegeSeriesImportController {

    private final CollegeSeriesImportService importService;

    public CollegeSeriesImportController(final CollegeSeriesImportService importService) {
        this.importService = importService;
    }

    @PostMapping("/seasons/{seasonId}/import/college-series")
    public CollegeSeriesImportResponse importCollegeSeries(@PathVariable final Long seasonId) {
        return CollegeSeriesImportResponse.from(importService.importForSeason(seasonId));
    }
}
```

- [ ] **Step 3: Voller Backend-Build + Tests**

Run: `cd backend && ./mvnw -q -o test -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS, alle Tests grün.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/CollegeSeriesImportResponse.java \
        backend/src/main/java/com/softball/adapter/in/web/CollegeSeriesImportController.java
git commit -m "✨ Endpoint: POST /api/seasons/{id}/import/college-series"
```

---

## Task 7: Frontend — Import-Knopf in Standings

> **Visuelle Umsetzung mit der `frontend-design`-Skill verfeinern.** Diese Aufgabe verdrahtet die
> Funktion (API-Call, ConfirmModal, Toast, Reload) im bestehenden `Standings.tsx`. Navy-Theme,
> custom-Icons, Modal statt confirm(), deutsche Texte — bestehende Konventionen.

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/components/dashboard/Standings.tsx`

- [ ] **Step 1: API-Methode + Typ in `client.ts`**

Am Ende der Datei (bei den übrigen `export function`-Calls) ergänzen:

```typescript
export interface CollegeSeriesImportResult {
  teamsCreated: number
  teamsExisting: number
  resultsCreated: number
  resultsUpdated: number
  gamesSkipped: number
}

export function importCollegeSeries(seasonId: number): Promise<CollegeSeriesImportResult> {
  return request<CollegeSeriesImportResult>(`/seasons/${seasonId}/import/college-series`, {
    method: 'POST',
  })
}
```

- [ ] **Step 2: Knopf + State in `Standings.tsx`**

Im Komponenten-Body (zu den anderen `useState`-Hooks) ergänzen:

```tsx
const [importing, setImporting] = useState(false)
const [confirmImport, setConfirmImport] = useState(false)
const toast = useToast()  // falls noch nicht vorhanden; sonst bestehende toast-Instanz nutzen
```

> Prüfe, ob `Standings.tsx` bereits Zugriff auf Toasts hat (Prop oder `useToast`-Import). Falls
> ein Toast-Context per Prop reinkommt, den verwenden statt neuer Instanz.

Import-Handler ergänzen:

```tsx
const handleImport = async () => {
  setConfirmImport(false)
  setImporting(true)
  try {
    const r = await api.importCollegeSeries(seasonId)
    toast.show(
      `Import OK: ${r.teamsCreated} neue Teams, ${r.resultsCreated} neue + ${r.resultsUpdated} aktualisierte Ergebnisse`,
      'success',
    )
    reloadAll()
    onGameDaysChanged()
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Import fehlgeschlagen', 'error')
  } finally {
    setImporting(false)
  }
}
```

- [ ] **Step 3: Knopf + ConfirmModal im JSX**

In der Kopfzeile der Standings-Sektion (neben „Team hinzufügen") einen Sekundär-Button im
Navy-Hover-Stil ergänzen:

```tsx
<button
  type="button"
  onClick={() => setConfirmImport(true)}
  disabled={importing}
  className="rounded-lg border border-navy-800 px-3 py-1.5 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-800 hover:text-white disabled:opacity-50"
>
  {importing ? 'Importiere…' : 'College Series importieren'}
</button>
```

ConfirmModal (bei den anderen Modals am Ende des Returns):

```tsx
{confirmImport && (
  <ConfirmModal
    title="College Series importieren"
    message="Holt alle Teams und Fremd-Ergebnisse aus college-series.de. Bestehende importierte Ergebnisse werden mit den aktuellen Werten aktualisiert. Eigene Dead-Sox-Spiele bleiben unberührt."
    confirmLabel="Importieren"
    onConfirm={handleImport}
    onCancel={() => setConfirmImport(false)}
  />
)}
```

> Prüfe die genauen Props von `ConfirmModal` in `frontend/src/components/shared/ConfirmModal.tsx`
> und passe `confirmLabel`/`title`/`message`-Namen an die tatsächliche Signatur an.

- [ ] **Step 4: Build + Lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: tsc + vite build ohne Fehler, ESLint clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/components/dashboard/Standings.tsx
git commit -m "✨ Standings: College-Series Import-Knopf (Modal + Toast)"
```

---

## Task 8: Manuelle End-to-End-Verifikation

- [ ] **Step 1: Lokal starten**

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml &
cd frontend && npx vite &
```

- [ ] **Step 2: Import auslösen + prüfen**

- Standings-Seite einer Season öffnen → „College Series importieren" → bestätigen.
- Erwartung: Toast mit Zählern; Tabelle zeigt danach die College-Series-Teams (volle Namen),
  Fremd-Ergebnisse fließen in W/L/RS/RA der berechneten Tabelle ein; Dead Sox erscheint **nicht**
  doppelt; eigene `Game`-basierte Dead-Sox-Bilanz unverändert.
- Zweiter Import-Klick → keine Duplikate, Toast meldet „0 neue".

- [ ] **Step 3: Optionaler Live-API-Smoke (read-only)**

```bash
curl 'https://api.strikeout-scoring.com/index.php/league/teams/243398103' | head -c 300
```
Bestätigt, dass die externe API erreichbar ist und das erwartete JSON liefert.

---

## Hinweise zur Architektur-Konformität (Review-Checkliste)

- `domain/port/out/CollegeSeriesClient` kennt **kein** Spring/HTTP — nur Records + Interface. ✓
- HTTP-Implementierung liegt im **Adapter** (`adapter/out/external`), gibt domänenneutrale Typen
  zurück. ✓
- `application`-Service hängt nur an Domain-Port + bestehenden Application-Services. ✓
- Keine Schema-Änderung (kein Flyway) — rein additiv. ✓
- `StandingsCalculator`-Regel „ownTeam nie in `LeagueResult`" bleibt: Dead-Sox-Spiele werden
  gefiltert, Dead-Sox-Team nicht als Fremd-Team angelegt. ✓
- SRP: Mapping (Mapper) / Orchestrierung (Service) / HTTP (Adapter) getrennt. ✓
