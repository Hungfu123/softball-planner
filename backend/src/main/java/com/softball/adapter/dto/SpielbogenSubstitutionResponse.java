package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSubstitution;

import java.time.Instant;

public record SpielbogenSubstitutionResponse(
    Long id,
    Long bogenId,
    Long slotId,
    BogenSide side,
    Integer inning,
    String playerOutName,
    String playerInName,
    Boolean isPinchHitter,
    Instant createdAt
) {
    public static SpielbogenSubstitutionResponse from(final SpielbogenSubstitution s) {
        return new SpielbogenSubstitutionResponse(
            s.getId(),
            s.getBogen() != null ? s.getBogen().getId() : null,
            s.getSlot() != null ? s.getSlot().getId() : null,
            s.getSide(),
            s.getInning(),
            s.getPlayerOutName(),
            s.getPlayerInName(),
            s.getIsPinchHitter(),
            s.getCreatedAt()
        );
    }
}
