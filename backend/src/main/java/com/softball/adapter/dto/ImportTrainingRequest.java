package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record ImportTrainingRequest(
    @NotBlank(message = "CSV-Daten dürfen nicht leer sein")
    String csv,

    String periodName
) {}
