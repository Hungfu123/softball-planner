package com.softball.domain.service;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.BaseRunningEventType;
import com.softball.domain.model.Game;
import com.softball.domain.model.GameDay;
import com.softball.domain.model.LeagueTeam;
import com.softball.domain.model.Player;
import com.softball.domain.model.PlayerFormPoint;
import com.softball.domain.model.Season;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class BattingTimelineCalculatorTest {

    private BattingTimelineCalculator calculator;
    private Player hung;

    @BeforeEach
    void setUp() {
        calculator = new BattingTimelineCalculator();
        hung = new Player(1L, "Hung", true);
    }

    @Test
    void noAtBats_noPoints() {
        assertThat(calculator.calculate(hung, List.of(), Map.of(), Map.of())).isEmpty();
    }

    @Test
    void onePointPerGame_inInputOrder() {
        final List<AtBat> atBats = List.of(
            atBat(10L, AtBatResult.SINGLE),
            atBat(10L, AtBatResult.STRIKEOUT),
            atBat(11L, AtBatResult.DOUBLE));

        final List<PlayerFormPoint> points = calculator.calculate(hung, atBats, games(10L, 11L), Map.of());

        assertThat(points).hasSize(2);
        assertThat(points.get(0).gameId()).isEqualTo(10L);
        assertThat(points.get(0).gamePlateAppearances()).isEqualTo(2);
        assertThat(points.get(0).gameHits()).isEqualTo(1);
        assertThat(points.get(1).gameId()).isEqualTo(11L);
        assertThat(points.get(1).gameHits()).isEqualTo(1);
    }

    @Test
    void gameMetadataComesFromTheGameMap() {
        final List<PlayerFormPoint> points =
            calculator.calculate(hung, List.of(atBat(10L, AtBatResult.SINGLE)), games(10L), Map.of());

        final PlayerFormPoint point = points.get(0);
        assertThat(point.date()).isEqualTo(LocalDate.of(2026, 5, 10));
        assertThat(point.opponent()).isEqualTo("Gegner 10");
        assertThat(point.seasonName()).isEqualTo("Ruhr Fun Liga");
        assertThat(point.year()).isEqualTo(2026);
    }

    @Test
    void rollingAverageSpansGames_notJustTheCurrentOne() {
        // Spiel 1: 1 für 2, Spiel 2: 0 für 2 — der gleitende Schnitt steht danach bei 1/4.
        final List<AtBat> atBats = List.of(
            atBat(10L, AtBatResult.SINGLE), atBat(10L, AtBatResult.OUT),
            atBat(11L, AtBatResult.OUT), atBat(11L, AtBatResult.STRIKEOUT));

        final List<PlayerFormPoint> points = calculator.calculate(hung, atBats, games(10L, 11L), Map.of());

        assertThat(points.get(0).rollingAverage()).isEqualByComparingTo("0.500");
        assertThat(points.get(1).rollingAverage()).isEqualByComparingTo("0.250");
    }

    @Test
    void windowForgetsWhatFellOutOfIt() {
        // 20 Outs füllen das Fenster, danach drei Hits: der alte Nuller-Block rutscht raus.
        final List<AtBat> atBats = new ArrayList<>();
        IntStream.range(0, 20).forEach(i -> atBats.add(atBat(10L, AtBatResult.OUT)));
        IntStream.range(0, 20).forEach(i -> atBats.add(atBat(11L, AtBatResult.SINGLE)));

        final List<PlayerFormPoint> points = calculator.calculate(hung, atBats, games(10L, 11L), Map.of());

        assertThat(points.get(0).rollingAverage()).isEqualByComparingTo("0.000");
        assertThat(points.get(1).rollingAverage()).isEqualByComparingTo("1.000");
        assertThat(points.get(1).rollingPlateAppearances())
            .isEqualTo(BattingTimelineCalculator.WINDOW_PLATE_APPEARANCES);
    }

    @Test
    void provisionalUntilTheWindowIsFull() {
        final List<AtBat> atBats = new ArrayList<>();
        IntStream.range(0, 19).forEach(i -> atBats.add(atBat(10L, AtBatResult.SINGLE)));
        atBats.add(atBat(11L, AtBatResult.SINGLE));

        final List<PlayerFormPoint> points = calculator.calculate(hung, atBats, games(10L, 11L), Map.of());

        assertThat(points.get(0).provisional()).isTrue();
        assertThat(points.get(1).provisional()).isFalse();
    }

    @Test
    void timesOnBaseCountsWalksAndHitByPitch() {
        final List<AtBat> atBats = List.of(
            atBat(10L, AtBatResult.SINGLE),
            atBat(10L, AtBatResult.WALK),
            atBat(10L, AtBatResult.HIT_BY_PITCH),
            atBat(10L, AtBatResult.STRIKEOUT));

        final PlayerFormPoint point = calculator.calculate(hung, atBats, games(10L), Map.of()).get(0);

        assertThat(point.gameTimesOnBase()).isEqualTo(3);
        assertThat(point.gameWalks()).isEqualTo(1);
    }

    @Test
    void atBatsWithoutResultAreIgnored() {
        final AtBat broken = atBat(10L, null);
        final List<PlayerFormPoint> points =
            calculator.calculate(hung, List.of(broken, atBat(10L, AtBatResult.SINGLE)), games(10L), Map.of());

        assertThat(points).hasSize(1);
        assertThat(points.get(0).gamePlateAppearances()).isEqualTo(1);
    }

    @Test
    void stealsAreCountedPerGame() {
        final List<AtBat> atBats = List.of(atBat(10L, AtBatResult.SINGLE), atBat(11L, AtBatResult.OUT));
        final Map<Long, List<BaseRunningEvent>> steals = Map.of(
            10L, List.of(steal(BaseRunningEventType.STOLEN_BASE), steal(BaseRunningEventType.STOLEN_BASE),
                         steal(BaseRunningEventType.CAUGHT_STEALING),
                         steal(BaseRunningEventType.OUT_ON_PLAY)));

        final List<PlayerFormPoint> points = calculator.calculate(hung, atBats, games(10L, 11L), steals);

        assertThat(points.get(0).gameStolenBases()).isEqualTo(2);
        assertThat(points.get(0).gameCaughtStealing()).isEqualTo(1);
        // Ausgespielt ist kein Steal-Versuch und zählt in keiner der beiden Spalten.
        assertThat(points.get(1).gameStolenBases()).isZero();
    }

    @Test
    void sluggingAndOpsFollowTheSameWindow() {
        // Ein Double: 1 für 1, zwei Total Bases — SLG 2.000, OBP 1.000, OPS 3.000.
        final List<PlayerFormPoint> points =
            calculator.calculate(hung, List.of(atBat(10L, AtBatResult.DOUBLE)), games(10L), Map.of());

        assertThat(points.get(0).rollingSlugging()).isEqualByComparingTo("2.000");
        assertThat(points.get(0).rollingOps()).isEqualByComparingTo("3.000");
    }

    private BaseRunningEvent steal(final BaseRunningEventType type) {
        final BaseRunningEvent event = new BaseRunningEvent();
        event.setRunner(hung);
        event.setType(type);
        return event;
    }

    private AtBat atBat(final Long gameId, final AtBatResult result) {
        final AtBat ab = new AtBat();
        final Game game = new Game();
        game.setId(gameId);
        ab.setGame(game);
        ab.setBatter(hung);
        ab.setResult(result);
        ab.setRbi(0);
        return ab;
    }

    private static Map<Long, Game> games(final Long... ids) {
        final Season season = new Season(7L, "Ruhr Fun Liga", 2026);
        final Map<Long, Game> map = new java.util.HashMap<>();
        for (final Long id : ids) {
            final Game game = new Game();
            game.setId(id);
            final GameDay day = new GameDay();
            day.setDate(LocalDate.of(2026, 5, 10));
            day.setSeason(season);
            game.setGameDay(day);
            final LeagueTeam opponent = new LeagueTeam();
            opponent.setName("Gegner " + id);
            game.setOpponentTeam(opponent);
            map.put(id, game);
        }
        return map;
    }
}
