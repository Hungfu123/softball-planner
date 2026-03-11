package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.entity.Player;
import com.softball.entity.Season;
import com.softball.repository.*;
import org.junit.jupiter.api.AfterEach;
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
class DataExportIntegrationTest {

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
    void exportAndImport_roundTrip() throws Exception {
        // Setup: Spieler, Saison, Spieltag, Lineup
        final Player player1 = playerRepository.save(new Player("Max"));
        final Player player2 = playerRepository.save(new Player("Lisa"));
        final Player player3 = playerRepository.save(new Player("Tom"));
        final Season season = seasonRepository.save(new Season("Saison 2026", 2026));

        final MvcResult gdResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();

        final var gdJson = objectMapper.readTree(gdResult.getResponse().getContentAsString());
        final Long gameDayId = gdJson.get("id").asLong();
        final Long game1Id = gdJson.get("games").get(0).get("id").asLong();

        // Team erstellen und als Gegner setzen
        final MvcResult teamResult = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Berlin Bears"))))
            .andReturn();
        final Long teamId = objectMapper.readTree(teamResult.getResponse().getContentAsString()).get("id").asLong();
        mockMvc.perform(put("/api/games/" + game1Id + "/opponent")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", teamId))));

        // Verfuegbare Spieler setzen
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(player1.getId(), player2.getId())))));

        // Lineup setzen
        mockMvc.perform(put("/api/games/" + game1Id + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                Map.of("playerId", player2.getId(), "position", "EH", "battingOrder", 2)
            ))));

        // Staff setzen (player3 ist nicht im Lineup)
        mockMvc.perform(put("/api/games/" + game1Id + "/staff")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player3.getId(), "role", "BASE_COACH_1ST")
            ))));

        // EXPORT
        final MvcResult exportResult = mockMvc.perform(get("/api/data/export"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.players.length()").value(3))
            .andExpect(jsonPath("$.seasons.length()").value(1))
            .andExpect(jsonPath("$.seasons[0].gameDays[0].games[0].opponentTeamName").value("Berlin Bears"))
            .andExpect(jsonPath("$.seasons[0].gameDays[0].games[0].lineup.length()").value(2))
            .andExpect(jsonPath("$.seasons[0].gameDays[0].games[0].staff.length()").value(1))
            .andReturn();

        final String exportJson = exportResult.getResponse().getContentAsString();

        // Alles loeschen
        gameStaffRepository.deleteAll();
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        leagueTeamRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();

        // IMPORT
        mockMvc.perform(post("/api/data/import")
                .contentType(MediaType.APPLICATION_JSON)
                .content(exportJson))
            .andExpect(status().isCreated());

        // Verifizieren: Spieler wieder da
        mockMvc.perform(get("/api/players"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.name == 'Max')]").exists())
            .andExpect(jsonPath("$[?(@.name == 'Lisa')]").exists())
            .andExpect(jsonPath("$[?(@.name == 'Tom')]").exists());

        // Verifizieren: Saison + Spieltag wieder da
        mockMvc.perform(get("/api/seasons"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Saison 2026"));

        // Neue Season-ID holen
        final MvcResult seasonsResult = mockMvc.perform(get("/api/seasons")).andReturn();
        final Long newSeasonId = objectMapper.readTree(seasonsResult.getResponse().getContentAsString())
            .get(0).get("id").asLong();

        // Spieltag + Gegner pruefen
        final MvcResult gameDaysResult = mockMvc.perform(get("/api/seasons/" + newSeasonId + "/gamedays"))
            .andExpect(jsonPath("$[0].games.length()").value(3))
            .andExpect(jsonPath("$[0].games[0].opponentTeam.name").value("Berlin Bears"))
            .andReturn();

        // Lineup pruefen
        final Long newGame1Id = objectMapper.readTree(gameDaysResult.getResponse().getContentAsString())
            .get(0).get("games").get(0).get("id").asLong();

        mockMvc.perform(get("/api/games/" + newGame1Id + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].position").value("SS"))
            .andExpect(jsonPath("$[1].position").value("EH"));

        // Staff pruefen
        mockMvc.perform(get("/api/games/" + newGame1Id + "/staff"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].role").value("BASE_COACH_1ST"));
    }

    @Test
    void export_emptyDatabase_returnsEmptyLists() throws Exception {
        mockMvc.perform(get("/api/data/export"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.players").isEmpty())
            .andExpect(jsonPath("$.seasons").isEmpty());
    }
}
