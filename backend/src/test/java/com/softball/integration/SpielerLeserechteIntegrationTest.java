package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.MitSuperadmin;
import com.softball.domain.model.Role;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.AppUserEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringAppUserRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringGameStaffRepository;
import com.softball.adapter.out.persistence.repository.SpringLineupEntryRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.adapter.out.persistence.repository.SpringSubstitutionRepository;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Was ein Spieler lesen darf — und die Trainingsbeteiligung FREMDER Spieler, die er nie sieht.
 * <p>
 * Die eigenen Zahlen sieht er seit dem 27.10.2026 (Entscheidung des Betreibers). Bis dahin war
 * auch die eigene Quote zu, mit der Begruendung: die Auto-Aufstellung gewichtet sie, und wer
 * seine Zahl kennt, leitet daraus einen Anspruch auf einen Lineup-Platz ab. Geblieben ist die
 * Haelfte, die wirklich traegt — der VERGLEICH mit dem Nebenmann. Ueber sich selbst darf man
 * Bescheid wissen.
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
    @Autowired private SpringAppUserRepository appUserRepository;
    @Autowired private SpringSeasonRepository seasonRepository;
    @Autowired private SpringGameDayRepository gameDayRepository;
    @Autowired private SpringGameRepository gameRepository;
    @Autowired private SpringLineupEntryRepository lineupEntryRepository;
    @Autowired private SpringGameStaffRepository gameStaffRepository;
    @Autowired private SpringSubstitutionRepository substitutionRepository;

    private PlayerEntity player;
    private SeasonEntity season;
    private PlayerEntity coach;
    /** Der Account, der AN diesem Spieler haengt — ohne ihn gibt es kein „eigenes" Profil. */
    private static final String EIGENER_NAME = "max-eigen";

    @BeforeEach
    void setUp() {
        season = null;
        coach = null;
        player = new PlayerEntity("Max");
        player.setRegular(true);
        player = playerRepository.save(player);

        final AppUserEntity konto = new AppUserEntity();
        konto.setUsername(EIGENER_NAME);
        konto.setPlayerId(player.getId());
        konto.setPasswordHash("egal");
        konto.setRole(Role.PLAYER);
        konto.setCreatedAt(java.time.Instant.now());
        appUserRepository.save(konto);
    }

    @AfterEach
    void tearDown() {
        appUserRepository.findByUsernameIgnoreCase(EIGENER_NAME).ifPresent(appUserRepository::delete);
        appUserRepository.findByUsernameIgnoreCase(SCORER_NAME).ifPresent(appUserRepository::delete);
        attendanceRepository.deleteAll();
        trainingRepository.deleteAll();
        substitutionRepository.deleteAll();
        gameStaffRepository.deleteAll();
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    /** Der Spieler selbst — der Account haengt an `player`. */
    private RequestPostProcessor eigen() {
        return user(EIGENER_NAME).roles("PLAYER");
    }

    // ---- Trainingszahlen bleiben verborgen ----

    @Test
    void spielerSiehtKeineTrainingszahlenImFremdenProfil() throws Exception {
        // `SPIELER` haengt an keinem Spieler — fuer ihn ist jedes Profil ein fremdes.
        mockMvc.perform(get("/api/players/" + player.getId() + "/usage").with(SPIELER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.trainingsTotal").value(org.hamcrest.Matchers.nullValue()))
            .andExpect(jsonPath("$.trainingsAttended").value(org.hamcrest.Matchers.nullValue()))
            .andExpect(jsonPath("$.gameDaysTotal").isNumber());
    }

    /*
     * Die Umkehr vom 27.10.2026: ueber sich selbst darf man Bescheid wissen. Der Vergleich mit
     * dem Nebenmann war das Problem, nicht das Wissen — und der bleibt zu (Test darueber).
     */
    @Test
    void spielerSiehtDieEIGENENTrainingszahlen() throws Exception {
        mockMvc.perform(get("/api/players/" + player.getId() + "/usage").param("year", "2026")
                .with(eigen()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.trainingsTotal").isNumber())
            .andExpect(jsonPath("$.trainingsAttended").isNumber());
    }

    /**
     * Wer noch nie im Training war, bekommt KEINE Abwesenheits-Ansprache: „lange nicht gesehen"
     * ist die falsche Anrede fuer einen, den es noch nie gab. Ohne Anwesenheit bleibt
     * {@code verpasstSeitdem} null, und die Startseite schweigt.
     */
    @Test
    void ohneJedeAnwesenheitKeineAnsprache() throws Exception {
        mockMvc.perform(get("/api/players/" + player.getId() + "/training-months")
                .param("year", "2026").with(eigen()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verpasstSeitdem").value(org.hamcrest.Matchers.nullValue()))
            .andExpect(jsonPath("$.monate").exists());
    }

    /** Die Monatskarte der Startseite — eigene ja, fremde 403. */
    @Test
    void monatskarteNurFuerSichSelbst() throws Exception {
        mockMvc.perform(get("/api/players/" + player.getId() + "/training-months")
                .param("year", "2026").with(eigen()))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/players/" + player.getId() + "/training-months")
                .param("year", "2026").with(SPIELER))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/players/" + player.getId() + "/training-months")
                .param("year", "2026").with(ADMIN))
            .andExpect(status().isOk());
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
                "/api/stats/all-time/games", "/api/stats/opponents", "/api/teams/directory", "/api/stats/all-time/awards",
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

    // ---- Die Aufstellung ist zu, bis sie steht ----

    /** Ein Spieler-Account MIT Scorer-Recht — fuer ihn faellt die Lesegrenze. */
    private static final String SCORER_NAME = "sam-scorer";

    private RequestPostProcessor scorer() {
        return user(SCORER_NAME).roles("PLAYER");
    }

    /**
     * Ein Spieltag mit allem, was die fuenf Endpunkte herausgeben: Aufstellung, Base-Coach
     * und eine Auswechslung. Gibt Spieltag-id und die id des ersten Spiels zurueck.
     */
    private long[] spieltagMitAufstellung(final LocalDate datum) throws Exception {
        if (season == null) {
            season = seasonRepository.save(new SeasonEntity("Saison " + datum.getYear(), datum.getYear()));
        }
        if (coach == null) {
            coach = playerRepository.save(new PlayerEntity("Conny"));
        }
        final String tagBody = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "date", datum.toString(), "label", "Spieltag " + datum))))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        final long gameDayId = objectMapper.readTree(tagBody).get("id").asLong();
        final long gameId = objectMapper.readTree(tagBody).get("games").get(0).get("id").asLong();

        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "playerIds", List.of(player.getId(), coach.getId())))))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", player.getId(), "position", "SS", "battingOrder", 1)))))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/games/" + gameId + "/staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", coach.getId(), "role", "BASE_COACH_1ST")))))
            .andExpect(status().isOk());
        mockMvc.perform(post("/api/games/" + gameId + "/substitutions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "playerOutId", player.getId(), "playerInId", coach.getId(), "inning", 3))))
            .andExpect(status().isOk());

        return new long[] {gameDayId, gameId};
    }

    /** Ein Spieltag in der Zukunft: nur die Freigabe kann ihn oeffnen. */
    private long[] kuenftigerSpieltag() throws Exception {
        return spieltagMitAufstellung(LocalDate.now().plusDays(30));
    }

    private void freigeben(final long gameDayId) throws Exception {
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/lineups/release")
                .contentType(MediaType.APPLICATION_JSON).content("{\"released\":true}"))
            .andExpect(status().isOk());
    }

    /** Die fuenf Endpunkte, die die Aufstellung herausgeben — in einer Form, in anderer Form. */
    private void pruefeAlleFuenf(final long gameDayId, final long gameId,
                                 final RequestPostProcessor wer, final boolean sichtbar) throws Exception {
        final org.springframework.test.web.servlet.ResultMatcher array =
            sichtbar ? jsonPath("$").isNotEmpty() : jsonPath("$").isEmpty();
        final org.springframework.test.web.servlet.ResultMatcher lineups =
            sichtbar ? jsonPath("$.lineups").isNotEmpty() : jsonPath("$.lineups").isEmpty();

        mockMvc.perform(get("/api/games/" + gameId + "/lineup").with(wer))
            .andExpect(status().isOk()).andExpect(array);
        mockMvc.perform(get("/api/games/" + gameId + "/staff").with(wer))
            .andExpect(status().isOk()).andExpect(array);
        mockMvc.perform(get("/api/games/" + gameId + "/substitutions").with(wer))
            .andExpect(status().isOk()).andExpect(array);
        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/lineups").with(wer))
            .andExpect(status().isOk()).andExpect(lineups);
        // Der Name klingt nach Statistik, der Inhalt sind Positionen je Spiel und Spieler —
        // das IST die Aufstellung in anderer Form.
        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/stats").with(wer))
            .andExpect(status().isOk()).andExpect(array);
    }

    @Test
    void vorDerFreigabeSiehtEinSpielerWederAufstellungNochPositionen() throws Exception {
        final long[] ids = kuenftigerSpieltag();

        pruefeAlleFuenf(ids[0], ids[1], SPIELER, false);
    }

    @Test
    void nachDerFreigabeSiehtErAlles() throws Exception {
        final long[] ids = kuenftigerSpieltag();
        freigeben(ids[0]);

        pruefeAlleFuenf(ids[0], ids[1], SPIELER, true);
    }

    @Test
    void derAdminSiehtVorherSchon() throws Exception {
        final long[] ids = kuenftigerSpieltag();

        pruefeAlleFuenf(ids[0], ids[1], ADMIN, true);
        pruefeAlleFuenf(ids[0], ids[1], SUPERADMIN, true);
    }

    /**
     * Der wichtigste Fall des ganzen Vorhabens: wer scoren darf, oeffnet den Spielbogen eines
     * Spieltags, der noch nicht freigegeben ist. Ohne diesen Zweig waere der Bogen leer —
     * genau dann, wenn das Spiel losgeht.
     */
    @Test
    void einScorerSiehtDieAufstellungAuchOhneFreigabe() throws Exception {
        legeScorerAn();
        final long[] ids = kuenftigerSpieltag();

        pruefeAlleFuenf(ids[0], ids[1], scorer(), true);
    }

    /**
     * Ein Angemeldeter ohne verknuepften Spieler darf die Pruefung nicht umwerfen. In der
     * Datenbank ist {@code app_user.player_id} NOT NULL, den Fall gibt es dort also nicht —
     * sehr wohl aber den Angemeldeten ganz ohne Account-Zeile, und fuer die Regel ist das
     * dasselbe: {@code CurrentUser.find()} ist leer. Erwartet wird eine leere Liste, kein 500.
     */
    @Test
    void einAccountOhneVerknuepftenSpielerFaelltNichtUm() throws Exception {
        final long[] ids = kuenftigerSpieltag();
        assertThat(appUserRepository.findByUsernameIgnoreCase("spieler")).isEmpty();

        pruefeAlleFuenf(ids[0], ids[1], SPIELER, false);
    }

    /**
     * „Noch nicht sehen" heisst BEVOR sie steht, nicht NIE WIEDER: der Spiele-Log unter
     * {@code /teams/spiele} laedt fuer jedes vergangene Spiel die Schlagreihenfolge, und
     * niemand gibt hundert alte Spieltage nachtraeglich frei.
     */
    @Test
    void einVergangenerSpieltagBleibtFuerSpielerLesbar() throws Exception {
        final long[] ids = spieltagMitAufstellung(LocalDate.now().minusDays(1));

        pruefeAlleFuenf(ids[0], ids[1], SPIELER, true);
    }

    /** Heute ist noch kein Gestern: der laufende Spieltag bleibt bis zur Freigabe zu. */
    @Test
    void derHeutigeSpieltagIstNochNichtVergangen() throws Exception {
        final long[] ids = spieltagMitAufstellung(LocalDate.now());

        pruefeAlleFuenf(ids[0], ids[1], SPIELER, false);
    }

    private void legeScorerAn() {
        final PlayerEntity sam = playerRepository.save(new PlayerEntity("Sam"));
        final AppUserEntity konto = new AppUserEntity();
        konto.setUsername(SCORER_NAME);
        konto.setPlayerId(sam.getId());
        konto.setPasswordHash("egal");
        konto.setRole(Role.PLAYER);
        konto.setMayScore(true);
        konto.setCreatedAt(java.time.Instant.now());
        appUserRepository.save(konto);
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
