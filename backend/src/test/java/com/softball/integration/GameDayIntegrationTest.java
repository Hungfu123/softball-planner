package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.entity.Player;
import com.softball.entity.Season;
import com.softball.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser
class GameDayIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SeasonRepository seasonRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private GameDayRepository gameDayRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private LineupEntryRepository lineupEntryRepository;

    @Autowired
    private GameStaffRepository gameStaffRepository;

    @Autowired
    private LeagueTeamRepository leagueTeamRepository;

    private Season season;
    private Player player1, player2, player3;

    @BeforeEach
    void setUp() {
        season = seasonRepository.save(new Season("Saison 2026", 2026));
        player1 = playerRepository.save(new Player("Max"));
        player2 = playerRepository.save(new Player("Lisa"));
        player3 = playerRepository.save(new Player("Tom"));
    }

    @AfterEach
    void tearDown() {
        gameStaffRepository.deleteAll();
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        leagueTeamRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void createGameDay_creates3Games() throws Exception {
        mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "date", "2026-03-15", "label", "Spieltag 1"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.date").value("2026-03-15"))
            .andExpect(jsonPath("$.label").value("Spieltag 1"))
            .andExpect(jsonPath("$.games.length()").value(3))
            .andExpect(jsonPath("$.games[0].gameNumber").value(1))
            .andExpect(jsonPath("$.games[1].gameNumber").value(2))
            .andExpect(jsonPath("$.games[2].gameNumber").value(3));
    }

    @Test
    void setAvailablePlayers_andRetrieve() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andExpect(status().isCreated())
            .andReturn();

        final Long gameDayId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("playerIds",
                    List.of(player1.getId(), player2.getId())))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.availablePlayers.length()").value(2));
    }

    @Test
    void gameDayStats_showsCorrectCounts() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();

        final var gameDayJson = objectMapper.readTree(result.getResponse().getContentAsString());
        final Long gameDayId = gameDayJson.get("id").asLong();
        final Long game1Id = gameDayJson.get("games").get(0).get("id").asLong();
        final Long game2Id = gameDayJson.get("games").get(1).get("id").asLong();

        // Set available players
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(player1.getId(), player2.getId(), player3.getId())))));

        // Game 1: Max=SS, Lisa=EH
        mockMvc.perform(put("/api/games/" + game1Id + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                Map.of("playerId", player2.getId(), "position", "EH", "battingOrder", 2)
            ))));

        // Game 2: Max=P
        mockMvc.perform(put("/api/games/" + game2Id + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "P", "battingOrder", 1)
            ))));

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].playerName").value("Tom"))
            .andExpect(jsonPath("$[0].gameCount").value(0.0))
            .andExpect(jsonPath("$[1].playerName").value("Lisa"))
            .andExpect(jsonPath("$[1].gameCount").value(0.5))
            .andExpect(jsonPath("$[1].positions[0].position").value("EH"))
            .andExpect(jsonPath("$[2].playerName").value("Max"))
            .andExpect(jsonPath("$[2].gameCount").value(2.0))
            .andExpect(jsonPath("$[2].positions.length()").value(2));
    }

    @Test
    void deleteGameDay() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();

        final Long gameDayId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(delete("/api/gamedays/" + gameDayId))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/seasons/" + season.getId() + "/gamedays"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void setOpponent_perGame() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();

        final var gameDayJson = objectMapper.readTree(result.getResponse().getContentAsString());
        final Long game1Id = gameDayJson.get("games").get(0).get("id").asLong();
        final Long game2Id = gameDayJson.get("games").get(1).get("id").asLong();
        final Long game3Id = gameDayJson.get("games").get(2).get("id").asLong();

        // Teams erstellen
        final MvcResult t1 = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Berlin Bears"))))
            .andReturn();
        final Long team1Id = objectMapper.readTree(t1.getResponse().getContentAsString()).get("id").asLong();
        final MvcResult t2 = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Hamburg Hawks"))))
            .andReturn();
        final Long team2Id = objectMapper.readTree(t2.getResponse().getContentAsString()).get("id").asLong();
        final MvcResult t3 = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Munich Miners"))))
            .andReturn();
        final Long team3Id = objectMapper.readTree(t3.getResponse().getContentAsString()).get("id").asLong();

        // Gegner pro Game setzen
        mockMvc.perform(put("/api/games/" + game1Id + "/opponent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", team1Id))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.opponentTeam.name").value("Berlin Bears"));

        mockMvc.perform(put("/api/games/" + game2Id + "/opponent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", team2Id))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.opponentTeam.name").value("Hamburg Hawks"));

        mockMvc.perform(put("/api/games/" + game3Id + "/opponent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", team3Id))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.opponentTeam.name").value("Munich Miners"));

        // Spieltag abrufen und Gegner pro Game pruefen
        final Long gameDayId = gameDayJson.get("id").asLong();
        mockMvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(jsonPath("$.games[0].opponentTeam.name").value("Berlin Bears"))
            .andExpect(jsonPath("$.games[1].opponentTeam.name").value("Hamburg Hawks"))
            .andExpect(jsonPath("$.games[2].opponentTeam.name").value("Munich Miners"));
    }

    @Test
    void createGameDay_duplicateDate_returns400() throws Exception {
        mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Es gibt bereits einen Spieltag am 2026-03-15 in dieser Saison"));
    }

    @Test
    void updateGameDay_duplicateDate_returns400() throws Exception {
        mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andExpect(status().isCreated());

        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-22"))))
            .andExpect(status().isCreated())
            .andReturn();

        final Long gameDayId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        // Update auf bestehendes Datum → 400
        mockMvc.perform(put("/api/gamedays/" + gameDayId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\": \"2026-03-15\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Es gibt bereits einen Spieltag am 2026-03-15 in dieser Saison"));

        // Update auf eigenes Datum → OK (kein false positive)
        mockMvc.perform(put("/api/gamedays/" + gameDayId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\": \"2026-03-22\"}"))
            .andExpect(status().isOk());
    }

    @Test
    void updateGameDay() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "date", "2026-03-15", "label", "Spieltag 1", "location", "Berlin"))))
            .andReturn();

        final Long gameDayId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        // Update date and location, set label to null
        mockMvc.perform(put("/api/gamedays/" + gameDayId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\": \"2026-04-01\", \"location\": \"Bottrop\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.date").value("2026-04-01"))
            .andExpect(jsonPath("$.label").isEmpty())
            .andExpect(jsonPath("$.location").value("Bottrop"))
            .andExpect(jsonPath("$.games.length()").value(3));
    }
}
