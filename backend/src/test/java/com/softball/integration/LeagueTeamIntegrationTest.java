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
class LeagueTeamIntegrationTest {

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
    private LeagueTeamRepository leagueTeamRepository;

    @Autowired
    private LineupEntryRepository lineupEntryRepository;

    @Autowired
    private GameStaffRepository gameStaffRepository;

    private Season season;
    private Long gameDayId;
    private Long game1Id, game2Id, game3Id;

    @BeforeEach
    void setUp() throws Exception {
        season = seasonRepository.save(new Season("Saison 2026", 2026));

        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();

        final var gdJson = objectMapper.readTree(result.getResponse().getContentAsString());
        gameDayId = gdJson.get("id").asLong();
        game1Id = gdJson.get("games").get(0).get("id").asLong();
        game2Id = gdJson.get("games").get(1).get("id").asLong();
        game3Id = gdJson.get("games").get(2).get("id").asLong();
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
    void crudTeams() throws Exception {
        // Erstellen (Gegner-Team, nicht ownTeam)
        final MvcResult createResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Berlin Bears"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Berlin Bears"))
            .andExpect(jsonPath("$.ownTeam").value(false))
            .andReturn();

        final Long teamId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        // Auflisten
        mockMvc.perform(get("/api/seasons/" + season.getId() + "/teams"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.name == 'Berlin Bears')]").exists());

        // Umbenennen
        mockMvc.perform(put("/api/teams/" + teamId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Berlin Bears 2.0"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Berlin Bears 2.0"));

        // Loeschen
        mockMvc.perform(delete("/api/teams/" + teamId))
            .andExpect(status().isNoContent());
    }

    @Test
    void duplicateTeamName_returns400() throws Exception {
        mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("name", "Bears"))));

        mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "bears"))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void deleteTeam_clearsOpponentFromGames() throws Exception {
        final MvcResult t = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Bears"))))
            .andReturn();
        final Long teamId = objectMapper.readTree(t.getResponse().getContentAsString()).get("id").asLong();

        // Gegner setzen
        mockMvc.perform(put("/api/games/" + game1Id + "/opponent")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", teamId))));

        // Team loeschen
        mockMvc.perform(delete("/api/teams/" + teamId))
            .andExpect(status().isNoContent());

        // Game hat keinen Gegner mehr
        mockMvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(jsonPath("$.games[0].opponentTeam").isEmpty());
    }

    @Test
    void setAndClearScore() throws Exception {
        // Score setzen
        mockMvc.perform(put("/api/games/" + game1Id + "/score")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("scoreUs", 12, "scoreThem", 8))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.scoreUs").value(12))
            .andExpect(jsonPath("$.scoreThem").value(8));

        // Score loeschen
        mockMvc.perform(put("/api/games/" + game1Id + "/score")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"scoreUs\": null, \"scoreThem\": null}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.scoreUs").isEmpty())
            .andExpect(jsonPath("$.scoreThem").isEmpty());
    }

    @Test
    void setScore_onlyOneField_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + game1Id + "/score")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"scoreUs\": 5, \"scoreThem\": null}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void standings_calculation() throws Exception {
        // Eigenes Team + Gegner erstellen
        final MvcResult ownResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Dead Sox", "ownTeam", true))))
            .andReturn();
        final MvcResult oppResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Bears"))))
            .andReturn();
        final Long bearsId = objectMapper.readTree(oppResult.getResponse().getContentAsString()).get("id").asLong();

        // Game 1: 12-8 Win vs Bears
        mockMvc.perform(put("/api/games/" + game1Id + "/opponent")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", bearsId))));
        mockMvc.perform(put("/api/games/" + game1Id + "/score")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("scoreUs", 12, "scoreThem", 8))));

        // Game 2: 3-10 Loss vs Bears
        mockMvc.perform(put("/api/games/" + game2Id + "/opponent")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", bearsId))));
        mockMvc.perform(put("/api/games/" + game2Id + "/score")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("scoreUs", 3, "scoreThem", 10))));

        // Game 3: kein Score -> zaehlt nicht

        // Standings abrufen
        mockMvc.perform(get("/api/seasons/" + season.getId() + "/standings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            // Bears: 1W 1L (invertiert), RS=18, RA=15, winPct=0.5, runDiff=+3 -> zuerst
            .andExpect(jsonPath("$[0].team.name").value("Bears"))
            .andExpect(jsonPath("$[0].games").value(2))
            .andExpect(jsonPath("$[0].wins").value(1))
            .andExpect(jsonPath("$[0].losses").value(1))
            .andExpect(jsonPath("$[0].runsScored").value(18))
            .andExpect(jsonPath("$[0].runsAgainst").value(15))
            .andExpect(jsonPath("$[0].runDiff").value(3))
            // Dead Sox: 1W 1L, RS=15, RA=18, winPct=0.5, runDiff=-3
            .andExpect(jsonPath("$[1].team.name").value("Dead Sox"))
            .andExpect(jsonPath("$[1].games").value(2))
            .andExpect(jsonPath("$[1].wins").value(1))
            .andExpect(jsonPath("$[1].losses").value(1))
            .andExpect(jsonPath("$[1].runsScored").value(15))
            .andExpect(jsonPath("$[1].runsAgainst").value(18))
            .andExpect(jsonPath("$[1].runDiff").value(-3));
    }

    @Test
    void standings_emptyseason_returnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/seasons/" + season.getId() + "/standings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void standings_teamWithNoGames_showsZeros() throws Exception {
        mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("name", "Newbies"))));

        mockMvc.perform(get("/api/seasons/" + season.getId() + "/standings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].games").value(0))
            .andExpect(jsonPath("$[0].wins").value(0))
            .andExpect(jsonPath("$[0].winPct").value(0.0));
    }

    @Test
    void standings_tieGame() throws Exception {
        final MvcResult ownResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Dead Sox", "ownTeam", true))))
            .andReturn();
        final MvcResult oppResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Bears"))))
            .andReturn();
        final Long bearsId = objectMapper.readTree(oppResult.getResponse().getContentAsString()).get("id").asLong();

        // Unentschieden: 5-5
        mockMvc.perform(put("/api/games/" + game1Id + "/opponent")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", bearsId))));
        mockMvc.perform(put("/api/games/" + game1Id + "/score")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("scoreUs", 5, "scoreThem", 5))));

        mockMvc.perform(get("/api/seasons/" + season.getId() + "/standings"))
            .andExpect(jsonPath("$[0].ties").value(1))
            .andExpect(jsonPath("$[0].wins").value(0))
            .andExpect(jsonPath("$[0].losses").value(0));
    }

    @Test
    void setOpponent_teamFromOtherSeason_returns400() throws Exception {
        final Season otherSeason = seasonRepository.save(new Season("Andere Saison", 2025));
        final MvcResult t = mockMvc.perform(post("/api/seasons/" + otherSeason.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Wrong Team"))))
            .andReturn();
        final Long wrongTeamId = objectMapper.readTree(t.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/games/" + game1Id + "/opponent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", wrongTeamId))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void removeOpponent_setsNull() throws Exception {
        final MvcResult t = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Bears"))))
            .andReturn();
        final Long teamId = objectMapper.readTree(t.getResponse().getContentAsString()).get("id").asLong();

        // Setzen
        mockMvc.perform(put("/api/games/" + game1Id + "/opponent")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", teamId))));

        // Entfernen
        mockMvc.perform(put("/api/games/" + game1Id + "/opponent")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"opponentTeamId\": null}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.opponentTeam").isEmpty());
    }

    @Test
    void seasonCreation_autoCreatesOwnTeam() throws Exception {
        // Neue Season ueber API erstellen
        final MvcResult seasonResult = mockMvc.perform(post("/api/seasons")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Test Saison", "year", 2027))))
            .andExpect(status().isCreated())
            .andReturn();
        final Long newSeasonId = objectMapper.readTree(seasonResult.getResponse().getContentAsString()).get("id").asLong();

        // Eigenes Team sollte automatisch existieren
        mockMvc.perform(get("/api/seasons/" + newSeasonId + "/teams"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].name").value("Dead Sox"))
            .andExpect(jsonPath("$[0].ownTeam").value(true));
    }

    @Test
    void deleteOwnTeam_returns400() throws Exception {
        final MvcResult t = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Dead Sox", "ownTeam", true))))
            .andReturn();
        final Long ownTeamId = objectMapper.readTree(t.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(delete("/api/teams/" + ownTeamId))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Das eigene Team kann nicht geloescht werden"));
    }

    @Test
    void setOwnTeamAsOpponent_returns400() throws Exception {
        final MvcResult t = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Dead Sox", "ownTeam", true))))
            .andReturn();
        final Long ownTeamId = objectMapper.readTree(t.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/games/" + game1Id + "/opponent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", ownTeamId))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Das eigene Team kann nicht als Gegner gesetzt werden"));
    }

    @Test
    void setScore_negativeValue_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + game1Id + "/score")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("scoreUs", -1, "scoreThem", 5))))
            .andExpect(status().isBadRequest());
    }
}
