package com.softball.domain.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Dauer-Hochrechnung fuer Spiele OHNE Zeitlimit: Tempo (verstrichene Zeit je abgeschlossenem
 * Halbinning) hochgerechnet auf ein reguläres Spiel (7 Innings = 14 Halbinnings). Siehe
 * docs/SPIELBOGEN.md, Abschnitt "Dauer-Schätzung ohne Limit", fuer die Herleitung.
 */
class GameDurationEstimatorTest {

    private final GameDurationEstimator estimator = new GameDurationEstimator();

    // Top des 4. Innings: 3 volle Innings (6 Halbinnings) + die laufende Haelfte ist noch nicht
    // abgeschlossen -> 6 abgeschlossene Halbinnings.
    @Test
    void completedHalfInnings_topOfInning() {
        assertThat(GameDurationEstimator.completedHalfInnings(4, false)).isEqualTo(6);
    }

    // Bottom des 4. Innings: die Top-Haelfte des 4. ist bereits vorbei -> 7 abgeschlossene
    // Halbinnings (siehe Auftragsbeschreibung: "Top des 4. -> 6, Bottom des 4. -> 7").
    @Test
    void completedHalfInnings_bottomOfInning() {
        assertThat(GameDurationEstimator.completedHalfInnings(4, true)).isEqualTo(7);
    }

    @Test
    void completedHalfInnings_startOfGame() {
        assertThat(GameDurationEstimator.completedHalfInnings(1, false)).isZero();
        assertThat(GameDurationEstimator.completedHalfInnings(1, true)).isEqualTo(1);
    }

    // Top des 4. -> 6 abgeschlossene Halbinnings, 3600s gelaufen -> Tempo 600s/Halbinning ->
    // Gesamt 600*14=8400s=140min, Rest 8400-3600=4800s=80min.
    @Test
    void estimatesPaceAndTotal_topOfInning() {
        final int completed = GameDurationEstimator.completedHalfInnings(4, false);

        final var result = estimator.estimate(3600, completed, null, true, false);

        assertThat(result).isPresent();
        assertThat(result.get().completedHalfInnings()).isEqualTo(6);
        assertThat(result.get().totalMinutes()).isEqualTo(140);
        assertThat(result.get().remainingMinutes()).isEqualTo(80);
    }

    // Bottom des 4. -> 7 abgeschlossene Halbinnings, 4200s gelaufen -> selbes Tempo (600s/HI),
    // aber andere gelaufene Zeit -> selbe Gesamtdauer, andere Restzeit. Deckt "beide Seiten" ab.
    @Test
    void estimatesPaceAndTotal_bottomOfInning() {
        final int completed = GameDurationEstimator.completedHalfInnings(4, true);

        final var result = estimator.estimate(4200, completed, null, true, false);

        assertThat(result).isPresent();
        assertThat(result.get().completedHalfInnings()).isEqualTo(7);
        assertThat(result.get().totalMinutes()).isEqualTo(140);
        assertThat(result.get().remainingMinutes()).isEqualTo(70);
    }

    // Fruehes Tempo ist zu verrauscht -- kein Wert ist besser als ein schlechter Wert.
    @Test
    void belowThreeCompletedHalfInnings_noEstimate() {
        assertThat(estimator.estimate(600, 2, null, true, false)).isEmpty();
    }

    // Mit gesetztem Limit zaehlt die Restzeit gegen das Limit -- eine zweite Zahl daneben
    // wuerde mit dieser konkurrieren statt sie zu ergaenzen.
    @Test
    void limitSet_noEstimate() {
        assertThat(estimator.estimate(3600, 6, 90, true, false)).isEmpty();
    }

    @Test
    void neverStarted_noEstimate() {
        assertThat(estimator.estimate(0, 0, null, false, false)).isEmpty();
    }

    // Entscheidung: ein beendetes Spiel liefert keine Hochrechnung mehr. Die gelaufene Zeit IST
    // zu diesem Zeitpunkt schon die tatsaechliche Gesamtdauer -- eine Prognose stuende daneben
    // und wuerde ihr widersprechen statt sie zu ergaenzen (siehe Klassenkommentar/Doku).
    @Test
    void endedGame_noEstimate() {
        assertThat(estimator.estimate(3600, 6, null, true, true)).isEmpty();
    }
}
