package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GameStaffRequest(
    @NotNull Long playerId,
    @NotBlank String role
) {}
