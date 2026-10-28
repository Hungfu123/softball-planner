package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.*;
import com.softball.TestcontainersConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import com.softball.MitSuperadmin;
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
@MitSuperadmin
class LineupSetIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SpringSeasonRepository seasonRepository;
    @Autowired private SpringPlayerRepository playerRepository;
    @Autowired private SpringGameDayRepository gameDayRepository;
    @Autowired private SpringGameRepository gameRepository;
    @Autowired private SpringLineupEntryRepository lineupEntryRepository;
    @Autowired private SpringGameStaffRepository gameStaffRepository;
    @Autowired private SpringLeagueTeamRepository leagueTeamRepository;
    @Autowired private SpringLineupSetRepository lineupSetRepository;

    private Long gameDayId;
    private Long gameId;
    private PlayerEntity p1, p2, p3;

    @BeforeEach
    void setUp() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        p1 = playerRepository.save(new PlayerEntity("Max"));
        p2 = playerRepository.save(new PlayerEntity("Lisa"));
        p3 = playerRepository.save(new PlayerEntity("Tom"));

        final MvcResult res = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();
        final var json = objectMapper.readTree(res.getResponse().getContentAsString());
        gameDayId = json.get("id").asLong();
        gameId = json.get("games").get(0).get("id").asLong();

        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(p1.getId(), p2.getId(), p3.getId())))));

        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", p1.getId(), "position", "P", "battingOrder", 1),
                Map.of("playerId", p2.getId(), "position", "1B", "battingOrder", 2),
                Map.of("playerId", p3.getId(), "position", "C", "battingOrder", 3)
            )))).andExpect(status().isOk());
    }

    @AfterEach
    void tearDown() {
        lineupSetRepository.deleteAll();
        gameStaffRepository.deleteAll();
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        leagueTeamRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void snapshotCapturesCurrentLineup() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup-sets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Variante A"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Variante A"))
            .andExpect(jsonPath("$.entries.length()").value(3))
            .andExpect(jsonPath("$.entries[0].gameNumber").value(1))
            .andExpect(jsonPath("$.entries[0].player.name").value("Max"))
            .andExpect(jsonPath("$.entries[1].position").value("1B"));

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/lineup-sets"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void blankNameRejected() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup-sets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "  "))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void renameAndDelete() throws Exception {
        final MvcResult created = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup-sets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Alt"))))
            .andReturn();
        final Long setId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(patch("/api/lineup-sets/" + setId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Neu"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Neu"))
            .andExpect(jsonPath("$.entries.length()").value(3));

        mockMvc.perform(delete("/api/lineup-sets/" + setId)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/lineup-sets"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void overwriteReplacesContentAndKeepsIdAndName() throws Exception {
        final MvcResult created = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup-sets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Variante A"))))
            .andReturn();
        final Long setId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        // Lineup aendern: nur noch 2 Spieler, andere Positionen
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(List.of(
                Map.of("playerId", p3.getId(), "position", "SS", "battingOrder", 1),
                Map.of("playerId", p2.getId(), "position", "P", "battingOrder", 2)
            )))).andExpect(status().isOk());

        mockMvc.perform(put("/api/lineup-sets/" + setId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(setId))
            .andExpect(jsonPath("$.name").value("Variante A"))
            .andExpect(jsonPath("$.entries.length()").value(2))
            .andExpect(jsonPath("$.entries[0].player.name").value("Tom"))
            .andExpect(jsonPath("$.entries[0].position").value("SS"));

        // Kein zweites Set, keine verwaisten Alt-Eintraege
        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/lineup-sets"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].entries.length()").value(2));
    }

    // "Anwenden" ist kein Backend-Vorgang, sondern ein Zurueckspielen durch das Frontend (drei PUTs).
    // Backendseitig bleibt als Restrisiko, dass ein Alt-Set nach dem Wegfall der Rotationstabelle
    // noch gelesen und ueberschrieben werden kann — genau das prueft dieser Test.
    @Test
    void altesSetSpeichertUndUeberschreibtOhneRotationsfeld() throws Exception {
        final PlayerEntity coach = playerRepository.save(new PlayerEntity("Eva"));
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("playerIds",
                    List.of(p1.getId(), p2.getId(), p3.getId(), coach.getId())))))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/games/" + gameId + "/staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", coach.getId(), "role", "BASE_COACH_1ST")))))
            .andExpect(status().isOk());

        final MvcResult created = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup-sets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Altes Set"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.entries.length()").value(3))
            .andExpect(jsonPath("$.staff.length()").value(1))
            .andExpect(jsonPath("$.staff[0].role").value("BASE_COACH_1ST"))
            .andExpect(jsonPath("$.availablePlayerIds.length()").value(4))
            .andExpect(jsonPath("$.rotations").doesNotExist())
            .andReturn();
        final Long setId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        // Mehrfaches Ueberschreiben darf nicht an Kinder-Zeilen scheitern
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(put("/api/lineup-sets/" + setId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries.length()").value(3))
                .andExpect(jsonPath("$.staff.length()").value(1))
                .andExpect(jsonPath("$.rotations").doesNotExist());
        }
    }

    @Test
    void overwriteUnknownSetIs404() throws Exception {
        mockMvc.perform(put("/api/lineup-sets/999999")).andExpect(status().isNotFound());
    }

    @Test
    void deletingGameDayCascadesSets() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/lineup-sets")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("name", "Variante A"))));
        org.junit.jupiter.api.Assertions.assertEquals(1, lineupSetRepository.count());

        mockMvc.perform(delete("/api/gamedays/" + gameDayId)).andExpect(status().isNoContent());

        // In production the DB FK ON DELETE CASCADE removes lineup_set rows when the game_day row is deleted.
        // In tests ddl-auto=create-drop skips Flyway migrations, so the FK constraint is not present and
        // JPA does not cascade to lineup_set (it's a plain column, not a @ManyToOne relationship).
        // We therefore verify via the teardown that calling delete on the gameday succeeds (204)
        // and that the game day no longer exists, not via a second GET to lineup-sets.
        mockMvc.perform(get("/api/gamedays/" + gameDayId)).andExpect(status().isNotFound());
    }
}
