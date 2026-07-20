package com.softball.adapter.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record CreateBulkTrainingRequest(
    @NotEmpty(message = "Wochentage dürfen nicht leer sein")
    List<Integer> weekdays,

    @NotNull(message = "Startdatum ist erforderlich")
    LocalDate startDate,

    @NotNull(message = "Enddatum ist erforderlich")
    LocalDate endDate,

    String time,

    @NotNull(message = "Uhrzeiten je Wochentag sind erforderlich")
    Map<Integer, String> weekdayTimes,

    String location,

    String periodName,

    String type
) {}
