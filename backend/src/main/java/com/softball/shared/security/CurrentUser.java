package com.softball.shared.security;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.shared.exception.NichtAngemeldetException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
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

    /**
     * Darf der Angemeldete FREMDE Trainingszahlen (Beteiligung, Teilnehmerzahl) sehen? Nur Trainer.
     * Die Entscheidung folgt den Berechtigungen der Anmeldung und ist verschlossen: wer keine
     * Admin-Rolle traegt, sieht nichts, auch eine kuenftige Rolle nicht.
     *
     * <p>Fuer die EIGENEN Zahlen gilt seit dem 27.10.2026 etwas anderes — siehe
     * {@link #darfTrainingszahlenSehenVon(Long)}.
     */
    public boolean darfTrainingszahlenSehen() {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return false;
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> ("ROLE_" + Role.ADMIN).equals(a) || ("ROLE_" + Role.SUPERADMIN).equals(a));
    }

    /**
     * Darf der Angemeldete die Trainingszahlen DIESES Spielers sehen? Trainer immer, jeder
     * andere nur bei sich selbst.
     *
     * <p>Bis zum 27.10.2026 war auch die eigene Zahl zu, mit der Begruendung: die
     * Auto-Aufstellung gewichtet die Beteiligung, und wer seine Quote kennt, leitet daraus einen
     * Anspruch auf einen Lineup-Platz ab. Der Betreiber hat das ausdruecklich geaendert — die
     * eigene Anwesenheit darf man sehen, die des Nebenmanns nicht. Der VERGLEICH war das
     * Problem, nicht das Wissen ueber sich selbst.
     *
     * <p>Was dadurch NICHT sichtbar wird: die gewichtete Quote der Auto-Aufstellung
     * ({@code TrainingParticipationCalculator}, ohne Termine mit eingeschraenktem
     * Teilnehmerkreis). Sichtbar ist die schlichte Anwesenheit — wie oft war ich da.
     */
    public boolean darfTrainingszahlenSehenVon(final Long playerId) {
        if (darfTrainingszahlenSehen()) {
            return true;
        }
        return playerId != null && find().map(u -> playerId.equals(u.getPlayerId())).orElse(false);
    }
}
