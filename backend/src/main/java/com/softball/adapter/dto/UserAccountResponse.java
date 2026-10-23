package com.softball.adapter.dto;

import com.softball.application.UserAccountService;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;

import java.time.Instant;

/** Ein Account in der Verwaltung. Enthaelt nie den Passwort-Hash. */
public record UserAccountResponse(
        Long id,
        Long playerId,
        String playerName,
        String username,
        Role role,
        boolean mayScore,
        boolean locked,
        boolean passwordChanged,
        Instant createdAt,
        Instant lastLoginAt,
        Instant lastSeenAt
) {
    public static UserAccountResponse von(final UserAccountService.Konto konto) {
        final AppUser a = konto.account();
        return new UserAccountResponse(a.getId(), a.getPlayerId(), konto.playerName(), a.getUsername(), a.getRole(),
                a.isMayScore(), a.isLocked(), a.isPasswordChanged(), a.getCreatedAt(), a.getLastLoginAt(),
                a.getLastSeenAt());
    }
}
