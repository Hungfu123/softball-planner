package com.softball.adapter.dto;

import com.softball.domain.model.LineupSetEntry;

public record LineupSetEntryResponse(Long id, Integer gameNumber, PlayerResponse player,
                                     String position, Integer battingOrder, PlayerResponse dhBatterPlayer) {
    public static LineupSetEntryResponse from(final LineupSetEntry e) {
        return new LineupSetEntryResponse(
            e.getId(),
            e.getGameNumber(),
            PlayerResponse.from(e.getPlayer()),
            e.getPosition() != null ? e.getPosition().displayName() : null,
            e.getBattingOrder(),
            e.getDhBatterPlayer() != null ? PlayerResponse.from(e.getDhBatterPlayer()) : null
        );
    }
}
