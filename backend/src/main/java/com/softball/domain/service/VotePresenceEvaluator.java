package com.softball.domain.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class VotePresenceEvaluator {

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("H:mm");

    public boolean isPresent(final List<String> options) {
        if (options == null) return false;
        return options.stream().anyMatch(o -> o != null && "ja".equalsIgnoreCase(o.trim()));
    }

    public boolean gateOpen(final String trainingTime, final LocalDateTime now, final LocalDate trainingDate) {
        return gateOpen(trainingTime, now, trainingDate, 0);
    }

    public boolean gateOpen(final String trainingTime, final LocalDateTime now, final LocalDate trainingDate,
                             final long offsetHours) {
        if (now == null || trainingDate == null) return false;
        if (!now.toLocalDate().equals(trainingDate)) return false;
        final LocalTime start = parse(trainingTime);
        if (start == null) return true; // unparsebar → ganztägig syncen statt crashen
        return !now.toLocalTime().isBefore(start.plusHours(offsetHours));
    }

    private LocalTime parse(final String time) {
        if (time == null || time.isBlank()) return null;
        try {
            return LocalTime.parse(time.trim(), HH_MM);
        } catch (final Exception e) {
            return null;
        }
    }
}
