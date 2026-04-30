package com.softball.domain.service;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenAtBat;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BogenScoreCalculatorTest {

    private final BogenScoreCalculator calc = new BogenScoreCalculator();

    @Test
    void emptyAtBatsProduceEmptyMap() {
        assertThat(calc.calculateInningRuns(List.of())).isEmpty();
    }

    @Test
    void aggregatesRunsByInningAndSide() {
        SpielbogenAtBat a1 = atBat(1, BogenSide.HOME, 2);
        SpielbogenAtBat a2 = atBat(1, BogenSide.HOME, 3);
        SpielbogenAtBat a3 = atBat(2, BogenSide.AWAY, 1);
        SpielbogenAtBat a4 = atBat(1, BogenSide.AWAY, 1);

        var result = calc.calculateInningRuns(List.of(a1, a2, a3, a4));

        assertThat(result.get(1).getHome()).isEqualTo(5);
        assertThat(result.get(1).getAway()).isEqualTo(1);
        assertThat(result.get(2).getAway()).isEqualTo(1);
    }

    @Test
    void zeroRunsAreSkipped() {
        SpielbogenAtBat a = atBat(1, BogenSide.HOME, 0);
        var result = calc.calculateInningRuns(List.of(a));
        assertThat(result).isEmpty();
    }

    @Test
    void nullRunsAreSkipped() {
        SpielbogenAtBat a = new SpielbogenAtBat();
        a.setInning(1);
        a.setSide(BogenSide.HOME);
        a.setRunsScored(null);
        var result = calc.calculateInningRuns(List.of(a));
        assertThat(result).isEmpty();
    }

    private SpielbogenAtBat atBat(int inning, BogenSide side, int runs) {
        SpielbogenAtBat a = new SpielbogenAtBat();
        a.setInning(inning);
        a.setSide(side);
        a.setRunsScored(runs);
        return a;
    }
}
