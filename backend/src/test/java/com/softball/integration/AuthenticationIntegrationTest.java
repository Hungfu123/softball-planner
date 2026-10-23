package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Player;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class AuthenticationIntegrationTest {

    private static final String PASSWORD = "test"; // app.auth.password im Testprofil

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private SpringPlayerRepository springPlayerRepository;

    private final List<Long> angelegt = new ArrayList<>();
    private final List<Long> spieler = new ArrayList<>();

    @AfterEach
    void tearDown() {
        angelegt.forEach(appUserRepository::deleteById);
        spieler.forEach(springPlayerRepository::deleteById);
    }

    @Test
    void meldetDenBootstrapSuperadminAn() throws Exception {
        mockMvc.perform(get("/api/players").with(httpBasic("hung", PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    void lehntDenAltenBenutzernamenAdminAb() throws Exception {
        mockMvc.perform(get("/api/players").with(httpBasic("admin", PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void lehntEinenGesperrtenAccountAb() throws Exception {
        legeAn("gesperrt", true);

        mockMvc.perform(get("/api/players").with(httpBasic("gesperrt", PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meldetEinenEntsperrtenAccountAn() throws Exception {
        legeAn("entsperrt", false);

        mockMvc.perform(get("/api/players").with(httpBasic("entsperrt", PASSWORD)))
                .andExpect(status().isOk());
    }

    private void legeAn(final String username, final boolean locked) {
        final AppUser user = new AppUser();
        final Long playerId = playerRepository.save(new Player(username)).getId();
        spieler.add(playerId);
        user.setPlayerId(playerId);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setRole(Role.PLAYER);
        user.setLocked(locked);
        user.setCreatedAt(Instant.now());
        angelegt.add(appUserRepository.save(user).getId());
    }

    @Test
    void vergleichtDenBenutzernamenOhneGrossKleinschreibung() throws Exception {
        mockMvc.perform(get("/api/players").with(httpBasic("Hung", PASSWORD)))
                .andExpect(status().isOk());
    }
}
