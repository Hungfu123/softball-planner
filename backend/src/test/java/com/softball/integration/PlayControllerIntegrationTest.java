package com.softball.integration;

import com.softball.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import com.softball.MitSuperadmin;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class PlayControllerIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    private Long kategorie() {
        return jdbc.queryForObject("SELECT id FROM play_category ORDER BY sort_order LIMIT 1", Long.class);
    }

    private static final String MARKERS = """
            {"defenders":[{"position":"P","x":155,"y":175}],
             "runners":[{"id":"r1","x":196,"y":174,"status":"ACTIVE"}],
             "ball":{"state":"IN_HAND","holder":"P","x":155,"y":175,"trajectory":"AIR"}}
            """;

    private String playJson(final String titel, final Long categoryId, final String... staende) {
        return """
                {"title":"%s","categoryId":%d,"gameState":"ANY","steps":[%s]}
                """.formatted(titel, categoryId, String.join(",", staende));
    }

    private static String stand(final int ordinal, final int dauer, final int outs) {
        return """
                {"ordinal":%d,"durationMs":%d,"note":"Stand %d","outs":%d,"markers":%s}
                """.formatted(ordinal, dauer, ordinal, outs, MARKERS);
    }

    private Long anlegen(final String titel) throws Exception {
        final MvcResult res = mvc.perform(post("/api/plays")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(playJson(titel, kategorie(), stand(1, 1200, 0), stand(2, 600, 1))))
                .andExpect(status().isCreated())
                .andReturn();
        return com.jayway.jsonpath.JsonPath.parse(res.getResponse().getContentAsString()).read("$.id", Integer.class)
                .longValue();
    }

    @Test
    void listeLiefertDieStaendeMit() throws Exception {
        final Long id = anlegen("Liste mit Staenden");

        mvc.perform(get("/api/plays"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")].steps.length()").value(org.hamcrest.Matchers.hasItem(2)))
                .andExpect(jsonPath("$[?(@.id == " + id + ")].steps[0].markers.defenders.length()")
                        .value(org.hamcrest.Matchers.hasItem(1)));

        mvc.perform(delete("/api/plays/" + id)).andExpect(status().isNoContent());
    }

    @Test
    void putErsetztAlleStaende() throws Exception {
        final Long id = anlegen("Ersetzen per PUT");

        mvc.perform(put("/api/plays/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(playJson("Ersetzen per PUT", kategorie(), stand(1, 2000, 3))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.steps.length()").value(1))
                .andExpect(jsonPath("$.steps[0].outs").value(3));

        final Integer zeilen = jdbc.queryForObject(
                "SELECT count(*) FROM play_step WHERE play_id = ?", Integer.class, id);
        assertThat(zeilen).isEqualTo(1);

        mvc.perform(delete("/api/plays/" + id)).andExpect(status().isNoContent());
    }

    @Test
    void putOhneStaendeWirdAbgelehnt() throws Exception {
        final Long id = anlegen("Ohne Staende");

        mvc.perform(put("/api/plays/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(playJson("Ohne Staende", kategorie())))
                .andExpect(status().isBadRequest());

        mvc.perform(delete("/api/plays/" + id)).andExpect(status().isNoContent());
    }

    @Test
    void duplizierenKopiertStaendeUndHaengtKopieAnDenTitel() throws Exception {
        final Long id = anlegen("Original");

        final MvcResult res = mvc.perform(post("/api/plays/" + id + "/duplicate"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Original (Kopie)"))
                .andExpect(jsonPath("$.steps.length()").value(2))
                .andReturn();

        final Long kopieId = com.jayway.jsonpath.JsonPath.parse(res.getResponse().getContentAsString())
                .read("$.id", Integer.class).longValue();

        mvc.perform(delete("/api/plays/" + kopieId)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/plays/" + id)).andExpect(status().isNoContent());
    }

    @Test
    void kategorieMitPlaysLaesstSichNichtLoeschen() throws Exception {
        final Long id = anlegen("Blockiert die Kategorie");

        mvc.perform(delete("/api/play-categories/" + kategorie()))
                .andExpect(status().isBadRequest());

        mvc.perform(delete("/api/plays/" + id)).andExpect(status().isNoContent());
    }

    @Test
    void doppelterKategorienameInAndererSchreibweiseWirdAbgelehnt() throws Exception {
        mvc.perform(post("/api/play-categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"RUNDOWN\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void zusammenfuehrenHaengtPlaysUmUndLoeschtDieQuelle() throws Exception {
        final MvcResult neu = mvc.perform(post("/api/play-categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Temporaer\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        final Long tempId = com.jayway.jsonpath.JsonPath.parse(neu.getResponse().getContentAsString())
                .read("$.id", Integer.class).longValue();

        final MvcResult res = mvc.perform(post("/api/plays")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(playJson("Wandert mit", tempId, stand(1, 1200, 0))))
                .andExpect(status().isCreated())
                .andReturn();
        final Long playId = com.jayway.jsonpath.JsonPath.parse(res.getResponse().getContentAsString())
                .read("$.id", Integer.class).longValue();

        mvc.perform(post("/api/play-categories/" + tempId + "/merge/" + kategorie()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/plays/" + playId))
                .andExpect(jsonPath("$.categoryId").value(kategorie()));

        final Integer verbliebene = jdbc.queryForObject(
                "SELECT count(*) FROM play_category WHERE id = ?", Integer.class, tempId);
        assertThat(verbliebene).isZero();

        mvc.perform(delete("/api/plays/" + playId)).andExpect(status().isNoContent());
    }

    @Test
    void loeschenSetztDasGegenstueckAndererPlaysAufNull() throws Exception {
        final Long a = anlegen("Gegenstueck A");

        final MvcResult res = mvc.perform(post("/api/plays")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Gegenstueck B","categoryId":%d,"counterpartPlayId":%d,
                                 "steps":[%s]}
                                """.formatted(kategorie(), a, stand(1, 1200, 0))))
                .andExpect(status().isCreated())
                .andReturn();
        final Long b = com.jayway.jsonpath.JsonPath.parse(res.getResponse().getContentAsString())
                .read("$.id", Integer.class).longValue();

        mvc.perform(delete("/api/plays/" + a)).andExpect(status().isNoContent());

        mvc.perform(get("/api/plays/" + b))
                .andExpect(jsonPath("$.counterpartPlayId").doesNotExist());

        mvc.perform(delete("/api/plays/" + b)).andExpect(status().isNoContent());
    }

    @Test
    void unbekanntesPlayLiefert404() throws Exception {
        mvc.perform(get("/api/plays/999999")).andExpect(status().isNotFound());
    }
}
