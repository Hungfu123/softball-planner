package com.softball.adapter.dto;

import com.softball.domain.model.LineupSet;
import java.util.List;

public record LineupSetResponse(Long id, Long gameDayId, String name,
                                List<LineupSetEntryResponse> entries,
                                List<LineupSetStaffEntryResponse> staff,
                                List<Long> availablePlayerIds,
                                List<LineupSetGameRotationResponse> rotations) {
    public static LineupSetResponse from(final LineupSet set) {
        return new LineupSetResponse(
            set.getId(),
            set.getGameDayId(),
            set.getName(),
            set.getEntries().stream().map(LineupSetEntryResponse::from).toList(),
            set.getStaffEntries().stream().map(LineupSetStaffEntryResponse::from).toList(),
            set.getAvailablePlayerIds(),
            set.getGameRotations().stream().map(LineupSetGameRotationResponse::from).toList()
        );
    }
}
