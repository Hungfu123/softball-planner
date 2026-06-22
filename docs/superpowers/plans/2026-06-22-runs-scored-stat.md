# Runs Scored (R) Batting-Stat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Batting-Statistik **R (Runs Scored)** pro Spieler — wie oft ein Spieler selbst Home gekreuzt hat (inkl. Steal of Home), in der Stats-Tabelle + PDF.

**Architecture:** Cascade-/Replay-Logik aus `GameScoringService` (Application) in einen neuen Pure-Domain-Service `BaseRunningReplay` extrahieren. Der Replay attribuiert jeden Home-Crossing einer Player-ID (Steals exakt, Batting-Runs via Base-State-Diff gedeckelt auf `runsScored`, Inning-Reset gegen gestrandete Runner). `GameScoringService` (Score) und `BattingStatsCalculator` (R) nutzen dieselbe Quelle.

**Tech Stack:** Java 21, Spring Boot, JUnit 5, React 19 + TypeScript, jsPDF, Playwright.

## Global Constraints

- Onion-Architektur: `domain` kennt kein Spring/JPA/DTO. `BaseRunningReplay` liegt in `domain/service/`, pure, kein I/O. (verbatim aus CLAUDE.md)
- Keine DB-Migration — R ist abgeleitet (kein `ddl-auto`-Konflikt).
- Maven IMMER mit `-s .mvn/local-settings.xml`. `~/.m2/settings.xml` nicht anfassen.
- Commits: gitmoji conventional, **kein `Co-Authored-By`**.
- Live-Scoring-Änderung → **E2E-Suite Pflicht** vor Merge: `cd frontend && npm run test:e2e` (Docker-DB laufen lassen).
- Tailwind v4: `lg:`-Klassen, keine arbitrary brackets. German UI throughout.
- Branch: `feat/runs-scored-stat` (bereits angelegt).

---

### Task 1: Domain-Service `BaseRunningReplay` (Cascade verschoben + R-Attribution)

**Files:**
- Create: `backend/src/main/java/com/softball/domain/service/BaseRunningReplay.java`
- Test: `backend/src/test/java/com/softball/domain/service/BaseRunningReplayTest.java`

**Interfaces:**
- Consumes: `AtBat`, `BaseRunningEvent`, `BaseState`, `AtBatResult`, `BaseRunningEventType` (alle `domain.model`).
- Produces:
  - `record StealApplication(BaseState state, int runs, Long scorerId)`
  - `record ReplayResult(int totalStealRuns, java.util.Map<Long,Integer> runsByPlayerId)`
  - `StealApplication applyStealingEvent(BaseState state, BaseRunningEvent e)` — public (von GameScoringService genutzt)
  - `ReplayResult replay(List<AtBat> atBats, List<BaseRunningEvent> steals)`

- [ ] **Step 1: Write the failing test**

```java
// backend/src/test/java/com/softball/domain/service/BaseRunningReplayTest.java
package com.softball.domain.service;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.BaseRunningEventType;
import com.softball.domain.model.BaseState;
import com.softball.domain.model.Player;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BaseRunningReplayTest {

    private final BaseRunningReplay replay = new BaseRunningReplay();

    private Player player(long id) {
        final Player p = new Player();
        p.setId(id);
        p.setName("P" + id);
        return p;
    }

    private AtBat ab(long batterId, AtBatResult result, int inning,
                     BaseState after, int runsScored, Instant t) {
        final AtBat a = new AtBat();
        a.setBatter(player(batterId));
        a.setResult(result);
        a.setInning(inning);
        a.setBaseStateAfter(after);
        a.setRunsScored(runsScored);
        a.setCreatedAt(t);
        return a;
    }

    private BaseRunningEvent steal(long runnerId, int inning, BaseRunningEventType type, Instant t) {
        final BaseRunningEvent e = new BaseRunningEvent(null, player(runnerId), inning, type);
        e.setCreatedAt(t);
        return e;
    }

    @Test
    void homerun_basesLoaded_scores4_batterAndThreeRunners() {
        // before: 1B=11, 2B=12, 3B=13 (geladen via vorherigem AB), dann HR von 10
        final Instant t0 = Instant.parse("2026-06-22T10:00:00Z");
        final Instant t1 = t0.plusSeconds(1);
        final List<AtBat> abs = List.of(
            // AB1 lädt Bases (Batter 99 single, danach State zeigt 1B=11/2B=12/3B=13 als Vereinfachung)
            ab(99, AtBatResult.SINGLE, 1, new BaseState(11L, 12L, 13L), 0, t0),
            // AB2: HR von 10, alle scoren, baseStateAfter leer, runsScored=4
            ab(10, AtBatResult.HOMERUN, 1, BaseState.empty(), 4, t1)
        );
        final ReplayResult r = replay.replay(abs, List.of());
        assertThat(r.runsByPlayerId()).containsEntry(10L, 1).containsEntry(11L, 1)
            .containsEntry(12L, 1).containsEntry(13L, 1);
        assertThat(r.totalStealRuns()).isZero();
    }

    @Test
    void single_runnerFrom3bScores_batterDoesNot() {
        final Instant t0 = Instant.parse("2026-06-22T10:00:00Z");
        final Instant t1 = t0.plusSeconds(1);
        final List<AtBat> abs = List.of(
            ab(99, AtBatResult.SINGLE, 1, new BaseState(null, null, 13L), 0, t0),
            // Batter 10 single, 3B-Runner 13 scort, Batter landet 1B
            ab(10, AtBatResult.SINGLE, 1, new BaseState(10L, null, null), 1, t1)
        );
        final ReplayResult r = replay.replay(abs, List.of());
        assertThat(r.runsByPlayerId()).containsEntry(13L, 1);
        assertThat(r.runsByPlayerId().getOrDefault(10L, 0)).isZero();
    }

    @Test
    void stealOfHome_scoresRunner() {
        final Instant t0 = Instant.parse("2026-06-22T10:00:00Z");
        final Instant t1 = t0.plusSeconds(1);
        final List<AtBat> abs = List.of(
            ab(99, AtBatResult.SINGLE, 1, new BaseState(null, null, 13L), 0, t0)
        );
        final List<BaseRunningEvent> steals = List.of(
            steal(13L, 1, BaseRunningEventType.STOLEN_BASE, t1)
        );
        final ReplayResult r = replay.replay(abs, steals);
        assertThat(r.runsByPlayerId()).containsEntry(13L, 1);
        assertThat(r.totalStealRuns()).isEqualTo(1);
    }

    @Test
    void doubleStealCascade_runnerFrom3bScores() {
        // 1B=11, 2B=12, 3B=13; 11 klaut 2B → 12→3B, 13→Home
        final Instant t0 = Instant.parse("2026-06-22T10:00:00Z");
        final Instant t1 = t0.plusSeconds(1);
        final List<AtBat> abs = List.of(
            ab(99, AtBatResult.SINGLE, 1, new BaseState(11L, 12L, 13L), 0, t0)
        );
        final List<BaseRunningEvent> steals = List.of(
            steal(11L, 1, BaseRunningEventType.STOLEN_BASE, t1)
        );
        final ReplayResult r = replay.replay(abs, steals);
        assertThat(r.runsByPlayerId()).containsEntry(13L, 1);
        assertThat(r.totalStealRuns()).isEqualTo(1);
    }

    @Test
    void forceOutThirdOut_noRun_runnerGoneButRunsScoredZero() {
        final Instant t0 = Instant.parse("2026-06-22T10:00:00Z");
        final Instant t1 = t0.plusSeconds(1);
        final List<AtBat> abs = List.of(
            ab(99, AtBatResult.SINGLE, 1, new BaseState(11L, null, null), 0, t0),
            // OUT, Runner 11 verschwindet (force out), runsScored=0
            ab(10, AtBatResult.OUT, 1, BaseState.empty(), 0, t1)
        );
        final ReplayResult r = replay.replay(abs, List.of());
        assertThat(r.runsByPlayerId().getOrDefault(11L, 0)).isZero();
    }

    @Test
    void inningBoundary_strandedRunnerDoesNotScore() {
        final Instant t0 = Instant.parse("2026-06-22T10:00:00Z");
        final Instant t1 = t0.plusSeconds(1);
        final List<AtBat> abs = List.of(
            // Inning 1: Runner 11 strandet auf 3B (baseStateAfter zeigt ihn noch)
            ab(99, AtBatResult.SINGLE, 1, new BaseState(null, null, 11L), 0, t0),
            // Inning 2: neuer AB, Batter 10 single ohne Runner. stateBefore muss leer sein → 11 scort NICHT
            ab(10, AtBatResult.SINGLE, 2, new BaseState(10L, null, null), 0, t1)
        );
        final ReplayResult r = replay.replay(abs, List.of());
        assertThat(r.runsByPlayerId().getOrDefault(11L, 0)).isZero();
    }

    @Test
    void scoreConsistency_sumOfRunsByPlayerEqualsAbRunsPlusStealRuns() {
        final Instant t0 = Instant.parse("2026-06-22T10:00:00Z");
        final Instant t1 = t0.plusSeconds(1);
        final Instant t2 = t0.plusSeconds(2);
        final List<AtBat> abs = List.of(
            ab(99, AtBatResult.SINGLE, 1, new BaseState(null, null, 13L), 0, t0),
            ab(10, AtBatResult.HOMERUN, 1, BaseState.empty(), 1, t1)  // solo HR, batter 10
        );
        final List<BaseRunningEvent> steals = List.of(
            steal(13L, 1, BaseRunningEventType.STOLEN_BASE, t2) // 13 steals home AFTER hr → 1 run
        );
        final ReplayResult r = replay.replay(abs, steals);
        final int abRuns = abs.stream().mapToInt(a -> a.getRunsScored() == null ? 0 : a.getRunsScored()).sum();
        final int sumByPlayer = r.runsByPlayerId().values().stream().mapToInt(Integer::intValue).sum();
        assertThat(sumByPlayer).isEqualTo(abRuns + r.totalStealRuns());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BaseRunningReplayTest`
Expected: FAIL — `cannot find symbol: class BaseRunningReplay` (Compile-Fehler).

- [ ] **Step 3: Write minimal implementation**

```java
// backend/src/main/java/com/softball/domain/service/BaseRunningReplay.java
package com.softball.domain.service;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.BaseRunningEventType;
import com.softball.domain.model.BaseState;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure Domain-Service: chronologischer Replay über AtBats + Stealing-Events.
 * Liefert (a) die Summe der Steal-Runs (Steal of Home + Kaskade) und (b) die
 * Zuordnung jedes erzielten Runs zu der Player-ID, die Home gekreuzt hat (R-Stat).
 *
 * Steals werden exakt attribuiert (die Cascade kennt den scorenden Runner).
 * Batting-Runs werden per Base-State-Diff (stateBefore → baseStateAfter) abgeleitet,
 * gedeckelt auf {@code AtBat.runsScored}; bei Mehrdeutigkeit scort der heimnächste
 * Runner zuerst (3B vor 2B vor 1B vor Batter).
 *
 * Einzige Quelle der Steal-Cascade-Logik — genutzt von GameScoringService (Score)
 * und BattingStatsCalculator (R).
 */
public class BaseRunningReplay {

    /** Ergebnis einer Stealing-Event-Anwendung: neuer State, dabei erzielte Runs, scorende Player-ID. */
    public record StealApplication(BaseState state, int runs, Long scorerId) {}

    /** Gesamtergebnis des Replays. */
    public record ReplayResult(int totalStealRuns, Map<Long, Integer> runsByPlayerId) {}

    public ReplayResult replay(final List<AtBat> atBats, final List<BaseRunningEvent> steals) {
        final List<Object> timeline = new ArrayList<>(atBats.size() + steals.size());
        timeline.addAll(atBats);
        timeline.addAll(steals);
        timeline.sort(Comparator
            .comparing((Object o) -> o instanceof AtBat ab ? ab.getCreatedAt()
                                                           : ((BaseRunningEvent) o).getCreatedAt(),
                       Comparator.nullsFirst(Comparator.naturalOrder()))
            // Gleichstand: AtBat vor Steal (Steal wirkt auf den frisch gesetzten State).
            .thenComparing(o -> o instanceof AtBat ? 0 : 1));

        final Map<Long, Integer> runsByPlayer = new HashMap<>();
        int totalStealRuns = 0;
        BaseState state = BaseState.empty();
        Integer prevInning = null;

        for (final Object o : timeline) {
            if (o instanceof AtBat ab) {
                final int inning = ab.getInning() != null ? ab.getInning() : 1;
                // Inning-Reset: gestrandete Runner des Vor-Innings scoren nicht.
                final BaseState before = (prevInning != null && inning > prevInning)
                    ? BaseState.empty() : state;
                attributeBattingRuns(ab, before, runsByPlayer);
                state = ab.getBaseStateAfter() != null ? ab.getBaseStateAfter() : BaseState.empty();
                prevInning = inning;
            } else {
                final StealApplication app = applyStealingEvent(state, (BaseRunningEvent) o);
                state = app.state();
                totalStealRuns += app.runs();
                if (app.scorerId() != null) {
                    runsByPlayer.merge(app.scorerId(), 1, Integer::sum);
                }
            }
        }
        return new ReplayResult(totalStealRuns, runsByPlayer);
    }

    private void attributeBattingRuns(final AtBat ab, final BaseState before,
                                      final Map<Long, Integer> runsByPlayer) {
        final int scored = ab.getRunsScored() != null ? ab.getRunsScored() : 0;
        if (scored == 0) return;

        final BaseState after = ab.getBaseStateAfter() != null ? ab.getBaseStateAfter() : BaseState.empty();
        final List<Long> afterIds = new ArrayList<>();
        if (after.first() != null) afterIds.add(after.first());
        if (after.second() != null) afterIds.add(after.second());
        if (after.third() != null) afterIds.add(after.third());

        // Kandidaten in Heim-Nähe-Reihenfolge: 3B, 2B, 1B, dann Batter (falls erreicht).
        final List<Long> candidates = new ArrayList<>();
        if (before.third() != null) candidates.add(before.third());
        if (before.second() != null) candidates.add(before.second());
        if (before.first() != null) candidates.add(before.first());
        if (ab.getResult() != null && ab.getResult().reachedBase() && ab.getBatter() != null) {
            candidates.add(ab.getBatter().getId());
        }

        // "Verschwunden" = Kandidat steht nicht mehr auf einer Base → scored oder out.
        final List<Long> gone = new ArrayList<>();
        for (final Long id : candidates) {
            if (!afterIds.contains(id)) gone.add(id);
        }

        // Die ersten `scored` Verschwundenen (heimnächste zuerst) = Scorer.
        final int take = Math.min(scored, gone.size());
        for (int i = 0; i < take; i++) {
            runsByPlayer.merge(gone.get(i), 1, Integer::sum);
        }
    }

    /**
     * Wendet ein einzelnes Stealing-Event auf den Base-State an. Verschoben aus
     * GameScoringService (verbatim) + um {@code scorerId} erweitert.
     */
    public StealApplication applyStealingEvent(final BaseState state, final BaseRunningEvent e) {
        if (e.getRunner() == null) return new StealApplication(state, 0, null);
        final Long runnerId = e.getRunner().getId();
        if (e.getType() == BaseRunningEventType.STOLEN_BASE) {
            if (runnerId.equals(state.first())) {
                final Long on2B = state.second();
                final Long on3B = state.third();
                Long newThird = on3B;
                int runs = 0;
                Long scorer = null;
                if (on2B != null) {
                    if (on3B != null) { runs = 1; scorer = on3B; } // 3B-Runner scort Home
                    newThird = on2B;
                }
                return new StealApplication(new BaseState(null, runnerId, newThird), runs, scorer);
            } else if (runnerId.equals(state.second())) {
                final boolean scores = state.third() != null;
                return new StealApplication(new BaseState(state.first(), null, runnerId),
                    scores ? 1 : 0, scores ? state.third() : null);
            } else if (runnerId.equals(state.third())) {
                // Steal of Home — Runner scort.
                return new StealApplication(new BaseState(state.first(), state.second(), null), 1, runnerId);
            }
            return new StealApplication(state, 0, null);
        }
        if (e.getType() == BaseRunningEventType.CAUGHT_STEALING
                || e.getType() == BaseRunningEventType.OUT_ON_PLAY
                || e.getType() == BaseRunningEventType.PICKOFF) {
            if (runnerId.equals(state.first())) {
                return new StealApplication(new BaseState(null, state.second(), state.third()), 0, null);
            } else if (runnerId.equals(state.second())) {
                return new StealApplication(new BaseState(state.first(), null, state.third()), 0, null);
            } else if (runnerId.equals(state.third())) {
                return new StealApplication(new BaseState(state.first(), state.second(), null), 0, null);
            }
        }
        return new StealApplication(state, 0, null);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BaseRunningReplayTest`
Expected: PASS (7 Tests grün).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/BaseRunningReplay.java \
        backend/src/test/java/com/softball/domain/service/BaseRunningReplayTest.java
git commit -m "✨ Domain: BaseRunningReplay — Run-Attribution pro Spieler (Steals exakt, Batting via Base-State-Diff)"
```

---

### Task 2: `GameScoringService` an `BaseRunningReplay` delegieren (Duplikat entfernen)

**Files:**
- Modify: `backend/src/main/java/com/softball/application/GameScoringService.java`

**Interfaces:**
- Consumes: `BaseRunningReplay.applyStealingEvent(...)`, `BaseRunningReplay.replay(...).totalStealRuns()` aus Task 1.
- Produces: unverändertes externes Verhalten (`getScoreboard`, `computeLiveScoreUs`, `computeStealRuns`).

- [ ] **Step 1: Feld + Import ergänzen**

In `GameScoringService` ein Replay-Feld anlegen (pure Domain, wie der bestehende Calculator-Stil):

```java
import com.softball.domain.service.BaseRunningReplay;
// ... in der Klasse, bei den Feldern:
private final BaseRunningReplay baseRunningReplay = new BaseRunningReplay();
```

- [ ] **Step 2: `getScoreboard` — Single-Step-Aufruf umbiegen**

Ersetze in `getScoreboard` (Fold-in-Schleife, ~Zeile 383) den Aufruf der bisher privaten Methode:

```java
                state = baseRunningReplay.applyStealingEvent(state, e).state();
```

- [ ] **Step 3: `computeStealRuns` auf Delegation reduzieren**

Ersetze den kompletten Body von `computeStealRuns(...)` durch Delegation und **lösche** die privaten Member `applyStealingEvent(...)`, das record `StealApplication` und die alte Replay-Schleife:

```java
    private int computeStealRuns(final List<AtBat> atBats, final List<BaseRunningEvent> stealingEvents) {
        return baseRunningReplay.replay(atBats, stealingEvents).totalStealRuns();
    }
```

Entfernte Elemente (alle in `GameScoringService`): `private record StealApplication(...)`, `private StealApplication applyStealingEvent(...)`, sowie der alte Schleifen-Body von `computeStealRuns`. `computeLiveScoreUs` ruft `computeStealRuns` weiter auf — unverändert.

- [ ] **Step 4: Backend-Build + GameScoringService-Tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GameScoringServiceTest`
Expected: PASS — unverändertes Score-/Scoreboard-Verhalten (Logik nur verschoben).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/GameScoringService.java
git commit -m "♻️ GameScoringService nutzt BaseRunningReplay (Cascade-Duplikat entfernt)"
```

---

### Task 3: `BattingStats.runs` + `BattingStatsCalculator` befüllt R

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/BattingStats.java`
- Modify: `backend/src/main/java/com/softball/domain/service/BattingStatsCalculator.java`
- Test: `backend/src/test/java/com/softball/domain/service/BattingStatsCalculatorTest.java`

**Interfaces:**
- Consumes: `BaseRunningReplay.replay(...).runsByPlayerId()` aus Task 1.
- Produces: `BattingStats` mit neuem `int runs` (Position direkt nach `homeRuns`). `calculateForPlayer(player, atBats, steals, runs)` — neuer `int runs`-Parameter.

- [ ] **Step 1: Failing test — R wird gesetzt**

Ergänze in `BattingStatsCalculatorTest` einen Test (Pattern: bestehende Tests dort prüfen). Da der Calculator den Replay intern nutzt, wird R über die AtBat-Base-States geprüft:

```java
    @Test
    void runsScored_attributedToRunnerWhoCrossedHome() {
        final Player batter = new Player(); batter.setId(10L); batter.setName("Batter");
        final Player runner = new Player(); runner.setId(13L); runner.setName("Runner");

        final java.time.Instant t0 = java.time.Instant.parse("2026-06-22T10:00:00Z");
        final AtBat a1 = new AtBat();
        a1.setBatter(runner); a1.setResult(AtBatResult.SINGLE); a1.setInning(1);
        a1.setBaseStateAfter(new BaseState(null, null, 13L)); a1.setRunsScored(0); a1.setCreatedAt(t0);
        final AtBat a2 = new AtBat();
        a2.setBatter(batter); a2.setResult(AtBatResult.SINGLE); a2.setInning(1);
        a2.setBaseStateAfter(new BaseState(10L, null, null)); a2.setRunsScored(1);
        a2.setCreatedAt(t0.plusSeconds(1));

        final var stats = new BattingStatsCalculator()
            .calculateForPlayers(List.of(batter, runner), List.of(a1, a2), List.of());
        final BattingStats runnerStats = stats.stream().filter(s -> s.playerId() == 13L).findFirst().orElseThrow();
        final BattingStats batterStats = stats.stream().filter(s -> s.playerId() == 10L).findFirst().orElseThrow();
        assertThat(runnerStats.runs()).isEqualTo(1);
        assertThat(batterStats.runs()).isZero();
    }
```

(Imports falls nötig: `com.softball.domain.model.AtBat`, `BaseState`, `BattingStats`, `java.util.List`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BattingStatsCalculatorTest#runsScored_attributedToRunnerWhoCrossedHome`
Expected: FAIL — `BattingStats` hat keine Methode `runs()` (Compile-Fehler).

- [ ] **Step 3: `runs` zum Record hinzufügen**

In `BattingStats.java` das Feld `int runs` **direkt nach `int homeRuns`** einfügen:

```java
public record BattingStats(
    Long playerId,
    String playerName,
    int plateAppearances,
    int atBats,
    int hits,
    int singles,
    int doubles,
    int triples,
    int homeRuns,
    int runs,
    int walks,
    int hitByPitch,
    int strikeouts,
    int outs,
    int reachedOnError,
    int stolenBases,
    int caughtStealing,
    int pickoffs,
    int runsBattedIn,
    int totalBases,
    BigDecimal battingAverage,
    BigDecimal onBasePct,
    BigDecimal sluggingPct,
    boolean qualified
) {
    public BigDecimal ops() {
        return onBasePct.add(sluggingPct).setScale(3, RoundingMode.HALF_UP);
    }
}
```

- [ ] **Step 4: Calculator — Replay nutzen + `runs` durchreichen**

In `BattingStatsCalculator.java`:

1. Feld ergänzen: `private final BaseRunningReplay baseRunningReplay = new BaseRunningReplay();`
2. In `calculateForPlayers` den Replay einmal laufen lassen und R pro Spieler durchreichen:

```java
    public List<BattingStats> calculateForPlayers(final List<Player> players,
                                                   final List<AtBat> atBats,
                                                   final List<BaseRunningEvent> stealingEvents) {
        final Map<Long, List<AtBat>> atBatsByPlayer = new HashMap<>();
        for (final AtBat ab : atBats) {
            if (ab.getBatter() == null) continue;
            atBatsByPlayer.computeIfAbsent(ab.getBatter().getId(), k -> new java.util.ArrayList<>()).add(ab);
        }

        final Map<Long, List<BaseRunningEvent>> stealsByPlayer = new HashMap<>();
        for (final BaseRunningEvent e : stealingEvents) {
            if (e.getRunner() == null) continue;
            stealsByPlayer.computeIfAbsent(e.getRunner().getId(), k -> new java.util.ArrayList<>()).add(e);
        }

        final Map<Long, Integer> runsByPlayer = baseRunningReplay.replay(atBats, stealingEvents).runsByPlayerId();

        return players.stream()
            .map(p -> calculateForPlayer(p,
                atBatsByPlayer.getOrDefault(p.getId(), List.of()),
                stealsByPlayer.getOrDefault(p.getId(), List.of()),
                runsByPlayer.getOrDefault(p.getId(), 0)))
            .toList();
    }
```

3. `calculateForPlayer` um `final int runs`-Parameter erweitern und im `BattingStats`-Konstruktor an Position nach `homeRuns` einsetzen:

```java
    public BattingStats calculateForPlayer(final Player player,
                                            final List<AtBat> playerAtBats,
                                            final List<BaseRunningEvent> playerStealingEvents,
                                            final int runs) {
        // ... unveränderter Body bis zum return ...
        return new BattingStats(
            player.getId(), player.getName(),
            plateAppearances, atBats, hits,
            singles, doubles, triples, homeRuns,
            runs,
            walks, hbp, strikeouts, outs,
            reachedOnError,
            stolenBases, caughtStealing, pickoffs, rbi, totalBases,
            ba, obp, slg,
            atBats >= QUALIFIED_MIN_AT_BATS
        );
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BattingStatsCalculatorTest`
Expected: PASS (neuer + bestehende Tests). Falls bestehende Tests `calculateForPlayer(...)` direkt mit 3 Args aufrufen → auf 4 Args (`, 0`) anpassen.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/BattingStats.java \
        backend/src/main/java/com/softball/domain/service/BattingStatsCalculator.java \
        backend/src/test/java/com/softball/domain/service/BattingStatsCalculatorTest.java
git commit -m "✨ BattingStats.runs (R) — Calculator attribuiert Runs via BaseRunningReplay"
```

---

### Task 4: DTO `PlayerBattingStatsResponse.runs`

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/PlayerBattingStatsResponse.java`

**Interfaces:**
- Consumes: `BattingStats.runs()` aus Task 3.
- Produces: JSON-Feld `runs` im `/batting-stats`-Endpoint-Response.

- [ ] **Step 1: `runs` ins Record + Mapping**

Feld `int runs` direkt nach `int homeRuns` ins Record, und im `from(...)` `s.runs()` an gleicher Position:

```java
public record PlayerBattingStatsResponse(
    Long playerId,
    String playerName,
    int plateAppearances,
    int atBats,
    int hits,
    int singles,
    int doubles,
    int triples,
    int homeRuns,
    int runs,
    int walks,
    int hitByPitch,
    int strikeouts,
    int outs,
    int reachedOnError,
    int stolenBases,
    int caughtStealing,
    int pickoffs,
    int runsBattedIn,
    int totalBases,
    BigDecimal battingAverage,
    BigDecimal onBasePct,
    BigDecimal sluggingPct,
    BigDecimal ops,
    boolean qualified
) {
    public static PlayerBattingStatsResponse from(final BattingStats s) {
        return new PlayerBattingStatsResponse(
            s.playerId(), s.playerName(),
            s.plateAppearances(), s.atBats(), s.hits(),
            s.singles(), s.doubles(), s.triples(), s.homeRuns(),
            s.runs(),
            s.walks(), s.hitByPitch(), s.strikeouts(), s.outs(),
            s.reachedOnError(),
            s.stolenBases(), s.caughtStealing(), s.pickoffs(), s.runsBattedIn(), s.totalBases(),
            s.battingAverage(), s.onBasePct(), s.sluggingPct(), s.ops(),
            s.qualified()
        );
    }
}
```

- [ ] **Step 2: Backend kompiliert + alle Tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS (gesamte Backend-Suite, Testcontainers — Docker muss laufen).

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/PlayerBattingStatsResponse.java
git commit -m "✨ DTO: runs (R) im PlayerBattingStatsResponse"
```

---

### Task 5: Frontend — Type + R-Spalte in `BattingStatsTable`

**Files:**
- Modify: `frontend/src/types/index.ts:424-449`
- Modify: `frontend/src/components/stats/BattingStatsTable.tsx`

**Interfaces:**
- Consumes: JSON-Feld `runs` aus Task 4.
- Produces: sichtbare, sortierbare R-Spalte.

- [ ] **Step 1: Type ergänzen**

In `frontend/src/types/index.ts` im Interface `PlayerBattingStatsResponse` nach `homeRuns: number` einfügen:

```typescript
  homeRuns: number
  runs: number
```

- [ ] **Step 2: SortKey erweitern**

In `BattingStatsTable.tsx` die `SortKey`-Union um `'runs'` ergänzen:

```typescript
type SortKey =
  | 'playerName' | 'atBats' | 'hits' | 'battingAverage' | 'walks' | 'strikeouts'
  | 'homeRuns' | 'runs' | 'stolenBases' | 'caughtStealing' | 'pickoffs'
  | 'onBasePct' | 'sluggingPct' | 'ops' | 'runsBattedIn' | 'rbiPerGame'
```

- [ ] **Step 3: Header-Spalte "R" (nach HR)**

Im `<thead>` direkt nach `{sortTh('homeRuns', 'HR')}` einfügen:

```tsx
                {sortTh('runs', 'R', { title: 'Runs Scored — selbst Home gekreuzt' })}
```

- [ ] **Step 4: Body-Zelle (nach HR-Zelle)**

Im `<tbody>`, direkt nach der HR-`<td>` (die mit `s.homeRuns > 0 ? ...` endet) einfügen:

```tsx
                    <td className={`px-3 py-2 text-right font-display tabular-nums font-bold ${s.runs > 0 ? 'text-navy-900' : 'text-gray-300'}`}>{s.runs}</td>
```

- [ ] **Step 5: Build + Lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: tsc grün (R-Spalte typisiert), keine ESLint-Fehler.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/components/stats/BattingStatsTable.tsx
git commit -m "✨ FE: R-Spalte (Runs Scored) in BattingStatsTable, sortierbar"
```

---

### Task 6: PDF — R-Spalte in `statsPdf`

**Files:**
- Modify: `frontend/src/utils/statsPdf.ts`

**Interfaces:**
- Consumes: `runs` aus Task 4/5.
- Produces: R-Spalte im exportierten Stats-PDF.

- [ ] **Step 1: Header-Array — 'R' nach 'HR'**

In `statsPdf.ts` das `head`-Array: `'HR'` → `'HR', 'R'`:

```typescript
  const head = [[
    '#', 'Spieler', 'PA', 'AB', 'H', 'AVG', '1B', '2B', '3B', 'HR', 'R',
    'BB', 'HBP', 'K', 'SB', 'CS', 'PO', 'RBI', 'OBP', 'SLG', 'OPS',
  ]]
```

- [ ] **Step 2: Body-Row — `String(s.runs)` nach `String(s.homeRuns)`**

```typescript
    String(s.homeRuns),
    String(s.runs),
```

- [ ] **Step 3: columnStyles re-indizieren**

Durch die neue Spalte (Index 10) verschieben sich die Indizes ab `BB` um +1. Die `columnStyles` von Index 10..19 um eins nach hinten schieben und Index 10 (R) wie ein Counting-Stat stylen. Neuer Block (ersetzt die bestehenden Indizes 10–19):

```typescript
      10: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // R
      11: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // BB
      12: { cellWidth: 7.5, halign: 'right', font: 'courier' },   // HBP
      13: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // K
      14: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // SB
      15: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // CS
      16: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // PO
      17: { cellWidth: 7.5, halign: 'right', font: 'courier' },   // RBI
      18: { cellWidth: 8.5, halign: 'right', font: 'courier' },   // OBP
      19: { cellWidth: 9.5, halign: 'right', font: 'courier' },   // SLG
      20: { cellWidth: 9.5, halign: 'right', fontStyle: 'bold', font: 'courier' }, // OPS
```

(Indizes 0–9 bleiben unverändert.)

- [ ] **Step 4: Legende ergänzen**

Im `legend`-String nach `HR Home Runs`-Äquivalent ein `R Runs Scored` einbauen — konkret nach `H Hits ·` ein ` R Runs Scored ·` ergänzen:

```typescript
  const legend = 'PA Plate Appearances · AB At Bats · H Hits · R Runs Scored · AVG Batting Average · BB Walks · HBP Hit by Pitch · K Strikeouts · SB Stolen Bases · CS Caught Stealing · PO Pickoffs · RBI Runs Batted In · OBP On-Base · SLG Slugging · OPS OBP + SLG'
```

- [ ] **Step 5: Build**

Run: `cd frontend && npm run build`
Expected: tsc grün.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/statsPdf.ts
git commit -m "✨ FE: R-Spalte im Stats-PDF + Legende"
```

---

### Task 7: E2E — R-Spalte rendert + Sortierung (UI-Durchstich)

**Files:**
- Create: `frontend/e2e/scoring/scoring-runs-stat.spec.ts`

**Interfaces:**
- Consumes: `seedAtBat` (helpers/api.ts), `scoringPage`-Fixture (gameId, playerIds), `/stats?scope=game&game=<id>`-Route, R-Spalte aus Task 5.
- Produces: keiner (Endpunkt-Test).

- [ ] **Step 1: Spec schreiben**

```typescript
// frontend/e2e/scoring/scoring-runs-stat.spec.ts
import { test, expect } from '../helpers/fixtures'
import { seedAtBat } from '../helpers/api'

/**
 * UI-Durchstich für die R-Spalte (Runs Scored). Korrektheit der Attribution
 * liegt in BaseRunningReplayTest (Backend); hier nur: Spalte rendert, Wert
 * stimmt, Sortierung nach R funktioniert.
 */
test.describe('Stats — R (Runs Scored) Spalte', () => {
  test('R-Spalte rendert, Wert stimmt und ist sortierbar @smoke', async ({ page, scoringPage }) => {
    const [b0, b1, b2, b3] = scoringPage.playerIds
    // Bases laden: 3 Runner auf 1B/2B/3B, dann HR von b3 → alle 4 scoren.
    await seedAtBat(scoringPage.gameId, b0, 'SINGLE', 1, { first: b0, second: null, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, b1, 'SINGLE', 1, { first: b1, second: b0, third: null }, 0, 0)
    await seedAtBat(scoringPage.gameId, b2, 'SINGLE', 1, { first: b2, second: b1, third: b0 }, 0, 0)
    await seedAtBat(scoringPage.gameId, b3, 'HOMERUN', 1, { first: null, second: null, third: null }, 4, 4)

    await page.goto(`/stats?scope=game&game=${scoringPage.gameId}`)

    // R-Header sichtbar
    const rHeader = page.getByRole('columnheader', { name: 'R', exact: true })
    await expect(rHeader).toBeVisible()

    // mindestens eine Zeile hat R > 0 (die 4 Scorer)
    await expect(page.getByRole('row').filter({ hasText: 'P' })).not.toHaveCount(0)

    // Sortierung: Klick auf R-Header → Top-Zeile hat höchsten R-Wert (=1 hier, alle 4 scoren je 1)
    await rHeader.click()
    // Smoke: Tabelle bleibt sichtbar nach Sort-Klick (kein Crash)
    await expect(rHeader).toBeVisible()
  })
})
```

- [ ] **Step 2: Docker-DB + E2E-Run (nur neuer Test)**

```bash
docker compose up -d db
cd frontend && npx playwright test e2e/scoring/scoring-runs-stat.spec.ts
```
Expected: PASS. (Falls die Stats-Seite asynchron lädt, im Test ggf. `await page.waitForResponse(/batting-stats/)` vor den Assertions ergänzen.)

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/scoring/scoring-runs-stat.spec.ts
git commit -m "✅ E2E: R-Spalte rendert + Sortierung (UI-Durchstich)"
```

---

### Task 8: Voll-Verifikation (Refactor-Safety-Net) + Branch-Abschluss

**Files:** keine (nur Verifikation).

- [ ] **Step 1: Komplette E2E-Suite (Pflicht — Live-Scoring angefasst)**

```bash
docker compose up -d db
cd frontend && npm run test:e2e
```
Expected: alle Tests grün (43 bestehende = Cascade-Verschiebe-Netz + neuer R-Test). Bei Rot: Regression im verschobenen Cascade — Task 2 prüfen.

- [ ] **Step 2: Komplette Backend-Suite**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```
Expected: grün (inkl. BaseRunningReplayTest, GameScoringServiceTest, BattingStatsCalculatorTest).

- [ ] **Step 3: Frontend Build + Lint**

```bash
cd frontend && npm run build && npm run lint
```
Expected: grün.

- [ ] **Step 4: Manuelle Sicht (optional)**

`/stats` öffnen (Saison/Spieltag mit Scoring-Daten) → R-Spalte zeigt plausible Werte; Σ R ≈ erzielte Runs. PDF-Export prüfen.

- [ ] **Step 5: Finishing**

Branch `feat/runs-scored-stat` ist fertig. Mit `superpowers:finishing-a-development-branch` Merge/PR-Optionen durchgehen (oder PR via `gh` öffnen, Push auf `master` triggert Auto-Deploy).

---

## Self-Review

**Spec-Coverage:**
- Steal-of-Home/Kaskade exakt → Task 1 (applyStealingEvent + scorerId). ✓
- Batting-Runs via Diff + Heuristik → Task 1 (attributeBattingRuns). ✓
- Inning-Reset → Task 1 (before-reset). ✓
- Ansatz B (Cascade in Domain, beide nutzen) → Task 1 + Task 2. ✓
- `BattingStats.runs` + Calculator → Task 3. ✓
- DTO → Task 4. ✓
- Frontend Spalte + Sort → Task 5. ✓
- PDF → Task 6. ✓
- Backend-Unit-Tests Korrektheit → Task 1, 3. ✓
- E2E UI-Durchstich → Task 7. ✓
- E2E-Pflichtlauf (Refactor-Netz) → Task 8. ✓

**Typ-Konsistenz:** `BaseRunningReplay.replay() → ReplayResult{ totalStealRuns, runsByPlayerId }`; `StealApplication{ state, runs, scorerId }`; `calculateForPlayer(..., int runs)`; `BattingStats.runs`; DTO `runs`; FE `runs`. Durchgängig konsistent.

**Platzhalter:** keine.
