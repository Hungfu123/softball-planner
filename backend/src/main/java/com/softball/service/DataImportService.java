package com.softball.service;

import com.softball.dto.DataExport;
import com.softball.dto.DataExport.*;
import com.softball.entity.*;
import com.softball.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class DataImportService {

    private static final Logger log = LoggerFactory.getLogger(DataImportService.class);

    private final PlayerRepository playerRepository;
    private final SeasonRepository seasonRepository;
    private final GameDayRepository gameDayRepository;
    private final GameRepository gameRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final GameStaffRepository gameStaffRepository;
    private final CarRepository carRepository;
    private final LeagueTeamRepository leagueTeamRepository;
    private final LeagueResultRepository leagueResultRepository;

    public DataImportService(final PlayerRepository playerRepository, final SeasonRepository seasonRepository,
                             final GameDayRepository gameDayRepository, final GameRepository gameRepository,
                             final LineupEntryRepository lineupEntryRepository, final GameStaffRepository gameStaffRepository,
                             final CarRepository carRepository, final LeagueTeamRepository leagueTeamRepository,
                             final LeagueResultRepository leagueResultRepository) {
        this.playerRepository = playerRepository;
        this.seasonRepository = seasonRepository;
        this.gameDayRepository = gameDayRepository;
        this.gameRepository = gameRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.gameStaffRepository = gameStaffRepository;
        this.carRepository = carRepository;
        this.leagueTeamRepository = leagueTeamRepository;
        this.leagueResultRepository = leagueResultRepository;
    }

    @Transactional
    public void importAll(final DataExport data) {
        log.info("Daten-Import gestartet: {} Spieler, {} Saisons", data.players().size(), data.seasons().size());
        final Map<Long, Long> playerIdMap = new HashMap<>();

        for (final PlayerExport pe : data.players()) {
            final Player player = playerRepository.save(new Player(pe.name()));
            playerIdMap.put(pe.id(), player.getId());
        }

        for (final SeasonExport se : data.seasons()) {
            final Season season = seasonRepository.save(new Season(se.name(), se.year()));
            final Map<String, LeagueTeam> teamByName = new HashMap<>();

            // Eigenes Team sicherstellen (wird spaeter ggf. durch opponentTeamName ergaenzt)
            final LeagueTeam ownTeam = leagueTeamRepository.save(
                new LeagueTeam(season, SeasonService.OWN_TEAM_NAME, true));
            teamByName.put(ownTeam.getName().toLowerCase(), ownTeam);

            for (final GameDayExport gde : se.gameDays()) {
                importGameDay(season, gde, playerIdMap, teamByName);
            }

            if (se.leagueResults() != null) {
                for (final LeagueResultExport lre : se.leagueResults()) {
                    importLeagueResult(season, lre, teamByName);
                }
            }
        }
        log.info("Daten-Import abgeschlossen");
    }

    private void importGameDay(final Season season, final GameDayExport gde,
                               final Map<Long, Long> playerIdMap, final Map<String, LeagueTeam> teamByName) {
        final GameDay gameDay = new GameDay(gde.date(), gde.label(), gde.location(), season);

        for (int i = 1; i <= 3; i++) {
            gameDay.getGames().add(new Game(i, gameDay));
        }

        final GameDay savedGameDay = gameDayRepository.save(gameDay);

        if (gde.availablePlayerIds() != null && !gde.availablePlayerIds().isEmpty()) {
            final List<Long> newPlayerIds = gde.availablePlayerIds().stream()
                .map(playerIdMap::get)
                .filter(Objects::nonNull)
                .toList();
            final List<Player> players = playerRepository.findAllById(newPlayerIds);
            savedGameDay.setAvailablePlayersList(players);
            gameDayRepository.save(savedGameDay);
        }

        final List<Game> savedGames = savedGameDay.getGames();
        for (final GameExport ge : gde.games()) {
            final Game game = savedGames.stream()
                .filter(g -> g.getGameNumber() == ge.gameNumber())
                .findFirst()
                .orElseThrow();

            importGameDetails(game, ge, season, playerIdMap, teamByName);
        }

        if (gde.cars() != null && !gde.cars().isEmpty()) {
            final List<Long> driverIds = gde.cars().stream()
                .map(ce -> playerIdMap.get(ce.driverPlayerId()))
                .filter(Objects::nonNull)
                .toList();
            final Map<Long, Player> driverMap = playerRepository.findAllById(driverIds).stream()
                .collect(java.util.stream.Collectors.toMap(Player::getId, p -> p));
            for (final CarExport ce : gde.cars()) {
                final Long newDriverId = playerIdMap.get(ce.driverPlayerId());
                if (newDriverId != null) {
                    final Player driver = driverMap.get(newDriverId);
                    carRepository.save(new Car(savedGameDay, driver, ce.totalSeats(), ce.direction()));
                }
            }
        }
    }

    private void importGameDetails(final Game game, final GameExport ge, final Season season,
                                   final Map<Long, Long> playerIdMap, final Map<String, LeagueTeam> teamByName) {
        if (ge.opponentTeamName() != null) {
            game.setOpponentTeam(getOrCreateTeam(season, ge.opponentTeamName(), teamByName));
        }
        if (ge.scoreUs() != null && ge.scoreThem() != null) {
            game.setScoreUs(ge.scoreUs());
            game.setScoreThem(ge.scoreThem());
        }
        if (ge.opponentTeamName() != null || ge.scoreUs() != null) {
            gameRepository.save(game);
        }

        // Batch-load all players needed for lineup + staff
        final java.util.Set<Long> neededPlayerIds = new java.util.HashSet<>();
        for (final LineupExport le : ge.lineup()) {
            final Long newId = playerIdMap.get(le.playerId());
            if (newId == null) {
                throw new IllegalStateException("Spieler-Mapping fehlt fuer ID: " + le.playerId());
            }
            neededPlayerIds.add(newId);
            if (le.dhBatterPlayerId() != null) {
                final Long dhId = playerIdMap.get(le.dhBatterPlayerId());
                if (dhId != null) neededPlayerIds.add(dhId);
            }
        }
        for (final StaffExport ste : ge.staff()) {
            final Long newId = playerIdMap.get(ste.playerId());
            if (newId == null) {
                throw new IllegalStateException("Spieler-Mapping fehlt fuer ID: " + ste.playerId());
            }
            neededPlayerIds.add(newId);
        }
        final Map<Long, Player> playerMap = playerRepository.findAllById(neededPlayerIds).stream()
            .collect(java.util.stream.Collectors.toMap(Player::getId, p -> p));

        for (final LineupExport le : ge.lineup()) {
            final Long newPlayerId = playerIdMap.get(le.playerId());
            final Player player = playerMap.get(newPlayerId);
            final Position position = le.position() != null ? Position.fromString(le.position()) : null;
            Player dhBatterPlayer = null;
            if (le.dhBatterPlayerId() != null) {
                final Long newDhBatterId = playerIdMap.get(le.dhBatterPlayerId());
                if (newDhBatterId != null) {
                    dhBatterPlayer = playerMap.get(newDhBatterId);
                }
            }
            lineupEntryRepository.save(new LineupEntry(game, player, position, le.battingOrder(), dhBatterPlayer));
        }

        for (final StaffExport ste : ge.staff()) {
            final Long newPlayerId = playerIdMap.get(ste.playerId());
            final Player player = playerMap.get(newPlayerId);
            final StaffRole role = StaffRole.valueOf(ste.role());
            gameStaffRepository.save(new GameStaff(game, player, role));
        }
    }

    private void importLeagueResult(final Season season, final LeagueResultExport lre,
                                    final Map<String, LeagueTeam> teamByName) {
        final LeagueTeam homeTeam = getOrCreateTeam(season, lre.homeTeamName(), teamByName);
        final LeagueTeam awayTeam = getOrCreateTeam(season, lre.awayTeamName(), teamByName);
        leagueResultRepository.save(new LeagueResult(season, homeTeam, awayTeam,
            lre.homeScore(), lre.awayScore(), lre.date()));
    }

    private LeagueTeam getOrCreateTeam(final Season season, final String name,
                                       final Map<String, LeagueTeam> teamByName) {
        LeagueTeam team = teamByName.get(name.toLowerCase());
        if (team == null) {
            team = leagueTeamRepository.save(new LeagueTeam(season, name, false));
            teamByName.put(name.toLowerCase(), team);
        }
        return team;
    }
}
