package com.softball.integration;

import com.fasterxml.jackson.databind.JsonNode;
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

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser(roles = "SUPERADMIN")
class SpielbogenScoringScenarioTest {

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

    @Test
    void replays_krefeld_cologne_2026_first_inning() throws Exception {
        var fixturePath = Path.of("src/test/resources/fixtures/spielbogen/krefeld-cologne-2026.json");
        var fixture = json.readTree(Files.readString(fixturePath));

        var meta = fixture.get("meta");
        var resp = mvc.perform(post("/api/spielbogen").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                    "date", meta.get("date").asText(),
                    "homeTeamName", meta.get("homeTeamName").asText(),
                    "awayTeamName", meta.get("awayTeamName").asText()))))
            .andExpect(status().isCreated()).andReturn();
        Long bogenId = json.readTree(resp.getResponse().getContentAsString()).get("id").asLong();

        for (var sideName : List.of("HOME", "AWAY")) {
            var lineupKey = sideName.toLowerCase() + "Lineup";
            var lineup = fixture.get(lineupKey);
            var slots = new ArrayList<Map<String, Object>>();
            for (var s : lineup) {
                var slot = new LinkedHashMap<String, Object>();
                slot.put("slot", s.get("slot").asInt());
                slot.put("name", s.get("name").asText());
                slot.put("battingOrder", s.get("battingOrder").asInt());
                slot.put("position", s.get("position").asText());
                slots.add(slot);
            }
            mvc.perform(put("/api/spielbogen/" + bogenId + "/lineup").contentType(APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("side", sideName, "slots", slots))))
                .andExpect(status().isOk());
        }
        mvc.perform(post("/api/spielbogen/" + bogenId + "/start")).andExpect(status().isOk());

        var sheet = json.readTree(mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andReturn().getResponse().getContentAsString());
        long[] homeIds = collectIds(sheet.get("homeLineup"));
        long[] awayIds = collectIds(sheet.get("awayLineup"));

        for (var event : fixture.get("events")) {
            String type = event.get("type").asText();
            String side = event.get("side").asText();
            int slotIdx = event.get("slotIdx").asInt();
            long slotId = side.equals("HOME") ? homeIds[slotIdx] : awayIds[slotIdx];
            if ("atbat".equals(type)) {
                var body = new LinkedHashMap<String, Object>();
                body.put("side", side);
                body.put("slotId", slotId);
                body.put("inning", event.get("inning").asInt());
                body.put("result", event.get("result").asText());
                if (event.has("outType")) body.put("outType", event.get("outType").asText());
                if (event.has("fielderChain")) {
                    var arr = new ArrayList<Integer>();
                    event.get("fielderChain").forEach(n -> arr.add(n.asInt()));
                    body.put("fielderChain", arr);
                }
                if (event.has("runsScored")) body.put("runsScored", event.get("runsScored").asInt());
                if (event.has("rbi")) body.put("rbi", event.get("rbi").asInt());
                if (event.has("baseStateAfter")) {
                    var b = event.get("baseStateAfter");
                    var state = new LinkedHashMap<String, Object>();
                    if (b.has("firstSlotIdx")) state.put("firstSlotId", side.equals("HOME") ? homeIds[b.get("firstSlotIdx").asInt()] : awayIds[b.get("firstSlotIdx").asInt()]);
                    if (b.has("secondSlotIdx")) state.put("secondSlotId", side.equals("HOME") ? homeIds[b.get("secondSlotIdx").asInt()] : awayIds[b.get("secondSlotIdx").asInt()]);
                    if (b.has("thirdSlotIdx")) state.put("thirdSlotId", side.equals("HOME") ? homeIds[b.get("thirdSlotIdx").asInt()] : awayIds[b.get("thirdSlotIdx").asInt()]);
                    body.put("baseStateAfter", state);
                }
                mvc.perform(post("/api/spielbogen/" + bogenId + "/at-bats").contentType(APPLICATION_JSON)
                    .content(json.writeValueAsString(body))).andExpect(status().isCreated());
            } else if ("steal".equals(type)) {
                var body = new LinkedHashMap<String, Object>();
                body.put("side", side);
                body.put("slotId", slotId);
                body.put("inning", event.get("inning").asInt());
                body.put("type", event.get("stealType").asText());
                body.put("fromBase", event.get("fromBase").asInt());
                body.put("toBase", event.get("toBase").asInt());
                mvc.perform(post("/api/spielbogen/" + bogenId + "/stealing-events").contentType(APPLICATION_JSON)
                    .content(json.writeValueAsString(body))).andExpect(status().isCreated());
            }
        }

        var finalSheet = json.readTree(mvc.perform(get("/api/spielbogen/" + bogenId + "/sheet"))
            .andReturn().getResponse().getContentAsString());
        var expected = fixture.get("expectedFinal");
        int actualRuns = finalSheet.get("inningRuns").get("1").get("away").asInt();
        int expectedRuns = expected.get("awayInningRuns").get("1").asInt();
        org.assertj.core.api.Assertions.assertThat(actualRuns).isEqualTo(expectedRuns);
        int actualAbs = finalSheet.get("awayAtBats").size();
        int expectedAbs = expected.get("totalAtBats").asInt();
        org.assertj.core.api.Assertions.assertThat(actualAbs).isEqualTo(expectedAbs);

        var homeTotals = finalSheet.get("homeTotals");
        var awayTotals = finalSheet.get("awayTotals");
        org.assertj.core.api.Assertions.assertThat(homeTotals).isNotNull();
        org.assertj.core.api.Assertions.assertThat(awayTotals).isNotNull();
        org.assertj.core.api.Assertions.assertThat(homeTotals.get("runs").asInt())
            .isEqualTo(finalSheet.get("meta").get("homeRuns").asInt());
        org.assertj.core.api.Assertions.assertThat(awayTotals.get("runs").asInt())
            .isEqualTo(finalSheet.get("meta").get("awayRuns").asInt());
        org.assertj.core.api.Assertions.assertThat(homeTotals.get("hits").asInt()).isGreaterThanOrEqualTo(0);
        org.assertj.core.api.Assertions.assertThat(homeTotals.get("errors").asInt()).isGreaterThanOrEqualTo(0);
    }

    private long[] collectIds(JsonNode arr) {
        long[] out = new long[arr.size()];
        for (int i = 0; i < arr.size(); i++) out[i] = arr.get(i).get("id").asLong();
        return out;
    }
}
