package com.softball.domain.service;

import com.softball.domain.model.Award;
import com.softball.domain.model.AwardType;
import com.softball.domain.model.BattingStats;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class GamedayAwardCalculatorTest {

    private final GamedayAwardCalculator calc = new GamedayAwardCalculator();

    private BattingStats stats(long id, String name, int pa, int tb, int rbi,
                               int bb, int sb, int xbh, String obp, String ops) {
        BigDecimal obpBd = new BigDecimal(obp);
        BigDecimal slg = new BigDecimal(ops).subtract(obpBd);
        return new BattingStats(
            id, name,
            pa, pa,
            tb - 2 * xbh, 0, xbh, 0, 0,
            bb, 0, 0, 0, 0,
            sb, 0, 0, rbi, tb,
            BigDecimal.ZERO, obpBd, slg);
    }

    private Map<AwardType, Award> byType(List<Award> awards) {
        return awards.stream().collect(Collectors.toMap(Award::type, a -> a));
    }

    @Test
    void emptyStats_noAwards() {
        assertThat(calc.calculate(List.of())).isEmpty();
    }

    @Test
    void mvp_picksHighestComposite() {
        var a = stats(1, "Anna", 3, 8, 3, 1, 0, 2, "0.500", "1.300");
        var b = stats(2, "Ben", 3, 4, 0, 0, 2, 1, "0.400", "0.800");
        var awards = byType(calc.calculate(List.of(a, b)));
        assertThat(awards.get(AwardType.MVP).playerId()).isEqualTo(1L);
        assertThat(awards.get(AwardType.MVP).displayValue()).isEqualTo("OPS 1.300");
    }

    @Test
    void mvp_requiresMinTwoPa() {
        var only = stats(1, "Solo", 1, 12, 5, 0, 0, 3, "0.900", "2.000");
        assertThat(calc.calculate(List.of(only))).isEmpty();
    }

    @Test
    void power_onlyWhenExtraBaseHitExists() {
        var a = stats(1, "Singles", 4, 4, 0, 0, 0, 0, "0.400", "0.800");
        var awards = byType(calc.calculate(List.of(a)));
        assertThat(awards).doesNotContainKey(AwardType.POWER);
    }

    @Test
    void speed_onlyWhenStolenBasePositive() {
        var a = stats(1, "Slow", 3, 3, 0, 0, 0, 1, "0.400", "0.900");
        assertThat(byType(calc.calculate(List.of(a)))).doesNotContainKey(AwardType.SPEED);
    }

    @Test
    void onBase_droppedWhenSameAsMvp() {
        var a = stats(1, "Dom", 3, 8, 3, 2, 0, 2, "0.700", "1.400");
        var awards = byType(calc.calculate(List.of(a)));
        assertThat(awards.get(AwardType.MVP).playerId()).isEqualTo(1L);
        assertThat(awards).doesNotContainKey(AwardType.ON_BASE);
    }

    @Test
    void onBase_awardedToDifferentPlayer() {
        var mvp = stats(1, "Power", 3, 9, 4, 0, 0, 3, "0.450", "1.200");
        var obp = stats(2, "Patient", 4, 2, 0, 3, 0, 0, "0.750", "0.900");
        var awards = byType(calc.calculate(List.of(mvp, obp)));
        assertThat(awards.get(AwardType.MVP).playerId()).isEqualTo(1L);
        assertThat(awards.get(AwardType.ON_BASE).playerId()).isEqualTo(2L);
        assertThat(awards.get(AwardType.ON_BASE).displayValue()).isEqualTo("OBP 0.750");
    }
}
