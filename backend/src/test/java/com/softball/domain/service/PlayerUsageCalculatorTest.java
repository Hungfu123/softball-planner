package com.softball.domain.service;

import com.softball.domain.model.GameDay;
import com.softball.domain.model.PlayerUsage;
import com.softball.domain.model.Season;
import com.softball.domain.model.Training;
import com.softball.domain.model.UsageScope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerUsageCalculatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 14);

    private PlayerUsageCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new PlayerUsageCalculator();
    }

    private GameDay gameDay(final long id, final LocalDate date) {
        final GameDay gd = new GameDay();
        gd.setId(id);
        gd.setDate(date);
        return gd;
    }

    private Training training(final long id, final LocalDate date, final boolean cancelled) {
        final Training t = new Training(id, date, "19:00", "Halle");
        t.setCancelled(cancelled);
        return t;
    }

    @Test
    void noData_everythingZero() {
        final PlayerUsage usage = calculator.calculate(
            List.of(), Set.of(), Set.of(), List.of(), List.of(), Set.of(), TODAY);

        assertThat(usage.gameDaysTotal()).isZero();
        assertThat(usage.averageBattingOrder()).isNull();
        assertThat(usage.battingOrderCounts()).isEmpty();
    }

    @Test
    void countsAvailabilityAndAppearances() {
        final List<GameDay> gameDays = List.of(
            gameDay(1, TODAY.minusDays(30)),
            gameDay(2, TODAY.minusDays(20)),
            gameDay(3, TODAY.minusDays(10)));

        final PlayerUsage usage = calculator.calculate(
            gameDays, Set.of(1L, 2L), Set.of(1L), List.of(), List.of(), Set.of(), TODAY);

        assertThat(usage.gameDaysTotal()).isEqualTo(3);
        assertThat(usage.gameDaysAvailable()).isEqualTo(2);
        assertThat(usage.gameDaysPlayed()).isEqualTo(1);
    }

    @Test
    void futureGameDaysDontCount() {
        // Ein Spieltag naechste Woche sagt nichts ueber Verlaesslichkeit — er wuerde
        // die Quote nur nach unten ziehen.
        final List<GameDay> gameDays = List.of(
            gameDay(1, TODAY.minusDays(7)),
            gameDay(2, TODAY.plusDays(7)));

        final PlayerUsage usage = calculator.calculate(
            gameDays, Set.of(1L, 2L), Set.of(1L), List.of(), List.of(), Set.of(), TODAY);

        assertThat(usage.gameDaysTotal()).isEqualTo(1);
        assertThat(usage.gameDaysAvailable()).isEqualTo(1);
    }

    @Test
    void todayCounts() {
        final PlayerUsage usage = calculator.calculate(
            List.of(gameDay(1, TODAY)), Set.of(1L), Set.of(), List.of(), List.of(), Set.of(), TODAY);

        assertThat(usage.gameDaysTotal()).isEqualTo(1);
    }

    @Test
    void cancelledTrainingsDontCount() {
        final List<Training> trainings = List.of(
            training(1, TODAY.minusDays(14), false),
            training(2, TODAY.minusDays(7), true),
            training(3, TODAY.minusDays(3), false));

        final PlayerUsage usage = calculator.calculate(
            List.of(), Set.of(), Set.of(), List.of(), trainings, Set.of(1L, 2L), TODAY);

        assertThat(usage.trainingsTotal()).isEqualTo(2);
        // Anwesenheit beim abgesagten Training zaehlt nicht mit.
        assertThat(usage.trainingsAttended()).isEqualTo(1);
    }

    @Test
    void futureTrainingsDontCount() {
        final List<Training> trainings = List.of(
            training(1, TODAY.minusDays(2), false),
            training(2, TODAY.plusDays(2), false));

        final PlayerUsage usage = calculator.calculate(
            List.of(), Set.of(), Set.of(), List.of(), trainings, Set.of(), TODAY);

        assertThat(usage.trainingsTotal()).isEqualTo(1);
    }

    @Test
    void averagesBattingOrderOverAllAppearances() {
        final PlayerUsage usage = calculator.calculate(
            List.of(), Set.of(), Set.of(), List.of(3, 3, 4, 10), List.of(), Set.of(), TODAY);

        assertThat(usage.averageBattingOrder()).isEqualTo(5.0);
        assertThat(usage.battingOrderCounts()).containsExactlyInAnyOrderEntriesOf(
            Map.of(3, 2, 4, 1, 10, 1));
    }

    @Test
    void roundsAverageToOneDecimal() {
        final PlayerUsage usage = calculator.calculate(
            List.of(), Set.of(), Set.of(), List.of(1, 2, 2), List.of(), Set.of(), TODAY);

        assertThat(usage.averageBattingOrder()).isEqualTo(1.7);
    }

    @Test
    void countsOnlyFromFirstAppearance() {
        // Wer im Mai dazugestossen ist, hat den April nicht versaeumt.
        final List<GameDay> gameDays = List.of(
            gameDay(1, TODAY.minusDays(90)),
            gameDay(2, TODAY.minusDays(30)),
            gameDay(3, TODAY.minusDays(10)));

        final PlayerUsage usage = calculator.calculate(
            gameDays, Set.of(2L), Set.of(2L), List.of(), List.of(), Set.of(), TODAY);

        assertThat(usage.gameDaysTotal()).isEqualTo(2);
        assertThat(usage.gameDaysAvailable()).isEqualTo(1);
    }

    @Test
    void trainingsBeforeFirstAppearanceDontCount() {
        final List<Training> trainings = List.of(
            training(1, TODAY.minusDays(90), false),
            training(2, TODAY.minusDays(30), false),
            training(3, TODAY.minusDays(10), false));

        final PlayerUsage usage = calculator.calculate(
            List.of(), Set.of(), Set.of(), List.of(), trainings, Set.of(2L), TODAY);

        assertThat(usage.trainingsTotal()).isEqualTo(2);
        assertThat(usage.trainingsAttended()).isEqualTo(1);
    }

    @Test
    void firstGameDayAlsoOpensTheTrainingCount() {
        // Erster Kontakt war ein Spieltag — ab da zaehlen auch die Trainings mit,
        // auch die verpassten.
        final List<GameDay> gameDays = List.of(gameDay(1, TODAY.minusDays(40)));
        final List<Training> trainings = List.of(
            training(1, TODAY.minusDays(60), false),
            training(2, TODAY.minusDays(20), false));

        final PlayerUsage usage = calculator.calculate(
            gameDays, Set.of(1L), Set.of(), List.of(), trainings, Set.of(), TODAY);

        assertThat(usage.trainingsTotal()).isEqualTo(1);
        assertThat(usage.trainingsAttended()).isZero();
    }

    @Test
    void yearFilterKeepsOnlyThatSeason() {
        final List<GameDay> gameDays = List.of(
            gameDay(1, LocalDate.of(2025, 5, 10)),
            gameDay(2, LocalDate.of(2026, 5, 10)),
            gameDay(3, LocalDate.of(2026, 6, 10)));
        final List<Training> trainings = List.of(
            training(1, LocalDate.of(2025, 2, 1), false),
            training(2, LocalDate.of(2026, 2, 1), false));

        final PlayerUsage usage = calculator.calculate(
            gameDays, Set.of(1L, 2L, 3L), Set.of(2L), List.of(), trainings, Set.of(1L, 2L), TODAY,
            UsageScope.ofYear(2026));

        assertThat(usage.gameDaysTotal()).isEqualTo(2);
        assertThat(usage.gameDaysAvailable()).isEqualTo(2);
        assertThat(usage.gameDaysPlayed()).isEqualTo(1);
        assertThat(usage.trainingsTotal()).isEqualTo(1);
        assertThat(usage.trainingsAttended()).isEqualTo(1);
    }

    @Test
    void seasonFilterKeepsOnlyThatSeasonAndDropsTrainings() {
        // Trainings haengen an keiner Saison — im Saison-Zuschnitt bleiben sie leer,
        // statt ueber ein geratenes Datumsfenster hineingerechnet zu werden.
        final GameDay liga = gameDay(1, TODAY.minusDays(30));
        liga.setSeason(new Season(7L, "Ruhr Fun Liga", 2026));
        final GameDay turnier = gameDay(2, TODAY.minusDays(20));
        turnier.setSeason(new Season(8L, "Hengelo", 2026));

        final PlayerUsage usage = calculator.calculate(
            List.of(liga, turnier), Set.of(1L, 2L), Set.of(1L, 2L), List.of(),
            List.of(training(1, TODAY.minusDays(25), false)), Set.of(1L), TODAY,
            UsageScope.ofSeason(7L));

        assertThat(usage.gameDaysTotal()).isEqualTo(1);
        assertThat(usage.gameDaysPlayed()).isEqualTo(1);
        assertThat(usage.trainingsTotal()).isZero();
    }

    @Test
    void gameDaysWithoutDateAreIgnored() {
        final GameDay undated = new GameDay();
        undated.setId(9L);

        final PlayerUsage usage = calculator.calculate(
            List.of(undated, gameDay(1, TODAY.minusDays(1))), Set.of(9L, 1L), Set.of(), List.of(), List.of(), Set.of(), TODAY);

        assertThat(usage.gameDaysTotal()).isEqualTo(1);
        assertThat(usage.gameDaysAvailable()).isEqualTo(1);
    }
}
