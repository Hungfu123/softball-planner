package com.softball.adapter.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SubstitutionRequest(
    @NotNull Long playerOutId,
    @NotNull Long playerInId,
    @NotNull @Min(1) @Max(99) Integer inning
) {}
