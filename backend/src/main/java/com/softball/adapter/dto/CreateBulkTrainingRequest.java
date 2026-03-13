package com.softball.adapter.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record CreateBulkTrainingRequest(
    @NotEmpty(message = "Wochentage dürfen nicht leer sein")
    List<Integer> weekdays,

    @NotNull(message = "Startdatum ist erforderlich")
    LocalDate startDate,

    @NotNull(message = "Enddatum ist erforderlich")
    LocalDate endDate,

    String time,

    String location,

    String periodName,

    String type
) {}
