package com.softball.dto;

import jakarta.validation.constraints.NotBlank;

public record ImportTrainingRequest(
    @NotBlank(message = "CSV-Daten dürfen nicht leer sein")
    String csv,

    String periodName
) {}
