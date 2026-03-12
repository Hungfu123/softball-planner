package com.softball.dto;

import com.softball.entity.TrainingPeriod;

import java.time.LocalDate;

public record TrainingPeriodResponse(Long id, String name, LocalDate startDate, LocalDate endDate) {

    public static TrainingPeriodResponse from(final TrainingPeriod period) {
        return new TrainingPeriodResponse(period.getId(), period.getName(), period.getStartDate(), period.getEndDate());
    }
}
