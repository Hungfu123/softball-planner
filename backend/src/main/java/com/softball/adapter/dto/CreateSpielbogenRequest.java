package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateSpielbogenRequest(
    @NotNull LocalDate date,
    @Size(max = 200) String location,
    @NotBlank @Size(max = 100) String homeTeamName,
    @NotBlank @Size(max = 100) String awayTeamName,
    Long seasonId
) {}
