package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record RenamePeriodRequest(
    @NotBlank(message = "Name ist erforderlich")
    String name
) {}
