package com.softball.adapter.dto;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;

/** Wer angemeldet ist und was er darf; das Frontend richtet daran Navigation und Knoepfe aus. */
public record MeResponse(
        String username,
        Role role,
        Long playerId,
        String playerName,
        boolean mayScore,
        boolean passwordChanged
) {
    public static MeResponse von(final AppUser user, final String playerName) {
        return new MeResponse(user.getUsername(), user.getRole(), user.getPlayerId(), playerName,
                user.isMayScore(), user.isPasswordChanged());
    }
}
