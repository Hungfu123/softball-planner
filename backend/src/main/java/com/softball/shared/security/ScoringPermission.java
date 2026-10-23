package com.softball.shared.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Das Scorer-Recht: darf der Angemeldete ins Live-Scoring schreiben? Gedacht fuer
 * {@code @PreAuthorize("hasRole('ADMIN') or @scoring.darfSchreiben(authentication)")}. Die
 * Regel fuegt Spielern eine Erlaubnis hinzu; die Rolle prueft die andere Haelfte des
 * Ausdrucks, hier zaehlt nur {@code may_score} des Accounts.
 */
@Component("scoring")
public class ScoringPermission {

    private final CurrentUser currentUser;

    public ScoringPermission(final CurrentUser currentUser) {
        this.currentUser = currentUser;
    }

    public boolean darfSchreiben(final Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return false;
        }
        return currentUser.find().map(account -> account.isMayScore()).orElse(false);
    }
}
