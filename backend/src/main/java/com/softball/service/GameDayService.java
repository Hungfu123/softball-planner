package com.softball.service;

import com.softball.dto.GameDayPlayerStats;
import com.softball.dto.GameDayResponse;
import com.softball.entity.*;
import com.softball.exception.BusinessValidationException;
import com.softball.exception.ResourceNotFoundException;
import com.softball.repository.GameDayRepository;
import com.softball.repository.LineupEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GameDayService {

    private static final Logger log = LoggerFactory.getLogger(GameDayService.class);

    private final GameDayRepository gameDayRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final SeasonService seasonService;
    private final AvailabilityService availabilityService;

    public GameDayService(final GameDayRepository gameDayRepository,
                          final LineupEntryRepository lineupEntryRepository,
                          final SeasonService seasonService,
                          final AvailabilityService availabilityService) {
        this.gameDayRepository = gameDayRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.seasonService = seasonService;
        this.availabilityService = availabilityService;
    }

    @Transactional(readOnly = true)
    public List<GameDayResponse> findBySeasonIdAsDto(final Long seasonId) {
        return gameDayRepository.findBySeasonIdOrderByDateAsc(seasonId).stream()
            .map(GameDayResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public GameDayResponse findByIdAsDto(final Long id) {
        return GameDayResponse.from(findById(id));
    }

    @Transactional(readOnly = true)
    public GameDay findById(final Long id) {
        return gameDayRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", id));
    }

    @Transactional
    public GameDayResponse create(final Long seasonId, final LocalDate date, final String label, final String location) {
        log.info("Spieltag erstellen: Saison={}, Datum={}, Ort={}", seasonId, date, location);
        if (gameDayRepository.existsBySeasonAndDate(seasonId, date)) {
            throw new BusinessValidationException("Es gibt bereits einen Spieltag am " + date + " in dieser Saison");
        }
        final Season season = seasonService.findById(seasonId);
        final GameDay gameDay = new GameDay(date, label, location, season);

        for (int i = 1; i <= 3; i++) {
            final Game game = new Game(i, gameDay);
            gameDay.getGames().add(game);
        }

        final GameDay saved = gameDayRepository.save(gameDay);
        return GameDayResponse.from(saved);
    }

    @Transactional
    public GameDayResponse setAvailablePlayers(final Long gameDayId, final List<Long> playerIds) {
        final GameDay saved = availabilityService.setAvailablePlayers(gameDayId, playerIds);
        return GameDayResponse.from(saved);
    }

    @Transactional
    public GameDayResponse update(final Long id, final LocalDate date, final String label, final String location) {
        final GameDay gameDay = findById(id);
        if (date != null && !date.equals(gameDay.getDate())) {
            if (gameDayRepository.existsBySeasonAndDate(gameDay.getSeason().getId(), date)) {
                throw new BusinessValidationException("Es gibt bereits einen Spieltag am " + date + " in dieser Saison");
            }
            gameDay.setDate(date);
        }
        gameDay.setLabel(label);
        gameDay.setLocation(location);
        final GameDay saved = gameDayRepository.save(gameDay);
        saved.getGames().size();
        return GameDayResponse.from(saved);
    }

    @Transactional
    public void delete(final Long id) {
        log.info("Spieltag loeschen: {}", id);
        if (!gameDayRepository.existsById(id)) {
            throw new ResourceNotFoundException("GameDay", id);
        }
        gameDayRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<GameDayPlayerStats> getStats(final Long gameDayId) {
        final GameDay gameDayWithPlayers = gameDayRepository.findByIdWithPlayers(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
        final GameDay gameDayWithGames = gameDayRepository.findByIdWithGames(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));

        final Collection<Player> available = gameDayWithPlayers.getAvailablePlayers();
        final List<Game> games = gameDayWithGames.getGames();

        // Batch-load all lineup entries for all games (avoids N+1)
        final List<Long> gameIds = games.stream().map(Game::getId).toList();
        final List<LineupEntry> allEntries = lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds);
        final Map<Long, List<LineupEntry>> entriesByGame = allEntries.stream()
            .collect(Collectors.groupingBy(e -> e.getGame().getId()));

        // Map game ID -> game number for position lookups
        final Map<Long, Integer> gameNumberById = games.stream()
            .collect(Collectors.toMap(Game::getId, Game::getGameNumber));

        return available.stream()
            .map(player -> buildPlayerStats(player, games, entriesByGame, gameNumberById))
            .sorted(Comparator.comparingDouble(GameDayPlayerStats::gameCount))
            .collect(Collectors.toList());
    }

    private GameDayPlayerStats buildPlayerStats(final Player player, final List<Game> games,
                                                 final Map<Long, List<LineupEntry>> entriesByGame,
                                                 final Map<Long, Integer> gameNumberById) {
        double gameCount = 0;
        final List<GameDayPlayerStats.GamePosition> positions = new ArrayList<>();

        for (final Game game : games) {
            final List<LineupEntry> entries = entriesByGame.getOrDefault(game.getId(), List.of());
            for (final LineupEntry entry : entries) {
                if (entry.getPlayer().getId().equals(player.getId())) {
                    final Position pos = entry.getPosition();
                    gameCount += pos != null ? pos.getGameWeight() : 1.0;
                    positions.add(new GameDayPlayerStats.GamePosition(game.getGameNumber(),
                        pos != null ? pos.displayName() : null));
                }
                if (entry.getDhBatterPlayer() != null && entry.getDhBatterPlayer().getId().equals(player.getId())) {
                    gameCount += 0.5;
                    positions.add(new GameDayPlayerStats.GamePosition(game.getGameNumber(), "DH"));
                }
            }
        }

        return new GameDayPlayerStats(player.getId(), player.getName(), gameCount, positions);
    }
}
