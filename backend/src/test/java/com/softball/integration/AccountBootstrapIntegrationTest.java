package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.application.AccountBootstrap;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
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
}
