package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.MitSuperadmin;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringLineupEntryRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class BaseCoachAuskunftIntegrationTest {

    private static final RequestPostProcessor ADMIN = user("admin").roles("ADMIN");
    private static final RequestPostProcessor SPIELER = user("spieler").roles("PLAYER");
    private static final List<String> POSITIONEN = List.of("P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "EH");

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SpringSeasonRepository seasonRepository;
    @Autowired private SpringGameDayRepository gameDayRepository;
    @Autowired private SpringGameRepository gameRepository;
    @Autowired private SpringLineupEntryRepository lineupEntryRepository;
    @Autowired private SpringPlayerRepository playerRepository;

    private SeasonEntity season;
    private List<PlayerEntity> spieler;

    @BeforeEach
    void setUp() {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        spieler = new ArrayList<>();
        for (final String name : List.of("Ann", "Ben", "Cem", "Dora", "Eva", "Finn", "Gina", "Hans", "Ida", "Jonas", "Jan")) {
            spieler.add(playerRepository.save(new PlayerEntity(name)));
        }
    }

    @AfterEach
    void tearDown() {
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    /** Zehn Schlaeger auf den Plaetzen 1..10; Jan (Index 10) bleibt auf der Bank. */
    private long spieltagMitZehnerAufstellung() throws Exception {
        final String body = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", LocalDate.now().plusDays(7).toString(), "label", "Spieltag 1"))))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        final long id = objectMapper.readTree(body).get("id").asLong();

        mockMvc.perform(put("/api/gamedays/" + id + "/players")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("playerIds", spieler.stream().map(PlayerEntity::getId).toList()))))
            .andExpect(status().isOk());

        final List<Map<String, Object>> eintraege = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            eintraege.add(Map.of("playerId", spieler.get(i).getId(), "position", POSITIONEN.get(i), "battingOrder", i + 1));
        }
        mockMvc.perform(put("/api/games/" + ersteSpielId(id) + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(eintraege)))
            .andExpect(status().isOk());
        return id;
    }

    private long ersteSpielId(final long gameDayId) throws Exception {
        final String body = mockMvc.perform(get("/api/gamedays/" + gameDayId)).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("games").get(0).get("id").asLong();
    }

    private void gibFrei(final long id) throws Exception {
        mockMvc.perform(put("/api/gamedays/" + id + "/lineups/release").with(ADMIN)
                .contentType(MediaType.APPLICATION_JSON).content("{\"released\":true}"))
            .andExpect(status().isOk());
    }

    @Test
    void spielerSiehtNachFreigabeDieStartschlagplaetze() throws Exception {
        final long id = spieltagMitZehnerAufstellung();
        final long spielId = ersteSpielId(id);
        gibFrei(id);

        mockMvc.perform(get("/api/gamedays/" + id + "/lineups").with(SPIELER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.baseCoaches['" + spielId + "'].startSlots[0]").value(9))
            .andExpect(jsonPath("$.baseCoaches['" + spielId + "'].startSlots[1]").value(10))
            .andExpect(jsonPath("$.baseCoaches['" + spielId + "'].firstBase").doesNotExist())
            .andExpect(jsonPath("$.baseCoaches['" + spielId + "'].thirdBase").doesNotExist());
    }

    @Test
    void benannterCoachSchlaegtDieRegel() throws Exception {
        final long id = spieltagMitZehnerAufstellung();
        final long spielId = ersteSpielId(id);
        mockMvc.perform(put("/api/games/" + spielId + "/staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", spieler.get(10).getId(), "role", "BASE_COACH_1ST")))))
            .andExpect(status().isOk());
        gibFrei(id);

        mockMvc.perform(get("/api/gamedays/" + id + "/lineups").with(SPIELER))
            .andExpect(jsonPath("$.baseCoaches['" + spielId + "'].firstBase").value("Jan"))
            .andExpect(jsonPath("$.baseCoaches['" + spielId + "'].startSlots.length()").value(1))
            .andExpect(jsonPath("$.baseCoaches['" + spielId + "'].startSlots[0]").value(10));
    }

    @Test
    void gesperrterSpieltagLiefertLeereBaseCoachMap() throws Exception {
        final long id = spieltagMitZehnerAufstellung();

        mockMvc.perform(get("/api/gamedays/" + id + "/lineups").with(SPIELER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.baseCoaches").isEmpty());
    }

    @Test
    void trainerSiehtSieAuchVorDerFreigabe() throws Exception {
        final long id = spieltagMitZehnerAufstellung();
        final long spielId = ersteSpielId(id);

        mockMvc.perform(get("/api/gamedays/" + id + "/lineups").with(ADMIN))
            .andExpect(jsonPath("$.baseCoaches['" + spielId + "'].startSlots[0]").value(9))
            .andExpect(jsonPath("$.baseCoaches['" + spielId + "'].startSlots[1]").value(10));
    }
}
