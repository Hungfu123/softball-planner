package com.softball.domain.service;

import com.softball.domain.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StandingsCalculatorTest {

    private StandingsCalculator calculator;

    private LeagueTeam ownTeam;
    private LeagueTeam opponent1;
    private LeagueTeam opponent2;

    @BeforeEach
    void setUp() {
        calculator = new StandingsCalculator();
        ownTeam = new LeagueTeam(1L, "Dead Sox", true);
        opponent1 = new LeagueTeam(2L, "Tigers", false);
        opponent2 = new LeagueTeam(3L, "Bears", false);
    }

    @Test
    void emptyData_returnsAllZeros() {
        final List<TeamStandings> result = calculator.calculate(
            List.of(ownTeam, opponent1), List.of(), List.of());

        assertThat(result).hasSize(2);
        assertThat(result.get(0).games()).isZero();
        assertThat(result.get(0).winPct()).isZero();
    }

    @Test
    void ownTeam_winsFromGames() {
        final Game game = gameWithScores(opponent1, 10, 5);

        final List<TeamStandings> result = calculator.calculate(
            List.of(ownTeam, opponent1), List.of(game), List.of());

        final TeamStandings own = findByTeamId(result, 1L);
        assertThat(own.wins()).isEqualTo(1);
        assertThat(own.losses()).isZero();
        assertThat(own.runsScored()).isEqualTo(10);
        assertThat(own.runsAgainst()).isEqualTo(5);
        assertThat(own.runDiff()).isEqualTo(5);
        assertThat(own.winPct()).isEqualTo(1.0);

        // Opponent sees the inverse
        final TeamStandings opp = findByTeamId(result, 2L);
        assertThat(opp.wins()).isZero();
        assertThat(opp.losses()).isEqualTo(1);
        assertThat(opp.runsScored()).isEqualTo(5);
        assertThat(opp.runsAgainst()).isEqualTo(10);
    }

    @Test
    void ownTeam_lossFromGames() {
        final Game game = gameWithScores(opponent1, 3, 7);

        final List<TeamStandings> result = calculator.calculate(
            List.of(ownTeam, opponent1), List.of(game), List.of());

        final TeamStandings own = findByTeamId(result, 1L);
        assertThat(own.losses()).isEqualTo(1);
        assertThat(own.wins()).isZero();
    }

    @Test
    void ownTeam_tieFromGames() {
        final Game game = gameWithScores(opponent1, 5, 5);

        final List<TeamStandings> result = calculator.calculate(
            List.of(ownTeam, opponent1), List.of(game), List.of());

        final TeamStandings own = findByTeamId(result, 1L);
        assertThat(own.ties()).isEqualTo(1);
        assertThat(own.wins()).isZero();
        assertThat(own.losses()).isZero();
    }

    @Test
    void gamesWithoutOpponentOrScores_areIgnored() {
        final Game noOpponent = gameWithScores(null, 10, 5);
        final Game noScoreUs = new Game(2L, 1);
        noScoreUs.setOpponentTeam(opponent1);
        noScoreUs.setScoreUs(null);
        noScoreUs.setScoreThem(5);

        final List<TeamStandings> result = calculator.calculate(
            List.of(ownTeam), List.of(noOpponent, noScoreUs), List.of());

        assertThat(findByTeamId(result, 1L).games()).isZero();
    }

    @Test
    void leagueResults_countForNonOwnTeams() {
        final LeagueResult result1 = new LeagueResult(1L, opponent1, opponent2, 8, 3, LocalDate.now());

        final List<TeamStandings> standings = calculator.calculate(
            List.of(ownTeam, opponent1, opponent2), List.of(), List.of(result1));

        // opponent1 is home, won 8-3
        final TeamStandings opp1 = findByTeamId(standings, 2L);
        assertThat(opp1.wins()).isEqualTo(1);
        assertThat(opp1.runsScored()).isEqualTo(8);
        assertThat(opp1.runsAgainst()).isEqualTo(3);

        // opponent2 is away, lost 3-8
        final TeamStandings opp2 = findByTeamId(standings, 3L);
        assertThat(opp2.losses()).isEqualTo(1);
        assertThat(opp2.runsScored()).isEqualTo(3);
        assertThat(opp2.runsAgainst()).isEqualTo(8);

        // ownTeam not involved in league result
        assertThat(findByTeamId(standings, 1L).games()).isZero();
    }

    @Test
    void combinedGamesAndLeagueResults() {
        final Game game1 = gameWithScores(opponent1, 10, 2);  // own wins vs opponent1
        final Game game2 = gameWithScores(opponent1, 4, 6);   // own loses vs opponent1
        final LeagueResult lr = new LeagueResult(1L, opponent1, opponent2, 5, 5, LocalDate.now());

        final List<TeamStandings> standings = calculator.calculate(
            List.of(ownTeam, opponent1, opponent2), List.of(game1, game2), List.of(lr));

        // Own: 1W 1L from games
        final TeamStandings own = findByTeamId(standings, 1L);
        assertThat(own.wins()).isEqualTo(1);
        assertThat(own.losses()).isEqualTo(1);
        assertThat(own.winPct()).isEqualTo(0.5);

        // Opponent1: 1W 1L from games + 1 tie from LR = 3 games
        final TeamStandings opp1 = findByTeamId(standings, 2L);
        assertThat(opp1.games()).isEqualTo(3);
        assertThat(opp1.wins()).isEqualTo(1);
        assertThat(opp1.losses()).isEqualTo(1);
        assertThat(opp1.ties()).isEqualTo(1);
    }

    @Test
    void sortedByWinPct_thenRunDiff() {
        final Game game1 = gameWithScores(opponent1, 10, 2);  // own wins
        // opponent1 and opponent2 play in league — opponent2 wins big
        final LeagueResult lr = new LeagueResult(1L, opponent2, opponent1, 15, 1, LocalDate.now());

        final List<TeamStandings> standings = calculator.calculate(
            List.of(ownTeam, opponent1, opponent2), List.of(game1), List.of(lr));

        // ownTeam: 1.0 winPct, opponent2: 1.0 winPct, opponent1: 0.0 winPct
        // ownTeam runDiff = 8, opponent2 runDiff = 14
        assertThat(standings.get(0).team().getId()).isEqualTo(3L); // opponent2 first (higher runDiff)
        assertThat(standings.get(1).team().getId()).isEqualTo(1L); // ownTeam second
        assertThat(standings.get(2).team().getId()).isEqualTo(2L); // opponent1 last
    }

    @Test
    void winPct_roundedToThreeDecimals() {
        // 1 win, 2 losses = 0.333...
        final Game game1 = gameWithScores(opponent1, 10, 2);
        final Game game2 = gameWithScores(opponent1, 2, 10);
        final Game game3 = gameWithScores(opponent1, 2, 10);

        final List<TeamStandings> standings = calculator.calculate(
            List.of(ownTeam), List.of(game1, game2, game3), List.of());

        assertThat(findByTeamId(standings, 1L).winPct()).isEqualTo(0.333);
    }

    // --- helpers ---

    private Game gameWithScores(final LeagueTeam opponent, final int scoreUs, final int scoreThem) {
        final Game game = new Game(100L + scoreUs, 1);
        game.setOpponentTeam(opponent);
        game.setScoreUs(scoreUs);
        game.setScoreThem(scoreThem);
        return game;
    }

    private TeamStandings findByTeamId(final List<TeamStandings> standings, final Long teamId) {
        return standings.stream()
            .filter(s -> s.team().getId().equals(teamId))
            .findFirst()
            .orElseThrow(() -> new AssertionError("Team " + teamId + " not found"));
    }
}
