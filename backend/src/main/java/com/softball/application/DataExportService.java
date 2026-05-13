package com.softball.application;

import com.softball.adapter.dto.DataExport;
import com.softball.adapter.dto.DataExport.*;
import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DataExportService {

    private static final Logger log = LoggerFactory.getLogger(DataExportService.class);

    private final PlayerRepository playerRepository;
    private final SeasonRepository seasonRepository;
    private final GameDayRepository gameDayRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final GameStaffRepository gameStaffRepository;
    private final LeagueResultRepository leagueResultRepository;

    public DataExportService(final PlayerRepository playerRepository, final SeasonRepository seasonRepository,
                             final GameDayRepository gameDayRepository,
                             final LineupEntryRepository lineupEntryRepository, final GameStaffRepository gameStaffRepository,
                             final LeagueResultRepository leagueResultRepository) {
        this.playerRepository = playerRepository;
        this.seasonRepository = seasonRepository;
        this.gameDayRepository = gameDayRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.gameStaffRepository = gameStaffRepository;
        this.leagueResultRepository = leagueResultRepository;
    }

    @Transactional(readOnly = true)
    public DataExport exportAll() {
        log.info("Daten-Export gestartet");
        final List<PlayerExport> players = playerRepository.findAll().stream()
            .map(p -> new PlayerExport(p.getId(), p.getName(), p.getDefaultBattingOrder()))
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
            .findBySeasonIdOrderByDateAsc(season.getId()).stream()
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

        // Batch-load lineup entries and staff for all games at once (avoids N+1)
        final List<Long> gameIds = withGames.getGames().stream().map(Game::getId).toList();
        final Map<Long, List<LineupEntry>> lineupByGame = gameIds.isEmpty() ? Map.of()
            : lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds).stream()
                .collect(Collectors.groupingBy(e -> e.getGame().getId()));
        final Map<Long, List<GameStaff>> staffByGame = gameIds.isEmpty() ? Map.of()
            : gameStaffRepository.findByGameIdIn(gameIds).stream()
                .collect(Collectors.groupingBy(s -> s.getGame().getId()));

        final List<GameExport> gameExports = withGames.getGames().stream()
            .map(game -> exportGame(game, lineupByGame.getOrDefault(game.getId(), List.of()),
                staffByGame.getOrDefault(game.getId(), List.of())))
            .toList();

        return new GameDayExport(withPlayers.getDate(), withPlayers.getLabel(), withPlayers.getLocation(),
            availablePlayerIds, gameExports);
    }

    private GameExport exportGame(final Game game, final List<LineupEntry> lineupEntries, final List<GameStaff> staffEntries) {
        final List<LineupExport> lineup = lineupEntries.stream()
            .map(e -> new LineupExport(e.getPlayer().getId(),
                e.getPosition() != null ? e.getPosition().displayName() : null, e.getBattingOrder(),
                e.getDhBatterPlayer() != null ? e.getDhBatterPlayer().getId() : null))
            .toList();

        final List<StaffExport> staff = staffEntries.stream()
            .map(s -> new StaffExport(s.getPlayer().getId(), s.getRole().name()))
            .toList();

        final String opponentTeamName = game.getOpponentTeam() != null ? game.getOpponentTeam().getName() : null;
        return new GameExport(game.getGameNumber(), opponentTeamName, game.getScoreUs(), game.getScoreThem(), lineup, staff);
    }

}
