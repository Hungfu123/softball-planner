package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateTrainingPeriodRequest(
    @NotBlank(message = "Name ist erforderlich")
    String name,

    @NotNull(message = "Startdatum ist erforderlich")
    LocalDate startDate,

    @NotNull(message = "Enddatum ist erforderlich")
    LocalDate endDate
) {}
