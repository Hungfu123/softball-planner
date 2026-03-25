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
class SubstitutionIntegrationTest {

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
    private SpringSubstitutionRepository substitutionRepository;

    @Autowired
    private SpringGameStaffRepository gameStaffRepository;

    @Autowired
    private SpringLeagueTeamRepository leagueTeamRepository;

    private PlayerEntity player1, player2, player3, benchPlayer;
    private Long gameId;
    private Long gameDayId;

    @BeforeEach
    void setUp() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        player1 = playerRepository.save(new PlayerEntity("Max"));
        player2 = playerRepository.save(new PlayerEntity("Lisa"));
        player3 = playerRepository.save(new PlayerEntity("Tom"));
        benchPlayer = playerRepository.save(new PlayerEntity("Anna"));

        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-04-01"))))
            .andReturn();

        final var gameDayJson = objectMapper.readTree(result.getResponse().getContentAsString());
        gameDayId = gameDayJson.get("id").asLong();
        gameId = gameDayJson.get("games").get(0).get("id").asLong();

        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(player1.getId(), player2.getId(), player3.getId(), benchPlayer.getId())))));

        // Set up lineup: player1 at SS, player2 at P
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", player1.getId(), "position", "SS", "battingOrder", 1),
                Map.of("playerId", player2.getId(), "position", "P", "battingOrder", 2)
            ))));
    }

    @AfterEach
    void tearDown() {
        substitutionRepository.deleteAll();
        gameStaffRepository.deleteAll();
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        leagueTeamRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void setAndGetSubstitutions() throws Exception {
        final List<Map<String, Object>> subs = List.of(
            Map.of("playerOutId", player1.getId(), "playerInId", benchPlayer.getId(), "inning", 3)
        );

        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(subs)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].playerOut.name").value("Max"))
            .andExpect(jsonPath("$[0].playerIn.name").value("Anna"))
            .andExpect(jsonPath("$[0].inning").value(3));

        mockMvc.perform(get("/api/games/" + gameId + "/substitutions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].playerOut.name").value("Max"))
            .andExpect(jsonPath("$[0].inning").value(3));
    }

    @Test
    void setSubstitutions_multipleAllowed() throws Exception {
        final List<Map<String, Object>> subs = List.of(
            Map.of("playerOutId", player1.getId(), "playerInId", benchPlayer.getId(), "inning", 3),
            Map.of("playerOutId", player2.getId(), "playerInId", player3.getId(), "inning", 5)
        );

        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(subs)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void setSubstitutions_replacesExisting() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerOutId", player1.getId(), "playerInId", benchPlayer.getId(), "inning", 3)
            ))));

        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerOutId", player2.getId(), "playerInId", player3.getId(), "inning", 5)
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].playerOut.name").value("Lisa"));
    }

    @Test
    void setSubstitutions_emptyList_clearsAll() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerOutId", player1.getId(), "playerInId", benchPlayer.getId(), "inning", 3)
            ))));

        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("[]"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void setSubstitutions_playerOutNotInLineup_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerOutId", benchPlayer.getId(), "playerInId", player3.getId(), "inning", 3)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setSubstitutions_playerInAlreadyInLineup_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerOutId", player1.getId(), "playerInId", player2.getId(), "inning", 3)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setSubstitutions_samePlayerOutAndIn_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerOutId", player1.getId(), "playerInId", player1.getId(), "inning", 3)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setSubstitutions_inning7_returns400() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerOutId", player1.getId(), "playerInId", benchPlayer.getId(), "inning", 7)
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void gameDayLineups_includesSubstitutions() throws Exception {
        mockMvc.perform(put("/api/games/" + gameId + "/substitutions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerOutId", player1.getId(), "playerInId", benchPlayer.getId(), "inning", 3)
            ))));

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/lineups"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.substitutions").exists())
            .andExpect(jsonPath("$.substitutions." + gameId + ".length()").value(1))
            .andExpect(jsonPath("$.substitutions." + gameId + "[0].playerOut.name").value("Max"))
            .andExpect(jsonPath("$.substitutions." + gameId + "[0].playerIn.name").value("Anna"))
            .andExpect(jsonPath("$.substitutions." + gameId + "[0].inning").value(3));
    }
}
