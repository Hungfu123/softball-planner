package com.softball.adapter.dto;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateSpielbogenRequest(
    LocalDate date,
    @Size(max = 200) String location,
    @Size(max = 100) String homeTeamName,
    @Size(max = 100) String awayTeamName,
    Long seasonId
) {}
