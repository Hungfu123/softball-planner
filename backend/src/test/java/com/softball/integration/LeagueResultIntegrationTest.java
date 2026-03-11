package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.entity.Season;
import com.softball.repository.*;
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

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class LeagueResultIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SeasonRepository seasonRepository;

    @Autowired
    private LeagueTeamRepository leagueTeamRepository;

    @Autowired
    private LeagueResultRepository leagueResultRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private GameDayRepository gameDayRepository;

    private Season season;
    private Long teamAId, teamBId, ownTeamId;

    @BeforeEach
    void setUp() throws Exception {
        season = seasonRepository.save(new Season("Saison 2026", 2026));

        // Eigenes Team
        final MvcResult ownResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Dead Sox", "ownTeam", true))))
            .andReturn();
        ownTeamId = objectMapper.readTree(ownResult.getResponse().getContentAsString()).get("id").asLong();

        // Zwei Gegner-Teams
        final MvcResult aResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Aachen Barons"))))
            .andReturn();
        teamAId = objectMapper.readTree(aResult.getResponse().getContentAsString()).get("id").asLong();

        final MvcResult bResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Bottrop Bulls"))))
            .andReturn();
        teamBId = objectMapper.readTree(bResult.getResponse().getContentAsString()).get("id").asLong();
    }

    @AfterEach
    void tearDown() {
        leagueResultRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        leagueTeamRepository.deleteAll();
        seasonRepository.deleteAll();
    }

    @Test
    void crudLeagueResults() throws Exception {
        // Erstellen
        final MvcResult createResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/results")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "homeTeamId", teamAId, "awayTeamId", teamBId,
                    "homeScore", 7, "awayScore", 3, "date", "2026-03-15"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.homeTeam.name").value("Aachen Barons"))
            .andExpect(jsonPath("$.awayTeam.name").value("Bottrop Bulls"))
            .andExpect(jsonPath("$.homeScore").value(7))
            .andExpect(jsonPath("$.awayScore").value(3))
            .andExpect(jsonPath("$.date").value("2026-03-15"))
            .andReturn();

        final Long resultId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        // Auflisten
        mockMvc.perform(get("/api/seasons/" + season.getId() + "/results"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));

        // Aktualisieren
        mockMvc.perform(put("/api/results/" + resultId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "homeTeamId", teamBId, "awayTeamId", teamAId,
                    "homeScore", 10, "awayScore", 2))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.homeTeam.name").value("Bottrop Bulls"))
            .andExpect(jsonPath("$.homeScore").value(10));

        // Loeschen
        mockMvc.perform(delete("/api/results/" + resultId))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/seasons/" + season.getId() + "/results"))
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void createResult_sameTeam_returns400() throws Exception {
        mockMvc.perform(post("/api/seasons/" + season.getId() + "/results")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "homeTeamId", teamAId, "awayTeamId", teamAId,
                    "homeScore", 5, "awayScore", 3))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createResult_withOwnTeam_returns400() throws Exception {
        mockMvc.perform(post("/api/seasons/" + season.getId() + "/results")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "homeTeamId", ownTeamId, "awayTeamId", teamAId,
                    "homeScore", 5, "awayScore", 3))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void standings_includesLeagueResults() throws Exception {
        // Spieltag erstellen fuer eigene Spiele
        final MvcResult gdResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();
        final var gdJson = objectMapper.readTree(gdResult.getResponse().getContentAsString());
        final Long game1Id = gdJson.get("games").get(0).get("id").asLong();

        // Eigenes Spiel: Dead Sox 10:5 Aachen
        mockMvc.perform(put("/api/games/" + game1Id + "/opponent")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", teamAId))));
        mockMvc.perform(put("/api/games/" + game1Id + "/score")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("scoreUs", 10, "scoreThem", 5))));

        // Liga-Ergebnis: Aachen 8:2 Bottrop
        mockMvc.perform(post("/api/seasons/" + season.getId() + "/results")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "homeTeamId", teamAId, "awayTeamId", teamBId,
                "homeScore", 8, "awayScore", 2))));

        // Standings pruefen
        mockMvc.perform(get("/api/seasons/" + season.getId() + "/standings"))
            .andExpect(status().isOk())
            // Dead Sox: 1W 0L, RS=10, RA=5, winPct=1.0, runDiff=+5
            .andExpect(jsonPath("$[0].team.name").value("Dead Sox"))
            .andExpect(jsonPath("$[0].games").value(1))
            .andExpect(jsonPath("$[0].wins").value(1))
            .andExpect(jsonPath("$[0].winPct").value(1.0))
            // Aachen: 1W (vs Bottrop) + 1L (vs Dead Sox) = 1W1L
            // RS aus Game: 5 (invertiert), RS aus LeagueResult: 8 = 13
            // RA aus Game: 10 (invertiert), RA aus LeagueResult: 2 = 12
            .andExpect(jsonPath("$[1].team.name").value("Aachen Barons"))
            .andExpect(jsonPath("$[1].games").value(2))
            .andExpect(jsonPath("$[1].wins").value(1))
            .andExpect(jsonPath("$[1].losses").value(1))
            .andExpect(jsonPath("$[1].runsScored").value(13))
            .andExpect(jsonPath("$[1].runsAgainst").value(12))
            // Bottrop: 0W 1L (vs Aachen), RS=2, RA=8
            .andExpect(jsonPath("$[2].team.name").value("Bottrop Bulls"))
            .andExpect(jsonPath("$[2].games").value(1))
            .andExpect(jsonPath("$[2].losses").value(1))
            .andExpect(jsonPath("$[2].runsScored").value(2))
            .andExpect(jsonPath("$[2].runsAgainst").value(8));
    }

    @Test
    void deleteTeam_cascadesLeagueResults() throws Exception {
        // Ergebnis erstellen
        mockMvc.perform(post("/api/seasons/" + season.getId() + "/results")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "homeTeamId", teamAId, "awayTeamId", teamBId,
                "homeScore", 5, "awayScore", 3))));

        mockMvc.perform(get("/api/seasons/" + season.getId() + "/results"))
            .andExpect(jsonPath("$.length()").value(1));

        // Team A loeschen -> LeagueResult sollte auch weg sein
        mockMvc.perform(delete("/api/teams/" + teamAId))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/seasons/" + season.getId() + "/results"))
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void createResult_teamFromOtherSeason_returns400() throws Exception {
        final Season otherSeason = seasonRepository.save(new Season("Andere Saison", 2025));
        final MvcResult t = mockMvc.perform(post("/api/seasons/" + otherSeason.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Wrong Team"))))
            .andReturn();
        final Long wrongTeamId = objectMapper.readTree(t.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/seasons/" + season.getId() + "/results")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "homeTeamId", teamAId, "awayTeamId", wrongTeamId,
                    "homeScore", 5, "awayScore", 3))))
            .andExpect(status().isBadRequest());
    }
}
