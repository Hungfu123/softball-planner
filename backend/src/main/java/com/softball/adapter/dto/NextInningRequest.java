package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record NextInningRequest(
    @NotNull @Min(0) Integer opponentRuns
) {}
