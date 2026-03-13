package com.softball.adapter.dto;

import com.softball.domain.model.LineupEntry;

public record LineupEntryResponse(Long id, PlayerResponse player, String position, Integer battingOrder, PlayerResponse dhBatterPlayer) {
    public static LineupEntryResponse from(final LineupEntry entry) {
        return new LineupEntryResponse(
            entry.getId(),
            PlayerResponse.from(entry.getPlayer()),
            entry.getPosition() != null ? entry.getPosition().displayName() : null,
            entry.getBattingOrder(),
            entry.getDhBatterPlayer() != null ? PlayerResponse.from(entry.getDhBatterPlayer()) : null
        );
    }
}
