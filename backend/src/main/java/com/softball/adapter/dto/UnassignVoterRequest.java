package com.softball.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record UnassignVoterRequest(@NotNull Long playerId) {}
