package com.softball.service;

import com.softball.dto.DataExport;
import com.softball.dto.DataExport.*;
import com.softball.entity.*;
import com.softball.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DataExportService {

    private static final Logger log = LoggerFactory.getLogger(DataExportService.class);

    private final PlayerRepository playerRepository;
    private final SeasonRepository seasonRepository;
    private final GameDayRepository gameDayRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final GameStaffRepository gameStaffRepository;
    private final CarRepository carRepository;
    private final LeagueResultRepository leagueResultRepository;

    public DataExportService(final PlayerRepository playerRepository, final SeasonRepository seasonRepository,
                             final GameDayRepository gameDayRepository,
                             final LineupEntryRepository lineupEntryRepository, final GameStaffRepository gameStaffRepository,
                             final CarRepository carRepository, final LeagueResultRepository leagueResultRepository) {
        this.playerRepository = playerRepository;
        this.seasonRepository = seasonRepository;
        this.gameDayRepository = gameDayRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.gameStaffRepository = gameStaffRepository;
        this.carRepository = carRepository;
        this.leagueResultRepository = leagueResultRepository;
    }

    @Transactional(readOnly = true)
    public DataExport exportAll() {
        log.info("Daten-Export gestartet");
        final List<PlayerExport> players = playerRepository.findAll().stream()
            .map(p -> new PlayerExport(p.getId(), p.getName()))
            .toList();

        final List<SeasonExport> seasons = seasonRepository.findAll().stream()
            .map(this::exportSeason)
            .toList();

        log.info("Daten-Export abgeschlossen: {} Spieler, {} Saisons", players.size(), seasons.size());
        return new DataExport(players, seasons);
    }

    private SeasonExport exportSeason(final Season season) {
        final List<GameDay> gameDays = gameDayRepository.findBySeasonIdOrderByDateAsc(season.getId());
        final List<GameDayExport> gameDayExports = gameDays.stream()
            .map(gd -> exportGameDay(gd.getId()))
            .toList();

        final List<LeagueResultExport> leagueResultExports = leagueResultRepository
            .findBySeason_IdOrderByDateAsc(season.getId()).stream()
            .map(r -> new LeagueResultExport(r.getHomeTeam().getName(), r.getAwayTeam().getName(),
                r.getHomeScore(), r.getAwayScore(), r.getDate()))
            .toList();

        return new SeasonExport(season.getId(), season.getName(), season.getYear(), gameDayExports, leagueResultExports);
    }

    private GameDayExport exportGameDay(final Long gameDayId) {
        final GameDay withPlayers = gameDayRepository.findByIdWithPlayers(gameDayId)
            .orElseThrow(() -> new IllegalStateException("GameDay nicht gefunden: " + gameDayId));
        final List<Long> availablePlayerIds = withPlayers.getAvailablePlayers().stream()
            .map(Player::getId)
            .toList();

        final GameDay withGames = gameDayRepository.findByIdWithGames(gameDayId)
            .orElseThrow(() -> new IllegalStateException("GameDay nicht gefunden: " + gameDayId));
        final List<GameExport> gameExports = withGames.getGames().stream()
            .map(this::exportGame)
            .toList();

        final List<CarExport> carExports = carRepository.findByGameDay_Id(gameDayId).stream()
            .map(car -> new CarExport(car.getDriver().getId(), car.getTotalSeats(), car.getDirection()))
            .toList();

        return new GameDayExport(withPlayers.getDate(), withPlayers.getLabel(), withPlayers.getLocation(),
            availablePlayerIds, gameExports, carExports);
    }

    private GameExport exportGame(final Game game) {
        final List<LineupExport> lineup = lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(game.getId()).stream()
            .map(e -> new LineupExport(e.getPlayer().getId(),
                e.getPosition() != null ? e.getPosition().displayName() : null, e.getBattingOrder(),
                e.getDhBatterPlayer() != null ? e.getDhBatterPlayer().getId() : null))
            .toList();

        final List<StaffExport> staff = gameStaffRepository.findByGameId(game.getId()).stream()
            .map(s -> new StaffExport(s.getPlayer().getId(), s.getRole().name()))
            .toList();

        final String opponentTeamName = game.getOpponentTeam() != null ? game.getOpponentTeam().getName() : null;
        return new GameExport(game.getGameNumber(), opponentTeamName, game.getScoreUs(), game.getScoreThem(), lineup, staff);
    }

}
