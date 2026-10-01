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
class LineupIntegrationTest {

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

    @Autowired
    private SpringLeagueTeamRepository leagueTeamRepository;

    private SeasonEntity season;
    private PlayerEntity player1, player2, player3;
    private Long gameId;
    private Long gameId2;
    private Long gameDayId;

    @BeforeEach
    void setUp() throws Exception {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        player1 = playerRepository.save(new PlayerEntity("Max"));
        player2 = playerRepository.save(new PlayerEntity("Lisa"));
        player3 = playerRepository.save(new PlayerEntity("Tom"));

        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();

        final var gameDayJson = objectMapper.readTree(result.getResponse().getContentAsString());
        gameDayId = gameDayJson.get("id").asLong();
        gameId = gameDayJson.get("games").get(0).get("id").asLong();
        gameId2 = gameDayJson.get("games").get(1).get("id").asLong();

        // Set available players so lineup validation passes
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(player1.getId(), player2.getId(), player3.getId())))));
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
    void setAndGetLineup() throws Exception {
        final List<Map<String, Object>> lineup = List.of(
            Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
            Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
        );

        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(lineup)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].player.name").value("Max"))
            .andExpect(jsonPath("$[0].position").value("SS"))
            .andExpect(jsonPath("$[0].battingOrder").value(1))
            .andExpect(jsonPath("$[1].player.name").value("Lisa"))
            .andExpect(jsonPath("$[1].position").value("P"));

        mockMvc.perform(get("/api/games/" + gameId + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].battingOrder").value(1))
            .andExpect(jsonPath("$[1].battingOrder").value(2));
    }

    @Test
    void setLineup_replacesExisting() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1)
            ))));

        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player2.getId(), "position", "CF", "battingOrder", 1)
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].player.name").value("Lisa"))
            .andExpect(jsonPath("$[0].position").value("CF"));
    }

    @Test
    void setAndGetStaff() throws Exception {
        final List<Map<String, Object>> staff = List.of(
            Map.of("playerId", player1.getId(), "role", "BASE_COACH_1ST"),
            Map.of("playerId", player2.getId(), "role", "BASE_COACH_3RD")
        );

        mockMvc.perform(put("/api/games/" + gameId + "/staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(staff)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].player.name").value("Max"))
            .andExpect(jsonPath("$[0].role").value("BASE_COACH_1ST"));

        mockMvc.perform(get("/api/games/" + gameId + "/staff"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void setStaff_replacesExisting() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/staff")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "role", "BASE_COACH_1ST")
            ))));

        mockMvc.perform(put("/api/games/" + gameId + "/staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player2.getId(), "role", "BASE_COACH_3RD")
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].player.name").value("Lisa"))
            .andExpect(jsonPath("$[0].role").value("BASE_COACH_3RD"));
    }

    @Test
    void setLineup_duplicatePlayer_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                    Map.of("playerId", player1.getId(), "position", "P", "battingOrder", 2)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setLineup_duplicateBattingOrder_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                    Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 1)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setLineup_nonSequentialBattingOrder_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                    Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 3)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setLineup_invalidPosition_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "INVALID", "battingOrder", 1)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setLineup_playerAlsoAsStaff_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/staff")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "role", "BASE_COACH_1ST")
            ))));

        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setStaff_playerAlsoInLineup_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1)
            ))));

        mockMvc.perform(put("/api/games/" + gameId + "/staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "role", "BASE_COACH_1ST")
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setStaff_invalidRole_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "role", "INVALID_ROLE")
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setStaff_duplicateRole_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "role", "BASE_COACH_1ST"),
                    Map.of("playerId", player2.getId(), "role", "BASE_COACH_1ST")
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setLineup_duplicateFieldPosition_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                    Map.of("playerId", player2.getId(), "position", "SS", "battingOrder", 2)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setLineup_duplicateEhAllowed() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                    Map.of("playerId", player2.getId(), "position", "EH", "battingOrder", 2),
                    Map.of("playerId", player3.getId(), "position", "EH", "battingOrder", 3)
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void setLineup_dhBatterOnFieldPlayer_succeeds() throws Exception {
        // player3 is available but NOT in lineup — acts as DH batter for player1
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1,
                        "dhBatterPlayerId", player3.getId()),
                    Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].position").value("SS"))
            .andExpect(jsonPath("$[0].dhBatterPlayer.name").value("Tom"));
    }

    @Test
    void setLineup_dhBatterOnEh_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "EH", "battingOrder", 1,
                        "dhBatterPlayerId", player3.getId()),
                    Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setLineup_dhBatterIsInLineup_returns400() throws Exception {
        // player2 is in the lineup AND set as DH batter — should fail
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1,
                        "dhBatterPlayerId", player2.getId()),
                    Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setLineup_multipleDhBatters_returns400() throws Exception {
        final PlayerEntity player4 = playerRepository.save(new PlayerEntity("Anna"));
        final PlayerEntity player5 = playerRepository.save(new PlayerEntity("Jan"));
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(player1.getId(), player2.getId(), player4.getId(), player5.getId())))));

        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1,
                        "dhBatterPlayerId", player4.getId()),
                    Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2,
                        "dhBatterPlayerId", player5.getId())
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void swapGames_swapsLineupStaffAndOpponent() throws Exception {
        // Teams erstellen
        final MvcResult t1 = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Berlin Bears"))))
            .andReturn();
        final Long team1Id = objectMapper.readTree(t1.getResponse().getContentAsString()).get("id").asLong();
        final MvcResult t2 = mockMvc.perform(post("/api/seasons/" + season.getId() + "/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Hamburg Stags"))))
            .andReturn();
        final Long team2Id = objectMapper.readTree(t2.getResponse().getContentAsString()).get("id").asLong();

        // Setup: Game 1 mit Lineup + Opponent
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1)
            ))));
        mockMvc.perform(put("/api/games/" + gameId + "/opponent")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", team1Id))));

        // Setup: Game 2 mit anderem Lineup + Opponent
        mockMvc.perform(put("/api/games/" + gameId2 + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 1),
                Map.of("playerId", player3.getId(), "position", "CF", "battingOrder", 2)
            ))));
        mockMvc.perform(put("/api/games/" + gameId2 + "/opponent")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("opponentTeamId", team2Id))));

        // Swap
        mockMvc.perform(post("/api/games/" + gameId + "/swap/" + gameId2))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].opponentTeam.name").value("Hamburg Stags"))
            .andExpect(jsonPath("$[1].opponentTeam.name").value("Berlin Bears"));

        // Verify: Game 1 hat jetzt Game 2's altes Lineup
        mockMvc.perform(get("/api/games/" + gameId + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].player.name").value("Lisa"))
            .andExpect(jsonPath("$[1].player.name").value("Tom"));

        // Verify: Game 2 hat jetzt Game 1's altes Lineup
        mockMvc.perform(get("/api/games/" + gameId2 + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].player.name").value("Max"));
    }

    @Test
    void swapGames_sameGame_returns400() throws Exception {
        mockMvc.perform(post("/api/games/" + gameId + "/swap/" + gameId))
            .andExpect(status().isBadRequest());
    }

    @Test
    void swapGames_differentGameDays_returns400() throws Exception {
        // Create a second game day with its own games
        final SeasonEntity season = seasonRepository.findAll().getFirst();
        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-04-15"))))
            .andReturn();
        final var otherGameDayJson = objectMapper.readTree(result.getResponse().getContentAsString());
        final Long otherGameId = otherGameDayJson.get("games").get(0).get("id").asLong();

        mockMvc.perform(post("/api/games/" + gameId + "/swap/" + otherGameId))
            .andExpect(status().isBadRequest());
    }

    @Test
    void swapGames_nonExistentGame_returns404() throws Exception {
        mockMvc.perform(post("/api/games/" + gameId + "/swap/99999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void setAvailablePlayers_removedPlayerCascadesFromLineupAndStaff() throws Exception {
        // Setup: player1 in Lineup, player3 as Staff
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
            ))));
        mockMvc.perform(put("/api/games/" + gameId + "/staff")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player3.getId(), "role", "BASE_COACH_1ST")
            ))));

        // Remove player1 and player3 from available players (only keep player2)
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(player2.getId())))));

        // Lineup should only have player2, with battingOrder renumbered to 1
        mockMvc.perform(get("/api/games/" + gameId + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].player.name").value("Lisa"))
            .andExpect(jsonPath("$[0].battingOrder").value(1));

        // Staff should be empty (player3 was removed)
        mockMvc.perform(get("/api/games/" + gameId + "/staff"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void setAvailablePlayers_removedDhBatterClearsReference() throws Exception {
        // Setup: player1 at SS with player3 as DH batter
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1,
                    "dhBatterPlayerId", player3.getId()),
                Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
            ))));

        // Remove player3 (the DH batter) from available players
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(player1.getId(), player2.getId())))));

        // Lineup should still have both players, but dhBatterPlayer should be null
        mockMvc.perform(get("/api/games/" + gameId + "/lineup"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].player.name").value("Max"))
            .andExpect(jsonPath("$[0].dhBatterPlayer").isEmpty());
    }

    @Test
    void setAvailablePlayers_removedDhBatterClearsHostStaffEntry() throws Exception {
        // Setup: player1 (DH-Host) at SS with player3 as DH batter, player2 in lineup.
        // player1 schlägt nicht selbst und DARF daher Base Coach sein (DH-Host-Regel).
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1,
                    "dhBatterPlayerId", player3.getId()),
                Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
            ))));
        mockMvc.perform(put("/api/games/" + gameId + "/staff")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "role", "BASE_COACH_1ST")
            ))))
            .andExpect(status().isOk());

        // player3 (DH-Batter) fällt aus → Cascade nullt player1s DH-Referenz.
        // player1 schlägt jetzt selbst → sein Base-Coach-Eintrag muss mitgehen,
        // sonst steht die DB im verbotenen Zustand "schlägt UND coacht".
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(player1.getId(), player2.getId())))));

        // 1) Der Staff-Eintrag des Hosts muss weg sein
        mockMvc.perform(get("/api/games/" + gameId + "/staff"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));

        // 2) Das eigentliche User-Symptom: das unveränderte Lineup muss sich
        //    wieder speichern lassen — ohne den 400er "steht im Lineup und ist
        //    gleichzeitig als Base Coach eingeteilt".
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
            ))))
            .andExpect(status().isOk());
    }

    @Test
    void setLineup_nullPosition_succeeds() throws Exception {
        final String lineup = objectMapper.writeValueAsString(List.of(
            Map.of("playerId", player1.getId(), "battingOrder", 1),
            Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
        ));

        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(lineup))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].player.name").value("Max"))
            .andExpect(jsonPath("$[0].position").isEmpty())
            .andExpect(jsonPath("$[1].player.name").value("Lisa"))
            .andExpect(jsonPath("$[1].position").value("P"));
    }

    @Test
    void setLineup_dhBatterWithNullPosition_returns400() throws Exception {
        final String lineup = objectMapper.writeValueAsString(List.of(
            Map.of("playerId", player1.getId(), "battingOrder", 1, "dhBatterPlayerId", player3.getId()),
            Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
        ));

        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(lineup))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setLineup_moreThan10Entries_returns400() throws Exception {
        // Create 11 players and make them all available
        final var players = new java.util.ArrayList<PlayerEntity>();
        players.add(player1);
        players.add(player2);
        players.add(player3);
        for (int i = 4; i <= 11; i++) {
            players.add(playerRepository.save(new PlayerEntity("Player" + i)));
        }
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                players.stream().map(PlayerEntity::getId).toList()))));

        // Create lineup with 11 entries
        final var lineup = new java.util.ArrayList<Map<String, Object>>();
        for (int i = 0; i < 11; i++) {
            lineup.add(Map.of("playerId", players.get(i).getId(), "battingOrder", i + 1));
        }

        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(lineup)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void stats_nullPositionCountsAsFullGame() throws Exception {
        final String lineup = objectMapper.writeValueAsString(List.of(
            Map.of("playerId", player1.getId(), "battingOrder", 1),
            Map.of("playerId", player2.getId(), "position", "EH", "battingOrder", 2)
        ));

        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(lineup));

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/stats"))
            .andExpect(status().isOk())
            // Sortierung aufsteigend: Tom (0.0), Lisa/EH (0.5), Max/null (1.0)
            .andExpect(jsonPath("$[0].playerName").value("Tom"))
            .andExpect(jsonPath("$[0].gameCount").value(0.0))
            .andExpect(jsonPath("$[1].playerName").value("Lisa"))
            .andExpect(jsonPath("$[1].gameCount").value(0.5))
            .andExpect(jsonPath("$[2].playerName").value("Max"))
            .andExpect(jsonPath("$[2].gameCount").value(1.0))
            .andExpect(jsonPath("$[2].positions[0].position").isEmpty());
    }
}
