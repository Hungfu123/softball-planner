package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record PlayCategoryRequest(@NotBlank String name, Integer sortOrder) {}
