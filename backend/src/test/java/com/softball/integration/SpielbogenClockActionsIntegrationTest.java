package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.dto.StartClockRequest;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
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
 * Integrationstests fuer die vier Uhr-Endpunkte des Spielbogens (Task 3), spiegelbildlich zu
 * {@link GameClockActionsIntegrationTest}. Zeit-Spruenge zwischen den HTTP-Aufrufen werden ueber
 * direkte Manipulation von {@code timer_running_since} simuliert — deterministisch statt
 * {@code Thread.sleep}. Eigene Wegwerf-Boegen — id 1 und 143 werden nicht beruehrt.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class SpielbogenClockActionsIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private SpringSpielbogenRepository spielbogenRepository;

    @AfterEach
    void tearDown() {
        spielbogenRepository.deleteAll();
    }

    @Test
    void start_setsRunningSinceAndLimit_secondStartRejected() throws Exception {
        final Long bogenId = createBogen();

        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new StartClockRequest(50))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.started").value(true))
            .andExpect(jsonPath("$.running").value(true))
            .andExpect(jsonPath("$.limitMinutes").value(50))
            .andExpect(jsonPath("$.elapsedSeconds").value(0));

        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new StartClockRequest(90))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void pause_banksElapsed_andClearsRunningSince_secondPauseRejected() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, 50);
        rewindRunningSince(bogenId, 125);

        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/pause"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.running").value(false))
            .andExpect(jsonPath("$.started").value(true))
            .andExpect(jsonPath("$.elapsedSeconds", greaterThanOrEqualTo(125)))
            .andExpect(jsonPath("$.elapsedSeconds", lessThan(135)));

        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/pause"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void resume_continuesWithoutLosingAccumulated_resumeWithoutStartRejected() throws Exception {
        final Long freshBogenId = createBogen();
        mvc.perform(post("/api/spielbogen/" + freshBogenId + "/clock/resume"))
            .andExpect(status().isBadRequest());

        final Long bogenId = createBogen();
        startClock(bogenId, null);
        rewindRunningSince(bogenId, 60);
        final int afterFirstPause = pauseClock(bogenId);
        assertThat(afterFirstPause).isBetween(60, 65);

        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/resume"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.running").value(true))
            .andExpect(jsonPath("$.elapsedSeconds", greaterThanOrEqualTo(afterFirstPause)))
            .andExpect(jsonPath("$.elapsedSeconds", lessThan(afterFirstPause + 5)));

        // Resume waehrend die Uhr schon laeuft wird abgelehnt.
        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/resume"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void startPauseResumePause_sumsAcrossCycles() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, null);
        rewindRunningSince(bogenId, 100);
        final int first = pauseClock(bogenId);
        assertThat(first).isBetween(100, 105);

        resumeClock(bogenId);
        rewindRunningSince(bogenId, 50);
        final int second = pauseClock(bogenId);
        assertThat(second).isBetween(first + 50, first + 55);
    }

    @Test
    void reset_clearsTimeButKeepsLimit() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, 90);
        rewindRunningSince(bogenId, 200);
        pauseClock(bogenId);

        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/reset"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.started").value(false))
            .andExpect(jsonPath("$.running").value(false))
            .andExpect(jsonPath("$.elapsedSeconds").value(0))
            .andExpect(jsonPath("$.limitMinutes").value(90));
    }

    @Test
    void sheet_regressionGuard_neverStartedClockReportsZero_andKeepsExistingFields() throws Exception {
        final Long bogenId = createBogen();

        mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.meta.id").value(bogenId))
            .andExpect(jsonPath("$.homeTotals").exists())
            .andExpect(jsonPath("$.awayTotals").exists())
            .andExpect(jsonPath("$.clock.started").value(false))
            .andExpect(jsonPath("$.clock.running").value(false))
            .andExpect(jsonPath("$.clock.elapsedSeconds").value(0));
    }

    @Test
    void sheet_carriesElapsedSeconds_whileClockRunning() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, 50);
        rewindRunningSince(bogenId, 42);

        mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.clock.running").value(true))
            .andExpect(jsonPath("$.clock.elapsedSeconds", greaterThanOrEqualTo(42)))
            .andExpect(jsonPath("$.clock.elapsedSeconds", lessThan(50)))
            .andExpect(jsonPath("$.clock.limitMinutes").value(50));
    }

    // ===== Helpers =====

    private Long createBogen() throws Exception {
        final var createBody = Map.of(
            "date", "2026-08-10",
            "homeTeamName", "Dead Sox",
            "awayTeamName", "Uhr-Test-Gegner"
        );
        final MvcResult created = mvc.perform(post("/api/spielbogen")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andExpect(status().isCreated())
            .andReturn();
        return json.readTree(created.getResponse().getContentAsString()).get("id").asLong();
    }

    private void startClock(final Long bogenId, final Integer limitMinutes) throws Exception {
        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new StartClockRequest(limitMinutes))))
            .andExpect(status().isOk());
    }

    private int pauseClock(final Long bogenId) throws Exception {
        final MvcResult result = mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/pause"))
            .andExpect(status().isOk())
            .andReturn();
        return json.readTree(result.getResponse().getContentAsString()).get("elapsedSeconds").asInt();
    }

    private void resumeClock(final Long bogenId) throws Exception {
        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/resume"))
            .andExpect(status().isOk());
    }

    /** Versetzt {@code timer_running_since} in die Vergangenheit, um Zeitablauf zu simulieren. */
    private void rewindRunningSince(final Long bogenId, final long seconds) {
        final SpielbogenEntity entity = spielbogenRepository.findById(bogenId).orElseThrow();
        entity.setTimerRunningSince(Instant.now().minusSeconds(seconds));
        spielbogenRepository.save(entity);
    }
}
