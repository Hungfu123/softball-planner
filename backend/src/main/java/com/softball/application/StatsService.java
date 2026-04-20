package com.softball.application;

import com.softball.adapter.dto.SeasonPlayerStats;
import com.softball.domain.model.*;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.SeasonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatsService {

    private final SeasonRepository seasonRepository;
    private final LineupEntryRepository lineupEntryRepository;

    public StatsService(final SeasonRepository seasonRepository, final LineupEntryRepository lineupEntryRepository) {
        this.seasonRepository = seasonRepository;
        this.lineupEntryRepository = lineupEntryRepository;
    }

    @Transactional(readOnly = true)
    public List<SeasonPlayerStats> getSeasonStats(final Long seasonId) {
        final Season season = seasonRepository.findByIdWithGameDaysAndGames(seasonId)
            .orElseThrow(() -> new ResourceNotFoundException("Season", seasonId));

        final Map<Long, String> playerNames = new HashMap<>();
        final Map<Long, Double> playerGames = new HashMap<>();
        final Map<Long, Map<String, Long>> playerPositions = new HashMap<>();

        // Batch-load all lineup entries for all games in the season (avoids N+1)
        final List<Long> allGameIds = season.getGameDays().stream()
            .flatMap(gd -> gd.getGames().stream())
            .map(Game::getId)
            .toList();
        final List<LineupEntry> allEntries = allGameIds.isEmpty()
            ? List.of()
            : lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(allGameIds);
        final Map<Long, List<LineupEntry>> entriesByGame = allEntries.stream()
            .collect(java.util.stream.Collectors.groupingBy(e -> e.getGame().getId()));

        for (final GameDay gameDay : season.getGameDays()) {
            for (final Game game : gameDay.getGames()) {
                final List<LineupEntry> entries = entriesByGame.getOrDefault(game.getId(), List.of());
                for (final LineupEntry entry : entries) {
                    final Long pid = entry.getPlayer().getId();
                    final Position pos = entry.getPosition();

                    playerNames.putIfAbsent(pid, entry.getPlayer().getName());
                    playerGames.merge(pid, pos != null ? pos.getGameWeight() : 1.0, Double::sum);
                    if (pos != null) {
                        playerPositions.computeIfAbsent(pid, k -> new HashMap<>())
                            .merge(pos.displayName(), 1L, Long::sum);
                    }

                    if (entry.getDhBatterPlayer() != null) {
                        final Long dhPid = entry.getDhBatterPlayer().getId();
                        playerNames.putIfAbsent(dhPid, entry.getDhBatterPlayer().getName());
                        playerGames.merge(dhPid, 0.5, Double::sum);
                        playerPositions.computeIfAbsent(dhPid, k -> new HashMap<>())
                            .merge("DH", 1L, Long::sum);
                    }
                }
            }
        }

        return playerNames.entrySet().stream()
            .map(e -> new SeasonPlayerStats(
                e.getKey(),
                e.getValue(),
                playerGames.getOrDefault(e.getKey(), 0.0),
                playerPositions.getOrDefault(e.getKey(), Map.of())
            ))
            .sorted(Comparator.comparingDouble(SeasonPlayerStats::totalGames).reversed())
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SeasonPlayerStats> getYearStats(final int year) {
        final List<Season> seasons = seasonRepository.findByYear(year);
        return aggregateStats(seasons.stream().map(Season::getId).toList());
    }

    @Transactional(readOnly = true)
    public List<SeasonPlayerStats> getAllTimeStats() {
        final List<Season> seasons = seasonRepository.findAll();
        return aggregateStats(seasons.stream().map(Season::getId).toList());
    }

    /** Aggregiert Einsatz-Stats über mehrere Saisons. Private Helper für year/allTime. */
    private List<SeasonPlayerStats> aggregateStats(final List<Long> seasonIds) {
        if (seasonIds.isEmpty()) return List.of();

        final Map<Long, String> playerNames = new HashMap<>();
        final Map<Long, Double> playerGames = new HashMap<>();
        final Map<Long, Map<String, Long>> playerPositions = new HashMap<>();

        for (final Long seasonId : seasonIds) {
            final Season season = seasonRepository.findByIdWithGameDaysAndGames(seasonId).orElse(null);
            if (season == null) continue;

            final List<Long> gameIds = season.getGameDays().stream()
                .flatMap(gd -> gd.getGames().stream())
                .map(Game::getId)
                .toList();
            if (gameIds.isEmpty()) continue;

            final List<LineupEntry> entries = lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds);
            for (final LineupEntry entry : entries) {
                final Long pid = entry.getPlayer().getId();
                final Position pos = entry.getPosition();
                playerNames.putIfAbsent(pid, entry.getPlayer().getName());
                playerGames.merge(pid, pos != null ? pos.getGameWeight() : 1.0, Double::sum);
                if (pos != null) {
                    playerPositions.computeIfAbsent(pid, k -> new HashMap<>())
                        .merge(pos.displayName(), 1L, Long::sum);
                }
                if (entry.getDhBatterPlayer() != null) {
                    final Long dhPid = entry.getDhBatterPlayer().getId();
                    playerNames.putIfAbsent(dhPid, entry.getDhBatterPlayer().getName());
                    playerGames.merge(dhPid, 0.5, Double::sum);
                    playerPositions.computeIfAbsent(dhPid, k -> new HashMap<>())
                        .merge("DH", 1L, Long::sum);
                }
            }
        }

        return playerNames.entrySet().stream()
            .map(e -> new SeasonPlayerStats(
                e.getKey(), e.getValue(),
                playerGames.getOrDefault(e.getKey(), 0.0),
                playerPositions.getOrDefault(e.getKey(), Map.of())
            ))
            .sorted(Comparator.comparingDouble(SeasonPlayerStats::totalGames).reversed())
            .collect(Collectors.toList());
    }
}
