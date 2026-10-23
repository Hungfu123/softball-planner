package com.softball.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.AtBatEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringAtBatRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringGameStaffRepository;
import com.softball.adapter.out.persistence.repository.SpringLeagueTeamRepository;
import com.softball.adapter.out.persistence.repository.SpringLineupEntryRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.domain.model.AtBatResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser(roles = "SUPERADMIN")
class GameLiveStatusIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SpringSeasonRepository seasonRepository;
    @Autowired private SpringPlayerRepository playerRepository;
    @Autowired private SpringGameDayRepository gameDayRepository;
    @Autowired private SpringGameRepository gameRepository;
    @Autowired private SpringLineupEntryRepository lineupEntryRepository;
    @Autowired private SpringGameStaffRepository gameStaffRepository;
    @Autowired private SpringLeagueTeamRepository leagueTeamRepository;
    @Autowired private SpringAtBatRepository atBatRepository;

    private SeasonEntity season;
    private PlayerEntity batter;

    @BeforeEach
    void setUp() {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        batter = playerRepository.save(new PlayerEntity("Max"));
    }

    @AfterEach
    void tearDown() {
        atBatRepository.deleteAll();
        gameStaffRepository.deleteAll();
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        leagueTeamRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void newGame_hasNullEndedAt_andZeroAtBatCount() throws Exception {
        final Long gameDayId = createGameDay("2026-03-15");

        mockMvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.games[0].endedAt").doesNotExist())
            .andExpect(jsonPath("$.games[0].atBatCount").value(0));
    }

    @Test
    void endGame_setsEndedAt_andReopenClearsIt() throws Exception {
        final Long gameDayId = createGameDay("2026-03-15");
        final Long gameId = firstGameId(gameDayId);

        mockMvc.perform(post("/api/games/" + gameId + "/end"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.endedAt").exists())
            .andExpect(jsonPath("$.endedAt").isNotEmpty());

        mockMvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.games[0].endedAt").isNotEmpty());

        mockMvc.perform(post("/api/games/" + gameId + "/reopen"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.endedAt").doesNotExist());

        mockMvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.games[0].endedAt").doesNotExist());
    }

    @Test
    void endGame_isIdempotent_keepsOriginalTimestamp() throws Exception {
        final Long gameDayId = createGameDay("2026-03-15");
        final Long gameId = firstGameId(gameDayId);

        mockMvc.perform(post("/api/games/" + gameId + "/end"))
            .andExpect(status().isOk());

        // After persistence + read-back the timestamp is normalized to DB precision.
        final MvcResult firstRead = mockMvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(status().isOk())
            .andReturn();
        final String persistedEndedAt = objectMapper.readTree(firstRead.getResponse().getContentAsString())
            .get("games").get(0).get("endedAt").asText();

        final MvcResult second = mockMvc.perform(post("/api/games/" + gameId + "/end"))
            .andExpect(status().isOk())
            .andReturn();
        final String secondEndedAt = objectMapper.readTree(second.getResponse().getContentAsString())
            .get("endedAt").asText();

        org.assertj.core.api.Assertions.assertThat(secondEndedAt).isEqualTo(persistedEndedAt);
    }

    @Test
    void atBatCount_andLiveScore_aggregateFromAtBats() throws Exception {
        final Long gameDayId = createGameDay("2026-03-15");
        final Long gameId = firstGameId(gameDayId);

        seedAtBat(gameId, 1, 0);
        seedAtBat(gameId, 2, 2);
        seedAtBat(gameId, 3, 1);

        mockMvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.games[0].atBatCount").value(3))
            .andExpect(jsonPath("$.games[0].scoreUs").value(3));
    }

    @Test
    void liveScore_doesNotOverridePersistedScore_whenNoAtBatsExist() throws Exception {
        final Long gameDayId = createGameDay("2026-03-15");
        final Long gameId = firstGameId(gameDayId);

        mockMvc.perform(put("/api/games/" + gameId + "/score")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("scoreUs", 7, "scoreThem", 5))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.scoreUs").value(7));

        mockMvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.games[0].scoreUs").value(7))
            .andExpect(jsonPath("$.games[0].scoreThem").value(5))
            .andExpect(jsonPath("$.games[0].atBatCount").value(0));
    }

    @Test
    void applyPollVotes_returnsLiveAtBatCount_notZero() throws Exception {
        // Regression fuer Task 6, Fix-Runde 1: der Apply-Endpoint muss die gleiche
        // Live-Variante (echte At-Bat-Counts/Scores) liefern wie GET /gamedays/{id},
        // nicht die 0-Wert-Platzhalter des 1-Parameter-GameDayResponse.from(GameDay)-Overloads.
        final Long gameDayId = createGameDay("2026-03-15");
        final Long gameId = firstGameId(gameDayId);
        seedAtBat(gameId, 1, 0);
        seedAtBat(gameId, 2, 2);

        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/poll-votes/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("add", List.of(), "remove", List.of()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.games[0].atBatCount").value(2))
            .andExpect(jsonPath("$.games[0].scoreUs").value(2));
    }

    @Test
    void endUnknownGame_returns404() throws Exception {
        mockMvc.perform(post("/api/games/99999/end"))
            .andExpect(status().isNotFound());
    }

    private Long createGameDay(final String date) throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", date))))
            .andExpect(status().isCreated())
            .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long firstGameId(final Long gameDayId) throws Exception {
        final MvcResult result = mockMvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(status().isOk())
            .andReturn();
        final JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("games").get(0).get("id").asLong();
    }

    private void seedAtBat(final Long gameId, final int sequence, final int runsScored) {
        final GameEntity game = gameRepository.findById(gameId).orElseThrow();
        final AtBatEntity ab = new AtBatEntity();
        ab.setGame(game);
        ab.setBatter(batter);
        ab.setSequence(sequence);
        ab.setInning(1);
        ab.setResult(AtBatResult.SINGLE);
        ab.setRunsScored(runsScored);
        ab.setRbi(runsScored);
        ab.setCreatedBy("test");
        atBatRepository.save(ab);
    }
}
