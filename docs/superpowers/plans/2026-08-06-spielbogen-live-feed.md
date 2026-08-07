# Spielbogen Live-Feed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das RFL-Gitter im Spielbogen-Drawer durch einen Live-Feed ersetzen (Scoreboard + Linescore + Play-by-Play) und denselben Feed über einen token-geschützten öffentlichen Link für Zuschauer erreichbar machen.

**Architecture:** Eine präsentationale React-Komponente `BogenLiveFeed` wird von zwei Stellen befüllt — in-app aus `BogenSheetResponse`, öffentlich aus einem reduzierten `PublicBogenFeedResponse`. Backend-seitig kommen Team-Totals (R/H/E) aus `BogenScoreCalculator` dazu sowie ein zufälliger Token pro Spielbogen für den öffentlichen Lesezugriff. Das Gitter-Rendering bleibt ausschließlich im PDF-Export.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway, PostgreSQL 17 (Testcontainers), React 19, TypeScript, Vite 7, Tailwind v4, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-31-spielbogen-live-feed-design.md`
**Mockup:** `docs/superpowers/specs/2026-07-31-spielbogen-live-feed-mockup.html`

## Global Constraints

- Maven immer mit `-s .mvn/local-settings.xml` aufrufen. `~/.m2/settings.xml` NICHT anfassen.
- Backend-Tests brauchen einen laufenden Docker-Daemon (Testcontainers).
- Onion-Architektur: `domain` kennt weder Spring-Web, JPA noch DTOs. `application` hängt nur an `domain`. Ports in `domain/port/out/`, Adapter in `adapter/out/persistence/adapter/`.
- Schema-Änderungen ausschließlich als neue `V{n}__*.sql` unter `backend/src/main/resources/db/migration/`. Höchste vorhandene Version ist `V54` → diese Arbeit nutzt `V55`.
- Deutsche UI-Texte, deutsche Fehlermeldungen.
- Tailwind v4: Utility-Klassen wie `lg:grid-cols-3`, keine Arbitrary-Bracket-Syntax.
- Keine Icon-Bibliothek — eigene SVGs aus `@/icons`.
- Farben ausschließlich aus den Tokens in `frontend/src/styles/index.css`. Keine neuen Farbwerte.
- Commits: Conventional Commits mit Gitmoji-Präfix. **Keine `Co-Authored-By`-Zeilen.**
- Frontend-Pfad-Alias `@/` → `frontend/src/`.
- `BusinessValidationException` → 400, `ResourceNotFoundException` → 404.

## File Structure

**Backend — neu**

| Datei | Verantwortung |
|---|---|
| `backend/src/main/resources/db/migration/V55__spielbogen_public_token.sql` | Spalte `public_token` + Unique-Index |
| `backend/src/main/java/com/softball/application/SpielbogenShareService.java` | Token erzeugen / zurückziehen / auflösen |
| `backend/src/main/java/com/softball/adapter/in/web/PublicBogenController.java` | `/api/public/bogen/{token}`, ohne Auth |
| `backend/src/main/java/com/softball/adapter/dto/PublicBogenFeedResponse.java` | reduziertes DTO für Zuschauer |
| `backend/src/main/java/com/softball/adapter/dto/ShareLinkResponse.java` | `{token}` |
| `backend/src/test/java/com/softball/domain/service/BogenScoreCalculatorTest.java` | reine Unit-Tests der Rechnung |
| `backend/src/test/java/com/softball/integration/PublicBogenFeedTest.java` | Auth-Verhalten des öffentlichen Endpoints |

**Backend — geändert**

| Datei | Änderung |
|---|---|
| `domain/service/BogenScoreCalculator.java` | Steal-Runs in `calculateInningRuns`, neue `calculateTeamTotals` |
| `domain/model/Spielbogen.java` | Feld `publicToken` |
| `domain/port/out/SpielbogenRepository.java` | `findByPublicToken` |
| `adapter/out/persistence/entity/SpielbogenEntity.java` | Spalte `public_token` |
| `adapter/out/persistence/mapper/SpielbogenMapper.java` | Feld mappen |
| `adapter/out/persistence/repository/SpringSpielbogenRepository.java` | `findByPublicToken` |
| `adapter/out/persistence/adapter/SpielbogenRepositoryAdapter.java` | Methode durchreichen |
| `application/SpielbogenSheetService.java` | `SheetData` um Totals erweitern |
| `adapter/dto/BogenSheetResponse.java` | `homeTotals` / `awayTotals` |
| `adapter/in/web/SpielbogenController.java` | Mapping + Share-Endpoints |
| `shared/config/SecurityConfig.java` | `/api/public/**` freigeben |

**Frontend — neu**

| Datei | Verantwortung |
|---|---|
| `frontend/src/utils/bogenFeed.ts` | reine Funktionen: Ereignisse zu Feed-Zeilen, Gruppierung, Sortierung |
| `frontend/src/utils/bogenFeed.test.ts` | Tests dazu |
| `frontend/src/components/spielbogen/BogenLiveFeed.tsx` | Scoreboard + Linescore + Play-by-Play |
| `frontend/src/components/spielbogen/BogenLiveFeed.test.tsx` | Rendering-Tests |
| `frontend/src/components/spielbogen/BogenLineupAccordion.tsx` | eingeklappte Aufstellung, optional mit Stift |
| `frontend/src/components/spielbogen/ShareLinkModal.tsx` | Link erzeugen, kopieren, zurückziehen |
| `frontend/src/components/public/PublicBogenPage.tsx` | öffentliche Seite unter `/live/:token` |

**Frontend — geändert**

| Datei | Änderung |
|---|---|
| `components/shared/ResponsiveSheet.tsx` | `overflow-hidden` an beiden Containern |
| `components/spielbogen/RflSheetDrawer.tsx` | → `BogenSheetDrawer.tsx`, Gitter raus, Feed rein |
| `components/spielbogen/SpielbogenPage.tsx` | Import + Verwendung anpassen |
| `api/client.ts` | Share-Funktionen + auth-freier Pfad |
| `types/index.ts` | Totals, `PublicBogenFeed`, Share-Typen |
| `App.tsx` | Route `/live/:token` außerhalb `Layout` |

---

### Task 1: Steal-Runs in der Inning-Rechnung

`calculateInningRuns` summiert heute nur `runsScored` der At-Bats. Ein Runner, der per Steal/Wild Pitch/Passed Ball nach Hause kommt, erhöht `bogen.homeRuns`/`awayRuns` (`SpielbogenScoringService.java:228-230`), fehlt aber in `inningRuns`. Die Linescore würde das sichtbar machen: die Inning-Zellen summierten sich nicht auf den Endstand.

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/service/BogenScoreCalculator.java`
- Test: `backend/src/test/java/com/softball/domain/service/BogenScoreCalculatorTest.java` (neu)

**Interfaces:**
- Consumes: `SpielbogenAtBat`, `SpielbogenStealingEvent`, `BogenSide`, `StealingEventType` aus `domain.model`
- Produces: `calculateInningRuns(List<SpielbogenAtBat>, List<SpielbogenStealingEvent>)` → `Map<Integer, InningRuns>`. **Die alte Ein-Parameter-Signatur entfällt.** `InningRuns` bleibt unverändert (`getHome()`, `getAway()`).

- [ ] **Step 1: Write the failing test**

Neue Datei `backend/src/test/java/com/softball/domain/service/BogenScoreCalculatorTest.java`:

```java
package com.softball.domain.service;

import com.softball.domain.model.*;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BogenScoreCalculatorTest {

    private final BogenScoreCalculator calc = new BogenScoreCalculator();

    private SpielbogenAtBat atBat(BogenSide side, int inning, AtBatResult result, int runs) {
        SpielbogenAtBat ab = new SpielbogenAtBat();
        ab.setSide(side);
        ab.setInning(inning);
        ab.setResult(result);
        ab.setRunsScored(runs);
        return ab;
    }

    private SpielbogenStealingEvent steal(BogenSide side, int inning, StealingEventType type, int toBase) {
        SpielbogenStealingEvent e = new SpielbogenStealingEvent();
        e.setSide(side);
        e.setInning(inning);
        e.setType(type);
        e.setToBase(toBase);
        return e;
    }

    @Test
    void inningRunsCountAtBatRuns() {
        var runs = calc.calculateInningRuns(
            List.of(atBat(BogenSide.HOME, 2, AtBatResult.SINGLE, 2)),
            List.of()
        );

        assertThat(runs.get(2).getHome()).isEqualTo(2);
        assertThat(runs.get(2).getAway()).isZero();
    }

    @Test
    void inningRunsIncludeStealsThatReachHome() {
        var runs = calc.calculateInningRuns(
            List.of(),
            List.of(steal(BogenSide.AWAY, 3, StealingEventType.STOLEN_BASE, 4))
        );

        assertThat(runs.get(3).getAway()).isEqualTo(1);
    }

    @Test
    void inningRunsIgnoreStealsThatDoNotReachHome() {
        var runs = calc.calculateInningRuns(
            List.of(),
            List.of(steal(BogenSide.HOME, 1, StealingEventType.STOLEN_BASE, 2))
        );

        assertThat(runs).isEmpty();
    }

    @Test
    void caughtStealingAtHomeScoresNothing() {
        var runs = calc.calculateInningRuns(
            List.of(),
            List.of(steal(BogenSide.HOME, 1, StealingEventType.CAUGHT_STEALING, 4),
                    steal(BogenSide.HOME, 1, StealingEventType.OUT_ON_PLAY, 4))
        );

        assertThat(runs).isEmpty();
    }

    @Test
    void wildPitchAndPassedBallToHomeScore() {
        var runs = calc.calculateInningRuns(
            List.of(),
            List.of(steal(BogenSide.HOME, 4, StealingEventType.WILD_PITCH, 4),
                    steal(BogenSide.HOME, 4, StealingEventType.PASSED_BALL, 4))
        );

        assertThat(runs.get(4).getHome()).isEqualTo(2);
    }

    @Test
    void atBatAndStealRunsAddUpInSameInning() {
        var runs = calc.calculateInningRuns(
            List.of(atBat(BogenSide.HOME, 5, AtBatResult.DOUBLE, 1)),
            List.of(steal(BogenSide.HOME, 5, StealingEventType.STOLEN_BASE, 4))
        );

        assertThat(runs.get(5).getHome()).isEqualTo(2);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BogenScoreCalculatorTest
```

Erwartung: Kompilierfehler — `calculateInningRuns` nimmt aktuell nur einen Parameter.

- [ ] **Step 3: Write minimal implementation**

`BogenScoreCalculator.java` — Signatur erweitern und Steals einrechnen:

```java
package com.softball.domain.service;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenAtBat;
import com.softball.domain.model.SpielbogenStealingEvent;
import com.softball.domain.model.StealingEventType;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BogenScoreCalculator {

    /** Home Plate. Ein Runner, der hier ankommt, hat einen Run erzielt. */
    private static final int HOME_PLATE = 4;

    public Map<Integer, InningRuns> calculateInningRuns(final List<SpielbogenAtBat> atBats,
                                                        final List<SpielbogenStealingEvent> stealings) {
        Map<Integer, InningRuns> result = new HashMap<>();

        for (SpielbogenAtBat ab : atBats) {
            if (ab.getRunsScored() == null || ab.getRunsScored() == 0) continue;
            addRuns(result, ab.getInning(), ab.getSide(), ab.getRunsScored());
        }

        for (SpielbogenStealingEvent st : stealings) {
            if (!stealingScoresRun(st)) continue;
            addRuns(result, st.getInning(), st.getSide(), 1);
        }

        return result;
    }

    /**
     * Nur ein erfolgreiches Vorrücken auf die Home Plate erzielt einen Run.
     * CAUGHT_STEALING und OUT_ON_PLAY sind Outs, auch wenn toBase 4 ist.
     */
    private boolean stealingScoresRun(final SpielbogenStealingEvent st) {
        if (st.getToBase() == null || st.getToBase() != HOME_PLATE) return false;
        StealingEventType type = st.getType();
        return type == StealingEventType.STOLEN_BASE
            || type == StealingEventType.WILD_PITCH
            || type == StealingEventType.PASSED_BALL;
    }

    private void addRuns(final Map<Integer, InningRuns> target, final Integer inning,
                         final BogenSide side, final int runs) {
        InningRuns existing = target.computeIfAbsent(inning, k -> new InningRuns(0, 0));
        if (side == BogenSide.HOME) {
            existing.home += runs;
        } else {
            existing.away += runs;
        }
    }

    public static class InningRuns {
        public int home;
        public int away;

        public InningRuns(int home, int away) {
            this.home = home;
            this.away = away;
        }

        public int getHome() { return home; }
        public int getAway() { return away; }
    }
}
```

`SpielbogenSheetService.getSheet` ruft die Methode auf — Aufruf anpassen, sonst kompiliert nichts:

```java
            scoreCalc.calculateInningRuns(allAtBats, scoringService.findStealingEvents(bogenId))
```

Da `findStealingEvents(bogenId)` im selben Konstruktoraufruf schon einmal vorkommt, vorher in eine lokale Variable ziehen:

```java
        var stealings = scoringService.findStealingEvents(bogenId);

        return new SheetData(
            bogen,
            lineup.home(),
            lineup.away(),
            homeAtBats,
            awayAtBats,
            stealings,
            scoringService.findSubstitutions(bogenId),
            scoringService.findPositionChanges(bogenId),
            scoringService.findRunnerAdvances(bogenId),
            scoreCalc.calculateInningRuns(allAtBats, stealings)
        );
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BogenScoreCalculatorTest
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringScenarioTest
```

Erwartung: beide PASS. `SpielbogenScoringScenarioTest` prüft `inningRuns` über die API und darf nicht brechen.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/BogenScoreCalculator.java \
        backend/src/main/java/com/softball/application/SpielbogenSheetService.java \
        backend/src/test/java/com/softball/domain/service/BogenScoreCalculatorTest.java
git commit -m "🐛 Linescore: Steal-Runs fehlten in der Inning-Rechnung

Ein Runner, der per SB/WP/PB nach Hause kommt, erhöht bogen.homeRuns,
tauchte in inningRuns aber nicht auf. Fiel bisher nicht auf, weil das
Gitter keine Inning-Summen zeigt — die Linescore würde es zeigen."
```

---

### Task 2: Team-Totals R/H/E

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/service/BogenScoreCalculator.java`
- Test: `backend/src/test/java/com/softball/domain/service/BogenScoreCalculatorTest.java`

**Interfaces:**
- Produces: `calculateTeamTotals(List<SpielbogenAtBat> atBats, List<SpielbogenStealingEvent> stealings, BogenSide side)` → `TeamTotals`. `TeamTotals` ist ein `record TeamTotals(int runs, int hits, int errors)` als statische Nested-Klasse in `BogenScoreCalculator`.

**Achtung — Seitenwechsel bei Errors:** `isError` steht am At-Bat der *schlagenden* Mannschaft, der Fehler gehört aber der *feldenden*. Ein At-Bat mit `side=AWAY, isError=true` zählt auf die Errors von HOME.

- [ ] **Step 1: Write the failing test**

An `BogenScoreCalculatorTest` anhängen:

```java
    private SpielbogenAtBat errorAtBat(BogenSide battingSide, int inning) {
        SpielbogenAtBat ab = atBat(battingSide, inning, AtBatResult.REACHED_ON_ERROR, 0);
        ab.setIsError(true);
        ab.setErrorPosition(5);
        return ab;
    }

    @Test
    void hitsCountOnlyHits() {
        var atBats = List.of(
            atBat(BogenSide.HOME, 1, AtBatResult.SINGLE, 0),
            atBat(BogenSide.HOME, 1, AtBatResult.DOUBLE, 0),
            atBat(BogenSide.HOME, 1, AtBatResult.TRIPLE, 0),
            atBat(BogenSide.HOME, 2, AtBatResult.HOMERUN, 1),
            atBat(BogenSide.HOME, 2, AtBatResult.INSIDE_PARK_HR, 1),
            atBat(BogenSide.HOME, 2, AtBatResult.WALK, 0),
            atBat(BogenSide.HOME, 2, AtBatResult.HIT_BY_PITCH, 0),
            atBat(BogenSide.HOME, 3, AtBatResult.STRIKEOUT, 0),
            atBat(BogenSide.HOME, 3, AtBatResult.OUT, 0),
            atBat(BogenSide.HOME, 3, AtBatResult.REACHED_ON_ERROR, 0)
        );

        var totals = calc.calculateTeamTotals(atBats, List.of(), BogenSide.HOME);

        assertThat(totals.hits()).isEqualTo(5);
    }

    @Test
    void errorsAreChargedToTheFieldingTeam() {
        var atBats = List.of(errorAtBat(BogenSide.AWAY, 2));

        var home = calc.calculateTeamTotals(atBats, List.of(), BogenSide.HOME);
        var away = calc.calculateTeamTotals(atBats, List.of(), BogenSide.AWAY);

        assertThat(home.errors()).as("AWAY schlägt, HOME feldet den Fehler").isEqualTo(1);
        assertThat(away.errors()).isZero();
    }

    @Test
    void totalsRunsIncludeStealRuns() {
        var totals = calc.calculateTeamTotals(
            List.of(atBat(BogenSide.HOME, 1, AtBatResult.SINGLE, 2)),
            List.of(steal(BogenSide.HOME, 3, StealingEventType.STOLEN_BASE, 4)),
            BogenSide.HOME
        );

        assertThat(totals.runs()).isEqualTo(3);
    }

    @Test
    void totalsIgnoreTheOtherSide() {
        var atBats = List.of(
            atBat(BogenSide.HOME, 1, AtBatResult.SINGLE, 1),
            atBat(BogenSide.AWAY, 1, AtBatResult.DOUBLE, 2)
        );

        var totals = calc.calculateTeamTotals(atBats, List.of(), BogenSide.HOME);

        assertThat(totals.runs()).isEqualTo(1);
        assertThat(totals.hits()).isEqualTo(1);
    }

    @Test
    void emptyGameHasZeroTotals() {
        var totals = calc.calculateTeamTotals(List.of(), List.of(), BogenSide.AWAY);

        assertThat(totals.runs()).isZero();
        assertThat(totals.hits()).isZero();
        assertThat(totals.errors()).isZero();
    }
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BogenScoreCalculatorTest
```

Erwartung: Kompilierfehler — `calculateTeamTotals` existiert nicht.

- [ ] **Step 3: Write minimal implementation**

In `BogenScoreCalculator` ergänzen:

```java
    public TeamTotals calculateTeamTotals(final List<SpielbogenAtBat> atBats,
                                          final List<SpielbogenStealingEvent> stealings,
                                          final BogenSide side) {
        int runs = 0;
        int hits = 0;
        int errors = 0;

        for (SpielbogenAtBat ab : atBats) {
            if (ab.getSide() == side) {
                if (ab.getRunsScored() != null) runs += ab.getRunsScored();
                if (ab.getResult() != null && ab.getResult().isHit()) hits++;
            } else if (Boolean.TRUE.equals(ab.getIsError())) {
                // Fehler entsteht beim At-Bat der Gegenseite und wird der feldenden Mannschaft angelastet.
                errors++;
            }
        }

        for (SpielbogenStealingEvent st : stealings) {
            if (st.getSide() == side && stealingScoresRun(st)) runs++;
        }

        return new TeamTotals(runs, hits, errors);
    }

    public record TeamTotals(int runs, int hits, int errors) {}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BogenScoreCalculatorTest
```

Erwartung: PASS, alle 11 Tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/BogenScoreCalculator.java \
        backend/src/test/java/com/softball/domain/service/BogenScoreCalculatorTest.java
git commit -m "✨ BogenScoreCalculator: Team-Totals R/H/E

Errors werden der feldenden Mannschaft angelastet, nicht der
schlagenden, an deren At-Bat isError hängt."
```

---

### Task 3: Totals durch Service, DTO und Controller reichen

**Files:**
- Modify: `backend/src/main/java/com/softball/application/SpielbogenSheetService.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/BogenSheetResponse.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java:257-292`
- Modify: `frontend/src/types/index.ts:702`
- Test: `backend/src/test/java/com/softball/integration/SpielbogenScoringScenarioTest.java`

**Interfaces:**
- Consumes: `BogenScoreCalculator.TeamTotals` aus Task 2
- Produces: JSON-Feld `homeTotals` / `awayTotals`, je `{runs, hits, errors}`. TypeScript: `BogenTeamTotals` in `types/index.ts`.

- [ ] **Step 1: Write the failing test**

In `SpielbogenScoringScenarioTest` (dort wird `inningRuns` bereits über die API geprüft, Zeile 132) einen Test ergänzen. Den vorhandenen Testaufbau der Klasse übernehmen — der Test hängt sich an denselben durchgespielten Spielverlauf:

```java
    @Test
    void sheetLiefertTeamTotals() throws Exception {
        // Nutzt denselben Aufbau wie die übrigen Tests dieser Klasse:
        // Spielbogen anlegen, Lineup setzen, starten, At-Bats aufnehmen.
        var finalSheet = spieleVollesSpielUndHoleSheet();

        var home = finalSheet.get("homeTotals");
        var away = finalSheet.get("awayTotals");

        assertThat(home).isNotNull();
        assertThat(away).isNotNull();
        assertThat(home.get("runs").asInt())
            .isEqualTo(finalSheet.get("meta").get("homeRuns").asInt());
        assertThat(away.get("runs").asInt())
            .isEqualTo(finalSheet.get("meta").get("awayRuns").asInt());
        assertThat(home.get("hits").asInt()).isGreaterThanOrEqualTo(0);
        assertThat(home.get("errors").asInt()).isGreaterThanOrEqualTo(0);
    }
```

Falls die Klasse keine Hilfsmethode `spieleVollesSpielUndHoleSheet()` hat: die Schritte aus dem bestehenden Test, der `finalSheet` erzeugt, in eine private Methode ziehen und von beiden Tests aufrufen — nicht duplizieren.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringScenarioTest#sheetLiefertTeamTotals
```

Erwartung: FAIL — `homeTotals` ist `null`, weil das Feld noch nicht existiert.

- [ ] **Step 3: Write minimal implementation**

`SpielbogenSheetService.SheetData` um zwei Felder erweitern:

```java
    public record SheetData(
        Spielbogen bogen,
        List<SpielbogenSlot> homeLineup,
        List<SpielbogenSlot> awayLineup,
        List<SpielbogenAtBat> homeAtBats,
        List<SpielbogenAtBat> awayAtBats,
        List<SpielbogenStealingEvent> stealings,
        List<SpielbogenSubstitution> subs,
        List<SpielbogenPositionChange> positionChanges,
        List<SpielbogenRunnerAdvance> runnerAdvances,
        Map<Integer, BogenScoreCalculator.InningRuns> inningRuns,
        BogenScoreCalculator.TeamTotals homeTotals,
        BogenScoreCalculator.TeamTotals awayTotals
    ) {}
```

Im `return` von `getSheet` ergänzen (`allAtBats` und `stealings` sind bereits lokale Variablen aus Task 1):

```java
            scoreCalc.calculateInningRuns(allAtBats, stealings),
            scoreCalc.calculateTeamTotals(allAtBats, stealings, BogenSide.HOME),
            scoreCalc.calculateTeamTotals(allAtBats, stealings, BogenSide.AWAY)
```

`BogenSheetResponse` erweitern:

```java
public record BogenSheetResponse(
    SpielbogenResponse meta,
    List<SpielbogenSlotResponse> homeLineup,
    List<SpielbogenSlotResponse> awayLineup,
    List<SpielbogenAtBatResponse> homeAtBats,
    List<SpielbogenAtBatResponse> awayAtBats,
    List<SpielbogenStealingResponse> stealingEvents,
    List<SpielbogenSubstitutionResponse> substitutions,
    List<SpielbogenPositionChangeResponse> positionChanges,
    List<SpielbogenRunnerAdvanceResponse> runnerAdvances,
    Map<Integer, InningRuns> inningRuns,
    TeamTotals homeTotals,
    TeamTotals awayTotals
) {
    public record InningRuns(int home, int away) {}
    public record TeamTotals(int runs, int hits, int errors) {}
}
```

Im Controller-Mapping (`getSheet`, nach dem `inningRuns`-Block) ergänzen:

```java
            new BogenSheetResponse.TeamTotals(
                data.homeTotals().runs(), data.homeTotals().hits(), data.homeTotals().errors()),
            new BogenSheetResponse.TeamTotals(
                data.awayTotals().runs(), data.awayTotals().hits(), data.awayTotals().errors())
```

`frontend/src/types/index.ts` — bei `BogenSheetResponse` ergänzen:

```typescript
export interface BogenTeamTotals {
  runs: number
  hits: number
  errors: number
}
```

und im Interface neben `inningRuns`:

```typescript
  inningRuns: Record<number, { home: number; away: number }>
  homeTotals: BogenTeamTotals
  awayTotals: BogenTeamTotals
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringScenarioTest
cd frontend && npm run build
```

Erwartung: Backend-Tests PASS, `tsc -b` ohne Fehler.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/SpielbogenSheetService.java \
        backend/src/main/java/com/softball/adapter/dto/BogenSheetResponse.java \
        backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java \
        backend/src/test/java/com/softball/integration/SpielbogenScoringScenarioTest.java \
        frontend/src/types/index.ts
git commit -m "✨ Sheet-Response: homeTotals/awayTotals für die Linescore"
```

---

### Task 4: Persistenz für den öffentlichen Token

**Files:**
- Create: `backend/src/main/resources/db/migration/V55__spielbogen_public_token.sql`
- Modify: `backend/src/main/java/com/softball/domain/model/Spielbogen.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenEntity.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenMapper.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenRepository.java`
- Modify: `backend/src/main/java/com/softball/domain/port/out/SpielbogenRepository.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenRepositoryAdapter.java`

**Interfaces:**
- Produces: `Spielbogen.getPublicToken()` / `setPublicToken(String)`; `SpielbogenRepository.findByPublicToken(String)` → `Optional<Spielbogen>`

`spring.jpa.hibernate.ddl-auto=validate` — ohne Migration schlägt der Kontextstart fehl, das ist die Absicherung für diesen Task.

- [ ] **Step 1: Write the migration**

`backend/src/main/resources/db/migration/V55__spielbogen_public_token.sql`:

```sql
-- Öffentlicher Lese-Token für den Zuschauer-Link. NULL = kein Link vergeben.
ALTER TABLE spielbogen ADD COLUMN public_token VARCHAR(43);

CREATE UNIQUE INDEX uq_spielbogen_public_token ON spielbogen(public_token);
```

Postgres erlaubt beliebig viele `NULL` in einem Unique-Index — Bögen ohne Link kollidieren also nicht.

- [ ] **Step 2: Run the context to verify validation fails**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringScenarioTest
```

Erwartung: PASS. Die Migration allein bricht nichts — der Fehler kommt erst, wenn das Entity-Feld ohne Migration da wäre. Dieser Lauf bestätigt, dass die Migration sauber durchläuft.

- [ ] **Step 3: Write the implementation**

`domain/model/Spielbogen.java` — Feld plus Getter/Setter im Stil der übrigen Felder:

```java
    private String publicToken;

    public String getPublicToken() { return publicToken; }
    public void setPublicToken(final String publicToken) { this.publicToken = publicToken; }
```

`adapter/out/persistence/entity/SpielbogenEntity.java` — nach `endedAt`:

```java
    @Column(name = "public_token", length = 43)
    private String publicToken;
```

samt Getter/Setter im Stil der Datei.

`adapter/out/persistence/mapper/SpielbogenMapper.java` — in beiden Richtungen ergänzen (`toDomain` und `toEntity`):

```java
        domain.setPublicToken(entity.getPublicToken());
```

```java
        entity.setPublicToken(domain.getPublicToken());
```

`adapter/out/persistence/repository/SpringSpielbogenRepository.java`:

```java
    Optional<SpielbogenEntity> findByPublicToken(String publicToken);
```

plus `import java.util.Optional;`

`domain/port/out/SpielbogenRepository.java`:

```java
    Optional<Spielbogen> findByPublicToken(String publicToken);
```

`adapter/out/persistence/adapter/SpielbogenRepositoryAdapter.java`:

```java
    @Override
    public Optional<Spielbogen> findByPublicToken(final String publicToken) {
        return repo.findByPublicToken(publicToken).map(mapper::toDomain);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```

Erwartung: alle Tests PASS. Ein Fehlschlag mit „Schema-validation: missing column [public_token]" bedeutet, dass die Migration nicht gezogen hat.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V55__spielbogen_public_token.sql \
        backend/src/main/java/com/softball/domain/model/Spielbogen.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenMapper.java \
        backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenRepository.java \
        backend/src/main/java/com/softball/domain/port/out/SpielbogenRepository.java \
        backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenRepositoryAdapter.java
git commit -m "✨ Spielbogen: Spalte public_token (V55) für den Zuschauer-Link"
```

---

### Task 5: Share-Service und Share-Endpoints

**Files:**
- Create: `backend/src/main/java/com/softball/application/SpielbogenShareService.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/ShareLinkResponse.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java`
- Test: `backend/src/test/java/com/softball/integration/PublicBogenFeedTest.java` (neu, wird in Task 6 erweitert)

**Interfaces:**
- Consumes: `SpielbogenRepository.findByPublicToken` aus Task 4
- Produces:
  - `SpielbogenShareService.createOrGetToken(Long bogenId)` → `String`
  - `SpielbogenShareService.revokeToken(Long bogenId)` → `void`
  - `SpielbogenShareService.resolve(String token)` → `Spielbogen` (wirft `ResourceNotFoundException`)
  - `POST /api/spielbogen/{id}/share` → `ShareLinkResponse(String token)`
  - `DELETE /api/spielbogen/{id}/share` → 204

- [ ] **Step 1: Write the failing test**

Neue Datei `backend/src/test/java/com/softball/integration/PublicBogenFeedTest.java`. Den Testaufbau (Annotationen, Testcontainers-Basisklasse, `MockMvc`, Basic-Auth-Header) aus einer bestehenden Integrationstest-Klasse desselben Pakets übernehmen — dort steht das Muster:

```java
package com.softball.integration;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PublicBogenFeedTest extends /* Basisklasse der übrigen Integrationstests */ {

    @Test
    void shareErzeugtTokenUndIstIdempotent() throws Exception {
        Long bogenId = legeSpielbogenAn();

        String first = mockMvc.perform(post("/api/spielbogen/" + bogenId + "/share").with(auth()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", notNullValue()))
            .andReturn().getResponse().getContentAsString();

        String second = mockMvc.perform(post("/api/spielbogen/" + bogenId + "/share").with(auth()))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        assertThat(first).isEqualTo(second);
    }

    @Test
    void tokenIstNichtAusDerIdAbleitbar() throws Exception {
        Long bogenId = legeSpielbogenAn();

        String body = mockMvc.perform(post("/api/spielbogen/" + bogenId + "/share").with(auth()))
            .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(body).get("token").asText();

        assertThat(token).hasSizeGreaterThanOrEqualTo(40);
        assertThat(token).doesNotContain(String.valueOf(bogenId));
    }

    @Test
    void shareBrauchtAuth() throws Exception {
        Long bogenId = legeSpielbogenAn();

        mockMvc.perform(post("/api/spielbogen/" + bogenId + "/share"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void revokeEntferntDenToken() throws Exception {
        Long bogenId = legeSpielbogenAn();
        mockMvc.perform(post("/api/spielbogen/" + bogenId + "/share").with(auth()));

        mockMvc.perform(delete("/api/spielbogen/" + bogenId + "/share").with(auth()))
            .andExpect(status().isNoContent());
    }

    @Test
    void shareAufUnbekanntemBogenGibt404() throws Exception {
        mockMvc.perform(post("/api/spielbogen/999999/share").with(auth()))
            .andExpect(status().isNotFound());
    }

    /** Legt einen Spielbogen über die API an und gibt seine Id zurück. */
    private Long legeSpielbogenAn() throws Exception {
        String body = """
            {
              "date": "2026-08-06",
              "location": "Köln",
              "homeTeamName": "Köln Abbots",
              "awayTeamName": "Allstar"
            }
            """;

        String response = mockMvc.perform(post("/api/spielbogen")
                .with(auth())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("id").asLong();
    }
}
```

Vor dem Schreiben `backend/src/main/java/com/softball/adapter/dto/CreateSpielbogenRequest.java` öffnen und die Pflichtfelder abgleichen — falls `seasonId` dort `@NotNull` ist, im Test vorher eine Saison anlegen und die Id mitgeben. Auch den erwarteten Statuscode prüfen: `SpielbogenController.create` trägt eine `@ResponseStatus`-Annotation, `isCreated()` gilt nur, wenn dort `HttpStatus.CREATED` steht, sonst `isOk()`.

`auth()`, `mockMvc` und `objectMapper` aus der Basisklasse der übrigen Integrationstests im Paket `com.softball.integration` übernehmen.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PublicBogenFeedTest
```

Erwartung: FAIL mit 404/405 — die Share-Endpoints gibt es noch nicht.

- [ ] **Step 3: Write the implementation**

`application/SpielbogenShareService.java`:

```java
package com.softball.application;

import com.softball.domain.model.Spielbogen;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;

@Service
public class SpielbogenShareService {

    private static final Logger log = LoggerFactory.getLogger(SpielbogenShareService.class);

    /** 32 Byte = 256 Bit → 43 Zeichen base64url ohne Padding. */
    private static final int TOKEN_BYTES = 32;

    private final SpielbogenRepository bogenRepo;
    private final SecureRandom random = new SecureRandom();

    public SpielbogenShareService(final SpielbogenRepository bogenRepo) {
        this.bogenRepo = bogenRepo;
    }

    @Transactional
    public String createOrGetToken(final Long bogenId) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));

        if (bogen.getPublicToken() != null) {
            return bogen.getPublicToken();
        }

        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        bogen.setPublicToken(token);
        bogenRepo.save(bogen);
        log.info("Spielbogen {}: öffentlicher Link erzeugt", bogenId);
        return token;
    }

    @Transactional
    public void revokeToken(final Long bogenId) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));
        bogen.setPublicToken(null);
        bogenRepo.save(bogen);
        log.info("Spielbogen {}: öffentlicher Link zurückgezogen", bogenId);
    }

    /**
     * Löst einen Token auf. Unbekannt oder zurückgezogen → 404, nie 403:
     * ein 403 würde bestätigen, dass der Token einmal existiert hat.
     */
    @Transactional(readOnly = true)
    public Spielbogen resolve(final String token) {
        return bogenRepo.findByPublicToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", token));
    }
}
```

`adapter/dto/ShareLinkResponse.java`:

```java
package com.softball.adapter.dto;

public record ShareLinkResponse(String token) {}
```

`adapter/in/web/SpielbogenController.java` — Service in den Konstruktor aufnehmen (im Stil der bestehenden Injektionen) und Endpoints ergänzen:

```java
    @PostMapping("/{id}/share")
    public ShareLinkResponse createShareLink(@PathVariable Long id) {
        return new ShareLinkResponse(shareService.createOrGetToken(id));
    }

    @DeleteMapping("/{id}/share")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeShareLink(@PathVariable Long id) {
        shareService.revokeToken(id);
    }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PublicBogenFeedTest
```

Erwartung: alle fünf Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/SpielbogenShareService.java \
        backend/src/main/java/com/softball/adapter/dto/ShareLinkResponse.java \
        backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java \
        backend/src/test/java/com/softball/integration/PublicBogenFeedTest.java
git commit -m "✨ Spielbogen teilen: Token erzeugen und zurückziehen"
```

---

### Task 6: Öffentlicher Feed-Endpoint

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/in/web/PublicBogenController.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/PublicBogenFeedResponse.java`
- Modify: `backend/src/main/java/com/softball/shared/config/SecurityConfig.java:36`
- Test: `backend/src/test/java/com/softball/integration/PublicBogenFeedTest.java`

**Interfaces:**
- Consumes: `SpielbogenShareService.resolve`, `SpielbogenSheetService.getSheet`, `BogenScoreCalculator.TeamTotals`
- Produces: `GET /api/public/bogen/{token}` → `PublicBogenFeedResponse`

- [ ] **Step 1: Write the failing test**

An `PublicBogenFeedTest` anhängen:

```java
    @Test
    void oeffentlicherFeedBrauchtKeineAuth() throws Exception {
        Long bogenId = legeSpielbogenAn();
        String token = erzeugeToken(bogenId);

        mockMvc.perform(get("/api/public/bogen/" + token))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Robots-Tag", "noindex"))
            .andExpect(jsonPath("$.homeTeamName", notNullValue()))
            .andExpect(jsonPath("$.awayTeamName", notNullValue()))
            .andExpect(jsonPath("$.status", notNullValue()));
    }

    @Test
    void oeffentlicherFeedLiefertKeineInternenFelder() throws Exception {
        Long bogenId = legeSpielbogenAn();
        String token = erzeugeToken(bogenId);

        String body = mockMvc.perform(get("/api/public/bogen/" + token))
            .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("season");
        assertThat(body).doesNotContain("leagueResultId");
        assertThat(body).doesNotContain("publicToken");
        assertThat(body).doesNotContain("createdBy");
    }

    @Test
    void unbekannterTokenGibt404() throws Exception {
        mockMvc.perform(get("/api/public/bogen/gibtesnicht"))
            .andExpect(status().isNotFound());
    }

    @Test
    void zurueckgezogenerTokenGibt404() throws Exception {
        Long bogenId = legeSpielbogenAn();
        String token = erzeugeToken(bogenId);
        mockMvc.perform(delete("/api/spielbogen/" + bogenId + "/share").with(auth()));

        mockMvc.perform(get("/api/public/bogen/" + token))
            .andExpect(status().isNotFound());
    }

    @Test
    void normaleSpielbogenApiBleibtGeschuetzt() throws Exception {
        Long bogenId = legeSpielbogenAn();

        mockMvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andExpect(status().isUnauthorized());
    }

    private String erzeugeToken(Long bogenId) throws Exception {
        String body = mockMvc.perform(post("/api/spielbogen/" + bogenId + "/share").with(auth()))
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("token").asText();
    }
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PublicBogenFeedTest
```

Erwartung: die neuen Tests FAIL mit 401 — `/api/**` ist noch komplett geschützt.

- [ ] **Step 3: Write the implementation**

`adapter/dto/PublicBogenFeedResponse.java` — bewusst flach und ohne interne Felder:

```java
package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record PublicBogenFeedResponse(
    String homeTeamName,
    String awayTeamName,
    LocalDate date,
    String location,
    BogenStatus status,
    Integer currentInning,
    BogenSide currentSide,
    Integer homeRuns,
    Integer awayRuns,
    List<SpielbogenSlotResponse> homeLineup,
    List<SpielbogenSlotResponse> awayLineup,
    List<SpielbogenAtBatResponse> homeAtBats,
    List<SpielbogenAtBatResponse> awayAtBats,
    List<SpielbogenStealingResponse> stealingEvents,
    List<SpielbogenSubstitutionResponse> substitutions,
    Map<Integer, BogenSheetResponse.InningRuns> inningRuns,
    BogenSheetResponse.TeamTotals homeTotals,
    BogenSheetResponse.TeamTotals awayTotals
) {}
```

`adapter/in/web/PublicBogenController.java`:

```java
package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.application.SpielbogenShareService;
import com.softball.application.SpielbogenSheetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
public class PublicBogenController {

    private final SpielbogenShareService shareService;
    private final SpielbogenSheetService sheetService;

    public PublicBogenController(final SpielbogenShareService shareService,
                                 final SpielbogenSheetService sheetService) {
        this.shareService = shareService;
        this.sheetService = sheetService;
    }

    @GetMapping("/bogen/{token}")
    public ResponseEntity<PublicBogenFeedResponse> feed(@PathVariable String token) {
        var bogen = shareService.resolve(token);
        var data = sheetService.getSheet(bogen.getId());

        var body = new PublicBogenFeedResponse(
            data.bogen().getHomeTeamName(),
            data.bogen().getAwayTeamName(),
            data.bogen().getDate(),
            data.bogen().getLocation(),
            data.bogen().getStatus(),
            data.bogen().getCurrentInning(),
            data.bogen().getCurrentSide(),
            data.bogen().getHomeRuns(),
            data.bogen().getAwayRuns(),
            data.homeLineup().stream().map(SpielbogenSlotResponse::from).toList(),
            data.awayLineup().stream().map(SpielbogenSlotResponse::from).toList(),
            data.homeAtBats().stream().map(SpielbogenAtBatResponse::from).toList(),
            data.awayAtBats().stream().map(SpielbogenAtBatResponse::from).toList(),
            data.stealings().stream().map(SpielbogenStealingResponse::from).toList(),
            data.subs().stream().map(SpielbogenSubstitutionResponse::from).toList(),
            data.inningRuns().entrySet().stream().collect(Collectors.toMap(
                java.util.Map.Entry::getKey,
                e -> new BogenSheetResponse.InningRuns(e.getValue().getHome(), e.getValue().getAway())
            )),
            new BogenSheetResponse.TeamTotals(
                data.homeTotals().runs(), data.homeTotals().hits(), data.homeTotals().errors()),
            new BogenSheetResponse.TeamTotals(
                data.awayTotals().runs(), data.awayTotals().hits(), data.awayTotals().errors())
        );

        return ResponseEntity.ok()
            .header("X-Robots-Tag", "noindex")
            .body(body);
    }
}
```

`shared/config/SecurityConfig.java` — **vor** der `/api/**`-Zeile einfügen:

```java
                .requestMatchers("/api/public/**").permitAll() // Zuschauer-Link, Token statt Auth
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PublicBogenFeedTest
cd backend && ./mvnw test -s .mvn/local-settings.xml
```

Erwartung: alle zehn Tests der Klasse PASS, gesamte Suite PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/in/web/PublicBogenController.java \
        backend/src/main/java/com/softball/adapter/dto/PublicBogenFeedResponse.java \
        backend/src/main/java/com/softball/shared/config/SecurityConfig.java \
        backend/src/test/java/com/softball/integration/PublicBogenFeedTest.java
git commit -m "✨ Öffentlicher Zuschauer-Feed unter /api/public/bogen/{token}

Eigenes reduziertes DTO statt BogenSheetResponse durchreichen.
Unbekannter oder zurückgezogener Token gibt 404, nicht 403 — ein 403
würde bestätigen, dass der Token einmal existiert hat."
```

---

### Task 7: `overflow-hidden` in `ResponsiveSheet`

Der Desktop-Container hat `rounded-2xl`, aber kein `overflow-hidden`. Randloser Inhalt mit eigenen Rahmenlinien schneidet dadurch durch die runde Ecke.

**Files:**
- Modify: `frontend/src/components/shared/ResponsiveSheet.tsx`

**Interfaces:** keine Signaturänderung.

- [ ] **Step 1: Apply the fix**

Im mobilen `Drawer.Content` die Klassenliste ergänzen:

```tsx
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl overflow-hidden max-h-[90vh] flex flex-col focus:outline-none">
```

Im Desktop-`motion.div`:

```tsx
        className={`bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden shadow-xl w-full ${MAX_WIDTH[maxWidth]} max-h-[85vh] flex flex-col focus:outline-none`}
```

- [ ] **Step 2: Run the existing test suite**

```bash
cd frontend && npm test
cd frontend && npm run build
```

Erwartung: PASS, Build ohne Fehler.

- [ ] **Step 3: Manuell durchklicken**

`ResponsiveSheet` hat 33 Verbraucher. Gefährlich sind Sheets mit absolut positionierten Kindern, die bewusst über den Rand ragen — die würden jetzt abgeschnitten.

App starten:

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
cd frontend && npx vite
```

Priorisiert prüfen — Live-Scoring zuerst, weil ein Fehler dort mitten im Spiel auffällt:

- `HitAdjustSheet`, `OutDetailDrawer`, `ErrorPickerDrawer`, `StealingDrawer`, `PositionSwapDrawer`, `PitchingEventDrawer`, `CheatsheetDrawer`, `CopyFromGameDayModal`, `BogenActionButtons`
- `CorrectionSheet` — existiert zweimal, in `spielbogen/` und in `scoring/`, beide ansehen
- Verschachtelte Sheets (`nested`-Prop): `SpielbogenPage`, `ScoringPage`
- Stichproben aus Dashboard, Orga, Planner, Training, Stats

Findet sich ein Sheet, das bewusst überragt: dort gezielt ausnehmen (eigene Klasse ohne `overflow-hidden`), **nicht** den Fix zurückdrehen.

- [ ] **Step 4: E2E-Suite laufen lassen**

```bash
docker compose up -d db
cd frontend && npm run test:e2e
```

Erwartung: 43 Tests PASS. Die Suite deckt die Legacy-`ScoringPage` ab, die `ResponsiveSheet` mitbenutzt.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared/ResponsiveSheet.tsx
git commit -m "🐛 ResponsiveSheet: overflow-hidden gegen Inhalt in der runden Ecke

rounded-2xl ohne overflow-hidden ließ randlosen Inhalt mit eigenen
Rahmenlinien über die Ecke stehen. Betrifft alle 33 Verbraucher."
```

---

### Task 8: Feed-Zeilen als reine Funktionen

Erst die Logik ohne React — dann ist sie billig testbar und die Komponente bleibt dumm.

**Files:**
- Create: `frontend/src/utils/bogenFeed.ts`
- Create: `frontend/src/utils/bogenFeed.test.ts`

**Interfaces:**
- Consumes: `SpielbogenAtBatResponse`, `SpielbogenStealingResponse`, `SpielbogenSubstitutionResponse`, `SpielbogenSlotResponse`, `BogenSide` aus `@/types`
- Produces:

```typescript
export interface FeedEvent {
  key: string            // stabile React-Key
  inning: number
  side: BogenSide
  createdAt: string
  who: string            // Slot-Name, bei Subs "Sub"
  what: string           // fertiger deutscher Text
  rbi: number            // 0 = kein Tag
  scored: boolean        // Run-Hervorhebung
  minor: boolean         // Steals, Subs → gedimmt
}

export interface HalfInning {
  inning: number
  side: BogenSide
  events: FeedEvent[]
  scoreAfter: { home: number; away: number }
}

export function buildFeed(input: FeedInput): HalfInning[]
export function halfInningId(inning: number, side: BogenSide): string
```

`halfInningId` liefert die DOM-Id für den Linescore-Sprung aus Task 9.

- [ ] **Step 1: Write the failing test**

`frontend/src/utils/bogenFeed.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildFeed, halfInningId } from './bogenFeed'
import type { SpielbogenAtBatResponse, SpielbogenSlotResponse, SpielbogenStealingResponse } from '@/types'

const slot = (id: number, name: string): SpielbogenSlotResponse => ({
  id, side: 'HOME', slot: id, name, position: '2B', battingOrder: id,
})

const ab = (o: Partial<SpielbogenAtBatResponse>): SpielbogenAtBatResponse => ({
  id: 1, bogenId: 1, slotId: 1, side: 'HOME', sequence: 1, inning: 1,
  result: 'OUT', outType: null, sacrificeType: null, fielderChain: null,
  isError: false, errorPosition: null, runsScored: 0, rbi: 0,
  baseStateAfter: null, createdAt: '2026-08-06T10:00:00Z', runnerAdvances: [],
  ...o,
} as SpielbogenAtBatResponse)

const base = {
  homeLineup: [slot(1, 'Ylvi')],
  awayLineup: [{ ...slot(9, 'Weber'), side: 'AWAY' as const }],
  homeAtBats: [],
  awayAtBats: [],
  stealingEvents: [],
  substitutions: [],
  inningRuns: {},
}

describe('buildFeed — At-Bat-Zeilen', () => {
  it('nennt Treffer beim deutschen Namen', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'DOUBLE' })] })
    expect(feed[0].events[0].what).toBe('Double')
  })

  it('setzt Grounder mit Fielder-Kette', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'OUT', outType: 'GROUNDER', fielderChain: [6, 3] })] })
    expect(feed[0].events[0].what).toBe('Grounder 6-3')
  })

  it('setzt Fly mit Position', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'OUT', outType: 'FLY', fielderChain: [9] })] })
    expect(feed[0].events[0].what).toBe('Fly F9')
  })

  it('setzt Double Play mit voller Kette', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'OUT', outType: 'DOUBLE_PLAY', fielderChain: [6, 4, 3] })] })
    expect(feed[0].events[0].what).toBe('Double Play 6-4-3')
  })

  it('nennt Sacrifice beim Namen', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'OUT', outType: 'FLY', sacrificeType: 'FLY', fielderChain: [8] })] })
    expect(feed[0].events[0].what).toBe('Sac Fly')
  })

  it('nennt Error mit Position', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'REACHED_ON_ERROR', isError: true, errorPosition: 5 })] })
    expect(feed[0].events[0].what).toBe('Reached on Error')
    expect(feed[0].events[0].rbi).toBe(0)
  })

  it('markiert Runs und trägt die RBI', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'SINGLE', runsScored: 2, rbi: 2 })] })
    expect(feed[0].events[0].scored).toBe(true)
    expect(feed[0].events[0].rbi).toBe(2)
  })

  it('markiert nichts, wenn kein Run fiel', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'SINGLE', runsScored: 0, rbi: 0 })] })
    expect(feed[0].events[0].scored).toBe(false)
  })
})

describe('buildFeed — Steals', () => {
  const steal = (type: string, toBase: number): SpielbogenStealingResponse => ({
    id: 1, bogenId: 1, slotId: 1, side: 'HOME', inning: 1,
    type, fromBase: toBase - 1, toBase, createdAt: '2026-08-06T10:01:00Z',
  } as SpielbogenStealingResponse)

  it.each([
    ['STOLEN_BASE', 2, 'stiehlt 2nd'],
    ['STOLEN_BASE', 3, 'stiehlt 3rd'],
    ['STOLEN_BASE', 4, 'stiehlt Home'],
    ['CAUGHT_STEALING', 2, 'beim Klau gefangen'],
    ['OUT_ON_PLAY', 3, 'Aus beim Vorrücken'],
    ['WILD_PITCH', 2, 'Wild Pitch'],
    ['PASSED_BALL', 2, 'Passed Ball'],
  ])('%s → %s', (type, toBase, expected) => {
    const feed = buildFeed({ ...base, stealingEvents: [steal(type, toBase)] })
    expect(feed[0].events[0].what).toBe(expected)
    expect(feed[0].events[0].minor).toBe(true)
  })
})

describe('buildFeed — Reihenfolge und Gruppierung', () => {
  it('sortiert gemischte Typen nach createdAt, neueste zuerst', () => {
    const feed = buildFeed({
      ...base,
      homeAtBats: [
        ab({ id: 1, result: 'SINGLE', createdAt: '2026-08-06T10:00:00Z' }),
        ab({ id: 2, result: 'STRIKEOUT', createdAt: '2026-08-06T10:02:00Z' }),
      ],
      stealingEvents: [{
        id: 1, bogenId: 1, slotId: 1, side: 'HOME', inning: 1,
        type: 'STOLEN_BASE', fromBase: 1, toBase: 2, createdAt: '2026-08-06T10:01:00Z',
      } as SpielbogenStealingResponse],
    })

    expect(feed[0].events.map(e => e.what)).toEqual(['Strikeout', 'stiehlt 2nd', 'Single'])
  })

  it('gruppiert nach Halbinning, neueste Gruppe oben', () => {
    const feed = buildFeed({
      ...base,
      homeAtBats: [
        ab({ id: 1, inning: 1, result: 'SINGLE', createdAt: '2026-08-06T10:00:00Z' }),
        ab({ id: 2, inning: 3, result: 'DOUBLE', createdAt: '2026-08-06T10:20:00Z' }),
      ],
    })

    expect(feed.map(h => h.inning)).toEqual([3, 1])
  })

  it('trennt Halbinnings derselben Inning-Nummer nach Seite', () => {
    const feed = buildFeed({
      ...base,
      homeAtBats: [ab({ id: 1, inning: 2, side: 'HOME', createdAt: '2026-08-06T10:10:00Z' })],
      awayAtBats: [ab({ id: 2, inning: 2, side: 'AWAY', slotId: 9, createdAt: '2026-08-06T10:05:00Z' })],
    })

    expect(feed).toHaveLength(2)
    expect(feed[0].side).toBe('HOME')
    expect(feed[1].side).toBe('AWAY')
  })

  it('liefert den Zwischenstand nach jeder Halbinning', () => {
    const feed = buildFeed({
      ...base,
      homeAtBats: [
        ab({ id: 1, inning: 1, result: 'SINGLE', runsScored: 1, createdAt: '2026-08-06T10:00:00Z' }),
        ab({ id: 2, inning: 2, result: 'SINGLE', runsScored: 2, createdAt: '2026-08-06T10:10:00Z' }),
      ],
      inningRuns: { 1: { home: 1, away: 0 }, 2: { home: 2, away: 0 } },
    })

    expect(feed[0].scoreAfter).toEqual({ home: 3, away: 0 })
    expect(feed[1].scoreAfter).toEqual({ home: 1, away: 0 })
  })

  it('gibt bei leerem Spiel eine leere Liste', () => {
    expect(buildFeed(base)).toEqual([])
  })
})

describe('halfInningId', () => {
  it('ist je Halbinning eindeutig', () => {
    expect(halfInningId(3, 'HOME')).not.toBe(halfInningId(3, 'AWAY'))
    expect(halfInningId(3, 'HOME')).toBe(halfInningId(3, 'HOME'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/utils/bogenFeed.test.ts
```

Erwartung: FAIL — `bogenFeed.ts` existiert nicht.

- [ ] **Step 3: Write the implementation**

`frontend/src/utils/bogenFeed.ts`:

```typescript
import type {
  BogenSide,
  SpielbogenAtBatResponse,
  SpielbogenSlotResponse,
  SpielbogenStealingResponse,
  SpielbogenSubstitutionResponse,
} from '@/types'

export interface FeedEvent {
  key: string
  inning: number
  side: BogenSide
  createdAt: string
  who: string
  what: string
  rbi: number
  scored: boolean
  minor: boolean
}

export interface HalfInning {
  inning: number
  side: BogenSide
  events: FeedEvent[]
  scoreAfter: { home: number; away: number }
}

export interface FeedInput {
  homeLineup: SpielbogenSlotResponse[]
  awayLineup: SpielbogenSlotResponse[]
  homeAtBats: SpielbogenAtBatResponse[]
  awayAtBats: SpielbogenAtBatResponse[]
  stealingEvents: SpielbogenStealingResponse[]
  substitutions: SpielbogenSubstitutionResponse[]
  inningRuns: Record<number, { home: number; away: number }>
}

const RESULT_DE: Record<string, string> = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  TRIPLE: 'Triple',
  HOMERUN: 'Homerun',
  INSIDE_PARK_HR: 'Park-HR',
  WALK: 'Walk',
  HIT_BY_PITCH: 'Hit-by-Pitch',
  STRIKEOUT: 'Strikeout',
  OUT: 'Aus',
  REACHED_ON_ERROR: 'Reached on Error',
}

const OUT_TYPE_DE: Record<string, string> = {
  GROUNDER: 'Grounder',
  FLY: 'Fly',
  FOUL: 'Foul',
  UNASSISTED: 'Unassisted',
  DOUBLE_PLAY: 'Double Play',
  TRIPLE_PLAY: 'Triple Play',
  FORCE_OUT: 'Force Out',
  TAG_OUT: 'Tag Out',
  FIELDERS_CHOICE: "Fielder's Choice",
}

const BASE_DE: Record<number, string> = { 2: '2nd', 3: '3rd', 4: 'Home' }

export function halfInningId(inning: number, side: BogenSide): string {
  return `half-${inning}-${side}`
}

function atBatLabel(ab: SpielbogenAtBatResponse): string {
  if (ab.sacrificeType) {
    return ab.sacrificeType === 'BUNT' ? 'Sac Bunt' : 'Sac Fly'
  }

  if (ab.outType) {
    const name = OUT_TYPE_DE[ab.outType] ?? RESULT_DE[ab.result] ?? ab.result
    const chain = ab.fielderChain ?? []
    if (ab.outType === 'FLY' && chain.length === 1) return `${name} F${chain[0]}`
    if (chain.length > 0) return `${name} ${chain.join('-')}`
    return name
  }

  return RESULT_DE[ab.result] ?? ab.result
}

function stealLabel(st: SpielbogenStealingResponse): string {
  switch (st.type) {
    case 'STOLEN_BASE': return `stiehlt ${BASE_DE[st.toBase ?? 0] ?? st.toBase}`
    case 'CAUGHT_STEALING': return 'beim Klau gefangen'
    case 'OUT_ON_PLAY': return 'Aus beim Vorrücken'
    case 'WILD_PITCH': return 'Wild Pitch'
    case 'PASSED_BALL': return 'Passed Ball'
    default: return st.type
  }
}

export function buildFeed(input: FeedInput): HalfInning[] {
  const nameBySlotId = new Map<number, string>()
  for (const s of [...input.homeLineup, ...input.awayLineup]) {
    if (s.id != null) nameBySlotId.set(s.id, s.name)
  }
  const nameOf = (slotId: number | null | undefined) =>
    (slotId != null ? nameBySlotId.get(slotId) : undefined) ?? '—'

  const events: FeedEvent[] = []

  for (const ab of [...input.homeAtBats, ...input.awayAtBats]) {
    events.push({
      key: `ab-${ab.id}`,
      inning: ab.inning,
      side: ab.side,
      createdAt: ab.createdAt,
      who: nameOf(ab.slotId),
      what: atBatLabel(ab),
      rbi: ab.rbi ?? 0,
      scored: (ab.runsScored ?? 0) > 0,
      minor: false,
    })
  }

  for (const st of input.stealingEvents) {
    events.push({
      key: `st-${st.id}`,
      inning: st.inning,
      side: st.side,
      createdAt: st.createdAt,
      who: nameOf(st.slotId),
      what: stealLabel(st),
      rbi: 0,
      scored: false,
      minor: true,
    })
  }

  for (const sub of input.substitutions) {
    events.push({
      key: `sub-${sub.id}`,
      inning: sub.inning,
      side: sub.side,
      createdAt: sub.createdAt,
      who: 'Sub',
      what: `${sub.inPlayerName} für ${sub.outPlayerName}`,
      rbi: 0,
      scored: false,
      minor: true,
    })
  }

  // Neueste zuerst — über alle Typen hinweg über createdAt, der einzige
  // Schlüssel, den At-Bats, Steals und Subs gemeinsam haben.
  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const groups = new Map<string, HalfInning>()
  const order: string[] = []
  for (const ev of events) {
    const id = halfInningId(ev.inning, ev.side)
    let group = groups.get(id)
    if (!group) {
      group = { inning: ev.inning, side: ev.side, events: [], scoreAfter: { home: 0, away: 0 } }
      groups.set(id, group)
      order.push(id)
    }
    group.events.push(ev)
  }

  const result = order.map(id => groups.get(id)!)

  // Zwischenstand nach jeder Halbinning.
  //
  // Away schlägt oben, Home unten. Nach dem Ende der TOP-Hälfte von Inning N hat Home
  // erst die Innings 1..N-1 gespielt — dessen Runs aus Inning N sind noch nicht gefallen.
  // Away dagegen ist in beiden Fällen bis einschließlich N zu zählen.
  for (const group of result) {
    let home = 0
    let away = 0
    const homeThrough = group.side === 'AWAY' ? group.inning - 1 : group.inning
    for (const [inningKey, runs] of Object.entries(input.inningRuns)) {
      const inning = Number(inningKey)
      if (inning <= group.inning) away += runs.away
      if (inning <= homeThrough) home += runs.home
    }
    group.scoreAfter = { home, away }
  }

  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/utils/bogenFeed.test.ts
```

Erwartung: alle Tests PASS.

Falls die Feldnamen von `SpielbogenSubstitutionResponse` abweichen (`inPlayerName` / `outPlayerName`): die tatsächlichen Namen aus `backend/src/main/java/com/softball/adapter/dto/SpielbogenSubstitutionResponse.java` übernehmen und Test wie Implementierung angleichen.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/bogenFeed.ts frontend/src/utils/bogenFeed.test.ts
git commit -m "✨ bogenFeed: Ereignisse zu Feed-Zeilen, gruppiert nach Halbinning"
```

---

### Task 9: `BogenLiveFeed`-Komponente

**Files:**
- Create: `frontend/src/components/spielbogen/BogenLiveFeed.tsx`
- Create: `frontend/src/components/spielbogen/BogenLiveFeed.test.tsx`

**Interfaces:**
- Consumes: `buildFeed`, `halfInningId` aus Task 8; `BogenTeamTotals` aus Task 3
- Produces:

```typescript
export interface BogenLiveFeedProps {
  homeTeamName: string
  awayTeamName: string
  status: 'DRAFT' | 'LIVE' | 'DONE'
  currentInning: number
  currentSide: BogenSide
  homeRuns: number
  awayRuns: number
  inningRuns: Record<number, { home: number; away: number }>
  homeTotals: BogenTeamTotals
  awayTotals: BogenTeamTotals
  feed: HalfInning[]
  /** Slot-Name des aktuellen Batters, optional. */
  currentBatterName?: string | null
}

export function BogenLiveFeed(props: BogenLiveFeedProps): JSX.Element
```

Visuelle Vorlage: `docs/superpowers/specs/2026-07-31-spielbogen-live-feed-mockup.html`. Farben ausschließlich als Tailwind-Klassen aus den vorhandenen Tokens (`bg-navy-900`, `text-cream-50`, `bg-cream-100`, `border-cream-300`, `bg-softball-red-600`, …). Für den Run-Hintergrund und den Bernstein-Balken die im Projekt vorhandenen Amber-Utilities nutzen (`bg-amber-50`, `border-amber-500`, `bg-amber-500`).

- [ ] **Step 1: Write the failing test**

`frontend/src/components/spielbogen/BogenLiveFeed.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BogenLiveFeed } from './BogenLiveFeed'
import type { HalfInning } from '@/utils/bogenFeed'

const feed: HalfInning[] = [
  {
    inning: 2, side: 'HOME', scoreAfter: { home: 3, away: 1 },
    events: [
      { key: 'a', inning: 2, side: 'HOME', createdAt: '2026-08-06T10:05:00Z',
        who: 'Krosaki', what: 'Single', rbi: 0, scored: false, minor: false },
      { key: 'b', inning: 2, side: 'HOME', createdAt: '2026-08-06T10:04:00Z',
        who: 'Juli', what: 'Walk', rbi: 2, scored: true, minor: false },
      { key: 'c', inning: 2, side: 'HOME', createdAt: '2026-08-06T10:03:00Z',
        who: 'Rauf', what: 'stiehlt 2nd', rbi: 0, scored: false, minor: true },
    ],
  },
  {
    inning: 1, side: 'AWAY', scoreAfter: { home: 0, away: 1 },
    events: [
      { key: 'd', inning: 1, side: 'AWAY', createdAt: '2026-08-06T10:00:00Z',
        who: 'Weber', what: 'Grounder 6-3', rbi: 0, scored: false, minor: false },
    ],
  },
]

const base = {
  homeTeamName: 'Köln Abbots',
  awayTeamName: 'Allstar',
  status: 'LIVE' as const,
  currentInning: 2,
  currentSide: 'HOME' as const,
  homeRuns: 3,
  awayRuns: 1,
  inningRuns: { 1: { home: 0, away: 1 }, 2: { home: 3, away: 0 } },
  homeTotals: { runs: 3, hits: 4, errors: 0 },
  awayTotals: { runs: 1, hits: 2, errors: 1 },
  feed,
}

describe('BogenLiveFeed', () => {
  it('zeigt beide Teams mit Stand', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByText('Köln Abbots')).toBeInTheDocument()
    expect(screen.getByText('Allstar')).toBeInTheDocument()
  })

  it('zeigt R/H/E beider Teams in der Linescore', () => {
    render(<BogenLiveFeed {...base} />)
    const away = screen.getByTestId('linescore-row-AWAY')
    expect(away).toHaveTextContent('1')
    expect(away).toHaveTextContent('2')
    const home = screen.getByTestId('linescore-row-HOME')
    expect(home).toHaveTextContent('4')
  })

  it('rendert Ereigniszeilen', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByText('Krosaki')).toBeInTheDocument()
    expect(screen.getByText('Grounder 6-3')).toBeInTheDocument()
  })

  it('hebt nur Run-Zeilen hervor', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByTestId('event-b')).toHaveAttribute('data-scored', 'true')
    expect(screen.getByTestId('event-a')).toHaveAttribute('data-scored', 'false')
  })

  it('zeigt das RBI-Tag nur wenn RBI > 0', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByText('+2 RBI')).toBeInTheDocument()
    expect(screen.queryByText('+0 RBI')).not.toBeInTheDocument()
  })

  it('dimmt Steals und Subs', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByTestId('event-c')).toHaveAttribute('data-minor', 'true')
  })

  it('zeigt den Zwischenstand je Halbinning', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByText('3 : 1')).toBeInTheDocument()
  })

  it('springt beim Klick auf eine gespielte Inning-Zelle', async () => {
    const scrollIntoView = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView

    render(<BogenLiveFeed {...base} />)
    await userEvent.click(screen.getByTestId('linescore-cell-1-AWAY'))

    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('macht noch nicht gespielte Innings nicht anklickbar', () => {
    render(<BogenLiveFeed {...base} />)
    expect(screen.getByTestId('linescore-cell-6-HOME')).toBeDisabled()
  })

  it('zeigt einen Hinweis, solange das Spiel nicht gestartet ist', () => {
    render(<BogenLiveFeed {...base} status="DRAFT" feed={[]} />)
    expect(screen.getByText(/noch nicht gestartet/i)).toBeInTheDocument()
  })

  it('zeigt einen Hinweis bei laufendem Spiel ohne Ereignisse', () => {
    render(<BogenLiveFeed {...base} status="LIVE" feed={[]} />)
    expect(screen.getByText(/noch nichts passiert/i)).toBeInTheDocument()
  })

  it('zeigt den Endstand-Hinweis bei beendetem Spiel', () => {
    render(<BogenLiveFeed {...base} status="DONE" />)
    expect(screen.getByText(/endstand/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/components/spielbogen/BogenLiveFeed.test.tsx
```

Erwartung: FAIL — Komponente existiert nicht.

- [ ] **Step 3: Write the implementation**

`frontend/src/components/spielbogen/BogenLiveFeed.tsx`:

```tsx
import type { BogenSide, BogenTeamTotals } from '@/types'
import { halfInningId, type HalfInning } from '@/utils/bogenFeed'

export interface BogenLiveFeedProps {
  homeTeamName: string
  awayTeamName: string
  status: 'DRAFT' | 'LIVE' | 'DONE'
  currentInning: number
  currentSide: BogenSide
  homeRuns: number
  awayRuns: number
  inningRuns: Record<number, { home: number; away: number }>
  homeTotals: BogenTeamTotals
  awayTotals: BogenTeamTotals
  feed: HalfInning[]
  currentBatterName?: string | null
}

/** Regelspiel geht über 7 Innings, Extra-Innings hängen rechts an. */
const REGULAR_INNINGS = 7

function inningColumns(inningRuns: Record<number, { home: number; away: number }>): number[] {
  const highest = Object.keys(inningRuns).reduce((max, k) => Math.max(max, Number(k)), 0)
  const count = Math.max(REGULAR_INNINGS, highest)
  return Array.from({ length: count }, (_, i) => i + 1)
}

export function BogenLiveFeed({
  homeTeamName, awayTeamName, status, currentInning, currentSide,
  homeRuns, awayRuns, inningRuns, homeTotals, awayTotals, feed, currentBatterName,
}: BogenLiveFeedProps) {
  const columns = inningColumns(inningRuns)
  const played = new Set(feed.map(h => halfInningId(h.inning, h.side)))

  const jumpTo = (inning: number, side: BogenSide) => {
    document.getElementById(halfInningId(inning, side))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      {/* Scoreboard — einziger dunkler Block, damit der Stand sofort gefunden wird */}
      <div className="bg-navy-900 text-cream-50 px-5 pt-3 pb-3">
        <div className="flex items-center justify-between py-0.5">
          <span className="font-display text-xl uppercase tracking-wide opacity-70">{awayTeamName}</span>
          <span className="font-display text-2xl font-extrabold">{awayRuns}</span>
        </div>
        <div className="flex items-center justify-between py-0.5">
          <span className="font-display text-xl uppercase tracking-wide">{homeTeamName}</span>
          <span className="font-display text-2xl font-extrabold">{homeRuns}</span>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-navy-600 flex items-center gap-3 font-display text-xs uppercase tracking-widest text-navy-100">
          <span className="text-cream-50 text-sm">
            {currentSide === 'AWAY' ? '▲' : '▼'} {currentInning}. Inning
          </span>
          {status === 'DONE' && <span className="text-cream-50">Endstand</span>}
          {currentBatterName && <span className="ml-auto">{currentBatterName} am Schlag</span>}
        </div>
      </div>

      {/* Linescore — Zellen sind Sprungziele */}
      <div className="overflow-x-auto bg-cream-100 border-b border-cream-300">
        <table className="w-full font-display text-sm whitespace-nowrap">
          <thead>
            <tr className="text-[10px] tracking-wider text-gray-500">
              <th className="text-left pl-5 py-1.5 font-bold"></th>
              {columns.map(i => <th key={i} className="py-1.5 px-1 font-bold text-center">{i}</th>)}
              <th className="py-1.5 px-1 text-center font-bold border-l border-cream-300">R</th>
              <th className="py-1.5 px-1 text-center font-bold">H</th>
              <th className="py-1.5 pr-5 pl-1 text-center font-bold">E</th>
            </tr>
          </thead>
          <tbody>
            {([
              { side: 'AWAY' as const, name: awayTeamName, totals: awayTotals },
              { side: 'HOME' as const, name: homeTeamName, totals: homeTotals },
            ]).map(row => (
              <tr key={row.side} data-testid={`linescore-row-${row.side}`} className="border-t border-cream-200">
                <td className="text-left pl-5 py-1 text-xs font-bold text-navy-800">{row.name}</td>
                {columns.map(i => {
                  const runs = inningRuns[i]
                  const value = row.side === 'HOME' ? runs?.home : runs?.away
                  const canJump = played.has(halfInningId(i, row.side))
                  return (
                    <td key={i} className="p-0 text-center">
                      <button
                        type="button"
                        data-testid={`linescore-cell-${i}-${row.side}`}
                        disabled={!canJump}
                        onClick={() => jumpTo(i, row.side)}
                        className={`w-full py-1 px-1 ${canJump ? 'cursor-pointer hover:bg-cream-200' : 'text-gray-400'}`}
                      >
                        {canJump ? (value ?? 0) : '–'}
                      </button>
                    </td>
                  )
                })}
                <td className="py-1 px-1 text-center font-extrabold text-softball-red-700 border-l border-cream-300">{row.totals.runs}</td>
                <td className="py-1 px-1 text-center font-extrabold text-navy-900">{row.totals.hits}</td>
                <td className="py-1 pr-5 pl-1 text-center font-extrabold text-navy-900">{row.totals.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Play-by-Play */}
      {status === 'DRAFT' && (
        <p className="px-5 py-8 text-center text-sm text-gray-500 font-body">
          Das Spiel ist noch nicht gestartet.
        </p>
      )}
      {status !== 'DRAFT' && feed.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-gray-500 font-body">
          Spiel läuft — noch nichts passiert.
        </p>
      )}

      {feed.map((half, index) => (
        <div key={halfInningId(half.inning, half.side)} id={halfInningId(half.inning, half.side)}>
          <div className="sticky top-0 flex items-center gap-2 px-5 pt-2 pb-1.5 bg-cream-100 border-b border-cream-200 font-display text-xs uppercase tracking-widest text-navy-700">
            <span className="text-softball-red-600">{half.side === 'AWAY' ? '▲' : '▼'}</span>
            {half.inning}. Inning — {half.side === 'HOME' ? homeTeamName : awayTeamName}
            {index === 0 && status === 'LIVE' && (
              <span className="ml-auto bg-softball-red-600 text-white text-[9px] tracking-widest px-2 py-0.5 rounded-full">LIVE</span>
            )}
          </div>

          {half.events.map(ev => (
            <div
              key={ev.key}
              data-testid={`event-${ev.key}`}
              data-scored={String(ev.scored)}
              data-minor={String(ev.minor)}
              className={`flex items-baseline gap-2.5 py-2 border-b border-cream-200 text-sm ${
                ev.scored ? 'bg-amber-50 border-l-[3px] border-l-amber-500 pl-[17px] pr-5' : 'px-5'
              } ${ev.minor ? 'italic text-gray-500' : ''}`}
            >
              <span className={`font-display text-[15px] tracking-wide shrink-0 w-22 ${ev.minor ? 'text-gray-500' : 'text-navy-900'}`}>
                {ev.who}
              </span>
              <span className={`flex-1 ${ev.scored ? 'text-navy-900 font-semibold' : ''}`}>{ev.what}</span>
              {ev.rbi > 0 && (
                <span className="font-display text-[11px] tracking-wide px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0">
                  +{ev.rbi} RBI
                </span>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2.5 px-5 py-1.5 bg-cream-200 font-display text-xs tracking-widest text-gray-600">
            <span className="flex-1 h-px bg-cream-300" />
            <b className="text-navy-800 text-[13px]">{half.scoreAfter.home} : {half.scoreAfter.away}</b>
            <span className="flex-1 h-px bg-cream-300" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

Ein Stolperstein beim Übernehmen: `w-22` ist kein Tailwind-Standard-Utility. Auf `w-24` gehen, sofern das Projekt nichts Passendes definiert — die Spalte muss nur breit genug für die längsten Vornamen sein.

Amber ist geprüft und im Projekt etabliert: `styles/index.css:6` führt es als Status-Warnfarbe, verwendet u.a. in `BogenMetaEditModal`, `SlotEditor`, `CorrectionSheet`, `LineupRow`. Also keine neue Farbe.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/components/spielbogen/BogenLiveFeed.test.tsx
cd frontend && npm run build
```

Erwartung: alle Tests PASS, Build ohne Fehler.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/spielbogen/BogenLiveFeed.tsx \
        frontend/src/components/spielbogen/BogenLiveFeed.test.tsx
git commit -m "✨ BogenLiveFeed: Scoreboard, Linescore mit Sprung, Play-by-Play"
```

---

### Task 10: Aufstellung-Block

**Files:**
- Create: `frontend/src/components/spielbogen/BogenLineupAccordion.tsx`

**Interfaces:**
- Produces:

```typescript
export interface BogenLineupAccordionProps {
  homeLineup: SpielbogenSlotResponse[]
  awayLineup: SpielbogenSlotResponse[]
  homeTeamName: string
  awayTeamName: string
  /** Fehlt der Handler, wird kein Stift gerendert — so läuft derselbe Block öffentlich. */
  onEditSlot?: (slot: SpielbogenSlotResponse) => void
}

export function BogenLineupAccordion(props: BogenLineupAccordionProps): JSX.Element
```

- [ ] **Step 1: Write the implementation**

Eingeklappt starten. Kopfzeile: Chevron, „Aufstellung", rechts HEIM/GAST-Pills im Stil aus `RflSheetDrawer.tsx:225-235` (`rounded-full`, aktive Pill `bg-navy-800 text-white`). Aufgeklappt eine Liste: Batting-Order, Name, Position, und nur wenn `onEditSlot` gesetzt ist ein `Pencil`-Button aus `@/icons` mit `aria-label={`${slot.name} bearbeiten`}`.

Der Umschalter steuert nur, welche Liste gezeigt wird — beide Seiten bleiben im State.

- [ ] **Step 2: Verify typecheck and lint**

```bash
cd frontend && npm run build
cd frontend && npm run lint
```

Erwartung: beides ohne Fehler.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/spielbogen/BogenLineupAccordion.tsx
git commit -m "✨ BogenLineupAccordion: Aufstellung eingeklappt, Stift optional"
```

---

### Task 11: Drawer umbauen und Link teilen

**Files:**
- Create: `frontend/src/components/spielbogen/BogenSheetDrawer.tsx` (aus `RflSheetDrawer.tsx`)
- Create: `frontend/src/components/spielbogen/ShareLinkModal.tsx`
- Delete: `frontend/src/components/spielbogen/RflSheetDrawer.tsx`
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx:18` und `:933`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Consumes: `BogenLiveFeed` (Task 9), `BogenLineupAccordion` (Task 10), `buildFeed` (Task 8)
- Produces:
  - `createShareLink(bogenId: number): Promise<{ token: string }>`
  - `revokeShareLink(bogenId: number): Promise<void>`
  - `BogenSheetDrawer` mit derselben Prop-Signatur wie `RflSheetDrawer` heute (`open`, `onClose`, `sheet`, `onEndGame`, `onReopenGame`, `onReload`, `onSlotUpdate`)

- [ ] **Step 1: API-Funktionen ergänzen**

In `frontend/src/api/client.ts` bei den übrigen Spielbogen-Funktionen:

```typescript
export function createShareLink(bogenId: number) {
  return request<ShareLinkResponse>(`/spielbogen/${bogenId}/share`, { method: 'POST' })
}

export function revokeShareLink(bogenId: number) {
  return request<void>(`/spielbogen/${bogenId}/share`, { method: 'DELETE' })
}
```

In `frontend/src/types/index.ts`:

```typescript
export interface ShareLinkResponse {
  token: string
}
```

- [ ] **Step 2: Drawer umbauen**

`RflSheetDrawer.tsx` nach `BogenSheetDrawer.tsx` kopieren, dann:

- `SideSheet` und alle `renderCells`/`cellKey`-Importe entfernen. `utils/bogenSheetRenderer.ts` **nicht** löschen — der PDF-Export braucht es weiter.
- `BogenSlotEditModal`-Einbindung behalten, aber vom Gitter an den Aufstellung-Block hängen.
- Im Body: `BogenLiveFeed` mit den Daten aus `sheet`, darunter `BogenLineupAccordion` mit `onEditSlot={setEditingSlot}`.
- Den Feed über `buildFeed` aus `sheet` ableiten, in `useMemo`.
- Footer: bestehende Aktionen behalten, „Link teilen" ergänzen, das `ShareLinkModal` öffnet.

Der HEIM/GAST-Umschalter aus dem Drawer-Kopf (`RflSheetDrawer.tsx:218-240`) entfällt — er lebt jetzt im Aufstellung-Block.

- [ ] **Step 3: ShareLinkModal bauen**

`ShareLinkModal.tsx` auf Basis von `ResponsiveSheet`:

- Beim Öffnen `createShareLink(bogenId)` rufen, Token in State.
- Volle URL zusammensetzen: `${window.location.origin}/live/${token}`.
- Anzeigen, „Kopieren"-Button (`navigator.clipboard.writeText`) mit Toast-Bestätigung.
- „Link zurückziehen" als destruktive Aktion über `ConfirmModal`, danach `revokeShareLink` und Modal schließen.
- Hinweistext: „Jeder mit diesem Link sieht den Spielstand und beide Aufstellungen — auch ohne Login."

- [ ] **Step 4: SpielbogenPage anpassen**

Import in `SpielbogenPage.tsx:18` auf `BogenSheetDrawer` umstellen und die Verwendung bei `:933` entsprechend umbenennen. Props bleiben gleich.

`RflSheetDrawer.tsx` löschen.

- [ ] **Step 5: Verify**

```bash
cd frontend && npm run build
cd frontend && npm run lint
cd frontend && npm test
```

Erwartung: alles grün. Ein Fehler „`renderCells` is declared but never read" bedeutet, dass ein Import stehen geblieben ist.

Dann die App starten und den Drawer öffnen: Feed sichtbar, Aufstellung aufklappbar, Stift öffnet `BogenSlotEditModal`, PDF-Export funktioniert unverändert, „Link teilen" liefert eine URL.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/spielbogen/BogenSheetDrawer.tsx \
        frontend/src/components/spielbogen/ShareLinkModal.tsx \
        frontend/src/components/spielbogen/SpielbogenPage.tsx \
        frontend/src/api/client.ts frontend/src/types/index.ts
git rm frontend/src/components/spielbogen/RflSheetDrawer.tsx
git commit -m "✨ Spielbogen-Drawer zeigt Live-Feed statt RFL-Gitter

Das Gitter war eine PDF-Vorschau — derselbe Renderer wie
spielbogenPdfExport — und half während des Spiels nicht. Gitter lebt
im PDF weiter. Slot-Stift zieht in den Aufstellung-Block."
```

---

### Task 12: Öffentliche Zuschauer-Seite

**Files:**
- Create: `frontend/src/components/public/PublicBogenPage.tsx`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `BogenLiveFeed`, `BogenLineupAccordion`, `buildFeed`
- Produces: `getPublicBogenFeed(token: string): Promise<PublicBogenFeed>`; Route `/live/:token`

- [ ] **Step 1: Auth-freien Client-Pfad ergänzen**

`request<T>` hängt an jeden Aufruf `getAuthHeaders()`. Für den öffentlichen Aufruf braucht es einen eigenen Weg — sonst schickt ein Zuschauer ohne `localStorage.auth` nichts Sinnvolles, und ein eingeloggter Nutzer testet die Seite nie im Zuschauer-Zustand.

In `frontend/src/api/client.ts`:

```typescript
/** Wie request(), aber ohne Auth-Header — für /api/public/**. */
async function publicRequest<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Fehler ${res.status}`)
  }
  return res.json()
}

export function getPublicBogenFeed(token: string) {
  return publicRequest<PublicBogenFeed>(`/public/bogen/${encodeURIComponent(token)}`)
}
```

In `frontend/src/types/index.ts` den passenden Typ ergänzen — Felder exakt wie `PublicBogenFeedResponse` aus Task 6:

```typescript
export interface PublicBogenFeed {
  homeTeamName: string
  awayTeamName: string
  date: string
  location: string | null
  status: 'DRAFT' | 'LIVE' | 'DONE'
  currentInning: number
  currentSide: BogenSide
  homeRuns: number
  awayRuns: number
  homeLineup: SpielbogenSlotResponse[]
  awayLineup: SpielbogenSlotResponse[]
  homeAtBats: SpielbogenAtBatResponse[]
  awayAtBats: SpielbogenAtBatResponse[]
  stealingEvents: SpielbogenStealingResponse[]
  substitutions: SpielbogenSubstitutionResponse[]
  inningRuns: Record<number, { home: number; away: number }>
  homeTotals: BogenTeamTotals
  awayTotals: BogenTeamTotals
}
```

- [ ] **Step 2: Seite bauen**

`frontend/src/components/public/PublicBogenPage.tsx`:

- `useParams()` liefert den Token.
- Laden per `getPublicBogenFeed`, Feed per `buildFeed`.
- Polling alle 10 s, **nur** solange `status === 'LIVE'`. Bei `DONE` einmal laden und Intervall abräumen.
- Polling pausieren, wenn der Tab versteckt ist (`document.visibilityState`, Listener auf `visibilitychange`), und beim Zurückkehren sofort einmal laden.
- Netzfehler beim Nachladen: letzten Stand stehen lassen, Hinweisleiste „Verbindung unterbrochen — letzter Stand von HH:MM", weiter versuchen.
- 404 beim ersten Laden: ganzseitig „Dieser Link ist nicht mehr gültig."
- Kein `Layout`, keine Navigation, kein Auth-Guard. `BogenLineupAccordion` **ohne** `onEditSlot`.
- Kopfzeile mit Datum und Ort, damit man weiß, welches Spiel man sieht.

- [ ] **Step 3: Route eintragen**

In `App.tsx` neben den anderen Routen außerhalb von `Layout` (bei `/spielbogen/:id`, Zeile 75):

```tsx
const PublicBogenPage = lazy(() => import('@/components/public/PublicBogenPage'))
```

```tsx
  { path: '/live/:token', element: <Suspense fallback={<LoadingSkeleton />}><PublicBogenPage /></Suspense>, errorElement: <ChunkErrorBoundary /> },
```

`navigateFallbackDenylist` in `vite.config.ts` muss nicht angefasst werden — dort stehen `/api`, `/drills`, `/actuator`, und `/live/**` soll bewusst von der SPA bedient werden.

- [ ] **Step 4: Verify**

```bash
cd frontend && npm run build
cd frontend && npm run lint
cd frontend && npm test
```

Dann manuell mit laufendem Backend: im Drawer „Link teilen", URL in einem privaten Fenster öffnen (kein `localStorage.auth`) — die Seite muss ohne Login laden. Danach den Link zurückziehen und dieselbe URL neu laden: „Dieser Link ist nicht mehr gültig."

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/public/PublicBogenPage.tsx \
        frontend/src/api/client.ts frontend/src/types/index.ts frontend/src/App.tsx
git commit -m "✨ Öffentliche Zuschauer-Seite unter /live/:token

Eigener auth-freier Client-Pfad, weil request() sonst an jeden Aufruf
den Basic-Auth-Header hängt. Polling nur solange LIVE und der Tab
sichtbar ist."
```

---

### Task 13: Dokumentation nachziehen

**Files:**
- Modify: `docs/SPIELBOGEN.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: `docs/SPIELBOGEN.md` ergänzen**

Abschnitt zu Live-Feed und öffentlichem Link: `BogenLiveFeed`, `BogenLineupAccordion`, `BogenSheetDrawer` (ehemals `RflSheetDrawer`), `utils/bogenFeed.ts`, `PublicBogenPage`. Festhalten, dass das RFL-Gitter nur noch im PDF-Export existiert und `utils/bogenSheetRenderer.ts` deshalb bleibt. Die Error-Zuordnung zur feldenden Mannschaft als Fallstrick aufnehmen.

- [ ] **Step 2: `CLAUDE.md` ergänzen**

Im Abschnitt „Auth & deployment" festhalten, dass neben `/api/calendar.ics` jetzt auch `/api/public/**` ohne Auth erreichbar ist, abgesichert über einen zufälligen Token pro Spielbogen.

- [ ] **Step 3: Commit**

```bash
git add docs/SPIELBOGEN.md CLAUDE.md
git commit -m "📝 Doku: Live-Feed und öffentlicher Zuschauer-Link"
```

---

## Abschlussprüfung vor dem Merge

- [ ] `cd backend && ./mvnw test -s .mvn/local-settings.xml` — alles grün
- [ ] `cd frontend && npm run build` — `tsc -b` und Vite-Build ohne Fehler
- [ ] `cd frontend && npm test` — alle vitest-Suites grün
- [ ] `cd frontend && npm run lint` — keine Fehler
- [ ] `docker compose up -d db && cd frontend && npm run test:e2e` — 43 Playwright-Tests grün. Die Suite deckt die Legacy-`ScoringPage` ab, nicht den Spielbogen; sie ist hier keine echte Absicherung, aber `ResponsiveSheet` wurde angefasst und wird von `ScoringPage` mitbenutzt.
- [ ] Sheets aus Task 7 durchgeklickt, nichts abgeschnitten
- [ ] Öffentlicher Link in einem privaten Fenster geprüft, danach zurückgezogen und 404 bestätigt
- [ ] Linescore-Summen stimmen mit dem Scoreboard überein — auch in einem Spiel mit einem Steal nach Hause
