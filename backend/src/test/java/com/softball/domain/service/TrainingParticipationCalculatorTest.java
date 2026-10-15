package com.softball.domain.service;

import com.softball.domain.model.Player;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class TrainingParticipationCalculatorTest {

    private static final Player ALT = new Player(1L, "Seit Januar dabei", true);
    private static final Player NEU = new Player(2L, "Seit Juni dabei", true);
    private static final Player NIE = new Player(3L, "War nie da", true);

    @Test
    void newcomerIsNotPenalisedForTrainingsBeforeTheyExisted() {
        // Zehn Trainings, je eins pro Woche ab dem 05.01.
        final List<Training> trainings = weekly(LocalDate.of(2026, 1, 5), 10);

        // Der Alte war bei 5 von 10 da. Der Neue taucht erst beim achten auf und ist
        // seitdem bei allen dreien gewesen.
        final List<TrainingAttendance> attendances = new ArrayList<>();
        for (int i = 0; i < 5; i++) attendances.add(present(trainings.get(i), ALT));
        for (int i = 7; i < 10; i++) attendances.add(present(trainings.get(i), NEU));

        final Map<Long, Double> rates = TrainingParticipationCalculator.rates(trainings, attendances);

        // Roh gezaehlt laege der Neue mit 3 zu 5 hinten. Als Quote steht er vorn.
        assertThat(rates.get(ALT.getId())).isCloseTo(0.5, within(0.001));
        assertThat(rates.get(NEU.getId())).isCloseTo(1.0, within(0.001));
        assertThat(rates.get(NEU.getId())).isGreaterThan(rates.get(ALT.getId()));
    }

    @Test
    void absentPlayerHasNoRateAtAll() {
        final List<Training> trainings = weekly(LocalDate.of(2026, 1, 5), 4);
        final List<TrainingAttendance> attendances = List.of(absent(trainings.get(0), NIE));

        final Map<Long, Double> rates = TrainingParticipationCalculator.rates(trainings, attendances);

        // Ein "Nein" in der Umfrage ist kein Auftauchen — sonst zoege es den Nenner auf.
        assertThat(rates).doesNotContainKey(NIE.getId());
    }

    @Test
    void onlyTrainingsHandedInCount() {
        // Der Aufrufer filtert das P/C-Training heraus. Was nicht in der Liste steht,
        // darf weder Zaehler noch Nenner beruehren — auch nicht ueber eine Anwesenheit.
        final List<Training> alle = weekly(LocalDate.of(2026, 1, 5), 8);
        final List<Training> ohnePitcherCatcher = List.of(alle.get(0), alle.get(2), alle.get(4), alle.get(6));

        final List<TrainingAttendance> attendances = List.of(
            present(alle.get(0), ALT),
            present(alle.get(2), ALT),
            present(alle.get(1), ALT),   // "P/C" — gefiltert
            present(alle.get(3), ALT),   // "P/C" — gefiltert
            present(alle.get(5), ALT));  // "P/C" — gefiltert

        final Map<Long, Double> rates = TrainingParticipationCalculator.rates(ohnePitcherCatcher, attendances);

        // 2 von 4 Basic-Trainings — die drei P/C-Besuche zaehlen nirgends mit.
        assertThat(rates.get(ALT.getId())).isCloseTo(0.5, within(0.001));
    }

    @Test
    void tinyDenominatorIsFlooredSoTwoOfTwoDoesNotOutrankEveryone() {
        // Zehn Trainings. Der Alte war bei 7 da. Der Neue taucht erst beim vorletzten auf
        // und ist seitdem bei beiden gewesen.
        final List<Training> trainings = weekly(LocalDate.of(2026, 1, 5), 10);

        final List<TrainingAttendance> attendances = new ArrayList<>();
        for (int i = 0; i < 7; i++) attendances.add(present(trainings.get(i), ALT));
        for (int i = 8; i < 10; i++) attendances.add(present(trainings.get(i), NEU));

        final Map<Long, Double> rates = TrainingParticipationCalculator.rates(trainings, attendances);

        // Ohne Untergrenze waere das 2/2 = 1.0 und stuende vor den 7/10 des Alten.
        assertThat(rates.get(NEU.getId())).isCloseTo(2.0 / 3.0, within(0.001));
        assertThat(rates.get(ALT.getId())).isCloseTo(0.7, within(0.001));
        assertThat(rates.get(NEU.getId())).isLessThan(rates.get(ALT.getId()));
    }

    @Test
    void futureTrainingsMustNotReachTheDenominator() {
        // Regression: der Aufrufer begrenzt das Fenster nach oben. Reicht er trotzdem
        // Termine herein, an denen noch niemand gewesen sein KANN, verwaessern die die
        // Quote — und zwar kleine Nenner am haertesten, also genau die Neuzugaenge.
        final List<Training> vergangen = weekly(LocalDate.of(2026, 1, 5), 4);
        final List<TrainingAttendance> attendances = List.of(
            present(vergangen.get(0), ALT),
            present(vergangen.get(1), ALT),
            present(vergangen.get(2), ALT),
            present(vergangen.get(3), ALT));

        final Map<Long, Double> sauber = TrainingParticipationCalculator.rates(vergangen, attendances);
        assertThat(sauber.get(ALT.getId())).isCloseTo(1.0, within(0.001));

        // Dasselbe mit vier noch nicht stattgefundenen Terminen hintendran.
        final List<Training> mitZukunft = new ArrayList<>(vergangen);
        mitZukunft.addAll(weekly(LocalDate.of(2026, 6, 1), 4).stream()
            .peek(t -> t.setId(t.getId() + 100)).toList());

        final Map<Long, Double> verwaessert = TrainingParticipationCalculator.rates(mitZukunft, attendances);
        assertThat(verwaessert.get(ALT.getId())).isCloseTo(0.5, within(0.001));
    }

    @Test
    void emptyInputsYieldEmptyMap() {
        assertThat(TrainingParticipationCalculator.rates(List.of(), List.of())).isEmpty();
        assertThat(TrainingParticipationCalculator.rates(null, List.of())).isEmpty();
        assertThat(TrainingParticipationCalculator.rates(weekly(LocalDate.of(2026, 1, 5), 2), null)).isEmpty();
    }

    @Test
    void duplicateAttendanceRowsCountOnce() {
        final List<Training> trainings = weekly(LocalDate.of(2026, 1, 5), 4);
        final List<TrainingAttendance> attendances = List.of(
            present(trainings.get(0), ALT),
            present(trainings.get(0), ALT));

        final Map<Long, Double> rates = TrainingParticipationCalculator.rates(trainings, attendances);

        // Zwei Zeilen zum selben Training duerfen keine Quote ueber 1.0 ergeben.
        assertThat(rates.get(ALT.getId())).isCloseTo(0.25, within(0.001));
    }

    private static List<Training> weekly(final LocalDate start, final int count) {
        final List<Training> trainings = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            final Training t = new Training((long) (i + 1), start.plusWeeks(i), "19:00", "Halle");
            trainings.add(t);
        }
        return trainings;
    }

    private static TrainingAttendance present(final Training training, final Player player) {
        return new TrainingAttendance(training, player, true);
    }

    private static TrainingAttendance absent(final Training training, final Player player) {
        return new TrainingAttendance(training, player, false);
    }
}
