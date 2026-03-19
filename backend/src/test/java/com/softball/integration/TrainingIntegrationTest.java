package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.repository.*;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class TrainingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SpringPlayerRepository playerRepository;

    @Autowired
    private SpringTrainingRepository trainingRepository;

    @Autowired
    private SpringTrainingAttendanceRepository trainingAttendanceRepository;

    private PlayerEntity regularPlayer;
    private PlayerEntity nonRegularPlayer;

    @BeforeEach
    void setUp() {
        regularPlayer = new PlayerEntity("Max");
        regularPlayer.setRegular(true);
        regularPlayer = playerRepository.save(regularPlayer);

        nonRegularPlayer = new PlayerEntity("Lisa");
        nonRegularPlayer.setRegular(false);
        nonRegularPlayer = playerRepository.save(nonRegularPlayer);
    }

    @AfterEach
    void tearDown() {
        trainingAttendanceRepository.deleteAll();
        trainingRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void createTraining_returnsCreated() throws Exception {
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "date", "2026-03-10", "time", "18:00", "location", "Sportplatz"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.date").value("2026-03-10"))
            .andExpect(jsonPath("$.time").value("18:00"))
            .andExpect(jsonPath("$.location").value("Sportplatz"))
            .andExpect(jsonPath("$.cancelled").value(false))
            .andExpect(jsonPath("$.attendeeCount").value(1)); // only regular player auto-filled
    }

    @Test
    void listTrainings_orderedByDateDesc() throws Exception {
        mockMvc.perform(post("/api/trainings")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-01"))));
        mockMvc.perform(post("/api/trainings")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))));

        mockMvc.perform(get("/api/trainings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].date").value("2026-03-15"))
            .andExpect(jsonPath("$[1].date").value("2026-03-01"));
    }

    @Test
    void updateTraining() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "date", "2026-03-10", "time", "18:00", "location", "Sportplatz"))))
            .andReturn();

        final Long trainingId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/trainings/" + trainingId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "date", "2026-03-11", "time", "19:00", "location", "Halle", "cancelled", true))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.date").value("2026-03-11"))
            .andExpect(jsonPath("$.time").value("19:00"))
            .andExpect(jsonPath("$.location").value("Halle"))
            .andExpect(jsonPath("$.cancelled").value(true));
    }

    @Test
    void deleteTraining() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10"))))
            .andReturn();

        final Long trainingId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(delete("/api/trainings/" + trainingId))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/trainings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void deleteTraining_notFound_returns404() throws Exception {
        mockMvc.perform(delete("/api/trainings/99999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void regularPlayers_autoFilledOnCreate() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10"))))
            .andReturn();

        final Long trainingId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/trainings/" + trainingId + "/attendance"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].player.name").value("Max"))
            .andExpect(jsonPath("$[0].present").value(true));
    }

    @Test
    void setAndGetAttendance() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10"))))
            .andReturn();

        final Long trainingId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        // Set attendance for both players
        mockMvc.perform(put("/api/trainings/" + trainingId + "/attendance")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                    Map.of("playerId", regularPlayer.getId(), "present", true),
                    Map.of("playerId", nonRegularPlayer.getId(), "present", false)
                )))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));

        // Verify attendance
        mockMvc.perform(get("/api/trainings/" + trainingId + "/attendance"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void setAttendance_replacesExisting() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10"))))
            .andReturn();

        final Long trainingId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        // Initial: regular player auto-filled as present
        mockMvc.perform(get("/api/trainings/" + trainingId + "/attendance"))
            .andExpect(jsonPath("$.length()").value(1));

        // Replace with only non-regular player
        mockMvc.perform(put("/api/trainings/" + trainingId + "/attendance")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                    Map.of("playerId", nonRegularPlayer.getId(), "present", true)
                )))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].player.name").value("Lisa"))
            .andExpect(jsonPath("$[0].present").value(true));
    }

    @Test
    void stats_excludesCancelledTrainings() throws Exception {
        // Create 2 trainings: one normal, one cancelled
        final MvcResult t1Result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10"))))
            .andReturn();
        final Long training1Id = objectMapper.readTree(t1Result.getResponse().getContentAsString()).get("id").asLong();

        final MvcResult t2Result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-17"))))
            .andReturn();
        final Long training2Id = objectMapper.readTree(t2Result.getResponse().getContentAsString()).get("id").asLong();

        // Set attendance for training 1: both present
        mockMvc.perform(put("/api/trainings/" + training1Id + "/attendance")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                Map.of("playerId", regularPlayer.getId(), "present", true),
                Map.of("playerId", nonRegularPlayer.getId(), "present", true)
            )))));

        // Set attendance for training 2: only regular present
        mockMvc.perform(put("/api/trainings/" + training2Id + "/attendance")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                Map.of("playerId", regularPlayer.getId(), "present", true),
                Map.of("playerId", nonRegularPlayer.getId(), "present", false)
            )))));

        // Cancel training 2
        mockMvc.perform(put("/api/trainings/" + training2Id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-17", "cancelled", true))));

        // Stats should only count training 1 (non-cancelled)
        mockMvc.perform(get("/api/trainings/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[?(@.playerName == 'Max')].attended").value(1))
            .andExpect(jsonPath("$[?(@.playerName == 'Max')].totalTrainings").value(1))
            .andExpect(jsonPath("$[?(@.playerName == 'Max')].regular").value(true))
            .andExpect(jsonPath("$[?(@.playerName == 'Lisa')].attended").value(1))
            .andExpect(jsonPath("$[?(@.playerName == 'Lisa')].totalTrainings").value(1))
            .andExpect(jsonPath("$[?(@.playerName == 'Lisa')].regular").value(false));
    }

    @Test
    void stats_noTrainings_returnsOnlyRegularPlayersWithZeros() throws Exception {
        // Without trainings, only regular players appear in stats
        mockMvc.perform(get("/api/trainings/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].playerName").value("Max"))
            .andExpect(jsonPath("$[0].attended").value(0))
            .andExpect(jsonPath("$[0].totalTrainings").value(0));
    }

    @Test
    void stats_multipleTrainings_correctCounts() throws Exception {
        // Create 3 non-cancelled trainings
        final MvcResult t1 = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-01"))))
            .andReturn();
        final Long id1 = objectMapper.readTree(t1.getResponse().getContentAsString()).get("id").asLong();

        final MvcResult t2 = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-08"))))
            .andReturn();
        final Long id2 = objectMapper.readTree(t2.getResponse().getContentAsString()).get("id").asLong();

        final MvcResult t3 = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();
        final Long id3 = objectMapper.readTree(t3.getResponse().getContentAsString()).get("id").asLong();

        // Training 1: Max present, Lisa present
        mockMvc.perform(put("/api/trainings/" + id1 + "/attendance")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                Map.of("playerId", regularPlayer.getId(), "present", true),
                Map.of("playerId", nonRegularPlayer.getId(), "present", true)
            )))));

        // Training 2: Max present, Lisa absent
        mockMvc.perform(put("/api/trainings/" + id2 + "/attendance")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                Map.of("playerId", regularPlayer.getId(), "present", true),
                Map.of("playerId", nonRegularPlayer.getId(), "present", false)
            )))));

        // Training 3: Max absent, Lisa present
        mockMvc.perform(put("/api/trainings/" + id3 + "/attendance")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                Map.of("playerId", regularPlayer.getId(), "present", false),
                Map.of("playerId", nonRegularPlayer.getId(), "present", true)
            )))));

        mockMvc.perform(get("/api/trainings/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.playerName == 'Max')].attended").value(2))
            .andExpect(jsonPath("$[?(@.playerName == 'Max')].totalTrainings").value(3))
            .andExpect(jsonPath("$[?(@.playerName == 'Lisa')].attended").value(2))
            .andExpect(jsonPath("$[?(@.playerName == 'Lisa')].totalTrainings").value(3));
    }

    @Test
    void stats_untilFilter_excludesFutureTrainings() throws Exception {
        // Create 3 trainings: March 1, March 15, March 30
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-01"))))
            .andExpect(status().isCreated());
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andExpect(status().isCreated());
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-30"))))
            .andExpect(status().isCreated());

        // With until=2026-03-20, only 2 trainings should be counted (March 1, March 15)
        mockMvc.perform(get("/api/trainings/stats").param("until", "2026-03-20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.playerName == 'Max')].totalTrainings").value(2));
    }

    @Test
    void stats_sinceAndUntilTogether() throws Exception {
        // Create 3 trainings: Jan 10, Mar 10, Jun 10
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-01-10"))))
            .andExpect(status().isCreated());
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10"))))
            .andExpect(status().isCreated());
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-06-10"))))
            .andExpect(status().isCreated());

        // With since=2026-02-01 and until=2026-04-01, only March 10 should count
        mockMvc.perform(get("/api/trainings/stats")
                .param("since", "2026-02-01")
                .param("until", "2026-04-01"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.playerName == 'Max')].totalTrainings").value(1));
    }

    @Test
    void playerRegularFlag_updateAndVerify() throws Exception {
        // Verify initial regular flag
        mockMvc.perform(get("/api/players"))
            .andExpect(jsonPath("$[?(@.name == 'Max')].regular").value(true))
            .andExpect(jsonPath("$[?(@.name == 'Lisa')].regular").value(false));

        // Update Lisa to regular
        mockMvc.perform(put("/api/players/" + nonRegularPlayer.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Lisa", "regular", true))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.regular").value(true));

        // New training should now auto-fill both players
        final MvcResult result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-04-01"))))
            .andReturn();

        final Long trainingId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/trainings/" + trainingId + "/attendance"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void createTraining_withOptionalFieldsNull() throws Exception {
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.date").value("2026-03-10"))
            .andExpect(jsonPath("$.time").isEmpty())
            .andExpect(jsonPath("$.location").isEmpty());
    }

    @Test
    void getAttendance_trainingNotFound_returns404() throws Exception {
        mockMvc.perform(get("/api/trainings/99999/attendance"))
            .andExpect(status().isNotFound());
    }

    @Test
    void updateTraining_notFound_returns404() throws Exception {
        mockMvc.perform(put("/api/trainings/99999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10"))))
            .andExpect(status().isNotFound());
    }

    @Test
    void createTraining_missingDate_returns400() throws Exception {
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setAttendance_trainingNotFound_returns404() throws Exception {
        mockMvc.perform(put("/api/trainings/99999/attendance")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                    Map.of("playerId", regularPlayer.getId(), "present", true)
                )))))
            .andExpect(status().isNotFound());
    }

    @Test
    void setAttendance_emptyList_clearsAll() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10"))))
            .andReturn();

        final Long trainingId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        // Auto-filled should have 1 attendance
        mockMvc.perform(get("/api/trainings/" + trainingId + "/attendance"))
            .andExpect(jsonPath("$.length()").value(1));

        // Set empty list
        mockMvc.perform(put("/api/trainings/" + trainingId + "/attendance")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("entries", List.of()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));

        // Verify cleared
        mockMvc.perform(get("/api/trainings/" + trainingId + "/attendance"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void createTraining_upsertKeepsAttendance() throws Exception {
        // Create training
        final MvcResult result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10", "time", "18:00"))))
            .andReturn();
        final Long trainingId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        // Set attendance
        mockMvc.perform(put("/api/trainings/" + trainingId + "/attendance")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                Map.of("playerId", regularPlayer.getId(), "present", true),
                Map.of("playerId", nonRegularPlayer.getId(), "present", true)
            )))));

        // Upsert: create training on same date with different type
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "date", "2026-03-10", "time", "19:00", "type", "PITCHER_CATCHER"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.time").value("19:00"))
            .andExpect(jsonPath("$.type").value("PITCHER_CATCHER"));

        // Attendance should be preserved
        mockMvc.perform(get("/api/trainings/" + trainingId + "/attendance"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void bulkCreate_upsertsExistingTrainings() throws Exception {
        // Create a regular training on a Monday
        mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "date", "2026-03-09", "time", "18:00")))) // Monday
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.type").value("REGULAR"));

        // Set attendance on it
        final MvcResult t = mockMvc.perform(get("/api/trainings"))
            .andReturn();
        final Long existingId = objectMapper.readTree(t.getResponse().getContentAsString()).get(0).get("id").asLong();

        mockMvc.perform(put("/api/trainings/" + existingId + "/attendance")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                Map.of("playerId", regularPlayer.getId(), "present", true),
                Map.of("playerId", nonRegularPlayer.getId(), "present", true)
            )))));

        // Bulk create every Monday as P/C (overlaps with existing 2026-03-09)
        mockMvc.perform(post("/api/trainings/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "weekdays", List.of(1),
                    "startDate", "2026-03-09",
                    "endDate", "2026-03-23",
                    "type", "PITCHER_CATCHER"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.length()").value(3)); // 3 Mondays: 09, 16, 23

        // Existing training should now be P/C
        mockMvc.perform(get("/api/trainings"))
            .andExpect(jsonPath("$[?(@.date == '2026-03-09')].type").value("PITCHER_CATCHER"));

        // Attendance on existing training should be preserved
        mockMvc.perform(get("/api/trainings/" + existingId + "/attendance"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void setAttendance_invalidPlayer_returns404() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-10"))))
            .andReturn();

        final Long trainingId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/trainings/" + trainingId + "/attendance")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("entries", List.of(
                    Map.of("playerId", 99999, "present", true)
                )))))
            .andExpect(status().isNotFound());
    }
}
