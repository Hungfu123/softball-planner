package com.softball.adapter.dto;

import com.softball.domain.model.LineupSetStaffEntry;

public record LineupSetStaffEntryResponse(Integer gameNumber, PlayerResponse player, String role) {
    public static LineupSetStaffEntryResponse from(final LineupSetStaffEntry e) {
        return new LineupSetStaffEntryResponse(
            e.getGameNumber(),
            PlayerResponse.from(e.getPlayer()),
            e.getRole() != null ? e.getRole().name() : null
        );
    }
}
