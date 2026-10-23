package com.softball.integration;

import com.softball.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Default-Deny aus Sicht eines Spielers: die Rolle PLAYER kommt an keinen Controller. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class RollenIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "PLAYER")
    void spielerDarfKeinLineupSchreiben() throws Exception {
        mockMvc.perform(put("/api/games/1/lineup").contentType(MediaType.APPLICATION_JSON).content("[]"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void spielerDarfKeinenSpielerAnlegen() throws Exception {
        mockMvc.perform(post("/api/players").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void spielerSiehtDenSpielbogenNicht() throws Exception {
        mockMvc.perform(get("/api/spielbogen")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminDarfDenSpielbogenSehen() throws Exception {
        mockMvc.perform(get("/api/spielbogen")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "SUPERADMIN")
    void superadminDarfDenSpielbogenSehen() throws Exception {
        mockMvc.perform(get("/api/spielbogen")).andExpect(status().isOk());
    }

    @Test
    void kalenderBleibtOhneAnmeldungErreichbar() throws Exception {
        mockMvc.perform(get("/api/calendar.ics")).andExpect(status().isOk());
    }
}
