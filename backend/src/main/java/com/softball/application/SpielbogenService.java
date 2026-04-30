package com.softball.application;

import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.LeagueResult;
import com.softball.domain.model.LeagueTeam;
import com.softball.domain.model.Season;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class SpielbogenService {

    private static final Logger log = LoggerFactory.getLogger(SpielbogenService.class);

    private final SpielbogenRepository bogenRepo;
    private final SeasonService seasonService;
    private final SpielbogenSlotService slotService;
    private final LeagueTeamService leagueTeamService;
    private final LeagueResultService leagueResultService;

    public SpielbogenService(final SpielbogenRepository bogenRepo,
                             final SeasonService seasonService,
                             @Lazy final SpielbogenSlotService slotService,
                             final LeagueTeamService leagueTeamService,
                             final LeagueResultService leagueResultService) {
        this.bogenRepo = bogenRepo;
        this.seasonService = seasonService;
        this.slotService = slotService;
        this.leagueTeamService = leagueTeamService;
        this.leagueResultService = leagueResultService;
    }

    @Transactional(readOnly = true)
    public List<Spielbogen> findAll() {
        return bogenRepo.findAll();
    }

    @Transactional(readOnly = true)
    public List<Spielbogen> findBySeasonId(final Long seasonId) {
        return bogenRepo.findBySeasonId(seasonId);
    }

    @Transactional(readOnly = true)
    public List<Spielbogen> findByStatus(final BogenStatus status) {
        return bogenRepo.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public Spielbogen findById(final Long id) {
        return bogenRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", id));
    }

    @Transactional
    public Spielbogen create(final LocalDate date, final String location,
                             final String homeTeamName, final String awayTeamName,
                             final Long seasonId) {
        if (homeTeamName.equalsIgnoreCase(awayTeamName)) {
            throw new BusinessValidationException("Heim- und Gast-Team-Namen müssen unterschiedlich sein");
        }
        Season season = null;
        if (seasonId != null) {
            season = seasonService.findById(seasonId);
        }
        Spielbogen bogen = new Spielbogen(date, location, homeTeamName, awayTeamName, season);
        Spielbogen saved = bogenRepo.save(bogen);
        log.info("Spielbogen erstellt: id={}, {} vs {} am {}", saved.getId(), homeTeamName, awayTeamName, date);
        return saved;
    }

    @Transactional
    public Spielbogen update(final Long id, final LocalDate date, final String location,
                             final String homeTeamName, final String awayTeamName,
                             final Long seasonId) {
        Spielbogen bogen = findById(id);
        if (bogen.getLeagueResult() != null && seasonId != null
            && (bogen.getSeason() == null || !bogen.getSeason().getId().equals(seasonId))) {
            throw new BusinessValidationException("Spielbogen ist bereits einer Liga zugeordnet — Saison kann nicht geändert werden");
        }
        if (date != null) bogen.setDate(date);
        if (location != null) bogen.setLocation(location);
        if (homeTeamName != null) bogen.setHomeTeamName(homeTeamName);
        if (awayTeamName != null) bogen.setAwayTeamName(awayTeamName);
        if (seasonId != null) bogen.setSeason(seasonService.findById(seasonId));
        return bogenRepo.save(bogen);
    }

    @Transactional
    public void delete(final Long id) {
        if (!bogenRepo.existsById(id)) {
            throw new ResourceNotFoundException("Spielbogen", id);
        }
        bogenRepo.deleteById(id);
        log.info("Spielbogen gelöscht: id={}", id);
    }

    @Transactional
    public Spielbogen start(final Long id) {
        Spielbogen bogen = findById(id);
        if (bogen.getStatus() != BogenStatus.DRAFT) {
            throw new BusinessValidationException("Nur DRAFT-Spielbogen kann gestartet werden (aktuell: " + bogen.getStatus() + ")");
        }
        var lineup = slotService.getLineup(id);
        if (lineup.home().size() < 9) {
            throw new BusinessValidationException("HOME-Lineup unvollständig (mindestens 9 Spieler nötig)");
        }
        if (lineup.away().size() < 9) {
            throw new BusinessValidationException("AWAY-Lineup unvollständig (mindestens 9 Spieler nötig)");
        }
        bogen.setStatus(BogenStatus.LIVE);
        log.info("Spielbogen {} gestartet (LIVE)", id);
        return bogenRepo.save(bogen);
    }

    @Transactional
    public Spielbogen end(final Long id, final Integer homeRunsOverride, final Integer awayRunsOverride) {
        Spielbogen bogen = findById(id);
        if (bogen.getStatus() != BogenStatus.LIVE) {
            throw new BusinessValidationException("Nur LIVE-Spielbogen kann beendet werden (aktuell: " + bogen.getStatus() + ")");
        }
        if (homeRunsOverride != null) {
            if (homeRunsOverride < 0) {
                throw new BusinessValidationException("homeRuns muss >= 0 sein");
            }
            bogen.setHomeRuns(homeRunsOverride);
        }
        if (awayRunsOverride != null) {
            if (awayRunsOverride < 0) {
                throw new BusinessValidationException("awayRuns muss >= 0 sein");
            }
            bogen.setAwayRuns(awayRunsOverride);
        }
        bogen.setStatus(BogenStatus.DONE);
        bogen.setEndedAt(Instant.now());
        log.info("Spielbogen {} beendet (DONE) — Score {} : {}", id, bogen.getHomeRuns(), bogen.getAwayRuns());
        return bogenRepo.save(bogen);
    }

    @Transactional
    public Spielbogen reopen(final Long id) {
        Spielbogen bogen = findById(id);
        if (bogen.getStatus() != BogenStatus.DONE) {
            throw new BusinessValidationException("Nur DONE-Spielbogen kann wieder geöffnet werden (aktuell: " + bogen.getStatus() + ")");
        }
        bogen.setStatus(BogenStatus.LIVE);
        bogen.setEndedAt(null);
        log.info("Spielbogen {} reopened (LIVE)", id);
        return bogenRepo.save(bogen);
    }

    @Transactional
    public LeagueResult registerLeagueResult(final Long bogenId) {
        synchronized (("registerLeagueResult-" + bogenId).intern()) {
        Spielbogen bogen = findById(bogenId);
        if (bogen.getStatus() != BogenStatus.DONE) {
            throw new BusinessValidationException("Liga-Eintrag nur in Status DONE möglich (aktuell: " + bogen.getStatus() + ")");
        }
        if (bogen.getSeason() == null) {
            throw new BusinessValidationException("Spielbogen hat keine Saison zugeordnet");
        }
        if (bogen.getLeagueResult() != null) {
            throw new BusinessValidationException("Liga-Eintrag bereits registriert");
        }

        LeagueTeam homeTeam = findOrCreateLeagueTeam(bogen.getSeason().getId(), bogen.getHomeTeamName());
        LeagueTeam awayTeam = findOrCreateLeagueTeam(bogen.getSeason().getId(), bogen.getAwayTeamName());

        if (Boolean.TRUE.equals(homeTeam.isOwnTeam()) || Boolean.TRUE.equals(awayTeam.isOwnTeam())) {
            throw new BusinessValidationException("Spielbogen kann keinen ownTeam-Eintrag erzeugen");
        }

        LeagueResult result = leagueResultService.create(
            bogen.getSeason().getId(),
            homeTeam.getId(),
            awayTeam.getId(),
            bogen.getHomeRuns(),
            bogen.getAwayRuns(),
            bogen.getDate()
        );

        bogen.setLeagueResult(result);
        bogenRepo.save(bogen);
        log.info("Spielbogen {} → LeagueResult {} registriert", bogenId, result.getId());
        return result;
        } // end synchronized
    }

    private LeagueTeam findOrCreateLeagueTeam(final Long seasonId, final String name) {
        return leagueTeamService.findOrCreateByName(seasonId, name);
    }
}
