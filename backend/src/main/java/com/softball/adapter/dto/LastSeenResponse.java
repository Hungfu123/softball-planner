package com.softball.adapter.dto;

import com.softball.application.AuditService;
import com.softball.domain.model.Role;

import java.time.Instant;

public record LastSeenResponse(Long userId, String username, String playerName, Role role,
                               Instant lastLoginAt, Instant lastSeenAt) {
    public static LastSeenResponse von(final AuditService.Gesehen g) {
        return new LastSeenResponse(g.account().getId(), g.account().getUsername(), g.playerName(),
                g.account().getRole(), g.account().getLastLoginAt(), g.account().getLastSeenAt());
    }
}
