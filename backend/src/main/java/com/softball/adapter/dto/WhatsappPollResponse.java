package com.softball.adapter.dto;

import com.softball.domain.model.WhatsappPoll;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record WhatsappPollResponse(
        Long id,
        String groupId,
        String groupName,
        String title,
        List<String> options,
        DayOfWeek weekday,
        LocalTime time,
        boolean enabled,
        List<LocalDate> skipDates,
        LocalDateTime lastSentAt) {

    public static WhatsappPollResponse from(final WhatsappPoll p) {
        return new WhatsappPollResponse(p.getId(), p.getGroupId(), p.getGroupName(), p.getTitle(),
                p.getOptions(), p.getWeekday(), p.getTime(), p.isEnabled(), p.getSkipDates(), p.getLastSentAt());
    }
}
