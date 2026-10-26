package com.softball.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Das Passwort, das neue und zurueckgesetzte Spieler-Accounts bekommen ({@code app.auth.player-password}).
 * Es steht in der WhatsApp-Gruppe. Kein Endpunkt nimmt ein Passwort entgegen, damit es nirgends in
 * einem Log oder im Browser landet.
 * <p>
 * <b>Gleich dem Superadmin-Passwort?</b> Dann kann sich jeder im Team unter jedem Benutzernamen
 * anmelden, auch unter dem des Superadmins — der Benutzername ist der Vorname und steht niemandem
 * im Weg. Frueher verweigerte die App deswegen den Start. Auf ausdrueckliche Entscheidung des
 * Betreibers (26.10.2026) tut sie das nicht mehr: sie warnt beim Hochfahren und laeuft weiter.
 * Die Begruendung war, dass er seinem Team vertraut und sein eigenes Passwort nach dem Deploy in
 * der Oberflaeche aendert — danach ist {@code app.auth.password} fuer die Anmeldung bedeutungslos.
 * <p>
 * Leer bleibt dagegen ein harter Fehler: ein fehlendes Passwort ist keine Entscheidung, sondern
 * eine unfertige Konfiguration, und in Produktion gibt es dafuer bewusst keinen Vorgabewert.
 */
@Component
public class VerteiltesPasswort {

    private static final Logger log = LoggerFactory.getLogger(VerteiltesPasswort.class);

    private final PasswordEncoder passwordEncoder;
    private final String passwort;

    public VerteiltesPasswort(final PasswordEncoder passwordEncoder,
                              @Value("${app.auth.player-password}") final String passwort,
                              @Value("${app.auth.password}") final String superadminPasswort) {
        if (passwort == null || passwort.isBlank()) {
            throw new IllegalStateException("app.auth.player-password (APP_PLAYER_PASSWORD) darf nicht leer sein");
        }
        if (passwort.equals(superadminPasswort)) {
            log.warn("ACHTUNG: app.auth.player-password ist dasselbe wie app.auth.password. "
                    + "Jeder, der das verteilte Passwort kennt, kann sich unter jedem Benutzernamen anmelden, "
                    + "auch als Superadmin. Zwei verschiedene Werte setzen, oder das eigene Passwort "
                    + "in der Oberflaeche aendern.");
        }
        this.passwordEncoder = passwordEncoder;
        this.passwort = passwort;
    }

    /** Ein frischer Hash (eigenes Salz) des verteilten Passworts. */
    public String hash() {
        return passwordEncoder.encode(passwort);
    }

    public boolean istGleich(final String klartext) {
        return passwort.equals(klartext);
    }
}
