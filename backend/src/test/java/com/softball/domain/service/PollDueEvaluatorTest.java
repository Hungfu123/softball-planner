package com.softball.domain.service;

import com.softball.domain.model.PollMode;
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
        p.setMode(PollMode.ONE_OFF);
        p.setSendDate(java.time.LocalDate.of(2026, 8, 5));
        p.setTime(java.time.LocalTime.of(10, 25));
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 5, 10, 25))).isTrue();
    }

    @Test
    void oneOff_notDueOnceSent() {
        final PollDueEvaluator ev = new PollDueEvaluator();
        final WhatsappPoll p = new WhatsappPoll();
        p.setEnabled(true);
        p.setMode(PollMode.ONE_OFF);
        p.setSendDate(java.time.LocalDate.of(2026, 8, 5));
        p.setTime(java.time.LocalTime.of(10, 25));
        p.setLastSentAt(java.time.LocalDateTime.of(2026, 8, 5, 10, 25));
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 5, 10, 25))).isFalse();
    }

    @Test
    void oneOff_notDueBeforeSendTime() {
        final PollDueEvaluator ev = new PollDueEvaluator();
        final WhatsappPoll p = oneOff();
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 5, 10, 24))).isFalse();
    }

    @Test
    void oneOff_catchUpAfterSendTimeSameDay() {
        // Verpasste Minute (Deploy/Neustart) → später am selben Tag trotzdem fällig.
        final PollDueEvaluator ev = new PollDueEvaluator();
        final WhatsappPoll p = oneOff();
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 5, 14, 0))).isTrue();
    }

    @Test
    void oneOff_notDueDifferentDay() {
        final PollDueEvaluator ev = new PollDueEvaluator();
        final WhatsappPoll p = oneOff();
        assertThat(ev.isDueOneOff(p, java.time.LocalDateTime.of(2026, 8, 6, 10, 25))).isFalse();
    }

    private WhatsappPoll oneOff() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setEnabled(true);
        p.setMode(PollMode.ONE_OFF);
        p.setSendDate(java.time.LocalDate.of(2026, 8, 5));
        p.setTime(java.time.LocalTime.of(10, 25));
        return p;
    }

    @Test
    void shouldTreatGameDayPollLikeOneOff() {
        final WhatsappPoll poll = new WhatsappPoll();
        poll.setMode(PollMode.GAME_DAY);
        poll.setGameDayId(42L);
        poll.setTime(LocalTime.of(18, 0));
        poll.setSendDate(LocalDate.of(2026, 8, 2));

        assertThat(ev.isDueOneOff(poll, LocalDateTime.of(2026, 8, 2, 18, 0))).isTrue();
        assertThat(ev.isDueOneOff(poll, LocalDateTime.of(2026, 8, 2, 17, 59))).isFalse();
        assertThat(ev.isDueOneOff(poll, LocalDateTime.of(2026, 8, 3, 18, 0))).isFalse();

        poll.setLastSentAt(LocalDateTime.of(2026, 8, 2, 18, 0));
        assertThat(ev.isDueOneOff(poll, LocalDateTime.of(2026, 8, 2, 18, 5))).isFalse();
    }
}
