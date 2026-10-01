package com.softball.application;

import com.softball.domain.model.LeagueTeam;
import com.softball.domain.model.Season;
import com.softball.domain.model.YearCopyResult;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.LeagueTeamRepository;
import com.softball.domain.port.out.SeasonRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

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
        final LeagueTeam ownTeam = new LeagueTeam(season, OWN_TEAM_NAME, true);
        leagueTeamRepository.save(ownTeam);
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

    @Transactional(readOnly = true)
    public List<Integer> getDistinctYears() {
        return seasonRepository.findDistinctYearsWithData();
    }

    @Transactional(readOnly = true)
    public List<Season> getSeasonsByYear(final int year) {
        return seasonRepository.findByYear(year);
    }

    /**
     * "Jahr übernehmen": legt alle Ligen (Saisons) eines Vorlagen-Jahres für das
     * Ziel-Jahr neu an — je Liga mit eigenem Team (Dead Sox). Existierende Ligen
     * gleichen Namens im Ziel-Jahr werden übersprungen (nicht dupliziert, nicht
     * verändert). Optional werden die Gegner-Teams der Vorlagen-Ligen mitkopiert.
     */
    @Transactional
    public YearCopyResult copyYear(final int templateYear, final int targetYear, final boolean copyTeams) {
        if (templateYear == targetYear) {
            throw new BusinessValidationException("Vorlagen-Jahr und Ziel-Jahr dürfen nicht identisch sein.");
        }
        final List<Season> templates = seasonRepository.findByYear(templateYear);
        if (templates.isEmpty()) {
            throw new BusinessValidationException(
                "Im Jahr " + templateYear + " gibt es keine Ligen/Saisons zum Übernehmen.");
        }
        final Set<String> existingTargetNames = seasonRepository.findByYear(targetYear).stream()
            .map(s -> s.getName().trim().toLowerCase(Locale.ROOT))
            .collect(Collectors.toSet());

        final List<String> created = new ArrayList<>();
        final List<String> skipped = new ArrayList<>();
        int copiedTeamCount = 0;

        for (final Season template : templates) {
            if (existingTargetNames.contains(template.getName().trim().toLowerCase(Locale.ROOT))) {
                skipped.add(template.getName());
                continue;
            }
            final Season newSeason = create(template.getName(), targetYear);
            created.add(newSeason.getName());

            if (copyTeams) {
                for (final LeagueTeam team : leagueTeamRepository.findBySeasonIdOrderByNameAsc(template.getId())) {
                    if (team.isOwnTeam()) continue; // eigenes Team wurde von create() angelegt
                    leagueTeamRepository.save(new LeagueTeam(newSeason, team.getName(), false));
                    copiedTeamCount++;
                }
            }
        }

        log.info("Jahr {} → {} übernommen: {} Ligen angelegt, {} übersprungen, {} Teams kopiert",
            templateYear, targetYear, created.size(), skipped.size(), copiedTeamCount);
        return new YearCopyResult(templateYear, targetYear, created, skipped, copiedTeamCount);
    }
}
