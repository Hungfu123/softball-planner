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

    // --- Edge Cases ---

    @Test
    void onlyWalks_battingAverageZero_obpOne_slgZero() {
        // Reiner Walk-Hitter: 3 Walks, keine AB
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.WALK),
            atBat(AtBatResult.WALK),
            atBat(AtBatResult.WALK)
        );

        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        assertThat(s.plateAppearances()).isEqualTo(3);
        assertThat(s.atBats()).isZero();
        assertThat(s.hits()).isZero();
        assertThat(s.walks()).isEqualTo(3);
        // BA = 0/0 = 0.000 (Konvention)
        assertThat(s.battingAverage()).isEqualByComparingTo("0.000");
        // OBP = 3/3 = 1.000
        assertThat(s.onBasePct()).isEqualByComparingTo("1.000");
        // SLG = 0/0 = 0.000
        assertThat(s.sluggingPct()).isEqualByComparingTo("0.000");
        // OPS = 1.000
        assertThat(s.ops()).isEqualByComparingTo("1.000");
    }

    @Test
    void onlyHbp_countsTowardsObpNotBa() {
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.HIT_BY_PITCH),
            atBat(AtBatResult.HIT_BY_PITCH)
        );

        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        assertThat(s.atBats()).isZero();
        assertThat(s.hitByPitch()).isEqualTo(2);
        assertThat(s.battingAverage()).isEqualByComparingTo("0.000");
        assertThat(s.onBasePct()).isEqualByComparingTo("1.000");
    }

    @Test
    void onlyStealingEvents_noAtBats_statsZeroButStealsCount() {
        // Pinch-Runner-Szenario: Spieler ist nur auf Base gelaufen ohne jemals zu batten
        final List<BaseRunningEvent> steals = List.of(
            stealingEvent(BaseRunningEventType.STOLEN_BASE),
            stealingEvent(BaseRunningEventType.STOLEN_BASE)
        );

        final BattingStats s = calculator.calculateForPlayer(hung, List.of(), steals);

        assertThat(s.plateAppearances()).isZero();
        assertThat(s.stolenBases()).isEqualTo(2);
        assertThat(s.caughtStealing()).isZero();
        assertThat(s.battingAverage()).isEqualByComparingTo("0.000");
    }

    @Test
    void grandSlam_singleAtBatWithFourRbi() {
        // Bases loaded + HOMERUN = 4 RBI
        final AtBat hr = atBat(hung, AtBatResult.HOMERUN);
        hr.setRbi(4);
        hr.setRunsScored(4);

        final BattingStats s = calculator.calculateForPlayer(hung, List.of(hr), List.of());

        assertThat(s.atBats()).isEqualTo(1);
        assertThat(s.homeRuns()).isEqualTo(1);
        assertThat(s.runsBattedIn()).isEqualTo(4);
        assertThat(s.totalBases()).isEqualTo(4);
        assertThat(s.sluggingPct()).isEqualByComparingTo("4.000");
    }

    @Test
    void rbi_accumulatesAcrossMultipleAtBats() {
        final AtBat hit1 = atBat(hung, AtBatResult.SINGLE);  hit1.setRbi(1);
        final AtBat hit2 = atBat(hung, AtBatResult.DOUBLE);  hit2.setRbi(2);
        final AtBat hit3 = atBat(hung, AtBatResult.HOMERUN); hit3.setRbi(3);

        final BattingStats s = calculator.calculateForPlayer(hung, List.of(hit1, hit2, hit3), List.of());

        assertThat(s.runsBattedIn()).isEqualTo(6);
    }

    @Test
    void nullRbi_treatedAsZero() {
        final AtBat single = atBat(hung, AtBatResult.SINGLE);
        single.setRbi(null); // Bug-safety: null RBI darf nicht NPE

        final BattingStats s = calculator.calculateForPlayer(hung, List.of(single), List.of());

        assertThat(s.runsBattedIn()).isZero();
    }

    @Test
    void nullResult_atBatIgnoredGracefully() {
        // Defensive: AtBat ohne result soll nicht NPE'n
        final AtBat broken = new AtBat();
        broken.setBatter(hung);
        broken.setResult(null);
        final AtBat valid = atBat(hung, AtBatResult.SINGLE);

        final BattingStats s = calculator.calculateForPlayer(hung, List.of(broken, valid), List.of());

        assertThat(s.plateAppearances()).isEqualTo(1); // Nur der valide zählt
        assertThat(s.atBats()).isEqualTo(1);
        assertThat(s.hits()).isEqualTo(1);
    }

    @Test
    void nullBatter_excludedFromGrouping() {
        // AtBat ohne Batter darf Gruppierung nicht crashen
        final AtBat orphan = new AtBat();
        orphan.setResult(AtBatResult.SINGLE);
        orphan.setBatter(null);
        final AtBat valid = atBat(hung, AtBatResult.SINGLE);

        final List<BattingStats> stats = calculator.calculateForPlayers(
            List.of(hung), List.of(orphan, valid), List.of());

        assertThat(stats).hasSize(1);
        assertThat(stats.get(0).atBats()).isEqualTo(1); // Orphan ignoriert
    }

    @Test
    void battingAverage_rounding_exactThird() {
        // 1 Hit / 3 AB = 0.3333... → .333 (HALF_UP)
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.OUT),
            atBat(AtBatResult.OUT)
        );
        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());
        assertThat(s.battingAverage()).isEqualByComparingTo("0.333");
    }

    @Test
    void battingAverage_rounding_twoThirds() {
        // 2 Hits / 3 AB = 0.6666... → .667 (HALF_UP aufrunden)
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.OUT)
        );
        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());
        assertThat(s.battingAverage()).isEqualByComparingTo("0.667");
    }

    @Test
    void battingAverage_rounding_halfCase() {
        // 1 Hit / 2 AB = 0.500 (exakt)
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.OUT)
        );
        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());
        assertThat(s.battingAverage()).isEqualByComparingTo("0.500");
    }

    @Test
    void perfectRecord_allHits_battingAverageOne() {
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.DOUBLE),
            atBat(AtBatResult.HOMERUN)
        );
        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());
        assertThat(s.battingAverage()).isEqualByComparingTo("1.000");
        assertThat(s.onBasePct()).isEqualByComparingTo("1.000");
        // SLG = (1+2+4)/3 = 7/3 = 2.333
        assertThat(s.sluggingPct()).isEqualByComparingTo("2.333");
    }

    @Test
    void hitCount_matchesSumOfHitTypes() {
        // Invariant: hits == singles + doubles + triples + homeRuns
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.DOUBLE),
            atBat(AtBatResult.TRIPLE),
            atBat(AtBatResult.HOMERUN),
            atBat(AtBatResult.OUT),
            atBat(AtBatResult.STRIKEOUT),
            atBat(AtBatResult.WALK)
        );
        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        assertThat(s.hits()).isEqualTo(s.singles() + s.doubles() + s.triples() + s.homeRuns());
        assertThat(s.hits()).isEqualTo(5);
    }

    @Test
    void atBats_excludesWalksAndHbp_includesOutsAndHits() {
        // Invariant: AB = PA - BB - HBP (in V1 ohne SF/SH)
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),       // AB
            atBat(AtBatResult.OUT),          // AB
            atBat(AtBatResult.STRIKEOUT),    // AB
            atBat(AtBatResult.WALK),         // nicht AB
            atBat(AtBatResult.HIT_BY_PITCH)  // nicht AB
        );
        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        assertThat(s.plateAppearances()).isEqualTo(5);
        assertThat(s.atBats()).isEqualTo(3);
        assertThat(s.atBats()).isEqualTo(s.plateAppearances() - s.walks() - s.hitByPitch());
    }

    @Test
    void mixedSteals_caughtStealingDoesNotCountAsStolenBase() {
        final List<BaseRunningEvent> events = List.of(
            stealingEvent(BaseRunningEventType.STOLEN_BASE),
            stealingEvent(BaseRunningEventType.CAUGHT_STEALING),
            stealingEvent(BaseRunningEventType.STOLEN_BASE),
            stealingEvent(BaseRunningEventType.CAUGHT_STEALING)
        );
        final BattingStats s = calculator.calculateForPlayer(hung, List.of(), events);

        assertThat(s.stolenBases()).isEqualTo(2);
        assertThat(s.caughtStealing()).isEqualTo(2);
        // CS affects AB? NO — AB only affected by AtBatResult, not by base-running events
        assertThat(s.atBats()).isZero();
    }

    @Test
    void opsWithOnlyWalks_isOnePointZero() {
        // Pure walks: OBP=1.000, SLG=0.000, OPS=1.000
        final List<AtBat> atBats = List.of(atBat(AtBatResult.WALK), atBat(AtBatResult.WALK));
        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());
        assertThat(s.ops()).isEqualByComparingTo("1.000");
    }

    @Test
    void opsAccuracy_noDoubleRounding() {
        // OPS = OBP + SLG (beide bereits auf 3 Nachkommastellen gerundet)
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),   // 1 AB, 1 H, 1 TB
            atBat(AtBatResult.WALK),     // 0 AB
            atBat(AtBatResult.STRIKEOUT) // 1 AB, 0 H
        );
        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());
        // AB=2, H=1, TB=1, BB=1, PA=3
        // OBP = 2/3 = 0.667
        // SLG = 1/2 = 0.500
        // OPS = 1.167
        assertThat(s.onBasePct()).isEqualByComparingTo("0.667");
        assertThat(s.sluggingPct()).isEqualByComparingTo("0.500");
        assertThat(s.ops()).isEqualByComparingTo("1.167");
    }

    @Test
    void multiplePlayers_onePlayerWithNoData_returnedWithZeros() {
        // Stats-Liste enthält alle übergebenen Spieler, auch ohne Events
        final Player khang = player(2L, "Khang");
        final List<AtBat> atBats = List.of(atBat(hung, AtBatResult.SINGLE));

        final List<BattingStats> stats = calculator.calculateForPlayers(
            List.of(hung, khang), atBats, List.of());

        assertThat(stats).hasSize(2);
        final BattingStats khangStats = stats.stream().filter(s -> s.playerId() == 2L).findFirst().orElseThrow();
        assertThat(khangStats.plateAppearances()).isZero();
        assertThat(khangStats.battingAverage()).isEqualByComparingTo("0.000");
    }

    @Test
    void emptyPlayersList_returnsEmptyStats() {
        // Auch mit AtBats: wenn keine Spieler übergeben, leere Liste
        final List<BattingStats> stats = calculator.calculateForPlayers(
            List.of(), List.of(atBat(hung, AtBatResult.SINGLE)), List.of());
        assertThat(stats).isEmpty();
    }

    @Test
    void totalBases_calculationInvariant() {
        // Invariant: TB = 1*1B + 2*2B + 3*3B + 4*HR
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),  atBat(AtBatResult.SINGLE),   // 2 * 1 = 2
            atBat(AtBatResult.DOUBLE),                                // 1 * 2 = 2
            atBat(AtBatResult.TRIPLE),  atBat(AtBatResult.TRIPLE),    // 2 * 3 = 6
            atBat(AtBatResult.HOMERUN),                               // 1 * 4 = 4
            atBat(AtBatResult.OUT), atBat(AtBatResult.WALK), atBat(AtBatResult.HIT_BY_PITCH) // 0
        );
        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        final int expectedTB = 1 * s.singles() + 2 * s.doubles() + 3 * s.triples() + 4 * s.homeRuns();
        assertThat(s.totalBases()).isEqualTo(expectedTB);
        assertThat(s.totalBases()).isEqualTo(2 + 2 + 6 + 4);
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
