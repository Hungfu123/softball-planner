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

    @Test
    void sac_fly_marks_at_bat_with_rbi() throws Exception {
        var ctx = createLiveBogen();
        // Slot1 doubles → on 2B
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1, "result", "DOUBLE",
                "baseStateAfter", Map.of("secondSlotId", ctx.awaySlot1)))))
            .andExpect(status().isCreated());

        // Steal 3rd
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/stealing-events").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1,
                "type", "STOLEN_BASE", "fromBase", 2, "toBase", 3))))
            .andExpect(status().isCreated());

        // Slot2 sac fly: result=OUT, outType=FLY, sacrificeType=FLY, runsScored=1, rbi=1
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot2, "inning", 1,
                "result", "OUT", "outType", "FLY", "sacrificeType", "FLY",
                "fielderChain", List.of(8),
                "runsScored", 1, "rbi", 1,
                "baseStateAfter", Map.of()))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.sacrificeType").value("FLY"))
            .andExpect(jsonPath("$.rbi").value(1));
    }

    @Test
    void sac_bunt_marks_at_bat_correctly() throws Exception {
        var ctx = createLiveBogen();
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1, "inning", 1, "result", "WALK",
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot1)))))
            .andExpect(status().isCreated());

        mvc.perform(post("/api/spielbogen/" + ctx.bogenId + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot2, "inning", 1,
                "result", "OUT", "outType", "GROUNDER", "sacrificeType", "BUNT",
                "fielderChain", List.of(1, 3),
                "baseStateAfter", Map.of("secondSlotId", ctx.awaySlot1)))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.sacrificeType").value("BUNT"));
    }

    @Test
    void three_strikeouts_auto_switch_side() throws Exception {
        var ctx = createLiveBogen();
        for (int i = 0; i < 3; i++) {
            Long slotId = (i % 2 == 0) ? ctx.awaySlot1() : ctx.awaySlot2();
            mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                    "side", "AWAY", "slotId", slotId, "inning", 1, "result", "STRIKEOUT"))))
                .andExpect(status().isCreated());
        }
        mvc.perform(get("/api/spielbogen/" + ctx.bogenId()))
            .andExpect(jsonPath("$.currentSide").value("HOME"));
    }

    @Test
    void caught_stealing_as_third_out_auto_switches() throws Exception {
        var ctx = createLiveBogen();
        // 2 strikeouts
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                    "side", "AWAY", "slotId", ctx.awaySlot1(), "inning", 1, "result", "STRIKEOUT"))))
                .andExpect(status().isCreated());
        }
        // Walk
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot2(), "inning", 1, "result", "WALK",
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot2())))))
            .andExpect(status().isCreated());
        // CS
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/stealing-events").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot2(), "inning", 1,
                "type", "CAUGHT_STEALING", "fromBase", 1, "toBase", 2))))
            .andExpect(status().isCreated());

        mvc.perform(get("/api/spielbogen/" + ctx.bogenId()))
            .andExpect(jsonPath("$.currentSide").value("HOME"));
    }

    @Test
    void double_play_ends_inning_and_auto_switches() throws Exception {
        var ctx = createLiveBogen();
        // SO
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1(), "inning", 1, "result", "STRIKEOUT"))))
            .andExpect(status().isCreated());
        // Single → on 1B
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot2(), "inning", 1, "result", "SINGLE",
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot2())))))
            .andExpect(status().isCreated());
        // DP — 2 more outs, total 3, end inning
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1(), "inning", 1,
                "result", "OUT", "outType", "DOUBLE_PLAY",
                "fielderChain", List.of(6, 4, 3),
                "baseStateAfter", Map.of()))))
            .andExpect(status().isCreated());
        mvc.perform(get("/api/spielbogen/" + ctx.bogenId()))
            .andExpect(jsonPath("$.currentSide").value("HOME"));
    }
    @Test
    void automatic_out_counts_as_out_but_leaves_runners_untouched() throws Exception {
        var ctx = createLiveBogen();
        // Slot1 walks → on 1B
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1(), "inning", 1, "result", "WALK",
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot1())))))
            .andExpect(status().isCreated());

        // Slot2 fehlt → automatisches Out, Runner bleibt auf 1B
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot2(), "inning", 1, "result", "AUTOMATIC_OUT",
                "baseStateAfter", Map.of("firstSlotId", ctx.awaySlot1())))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.result").value("AUTOMATIC_OUT"))
            .andExpect(jsonPath("$.baseStateAfter.firstSlotId").value(ctx.awaySlot1()));

        // Kein Side-Switch bei 1 Out
        mvc.perform(get("/api/spielbogen/" + ctx.bogenId()))
            .andExpect(jsonPath("$.currentSide").value("AWAY"));
    }

    @Test
    void three_automatic_outs_end_inning_and_auto_switch() throws Exception {
        var ctx = createLiveBogen();
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                    "side", "AWAY", "slotId", ctx.awaySlot1(), "inning", 1, "result", "AUTOMATIC_OUT"))))
                .andExpect(status().isCreated());
        }
        mvc.perform(get("/api/spielbogen/" + ctx.bogenId()))
            .andExpect(jsonPath("$.currentSide").value("HOME"));
    }

    @Test
    void undo_removes_automatic_out_via_standard_at_bat_path() throws Exception {
        var ctx = createLiveBogen();
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1(), "inning", 1, "result", "AUTOMATIC_OUT"))))
            .andExpect(status().isCreated());

        mvc.perform(delete("/api/spielbogen/" + ctx.bogenId() + "/at-bats/last").param("side", "AWAY"))
            .andExpect(status().isNoContent());

        mvc.perform(get("/api/spielbogen/" + ctx.bogenId() + "/at-bats").param("side", "AWAY"))
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void automatic_out_rejects_batting_details() throws Exception {
        var ctx = createLiveBogen();
        // RBI ist unmöglich — es hat niemand geschlagen
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1(), "inning", 1, "result", "AUTOMATIC_OUT",
                "runsScored", 1, "rbi", 1))))
            .andExpect(status().isBadRequest());

        // outType gehört zu einem gefielderten Out
        mvc.perform(post("/api/spielbogen/" + ctx.bogenId() + "/at-bats").contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of(
                "side", "AWAY", "slotId", ctx.awaySlot1(), "inning", 1, "result", "AUTOMATIC_OUT",
                "outType", "GROUNDER"))))
            .andExpect(status().isBadRequest());
    }
}
