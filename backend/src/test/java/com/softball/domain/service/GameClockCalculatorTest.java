package com.softball.domain.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class GameClockCalculatorTest {

    private final GameClockCalculator calc = new GameClockCalculator();

    private static final Instant NOW = Instant.parse("2026-08-10T18:00:00Z");

    @Test
    void neverStarted() {
        final GameClockCalculator.ClockState state = calc.compute(null, 0, null, null, NOW);

        assertThat(state.started()).isFalse();
        assertThat(state.running()).isFalse();
        assertThat(state.elapsedSeconds()).isZero();
        assertThat(state.overLimit()).isFalse();
    }

    @Test
    void running() {
        final Instant runningSince = NOW.minusSeconds(125);

        final GameClockCalculator.ClockState state = calc.compute(runningSince, 0, null, null, NOW);

        assertThat(state.started()).isTrue();
        assertThat(state.running()).isTrue();
        assertThat(state.elapsedSeconds()).isEqualTo(125);
    }

    @Test
    void runningAddsToAlreadyAccumulated() {
        final Instant runningSince = NOW.minusSeconds(30);

        final GameClockCalculator.ClockState state = calc.compute(runningSince, 200, null, null, NOW);

        assertThat(state.elapsedSeconds()).isEqualTo(230);
    }

    @Test
    void paused() {
        final GameClockCalculator.ClockState state = calc.compute(null, 300, null, null, NOW);

        assertThat(state.started()).isTrue();
        assertThat(state.running()).isFalse();
        assertThat(state.elapsedSeconds()).isEqualTo(300);
    }

    // Kernfall dieser Ableitung: eine laufende Uhr eines beendeten Spiels darf nicht gegen `now`
    // rechnen, sondern muss an `endedAt` einfrieren. Die Differenz zwischen den beiden möglichen
    // Antworten ist hier eine Stunde — das muss auffallen, nicht in einer Sekunde untergehen.
    @Test
    void finishedGameCapsAtEndedAt() {
        final Instant runningSince = NOW.minusSeconds(3700); // vor >1h gestartet
        final Instant endedAt = NOW.minusSeconds(3600); // vor 1h beendet, Uhr lief da 100s

        final GameClockCalculator.ClockState state = calc.compute(runningSince, 0, null, endedAt, NOW);

        assertThat(state.elapsedSeconds()).isEqualTo(100);
        assertThat(state.elapsedSeconds()).isNotEqualTo(3700); // waere das Ergebnis gegen `now`
        // Eingefroren heisst auch: das Frontend darf nicht lokal weiterzaehlen.
        assertThat(state.running()).isFalse();
    }

    @Test
    void finishedGameAlreadyPausedStaysUnchanged() {
        final Instant endedAt = NOW.minusSeconds(600);

        final GameClockCalculator.ClockState state = calc.compute(null, 900, null, endedAt, NOW);

        assertThat(state.elapsedSeconds()).isEqualTo(900);
        assertThat(state.running()).isFalse();
    }

    @Test
    void overLimitWhenExceeded() {
        final Instant runningSince = NOW.minusSeconds(61 * 60);

        final GameClockCalculator.ClockState state = calc.compute(runningSince, 0, 60, null, NOW);

        assertThat(state.overLimit()).isTrue();
        assertThat(state.limitMinutes()).isEqualTo(60);
    }

    // Grenzfall: exakt am Limit gilt noch nicht als ueberschritten - "over" bedeutet darueber
    // hinaus, nicht "erreicht". Die Anzeige faerbt erst, wenn die Uhr wirklich drueber liegt.
    @Test
    void exactlyAtLimitIsNotOverLimit() {
        final Instant runningSince = NOW.minusSeconds(60 * 60);

        final GameClockCalculator.ClockState state = calc.compute(runningSince, 0, 60, null, NOW);

        assertThat(state.elapsedSeconds()).isEqualTo(60 * 60);
        assertThat(state.overLimit()).isFalse();
    }

    @Test
    void oneSecondOverLimitIsOverLimit() {
        final Instant runningSince = NOW.minusSeconds(60 * 60 + 1);

        final GameClockCalculator.ClockState state = calc.compute(runningSince, 0, 60, null, NOW);

        assertThat(state.overLimit()).isTrue();
    }

    @Test
    void noLimitNeverOverLimitButSecondsStillCorrect() {
        final Instant runningSince = NOW.minusSeconds(999_999);

        final GameClockCalculator.ClockState state = calc.compute(runningSince, 0, null, null, NOW);

        assertThat(state.limitMinutes()).isNull();
        assertThat(state.overLimit()).isFalse();
        assertThat(state.elapsedSeconds()).isEqualTo(999_999);
    }

    // Verteidigung gegen einen Zustand, der nicht vorkommen sollte (Spiel beendet, dann
    // fortgesetzt, dann wieder geoeffnet ohne dass die Uhr das nachzieht): endedAt liegt vor
    // runningSince. Statt eines negativen Ergebnisses wird bei 0 gekappt.
    @Test
    void endedAtBeforeRunningSinceClampsAtZero() {
        final Instant endedAt = NOW.minusSeconds(100);
        final Instant runningSince = NOW.minusSeconds(50);

        final GameClockCalculator.ClockState state = calc.compute(runningSince, 0, null, endedAt, NOW);

        assertThat(state.elapsedSeconds()).isZero();
    }

    @Test
    void endedAtBeforeRunningSinceClampsAtZeroEvenWithAccumulated() {
        final Instant endedAt = NOW.minusSeconds(100);
        final Instant runningSince = NOW.minusSeconds(50);

        final GameClockCalculator.ClockState state = calc.compute(runningSince, 40, null, endedAt, NOW);

        // accumulated bleibt erhalten, nur die (negative) laufende Spanne wird bei 0 gekappt.
        assertThat(state.elapsedSeconds()).isEqualTo(40);
    }
}
