package com.softball.adapter.dto;

import com.softball.domain.model.Training;

import java.time.LocalDate;

public record TrainingResponse(Long id, LocalDate date, String time, String location, boolean cancelled,
                                Integer attendeeCount, Long periodId, String type,
                                boolean openToAll) {

    /** Dieselbe Antwort ohne Teilnehmerzahl: fuer Leser, die Trainingszahlen nicht sehen duerfen. */
    public TrainingResponse ohneTeilnehmerzahl() {
        return new TrainingResponse(id, date, time, location, cancelled, null, periodId, type, openToAll);
    }

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
            training.getType(),
            training.isOpenToAll()
        );
    }
}
