package com.softball.integration;

import com.softball.MitSuperadmin;
import com.softball.TestcontainersConfig;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Player;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Instant;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Wer scoren darf. Die Schreib-Endpunkte liegen in zwei Controllern, das Lineup-Schreiben in
 * derselben Klasse wie fuenf davon und bleibt Admin-Sache.
 * <p>
 * Die Berechtigung greift vor dem Service: eine nicht vorhandene Spiel-id liefert bei
 * erlaubten Aufrufen 404, bei verbotenen 403. Alle Bodies sind gueltig, damit die
 * Bean-Validation (400) der Berechtigung nicht zuvorkommt.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class ScorerRechtIntegrationTest {

    private static final long KEIN_SPIEL = 999999;

    private static final RequestPostProcessor OHNE_RECHT = user("spieler").roles("PLAYER");
    private static final RequestPostProcessor MIT_RECHT = user("scorer").roles("PLAYER");
    private static final RequestPostProcessor ADMIN = user("admin").roles("ADMIN");
    private static final RequestPostProcessor SUPERADMIN = user("super").roles("SUPERADMIN");

    /** Methode, Pfad, Body. */
    private record Aufruf(HttpMethod method, String pfad, String body) {
        @Override public String toString() { return method + " " + pfad; }
    }

    private static final String BASE = "/api/games/" + KEIN_SPIEL;

    private static final List<Aufruf> GAME_CONTROLLER = List.of(
        new Aufruf(HttpMethod.PUT, BASE + "/score", "{\"scoreUs\":1,\"scoreThem\":0}"),
        new Aufruf(HttpMethod.PUT, BASE + "/batting-side", "{\"battingSide\":\"top\"}"),
        new Aufruf(HttpMethod.POST, BASE + "/substitutions", "{\"playerOutId\":1,\"playerInId\":2,\"inning\":3}"),
        new Aufruf(HttpMethod.POST, BASE + "/end", null),
        new Aufruf(HttpMethod.POST, BASE + "/reopen", null));

    private static final List<Aufruf> SCORING_CONTROLLER = List.of(
        new Aufruf(HttpMethod.POST, BASE + "/atbats",
            "{\"batterId\":1,\"result\":\"SINGLE\",\"inning\":1}"),
        new Aufruf(HttpMethod.DELETE, BASE + "/atbats/last", null),
        new Aufruf(HttpMethod.PUT, BASE + "/atbats/last/base-state",
            "{\"first\":null,\"second\":null,\"third\":null,\"runsScored\":0,\"rbi\":0}"),
        new Aufruf(HttpMethod.DELETE, BASE + "/scoring", null),
        new Aufruf(HttpMethod.DELETE, BASE + "/scoring/current-inning", null),
        new Aufruf(HttpMethod.POST, BASE + "/scoring/undo", null),
        new Aufruf(HttpMethod.POST, BASE + "/scoring/next-inning", "{\"opponentRuns\":0}"),
        new Aufruf(HttpMethod.POST, BASE + "/scoring/automatic-out", null),
        new Aufruf(HttpMethod.POST, BASE + "/stealing-events",
            "{\"runnerId\":1,\"type\":\"STOLEN_BASE\",\"inning\":1}"),
        new Aufruf(HttpMethod.DELETE, BASE + "/stealing-events/1", null),
        new Aufruf(HttpMethod.POST, BASE + "/clock/start", "{\"limitMinutes\":60}"),
        new Aufruf(HttpMethod.POST, BASE + "/clock/pause", null),
        new Aufruf(HttpMethod.POST, BASE + "/clock/resume", null),
        new Aufruf(HttpMethod.POST, BASE + "/clock/reset", null));

    static Stream<Aufruf> alleScoringSchreibAufrufe() {
        return Stream.concat(GAME_CONTROLLER.stream(), SCORING_CONTROLLER.stream());
    }

    static Stream<Aufruf> gameControllerAufrufe() {
        return GAME_CONTROLLER.stream();
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private PlayerRepository playerRepository;
    @Autowired private AppUserRepository appUserRepository;

    @BeforeEach
    void accountsAnlegen() {
        // Der Scorer braucht einen echten Account: die Regel liest may_score aus der Datenbank.
        anlegen("scorer", true);
        anlegen("spieler", false);
    }

    private void anlegen(final String username, final boolean mayScore) {
        if (appUserRepository.findByUsername(username).isPresent()) {
            return;
        }
        final Player player = playerRepository.save(new Player(username));
        final AppUser account = new AppUser();
        account.setPlayerId(player.getId());
        account.setUsername(username);
        account.setPasswordHash("{noop}x");
        account.setRole(Role.PLAYER);
        account.setMayScore(mayScore);
        account.setCreatedAt(Instant.now());
        appUserRepository.save(account);
    }

    private int status(final Aufruf aufruf, final RequestPostProcessor wer) throws Exception {
        final var builder = request(aufruf.method(), aufruf.pfad()).with(wer);
        if (aufruf.body() != null) {
            builder.contentType(MediaType.APPLICATION_JSON).content(aufruf.body());
        }
        return mockMvc.perform(builder).andReturn().getResponse().getStatus();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("alleScoringSchreibAufrufe")
    void spielerOhneScorerRechtKommtNichtDurch(final Aufruf aufruf) throws Exception {
        assertThat(status(aufruf, OHNE_RECHT)).isEqualTo(403);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("alleScoringSchreibAufrufe")
    void spielerMitScorerRechtKommtDurch(final Aufruf aufruf) throws Exception {
        assertThat(status(aufruf, MIT_RECHT)).isNotIn(401, 403);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("gameControllerAufrufe")
    void spielerMitScorerRechtKommtAnDieFuenfGameEndpunkte(final Aufruf aufruf) throws Exception {
        assertThat(status(aufruf, MIT_RECHT)).isEqualTo(404);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("alleScoringSchreibAufrufe")
    void adminUndSuperadminKommenWieBisherDurch(final Aufruf aufruf) throws Exception {
        assertThat(status(aufruf, ADMIN)).isNotIn(401, 403);
        assertThat(status(aufruf, SUPERADMIN)).isNotIn(401, 403);
    }

    @Test
    void spielerMitScorerRechtDarfTrotzdemKeinLineupSchreiben() throws Exception {
        final String lineup = "[]";
        for (final Aufruf aufruf : List.of(
                new Aufruf(HttpMethod.PUT, BASE + "/lineup", lineup),
                new Aufruf(HttpMethod.POST, BASE + "/lineup/check", lineup),
                new Aufruf(HttpMethod.PUT, BASE + "/staff", "[]"),
                new Aufruf(HttpMethod.PUT, BASE + "/substitutions", "[]"),
                new Aufruf(HttpMethod.PUT, BASE + "/opponent", "{}"),
                new Aufruf(HttpMethod.PUT, BASE + "/coach-rotation", "{}"),
                new Aufruf(HttpMethod.POST, BASE + "/swap/1", null))) {
            assertThat(status(aufruf, MIT_RECHT)).as(aufruf.toString()).isEqualTo(403);
        }
    }

    @Test
    void adminSchreibtLineupWieBisher() throws Exception {
        assertThat(status(new Aufruf(HttpMethod.PUT, BASE + "/lineup", "[]"), ADMIN)).isNotIn(401, 403);
    }

    @Test
    void lesendeScoringEndpunkteBleibenFuerJedenAngemeldetenOffen() throws Exception {
        for (final String pfad : List.of("/atbats", "/scoreboard", "/stealing-events", "/lineup", "/substitutions")) {
            assertThat(status(new Aufruf(HttpMethod.GET, BASE + pfad, null), OHNE_RECHT))
                    .as(pfad).isNotIn(401, 403);
        }
    }

    @Test
    void scorerRechtOhneAccountOeffnetNichts() throws Exception {
        // Ein angemeldeter Name ohne Account in der Datenbank bekommt das Recht nicht.
        final RequestPostProcessor ohneAccount = user("geist").roles("PLAYER");
        assertThat(status(new Aufruf(HttpMethod.POST, BASE + "/end", null), ohneAccount)).isEqualTo(403);
    }
}
