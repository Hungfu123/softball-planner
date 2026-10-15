package com.softball.application;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** Zeitfenster der Trainingsbeteiligung — reine Datumslogik, ohne Spring. */
class LineupSuggestionServiceWindowTest {

    @Test
    void trainingsjahrBeginntAmLetztenErstenNovember() {
        assertThat(LineupSuggestionService.trainingYearStart(LocalDate.of(2026, 11, 1)))
            .isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(LineupSuggestionService.trainingYearStart(LocalDate.of(2026, 10, 31)))
            .isEqualTo(LocalDate.of(2025, 11, 1));
        assertThat(LineupSuggestionService.trainingYearStart(LocalDate.of(2027, 2, 14)))
            .isEqualTo(LocalDate.of(2026, 11, 1));
    }

    @Test
    void gezaehltWirdBisZumSpieltag_wennDerVorbeiIst() {
        assertThat(LineupSuggestionService.countUntil(
                LocalDate.of(2026, 6, 20), LocalDate.of(2026, 10, 15)))
            .isEqualTo(LocalDate.of(2026, 6, 20));
    }

    @Test
    void gezaehltWirdNieUeberHeuteHinaus() {
        // Der Normalfall: man stellt fuer einen kommenden Spieltag auf. Die Trainings
        // zwischen heute und ihm stehen laengst in der DB, anwesend war dort niemand.
        assertThat(LineupSuggestionService.countUntil(
                LocalDate.of(2026, 11, 7), LocalDate.of(2026, 10, 15)))
            .isEqualTo(LocalDate.of(2026, 10, 15));
    }

    @Test
    void ohneSpieltagZaehltHeute() {
        assertThat(LineupSuggestionService.countUntil(null, LocalDate.of(2026, 10, 15)))
            .isEqualTo(LocalDate.of(2026, 10, 15));
    }
}
