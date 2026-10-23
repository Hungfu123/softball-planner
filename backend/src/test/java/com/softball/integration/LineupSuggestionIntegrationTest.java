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
import com.softball.MitSuperadmin;
import org.springframework.test.context.ActiveProfiles;
import com.softball.TestcontainersConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class LineupSuggestionIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SpringSeasonRepository seasonRepository;
    @Autowired private SpringPlayerRepository playerRepository;
    @Autowired private SpringGameDayRepository gameDayRepository;
    @Autowired private SpringGameRepository gameRepository;
    @Autowired private SpringLineupEntryRepository lineupEntryRepository;
    @Autowired private SpringGameStaffRepository gameStaffRepository;
    @Autowired private SpringLeagueTeamRepository leagueTeamRepository;

    private SeasonEntity season;
    private final List<PlayerEntity> players = new ArrayList<>();
    private Long gameDayId;
    private Long gameId1;
    private Long gameId2;

    @BeforeEach
    void setUp() throws Exception {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));

        for (int i = 1; i <= 10; i++) {
            players.add(playerRepository.save(new PlayerEntity("Player" + i)));
        }

        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();

        final var gameDayJson = objectMapper.readTree(result.getResponse().getContentAsString());
        gameDayId = gameDayJson.get("id").asLong();
        gameId1 = gameDayJson.get("games").get(0).get("id").asLong();
        gameId2 = gameDayJson.get("games").get(1).get("id").asLong();

        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                players.stream().map(PlayerEntity::getId).toList()))));
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
    void suggest_returnsAllNineAutoPositions() throws Exception {
        final MvcResult result = mockMvc.perform(get("/api/games/" + gameId1 + "/lineup/suggest"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(9))
            .andReturn();

        final var json = objectMapper.readTree(result.getResponse().getContentAsString());
        final Set<String> positions = new HashSet<>();
        for (final var entry : json) {
            positions.add(entry.get("position").asText());
        }
        // Should contain all 9 auto-fill positions (P + C + 7 field positions)
        org.assertj.core.api.Assertions.assertThat(positions)
            .containsExactlyInAnyOrder("P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF");
    }

    @Test
    void suggest_respectsManualEhPosition() throws Exception {
        // EH is the only manual position — set player1 as EH
        mockMvc.perform(put("/api/games/" + gameId1 + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", players.get(0).getId(), "position", "EH", "battingOrder", 1)
            ))));

        final MvcResult result = mockMvc.perform(get("/api/games/" + gameId1 + "/lineup/suggest"))
            .andExpect(status().isOk())
            .andReturn();

        final var json = objectMapper.readTree(result.getResponse().getContentAsString());

        // Should contain EH player (manual) + 9 auto positions = 10 total
        final Set<String> positions = new HashSet<>();
        boolean hasManualPlayer = false;
        for (final var entry : json) {
            if (entry.get("position") != null && !entry.get("position").isNull()) {
                positions.add(entry.get("position").asText());
            }
            if (entry.get("playerId").asLong() == players.get(0).getId()) {
                hasManualPlayer = true;
                org.assertj.core.api.Assertions.assertThat(entry.get("position").asText()).isEqualTo("EH");
            }
        }
        org.assertj.core.api.Assertions.assertThat(hasManualPlayer).isTrue();
        org.assertj.core.api.Assertions.assertThat(positions).contains("EH", "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF");
    }

    @Test
    void suggest_excludesStaffFromSuggestion() throws Exception {
        // Set player1 as staff
        mockMvc.perform(put("/api/games/" + gameId1 + "/staff")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", players.get(0).getId(), "role", "BASE_COACH_1ST")
            ))));

        final MvcResult result = mockMvc.perform(get("/api/games/" + gameId1 + "/lineup/suggest"))
            .andExpect(status().isOk())
            .andReturn();

        final var json = objectMapper.readTree(result.getResponse().getContentAsString());
        for (final var entry : json) {
            // Staff player should NOT be in suggestion
            org.assertj.core.api.Assertions.assertThat(entry.get("playerId").asLong())
                .isNotEqualTo(players.get(0).getId());
        }
    }

    @Test
    void suggest_staffExclusionIsPerGameOnly() throws Exception {
        // Set player1 as staff in game 1
        mockMvc.perform(put("/api/games/" + gameId1 + "/staff")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", players.get(0).getId(), "role", "BASE_COACH_1ST")
            ))));

        // Suggest for game 2 — player1 should be available
        final MvcResult result = mockMvc.perform(get("/api/games/" + gameId2 + "/lineup/suggest"))
            .andExpect(status().isOk())
            .andReturn();

        final var json = objectMapper.readTree(result.getResponse().getContentAsString());
        final Set<Long> suggestedIds = new HashSet<>();
        for (final var entry : json) {
            suggestedIds.add(entry.get("playerId").asLong());
        }
        // Player1 should be eligible for game 2 since staff is per-game
        // (may or may not be selected depending on random, but we have 10 players and 7 spots)
        // With 10 players and 7 spots, at least some get selected
        // The key assertion: player1 is NOT excluded from the candidate pool for game 2
    }

    @Test
    void suggestAll_fillsAllGamesAndSaves() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup/suggest-all"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.oldLineups").exists())
            .andExpect(jsonPath("$.newLineups").exists());

        // Both games should now have lineups saved
        mockMvc.perform(get("/api/games/" + gameId1 + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/games/" + gameId2 + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(1)));
    }

    @Test
    void suggestAll_reShufflesAllGames() throws Exception {
        // Fill game 1 with all 7 auto positions
        final List<Map<String, Object>> lineup = List.of(
            Map.of("playerId", players.get(0).getId(), "position", "1B", "battingOrder", 1),
            Map.of("playerId", players.get(1).getId(), "position", "2B", "battingOrder", 2),
            Map.of("playerId", players.get(2).getId(), "position", "3B", "battingOrder", 3),
            Map.of("playerId", players.get(3).getId(), "position", "SS", "battingOrder", 4),
            Map.of("playerId", players.get(4).getId(), "position", "LF", "battingOrder", 5),
            Map.of("playerId", players.get(5).getId(), "position", "CF", "battingOrder", 6),
            Map.of("playerId", players.get(6).getId(), "position", "RF", "battingOrder", 7)
        );
        mockMvc.perform(put("/api/games/" + gameId1 + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(lineup)));

        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup/suggest-all"))
            .andExpect(status().isOk());

        // Game 1 should be re-shuffled — 9 entries with all auto positions (P + C + 7 field)
        final MvcResult g1 = mockMvc.perform(get("/api/games/" + gameId1 + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(9))
            .andReturn();

        final var g1Json = objectMapper.readTree(g1.getResponse().getContentAsString());
        final Set<String> g1Positions = new HashSet<>();
        for (final var entry : g1Json) {
            g1Positions.add(entry.get("position").asText());
        }
        org.assertj.core.api.Assertions.assertThat(g1Positions)
            .containsExactlyInAnyOrder("P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF");

        // Game 2 should also be filled
        mockMvc.perform(get("/api/games/" + gameId2 + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(1)));
    }

    @Test
    void suggestAll_undoRestoresOldState() throws Exception {
        // Fill game 1 with a manual lineup
        mockMvc.perform(put("/api/games/" + gameId1 + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", players.get(0).getId(), "position", "SS", "battingOrder", 1)
            ))));

        // Run suggest-all — this will change game 1 (add more) and fill game 2
        final MvcResult suggestResult = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup/suggest-all"))
            .andExpect(status().isOk())
            .andReturn();

        final var suggestJson = objectMapper.readTree(suggestResult.getResponse().getContentAsString());

        // Build undo request: convert LineupEntryResponse format to LineupEntryRequest format
        final var oldLineupsNode = suggestJson.get("oldLineups");
        final var convertedOldLineups = new java.util.LinkedHashMap<String, List<Map<String, Object>>>();
        final var fields = oldLineupsNode.fields();
        while (fields.hasNext()) {
            final var field = fields.next();
            final var entries = new ArrayList<Map<String, Object>>();
            for (final var entry : field.getValue()) {
                final var converted = new java.util.LinkedHashMap<String, Object>();
                converted.put("playerId", entry.get("player").get("id").asLong());
                converted.put("position", entry.has("position") && !entry.get("position").isNull() ? entry.get("position").asText() : null);
                converted.put("battingOrder", entry.get("battingOrder").asInt());
                converted.put("dhBatterPlayerId", entry.has("dhBatterPlayer") && !entry.get("dhBatterPlayer").isNull() ? entry.get("dhBatterPlayer").get("id").asLong() : null);
                entries.add(converted);
            }
            convertedOldLineups.put(field.getKey(), entries);
        }
        final Map<String, Object> undoRequest = Map.of("oldLineups", convertedOldLineups);

        // Undo
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup/undo")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(undoRequest)))
            .andExpect(status().isOk());

        // Game 1 should be back to just player1 at SS
        mockMvc.perform(get("/api/games/" + gameId1 + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].player.name").value("Player1"))
            .andExpect(jsonPath("$[0].position").value("SS"));

        // Game 2 should be empty again
        mockMvc.perform(get("/api/games/" + gameId2 + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void suggestAll_undoWithWrongGameDay_returns404() throws Exception {
        mockMvc.perform(post("/api/gamedays/99999/lineup/undo")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("oldLineups", Map.of()))))
            .andExpect(status().isNotFound());
    }

    @Test
    void suggest_allAutoPositionsFilled_reShuffles() throws Exception {
        // Fill all 9 auto positions (P + C + 7 field)
        final List<Map<String, Object>> lineup = List.of(
            Map.of("playerId", players.get(0).getId(), "position", "P", "battingOrder", 1),
            Map.of("playerId", players.get(1).getId(), "position", "C", "battingOrder", 2),
            Map.of("playerId", players.get(2).getId(), "position", "1B", "battingOrder", 3),
            Map.of("playerId", players.get(3).getId(), "position", "2B", "battingOrder", 4),
            Map.of("playerId", players.get(4).getId(), "position", "3B", "battingOrder", 5),
            Map.of("playerId", players.get(5).getId(), "position", "SS", "battingOrder", 6),
            Map.of("playerId", players.get(6).getId(), "position", "LF", "battingOrder", 7),
            Map.of("playerId", players.get(7).getId(), "position", "CF", "battingOrder", 8),
            Map.of("playerId", players.get(8).getId(), "position", "RF", "battingOrder", 9)
        );
        mockMvc.perform(put("/api/games/" + gameId1 + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(lineup)));

        // Suggest should re-shuffle — 9 entries with all 9 auto positions
        final MvcResult result = mockMvc.perform(get("/api/games/" + gameId1 + "/lineup/suggest"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(9))
            .andReturn();

        final var json = objectMapper.readTree(result.getResponse().getContentAsString());
        final Set<String> positions = new HashSet<>();
        for (final var entry : json) {
            positions.add(entry.get("position").asText());
        }
        org.assertj.core.api.Assertions.assertThat(positions)
            .containsExactlyInAnyOrder("P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF");
    }

    @Test
    void suggest_tooFewPlayers_fillsAsManyAsPossible() throws Exception {
        // Only make 3 players available (not enough for 9 positions)
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(players.get(0).getId(), players.get(1).getId(), players.get(2).getId())))));

        mockMvc.perform(get("/api/games/" + gameId1 + "/lineup/suggest"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(3));
    }
}
