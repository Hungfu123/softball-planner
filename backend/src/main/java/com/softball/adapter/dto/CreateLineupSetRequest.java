package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateLineupSetRequest(@NotBlank String name) {}
