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
    void opponentOverview_andSplits_areSeparatedByTeam() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        final PlayerEntity p1 = playerRepository.save(new PlayerEntity("Anna"));
        final PlayerEntity p2 = playerRepository.save(new PlayerEntity("Ben"));
        final LeagueTeamEntity sharks = leagueTeamRepository.save(new LeagueTeamEntity(season, "Sharks", false));
        final LeagueTeamEntity bears = leagueTeamRepository.save(new LeagueTeamEntity(season, "Bears", false));

        final GameDayEntity gameDay = gameDayRepository.save(new GameDayEntity(LocalDate.of(2026, 5, 1), "Test", "Daheim", season));
        final GameEntity gameVsSharks = gameVs(gameDay, sharks, 1);
        final GameEntity gameVsBears = gameVs(gameDay, bears, 2);

        // vs Sharks: Anna 2 Hits aus 2 AB, Ben 1 aus 2
        atBat(gameVsSharks, p1, 1, AtBatResult.SINGLE);
        atBat(gameVsSharks, p1, 2, AtBatResult.HOMERUN);
        atBat(gameVsSharks, p2, 3, AtBatResult.STRIKEOUT);
        atBat(gameVsSharks, p2, 4, AtBatResult.DOUBLE);
        // vs Bears: Anna 1 aus 2
        atBat(gameVsBears, p1, 1, AtBatResult.OUT);
        atBat(gameVsBears, p1, 2, AtBatResult.SINGLE);

        // Overview: Sharks = 4 AB (alle zählen), 3 Hits → AVG .750; Bears = 2 AB, 1 Hit → .500
        mockMvc.perform(get("/api/stats/opponents"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.teamName == 'Sharks')].atBats").value(4))
            .andExpect(jsonPath("$[?(@.teamName == 'Sharks')].hits").value(3))
            .andExpect(jsonPath("$[?(@.teamName == 'Sharks')].battingAverage").value(0.750))
            .andExpect(jsonPath("$[?(@.teamName == 'Bears')].atBats").value(2))
            .andExpect(jsonPath("$[?(@.teamName == 'Bears')].hits").value(1))
            .andExpect(jsonPath("$[?(@.teamName == 'Bears')].battingAverage").value(0.500))
            .andExpect(jsonPath("$[?(@.teamName == 'Sharks')].games").value(1))
            .andExpect(jsonPath("$[?(@.teamName == 'Bears')].games").value(1));

        // Split vs Sharks: Annas AVG dort = 1.000, Bens = .500
        mockMvc.perform(get("/api/stats/opponents/" + sharks.getId() + "/batting"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.playerName == 'Anna')].battingAverage").value(1.000))
            .andExpect(jsonPath("$[?(@.playerName == 'Anna')].atBats").value(2))
            .andExpect(jsonPath("$[?(@.playerName == 'Ben')].battingAverage").value(0.500));

        // Split vs Bears: nur Anna mit Daten (2 AB, 1 Hit → .500)
        mockMvc.perform(get("/api/stats/opponents/" + bears.getId() + "/batting"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.playerName == 'Anna')].battingAverage").value(0.500))
            .andExpect(jsonPath("$[?(@.playerName == 'Ben')]").doesNotExist());
    }

    @Test
    void opponentOverview_ignoresGamesWithoutOpponent() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
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
