package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record UpdateTrainingPeriodRequest(
    @NotBlank(message = "Name ist erforderlich")
    String name,

    @NotNull(message = "Startdatum ist erforderlich")
    LocalDate startDate,

    @NotNull(message = "Enddatum ist erforderlich")
    LocalDate endDate,

    List<Integer> weekdays,

    String time,

    @NotNull(message = "Uhrzeiten je Wochentag sind erforderlich")
    Map<Integer, String> weekdayTimes,

    String location
) {}
