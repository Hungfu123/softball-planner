package com.softball.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreateGameDayRequest(
    @NotNull LocalDate date,
    String label,
    String location
) {}
