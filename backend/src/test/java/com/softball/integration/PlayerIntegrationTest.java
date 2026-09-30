package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.AtBatEntity;
import com.softball.adapter.out.persistence.entity.GameDayEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.GameStaffEntity;
import com.softball.adapter.out.persistence.entity.LineupEntryEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.entity.TrainingAttendanceEntity;
import com.softball.adapter.out.persistence.entity.TrainingEntity;
import com.softball.adapter.out.persistence.repository.SpringAtBatRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringGameStaffRepository;
import com.softball.adapter.out.persistence.repository.SpringLineupEntryRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingAttendanceRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingRepository;
import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.Position;
import com.softball.domain.model.StaffRole;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import com.softball.TestcontainersConfig;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class PlayerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SpringPlayerRepository playerRepository;

    @Autowired
    private SpringSeasonRepository seasonRepository;

    @Autowired
    private SpringGameDayRepository gameDayRepository;

    @Autowired
    private SpringGameRepository gameRepository;

    @Autowired
    private SpringLineupEntryRepository lineupEntryRepository;

    @Autowired
    private SpringGameStaffRepository gameStaffRepository;

    @Autowired
    private SpringTrainingRepository trainingRepository;

    @Autowired
    private SpringTrainingAttendanceRepository trainingAttendanceRepository;

    @Autowired
    private SpringAtBatRepository atBatRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @AfterEach
    void tearDown() {
        atBatRepository.deleteAll();
        trainingAttendanceRepository.deleteAll();
        trainingRepository.deleteAll();
        gameStaffRepository.deleteAll();
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void createAndListPlayers() throws Exception {
        mockMvc.perform(post("/api/players")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Max"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Max"))
            .andExpect(jsonPath("$.id").isNumber());

        mockMvc.perform(get("/api/players"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.name == 'Max')]").exists());
    }

    @Test
    void updatePlayer() throws Exception {
        final PlayerEntity player = playerRepository.save(new PlayerEntity("Max"));

        mockMvc.perform(put("/api/players/" + player.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Maxi"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Maxi"));
    }

    @Test
    void deletePlayer_notFound_returns404() throws Exception {
        mockMvc.perform(delete("/api/players/99999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void deletePlayer() throws Exception {
        final PlayerEntity player = playerRepository.save(new PlayerEntity("Max"));

        mockMvc.perform(delete("/api/players/" + player.getId()))
            .andExpect(status().isNoContent());

        assertThat(playerRepository.findById(player.getId())).isEmpty();
    }

    @Test
    void deletePlayer_withPlanningReferences_cleansUpAndSucceeds() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        final PlayerEntity deletedPlayer = playerRepository.save(new PlayerEntity("Weg"));
        final PlayerEntity otherPlayer = playerRepository.save(new PlayerEntity("Bleibt"));

        final GameDayEntity gameDay = gameDayRepository.save(new GameDayEntity(LocalDate.of(2026, 5, 1), "Test", "Daheim", season));
        gameDay.setAvailablePlayers(Set.of(deletedPlayer, otherPlayer));
        gameDayRepository.save(gameDay);

        final GameEntity game = gameRepository.save(new GameEntity(1, gameDayRepository.findById(gameDay.getId()).orElseThrow()));

        // Spieler im Lineup (Batting 2), OtherPlayer auf Batting 1 mit DH-Batter = gelöschter Spieler
        lineupEntryRepository.save(new LineupEntryEntity(game, otherPlayer, Position.P, 1, deletedPlayer));
        lineupEntryRepository.save(new LineupEntryEntity(game, deletedPlayer, Position.SS, 2));
        gameStaffRepository.save(new GameStaffEntity(game, deletedPlayer, StaffRole.BASE_COACH_1ST));

        final TrainingEntity training = trainingRepository.save(new TrainingEntity(LocalDate.of(2026, 4, 28), "18:00", "Platz"));
        trainingAttendanceRepository.save(new TrainingAttendanceEntity(training, deletedPlayer, true));

        mockMvc.perform(delete("/api/players/" + deletedPlayer.getId()))
            .andExpect(status().isNoContent());

        assertThat(playerRepository.findById(deletedPlayer.getId())).isEmpty();
        // Lineup-Eintrag weg, Batting-Order neu nummeriert, DH-Referenz genullt
        final var remainingEntries = lineupEntryRepository.findAll();
        assertThat(remainingEntries).hasSize(1);
        assertThat(remainingEntries.get(0).getPlayer().getId()).isEqualTo(otherPlayer.getId());
        assertThat(remainingEntries.get(0).getBattingOrder()).isEqualTo(1);
        assertThat(remainingEntries.get(0).getDhBatterPlayer()).isNull();
        assertThat(gameStaffRepository.findAll()).isEmpty();
        assertThat(trainingAttendanceRepository.findAll()).isEmpty();
        // Availability bereinigt
        final var reloadedGameDay = gameDayRepository.findByIdWithPlayers(gameDay.getId()).orElseThrow();
        assertThat(reloadedGameDay.getAvailablePlayers())
            .extracting(PlayerEntity::getId)
            .containsExactly(otherPlayer.getId());
    }

    @Test
    void deletePlayer_withAtBatScoringData_returns400AndKeepsPlayer() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        final PlayerEntity scorer = playerRepository.save(new PlayerEntity("Scorer"));

        final GameDayEntity gameDay = gameDayRepository.save(new GameDayEntity(LocalDate.of(2026, 5, 1), "Test", "Daheim", season));
        final GameEntity game = gameRepository.save(new GameEntity(1, gameDay));

        final AtBatEntity atBat = new AtBatEntity();
        atBat.setGame(game);
        atBat.setBatter(scorer);
        atBat.setSequence(1);
        atBat.setInning(1);
        atBat.setResult(AtBatResult.SINGLE);
        atBat.setCreatedBy("test");
        atBatRepository.save(atBat);

        mockMvc.perform(delete("/api/players/" + scorer.getId()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Scoring-Daten")));

        assertThat(playerRepository.findById(scorer.getId())).isPresent();
    }

    @Test
    void archivePlayer_cleansPlanningRefs_andHidesFromDefaultList() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        final PlayerEntity archivedPlayer = playerRepository.save(new PlayerEntity("Ex"));
        final PlayerEntity activePlayer = playerRepository.save(new PlayerEntity("Aktiv"));

        final GameDayEntity gameDay = gameDayRepository.save(new GameDayEntity(LocalDate.of(2026, 5, 1), "Test", "Daheim", season));
        gameDay.setAvailablePlayers(Set.of(archivedPlayer, activePlayer));
        gameDayRepository.save(gameDay);

        final GameEntity game = gameRepository.save(new GameEntity(1, gameDayRepository.findById(gameDay.getId()).orElseThrow()));
        lineupEntryRepository.save(new LineupEntryEntity(game, archivedPlayer, Position.SS, 1));
        gameStaffRepository.save(new GameStaffEntity(game, archivedPlayer, StaffRole.BASE_COACH_1ST));

        final TrainingEntity training = trainingRepository.save(new TrainingEntity(LocalDate.of(2026, 4, 28), "18:00", "Platz"));
        trainingAttendanceRepository.save(new TrainingAttendanceEntity(training, archivedPlayer, true));

        mockMvc.perform(put("/api/players/" + archivedPlayer.getId() + "/archive"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.archived").value(true));

        // Spieler bleibt in der DB (Historie!), aber Standard-Liste zeigt nur Aktive
        assertThat(playerRepository.findById(archivedPlayer.getId())).isPresent();
        mockMvc.perform(get("/api/players"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == %d)].name".formatted(archivedPlayer.getId())).doesNotExist())
            .andExpect(jsonPath("$[?(@.id == %d)].name".formatted(activePlayer.getId())).exists());
        mockMvc.perform(get("/api/players?includeArchived=true"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == %d)].archived".formatted(archivedPlayer.getId())).value(true));

        // Planungs-Referenzen bereinigt
        assertThat(lineupEntryRepository.findAll()).isEmpty();
        assertThat(gameStaffRepository.findAll()).isEmpty();
        assertThat(trainingAttendanceRepository.findAll()).isEmpty();
        final var reloadedGameDay = gameDayRepository.findByIdWithPlayers(gameDay.getId()).orElseThrow();
        assertThat(reloadedGameDay.getAvailablePlayers())
            .extracting(PlayerEntity::getId)
            .containsExactly(activePlayer.getId());
    }

    @Test
    void archivePlayer_withAtBatScoringData_succeeds_andDisappearsFromStats() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        final PlayerEntity scorer = playerRepository.save(new PlayerEntity("Scorer"));
        final PlayerEntity activePlayer = playerRepository.save(new PlayerEntity("Aktiv"));

        final GameDayEntity gameDay = gameDayRepository.save(new GameDayEntity(LocalDate.of(2026, 5, 1), "Test", "Daheim", season));
        final GameEntity game = gameRepository.save(new GameEntity(1, gameDay));

        final AtBatEntity atBat = new AtBatEntity();
        atBat.setGame(game);
        atBat.setBatter(scorer);
        atBat.setSequence(1);
        atBat.setInning(1);
        atBat.setResult(AtBatResult.SINGLE);
        atBat.setCreatedBy("test");
        atBatRepository.save(atBat);
        final AtBatEntity atBatActive = new AtBatEntity();
        atBatActive.setGame(game);
        atBatActive.setBatter(activePlayer);
        atBatActive.setSequence(2);
        atBatActive.setInning(1);
        atBatActive.setResult(AtBatResult.DOUBLE);
        atBatActive.setCreatedBy("test");
        atBatRepository.save(atBatActive);

        mockMvc.perform(put("/api/players/" + scorer.getId() + "/archive"))
            .andExpect(status().isOk());

        // Stats: archivierter Spieler raus, aktiver bleibt — Events bleiben in der DB
        mockMvc.perform(get("/api/seasons/" + season.getId() + "/batting-stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.playerName == 'Scorer')]").doesNotExist())
            .andExpect(jsonPath("$[?(@.playerName == 'Aktiv')]").exists());
        assertThat(atBatRepository.count()).isEqualTo(2);
    }

    @Test
    void unarchivePlayer_showsAgainInDefaultList() throws Exception {
        final PlayerEntity player = playerRepository.save(new PlayerEntity("KommBack"));

        mockMvc.perform(put("/api/players/" + player.getId() + "/archive"))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/players/" + player.getId() + "/unarchive"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.archived").value(false));

        mockMvc.perform(get("/api/players"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.name == 'KommBack')]").exists());
    }
}
