package com.softball.adapter.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateSlotRequest(
    @Size(max = 100) String name,
    String position,
    @Min(1) @Max(10) Integer battingOrder
) {}
