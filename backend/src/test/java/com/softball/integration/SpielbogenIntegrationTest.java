package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class SpielbogenIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private SpringSpielbogenRepository spielbogenRepository;

    @AfterEach
    void tearDown() {
        spielbogenRepository.deleteAll();
    }

    @Test
    void fullLifecycle_createDraftSetLineupStartEnd() throws Exception {
        var createBody = Map.of(
            "date", "2026-04-30",
            "location", "Krefeld",
            "homeTeamName", "Wuppertal Hilbillies",
            "awayTeamName", "Cologne Cardinals"
        );

        var response = mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("DRAFT"))
            .andExpect(jsonPath("$.currentSide").value("AWAY"))
            .andExpect(jsonPath("$.currentInning").value(1))
            .andReturn();

        Long bogenId = json.readTree(response.getResponse().getContentAsString()).get("id").asLong();

        var homeLineup = Map.of(
            "side", "HOME",
            "slots", buildSlots(9)
        );
        mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(homeLineup)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(9));

        var awayLineup = Map.of(
            "side", "AWAY",
            "slots", buildSlots(9)
        );
        mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(awayLineup)))
            .andExpect(status().isOk());

        mvc.perform(post("/api/spielbogen/" + bogenId + "/start"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("LIVE"));

        mvc.perform(post("/api/spielbogen/" + bogenId + "/end")
                .contentType(APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("DONE"))
            .andExpect(jsonPath("$.endedAt").exists());
    }

    @Test
    void startRejectsIfLineupTooShort() throws Exception {
        var createBody = Map.of(
            "date", "2026-04-30",
            "homeTeamName", "Team A",
            "awayTeamName", "Team B"
        );
        var response = mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andReturn();
        Long bogenId = json.readTree(response.getResponse().getContentAsString()).get("id").asLong();

        var shortLineup = Map.of(
            "side", "HOME",
            "slots", buildSlots(9)
        );
        mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(shortLineup)))
            .andExpect(status().isOk());

        mvc.perform(post("/api/spielbogen/" + bogenId + "/start"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void deleteCascadesSlots() throws Exception {
        var createBody = Map.of(
            "date", "2026-04-30",
            "homeTeamName", "X", "awayTeamName", "Y"
        );
        var response = mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andReturn();
        Long bogenId = json.readTree(response.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("side", "HOME", "slots", buildSlots(9)))))
            .andExpect(status().isOk());

        mvc.perform(delete("/api/spielbogen/" + bogenId))
            .andExpect(status().isNoContent());

        mvc.perform(get("/api/spielbogen/" + bogenId))
            .andExpect(status().isNotFound());
    }

    @Test
    void rejectsSameTeamNames() throws Exception {
        var body = Map.of(
            "date", "2026-04-30",
            "homeTeamName", "Same Name",
            "awayTeamName", "Same Name"
        );
        mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void endWithScoreOverride() throws Exception {
        var createBody = Map.of(
            "date", "2026-04-30",
            "homeTeamName", "X", "awayTeamName", "Y"
        );
        var response = mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andReturn();
        Long bogenId = json.readTree(response.getResponse().getContentAsString()).get("id").asLong();

        for (String side : List.of("HOME", "AWAY")) {
            mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                    .contentType(APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("side", side, "slots", buildSlots(9)))))
                .andExpect(status().isOk());
        }
        mvc.perform(post("/api/spielbogen/" + bogenId + "/start"))
            .andExpect(status().isOk());

        mvc.perform(post("/api/spielbogen/" + bogenId + "/end")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("homeRuns", 10, "awayRuns", 5))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.homeRuns").value(10))
            .andExpect(jsonPath("$.awayRuns").value(5));
    }

    private List<Map<String, Object>> buildSlots(final int count) {
        var list = new java.util.ArrayList<Map<String, Object>>();
        for (int i = 1; i <= count; i++) {
            list.add(Map.of(
                "slot", i,
                "name", "Spieler " + i,
                "position", String.valueOf(i),
                "battingOrder", i
            ));
        }
        return list;
    }
}
