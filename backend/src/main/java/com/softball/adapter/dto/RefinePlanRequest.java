package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record RefinePlanRequest(@NotBlank String userEdits) {}
