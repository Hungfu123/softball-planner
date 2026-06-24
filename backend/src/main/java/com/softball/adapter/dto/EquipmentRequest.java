package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record EquipmentRequest(
    @NotBlank String name,
    @Min(0) int quantity,
    String storageLocation,
    String notes
) {}
