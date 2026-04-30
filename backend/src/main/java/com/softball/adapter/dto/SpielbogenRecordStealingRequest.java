package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.StealingEventType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SpielbogenRecordStealingRequest(
    @NotNull BogenSide side,
    @NotNull Long slotId,
    @NotNull @Min(1) Integer inning,
    @NotNull StealingEventType type,
    @NotNull @Min(1) @Max(3) Integer fromBase,
    @NotNull @Min(2) @Max(4) Integer toBase
) {}
