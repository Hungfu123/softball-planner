package com.softball.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record SetMayScoreRequest(@NotNull Boolean mayScore) {}
