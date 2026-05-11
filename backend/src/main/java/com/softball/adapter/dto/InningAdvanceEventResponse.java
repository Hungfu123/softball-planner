package com.softball.adapter.dto;

import com.softball.domain.model.InningAdvanceEvent;

import java.time.Instant;

public record InningAdvanceEventResponse(
    Long id,
    Integer toInning,
    Integer opponentRuns,
    Instant createdAt
) {
    public static InningAdvanceEventResponse from(final InningAdvanceEvent event) {
        return new InningAdvanceEventResponse(
            event.getId(),
            event.getToInning(),
            event.getOpponentRuns(),
            event.getCreatedAt()
        );
    }
}
