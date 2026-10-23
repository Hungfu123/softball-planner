package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Player;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Belegt zwei Zusicherungen gegen das ECHTE Schema (Flyway V70, Hibernate nur {@code validate}):
 * Spieler loeschen nimmt den Account mit, und der Index auf {@code lower(username)} lehnt einen
 * Namen in anderer Schreibweise ab. Das Testprofil baut sein Schema per create-drop; dort gibt es
 * weder die Kaskade noch den Index, {@code AppUserEntity.playerId} ist eine schlichte Spalte ohne
 * Fremdschluessel. Ohne diese Klasse waeren beide Zusicherungen nirgends gegen das Schema getestet.
 * Eigener Bootstrap-Spielername: erzwingt einen eigenen Kontext mit frischem Container.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@TestPropertySource(properties = {
        "app.auth.bootstrap-player=Schema",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
class UserAccountSchemaTest {

    @Autowired private AppUserRepository appUserRepository;
    @Autowired private PlayerRepository playerRepository;

    private AppUser konto(final String username) {
        final Player player = playerRepository.save(new Player("Spieler " + username));
        final AppUser user = new AppUser();
        user.setPlayerId(player.getId());
        user.setUsername(username);
        user.setPasswordHash("{noop}x");
        user.setRole(Role.PLAYER);
        user.setCreatedAt(Instant.now());
        return appUserRepository.save(user);
    }

    @Test
    void spielerLoeschenNimmtDenAccountMit() {
        final AppUser konto = konto("kaskade");

        playerRepository.deleteById(konto.getPlayerId());

        assertThat(appUserRepository.findById(konto.getId())).isEmpty();
    }

    @Test
    void derIndexLehntDenNamenInAndererSchreibweiseAb() {
        final AppUser erster = konto("anna");
        try {
            assertThatThrownBy(() -> konto("ANNA"))
                    .isInstanceOf(DataIntegrityViolationException.class)
                    .hasMessageContaining("uq_app_user_username");
        } finally {
            playerRepository.deleteById(erster.getPlayerId());
            playerRepository.findAll().stream().filter(p -> "Spieler ANNA".equals(p.getName()))
                    .forEach(p -> playerRepository.deleteById(p.getId()));
        }
    }
}
