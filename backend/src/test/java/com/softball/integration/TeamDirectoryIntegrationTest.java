package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.http.MediaType;
import com.softball.MitSuperadmin;
import org.springframework.test.context.ActiveProfiles;
import com.softball.TestcontainersConfig;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class TeamDirectoryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SpringSeasonRepository seasonRepository;

    @Autowired
    private SpringLeagueTeamRepository leagueTeamRepository;

    @Autowired
    private SpringGameDayRepository gameDayRepository;

    @Autowired
    private SpringGameRepository gameRepository;

    @Autowired
    private SpringAtBatRepository atBatRepository;

    @Autowired
    private SpringPlayerRepository playerRepository;

    @AfterEach
    void tearDown() {
        atBatRepository.deleteAll();
        playerRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        leagueTeamRepository.deleteAll();
        seasonRepository.deleteAll();
    }

    private GameEntity gameVs(final GameDayEntity gameDay, final LeagueTeamEntity opponent,
                              final int gameNumber, final Integer scoreUs, final Integer scoreThem) {
        final GameEntity game = new GameEntity(gameNumber, gameDay);
        game.setOpponentTeam(opponent);
        game.setScoreUs(scoreUs);
        game.setScoreThem(scoreThem);
        return gameRepository.save(game);
    }

    @Test
    void directory_mergesClubAcrossLeagues_withRecordAndDelete() throws Exception {
        final SeasonEntity college = seasonRepository.save(new SeasonEntity("College Series", 2026));
        final SeasonEntity rfl = seasonRepository.save(new SeasonEntity("Ruhr Fun Liga", 2026));
        leagueTeamRepository.save(new LeagueTeamEntity(college, "Dead Sox", true));
        leagueTeamRepository.save(new LeagueTeamEntity(college, "Sharks", false));
        leagueTeamRepository.save(new LeagueTeamEntity(rfl, "Dead Sox", true));
        final LeagueTeamEntity sharksRfl = leagueTeamRepository.save(new LeagueTeamEntity(rfl, "Sharks", false));
        leagueTeamRepository.save(new LeagueTeamEntity(rfl, "Bears", false));

        final GameDayEntity gameDay = gameDayRepository.save(new GameDayEntity(LocalDate.of(2026, 5, 1), "Test", "Daheim", college));
        final LeagueTeamEntity sharksCollege = leagueTeamRepository.findAll().stream()
            .filter(t -> "Sharks".equals(t.getName()) && t.getSeason().getId().equals(college.getId())).findFirst().orElseThrow();
        gameVs(gameDay, sharksCollege, 1, 10, 3);  // Win
        gameVs(gameDay, sharksCollege, 2, 2, 4);   // Loss
        gameVs(gameDay, sharksRfl, 1, 5, 5);       // Tie

        mockMvc.perform(get("/api/teams/directory"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2)) // Sharks + Bears; Dead Sox ist raus
            .andExpect(jsonPath("$[?(@.clubName == 'Sharks')].games").value(3))
            .andExpect(jsonPath("$[?(@.clubName == 'Sharks')].wins").value(1))
            .andExpect(jsonPath("$[?(@.clubName == 'Sharks')].losses").value(1))
            .andExpect(jsonPath("$[?(@.clubName == 'Sharks')].ties").value(1))
            .andExpect(jsonPath("$[?(@.clubName == 'Sharks')].runsFor").value(17))
            .andExpect(jsonPath("$[?(@.clubName == 'Sharks')].runsAgainst").value(12))
            .andExpect(jsonPath("$[?(@.clubName == 'Sharks')].leagues.length()").value(2))
            .andExpect(jsonPath("$[?(@.clubName == 'Bears')].games").value(0))
            .andExpect(jsonPath("$[?(@.clubName == 'Bears')].wins").value(0))
            .andExpect(jsonPath("$[?(@.clubName == 'Bears')].leagues.length()").value(1));
    }

    @Test
    void directory_usesLiveScoreOnceGameIsScored() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Ruhr Fun Liga", 2026));
        final LeagueTeamEntity bears = leagueTeamRepository.save(new LeagueTeamEntity(season, "Bears", false));
        final GameDayEntity gameDay = gameDayRepository.save(new GameDayEntity(LocalDate.of(2026, 5, 1), "Test", "Daheim", season));

        // DB sagt 0:5 (Niederlage), aber das Spiel wurde gescort: 6 Runs aus At-Bats → 6:5 Sieg
        final GameEntity scoredGame = gameVs(gameDay, bears, 1, 0, 5);
        final PlayerEntity batter = playerRepository.save(new PlayerEntity("Anna"));
        for (int i = 1; i <= 6; i++) {
            final AtBatEntity ab = new AtBatEntity();
            ab.setGame(scoredGame);
            ab.setBatter(batter);
            ab.setSequence(i);
            ab.setInning(1);
            ab.setResult(AtBatResult.HOMERUN);
            ab.setRunsScored(1);
            ab.setCreatedBy("test");
            atBatRepository.save(ab);
        }

        mockMvc.perform(get("/api/teams/directory"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.clubName == 'Bears')].wins").value(1))
            .andExpect(jsonPath("$[?(@.clubName == 'Bears')].losses").value(0))
            .andExpect(jsonPath("$[?(@.clubName == 'Bears')].runsFor").value(6))
            .andExpect(jsonPath("$[?(@.clubName == 'Bears')].runsAgainst").value(5));
    }

    @Test
    void renameClub_renamesAllLeagueRows_caseInsensitive() throws Exception {
        final SeasonEntity s1 = seasonRepository.save(new SeasonEntity("College Series", 2026));
        final SeasonEntity s2 = seasonRepository.save(new SeasonEntity("Indoor Series", 2026));
        leagueTeamRepository.save(new LeagueTeamEntity(s1, "Aachen", false));
        leagueTeamRepository.save(new LeagueTeamEntity(s2, " aachen ", false));
        leagueTeamRepository.save(new LeagueTeamEntity(s1, "Bears", false));

        mockMvc.perform(put("/api/teams/directory/rename")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    java.util.Map.of("currentName", "AACHEN", "newName", "Aachen Aixplosives"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.clubName == 'Aachen Aixplosives')].leagues.length()").value(2))
            .andExpect(jsonPath("$[?(@.clubName == 'Aachen')]").doesNotExist());

        assertThat(leagueTeamRepository.findAll().stream()
            .filter(t -> "Aachen Aixplosives".equals(t.getName().trim()))).hasSize(2);
        assertThat(leagueTeamRepository.findAll().stream()
            .filter(t -> "Bears".equals(t.getName()))).hasSize(1); // andere unangetastet
    }

    @Test
    void renameClub_unknownName_returns400() throws Exception {
        leagueTeamRepository.save(new LeagueTeamEntity(seasonRepository.save(new SeasonEntity("Liga", 2026)), "Bears", false));

        mockMvc.perform(put("/api/teams/directory/rename")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    java.util.Map.of("currentName", "Gibtsnicht", "newName", "X"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Kein Team")));
    }
}
