package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GeneratePlanRequest(
        @NotNull Long trainingId,
        @NotNull @Min(1) Integer playerCount,
        @NotBlank String focus,
        @NotNull @Min(30) Integer durationMinutes
) {}
