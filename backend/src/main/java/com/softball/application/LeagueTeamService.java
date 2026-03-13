package com.softball.application;

import com.softball.adapter.dto.StandingsEntry;
import com.softball.adapter.dto.LeagueTeamResponse;
import com.softball.domain.model.*;
import com.softball.domain.service.StandingsCalculator;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LeagueResultRepository;
import com.softball.domain.port.out.LeagueTeamRepository;
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
    private final StandingsCalculator standingsCalculator = new StandingsCalculator();

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
        return leagueTeamRepository.findBySeasonIdOrderByNameAsc(seasonId);
    }

    @Transactional
    public LeagueTeam create(final Long seasonId, final String name, final boolean ownTeam) {
        final Season season = seasonService.findById(seasonId);

        // Name muss in der Season eindeutig sein (case-insensitive)
        if (leagueTeamRepository.findBySeasonIdAndNameIgnoreCase(seasonId, name).isPresent()) {
            throw new BusinessValidationException("Team '" + name + "' existiert bereits in dieser Saison");
        }

        log.info("Team erstellen: Saison={}, Name={}, ownTeam={}", seasonId, name, ownTeam);
        final LeagueTeam team = new LeagueTeam(season, name, ownTeam);
        return leagueTeamRepository.save(team);
    }

    @Transactional
    public LeagueTeam update(final Long teamId, final String name, final Boolean ownTeam) {
        final LeagueTeam team = findById(teamId);

        if (name != null && !name.isBlank()) {
            // Pruefen ob der neue Name schon vergeben ist
            final Optional<LeagueTeam> existing = leagueTeamRepository.findBySeasonIdAndNameIgnoreCase(
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
        final List<Game> gamesWithTeam = gameRepository.findByOpponentTeamId(teamId);
        gamesWithTeam.forEach(game -> game.setOpponentTeam(null));
        gameRepository.saveAll(gamesWithTeam);

        // Alle LeagueResults loeschen wo dieses Team beteiligt ist
        leagueResultRepository.deleteAll(leagueResultRepository.findByHomeTeamIdOrAwayTeamId(teamId, teamId));

        leagueTeamRepository.deleteById(teamId);
    }

    @Transactional(readOnly = true)
    public LeagueTeam findById(final Long id) {
        return leagueTeamRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("LeagueTeam", id));
    }

    @Transactional(readOnly = true)
    public List<StandingsEntry> getStandings(final Long seasonId) {
        final List<LeagueTeam> teams = leagueTeamRepository.findBySeasonIdOrderByNameAsc(seasonId);
        final List<Game> allGamesWithScores = gameRepository.findBySeasonIdWithScores(seasonId);
        final List<LeagueResult> leagueResults = leagueResultRepository.findBySeasonIdOrderByDateAsc(seasonId);

        return standingsCalculator.calculate(teams, allGamesWithScores, leagueResults).stream()
            .map(ts -> new StandingsEntry(
                LeagueTeamResponse.from(ts.team()),
                ts.games(), ts.wins(), ts.losses(), ts.ties(),
                ts.winPct(), ts.runsScored(), ts.runsAgainst(), ts.runDiff()))
            .toList();
    }
}
