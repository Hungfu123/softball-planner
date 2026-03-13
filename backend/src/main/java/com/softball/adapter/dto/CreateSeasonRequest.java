package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSeasonRequest(@NotBlank String name, @NotNull Integer year) {}
