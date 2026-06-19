package com.softball.adapter.dto;

import com.softball.domain.model.TrainingPeriod;

import java.time.LocalDate;
import java.util.List;

public record TrainingPeriodResponse(Long id, String name, LocalDate startDate, LocalDate endDate,
                                     List<Integer> weekdays, String time, String location) {

    public static TrainingPeriodResponse from(final TrainingPeriod period) {
        return new TrainingPeriodResponse(period.getId(), period.getName(), period.getStartDate(), period.getEndDate(),
            period.getWeekdays(), period.getTime(), period.getLocation());
    }
}
