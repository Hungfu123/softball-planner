package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;

public record EndGameRequest(
    @Min(0) Integer homeRuns,
    @Min(0) Integer awayRuns
) {}
