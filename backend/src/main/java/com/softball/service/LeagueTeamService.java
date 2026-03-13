package com.softball.service;

import com.softball.dto.StandingsEntry;
import com.softball.dto.LeagueTeamResponse;
import com.softball.entity.Game;
import com.softball.entity.LeagueResult;
import com.softball.entity.LeagueTeam;
import com.softball.entity.Season;
import com.softball.exception.BusinessValidationException;
import com.softball.exception.ResourceNotFoundException;
import com.softball.repository.GameRepository;
import com.softball.repository.LeagueResultRepository;
import com.softball.repository.LeagueTeamRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class LeagueTeamService {

    private static final Logger log = LoggerFactory.getLogger(LeagueTeamService.class);

    private final LeagueTeamRepository leagueTeamRepository;
    private final SeasonService seasonService;
    private final GameRepository gameRepository;
    private final LeagueResultRepository leagueResultRepository;

    public LeagueTeamService(final LeagueTeamRepository leagueTeamRepository,
                             final SeasonService seasonService, final GameRepository gameRepository,
                             final LeagueResultRepository leagueResultRepository) {
        this.leagueTeamRepository = leagueTeamRepository;
        this.seasonService = seasonService;
        this.gameRepository = gameRepository;
        this.leagueResultRepository = leagueResultRepository;
    }

    @Transactional(readOnly = true)
    public List<LeagueTeam> findBySeasonId(final Long seasonId) {
        return leagueTeamRepository.findBySeason_IdOrderByNameAsc(seasonId);
    }

    @Transactional
    public LeagueTeam create(final Long seasonId, final String name, final boolean ownTeam) {
        final Season season = seasonService.findById(seasonId);

        // Name muss in der Season eindeutig sein (case-insensitive)
        if (leagueTeamRepository.findBySeason_IdAndNameIgnoreCase(seasonId, name).isPresent()) {
            throw new BusinessValidationException("Team '" + name + "' existiert bereits in dieser Saison");
        }

        log.info("Team erstellen: Saison={}, Name={}, ownTeam={}", seasonId, name, ownTeam);
        return leagueTeamRepository.save(new LeagueTeam(season, name, ownTeam));
    }

    @Transactional
    public LeagueTeam update(final Long teamId, final String name, final Boolean ownTeam) {
        final LeagueTeam team = findById(teamId);

        if (name != null && !name.isBlank()) {
            // Pruefen ob der neue Name schon vergeben ist
            final Optional<LeagueTeam> existing = leagueTeamRepository.findBySeason_IdAndNameIgnoreCase(
                team.getSeason().getId(), name);
            if (existing.isPresent() && !existing.get().getId().equals(teamId)) {
                throw new BusinessValidationException("Team '" + name + "' existiert bereits in dieser Saison");
            }
            team.setName(name);
        }
        if (ownTeam != null) {
            team.setOwnTeam(ownTeam);
        }

        return leagueTeamRepository.save(team);
    }

    @Transactional
    public void delete(final Long teamId) {
        final LeagueTeam team = findById(teamId);
        if (team.isOwnTeam()) {
            throw new BusinessValidationException("Das eigene Team kann nicht geloescht werden");
        }
        log.info("Team loeschen: {} ({})", team.getName(), teamId);

        // Alle Games die dieses Team als Gegner haben -> opponentTeam auf null setzen
        final List<Game> gamesWithTeam = gameRepository.findByOpponentTeam_Id(teamId);
        gamesWithTeam.forEach(game -> game.setOpponentTeam(null));
        gameRepository.saveAll(gamesWithTeam);

        // Alle LeagueResults loeschen wo dieses Team beteiligt ist
        leagueResultRepository.deleteAll(leagueResultRepository.findByHomeTeam_IdOrAwayTeam_Id(teamId, teamId));

        leagueTeamRepository.deleteById(teamId);
    }

    public LeagueTeam findById(final Long id) {
        return leagueTeamRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("LeagueTeam", id));
    }

    @Transactional(readOnly = true)
    public List<StandingsEntry> getStandings(final Long seasonId) {
        final List<LeagueTeam> teams = leagueTeamRepository.findBySeason_IdOrderByNameAsc(seasonId);
        final List<Game> allGamesWithScores = gameRepository.findBySeasonIdWithScores(seasonId);
        final List<LeagueResult> leagueResults = leagueResultRepository.findBySeason_IdOrderByDateAsc(seasonId);

        final List<StandingsEntry> standings = new ArrayList<>();
        for (final LeagueTeam team : teams) {
            standings.add(calculateStandings(team, allGamesWithScores, leagueResults));
        }

        standings.sort(Comparator
            .<StandingsEntry, Double>comparing(StandingsEntry::winPct, Comparator.reverseOrder())
            .thenComparing(StandingsEntry::runDiff, Comparator.reverseOrder()));

        return standings;
    }

    private StandingsEntry calculateStandings(final LeagueTeam team, final List<Game> allGames,
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

        // 2. Ergebnisse aus Liga-Ergebnissen (LeagueResult — nur zwischen Nicht-ownTeam Teams)
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

        return new StandingsEntry(
            LeagueTeamResponse.from(team),
            totalGames, wins, losses, ties,
            Math.round(winPct * 1000.0) / 1000.0,
            runsScored, runsAgainst, runsScored - runsAgainst
        );
    }
}
