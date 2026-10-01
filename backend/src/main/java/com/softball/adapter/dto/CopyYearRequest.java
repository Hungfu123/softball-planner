package com.softball.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record CopyYearRequest(
    @NotNull Integer templateYear,
    @NotNull Integer targetYear,
    @NotNull Boolean copyTeams
) {}
