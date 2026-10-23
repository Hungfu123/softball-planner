package com.softball.domain.model;

import java.time.Instant;

/**
 * Was die Historie zeigt: eine einzelne Zeile (von == bis, count 1) oder eine Spanne
 * zusammengefasster Scoring-Zeilen. method/path/status stammen bei einer Spanne von der letzten Zeile.
 */
public record AuditSpan(
        String username,
        AuditKind kind,
        String method,
        String path,
        String label,
        String targetType,
        Long targetId,
        Integer status,
        Instant from,
        Instant to,
        int count
) {
}
