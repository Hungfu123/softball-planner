package com.softball.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateLeagueResultRequest(
    @NotNull Long homeTeamId,
    @NotNull Long awayTeamId,
    @NotNull @Min(0) Integer homeScore,
    @NotNull @Min(0) Integer awayScore,
    LocalDate date
) {}
