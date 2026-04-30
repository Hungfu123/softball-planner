package com.softball.adapter.dto;

import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.OutType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SpielbogenRecordAtBatRequest(
    @NotNull BogenSide side,
    @NotNull Long slotId,
    @NotNull @Min(1) Integer inning,
    @NotNull AtBatResult result,
    OutType outType,
    List<Integer> fielderChain,
    Boolean isError,
    Integer errorPosition,
    @Min(0) Integer runsScored,
    @Min(0) Integer rbi,
    BogenBaseStateDto baseStateAfter
) {}
