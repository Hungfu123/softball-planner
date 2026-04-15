package com.softball.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record UpdatePlanRequest(@NotNull TrainingPlanContentResponse content) {}
