package com.softball.adapter.dto;

import com.softball.domain.model.Player;

public record PlayerResponse(Long id, String name, boolean regular, Integer defaultBattingOrder) {
    public static PlayerResponse from(Player player) {
        return new PlayerResponse(player.getId(), player.getName(), player.isRegular(), player.getDefaultBattingOrder());
    }
}
