package com.softball.adapter.dto;

import com.softball.domain.model.TrainingPeriod;

import java.time.LocalDate;
import java.util.List;

public record TrainingPeriodResponse(Long id, String name, LocalDate startDate, LocalDate endDate,
                                     List<Integer> weekdays, String time, String location) {

    public static TrainingPeriodResponse from(final TrainingPeriod period) {
        return from(period, period.getWeekdays());
    }

    public static TrainingPeriodResponse from(final TrainingPeriod period, final List<Integer> weekdays) {
        return new TrainingPeriodResponse(period.getId(), period.getName(), period.getStartDate(),
            period.getEndDate(), weekdays, period.getTime(), period.getLocation());
    }
}
