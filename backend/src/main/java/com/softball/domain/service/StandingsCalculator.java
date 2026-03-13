package com.softball.domain.service;

import com.softball.domain.model.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class StandingsCalculator {

    public List<TeamStandings> calculate(final List<LeagueTeam> teams,
                                          final List<Game> gamesWithScores,
                                          final List<LeagueResult> leagueResults) {
        final List<TeamStandings> standings = new ArrayList<>();
        for (final LeagueTeam team : teams) {
            standings.add(calculateForTeam(team, gamesWithScores, leagueResults));
        }

        standings.sort(Comparator
            .<TeamStandings, Double>comparing(TeamStandings::winPct, Comparator.reverseOrder())
            .thenComparing(TeamStandings::runDiff, Comparator.reverseOrder()));

        return standings;
    }

    TeamStandings calculateForTeam(final LeagueTeam team, final List<Game> allGames,
                                    final List<LeagueResult> leagueResults) {
        int wins = 0, losses = 0, ties = 0, runsScored = 0, runsAgainst = 0;

        // 1. Ergebnisse aus eigenen Spielen (Game-Entity)
        if (team.isOwnTeam()) {
            for (final Game game : allGames) {
                if (game.getOpponentTeam() != null && game.getScoreUs() != null && game.getScoreThem() != null) {
                    runsScored += game.getScoreUs();
                    runsAgainst += game.getScoreThem();
                    if (game.getScoreUs() > game.getScoreThem()) {
                        wins++;
                    } else if (game.getScoreUs() < game.getScoreThem()) {
                        losses++;
                    } else {
                        ties++;
                    }
                }
            }
        } else {
            for (final Game game : allGames) {
                if (game.getOpponentTeam() != null && game.getOpponentTeam().getId().equals(team.getId())
                    && game.getScoreUs() != null && game.getScoreThem() != null) {
                    runsScored += game.getScoreThem();
                    runsAgainst += game.getScoreUs();
                    if (game.getScoreThem() > game.getScoreUs()) {
                        wins++;
                    } else if (game.getScoreThem() < game.getScoreUs()) {
                        losses++;
                    } else {
                        ties++;
                    }
                }
            }
        }

        // 2. Ergebnisse aus Liga-Ergebnissen (nur zwischen Nicht-ownTeam Teams)
        for (final LeagueResult result : leagueResults) {
            final boolean isHome = result.getHomeTeam().getId().equals(team.getId());
            final boolean isAway = result.getAwayTeam().getId().equals(team.getId());
            if (!isHome && !isAway) {
                continue;
            }

            final int scored = isHome ? result.getHomeScore() : result.getAwayScore();
            final int against = isHome ? result.getAwayScore() : result.getHomeScore();
            runsScored += scored;
            runsAgainst += against;
            if (scored > against) {
                wins++;
            } else if (scored < against) {
                losses++;
            } else {
                ties++;
            }
        }

        final int totalGames = wins + losses + ties;
        final double winPct = totalGames > 0 ? (double) wins / totalGames : 0.0;

        return new TeamStandings(
            team, totalGames, wins, losses, ties,
            Math.round(winPct * 1000.0) / 1000.0,
            runsScored, runsAgainst, runsScored - runsAgainst
        );
    }
}
