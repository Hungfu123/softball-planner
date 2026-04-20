package com.softball.adapter.dto;

import com.softball.domain.model.BaseRunningEventType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RecordStealingEventRequest(
    @NotNull Long runnerId,
    @NotNull BaseRunningEventType type,
    @NotNull @Min(1) @Max(99) Integer inning
) {}
