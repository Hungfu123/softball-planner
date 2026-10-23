package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.shared.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Belegt die Abbildung von {@code NichtAngemeldetException}: 401 im {error, timestamp}-Format.
 * Der Pfad liegt ausserhalb von /api, damit die Filterkette nicht schon vorher abweist
 * und der Handler wirklich erreicht wird (der offene Pfad, vor dem er schuetzt).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestcontainersConfig.class, NichtAngemeldetIntegrationTest.Konfiguration.class})
class NichtAngemeldetIntegrationTest {

    @RestController
    static class ProbeController {
        private final CurrentUser currentUser;

        ProbeController(final CurrentUser currentUser) {
            this.currentUser = currentUser;
        }

        @GetMapping("/test-probe/me")
        String me() {
            return currentUser.get().getUsername();
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Konfiguration {
        @Bean
        ProbeController probeController(final CurrentUser currentUser) {
            return new ProbeController(currentUser);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getOhneAnmeldungLiefert401ImProjektformat() throws Exception {
        mockMvc.perform(get("/test-probe/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Nicht angemeldet"))
                .andExpect(jsonPath("$.timestamp").exists());
    }
}
