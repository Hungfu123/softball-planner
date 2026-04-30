package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenStealingEvent;
import com.softball.domain.model.StealingEventType;

import java.time.Instant;

public record SpielbogenStealingResponse(
    Long id,
    Long bogenId,
    Long slotId,
    BogenSide side,
    Integer inning,
    StealingEventType type,
    Integer fromBase,
    Integer toBase,
    Instant createdAt
) {
    public static SpielbogenStealingResponse from(final SpielbogenStealingEvent s) {
        return new SpielbogenStealingResponse(
            s.getId(),
            s.getBogen() != null ? s.getBogen().getId() : null,
            s.getSlot() != null ? s.getSlot().getId() : null,
            s.getSide(),
            s.getInning(),
            s.getType(),
            s.getFromBase(),
            s.getToBase(),
            s.getCreatedAt()
        );
    }
}
