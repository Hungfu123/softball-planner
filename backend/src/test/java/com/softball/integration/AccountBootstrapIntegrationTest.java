package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.application.AccountBootstrap;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.model.Player;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class AccountBootstrapIntegrationTest {

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private AccountBootstrap accountBootstrap;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlayerRepository playerRepository;

    @BeforeEach
    void leereAccountTabelle() {
        appUserRepository.findAll().forEach(user -> appUserRepository.deleteById(user.getId()));
        accountBootstrap.run(null);
    }

    @Test
    void legtAufLeererDatenbankGenauEinenSuperadminAn() {
        assertThat(appUserRepository.findAll()).hasSize(1);
        final AppUser hung = appUserRepository.findByUsername("hung").orElseThrow();
        assertThat(hung.getRole()).isEqualTo(Role.SUPERADMIN);
        assertThat(hung.getPlayerId()).isNotNull();
        assertThat(hung.isPasswordChanged()).isFalse();
        assertThat(hung.getCreatedAt()).isNotNull();
        assertThat(passwordEncoder.matches("test", hung.getPasswordHash())).isTrue();
        assertThat(appUserRepository.countByRole(Role.SUPERADMIN)).isEqualTo(1);
        assertThat(appUserRepository.existsByUsername("HUNG")).isTrue();
    }

    @Test
    void legtNichtsAnWennSchonEinAccountExistiert() {
        final Long idVorher = appUserRepository.findByUsername("hung").orElseThrow().getId();

        accountBootstrap.run(null);

        assertThat(appUserRepository.findAll()).hasSize(1);
        assertThat(appUserRepository.findByUsername("hung").orElseThrow().getId()).isEqualTo(idVorher);
    }

    @Test
    void legtDenFehlendenSpielerAn() {
        appUserRepository.findAll().forEach(user -> appUserRepository.deleteById(user.getId()));
        final var bootstrap = bootstrapFuer("Neuling");
        try {
            bootstrap.run(null);

            final AppUser user = appUserRepository.findByUsername("neuling").orElseThrow();
            assertThat(playerRepository.findById(user.getPlayerId()).orElseThrow().getName()).isEqualTo("Neuling");
        } finally {
            aufraeumen("Neuling");
        }
    }

    @Test
    void bevorzugtEinenAktivenSpielerVorEinemArchivierten() {
        appUserRepository.findAll().forEach(user -> appUserRepository.deleteById(user.getId()));
        final Player archiviert = playerRepository.save(new Player("Doppel"));
        archiviert.setArchived(true);
        playerRepository.save(archiviert);
        final Player aktiv = playerRepository.save(new Player("Doppel"));
        try {
            bootstrapFuer("Doppel").run(null);

            assertThat(appUserRepository.findByUsername("doppel").orElseThrow().getPlayerId()).isEqualTo(aktiv.getId());
        } finally {
            aufraeumen("Doppel");
        }
    }

    @Test
    void nimmtNotfallsEinenArchiviertenSpieler() {
        appUserRepository.findAll().forEach(user -> appUserRepository.deleteById(user.getId()));
        final Player archiviert = playerRepository.save(new Player("Altlast"));
        archiviert.setArchived(true);
        playerRepository.save(archiviert);
        try {
            bootstrapFuer("Altlast").run(null);

            assertThat(appUserRepository.findByUsername("altlast").orElseThrow().getPlayerId()).isEqualTo(archiviert.getId());
        } finally {
            aufraeumen("Altlast");
        }
    }

    private AccountBootstrap bootstrapFuer(final String spielerName) {
        return new AccountBootstrap(appUserRepository, playerRepository, passwordEncoder, spielerName, "test");
    }

    private void aufraeumen(final String spielerName) {
        playerRepository.findAll().stream()
                .filter(p -> p.getName().equals(spielerName))
                .forEach(p -> playerRepository.deleteById(p.getId()));
    }
}
