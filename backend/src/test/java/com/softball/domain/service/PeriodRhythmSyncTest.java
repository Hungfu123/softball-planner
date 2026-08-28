package com.softball.domain.service;

import com.softball.domain.model.Training;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PeriodRhythmSyncTest {

    private final PeriodRhythmSync sync = new PeriodRhythmSync();

    private Training training(final long id, final LocalDate date) {
        final Training t = new Training(date, null, null);
        t.setId(id);
        return t;
    }

    // Zeitraum Mo 2026-06-01 .. So 2026-06-14. "Heute" = 2026-06-08 (Mo).
    private final LocalDate start = LocalDate.of(2026, 6, 1);
    private final LocalDate end = LocalDate.of(2026, 6, 14);
    private final LocalDate today = LocalDate.of(2026, 6, 8);

    @Test
    void addWeekday_createsOnlyFutureDates() {
        // Rhythmus Dienstag (2). Künftige Dienstage >= 2026-06-08: 09., (02. ist Vergangenheit).
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(2), start, end, today, List.of(), 1, List.of(1));
        assertThat(plan.datesToCreate()).containsExactly(LocalDate.of(2026, 6, 9));
        assertThat(plan.trainingIdsToDelete()).isEmpty();
    }

    @Test
    void existingFutureDateOnKeptWeekday_isNotDuplicated() {
        // Dienstag 09. existiert bereits -> nicht erneut anlegen.
        final Training existing = training(1L, LocalDate.of(2026, 6, 9));
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(2), start, end, today, List.of(existing), 1, List.of(1));
        assertThat(plan.datesToCreate()).isEmpty();
        assertThat(plan.trainingIdsToDelete()).isEmpty();
    }

    @Test
    void removeWeekday_deletesOnlyFutureTrainingsOnThatWeekday() {
        // Bestehende Donnerstage (4): 04. (Vergangenheit), 11. (Zukunft). Rhythmus jetzt nur Dienstag.
        final Training pastThu = training(1L, LocalDate.of(2026, 6, 4));
        final Training futureThu = training(2L, LocalDate.of(2026, 6, 11));
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(2), start, end, today, List.of(pastThu, futureThu), 1, List.of(1));
        assertThat(plan.trainingIdsToDelete()).containsExactly(2L);
        // Dienstag 09. fehlt noch -> anlegen.
        assertThat(plan.datesToCreate()).containsExactly(LocalDate.of(2026, 6, 9));
    }

    @Test
    void pastTrainings_areNeverTouched() {
        final Training pastTue = training(1L, LocalDate.of(2026, 6, 2));
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(4), start, end, today, List.of(pastTue), 1, List.of(1));
        assertThat(plan.trainingIdsToDelete()).isEmpty();
    }

    @Test
    void removeWeekday_doesNotDeleteTrainingOutsidePeriodWindow() {
        // Donnerstag 2026-06-18 liegt nach end (2026-06-14) -> darf NICHT gelöscht werden,
        // auch wenn Donnerstag nicht mehr im Rhythmus ist.
        final Training afterEnd = training(3L, LocalDate.of(2026, 6, 18)); // Donnerstag, nach end
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(2), start, end, today, List.of(afterEnd), 1, List.of(1));
        assertThat(plan.trainingIdsToDelete()).isEmpty();
    }

    @Test
    void cycleOfFour_onlyCreatesOnMatchingCycleWeek() {
        // Zyklus ab 'start' (2026-06-01, Mo), 4 Wochen, nur Position 1 aktiv.
        // Dienstage im Fenster: 02.(Woche0,aktiv,Vergangenheit), 09.(Woche1,inaktiv).
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(2), start, end, today, List.of(), 4, List.of(1));
        assertThat(plan.datesToCreate()).isEmpty();
    }

    @Test
    void cycleOfFour_deletesExistingTrainingOnInactiveCycleWeek() {
        // Dienstag 09. (Woche1) liegt nicht auf der aktiven Zyklus-Woche (nur Woche1 = Position1 der 09. ist... )
        final Training futureTue = training(2L, LocalDate.of(2026, 6, 9));
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(2), start, end, today, List.of(futureTue), 4, List.of(1));
        assertThat(plan.trainingIdsToDelete()).containsExactly(2L);
    }

    @Test
    void cycleOfFour_complementWeeks_keepsMatchingCycleTrainings() {
        final Training futureTue = training(2L, LocalDate.of(2026, 6, 9));
        final PeriodRhythmSync.SyncPlan plan = sync.computeFuture(List.of(2), start, end, today, List.of(futureTue), 4, List.of(2, 3, 4));
        assertThat(plan.trainingIdsToDelete()).isEmpty();
        assertThat(plan.datesToCreate()).isEmpty();
    }
}
