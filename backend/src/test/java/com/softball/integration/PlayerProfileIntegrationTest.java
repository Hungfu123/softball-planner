package com.softball.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.AtBatEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.entity.TrainingAttendanceEntity;
import com.softball.adapter.out.persistence.entity.TrainingEntity;
import com.softball.adapter.out.persistence.repository.SpringAtBatRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingAttendanceRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingRepository;
import com.softball.domain.model.AtBatResult;
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

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spielerprofil über die REST-Schicht: Positions-Profil setzen und die Form-Kurve lesen.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class PlayerProfileIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SpringSeasonRepository seasonRepository;
    @Autowired private SpringPlayerRepository playerRepository;
    @Autowired private SpringGameDayRepository gameDayRepository;
    @Autowired private SpringGameRepository gameRepository;
    @Autowired private SpringAtBatRepository atBatRepository;

    private SeasonEntity season;
    private PlayerEntity player;

    @BeforeEach
    void setUp() {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        player = playerRepository.save(new PlayerEntity("Mia"));
    }

    @AfterEach
    void tearDown() {
        atBatRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void newPlayerHasNoPositionProfile() throws Exception {
        mockMvc.perform(get("/api/players/" + player.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.primaryPosition").doesNotExist())
            .andExpect(jsonPath("$.secondaryPosition").doesNotExist());
    }

    @Test
    void positionProfileIsStoredAndReadBack() throws Exception {
        putPositions("SS", "IF", "OF")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.primaryPosition").value("SS"))
            .andExpect(jsonPath("$.secondaryPosition").value("IF"))
            .andExpect(jsonPath("$.tertiaryPosition").value("OF"));

        mockMvc.perform(get("/api/players/" + player.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.primaryPosition").value("SS"));
    }

    @Test
    void slotsCanBeCleared() throws Exception {
        putPositions("SS", "IF", "OF").andExpect(status().isOk());

        putPositions(null, null, null)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.primaryPosition").doesNotExist())
            .andExpect(jsonPath("$.tertiaryPosition").doesNotExist());
    }

    @Test
    void duplicateSlotIsRejected() throws Exception {
        putPositions("CF", "CF", null)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("doppelt")));
    }

    @Test
    void gapInProfileIsRejected() throws Exception {
        putPositions(null, "LF", null)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Erstposition")));
    }

    @Test
    void positionsForUnknownPlayerReturn404() throws Exception {
        mockMvc.perform(put("/api/players/999999/positions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"primary\":\"SS\",\"secondary\":null,\"tertiary\":null}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void timelineIsEmptyWithoutAtBats() throws Exception {
        mockMvc.perform(get("/api/players/" + player.getId() + "/batting-timeline"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void timelineHasOnePointPerGame_withGameMetadata() throws Exception {
        final Long gameDayId = createGameDay("2026-04-11");
        final Long gameId = firstGameId(gameDayId);
        seedAtBat(gameId, 1, AtBatResult.SINGLE);
        seedAtBat(gameId, 2, AtBatResult.STRIKEOUT);

        mockMvc.perform(get("/api/players/" + player.getId() + "/batting-timeline"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].gameId").value(gameId))
            .andExpect(jsonPath("$[0].date").value("2026-04-11"))
            .andExpect(jsonPath("$[0].seasonId").value(season.getId()))
            .andExpect(jsonPath("$[0].seasonName").value("Saison 2026"))
            .andExpect(jsonPath("$[0].year").value(2026))
            .andExpect(jsonPath("$[0].plateAppearances").value(2))
            .andExpect(jsonPath("$[0].hits").value(1))
            .andExpect(jsonPath("$[0].rollingAverage").value(0.5))
            .andExpect(jsonPath("$[0].provisional").value(true));
    }

    @Test
    void timelineIsChronological_oldestFirst() throws Exception {
        final Long earlyGame = firstGameId(createGameDay("2026-04-11"));
        final Long lateGame = firstGameId(createGameDay("2026-06-20"));
        seedAtBat(lateGame, 1, AtBatResult.SINGLE);
        seedAtBat(earlyGame, 1, AtBatResult.SINGLE);

        mockMvc.perform(get("/api/players/" + player.getId() + "/batting-timeline"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].gameId").value(earlyGame))
            .andExpect(jsonPath("$[1].gameId").value(lateGame));
    }

    @Test
    void timelineForUnknownPlayerReturns404() throws Exception {
        mockMvc.perform(get("/api/players/999999/batting-timeline"))
            .andExpect(status().isNotFound());
    }

    @Test
    void usageIsEmptyForPlayerWithoutHistory() throws Exception {
        mockMvc.perform(get("/api/players/" + player.getId() + "/usage"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameDaysAvailable").value(0))
            .andExpect(jsonPath("$.gameDaysPlayed").value(0))
            .andExpect(jsonPath("$.averageBattingOrder").doesNotExist());
    }

    @Test
    void usageCountsAvailabilityAppearancesAndBattingOrder() throws Exception {
        final Long gameDayId = createGameDay("2026-04-11");
        setAvailable(gameDayId, player.getId());
        // Schlagreihenfolge muss lueckenlos bei 1 beginnen — ein Einzelspieler schlaegt also 1.
        setLineup(firstGameId(gameDayId), 1);

        mockMvc.perform(get("/api/players/" + player.getId() + "/usage"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameDaysTotal").value(1))
            .andExpect(jsonPath("$.gameDaysAvailable").value(1))
            .andExpect(jsonPath("$.gameDaysPlayed").value(1))
            .andExpect(jsonPath("$.averageBattingOrder").value(1.0))
            .andExpect(jsonPath("$.battingOrderCounts.1").value(1));
    }

    @Test
    void usageSeparatesPledgeFromAppearance() throws Exception {
        // Zugesagt, aber nicht aufgestellt — genau der Unterschied, den ein Trainer sehen will.
        final Long gameDayId = createGameDay("2026-05-16");
        setAvailable(gameDayId, player.getId());

        mockMvc.perform(get("/api/players/" + player.getId() + "/usage"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameDaysAvailable").value(1))
            .andExpect(jsonPath("$.gameDaysPlayed").value(0));
    }

    @Test
    void usageCanBeScopedToOneYear() throws Exception {
        final Long gameDayId = createGameDay("2026-04-11");
        setAvailable(gameDayId, player.getId());

        mockMvc.perform(get("/api/players/" + player.getId() + "/usage").param("year", "2026"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameDaysAvailable").value(1));

        mockMvc.perform(get("/api/players/" + player.getId() + "/usage").param("year", "2025"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameDaysTotal").value(0))
            .andExpect(jsonPath("$.gameDaysAvailable").value(0));
    }

    @Test
    void usageCanBeScopedToOneSeason() throws Exception {
        final Long gameDayId = createGameDay("2026-04-11");
        setAvailable(gameDayId, player.getId());

        mockMvc.perform(get("/api/players/" + player.getId() + "/usage").param("seasonId", String.valueOf(season.getId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameDaysAvailable").value(1))
            // Trainings gehören zu keiner Saison und bleiben im Saison-Zuschnitt leer.
            .andExpect(jsonPath("$.trainingsTotal").value(0));

        mockMvc.perform(get("/api/players/" + player.getId() + "/usage").param("seasonId", "999999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameDaysTotal").value(0));
    }

    @Test
    void genderIsStoredAndCanBeCleared() throws Exception {
        mockMvc.perform(put("/api/players/" + player.getId() + "/gender")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"gender\":\"FEMALE\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gender").value("FEMALE"));

        mockMvc.perform(get("/api/players/" + player.getId()))
            .andExpect(jsonPath("$.gender").value("FEMALE"));

        // null loescht die Zuordnung — der Spieler zaehlt dann fuer keine Quote.
        mockMvc.perform(put("/api/players/" + player.getId() + "/gender")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"gender\":null}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gender").doesNotExist());
    }

    @Test
    void usageForUnknownPlayerReturns404() throws Exception {
        mockMvc.perform(get("/api/players/999999/usage"))
            .andExpect(status().isNotFound());
    }

    private org.springframework.test.web.servlet.ResultActions putPositions(
            final String primary, final String secondary, final String tertiary) throws Exception {
        final Map<String, String> body = new HashMap<>();
        body.put("primary", primary);
        body.put("secondary", secondary);
        body.put("tertiary", tertiary);
        return mockMvc.perform(put("/api/players/" + player.getId() + "/positions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)));
    }

    private Long createGameDay(final String date) throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", date))))
            .andExpect(status().isCreated())
            .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long firstGameId(final Long gameDayId) throws Exception {
        final MvcResult result = mockMvc.perform(get("/api/gamedays/" + gameDayId))
            .andExpect(status().isOk())
            .andReturn();
        final JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("games").get(0).get("id").asLong();
    }

    private void setAvailable(final Long gameDayId, final Long playerId) throws Exception {
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("playerIds", java.util.List.of(playerId)))))
            .andExpect(status().isOk());
    }

    private void setLineup(final Long gameId, final int battingOrder) throws Exception {
        final Map<String, Object> entry = new HashMap<>();
        entry.put("playerId", player.getId());
        entry.put("position", "SS");
        entry.put("battingOrder", battingOrder);
        mockMvc.perform(put("/api/games/" + gameId + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.List.of(entry))))
            .andExpect(status().isOk());
    }

    private void seedAtBat(final Long gameId, final int sequence, final AtBatResult result) {
        final GameEntity game = gameRepository.findById(gameId).orElseThrow();
        final AtBatEntity ab = new AtBatEntity();
        ab.setGame(game);
        ab.setBatter(player);
        ab.setSequence(sequence);
        ab.setInning(1);
        ab.setResult(result);
        ab.setRunsScored(0);
        ab.setRbi(0);
        ab.setCreatedBy("test");
        atBatRepository.save(ab);
    }

    // ---- Wie lange war ich nicht mehr da? ----

    @Autowired private SpringTrainingRepository trainingRepository;
    @Autowired private SpringTrainingAttendanceRepository attendanceRepository;

    private TrainingEntity training(final LocalDate datum, final boolean fuerAlle, final boolean abgesagt) {
        final TrainingEntity t = new TrainingEntity(datum, "19:00", "Halle");
        t.setOpenToAll(fuerAlle);
        t.setCancelled(abgesagt);
        return trainingRepository.save(t);
    }

    /**
     * Gezaehlt wird, was man haette wahrnehmen KOENNEN — und nur das.
     *
     * Vier Dinge zaehlen nicht gegen einen, und jedes davon waere ein Vorwurf, der nicht traegt:
     * der Termin, bei dem man war; ein abgesagter (da war niemand); einer, zu dem nur Pitcher und
     * Catcher geladen waren (den hat man nicht versaeumt); und einer, der noch bevorsteht.
     */
    @Test
    void zaehltNurVersaeumteTermineZuDenenAlleGeladenWaren() throws Exception {
        final PlayerEntity spieler = playerRepository.save(new PlayerEntity("Abwesend"));
        final LocalDate heute = LocalDate.now();

        final TrainingEntity besucht = training(heute.minusDays(40), true, false);
        attendanceRepository.save(new TrainingAttendanceEntity(besucht, spieler, true));

        training(heute.minusDays(30), true, false);   // zaehlt
        training(heute.minusDays(20), true, false);   // zaehlt
        training(heute.minusDays(10), true, true);    // abgesagt
        training(heute.minusDays(5), false, false);   // nur P/C
        training(heute.plusDays(3), true, false);     // steht noch bevor

        mockMvc.perform(get("/api/players/" + spieler.getId() + "/training-months")
                .param("year", String.valueOf(heute.getYear())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verpasstSeitdem").value(2));

        attendanceRepository.deleteAll();
        trainingRepository.deleteAll();
    }
}
