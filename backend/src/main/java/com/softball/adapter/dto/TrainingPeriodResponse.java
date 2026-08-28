package com.softball.adapter.dto;

import com.softball.domain.model.TrainingPeriod;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record TrainingPeriodResponse(Long id, String name, LocalDate startDate, LocalDate endDate,
                                     List<Integer> weekdays, String time,
                                     Map<Integer, String> weekdayTimes, String location,
                                     int cycleWeeks, List<Integer> activeWeeksInCycle) {

    public static TrainingPeriodResponse from(final TrainingPeriod period) {
        return from(period, period.getWeekdays());
    }

    public static TrainingPeriodResponse from(final TrainingPeriod period, final List<Integer> weekdays) {
        return new TrainingPeriodResponse(period.getId(), period.getName(), period.getStartDate(),
            period.getEndDate(), weekdays, period.getTime(), period.getWeekdayTimes(), period.getLocation(),
            period.getCycleWeeks(), period.getActiveWeeksInCycle());
    }
}
