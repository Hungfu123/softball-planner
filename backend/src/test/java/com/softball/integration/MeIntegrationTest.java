package com.softball.integration;

import com.softball.MitSuperadmin;
import com.softball.TestAccounts;
import com.softball.TestcontainersConfig;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Player;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.shared.config.LastSeenFilter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class MeIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private AppUserRepository appUserRepository;
    @Autowired private PlayerRepository playerRepository;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;
    private Long angelegt;
    @Autowired private LastSeenFilter lastSeenFilter;

    @BeforeEach
    void zaehlerLeeren() {
        lastSeenFilter.zuruecksetzen();
    }

    @AfterEach
    void spielerAufraeumen() {
        if (angelegt != null) {
            playerRepository.deleteById(angelegt); // die Kaskade nimmt den Account mit, TestAccounts legt ihn neu an
            angelegt = null;
        }
    }

    private AppUser konto() {
        return appUserRepository.findByUsername(TestAccounts.SUPERADMIN).orElseThrow();
    }

    private void setze(final Instant lastLoginAt, final Instant lastSeenAt) {
        appUserRepository.touchLastLogin(TestAccounts.SUPERADMIN, lastLoginAt);
        appUserRepository.touchLastSeen(TestAccounts.SUPERADMIN, lastSeenAt);
    }

    @Test
    void loginSetztLastLoginAt() throws Exception {
        setze(null, null);

        mockMvc.perform(post("/api/auth/login")).andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("hung"));

        assertThat(konto().getLastLoginAt()).isCloseTo(Instant.now(), within());
    }

    @Test
    void meSetztLastLoginAtNicht() throws Exception {
        final Instant frueher = Instant.parse("2026-01-01T10:00:00Z");
        setze(frueher, null);

        mockMvc.perform(get("/api/me")).andExpect(status().isOk());
        mockMvc.perform(get("/api/me")).andExpect(status().isOk());

        assertThat(konto().getLastLoginAt()).isEqualTo(frueher);
    }

    @Test
    void meSetztLastSeenAt() throws Exception {
        setze(null, Instant.parse("2026-01-01T10:00:00Z"));

        mockMvc.perform(get("/api/me")).andExpect(status().isOk());

        assertThat(konto().getLastSeenAt()).isCloseTo(Instant.now(), within());
    }

    @Test
    void lastSeenAtWirdHoechstensAlleFuenfMinutenGeschrieben() throws Exception {
        setze(null, null);

        mockMvc.perform(get("/api/me")).andExpect(status().isOk());
        // Beleg, dass der erste Aufruf wirklich geschrieben hat ...
        assertThat(konto().getLastSeenAt()).isCloseTo(Instant.now(), within());

        // ... dann einen Sentinel setzen: ein zweiter Schreibvorgang wuerde ihn ueberschreiben.
        final Instant sentinel = Instant.parse("2026-01-01T10:00:00Z");
        setze(null, sentinel);
        mockMvc.perform(get("/api/me")).andExpect(status().isOk());

        assertThat(konto().getLastSeenAt()).isEqualTo(sentinel);

        // Gegenprobe: ohne den Zaehler schreibt derselbe Aufruf wieder.
        lastSeenFilter.zuruecksetzen();
        mockMvc.perform(get("/api/me")).andExpect(status().isOk());
        assertThat(konto().getLastSeenAt()).isNotEqualTo(sentinel);
    }

    @Test
    void meLiefertRolleUndSpieler() throws Exception {
        // Den Spieler selbst anlegen: andere Tests raeumen die Spielertabelle, der Bestand ist nicht gesichert.
        final Player spieler = playerRepository.save(new Player("Hung"));
        angelegt = spieler.getId();
        // Der Port schreibt bestehende Accounts nur noch spaltenweise; den Spielerbezug setzt der Test direkt.
        jdbc.update("update app_user set player_id = ?, may_score = true where username = ?",
                spieler.getId(), TestAccounts.SUPERADMIN);
        final AppUser user = konto();

        mockMvc.perform(get("/api/me")).andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("hung"))
                .andExpect(jsonPath("$.role").value("SUPERADMIN"))
                .andExpect(jsonPath("$.playerId").value(user.getPlayerId()))
                .andExpect(jsonPath("$.playerName").value("Hung"))
                .andExpect(jsonPath("$.mayScore").value(true))
                .andExpect(jsonPath("$.passwordChanged").value(false));
    }

    @Test
    void ohneAnmeldungIst401() throws Exception {
        mockMvc.perform(get("/api/me").with(org.springframework.security.test.web.servlet.request
                .SecurityMockMvcRequestPostProcessors.anonymous())).andExpect(status().isUnauthorized());
    }

    private static org.assertj.core.data.TemporalUnitOffset within() {
        return org.assertj.core.api.Assertions.within(1, java.time.temporal.ChronoUnit.MINUTES);
    }
}
