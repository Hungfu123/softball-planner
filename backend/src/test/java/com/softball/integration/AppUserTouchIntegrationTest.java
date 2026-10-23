package com.softball.integration;

import com.softball.MitSuperadmin;
import com.softball.TestAccounts;
import com.softball.TestcontainersConfig;
import com.softball.application.SelbstauskunftService;
import com.softball.domain.model.AppUser;
import com.softball.domain.port.out.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Der Vermerk von Anmeldung und Sichtung schreibt genau eine Spalte. Ein Ganzzeilen-Schreiben
 * mit altem Stand hob eine zwischenzeitliche Sperre (oder eine Rollen-/Passwortaenderung)
 * lautlos wieder auf.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class AppUserTouchIntegrationTest {

    private static final Instant T = Instant.parse("2026-10-23T12:00:00Z");

    @Autowired private AppUserRepository appUserRepository;
    @Autowired private SelbstauskunftService service;

    private AppUser konto() {
        return appUserRepository.findByUsername(TestAccounts.SUPERADMIN).orElseThrow();
    }

    /** Aendert den Account auf dem normalen Weg, waehrend ein anderer Aufrufer noch den alten Stand haelt. */
    private void aendereZwischenzeitlich() {
        final AppUser frisch = konto();
        frisch.setLocked(true);
        frisch.setMayScore(true);
        frisch.setPasswordChanged(true);
        frisch.setPasswordHash("{noop}neu");
        appUserRepository.save(frisch);
    }

    private void pruefeUnangetastet() {
        final AppUser danach = konto();
        assertThat(danach.isLocked()).isTrue();
        assertThat(danach.isMayScore()).isTrue();
        assertThat(danach.isPasswordChanged()).isTrue();
        assertThat(danach.getPasswordHash()).isEqualTo("{noop}neu");
    }

    @Test
    void sichtungUeberschreibtZwischenzeitlicheAenderungenNicht() {
        final AppUser alt = konto();
        aendereZwischenzeitlich();

        service.vermerkeGesehen(alt.getUsername(), T);

        pruefeUnangetastet();
        assertThat(konto().getLastSeenAt()).isEqualTo(T);
    }

    @Test
    void anmeldungUeberschreibtZwischenzeitlicheAenderungenNicht() {
        final AppUser alt = konto();
        aendereZwischenzeitlich();

        service.vermerkeAnmeldung(alt.getUsername(), T);

        pruefeUnangetastet();
        assertThat(konto().getLastLoginAt()).isEqualTo(T);
    }
}
