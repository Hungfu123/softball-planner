package com.softball.application;

import com.softball.domain.port.out.AppUserRepository;
import com.softball.shared.exception.BusinessValidationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Regeln fuer Benutzernamen, geteilt von {@code UserAccountService} und {@code AccountSelfService}:
 * immer getrimmt und klein gespeichert, nie leer, kein Doppelpunkt (HTTP Basic trennt dort), eindeutig
 * ohne Ruecksicht auf Gross-/Kleinschreibung. Die Datenbank sichert die Eindeutigkeit mit einem
 * Index nach; dessen Fehler wird in dieselbe Meldung uebersetzt wie die Vorabpruefung.
 */
@Component
public class UsernamePolicy {

    static final int MAX_LAENGE = 50;

    private final AppUserRepository appUserRepository;

    public UsernamePolicy(final AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    public String normalisiere(final String roh) {
        final String name = roh == null ? "" : roh.trim().toLowerCase(Locale.ROOT);
        if (name.isEmpty()) {
            throw new BusinessValidationException("Der Benutzername darf nicht leer sein.");
        }
        if (name.length() > MAX_LAENGE) {
            throw new BusinessValidationException("Der Benutzername darf höchstens " + MAX_LAENGE + " Zeichen lang sein.");
        }
        if (name.contains(":") || name.chars().anyMatch(Character::isISOControl)) {
            throw new BusinessValidationException("Der Benutzername darf keinen Doppelpunkt und keine Steuerzeichen enthalten.");
        }
        return name;
    }

    /** Wirft, wenn ein anderer Account den Namen traegt. {@code eigeneId} darf null sein (Neuanlage). */
    public void pruefeFrei(final String normalisiert, final Long eigeneId) {
        final boolean vergeben = appUserRepository.findByUsername(normalisiert)
                .map(a -> !a.getId().equals(eigeneId))
                .orElse(false);
        if (vergeben) {
            throw vergeben(normalisiert);
        }
    }

    public static BusinessValidationException vergeben(final String name) {
        return new BusinessValidationException("Der Benutzername '" + name + "' ist schon vergeben.");
    }

    /**
     * Uebersetzt den Fehler aus den Indizes von {@code app_user} in eine verstaendliche Meldung;
     * andere Verletzungen gibt er unveraendert zurueck. Greift, wenn zwei Aufrufer gleichzeitig dieselbe
     * Pruefung bestehen und nur einer den Index passiert.
     */
    public RuntimeException uebersetze(final DataIntegrityViolationException e, final String name) {
        final String grund = String.valueOf(e.getMostSpecificCause().getMessage());
        if (grund.contains("uq_app_user_username")) {
            return vergeben(name);
        }
        if (grund.contains("player_id")) {
            return new BusinessValidationException("Dieser Spieler hat schon einen Account.");
        }
        return e;
    }
}
