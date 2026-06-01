package com.softball.adapter.dto;

import com.softball.domain.model.Award;

public record AwardResponse(
    String type,
    Long playerId,
    String playerName,
    String displayValue
) {
    public static AwardResponse from(final Award a) {
        return new AwardResponse(a.type().name(), a.playerId(), a.playerName(), a.displayValue());
    }
}
