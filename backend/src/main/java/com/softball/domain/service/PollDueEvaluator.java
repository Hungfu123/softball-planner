package com.softball.domain.service;

import com.softball.domain.model.WhatsappPoll;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class PollDueEvaluator {

    public boolean isDue(final WhatsappPoll poll, final LocalDateTime now) {
        if (poll == null || !poll.isEnabled() || poll.getWeekday() == null || poll.getTime() == null) {
            return false;
        }
        final LocalDate today = now.toLocalDate();
        if (poll.getSkipDates().contains(today)) {
            return false;
        }
        if (now.getDayOfWeek() != poll.getWeekday()) {
            return false;
        }
        if (now.getHour() != poll.getTime().getHour() || now.getMinute() != poll.getTime().getMinute()) {
            return false;
        }
        if (poll.getLastSentAt() != null && poll.getLastSentAt().toLocalDate().equals(today)) {
            return false;
        }
        return true;
    }
}
