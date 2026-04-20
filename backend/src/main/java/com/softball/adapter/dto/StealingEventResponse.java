package com.softball.adapter.dto;

import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.BaseRunningEventType;

import java.time.Instant;

public record StealingEventResponse(
    Long id,
    Long gameId,
    Long runnerId,
    String runnerName,
    Integer inning,
    BaseRunningEventType type,
    Instant createdAt
) {
    public static StealingEventResponse from(final BaseRunningEvent e) {
        return new StealingEventResponse(
            e.getId(),
            e.getGame() != null ? e.getGame().getId() : null,
            e.getRunner() != null ? e.getRunner().getId() : null,
            e.getRunner() != null ? e.getRunner().getName() : null,
            e.getInning(),
            e.getType(),
            e.getCreatedAt()
        );
    }
}
