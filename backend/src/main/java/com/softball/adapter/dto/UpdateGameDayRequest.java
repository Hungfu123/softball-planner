package com.softball.adapter.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;

public record UpdateGameDayRequest(
    LocalDate date,
    String label,
    String location,
    @Min(1) @Max(10) Integer numberOfGames
) {}
