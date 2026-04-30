package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SpielbogenRecordSubstitutionRequest(
    @NotNull BogenSide side,
    @NotNull Long slotId,
    @NotNull @Min(1) Integer inning,
    @NotBlank String playerInName,
    Boolean pinchHitter
) {}
