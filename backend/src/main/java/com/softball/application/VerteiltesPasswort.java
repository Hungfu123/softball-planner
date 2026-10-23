package com.softball.application;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Das Passwort, das neue und zurueckgesetzte Spieler-Accounts bekommen ({@code app.auth.player-password}).
 * Es steht in der WhatsApp-Gruppe und ist deshalb bewusst ein anderes als das des Superadmins
 * ({@code app.auth.password}): dessen Benutzername kennt jeder im Team, waeren die Passwoerter gleich,
 * waere jeder Spieler einen Anmeldeversuch von Superadmin entfernt. Die App startet nicht, wenn sie gleich sind.
 * Kein Endpunkt nimmt ein Passwort entgegen, damit es nirgends in einem Log oder im Browser landet.
 */
@Component
public class VerteiltesPasswort {

    private final PasswordEncoder passwordEncoder;
    private final String passwort;

    public VerteiltesPasswort(final PasswordEncoder passwordEncoder,
                              @Value("${app.auth.player-password}") final String passwort,
                              @Value("${app.auth.password}") final String superadminPasswort) {
        if (passwort == null || passwort.isBlank()) {
            throw new IllegalStateException("app.auth.player-password (APP_PLAYER_PASSWORD) darf nicht leer sein");
        }
        if (passwort.equals(superadminPasswort)) {
            throw new IllegalStateException("app.auth.player-password muss sich von app.auth.password unterscheiden: "
                    + "sonst waere jeder Spieler einen Anmeldeversuch von Superadmin entfernt");
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
