package com.softball.domain.service;

import com.softball.domain.model.Training;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class TargetTrainingResolverTest {

    private final TargetTrainingResolver resolver = new TargetTrainingResolver();

    // Poll am Vortag vormittag verschickt (Mi 09:00), Training Do 19:00.
    private final LocalDateTime sentAt = LocalDateTime.of(2026, 4, 15, 9, 0); // Mi 09:00

    private Training t(final long id, final LocalDate date, final String time, final boolean cancelled) {
        final Training tr = new Training(id, date, time, "Park");
        tr.setCancelled(cancelled);
        return tr;
    }

    @Test
    void picksNextTrainingWithinWindow() {
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, LocalDate.of(2026, 4, 16), "19:00", false),  // Do 19:00 → ~34h
            t(2, LocalDate.of(2026, 4, 18), "13:00", false)   // Sa 13:00 → außerhalb 48h
        ), sentAt);
        assertThat(r).map(Training::getId).contains(1L);
    }

    @Test
    void eveningPollNextDay() {
        // Abend-Poll So 20:00 → Training Mo 20:00 = 24h
        final LocalDateTime sun = LocalDateTime.of(2026, 4, 12, 20, 0);
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, LocalDate.of(2026, 4, 13), "20:00", false)), sun);
        assertThat(r).map(Training::getId).contains(1L);
    }

    @Test
    void morningPollToLateNextDayTrainingWithin48h() {
        // Mi 09:00 → Do 20:00 = 35h, klar im 48h-Fenster
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, LocalDate.of(2026, 4, 16), "20:00", false)), sentAt);
        assertThat(r).map(Training::getId).contains(1L);
    }

    @Test
    void skipsCancelledEvenIfNearest() {
        // Do 19:00 abgesagt; nächstes nicht-abgesagtes wäre Sa 13:00 = ~76h > 48h → nichts
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, LocalDate.of(2026, 4, 16), "19:00", true),
            t(2, LocalDate.of(2026, 4, 18), "13:00", false)
        ), sentAt);
        assertThat(r).isEmpty();
    }

    @Test
    void ignoresTrainingBeforeSend() {
        // Training am selben Tag aber vor dem Versand (Mi 08:00 < Mi 09:00)
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, LocalDate.of(2026, 4, 15), "08:00", false)), sentAt);
        assertThat(r).isEmpty();
    }

    @Test
    void ignoresBeyond48h() {
        // Fr 19:00 = ~58h nach Mi 09:00 → außerhalb
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, LocalDate.of(2026, 4, 17), "19:00", false)), sentAt);
        assertThat(r).isEmpty();
    }

    @Test
    void ignoresNextWeekSameTraining() {
        // Do nächste Woche (168h) darf nie gebucht werden
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, LocalDate.of(2026, 4, 23), "19:00", false)), sentAt);
        assertThat(r).isEmpty();
    }

    @Test
    void picksNearestWhenTwoInWindow() {
        // Do 19:00 (~34h) und Fr 08:00 (~47h) beide im Fenster → das nächstgelegene (Do)
        final Optional<Training> r = resolver.resolve(List.of(
            t(2, LocalDate.of(2026, 4, 17), "08:00", false),
            t(1, LocalDate.of(2026, 4, 16), "19:00", false)
        ), sentAt);
        assertThat(r).map(Training::getId).contains(1L);
    }

    @Test
    void unparseableTimeFallsBackToDayStart() {
        // kaputte Uhrzeit → Tagesbeginn (Do 00:00 = ~15h) → noch im Fenster, wird genommen (kein Crash)
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, LocalDate.of(2026, 4, 16), "kaputt", false)), sentAt);
        assertThat(r).map(Training::getId).contains(1L);
    }

    @Test
    void emptyWhenNoCandidates() {
        assertThat(resolver.resolve(List.of(), sentAt)).isEmpty();
    }

    @Test
    void emptyWhenSentAtNull() {
        assertThat(resolver.resolve(List.of(t(1, LocalDate.of(2026, 4, 16), "19:00", false)), null)).isEmpty();
    }
}
