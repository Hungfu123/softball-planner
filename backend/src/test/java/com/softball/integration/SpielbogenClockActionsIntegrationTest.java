package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.dto.StartClockRequest;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.domain.model.BogenStatus;
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

    // Task 7: timerStartedAt ist der Wanduhr-Wert fuers "Zeit:"-Feld im PDF-Export — anders als
    // timerRunningSince darf er einen Limit-Wechsel bei bereits pausierter Uhr (Task-3-Design)
    // nicht mitmachen, sonst zeigt das RFL-Blatt eine falsche Anfangszeit.
    @Test
    void start_setsTimerStartedAt_onlyOnFirstStart_restartAfterPauseKeepsIt() throws Exception {
        final Long bogenId = createBogen();

        startClock(bogenId, 50);
        final Instant firstStartedAt = spielbogenRepository.findById(bogenId).orElseThrow().getTimerStartedAt();
        assertThat(firstStartedAt).isNotNull();

        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/pause")).andExpect(status().isOk());
        startClock(bogenId, 90); // Limit-Aenderung an pausierter Uhr, s. Task-3-Design

        final SpielbogenEntity entity = spielbogenRepository.findById(bogenId).orElseThrow();
        assertThat(entity.getTimerStartedAt()).isEqualTo(firstStartedAt);
        assertThat(entity.getTimeLimitMinutes()).isEqualTo(90);
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

    // Regression fuer Fix-Runde 1: die Uhr eines beendeten Bogens darf beim Pausieren nicht die
    // Zeit seit Spielende mitzaehlen — sie muss an endedAt einfrieren, exakt wie beim Lesepfad
    // (GameClockCalculator.compute). Ohne den Deckel wuerde bankElapsed "jetzt - runningSince"
    // buchen, also die volle Stunde seit Spielende statt der 100s bis zum Spielende.
    @Test
    void pause_afterBogenEnded_banksElapsedOnlyUntilEndedAt_notUntilNow() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, null);
        rewindRunningSince(bogenId, 3700); // Uhr laeuft seit 3700s
        endBogenAt(bogenId, 3600); // Bogen endete vor 3600s -> 100s liefen bis dahin

        final int elapsed = pauseClock(bogenId);
        assertThat(elapsed).isBetween(100, 105);
        assertThat(elapsed).isLessThan(3700);
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
    void resume_neverTouchesTimerStartedAt() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, null);
        final Instant startedAt = spielbogenRepository.findById(bogenId).orElseThrow().getTimerStartedAt();
        rewindRunningSince(bogenId, 60);
        pauseClock(bogenId);

        resumeClock(bogenId);

        assertThat(spielbogenRepository.findById(bogenId).orElseThrow().getTimerStartedAt()).isEqualTo(startedAt);
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
    void reset_clearsTimerStartedAt() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, 90);
        assertThat(spielbogenRepository.findById(bogenId).orElseThrow().getTimerStartedAt()).isNotNull();

        mvc.perform(post("/api/spielbogen/" + bogenId + "/clock/reset")).andExpect(status().isOk());

        assertThat(spielbogenRepository.findById(bogenId).orElseThrow().getTimerStartedAt()).isNull();
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

    // Dauer-Schätzung ohne Limit — Verdrahtung im Sheet-Endpunkt. Die eigentliche Formel ist in
    // GameDurationEstimatorTest erschöpfend geprüft; hier geht es nur darum, dass Inning + Seite
    // aus dem Bogen korrekt hinein- und die Schätzung korrekt hinausfließt.
    @Test
    void sheet_noEstimate_belowThreeCompletedHalfInnings() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, null);
        rewindRunningSince(bogenId, 100);
        setInningAndSide(bogenId, 1, "AWAY"); // 0 abgeschlossene Halbinnings

        mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.clock.durationEstimate").doesNotExist());
    }

    @Test
    void sheet_noEstimate_whenLimitSet() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, 90);
        rewindRunningSince(bogenId, 3600);
        setInningAndSide(bogenId, 4, "HOME"); // 7 abgeschlossene Halbinnings — genug, aber Limit gesetzt

        mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.clock.durationEstimate").doesNotExist());
    }

    @Test
    void sheet_noEstimate_afterBogenEnded() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, null);
        rewindRunningSince(bogenId, 3600);
        setInningAndSide(bogenId, 4, "HOME");
        endBogenAt(bogenId, 60);

        mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.clock.durationEstimate").doesNotExist());
    }

    // Bottom des 4. -> 7 abgeschlossene Halbinnings (siehe GameDurationEstimator.completedHalfInnings).
    // 3600s gelaufen -> Tempo ~514s/HI -> Gesamt ~120min. Grobe Grenzen statt exaktem Wert, weil
    // zwischen rewindRunningSince und dem GET ein paar echte Sekunden vergehen.
    @Test
    void sheet_estimatesDuration_afterThreeCompletedHalfInnings() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, null);
        rewindRunningSince(bogenId, 3600);
        setInningAndSide(bogenId, 4, "HOME");

        mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.clock.durationEstimate.completedHalfInnings").value(7))
            .andExpect(jsonPath("$.clock.durationEstimate.totalMinutes", greaterThanOrEqualTo(119)))
            .andExpect(jsonPath("$.clock.durationEstimate.totalMinutes", lessThan(122)));
    }

    // Task 4: Wiederoeffnen ist der einzige Schreibvorgang vom Spielablauf in die Uhr — reopen
    // nullt endedAt und muss die laufende Uhr davor pausieren+deckeln. Ohne den Fix bliebe
    // timerRunningSince gesetzt (>3700s alt) und die naechste Ableitung wuerde "jetzt -
    // runningSince" zaehlen statt der 100s bis zum Bogen-Ende — genau der Sprung aus dem Ticket
    // (93 Minuten -> vierzehn Stunden).
    @Test
    void reopen_runningClock_pausesWithElapsedCappedAtBogenEnd_notJumpingToNow() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, null);
        rewindRunningSince(bogenId, 3700); // Uhr laeuft seit 3700s
        markBogenDone(bogenId, 3600); // Bogen endete vor 3600s -> nur 100s liefen bis dahin

        mvc.perform(post("/api/spielbogen/" + bogenId + "/reopen"))
            .andExpect(status().isOk());

        final SpielbogenEntity entity = spielbogenRepository.findById(bogenId).orElseThrow();
        assertThat(entity.getEndedAt()).isNull();
        assertThat(entity.getTimerRunningSince()).isNull();
        assertThat(entity.getTimerAccumulatedSeconds()).isBetween(100, 110);
    }

    @Test
    void reopen_pausedClock_unchanged() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, null);
        rewindRunningSince(bogenId, 60);
        final int accumulated = pauseClock(bogenId);
        markBogenDone(bogenId, 0);

        mvc.perform(post("/api/spielbogen/" + bogenId + "/reopen")).andExpect(status().isOk());

        final SpielbogenEntity entity = spielbogenRepository.findById(bogenId).orElseThrow();
        assertThat(entity.getEndedAt()).isNull();
        assertThat(entity.getTimerRunningSince()).isNull();
        assertThat(entity.getTimerAccumulatedSeconds()).isEqualTo(accumulated);
    }

    @Test
    void reopen_neverTouchesTimerStartedAt() throws Exception {
        final Long bogenId = createBogen();
        startClock(bogenId, null);
        final Instant startedAt = spielbogenRepository.findById(bogenId).orElseThrow().getTimerStartedAt();
        rewindRunningSince(bogenId, 3700);
        markBogenDone(bogenId, 3600);

        mvc.perform(post("/api/spielbogen/" + bogenId + "/reopen")).andExpect(status().isOk());

        assertThat(spielbogenRepository.findById(bogenId).orElseThrow().getTimerStartedAt()).isEqualTo(startedAt);
    }

    @Test
    void reopen_regressionGuard_bogenWithoutClock_behavesAsBefore() throws Exception {
        final Long bogenId = createBogen();
        markBogenDone(bogenId, 0);

        mvc.perform(post("/api/spielbogen/" + bogenId + "/reopen")).andExpect(status().isOk());

        final SpielbogenEntity entity = spielbogenRepository.findById(bogenId).orElseThrow();
        assertThat(entity.getEndedAt()).isNull();
        assertThat(entity.getTimerRunningSince()).isNull();
        assertThat(entity.getTimerAccumulatedSeconds()).isZero();
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

    /** Setzt Inning + Seite direkt, ohne den echten Scoring-Flow durchzuspielen. */
    private void setInningAndSide(final Long bogenId, final int inning, final String side) {
        final SpielbogenEntity entity = spielbogenRepository.findById(bogenId).orElseThrow();
        entity.setCurrentInning(inning);
        entity.setCurrentSide(side);
        spielbogenRepository.save(entity);
    }

    /** Setzt {@code endedAt} in die Vergangenheit, um einen beendeten Bogen zu simulieren. */
    private void endBogenAt(final Long bogenId, final long secondsAgo) {
        final SpielbogenEntity entity = spielbogenRepository.findById(bogenId).orElseThrow();
        entity.setEndedAt(Instant.now().minusSeconds(secondsAgo));
        spielbogenRepository.save(entity);
    }

    /** Setzt Status DONE + {@code endedAt} in die Vergangenheit — Kurzschluss fuer reopen-Tests
     *  ohne den echten LIVE/end-Flow (der ein vollstaendiges 9-Spieler-Lineup pro Seite braeuchte),
     *  analog zu {@link #endBogenAt}. */
    private void markBogenDone(final Long bogenId, final long secondsAgo) {
        final SpielbogenEntity entity = spielbogenRepository.findById(bogenId).orElseThrow();
        entity.setStatus(BogenStatus.DONE.name());
        entity.setEndedAt(Instant.now().minusSeconds(secondsAgo));
        spielbogenRepository.save(entity);
    }
}
