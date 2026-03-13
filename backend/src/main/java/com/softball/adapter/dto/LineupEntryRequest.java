package com.softball.adapter.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record LineupEntryRequest(
    @NotNull Long playerId,
    String position,
    @NotNull @Min(1) @Max(10) Integer battingOrder,
    Long dhBatterPlayerId
) {}
