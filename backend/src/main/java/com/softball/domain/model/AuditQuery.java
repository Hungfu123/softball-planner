package com.softball.domain.model;

import java.time.Instant;

/** Filter der Historie; jedes Feld darf fehlen. */
public record AuditQuery(Long userId, Instant from, Instant to, AuditKind kind) {
}
