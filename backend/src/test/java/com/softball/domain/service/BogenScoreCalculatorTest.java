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
