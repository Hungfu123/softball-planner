package com.softball.shared.security;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.shared.exception.NichtAngemeldetException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

import java.util.Optional;

/**
 * Der angemeldete Account, aus dem SecurityContext gelesen und ueber den Port geladen.
 * Je Anfrage wird er hoechstens einmal geladen (Request-Scope + gemerktes Ergebnis).
 * Die Klasse ist {@code @RequestScope} und funktioniert nur innerhalb einer HTTP-Anfrage;
 * {@code CurrentUserArchitectureTest} sichert ab, dass geplante Laeufe sie nicht benutzen.
 */
@Component
@RequestScope
public class CurrentUser {

    private final AppUserRepository appUserRepository;
    private Optional<AppUser> geladen;

    public CurrentUser(final AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    public Optional<AppUser> find() {
        if (geladen == null) {
            geladen = laden();
        }
        return geladen;
    }

    private Optional<AppUser> laden() {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        return appUserRepository.findByUsername(auth.getName());
    }

    public AppUser get() {
        return find().orElseThrow(() -> new NichtAngemeldetException());
    }

    /** Beruecksichtigt die Rollenhierarchie nicht: ein SUPERADMIN ist genau SUPERADMIN, nicht ADMIN. */
    public boolean istGenauRolle(final Role role) {
        return find().map(u -> u.getRole() == role).orElse(false);
    }
}
