package com.softball.adapter.dto;

import com.softball.domain.model.Player;
import com.softball.domain.model.PositionSlot;

public record PlayerResponse(Long id, String name, boolean regular, Integer defaultBattingOrder, String whatsappName,
                             boolean archived,
                             PositionSlot primaryPosition, PositionSlot secondaryPosition, PositionSlot tertiaryPosition) {
    public static PlayerResponse from(Player player) {
        return new PlayerResponse(player.getId(), player.getName(), player.isRegular(), player.getDefaultBattingOrder(),
            player.getWhatsappName(), player.isArchived(),
            player.getPrimaryPosition(), player.getSecondaryPosition(), player.getTertiaryPosition());
    }
}
