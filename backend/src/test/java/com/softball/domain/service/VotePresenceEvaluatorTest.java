package com.softball.domain.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class VotePresenceEvaluatorTest {

    private final VotePresenceEvaluator ev = new VotePresenceEvaluator();
    private final LocalDate day = LocalDate.of(2026, 4, 14);

    @Test
    void presentWhenJaSelected() {
        assertThat(ev.isPresent(List.of("Ja"))).isTrue();
        assertThat(ev.isPresent(List.of(" ja "))).isTrue();
        assertThat(ev.isPresent(List.of("Nein"))).isFalse();
        assertThat(ev.isPresent(List.of())).isFalse();
    }

    @Test
    void gateClosedBeforeTrainingTime() {
        assertThat(ev.gateOpen("20:00", LocalDateTime.of(2026, 4, 14, 19, 59), day)).isFalse();
    }

    @Test
    void gateOpenAtOrAfterTrainingTime() {
        assertThat(ev.gateOpen("20:00", LocalDateTime.of(2026, 4, 14, 20, 0), day)).isTrue();
        assertThat(ev.gateOpen("20:00", LocalDateTime.of(2026, 4, 14, 22, 0), day)).isTrue();
    }

    @Test
    void gateClosedOnDifferentDay() {
        assertThat(ev.gateOpen("20:00", LocalDateTime.of(2026, 4, 15, 20, 0), day)).isFalse();
    }

    @Test
    void gateOpenWhenTimeUnparseable() {
        assertThat(ev.gateOpen("kaputt", LocalDateTime.of(2026, 4, 14, 6, 0), day)).isTrue();
        assertThat(ev.gateOpen(null, LocalDateTime.of(2026, 4, 14, 6, 0), day)).isTrue();
    }

    @Test
    void gateClosedBeforeOffsetTrainingTime() {
        assertThat(ev.gateOpen("20:00", LocalDateTime.of(2026, 4, 14, 20, 30), day, 1)).isFalse();
    }

    @Test
    void gateOpenAtOrAfterOffsetTrainingTime() {
        assertThat(ev.gateOpen("20:00", LocalDateTime.of(2026, 4, 14, 21, 0), day, 1)).isTrue();
    }
}
