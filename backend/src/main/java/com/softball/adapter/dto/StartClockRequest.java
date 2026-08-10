package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;

/** Body von {@code POST .../clock/start}. {@code limitMinutes = null} bedeutet: ohne Limit. */
public record StartClockRequest(
    @Min(1) Integer limitMinutes
) {}
