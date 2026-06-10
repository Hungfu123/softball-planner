package com.softball.adapter.dto;

import com.softball.domain.model.LineupSet;
import java.util.List;

public record LineupSetResponse(Long id, Long gameDayId, String name, List<LineupSetEntryResponse> entries) {
    public static LineupSetResponse from(final LineupSet set) {
        return new LineupSetResponse(
            set.getId(),
            set.getGameDayId(),
            set.getName(),
            set.getEntries().stream().map(LineupSetEntryResponse::from).toList()
        );
    }
}
