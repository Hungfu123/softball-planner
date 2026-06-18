package com.softball.application;

import com.softball.adapter.dto.GameDayPlayerStats;
import com.softball.adapter.dto.GameDayResponse;
import com.softball.domain.model.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.port.out.LineupEntryRepository;
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
    private final AtBatRepository atBatRepository;
    private final SeasonService seasonService;
    private final AvailabilityService availabilityService;
    private final GameScoringService gameScoringService;

    public GameDayService(final GameDayRepository gameDayRepository,
                          final LineupEntryRepository lineupEntryRepository,
                          final AtBatRepository atBatRepository,
                          final SeasonService seasonService,
                          final AvailabilityService availabilityService,
                          final GameScoringService gameScoringService) {
        this.gameDayRepository = gameDayRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.atBatRepository = atBatRepository;
        this.seasonService = seasonService;
        this.availabilityService = availabilityService;
        this.gameScoringService = gameScoringService;
    }

    @Transactional(readOnly = true)
    public List<GameDayResponse> findBySeasonIdAsDto(final Long seasonId) {
        final List<GameDay> days = gameDayRepository.findBySeasonIdOrderByDateAsc(seasonId);
        final List<Long> gameIds = days.stream()
            .flatMap(d -> d.getGames().stream())
            .map(Game::getId)
            .filter(java.util.Objects::nonNull)
            .toList();
        final Map<Long, Long> counts = atBatRepository.countByGameIds(gameIds);
        final Map<Long, Integer> liveScores = gameScoringService.computeLiveScoreUsByGameIds(gameIds);
        return days.stream()
            .map(d -> GameDayResponse.from(d, counts, liveScores))
            .toList();
    }

    /** Alle Spieltage über alle Saisons (für die Kalender-Übersicht). */
    @Transactional(readOnly = true)
    public List<GameDayResponse> findAllAsDto() {
        return seasonService.findAll().stream()
            .flatMap(s -> findBySeasonIdAsDto(s.getId()).stream())
            .toList();
    }

    @Transactional(readOnly = true)
    public GameDayResponse findByIdAsDto(final Long id) {
        return toResponseWithLive(findById(id));
    }

    private GameDayResponse toResponseWithLive(final GameDay gameDay) {
        final List<Long> gameIds = gameDay.getGames().stream()
            .map(Game::getId)
            .filter(java.util.Objects::nonNull)
            .toList();
        final Map<Long, Long> counts = atBatRepository.countByGameIds(gameIds);
        final Map<Long, Integer> liveScores = gameScoringService.computeLiveScoreUsByGameIds(gameIds);
        return GameDayResponse.from(gameDay, counts, liveScores);
    }

    @Transactional(readOnly = true)
    public GameDay findById(final Long id) {
        return gameDayRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", id));
    }

    @Transactional
    public GameDayResponse create(final Long seasonId, final LocalDate date, final String label, final String location,
                                   final Integer numberOfGames) {
        log.info("Spieltag erstellen: Saison={}, Datum={}, Ort={}, Spiele={}", seasonId, date, location, numberOfGames);
        if (gameDayRepository.existsBySeasonAndDate(seasonId, date)) {
            throw new BusinessValidationException("Es gibt bereits einen Spieltag am " + date + " in dieser Saison");
        }
        final Season season = seasonService.findById(seasonId);
        final GameDay gameDay = new GameDay(date, label, location, season);

        final int count = (numberOfGames != null) ? numberOfGames : 3;
        for (int i = 1; i <= count; i++) {
            final Game game = new Game();
            game.setGameNumber(i);
            game.setGameDay(gameDay);
            gameDay.getGames().add(game);
        }

        final GameDay saved = gameDayRepository.save(gameDay);
        return toResponseWithLive(saved);
    }

    @Transactional
    public GameDayResponse setAvailablePlayers(final Long gameDayId, final List<Long> playerIds) {
        final GameDay saved = availabilityService.setAvailablePlayers(gameDayId, playerIds);
        return toResponseWithLive(saved);
    }

    @Transactional
    public GameDayResponse update(final Long id, final LocalDate date, final String label, final String location,
                                   final Integer numberOfGames) {
        final GameDay gameDay = findById(id);
        if (date != null && !date.equals(gameDay.getDate())) {
            if (gameDayRepository.existsBySeasonAndDate(gameDay.getSeason().getId(), date)) {
                throw new BusinessValidationException("Es gibt bereits einen Spieltag am " + date + " in dieser Saison");
            }
            gameDay.setDate(date);
        }
        gameDay.setLabel(label);
        gameDay.setLocation(location);

        if (numberOfGames != null) {
            adjustGameCount(gameDay, numberOfGames);
        }

        final GameDay saved = gameDayRepository.save(gameDay);
        saved.getGames().size();
        return toResponseWithLive(saved);
    }

    private void adjustGameCount(final GameDay gameDay, final int newCount) {
        final List<Game> games = gameDay.getGames();
        games.sort(Comparator.comparing(Game::getGameNumber));
        final int currentCount = games.size();
        if (newCount == currentCount) return;

        if (newCount > currentCount) {
            for (int i = currentCount + 1; i <= newCount; i++) {
                final Game game = new Game();
                game.setGameNumber(i);
                game.setGameDay(gameDay);
                games.add(game);
            }
            log.info("Spieltag {}: {} Spiele hinzugefuegt (jetzt {})", gameDay.getId(), newCount - currentCount, newCount);
            return;
        }

        // newCount < currentCount → shrink: prüfe Scoring-Daten
        final List<Game> toRemove = new ArrayList<>(games.subList(newCount, currentCount));
        final List<Long> removeIds = toRemove.stream().map(Game::getId).filter(Objects::nonNull).toList();
        if (!removeIds.isEmpty()) {
            final Map<Long, Long> atBatCounts = atBatRepository.countByGameIds(removeIds);
            final long withScoring = atBatCounts.values().stream().filter(c -> c > 0).count();
            if (withScoring > 0) {
                throw new BusinessValidationException(
                    "Kann Spiele nicht entfernen: " + withScoring + " Spiel(e) haben Scoring-Daten. "
                    + "Erst Scoring zurücksetzen oder weniger Spiele behalten."
                );
            }
        }
        games.removeAll(toRemove);
        log.info("Spieltag {}: {} Spiele entfernt (jetzt {})", gameDay.getId(), currentCount - newCount, newCount);
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
                    // Field-Host mit DH zählt 0.5 (Batting an DH abgegeben) — DH-Spiel teilt sich 0.5/0.5
                    final double weight = entry.getDhBatterPlayer() != null
                        ? 0.5
                        : (pos != null ? pos.getGameWeight() : 1.0);
                    gameCount += weight;
                    positions.add(new GameDayPlayerStats.GamePosition(game.getGameNumber(),
                        pos != null ? pos.displayName() : null, weight));
                }
                if (entry.getDhBatterPlayer() != null && entry.getDhBatterPlayer().getId().equals(player.getId())) {
                    gameCount += 0.5;
                    positions.add(new GameDayPlayerStats.GamePosition(game.getGameNumber(), "DH", 0.5));
                }
            }
        }

        return new GameDayPlayerStats(player.getId(), player.getName(), gameCount, positions);
    }
}
