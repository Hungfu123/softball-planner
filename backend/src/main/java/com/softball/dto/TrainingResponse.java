package com.softball.dto;

import com.softball.entity.Training;

import java.time.LocalDate;

public record TrainingResponse(Long id, LocalDate date, String time, String location, boolean cancelled,
                                int attendeeCount, Long periodId, String type) {

    public static TrainingResponse from(final Training training) {
        final int attendeeCount = (int) training.getAttendances().stream()
            .filter(a -> a.isPresent())
            .count();
        return new TrainingResponse(
            training.getId(),
            training.getDate(),
            training.getTime(),
            training.getLocation(),
            training.isCancelled(),
            attendeeCount,
            training.getPeriod() != null ? training.getPeriod().getId() : null,
            training.getType()
        );
    }
}
