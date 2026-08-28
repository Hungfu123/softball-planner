package com.softball.domain.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TrainingCycleEvaluatorTest {

    // Anker: Montag 2026-01-05.
    private final LocalDate anchor = LocalDate.of(2026, 1, 5);

    @Test
    void cycleOfOne_alwaysActive_regardlessOfActiveWeeks() {
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor, anchor, 1, List.of())).isTrue();
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.plusWeeks(3), anchor, 1, null)).isTrue();
    }

    @Test
    void cycleOfFour_onlyWeekOneActive_matchesEveryFourthWeek() {
        final List<Integer> activeWeeks = List.of(1);
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor, anchor, 4, activeWeeks)).isTrue(); // Woche 0 -> Position 1
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.plusWeeks(1), anchor, 4, activeWeeks)).isFalse();
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.plusWeeks(2), anchor, 4, activeWeeks)).isFalse();
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.plusWeeks(3), anchor, 4, activeWeeks)).isFalse();
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.plusWeeks(4), anchor, 4, activeWeeks)).isTrue(); // nächster Zyklus
    }

    @Test
    void cycleOfFour_complementWeeksActive_skipsOnlyEveryFourthWeek() {
        final List<Integer> activeWeeks = List.of(1, 2, 3);
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor, anchor, 4, activeWeeks)).isTrue();
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.plusWeeks(1), anchor, 4, activeWeeks)).isTrue();
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.plusWeeks(2), anchor, 4, activeWeeks)).isTrue();
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.plusWeeks(3), anchor, 4, activeWeeks)).isFalse();
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.plusWeeks(4), anchor, 4, activeWeeks)).isTrue();
    }

    @Test
    void dateBeforeAnchor_resolvesCorrectlyViaFloorMod() {
        // Eine Woche vor Anker -> Position 4 in einem 4er-Zyklus (floorMod(-1, 4) = 3 -> +1 = 4).
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.minusWeeks(1), anchor, 4, List.of(4))).isTrue();
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor.minusWeeks(1), anchor, 4, List.of(1))).isFalse();
    }

    @Test
    void nullOrEmptyActiveWeeks_defaultsToPositionOne() {
        assertThat(TrainingCycleEvaluator.normalize(null)).containsExactly(1);
        assertThat(TrainingCycleEvaluator.normalize(List.of())).containsExactly(1);
        assertThat(TrainingCycleEvaluator.isActiveWeek(anchor, anchor, 4, null)).isTrue();
    }
}
