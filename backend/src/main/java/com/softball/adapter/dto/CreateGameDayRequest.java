package com.softball.adapter.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreateGameDayRequest(
    @NotNull LocalDate date,
    String label,
    String location,
    @Min(1) @Max(10) Integer numberOfGames
) {}
