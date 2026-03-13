package com.softball.adapter.dto;

import com.softball.domain.model.TrainingPeriod;

import java.time.LocalDate;

public record TrainingPeriodResponse(Long id, String name, LocalDate startDate, LocalDate endDate) {

    public static TrainingPeriodResponse from(final TrainingPeriod period) {
        return new TrainingPeriodResponse(period.getId(), period.getName(), period.getStartDate(), period.getEndDate());
    }
}
