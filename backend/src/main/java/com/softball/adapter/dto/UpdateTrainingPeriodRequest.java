package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record UpdateTrainingPeriodRequest(
    @NotBlank(message = "Name ist erforderlich")
    String name,

    @NotNull(message = "Startdatum ist erforderlich")
    LocalDate startDate,

    @NotNull(message = "Enddatum ist erforderlich")
    LocalDate endDate,

    List<Integer> weekdays,

    String time,

    String location
) {}
