package com.softball.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.dto.StartClockRequest;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import org.junit.jupiter.api.AfterEach;
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

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.lessThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integrationstests fuer die vier Uhr-Endpunkte des Legacy-Scorings (Task 3). Zeit-Spruenge
 * zwischen den HTTP-Aufrufen werden ueber direkte Manipulation von {@code timer_running_since}
 * simuliert — deterministisch statt {@code Thread.sleep}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class GameClockActionsIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private SpringSeasonRepository seasonRepository;
    @Autowired private SpringGameDayRepository gameDayRepository;
    @Autowired private SpringGameRepository gameRepository;

    @AfterEach
    void tearDown() {
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
    }

    @Test
    void start_setsRunningSinceAndLimit_secondStartRejected() throws Exception {
        final Long gameId = createGame();

        mvc.perform(post("/api/games/" + gameId + "/clock/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new StartClockRequest(50))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.started").value(true))
            .andExpect(jsonPath("$.running").value(true))
            .andExpect(jsonPath("$.limitMinutes").value(50))
            .andExpect(jsonPath("$.elapsedSeconds").value(0));

        mvc.perform(post("/api/games/" + gameId + "/clock/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new StartClockRequest(90))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void pause_banksElapsed_andClearsRunningSince_secondPauseRejected() throws Exception {
        final Long gameId = createGame();
        startClock(gameId, 50);
        rewindRunningSince(gameId, 125);

        mvc.perform(post("/api/games/" + gameId + "/clock/pause"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.running").value(false))
            .andExpect(jsonPath("$.started").value(true))
            .andExpect(jsonPath("$.elapsedSeconds", greaterThanOrEqualTo(125)))
            .andExpect(jsonPath("$.elapsedSeconds", lessThan(135)));

        mvc.perform(post("/api/games/" + gameId + "/clock/pause"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void resume_continuesWithoutLosingAccumulated_resumeWithoutStartRejected() throws Exception {
        final Long freshGameId = createGame();
        mvc.perform(post("/api/games/" + freshGameId + "/clock/resume"))
            .andExpect(status().isBadRequest());

        final Long gameId = createGame();
        startClock(gameId, null);
        rewindRunningSince(gameId, 60);
        final int afterFirstPause = pauseClock(gameId);
        assertThat(afterFirstPause).isBetween(60, 65);

        mvc.perform(post("/api/games/" + gameId + "/clock/resume"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.running").value(true))
            .andExpect(jsonPath("$.elapsedSeconds", greaterThanOrEqualTo(afterFirstPause)))
            .andExpect(jsonPath("$.elapsedSeconds", lessThan(afterFirstPause + 5)));

        // Resume waehrend die Uhr schon laeuft wird abgelehnt.
        mvc.perform(post("/api/games/" + gameId + "/clock/resume"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void startPauseResumePause_sumsAcrossCycles() throws Exception {
        final Long gameId = createGame();
        startClock(gameId, null);
        rewindRunningSince(gameId, 100);
        final int first = pauseClock(gameId);
        assertThat(first).isBetween(100, 105);

        resumeClock(gameId);
        rewindRunningSince(gameId, 50);
        final int second = pauseClock(gameId);
        assertThat(second).isBetween(first + 50, first + 55);
    }

    @Test
    void reset_clearsTimeButKeepsLimit() throws Exception {
        final Long gameId = createGame();
        startClock(gameId, 90);
        rewindRunningSince(gameId, 200);
        pauseClock(gameId);

        mvc.perform(post("/api/games/" + gameId + "/clock/reset"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.started").value(false))
            .andExpect(jsonPath("$.running").value(false))
            .andExpect(jsonPath("$.elapsedSeconds").value(0))
            .andExpect(jsonPath("$.limitMinutes").value(90));
    }

    @Test
    void scoreboard_regressionGuard_neverStartedClockReportsZero_andKeepsExistingFields() throws Exception {
        final Long gameId = createGame();

        mvc.perform(get("/api/games/" + gameId + "/scoreboard"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameId").value(gameId))
            .andExpect(jsonPath("$.currentInning").exists())
            .andExpect(jsonPath("$.totalAtBats").value(0))
            .andExpect(jsonPath("$.clock.started").value(false))
            .andExpect(jsonPath("$.clock.running").value(false))
            .andExpect(jsonPath("$.clock.elapsedSeconds").value(0));
    }

    @Test
    void scoreboard_carriesElapsedSeconds_whileClockRunning() throws Exception {
        final Long gameId = createGame();
        startClock(gameId, 50);
        rewindRunningSince(gameId, 42);

        mvc.perform(get("/api/games/" + gameId + "/scoreboard"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.clock.running").value(true))
            .andExpect(jsonPath("$.clock.elapsedSeconds", greaterThanOrEqualTo(42)))
            .andExpect(jsonPath("$.clock.elapsedSeconds", lessThan(50)))
            .andExpect(jsonPath("$.clock.limitMinutes").value(50));
    }

    // ===== Helpers =====

    private Long createGame() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Uhr-Test-Saison", 2026));
        final MvcResult created = mvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("date", "2026-08-10"))))
            .andExpect(status().isCreated())
            .andReturn();
        final Long gameDayId = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        final MvcResult gameDay = mvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(status().isOk())
            .andReturn();
        final JsonNode body = json.readTree(gameDay.getResponse().getContentAsString());
        return body.get("games").get(0).get("id").asLong();
    }

    private void startClock(final Long gameId, final Integer limitMinutes) throws Exception {
        mvc.perform(post("/api/games/" + gameId + "/clock/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new StartClockRequest(limitMinutes))))
            .andExpect(status().isOk());
    }

    private int pauseClock(final Long gameId) throws Exception {
        final MvcResult result = mvc.perform(post("/api/games/" + gameId + "/clock/pause"))
            .andExpect(status().isOk())
            .andReturn();
        return json.readTree(result.getResponse().getContentAsString()).get("elapsedSeconds").asInt();
    }

    private void resumeClock(final Long gameId) throws Exception {
        mvc.perform(post("/api/games/" + gameId + "/clock/resume"))
            .andExpect(status().isOk());
    }

    /** Versetzt {@code timer_running_since} in die Vergangenheit, um Zeitablauf zu simulieren. */
    private void rewindRunningSince(final Long gameId, final long seconds) {
        final GameEntity entity = gameRepository.findById(gameId).orElseThrow();
        entity.setTimerRunningSince(Instant.now().minusSeconds(seconds));
        gameRepository.save(entity);
    }
}
