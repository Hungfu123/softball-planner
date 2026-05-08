package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.RunnerAdvanceReason;
import com.softball.domain.model.SpielbogenRunnerAdvance;

import java.time.Instant;

public record SpielbogenRunnerAdvanceResponse(
    Long id,
    Long bogenId,
    Long atBatId,
    Long slotId,
    BogenSide side,
    Integer inning,
    Integer fromBase,
    Integer toBase,
    RunnerAdvanceReason reason,
    Instant createdAt
) {
    public static SpielbogenRunnerAdvanceResponse from(final SpielbogenRunnerAdvance a) {
        return new SpielbogenRunnerAdvanceResponse(
            a.getId(),
            a.getBogen() != null ? a.getBogen().getId() : null,
            a.getAtBat() != null ? a.getAtBat().getId() : null,
            a.getSlot() != null ? a.getSlot().getId() : null,
            a.getSide(),
            a.getInning(),
            a.getFromBase(),
            a.getToBase(),
            a.getReason(),
            a.getCreatedAt()
        );
    }
}
