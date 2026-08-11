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

    // Task 7: timerStartedAt ist der Wanduhr-Wert fuers "Zeit:"-Feld im PDF-Export — anders als
    // timerRunningSince darf er einen Limit-Wechsel bei bereits pausierter Uhr (Task-3-Design)
    // nicht mitmachen, sonst zeigt das RFL-Blatt eine falsche Anfangszeit.
    @Test
    void start_setsTimerStartedAt_onlyOnFirstStart_restartAfterPauseKeepsIt() throws Exception {
        final Long gameId = createGame();

        startClock(gameId, 50);
        final Instant firstStartedAt = gameRepository.findById(gameId).orElseThrow().getTimerStartedAt();
        assertThat(firstStartedAt).isNotNull();

        mvc.perform(post("/api/games/" + gameId + "/clock/pause")).andExpect(status().isOk());
        startClock(gameId, 90); // Limit-Aenderung an pausierter Uhr, s. Task-3-Design

        final GameEntity entity = gameRepository.findById(gameId).orElseThrow();
        assertThat(entity.getTimerStartedAt()).isEqualTo(firstStartedAt);
        assertThat(entity.getTimeLimitMinutes()).isEqualTo(90);
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

    // Regression fuer Fix-Runde 1: die Uhr eines beendeten Spiels darf beim Pausieren nicht die
    // Zeit seit Spielende mitzaehlen — sie muss an endedAt einfrieren, exakt wie beim Lesepfad
    // (GameClockCalculator.compute). Ohne den Deckel wuerde bankElapsed "jetzt - runningSince"
    // buchen, also die volle Stunde seit Spielende statt der 100s bis zum Spielende.
    @Test
    void pause_afterGameEnded_banksElapsedOnlyUntilEndedAt_notUntilNow() throws Exception {
        final Long gameId = createGame();
        startClock(gameId, null);
        rewindRunningSince(gameId, 3700); // Uhr laeuft seit 3700s
        endGameAt(gameId, 3600); // Spiel endete vor 3600s -> 100s liefen bis dahin

        final int elapsed = pauseClock(gameId);
        assertThat(elapsed).isBetween(100, 105);
        assertThat(elapsed).isLessThan(3700);
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
    void resume_neverTouchesTimerStartedAt() throws Exception {
        final Long gameId = createGame();
        startClock(gameId, null);
        final Instant startedAt = gameRepository.findById(gameId).orElseThrow().getTimerStartedAt();
        rewindRunningSince(gameId, 60);
        pauseClock(gameId);

        resumeClock(gameId);

        assertThat(gameRepository.findById(gameId).orElseThrow().getTimerStartedAt()).isEqualTo(startedAt);
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
    void reset_clearsTimerStartedAt() throws Exception {
        final Long gameId = createGame();
        startClock(gameId, 90);
        assertThat(gameRepository.findById(gameId).orElseThrow().getTimerStartedAt()).isNotNull();

        mvc.perform(post("/api/games/" + gameId + "/clock/reset")).andExpect(status().isOk());

        assertThat(gameRepository.findById(gameId).orElseThrow().getTimerStartedAt()).isNull();
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

    // Task 4: Wiederoeffnen ist der einzige Schreibvorgang vom Spielablauf in die Uhr — reopen
    // nullt endedAt und muss die laufende Uhr davor pausieren+deckeln. Ohne den Fix bliebe
    // timerRunningSince gesetzt (>3700s alt) und die naechste Ableitung wuerde "jetzt -
    // runningSince" zaehlen statt der 100s bis zum Spielende — genau der Sprung aus dem Ticket
    // (93 Minuten -> vierzehn Stunden).
    @Test
    void reopen_runningClock_pausesWithElapsedCappedAtGameEnd_notJumpingToNow() throws Exception {
        final Long gameId = createGame();
        startClock(gameId, null);
        rewindRunningSince(gameId, 3700); // Uhr laeuft seit 3700s
        endGameAt(gameId, 3600); // Spiel endete vor 3600s -> nur 100s liefen bis zum Spielende

        mvc.perform(post("/api/games/" + gameId + "/reopen"))
            .andExpect(status().isOk());

        final GameEntity entity = gameRepository.findById(gameId).orElseThrow();
        assertThat(entity.getEndedAt()).isNull();
        assertThat(entity.getTimerRunningSince()).isNull();
        assertThat(entity.getTimerAccumulatedSeconds()).isBetween(100, 110);
    }

    @Test
    void reopen_pausedClock_unchanged() throws Exception {
        final Long gameId = createGame();
        startClock(gameId, null);
        rewindRunningSince(gameId, 60);
        final int accumulated = pauseClock(gameId);

        mvc.perform(post("/api/games/" + gameId + "/end")).andExpect(status().isOk());
        mvc.perform(post("/api/games/" + gameId + "/reopen")).andExpect(status().isOk());

        final GameEntity entity = gameRepository.findById(gameId).orElseThrow();
        assertThat(entity.getEndedAt()).isNull();
        assertThat(entity.getTimerRunningSince()).isNull();
        assertThat(entity.getTimerAccumulatedSeconds()).isEqualTo(accumulated);
    }

    @Test
    void reopen_neverTouchesTimerStartedAt() throws Exception {
        final Long gameId = createGame();
        startClock(gameId, null);
        final Instant startedAt = gameRepository.findById(gameId).orElseThrow().getTimerStartedAt();
        rewindRunningSince(gameId, 3700);
        endGameAt(gameId, 3600);

        mvc.perform(post("/api/games/" + gameId + "/reopen")).andExpect(status().isOk());

        assertThat(gameRepository.findById(gameId).orElseThrow().getTimerStartedAt()).isEqualTo(startedAt);
    }

    @Test
    void reopen_regressionGuard_gameWithoutClock_behavesAsBefore() throws Exception {
        final Long gameId = createGame();

        mvc.perform(post("/api/games/" + gameId + "/end")).andExpect(status().isOk());
        mvc.perform(post("/api/games/" + gameId + "/reopen")).andExpect(status().isOk());

        final GameEntity entity = gameRepository.findById(gameId).orElseThrow();
        assertThat(entity.getEndedAt()).isNull();
        assertThat(entity.getTimerRunningSince()).isNull();
        assertThat(entity.getTimerAccumulatedSeconds()).isZero();
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

    /** Setzt {@code endedAt} in die Vergangenheit, um ein beendetes Spiel zu simulieren. */
    private void endGameAt(final Long gameId, final long secondsAgo) {
        final GameEntity entity = gameRepository.findById(gameId).orElseThrow();
        entity.setEndedAt(Instant.now().minusSeconds(secondsAgo));
        gameRepository.save(entity);
    }
}
