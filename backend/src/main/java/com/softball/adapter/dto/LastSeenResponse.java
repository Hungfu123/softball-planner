package com.softball.adapter.dto;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;

import java.time.Instant;

public record LastSeenResponse(Long userId, String username, Role role, Instant lastLoginAt, Instant lastSeenAt) {
    public static LastSeenResponse von(final AppUser u) {
        return new LastSeenResponse(u.getId(), u.getUsername(), u.getRole(), u.getLastLoginAt(), u.getLastSeenAt());
    }
}
