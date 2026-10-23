package com.softball.adapter.dto;

import com.softball.domain.model.AuditKind;
import com.softball.domain.model.AuditSpan;

import java.time.Instant;

/** Eine Zeile oder Spanne der Historie. {@code label} ist nie leer: ohne Klartext steht dort Methode und Pfad,
 * bei einer Scoring-Spanne die Zahl der zusammengefassten Aktionen. */
public record AuditEntryResponse(
        String username,
        AuditKind kind,
        String label,
        String method,
        String path,
        String targetType,
        Long targetId,
        Integer status,
        Instant from,
        Instant to,
        int count
) {
    public static AuditEntryResponse von(final AuditSpan s) {
        final String label = s.count() > 1 ? "Gescort (" + s.count() + " Aktionen)"
                : s.label() != null ? s.label() : (s.method() + " " + s.path());
        return new AuditEntryResponse(s.username(), s.kind(), label, s.method(), s.path(), s.targetType(),
                s.targetId(), s.status(), s.from(), s.to(), s.count());
    }
}
