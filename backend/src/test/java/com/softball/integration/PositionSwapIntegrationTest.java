package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenPositionChangeRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser(roles = "SUPERADMIN")
class PositionSwapIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private SpringSpielbogenRepository bogenRepo;
    @Autowired private SpringSpielbogenSlotRepository slotRepo;
    @Autowired private SpringSpielbogenPositionChangeRepository changeRepo;

    @AfterEach
    void tearDown() {
        changeRepo.deleteAll();
        bogenRepo.deleteAll();
    }

    private List<Map<String, Object>> buildSlots(final int count) {
        var list = new ArrayList<Map<String, Object>>();
        for (int i = 1; i <= count; i++) {
            list.add(Map.of("slot", i, "name", "Spieler " + i, "position", String.valueOf(i), "battingOrder", i));
        }
        return list;
    }

    private record BogenCtx(Long bogenId, Long homeSlotPId, Long homeSlotCId) {}

    /**
     * Creates a LIVE Spielbogen via the API, sets 9-slot lineups for both sides,
     * starts the game, and returns the bogenId plus the first two HOME slot IDs.
     */
    private BogenCtx createLiveBogen() throws Exception {
        var createBody = Map.of("date", "2026-05-07", "homeTeamName", "Dead Sox", "awayTeamName", "Rivals");
        var createResp = mvc.perform(post("/api/spielbogen")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andExpect(status().isCreated())
            .andReturn();

        Long bogenId = json.readTree(createResp.getResponse().getContentAsString()).get("id").asLong();

        for (var side : List.of("HOME", "AWAY")) {
            mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup")
                    .contentType(APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("side", side, "slots", buildSlots(9)))))
                .andExpect(status().isOk());
        }

        mvc.perform(post("/api/spielbogen/" + bogenId + "/start"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("LIVE"));

        var sheetResp = mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andExpect(status().isOk())
            .andReturn();
        var sheetNode = json.readTree(sheetResp.getResponse().getContentAsString());
        var homeLineup = sheetNode.get("homeLineup");

        Long slot1Id = homeLineup.get(0).get("id").asLong();
        Long slot2Id = homeLineup.get(1).get("id").asLong();

        return new BogenCtx(bogenId, slot1Id, slot2Id);
    }

    @Test
    void postPositionSwap_persistsChangesAndUpdatesSlots() throws Exception {
        var ctx = createLiveBogen();
        Long bogenId = ctx.bogenId();
        Long slot1Id = ctx.homeSlotPId();
        Long slot2Id = ctx.homeSlotCId();

        // Capture original positions from the sheet
        var sheetResp = mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet")).andReturn();
        var homeLineup = json.readTree(sheetResp.getResponse().getContentAsString()).get("homeLineup");
        String originalPos1 = homeLineup.get(0).get("position").asText();
        String originalPos2 = homeLineup.get(1).get("position").asText();

        // Build swap request: slot1 gets slot2's position and vice versa
        var swapRequest = Map.of(
            "side", "HOME",
            "inning", 2,
            "changes", List.of(
                Map.of("slotId", slot1Id, "newPosition", originalPos2),
                Map.of("slotId", slot2Id, "newPosition", originalPos1)
            )
        );

        // POST /api/spielbogen/{bogenId}/position-swaps → 201 with 2 records
        mvc.perform(post("/api/spielbogen/" + bogenId + "/position-swaps")
                .contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(swapRequest)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].inning").value(2))
            .andExpect(jsonPath("$[0].side").value("HOME"))
            .andExpect(jsonPath("$[1].inning").value(2));

        // Verify two persisted change records
        var changes = changeRepo.findByBogen_IdOrderByInningAscIdAsc(bogenId);
        assertThat(changes).hasSize(2);

        // Both records must share the same groupId
        String groupId = changes.get(0).getGroupId();
        assertThat(groupId).isNotBlank();
        assertThat(changes.get(1).getGroupId()).isEqualTo(groupId);

        // Verify the slot positions were updated
        var updatedSlot1 = slotRepo.findById(slot1Id).orElseThrow();
        var updatedSlot2 = slotRepo.findById(slot2Id).orElseThrow();
        assertThat(updatedSlot1.getPosition()).isEqualTo(originalPos2);
        assertThat(updatedSlot2.getPosition()).isEqualTo(originalPos1);
    }
}
