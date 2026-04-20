package com.softball.domain.service;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.BaseRunningEventType;
import com.softball.domain.model.BattingStats;
import com.softball.domain.model.Player;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BattingStatsCalculatorTest {

    private BattingStatsCalculator calculator;
    private Player hung;

    @BeforeEach
    void setUp() {
        calculator = new BattingStatsCalculator();
        hung = player(1L, "Hung");
    }

    @Test
    void emptyInput_returnsZeros() {
        final BattingStats s = calculator.calculateForPlayer(hung, List.of(), List.of());

        assertThat(s.playerId()).isEqualTo(1L);
        assertThat(s.plateAppearances()).isZero();
        assertThat(s.atBats()).isZero();
        assertThat(s.hits()).isZero();
        assertThat(s.battingAverage()).isEqualByComparingTo("0.000");
        assertThat(s.onBasePct()).isEqualByComparingTo("0.000");
        assertThat(s.sluggingPct()).isEqualByComparingTo("0.000");
    }

    @Test
    void walksDoNotCountAsAtBat() {
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.WALK),
            atBat(AtBatResult.HIT_BY_PITCH),
            atBat(AtBatResult.SINGLE)
        );

        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        assertThat(s.plateAppearances()).isEqualTo(3);
        assertThat(s.atBats()).isEqualTo(1); // nur Single zählt
        assertThat(s.hits()).isEqualTo(1);
        assertThat(s.walks()).isEqualTo(1);
        assertThat(s.hitByPitch()).isEqualTo(1);
        // BA = 1/1 = 1.000
        assertThat(s.battingAverage()).isEqualByComparingTo("1.000");
        // OBP = (1 + 1 + 1) / 3 = 1.000
        assertThat(s.onBasePct()).isEqualByComparingTo("1.000");
        // SLG = 1/1 = 1.000
        assertThat(s.sluggingPct()).isEqualByComparingTo("1.000");
    }

    @Test
    void battingAverageFormula() {
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.STRIKEOUT),
            atBat(AtBatResult.OUT),
            atBat(AtBatResult.OUT),
            atBat(AtBatResult.OUT)
        );

        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        assertThat(s.atBats()).isEqualTo(6);
        assertThat(s.hits()).isEqualTo(2);
        // 2/6 = 0.333
        assertThat(s.battingAverage()).isEqualByComparingTo("0.333");
    }

    @Test
    void sluggingFormula_countsTotalBases() {
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),  // 1
            atBat(AtBatResult.DOUBLE),  // 2
            atBat(AtBatResult.TRIPLE),  // 3
            atBat(AtBatResult.HOMERUN), // 4
            atBat(AtBatResult.OUT)      // 0
        );

        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        assertThat(s.atBats()).isEqualTo(5);
        assertThat(s.totalBases()).isEqualTo(10); // 1+2+3+4+0
        // SLG = 10/5 = 2.000
        assertThat(s.sluggingPct()).isEqualByComparingTo("2.000");
    }

    @Test
    void onBasePct_includesWalksAndHbp() {
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.WALK),
            atBat(AtBatResult.HIT_BY_PITCH),
            atBat(AtBatResult.STRIKEOUT)
        );

        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        assertThat(s.plateAppearances()).isEqualTo(4);
        // OBP = (1 hit + 1 walk + 1 hbp) / 4 PA = 0.750
        assertThat(s.onBasePct()).isEqualByComparingTo("0.750");
    }

    @Test
    void stolenBases_andCaughtStealing() {
        final List<BaseRunningEvent> steals = List.of(
            stealingEvent(BaseRunningEventType.STOLEN_BASE),
            stealingEvent(BaseRunningEventType.STOLEN_BASE),
            stealingEvent(BaseRunningEventType.STOLEN_BASE),
            stealingEvent(BaseRunningEventType.CAUGHT_STEALING)
        );

        final BattingStats s = calculator.calculateForPlayer(hung, List.of(), steals);

        assertThat(s.stolenBases()).isEqualTo(3);
        assertThat(s.caughtStealing()).isEqualTo(1);
    }

    @Test
    void opsIsSumOfObpAndSlg() {
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.HOMERUN),   // 1 AB, 1 H, 4 TB
            atBat(AtBatResult.WALK),      // 0 AB
            atBat(AtBatResult.OUT)        // 1 AB, 0 H, 0 TB
        );

        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        // AB=2, H=1, TB=4, BB=1, PA=3
        // OBP = 2/3 = 0.667
        // SLG = 4/2 = 2.000
        // OPS = 2.667
        assertThat(s.onBasePct()).isEqualByComparingTo("0.667");
        assertThat(s.sluggingPct()).isEqualByComparingTo("2.000");
        assertThat(s.ops()).isEqualByComparingTo("2.667");
    }

    @Test
    void multiplePlayers_areGroupedCorrectly() {
        final Player khang = player(2L, "Khang");
        final List<AtBat> atBats = List.of(
            atBat(hung, AtBatResult.SINGLE),
            atBat(hung, AtBatResult.OUT),
            atBat(khang, AtBatResult.DOUBLE),
            atBat(khang, AtBatResult.HOMERUN)
        );

        final List<BattingStats> stats = calculator.calculateForPlayers(
            List.of(hung, khang), atBats, List.of());

        assertThat(stats).hasSize(2);
        final BattingStats hungStats = stats.stream().filter(s -> s.playerId().equals(1L)).findFirst().get();
        final BattingStats khangStats = stats.stream().filter(s -> s.playerId() == 2L).findFirst().get();

        assertThat(hungStats.hits()).isEqualTo(1);
        assertThat(hungStats.battingAverage()).isEqualByComparingTo("0.500");
        assertThat(khangStats.hits()).isEqualTo(2);
        assertThat(khangStats.totalBases()).isEqualTo(6);
    }

    @Test
    void playerWithoutEvents_stillReturnsZeroStats() {
        final List<BattingStats> stats = calculator.calculateForPlayers(
            List.of(hung), List.of(), List.of());

        assertThat(stats).hasSize(1);
        assertThat(stats.get(0).plateAppearances()).isZero();
        assertThat(stats.get(0).battingAverage()).isEqualByComparingTo("0.000");
    }

    // --- helpers ---
    private Player player(final Long id, final String name) {
        return new Player(id, name, false, null);
    }

    private AtBat atBat(final AtBatResult result) {
        return atBat(hung, result);
    }

    private AtBat atBat(final Player batter, final AtBatResult result) {
        final AtBat ab = new AtBat();
        ab.setBatter(batter);
        ab.setResult(result);
        ab.setRbi(0);
        ab.setRunsScored(0);
        return ab;
    }

    private BaseRunningEvent stealingEvent(final BaseRunningEventType type) {
        final BaseRunningEvent e = new BaseRunningEvent();
        e.setRunner(hung);
        e.setType(type);
        e.setInning(1);
        return e;
    }

    @SuppressWarnings("unused")
    private BigDecimal bd(final String s) { return new BigDecimal(s); }
}
