package com.softball.adapter.dto;

import com.softball.domain.model.TrainingAttendance;

public record TrainingAttendanceResponse(PlayerResponse player, boolean present) {

    public static TrainingAttendanceResponse from(final TrainingAttendance attendance) {
        return new TrainingAttendanceResponse(
            PlayerResponse.from(attendance.getPlayer()),
            attendance.isPresent()
        );
    }
}
