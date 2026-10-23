package com.softball.application;

import com.softball.domain.model.AppUser;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Der Angemeldete aendert <em>seinen eigenen</em> Account: Benutzernamen und Passwort. Fremde Accounts
 * aendert {@link UserAccountService}. Beide schreiben nur gezielte Spalten, nie die ganze Zeile, damit
 * sich eine gleichzeitige Sperre oder Zuruecksetzung durch einen Admin und eine Aenderung durch den
 * Nutzer nicht gegenseitig aufheben. Nicht {@code @Transactional}, damit der Indexfehler sauber
 * uebersetzt werden kann (siehe {@link UserAccountService}).
 */
@Service
public class AccountSelfService {

    private static final Logger log = LoggerFactory.getLogger(AccountSelfService.class);

    private final AppUserRepository appUserRepository;
    private final UsernamePolicy usernamePolicy;
    private final VerteiltesPasswort verteiltesPasswort;
    private final PasswordEncoder passwordEncoder;

    public AccountSelfService(final AppUserRepository appUserRepository, final UsernamePolicy usernamePolicy,
                              final VerteiltesPasswort verteiltesPasswort, final PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.usernamePolicy = usernamePolicy;
        this.verteiltesPasswort = verteiltesPasswort;
        this.passwordEncoder = passwordEncoder;
    }

    /** Liefert den Account mit neuem Namen. Das Frontend muss danach seine Anmeldedaten austauschen. */
    public AppUser changeUsername(final Long userId, final String wunsch) {
        final AppUser user = laden(userId);
        final String username = usernamePolicy.normalisiere(wunsch);
        usernamePolicy.pruefeFrei(username, userId);
        try {
            appUserRepository.updateUsername(userId, username);
        } catch (final DataIntegrityViolationException e) {
            throw usernamePolicy.uebersetze(e, username);
        }
        log.info("Benutzername von Account {} von '{}' auf '{}' geaendert", userId, user.getUsername(), username);
        return laden(userId);
    }

    public AppUser changePassword(final Long userId, final String aktuell, final String neu) {
        // Frisch gelesen: ein zwischenzeitliches Zuruecksetzen durch einen Admin soll das alte Passwort entwerten.
        final AppUser user = laden(userId);
        if (aktuell == null || !passwordEncoder.matches(aktuell, user.getPasswordHash())) {
            throw new BusinessValidationException("Das aktuelle Passwort stimmt nicht.");
        }
        if (verteiltesPasswort.istGleich(neu)) {
            throw new BusinessValidationException(
                    "Das neue Passwort darf nicht das verteilte Passwort sein: das kennt jeder im Team.");
        }
        appUserRepository.updatePassword(userId, passwordEncoder.encode(neu), true);
        log.info("Passwort von Account {} ('{}') vom Nutzer geaendert", userId, user.getUsername());
        return laden(userId);
    }

    private AppUser laden(final Long userId) {
        return appUserRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Account", userId));
    }
}
