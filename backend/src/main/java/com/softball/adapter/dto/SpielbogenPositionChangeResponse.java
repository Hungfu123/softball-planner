package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenPositionChange;

import java.time.Instant;

public record SpielbogenPositionChangeResponse(
    Long id,
    Long bogenId,
    Long slotId,
    BogenSide side,
    Integer inning,
    String groupId,
    String oldPosition,
    String newPosition,
    Instant createdAt
) {
    public static SpielbogenPositionChangeResponse from(final SpielbogenPositionChange c) {
        return new SpielbogenPositionChangeResponse(
            c.getId(),
            c.getBogen() != null ? c.getBogen().getId() : null,
            c.getSlot() != null ? c.getSlot().getId() : null,
            c.getSide(),
            c.getInning(),
            c.getGroupId(),
            c.getOldPosition(),
            c.getNewPosition(),
            c.getCreatedAt()
        );
    }
}
