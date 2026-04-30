package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;

public record CorrectAtBatRequest(
    Long firstSlotId,
    Long secondSlotId,
    Long thirdSlotId,
    @Min(0) Integer runsScored
) {}
