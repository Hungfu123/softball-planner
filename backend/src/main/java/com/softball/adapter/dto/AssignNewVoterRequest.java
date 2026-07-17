package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record AssignNewVoterRequest(@NotBlank String voterName, @NotBlank String playerName) {}
