package com.softball.application;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.shared.exception.BusinessValidationException;
import org.springframework.stereotype.Component;

/**
 * Aussperrschutz: nach keiner Aenderung darf die App ohne anmeldefaehigen Superadmin dastehen.
 * Sonst legt der naechste Start ueber {@code AccountBootstrap} einen neuen mit dem Standardpasswort an.
 * Der Schutz sitzt am Account (Rolle, Loeschen) und am Spieler (Loeschen, Archivieren), denn
 * {@code app_user.player_id} kaskadiert und Archivieren sperrt den Account.
 * Gezaehlt werden nur ungesperrte Superadmins: ein gesperrter hilft niemandem.
 */
@Component
public class SuperadminGuard {

    private final AppUserRepository appUserRepository;

    public SuperadminGuard(final AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    /** Wirft, wenn {@code target} der letzte anmeldefaehige Superadmin ist. */
    public void pruefeNichtLetzter(final AppUser target, final String meldung) {
        if (target.getRole() == Role.SUPERADMIN && !target.isLocked()
                && appUserRepository.countUnlockedByRole(Role.SUPERADMIN) <= 1) {
            throw new BusinessValidationException(meldung);
        }
    }

    /** Wie {@link #pruefeNichtLetzter}, fuer den Account des Spielers (falls er einen hat). */
    public void pruefeSpielerNichtLetzter(final Long playerId, final String meldung) {
        appUserRepository.findByPlayerId(playerId).ifPresent(account -> pruefeNichtLetzter(account, meldung));
    }
}
