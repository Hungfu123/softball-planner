package com.softball.adapter.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SetAttendanceRequest(@NotNull @Valid List<AttendanceEntry> entries) {

    public record AttendanceEntry(@NotNull Long playerId, @NotNull Boolean present) {}
}
