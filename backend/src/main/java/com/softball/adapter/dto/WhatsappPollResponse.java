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
        boolean allowMultipleAnswers,
        String message,
        List<LocalDate> skipDates,
        LocalDateTime lastSentAt,
        boolean trainingCoupled,
        LocalDate sendDate) {

    public static WhatsappPollResponse from(final WhatsappPoll p) {
        return new WhatsappPollResponse(p.getId(), p.getGroupId(), p.getGroupName(), p.getTitle(),
                p.getOptions(), p.getWeekday(), p.getTime(), p.isEnabled(),
                p.isAllowMultipleAnswers(), p.getMessage(), p.getSkipDates(), p.getLastSentAt(),
                p.isTrainingCoupled(), p.getSendDate());
    }
}
