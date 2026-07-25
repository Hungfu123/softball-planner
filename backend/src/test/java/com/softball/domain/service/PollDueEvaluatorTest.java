package com.softball.domain.service;

import com.softball.domain.model.Training;
import com.softball.domain.model.WhatsappPoll;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class PollDueEvaluatorTest {

    private final PollDueEvaluator ev = new PollDueEvaluator();

    private WhatsappPoll poll() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setEnabled(true);
        p.setWeekday(DayOfWeek.THURSDAY);
        p.setTime(LocalTime.of(18, 0));
        return p;
    }

    private Training thu() {
        return new Training(1L, LocalDate.of(2026, 7, 23), "20:00", "Park");
    }

    @Test
    void dueOnDayBeforeTrainingAtSendTime() {
        assertThat(ev.isDue(poll(), thu(), LocalDateTime.of(2026, 7, 22, 18, 0))).isTrue();
    }

    @Test
    void notDueWrongDay() {
        assertThat(ev.isDue(poll(), thu(), LocalDateTime.of(2026, 7, 21, 18, 0))).isFalse();
    }

    @Test
    void notDueWrongTime() {
        assertThat(ev.isDue(poll(), thu(), LocalDateTime.of(2026, 7, 22, 17, 0))).isFalse();
    }

    @Test
    void notDueWhenNoTarget() {
        assertThat(ev.isDue(poll(), null, LocalDateTime.of(2026, 7, 22, 18, 0))).isFalse();
    }

    @Test
    void notDueWhenAlreadySentForThatTraining() {
        final WhatsappPoll p = poll();
        p.setLastSentTrainingId(1L);
        assertThat(ev.isDue(p, thu(), LocalDateTime.of(2026, 7, 22, 18, 0))).isFalse();
    }

    @Test
    void notDueWhenDisabled() {
        final WhatsappPoll p = poll();
        p.setEnabled(false);
        assertThat(ev.isDue(p, thu(), LocalDateTime.of(2026, 7, 22, 18, 0))).isFalse();
    }

    @Test
    void oneOff_dueAtSendDateAndTime() {
        final PollDueEvaluator ev = new PollDueEvaluator();
        final WhatsappPoll p = new WhatsappPoll();
        p.setEnabled(true);
        p.setTrainingCoupled(false);
        p.setSendDate(java.time.LocalDate.of(2026, 8, 5));
        p.setTime(java.time.LocalTime.of(10, 25));
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 5, 10, 25))).isTrue();
    }

    @Test
    void oneOff_notDueOnceSent() {
        final PollDueEvaluator ev = new PollDueEvaluator();
        final WhatsappPoll p = new WhatsappPoll();
        p.setEnabled(true);
        p.setTrainingCoupled(false);
        p.setSendDate(java.time.LocalDate.of(2026, 8, 5));
        p.setTime(java.time.LocalTime.of(10, 25));
        p.setLastSentAt(java.time.LocalDateTime.of(2026, 8, 5, 10, 25));
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 5, 10, 25))).isFalse();
    }

    @Test
    void oneOff_notDueWrongMinute() {
        final PollDueEvaluator ev = new PollDueEvaluator();
        final WhatsappPoll p = new WhatsappPoll();
        p.setEnabled(true);
        p.setTrainingCoupled(false);
        p.setSendDate(java.time.LocalDate.of(2026, 8, 5));
        p.setTime(java.time.LocalTime.of(10, 25));
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 5, 10, 26))).isFalse();
    }
}
