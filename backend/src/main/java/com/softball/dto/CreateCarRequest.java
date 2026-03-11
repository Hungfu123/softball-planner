package com.softball.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateCarRequest(
    @NotNull Long driverPlayerId,
    @NotNull @Min(2) @Max(9) Integer totalSeats,
    @NotNull String direction
) {}
