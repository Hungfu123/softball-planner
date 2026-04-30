package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SetLineupRequest(
    @NotNull BogenSide side,
    @Valid @NotNull List<SlotEntry> slots
) {
    public record SlotEntry(
        @NotNull @Min(1) @Max(10) Integer slot,
        @NotBlank @Size(max = 100) String name,
        String position,
        @NotNull @Min(1) @Max(10) Integer battingOrder
    ) {}
}
