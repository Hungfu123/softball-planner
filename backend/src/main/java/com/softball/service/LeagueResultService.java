package com.softball.service;

import com.softball.dto.CreateLeagueResultRequest;
import com.softball.entity.LeagueResult;
import com.softball.entity.LeagueTeam;
import com.softball.entity.Season;
import com.softball.exception.BusinessValidationException;
import com.softball.exception.ResourceNotFoundException;
import com.softball.repository.LeagueResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LeagueResultService {

    private static final Logger log = LoggerFactory.getLogger(LeagueResultService.class);

    private final LeagueResultRepository leagueResultRepository;
    private final LeagueTeamService leagueTeamService;
    private final SeasonService seasonService;

    public LeagueResultService(final LeagueResultRepository leagueResultRepository,
                               final LeagueTeamService leagueTeamService,
                               final SeasonService seasonService) {
        this.leagueResultRepository = leagueResultRepository;
        this.leagueTeamService = leagueTeamService;
        this.seasonService = seasonService;
    }

    @Transactional(readOnly = true)
    public List<LeagueResult> findBySeasonId(final Long seasonId) {
        return leagueResultRepository.findBySeason_IdOrderByDateAsc(seasonId);
    }

    @Transactional
    public LeagueResult create(final Long seasonId, final CreateLeagueResultRequest request) {
        final Season season = seasonService.findById(seasonId);
        final LeagueTeam homeTeam = leagueTeamService.findById(request.homeTeamId());
        final LeagueTeam awayTeam = leagueTeamService.findById(request.awayTeamId());

        validate(homeTeam, awayTeam, seasonId);

        log.info("Liga-Ergebnis erstellen: {} {}:{} {} (Saison {})",
            homeTeam.getName(), request.homeScore(), request.awayScore(), awayTeam.getName(), seasonId);
        return leagueResultRepository.save(
            new LeagueResult(season, homeTeam, awayTeam, request.homeScore(), request.awayScore(), request.date()));
    }

    @Transactional
    public LeagueResult update(final Long resultId, final CreateLeagueResultRequest request) {
        final LeagueResult result = findById(resultId);
        final LeagueTeam homeTeam = leagueTeamService.findById(request.homeTeamId());
        final LeagueTeam awayTeam = leagueTeamService.findById(request.awayTeamId());

        validate(homeTeam, awayTeam, result.getSeason().getId());

        result.setHomeTeam(homeTeam);
        result.setAwayTeam(awayTeam);
        result.setHomeScore(request.homeScore());
        result.setAwayScore(request.awayScore());
        result.setDate(request.date());

        log.info("Liga-Ergebnis aktualisiert: {} ({})", resultId, homeTeam.getName() + " vs " + awayTeam.getName());
        return leagueResultRepository.save(result);
    }

    @Transactional
    public void delete(final Long resultId) {
        if (!leagueResultRepository.existsById(resultId)) {
            throw new ResourceNotFoundException("LeagueResult", resultId);
        }
        log.info("Liga-Ergebnis loeschen: {}", resultId);
        leagueResultRepository.deleteById(resultId);
    }

    @Transactional(readOnly = true)
    public LeagueResult findById(final Long id) {
        return leagueResultRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("LeagueResult", id));
    }

    private void validate(final LeagueTeam homeTeam, final LeagueTeam awayTeam, final Long seasonId) {
        if (homeTeam.getId().equals(awayTeam.getId())) {
            throw new BusinessValidationException("Home- und Away-Team muessen unterschiedlich sein");
        }
        if (!homeTeam.getSeason().getId().equals(seasonId)) {
            throw new BusinessValidationException("Home-Team gehoert nicht zur selben Saison");
        }
        if (!awayTeam.getSeason().getId().equals(seasonId)) {
            throw new BusinessValidationException("Away-Team gehoert nicht zur selben Saison");
        }
        if (homeTeam.isOwnTeam() || awayTeam.isOwnTeam()) {
            throw new BusinessValidationException("Liga-Ergebnisse duerfen nicht das eigene Team enthalten. Eigene Ergebnisse werden ueber die Spiele erfasst.");
        }
    }
}
