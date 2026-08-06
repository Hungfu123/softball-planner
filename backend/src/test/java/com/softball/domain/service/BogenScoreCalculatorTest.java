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

    @Test
    void zeroRunsAreSkipped() {
        var runs = calc.calculateInningRuns(
            List.of(atBat(BogenSide.HOME, 1, AtBatResult.OUT, 0)),
            List.of()
        );

        assertThat(runs).isEmpty();
    }

    @Test
    void nullRunsAreSkipped() {
        SpielbogenAtBat ab = new SpielbogenAtBat();
        ab.setSide(BogenSide.HOME);
        ab.setInning(1);
        ab.setResult(AtBatResult.OUT);
        ab.setRunsScored(null);

        var runs = calc.calculateInningRuns(List.of(ab), List.of());

        assertThat(runs).isEmpty();
    }

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
}
