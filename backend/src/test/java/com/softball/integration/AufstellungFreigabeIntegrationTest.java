package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.MitSuperadmin;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.softball.domain.service.AufstellungsFingerabdruck;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class AufstellungFreigabeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SpringSeasonRepository seasonRepository;

    @Autowired
    private SpringGameDayRepository gameDayRepository;

    @Autowired
    private SpringGameRepository gameRepository;

    private SeasonEntity season;

    @BeforeEach
    void setUp() {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
    }

    @AfterEach
    void tearDown() {
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
    }

    private long neuerSpieltag() throws Exception {
        final String body = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-05-02", "label", "Spieltag 1"))))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("id").asLong();
    }

    @Test
    void spieltagKommtNichtFreigegebenAufDieWelt() throws Exception {
        final long id = neuerSpieltag();

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lineupsReleasedAt").doesNotExist())
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));
    }

    private void freigeben(final long id, final String hash) {
        final var entity = gameDayRepository.findById(id).orElseThrow();
        entity.setLineupsReleasedAt(LocalDateTime.of(2026, 5, 1, 12, 0));
        entity.setLineupsReleasedHash(hash);
        gameDayRepository.save(entity);
    }

    @Test
    void freigegebenMitPassendemAbdruckIstNichtGeaendert() throws Exception {
        final long id = neuerSpieltag();
        freigeben(id, AufstellungsFingerabdruck.von(List.of(), List.of(), List.of()));

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.lineupsReleasedAt").value("2026-05-01T12:00:00"))
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));
    }

    @Test
    void freigegebenMitAnderemAbdruckIstGeaendert() throws Exception {
        final long id = neuerSpieltag();
        freigeben(id, "0".repeat(64));

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(true));
    }
}
