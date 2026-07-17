package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AssignVoterRequest(@NotBlank String voterName, @NotNull Long playerId) {}
