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
