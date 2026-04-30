package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;

public record SpielbogenSlotResponse(
    Long id,
    BogenSide side,
    Integer slot,
    String name,
    String position,
    Integer battingOrder
) {
    public static SpielbogenSlotResponse from(final SpielbogenSlot s) {
        return new SpielbogenSlotResponse(
            s.getId(),
            s.getSide(),
            s.getSlot(),
            s.getName(),
            s.getPosition(),
            s.getBattingOrder()
        );
    }
}
