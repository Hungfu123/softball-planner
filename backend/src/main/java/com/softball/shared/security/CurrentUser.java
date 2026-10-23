package com.softball.shared.security;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/** Der angemeldete Account, aus dem SecurityContext gelesen und ueber den Port geladen. */
@Component
public class CurrentUser {

    private final AppUserRepository appUserRepository;

    public CurrentUser(final AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    public Optional<AppUser> find() {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        return appUserRepository.findByUsername(auth.getName());
    }

    public AppUser get() {
        return find().orElseThrow(() -> new IllegalStateException("Kein angemeldeter Account"));
    }

    /** Beruecksichtigt die Rollenhierarchie nicht: prueft die eigene Rolle des Accounts. */
    public boolean hatRolle(final Role role) {
        return find().map(u -> u.getRole() == role).orElse(false);
    }
}
