package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import com.softball.MitSuperadmin;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class SeasonIntegrationTest {

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

    @Autowired
    private SpringLeagueTeamRepository leagueTeamRepository;

    @Autowired
    private SpringLineupEntryRepository lineupEntryRepository;

    @Autowired
    private SpringGameStaffRepository gameStaffRepository;

    @AfterEach
    void tearDown() {
        gameStaffRepository.deleteAll();
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        leagueTeamRepository.deleteAll();
        seasonRepository.deleteAll();
    }

    @Test
    void createSeason() throws Exception {
        mockMvc.perform(post("/api/seasons")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Saison 2026", "year", 2026))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Saison 2026"))
            .andExpect(jsonPath("$.year").value(2026))
            .andExpect(jsonPath("$.id").isNumber());
    }

    @Test
    void updateSeason_nameAndYear() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/seasons")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Saison 2026", "year", 2026))))
            .andReturn();

        final Long seasonId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/seasons/" + seasonId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Saison 2027", "year", 2027))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Saison 2027"))
            .andExpect(jsonPath("$.year").value(2027));
    }

    @Test
    void deleteSeason_cascadesGameDays() throws Exception {
        final MvcResult seasonResult = mockMvc.perform(post("/api/seasons")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Saison 2026", "year", 2026))))
            .andReturn();

        final Long seasonId = objectMapper.readTree(seasonResult.getResponse().getContentAsString()).get("id").asLong();

        // Create a game day
        mockMvc.perform(post("/api/seasons/" + seasonId + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andExpect(status().isCreated());

        // Delete the season
        mockMvc.perform(delete("/api/seasons/" + seasonId))
            .andExpect(status().isNoContent());

        // Season should be gone
        mockMvc.perform(get("/api/seasons"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.name == 'Saison 2026')]").doesNotExist());
    }

    @Test
    void getSeasonStats() throws Exception {
        final MvcResult seasonResult = mockMvc.perform(post("/api/seasons")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Saison 2026", "year", 2026))))
            .andReturn();

        final Long seasonId = objectMapper.readTree(seasonResult.getResponse().getContentAsString()).get("id").asLong();

        // Stats on empty season
        mockMvc.perform(get("/api/seasons/" + seasonId + "/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void deleteNonexistentSeason_returns404() throws Exception {
        mockMvc.perform(delete("/api/seasons/99999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void updateNonexistentSeason_returns404() throws Exception {
        mockMvc.perform(put("/api/seasons/99999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Test", "year", 2026))))
            .andExpect(status().isNotFound());
    }

    @Test
    void createSeason_blankName_returns400() throws Exception {
        mockMvc.perform(post("/api/seasons")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "", "year", 2026))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createSeason_missingYear_returns400() throws Exception {
        mockMvc.perform(post("/api/seasons")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"Saison 2026\"}"))
            .andExpect(status().isBadRequest());
    }
}
