package com.softball.integration;

import com.softball.TestAccounts;
import com.softball.TestcontainersConfig;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Player;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@ExtendWith(TestAccounts.class)
class AuthenticationIntegrationTest {

    private static final String PASSWORD = TestAccounts.PASSWORD;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlayerRepository playerRepository;

    private final List<Long> angelegt = new ArrayList<>();
    private final List<Long> spieler = new ArrayList<>();

    @AfterEach
    void tearDown() {
        angelegt.forEach(appUserRepository::deleteById);
        spieler.forEach(playerRepository::deleteById);
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
        legeAn("gesperrt", true, Role.PLAYER);

        mockMvc.perform(get("/api/players").with(httpBasic("gesperrt", PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meldetEinenEntsperrtenAccountAn() throws Exception {
        legeAn("entsperrt", false, Role.SUPERADMIN);

        mockMvc.perform(get("/api/players").with(httpBasic("entsperrt", PASSWORD)))
                .andExpect(status().isOk());
    }

    /**
     * Das Frontend kodiert Name und Passwort als UTF-8 (setAuth in api/client.ts). Der Header wird
     * hier von Hand gebaut, statt httpBasic() zu trauen, damit die Kette so geprueft ist, wie
     * der Browser sie schickt.
     */
    @Test
    void liestUmlauteInBenutzernameUndPasswortAlsUtf8() throws Exception {
        legeAn("jörg", false, Role.SUPERADMIN, "pässwort");

        final String basic = java.util.Base64.getEncoder()
                .encodeToString("jörg:pässwort".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        mockMvc.perform(get("/api/players").header(AUTHORIZATION, "Basic " + basic))
                .andExpect(status().isOk());

        final String falsch = java.util.Base64.getEncoder()
                .encodeToString("jörg:passwort".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        mockMvc.perform(get("/api/players").header(AUTHORIZATION, "Basic " + falsch))
                .andExpect(status().isUnauthorized());
    }

    private void legeAn(final String username, final boolean locked, final Role role) {
        legeAn(username, locked, role, PASSWORD);
    }

    private void legeAn(final String username, final boolean locked, final Role role, final String passwort) {
        final AppUser user = new AppUser();
        final Long playerId = playerRepository.save(new Player(username)).getId();
        spieler.add(playerId);
        user.setPlayerId(playerId);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(passwort));
        user.setRole(role);
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
