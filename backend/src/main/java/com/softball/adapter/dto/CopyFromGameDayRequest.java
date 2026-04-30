package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CopyFromGameDayRequest(
    @NotNull Long gameDayId,
    @NotNull @Min(1) Integer gameNumber,
    @NotNull BogenSide targetSide
) {}
