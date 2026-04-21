package com.softball.adapter.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import com.softball.domain.model.AtBatResult;

public record RecordAtBatRequest(
    @NotNull Long batterId,
    @NotNull AtBatResult result,
    @NotNull @Min(1) @Max(99) Integer inning,
    BaseStateDto baseStateAfter,
    @PositiveOrZero @Max(4) Integer runsScored,
    @PositiveOrZero @Max(4) Integer rbi
) {
    public record BaseStateDto(Long first, Long second, Long third) {}
}
