package com.softball.domain.service;

import com.softball.domain.model.Training;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class TargetTrainingResolverTest {

    private final TargetTrainingResolver resolver = new TargetTrainingResolver();
    private final LocalDate sent = LocalDate.of(2026, 4, 13); // Montag

    private Training t(long id, LocalDate date, boolean cancelled) {
        final Training tr = new Training(id, date, "20:00", "Park");
        tr.setCancelled(cancelled);
        return tr;
    }

    @Test
    void picksNearestUpcomingNonCancelled() {
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, sent.plusDays(1), false),
            t(2, sent.plusDays(3), false)
        ), sent);
        assertThat(r).map(Training::getId).contains(1L);
    }

    @Test
    void includesSameDay() {
        final Optional<Training> r = resolver.resolve(List.of(t(1, sent, false)), sent);
        assertThat(r).map(Training::getId).contains(1L);
    }

    @Test
    void skipsCancelled() {
        final Optional<Training> r = resolver.resolve(List.of(
            t(1, sent.plusDays(1), true),
            t(2, sent.plusDays(2), false)
        ), sent);
        assertThat(r).map(Training::getId).contains(2L);
    }

    @Test
    void ignoresPast() {
        final Optional<Training> r = resolver.resolve(List.of(t(1, sent.minusDays(1), false)), sent);
        assertThat(r).isEmpty();
    }

    @Test
    void ignoresBeyondSevenDays() {
        final Optional<Training> r = resolver.resolve(List.of(t(1, sent.plusDays(8), false)), sent);
        assertThat(r).isEmpty();
    }

    @Test
    void emptyWhenNoCandidates() {
        assertThat(resolver.resolve(List.of(), sent)).isEmpty();
    }
}
