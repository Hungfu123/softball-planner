package com.softball.dto;

import com.softball.entity.Player;

public record PlayerResponse(Long id, String name, boolean regular) {
    public static PlayerResponse from(Player player) {
        return new PlayerResponse(player.getId(), player.getName(), player.isRegular());
    }
}
