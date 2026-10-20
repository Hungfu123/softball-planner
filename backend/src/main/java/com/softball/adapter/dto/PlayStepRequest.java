package com.softball.adapter.dto;

import com.softball.domain.model.PlayMarkers;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PlayStepRequest(
        @NotNull Integer ordinal,
        @NotNull Integer durationMs,
        String note,
        @NotNull @Min(0) @Max(3) Integer outs,
        @NotNull PlayMarkers markers
) {}
