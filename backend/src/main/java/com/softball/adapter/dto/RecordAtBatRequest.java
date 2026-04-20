package com.softball.adapter.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import com.softball.domain.model.AtBatResult;

public record RecordAtBatRequest(
    @NotNull Long batterId,
    @NotNull AtBatResult result,
    @NotNull @Min(1) @Max(9) Integer inning,
    BaseStateDto baseStateAfter,
    Integer runsScored,
    Integer rbi
) {
    public record BaseStateDto(Long first, Long second, Long third) {}
}
