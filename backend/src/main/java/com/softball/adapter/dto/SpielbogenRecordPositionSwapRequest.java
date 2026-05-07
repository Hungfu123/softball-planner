package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SpielbogenRecordPositionSwapRequest(
    @NotNull BogenSide side,
    @NotNull @Min(1) Integer inning,
    @NotEmpty List<SwapEntry> changes
) {
    public record SwapEntry(@NotNull Long slotId, String newPosition) {}
}
