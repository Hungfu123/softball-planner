package com.softball.domain.service;

import com.softball.domain.model.Training;
import org.junit.jupiter.api.Test;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class CoupledPollTargetResolverTest {
    private final CoupledPollTargetResolver resolver = new CoupledPollTargetResolver();
    private final LocalDate today = LocalDate.of(2026, 7, 20); // Montag

    private Training t(long id, LocalDate d, boolean cancelled) {
        final Training tr = new Training(id, d, "20:00", "Park");
        tr.setCancelled(cancelled);
        return tr;
    }

    @Test
    void nextValidTrainingOnWeekday() {
        final Training thu = t(1, LocalDate.of(2026, 7, 23), false); // Do
        final var out = resolver.resolve(List.of(thu), DayOfWeek.THURSDAY, List.of(), today);
        assertThat(out).contains(thu);
    }

    @Test
    void skipsCancelledAndSkipDates_takesNext() {
        final Training thu1 = t(1, LocalDate.of(2026, 7, 23), true);  // Do, abgesagt
        final Training thu2 = t(2, LocalDate.of(2026, 7, 30), false); // Do, skip-date
        final Training thu3 = t(3, LocalDate.of(2026, 8, 6), false);  // Do, gültig
        final var out = resolver.resolve(List.of(thu3, thu1, thu2), DayOfWeek.THURSDAY,
                List.of(LocalDate.of(2026, 7, 30)), today);
        assertThat(out).contains(thu3);
    }

    @Test
    void emptyWhenNoFutureTrainingOnWeekday() {
        final Training mon = t(1, LocalDate.of(2026, 7, 27), false); // Mo
        final var out = resolver.resolve(List.of(mon), DayOfWeek.THURSDAY, List.of(), today);
        assertThat(out).isEmpty();
    }
}
