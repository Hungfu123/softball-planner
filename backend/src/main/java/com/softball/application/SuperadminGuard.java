package com.softball.application;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.shared.exception.BusinessValidationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Schutz der Superadmin-Accounts, an zwei Stellen.
 * <p>
 * Aussperrschutz: nach keiner Aenderung darf die App ohne anmeldefaehigen Superadmin dastehen.
 * Verschwindet der letzte Account ganz (Loeschen, Kaskade vom Spieler), legt der naechste Start ueber
 * {@code AccountBootstrap} (laeuft nur bei leerer Tabelle) einen neuen mit dem Standardpasswort an.
 * Ist er nur gesperrt, gibt es in der App keinen Weg zurueck; das verhindert dieser Guard.
 * Der Schutz sitzt am Account (Rolle, Loeschen) und am Spieler (Loeschen, Archivieren), denn
 * {@code app_user.player_id} kaskadiert und Archivieren sperrt den Account.
 * <p>
 * Zugriffsschutz: ein Admin darf einen Superadmin-Account nicht aendern, auch nicht ueber den Spieler
 * ({@link #pruefeSpielerAenderbar}): Loeschen kaskadiert, Archivieren sperrt, Reaktivieren entsperrt.
 * <p>
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

    /**
     * Wirft {@link AccessDeniedException}, wenn der Spieler einen Superadmin-Account traegt und der
     * Aufrufer kein Superadmin ist. Gegenstueck zu {@code UserAccountService#pruefeDarfAendern} fuer
     * die Wege, die ueber den Spieler auf den Account durchgreifen.
     */
    public void pruefeSpielerAenderbar(final Long playerId, final AppUser actor) {
        if (actor.getRole() == Role.SUPERADMIN) {
            return;
        }
        appUserRepository.findByPlayerId(playerId)
                .filter(account -> account.getRole() == Role.SUPERADMIN)
                .ifPresent(account -> {
                    throw new AccessDeniedException("Der Spieler gehört zu einem Superadmin-Account, den darf nur ein Superadmin ändern");
                });
    }
}
