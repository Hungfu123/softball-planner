package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class PublicBogenFeedTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private SpringSpielbogenRepository spielbogenRepository;

    @AfterEach
    void tearDown() {
        spielbogenRepository.deleteAll();
    }

    @Test
    @WithMockUser
    void shareErzeugtTokenUndIstIdempotent() throws Exception {
        Long bogenId = legeSpielbogenAn();

        String first = mvc.perform(post("/api/spielbogen/" + bogenId + "/share"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", notNullValue()))
            .andReturn().getResponse().getContentAsString();

        String second = mvc.perform(post("/api/spielbogen/" + bogenId + "/share"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        assertThat(first).isEqualTo(second);
    }

    @Test
    @WithMockUser
    void tokenIstNichtAusDerIdAbleitbar() throws Exception {
        Long bogenId = legeSpielbogenAn();

        String body = mvc.perform(post("/api/spielbogen/" + bogenId + "/share"))
            .andReturn().getResponse().getContentAsString();
        String token = json.readTree(body).get("token").asText();

        assertThat(token).hasSizeGreaterThanOrEqualTo(40);
        assertThat(token).doesNotContain(String.valueOf(bogenId));
    }

    @Test
    void shareBrauchtAuth() throws Exception {
        Long bogenId = legeSpielbogenAnAlsAdmin();

        mvc.perform(post("/api/spielbogen/" + bogenId + "/share"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void revokeEntferntDenToken() throws Exception {
        Long bogenId = legeSpielbogenAn();
        mvc.perform(post("/api/spielbogen/" + bogenId + "/share"));

        mvc.perform(delete("/api/spielbogen/" + bogenId + "/share"))
            .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void shareAufUnbekanntemBogenGibt404() throws Exception {
        mvc.perform(post("/api/spielbogen/999999/share"))
            .andExpect(status().isNotFound());
    }

    /** Legt einen Spielbogen über die API an und gibt seine Id zurück (authentifiziert). */
    private Long legeSpielbogenAn() throws Exception {
        var createBody = Map.of(
            "date", "2026-08-06",
            "location", "Köln",
            "homeTeamName", "Köln Abbots",
            "awayTeamName", "Allstar"
        );
        var response = mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andExpect(status().isCreated())
            .andReturn();

        return json.readTree(response.getResponse().getContentAsString()).get("id").asLong();
    }

    /**
     * Wie {@link #legeSpielbogenAn()}, aber für Tests ohne Klassen- oder Methoden-Level
     * {@code @WithMockUser} — der Anlage-Request selbst muss authentifiziert werden,
     * damit nur der eigentlich zu prüfende Share-Request anonym bleibt.
     */
    private Long legeSpielbogenAnAlsAdmin() throws Exception {
        var createBody = Map.of(
            "date", "2026-08-06",
            "location", "Köln",
            "homeTeamName", "Köln Abbots",
            "awayTeamName", "Allstar"
        );
        var response = mvc.perform(post("/api/spielbogen")
                .with(user("admin"))
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andExpect(status().isCreated())
            .andReturn();

        return json.readTree(response.getResponse().getContentAsString()).get("id").asLong();
    }
}
