package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record GeneratePlanRequest(
        @NotNull Long trainingId,
        @NotNull @Min(1) Integer playerCount,
        @NotNull List<String> availablePositions,
        @NotBlank String focus,
        @NotNull @Min(30) Integer durationMinutes
) {}
