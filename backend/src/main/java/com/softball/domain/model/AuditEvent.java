package com.softball.domain.model;

import java.time.Instant;

/** Eine Zeile der Historie. {@code username} ist ein Schnappschuss, {@code userId} verschwindet mit dem Account. */
public record AuditEvent(
        Long id,
        Long userId,
        String username,
        AuditKind kind,
        String method,
        String path,
        String label,
        String targetType,
        Long targetId,
        Integer status,
        Instant occurredAt
) {
}
