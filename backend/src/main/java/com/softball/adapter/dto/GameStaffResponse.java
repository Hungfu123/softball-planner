package com.softball.adapter.dto;

import com.softball.domain.model.GameStaff;

public record GameStaffResponse(Long id, PlayerResponse player, String role) {
    public static GameStaffResponse from(final GameStaff staff) {
        return new GameStaffResponse(staff.getId(), PlayerResponse.from(staff.getPlayer()), staff.getRole().name());
    }
}
