package com.softball.integration;

import com.softball.adapter.out.persistence.entity.AtBatEntity;
import com.softball.adapter.out.persistence.entity.GameDayEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.LeagueTeamEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringAtBatRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringLeagueTeamRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.domain.model.AtBatResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import com.softball.TestcontainersConfig;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class OpponentBattingStatsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SpringSeasonRepository seasonRepository;

    @Autowired
    private SpringPlayerRepository playerRepository;

    @Autowired
    private SpringLeagueTeamRepository leagueTeamRepository;

    @Autowired
    private SpringGameDayRepository gameDayRepository;

    @Autowired
    private SpringGameRepository gameRepository;

    @Autowired
    private SpringAtBatRepository atBatRepository;

    private GameEntity gameVs(final GameDayEntity gameDay, final LeagueTeamEntity opponent, final int gameNumber) {
        final GameEntity game = new GameEntity(gameNumber, gameDay);
        game.setOpponentTeam(opponent);
        return gameRepository.save(game);
    }

    private void atBat(final GameEntity game, final PlayerEntity batter, final int sequence, final AtBatResult result) {
        final AtBatEntity ab = new AtBatEntity();
        ab.setGame(game);
        ab.setBatter(batter);
        ab.setSequence(sequence);
        ab.setInning(1);
        ab.setResult(result);
        ab.setCreatedBy("test");
        atBatRepository.save(ab);
    }

    @AfterEach
    void tearDown() {
        atBatRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        leagueTeamRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void opponentOverview_andSplits_mergeSameTeamAcrossSeasons() throws Exception {
        // Zwei "Saisons" = zwei Ligen (College Series + Indoor) — Sharks existiert in BEIDEN
        final SeasonEntity college = seasonRepository.save(new SeasonEntity("College Series 2026", 2026));
        final SeasonEntity indoor = seasonRepository.save(new SeasonEntity("Indoor Series 2026", 2026));
        final PlayerEntity anna = playerRepository.save(new PlayerEntity("Anna"));
        final LeagueTeamEntity sharksCollege = leagueTeamRepository.save(new LeagueTeamEntity(college, "Sharks", false));
        final LeagueTeamEntity sharksIndoor = leagueTeamRepository.save(new LeagueTeamEntity(indoor, "Sharks", false));
        final LeagueTeamEntity bears = leagueTeamRepository.save(new LeagueTeamEntity(college, "Bears", false));

        final GameDayEntity collegeDay = gameDayRepository.save(new GameDayEntity(LocalDate.of(2026, 5, 1), "Test", "Daheim", college));
        final GameDayEntity indoorDay = gameDayRepository.save(new GameDayEntity(LocalDate.of(2026, 1, 31), "Winter", "Halle", indoor));
        final GameEntity gameCollege = gameVs(collegeDay, sharksCollege, 1);
        final GameEntity gameIndoor = gameVs(indoorDay, sharksIndoor, 1);
        final GameEntity gameVsBears = gameVs(collegeDay, bears, 2);

        // vs Sharks (College): Anna 2 Hits aus 2 AB
        atBat(gameCollege, anna, 1, AtBatResult.SINGLE);
        atBat(gameCollege, anna, 2, AtBatResult.HOMERUN);
        // vs Sharks (Indoor): Anna 1 aus 2
        atBat(gameIndoor, anna, 1, AtBatResult.OUT);
        atBat(gameIndoor, anna, 2, AtBatResult.SINGLE);
        // vs Bears: Anna 1 aus 2
        atBat(gameVsBears, anna, 1, AtBatResult.OUT);
        atBat(gameVsBears, anna, 2, AtBatResult.SINGLE);

        // Overview: Sharks aus BEIDEN Ligen zu EINER Zeile fusioniert: 2 Spiele, 4 AB, 3 Hits → .750
        mockMvc.perform(get("/api/stats/opponents"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[?(@.teamName == 'Sharks')].games").value(2))
            .andExpect(jsonPath("$[?(@.teamName == 'Sharks')].atBats").value(4))
            .andExpect(jsonPath("$[?(@.teamName == 'Sharks')].hits").value(3))
            .andExpect(jsonPath("$[?(@.teamName == 'Sharks')].battingAverage").value(0.750))
            .andExpect(jsonPath("$[?(@.teamName == 'Bears')].games").value(1))
            .andExpect(jsonPath("$[?(@.teamName == 'Bears')].battingAverage").value(0.500));

        // Split über den NAMEN: vereint beide Sharks-Team-Zeilen → 4 AB, 3 Hits → .750
        mockMvc.perform(get("/api/stats/opponents/batting").param("team", "Sharks"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.playerName == 'Anna')].atBats").value(4))
            .andExpect(jsonPath("$[?(@.playerName == 'Anna')].hits").value(3))
            .andExpect(jsonPath("$[?(@.playerName == 'Anna')].battingAverage").value(0.750));

        // Bears-Split: nur die Bears-At-Bats
        mockMvc.perform(get("/api/stats/opponents/batting").param("team", "Bears"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.playerName == 'Anna')].atBats").value(2))
            .andExpect(jsonPath("$[?(@.playerName == 'Anna')].battingAverage").value(0.500));
    }

    @Test
    void opponentOverview_ignoresGamesWithoutOpponent() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("College Series 2026", 2026));
        final LeagueTeamEntity team = leagueTeamRepository.save(new LeagueTeamEntity(season, "Sharks", false));
        final GameDayEntity gameDay = gameDayRepository.save(new GameDayEntity(LocalDate.of(2026, 6, 1), "Test", "Daheim", season));

        gameVs(gameDay, team, 1);
        // Spiel ohne Gegner — darf nicht als eigene Overview-Zeile auftauchen
        gameRepository.save(new GameEntity(2, gameDay));

        mockMvc.perform(get("/api/stats/opponents"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[?(@.teamName == 'Sharks')].games").value(1));
    }
}
