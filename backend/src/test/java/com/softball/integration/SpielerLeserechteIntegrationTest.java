package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.MitSuperadmin;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingAttendanceRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingRepository;
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

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Was ein Spieler lesen darf — und die Trainingsbeteiligung, die er nie sieht, auch nicht die
 * eigene: die Auto-Aufstellung gewichtet sie, und wer seine Quote kennt, leitet daraus einen
 * Anspruch auf einen Lineup-Platz ab.
 * <p>
 * Die Berechtigung greift vor dem Controller: eine nicht vorhandene id liefert bei offenen
 * Endpunkten 404, bei geschlossenen 403. Daran unterscheiden die Tests, ohne Daten anzulegen.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class SpielerLeserechteIntegrationTest {

    private static final RequestPostProcessor SPIELER = user("spieler").roles("PLAYER");
    private static final RequestPostProcessor ADMIN = user("admin").roles("ADMIN");
    private static final RequestPostProcessor SUPERADMIN = user("super").roles("SUPERADMIN");

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SpringPlayerRepository playerRepository;
    @Autowired private SpringTrainingRepository trainingRepository;
    @Autowired private SpringTrainingAttendanceRepository attendanceRepository;

    private PlayerEntity player;

    @BeforeEach
    void setUp() {
        player = new PlayerEntity("Max");
        player.setRegular(true);
        player = playerRepository.save(player);
    }

    @AfterEach
    void tearDown() {
        attendanceRepository.deleteAll();
        trainingRepository.deleteAll();
        playerRepository.deleteAll();
    }

    // ---- Trainingszahlen bleiben verborgen ----

    @Test
    void spielerSiehtKeineTrainingszahlenImFremdenProfil() throws Exception {
        mockMvc.perform(get("/api/players/" + player.getId() + "/usage").with(SPIELER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.trainingsTotal").value(org.hamcrest.Matchers.nullValue()))
            .andExpect(jsonPath("$.trainingsAttended").value(org.hamcrest.Matchers.nullValue()))
            .andExpect(jsonPath("$.gameDaysTotal").isNumber());
    }

    @Test
    void spielerSiehtKeineTrainingszahlenImEigenenProfil() throws Exception {
        // Auch die eigene Quote bleibt zu: der Vergleich mit dem Nebenmann ist das Problem, nicht das Geheimnis.
        mockMvc.perform(get("/api/players/" + player.getId() + "/usage").param("year", "2026")
                .with(user("max").roles("PLAYER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.trainingsTotal").value(org.hamcrest.Matchers.nullValue()))
            .andExpect(jsonPath("$.trainingsAttended").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void adminUndSuperadminSehenDieTrainingszahlen() throws Exception {
        for (final RequestPostProcessor rolle : List.of(ADMIN, SUPERADMIN)) {
            mockMvc.perform(get("/api/players/" + player.getId() + "/usage").with(rolle))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trainingsTotal").isNumber())
                .andExpect(jsonPath("$.trainingsAttended").isNumber());
        }
    }

    @Test
    void spielerSiehtTrainingsterminOhneTeilnehmerzahl() throws Exception {
        legeTrainingAn("2026-03-10");

        mockMvc.perform(get("/api/trainings").with(SPIELER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].date").value("2026-03-10"))
            .andExpect(jsonPath("$[0].time").value("18:00"))
            .andExpect(jsonPath("$[0].location").value("Sportplatz"))
            .andExpect(jsonPath("$[0].cancelled").value(false))
            .andExpect(jsonPath("$[0].attendeeCount").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void adminSiehtDieTeilnehmerzahl() throws Exception {
        legeTrainingAn("2026-03-10");

        mockMvc.perform(get("/api/trainings").with(ADMIN))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].attendeeCount").isNumber());
    }

    @Test
    void spielerKommtNichtAnTrainingsInterna() throws Exception {
        final long id = legeTrainingAn("2026-03-10");

        for (final String pfad : List.of(
                "/api/trainings/" + id + "/attendance", "/api/trainings/attendance/all",
                "/api/trainings/stats", "/api/trainings/periods")) {
            mockMvc.perform(get(pfad).with(SPIELER)).andExpect(status().isForbidden());
        }
        mockMvc.perform(put("/api/trainings/" + id + "/attendance").with(SPIELER)
                .contentType(MediaType.APPLICATION_JSON).content("{\"entries\":[]}"))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/trainings").with(SPIELER)
                .contentType(MediaType.APPLICATION_JSON).content("{\"date\":\"2026-03-11\"}"))
            .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/trainings/" + id).with(SPIELER)).andExpect(status().isForbidden());
    }

    // ---- Lesen, das offen sein muss ----

    @Test
    void spielerLiestSpielbetriebStatistikUndSpielerliste() throws Exception {
        for (final String pfad : List.of(
                "/api/players", "/api/seasons", "/api/seasons/years", "/api/gamedays/all",
                "/api/stats/game-logs", "/api/stats/batting-slots", "/api/stats/all-time/batting",
                "/api/stats/all-time/games", "/api/stats/opponents", "/api/stats/all-time/awards",
                "/api/years/2026/batting-stats", "/api/years/2026/stats", "/api/years/2026/seasons",
                "/api/years/2026/awards", "/api/plays", "/api/play-categories")) {
            final int status = mockMvc.perform(get(pfad).with(SPIELER)).andReturn().getResponse().getStatus();
            assertThat(status).as(pfad).isEqualTo(200);
        }
    }

    @Test
    void spielerLiestEinzelneObjekte() throws Exception {
        // 404 statt 403: die Berechtigung hat durchgelassen, nur das Objekt gibt es nicht.
        for (final String pfad : List.of(
                "/api/players/" + player.getId(), "/api/players/" + player.getId() + "/batting-timeline",
                "/api/seasons/999999", "/api/seasons/999999/stats", "/api/seasons/999999/gamedays",
                "/api/seasons/999999/standings", "/api/seasons/999999/teams", "/api/seasons/999999/results",
                "/api/seasons/999999/awards", "/api/seasons/999999/batting-stats",
                "/api/gamedays/999999", "/api/gamedays/999999/lineups", "/api/gamedays/999999/stats",
                "/api/gamedays/999999/awards", "/api/gamedays/999999/batting-stats",
                "/api/games/999999", "/api/games/999999/lineup", "/api/games/999999/staff",
                "/api/games/999999/substitutions", "/api/games/999999/atbats",
                "/api/games/999999/stealing-events", "/api/games/999999/scoreboard",
                "/api/games/999999/batting-stats", "/api/plays/999999")) {
            final int status = mockMvc.perform(get(pfad).with(SPIELER)).andReturn().getResponse().getStatus();
            assertThat(status).as(pfad).isNotIn(401, 403);
        }
    }

    // ---- Alles andere bleibt zu ----

    @Test
    void spielerSchreibtNichtUndLiestNichtWasTrainingAnzeigtOderInternIst() throws Exception {
        for (final String pfad : List.of(
                "/api/games/1/lineup/suggest",        // gewichtet die Trainingsbeteiligung
                "/api/gamedays/1/poll-votes",         // WhatsApp
                "/api/teams/directory",
                "/api/spielbogen", "/api/coach-billing/profile", "/api/orga/whatsapp/status")) {
            final int status = mockMvc.perform(get(pfad).with(SPIELER)).andReturn().getResponse().getStatus();
            assertThat(status).as(pfad).isEqualTo(403);
        }
        mockMvc.perform(put("/api/games/1/lineup").with(SPIELER)
                .contentType(MediaType.APPLICATION_JSON).content("[]")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/players").with(SPIELER)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\"}")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/players/" + player.getId() + "/whatsapp-name").with(SPIELER)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/seasons/1").with(SPIELER)).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/games/1/coach-rotation").with(SPIELER)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/games/1/scoring/undo").with(SPIELER)).andExpect(status().isForbidden());
    }

    private long legeTrainingAn(final String datum) throws Exception {
        final String body = mockMvc.perform(post("/api/trainings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "date", datum, "time", "18:00", "location", "Sportplatz"))))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("id").asLong();
    }
}
