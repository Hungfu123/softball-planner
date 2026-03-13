package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import com.softball.TestcontainersConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class SeasonStatsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SpringSeasonRepository seasonRepository;

    @Autowired
    private SpringPlayerRepository playerRepository;

    @Autowired
    private SpringGameDayRepository gameDayRepository;

    @Autowired
    private SpringGameRepository gameRepository;

    @Autowired
    private SpringLineupEntryRepository lineupEntryRepository;

    @Autowired
    private SpringGameStaffRepository gameStaffRepository;

    private SeasonEntity season;
    private PlayerEntity player1, player2;

    @BeforeEach
    void setUp() {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        player1 = playerRepository.save(new PlayerEntity("Max"));
        player2 = playerRepository.save(new PlayerEntity("Lisa"));
    }

    @AfterEach
    void tearDown() {
        gameStaffRepository.deleteAll();
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void seasonStats_aggregatesAcrossGameDays() throws Exception {
        // Game day 1
        final MvcResult gd1Result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();
        final Long gd1Game1Id = objectMapper.readTree(gd1Result.getResponse().getContentAsString())
            .get("games").get(0).get("id").asLong();

        // Game day 2
        final MvcResult gd2Result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-22"))))
            .andReturn();
        final Long gd2Game1Id = objectMapper.readTree(gd2Result.getResponse().getContentAsString())
            .get("games").get(0).get("id").asLong();

        // GD1 Game1: Max=SS, Lisa=EH
        mockMvc.perform(put("/api/games/" + gd1Game1Id + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                Map.of("playerId", player2.getId(), "position", "EH", "battingOrder", 2)
            ))));

        // GD2 Game1: Max=P, Lisa=CF
        mockMvc.perform(put("/api/games/" + gd2Game1Id + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "P", "battingOrder", 1),
                Map.of("playerId", player2.getId(), "position", "CF", "battingOrder", 2)
            ))));

        mockMvc.perform(get("/api/seasons/" + season.getId() + "/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].playerName").value("Max"))
            .andExpect(jsonPath("$[0].totalGames").value(2.0))
            .andExpect(jsonPath("$[0].positionCounts.SS").value(1))
            .andExpect(jsonPath("$[0].positionCounts.P").value(1))
            .andExpect(jsonPath("$[1].playerName").value("Lisa"))
            .andExpect(jsonPath("$[1].totalGames").value(1.5));
    }

    @Test
    void seasonStats_emptySeasonReturnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/seasons/" + season.getId() + "/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }
}
