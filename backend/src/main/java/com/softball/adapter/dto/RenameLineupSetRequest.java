package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record RenameLineupSetRequest(@NotBlank String name) {}
