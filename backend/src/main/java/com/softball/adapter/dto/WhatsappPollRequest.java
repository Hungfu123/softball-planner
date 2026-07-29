package com.softball.adapter.dto;

import com.softball.domain.model.PollMode;
import com.softball.domain.model.WhatsappPoll;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record WhatsappPollRequest(
        @NotBlank String groupId,
        String groupName,
        String title,
        @NotNull List<String> options,
        DayOfWeek weekday,
        @NotNull LocalTime time,
        boolean enabled,
        boolean allowMultipleAnswers,
        String message,
        @NotNull PollMode mode,
        Long gameDayId,
        LocalDate sendDate) {

    public WhatsappPoll toDomain() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId(groupId);
        p.setGroupName(groupName);
        p.setTitle(title);
        p.setOptions(options != null ? options : List.of());
        p.setWeekday(weekday);
        p.setTime(time);
        p.setEnabled(enabled);
        p.setAllowMultipleAnswers(allowMultipleAnswers);
        p.setMessage(message != null && !message.isBlank() ? message.trim() : null);
        p.setMode(mode);
        p.setGameDayId(gameDayId);
        p.setSendDate(sendDate);
        return p;
    }
}
