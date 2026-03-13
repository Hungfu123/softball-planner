package com.softball.service;

import com.softball.entity.LeagueTeam;
import com.softball.entity.Season;
import com.softball.exception.ResourceNotFoundException;
import com.softball.repository.LeagueTeamRepository;
import com.softball.repository.SeasonRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SeasonService {

    private static final Logger log = LoggerFactory.getLogger(SeasonService.class);
    static final String OWN_TEAM_NAME = "Dead Sox";

    private final SeasonRepository seasonRepository;
    private final LeagueTeamRepository leagueTeamRepository;

    public SeasonService(final SeasonRepository seasonRepository, final LeagueTeamRepository leagueTeamRepository) {
        this.seasonRepository = seasonRepository;
        this.leagueTeamRepository = leagueTeamRepository;
    }

    @Transactional(readOnly = true)
    public List<Season> findAll() {
        return seasonRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Season findById(final Long id) {
        return seasonRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Season", id));
    }

    @Transactional
    public Season create(final String name, final Integer year) {
        final Season season = seasonRepository.save(new Season(name, year));
        log.info("Saison erstellt: {} ({}), lege eigenes Team '{}' an", name, year, OWN_TEAM_NAME);
        leagueTeamRepository.save(new LeagueTeam(season, OWN_TEAM_NAME, true));
        return season;
    }

    public Season update(final Long id, final String name, final Integer year) {
        final Season season = findById(id);
        season.setName(name);
        season.setYear(year);
        return seasonRepository.save(season);
    }

    public void delete(final Long id) {
        if (!seasonRepository.existsById(id)) {
            throw new ResourceNotFoundException("Season", id);
        }
        seasonRepository.deleteById(id);
    }
}
