package com.softball.domain.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Reine Zyklus-Logik: ob ein Datum innerhalb eines N-Wochen-Zyklus (ab einem Anker-Datum,
 * z.B. TrainingPeriod.startDate) zu einer "aktiven" Woche gehört. Ermöglicht z.B. "alle 4 Wochen"
 * oder "alle Wochen außer jede 4." (durch Auswahl der Nicht-Zyklus-Wochen als aktiv).
 */
public final class TrainingCycleEvaluator {

    private TrainingCycleEvaluator() {}

    public static List<Integer> normalize(final List<Integer> activeWeeksInCycle) {
        return (activeWeeksInCycle == null || activeWeeksInCycle.isEmpty()) ? List.of(1) : activeWeeksInCycle;
    }

    public static boolean isActiveWeek(final LocalDate date, final LocalDate cycleAnchor,
                                        final int cycleWeeks, final List<Integer> activeWeeksInCycle) {
        if (cycleWeeks <= 1) {
            return true;
        }
        final long weekIndex = Math.floorDiv(ChronoUnit.DAYS.between(cycleAnchor, date), 7);
        final int position = Math.floorMod(weekIndex, cycleWeeks) + 1;
        return normalize(activeWeeksInCycle).contains(position);
    }
}
