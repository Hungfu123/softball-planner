package com.softball.domain.service;

import com.softball.domain.model.WhatsappPoll;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PollDueEvaluatorTest {

    private final PollDueEvaluator evaluator = new PollDueEvaluator();

    private WhatsappPoll poll() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setWeekday(DayOfWeek.TUESDAY);
        p.setTime(LocalTime.of(18, 0));
        p.setEnabled(true);
        return p;
    }

    // Dienstag 2026-07-14 18:00
    private final LocalDateTime tueAt1800 = LocalDateTime.of(2026, 7, 14, 18, 0);

    @Test
    void due_whenWeekdayTimeMatchEnabledNotSkippedNotSentToday() {
        assertThat(evaluator.isDue(poll(), tueAt1800)).isTrue();
    }

    @Test
    void notDue_whenDisabled() {
        final WhatsappPoll p = poll();
        p.setEnabled(false);
        assertThat(evaluator.isDue(p, tueAt1800)).isFalse();
    }

    @Test
    void notDue_whenWrongWeekday() {
        assertThat(evaluator.isDue(poll(), tueAt1800.plusDays(1))).isFalse();
    }

    @Test
    void notDue_whenWrongMinute() {
        assertThat(evaluator.isDue(poll(), tueAt1800.plusMinutes(1))).isFalse();
    }

    @Test
    void notDue_whenTodayInSkipDates() {
        final WhatsappPoll p = poll();
        p.setSkipDates(List.of(LocalDate.of(2026, 7, 14)));
        assertThat(evaluator.isDue(p, tueAt1800)).isFalse();
    }

    @Test
    void notDue_whenAlreadySentToday() {
        final WhatsappPoll p = poll();
        p.setLastSentAt(LocalDateTime.of(2026, 7, 14, 18, 0));
        assertThat(evaluator.isDue(p, tueAt1800)).isFalse();
    }

    @Test
    void due_whenSentOnPreviousDay() {
        final WhatsappPoll p = poll();
        p.setLastSentAt(LocalDateTime.of(2026, 7, 7, 18, 0));
        assertThat(evaluator.isDue(p, tueAt1800)).isTrue();
    }
}
