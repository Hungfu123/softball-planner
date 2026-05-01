package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenAtBatRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenStealingRepository;
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

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class SpielbogenEdgeCasesIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private SpringSpielbogenRepository spielbogenRepository;
    @Autowired private SpringSpielbogenAtBatRepository atBatRepository;
    @Autowired private SpringSpielbogenStealingRepository stealingRepository;

    @AfterEach
    void tearDown() {
        stealingRepository.deleteAll();
        atBatRepository.deleteAll();
        spielbogenRepository.deleteAll();
    }

    private record BogenContext(Long bogenId, Long homeSlot1, Long homeSlot2, Long awaySlot1, Long awaySlot2) {}

    private List<Map<String, Object>> buildSlots(final int count) {
        var list = new ArrayList<Map<String, Object>>();
        for (int i = 1; i <= count; i++) {
            list.add(Map.of("slot", i, "name", "Spieler " + i, "position", String.valueOf(i), "battingOrder", i));
        }
        return list;
    }

    private BogenContext createLiveBogen() throws Exception {
        var createBody = Map.of("date", "2026-04-30", "homeTeamName", "Heim", "awayTeamName", "Gast");
        var resp = mvc.perform(post("/api/spielbogen").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(createBody)))
            .andExpect(status().isCreated()).andReturn();
        Long bogenId = json.readTree(resp.getResponse().getContentAsString()).get("id").asLong();

        for (var side : List.of("HOME", "AWAY")) {
            mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("side", side, "slots", buildSlots(9)))))
                .andExpect(status().isOk());
        }
        mvc.perform(post("/api/spielbogen/" + bogenId + "/start")).andExpect(status().isOk());

        var sheet = mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet")).andReturn();
        var node = json.readTree(sheet.getResponse().getContentAsString());
        var home = node.get("homeLineup");
        var away = node.get("awayLineup");
        return new BogenContext(bogenId,
            home.get(0).get("id").asLong(), home.get(1).get("id").asLong(),
            away.get(0).get("id").asLong(), away.get(1).get("id").asLong());
    }

    @Test
    void fielders_choice_records_batter_safe_on_first_runner_out() throws Exception {
        var ctx = createLiveBogen();

        // First batter (away slot 1) singles → on 1B
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1, "result", "SINGLE",
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot1)))))
            .andExpect(status().isCreated());

        // Second batter (away slot 2) FC: result=OUT, outType=FIELDERS_CHOICE chain=[6,4],
        // batter ends up on 1B, runner from 1B was force-out at 2B
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot2, "inning", 1,
                "result", "OUT", "outType", "FIELDERS_CHOICE",
                "fielderChain", List.of(6, 4),
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot2)))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.outType").value("FIELDERS_CHOICE"))
            .andExpect(jsonPath("$.baseStateAfter.firstSlotId").value(ctx.awaySlot2));
    }

    @Test
    void wild_pitch_advances_runner_without_sb_credit() throws Exception {
        var ctx = createLiveBogen();
        // Slot1 walks → on 1B
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1, "result", "WALK",
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot1)))))
            .andExpect(status().isCreated());

        // Wild Pitch: runner advances 1B → 2B
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/stealing-events").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1,
                "type", "WILD_PITCH", "fromBase", 1, "toBase", 2))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.type").value("WILD_PITCH"))
            .andExpect(jsonPath("$.toBase").value(2));
    }

    @Test
    void passed_ball_advances_runner_two_bases() throws Exception {
        var ctx = createLiveBogen();
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1, "result", "WALK",
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot1)))))
            .andExpect(status().isCreated());

        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/stealing-events").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1,
                "type", "PASSED_BALL", "fromBase", 1, "toBase", 3))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.type").value("PASSED_BALL"));
    }
}
