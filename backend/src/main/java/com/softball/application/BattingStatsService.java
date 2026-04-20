package com.softball.application;

import com.softball.adapter.dto.PlayerBattingStatsResponse;
import com.softball.domain.model.AtBat;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.BattingStats;
import com.softball.domain.model.Game;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.Player;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.BaseRunningEventRepository;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.service.BattingStatsCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class BattingStatsService {

    private final AtBatRepository atBatRepository;
    private final BaseRunningEventRepository stealingRepository;
    private final GameRepository gameRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final PlayerRepository playerRepository;
    private final BattingStatsCalculator calculator = new BattingStatsCalculator();

    public BattingStatsService(final AtBatRepository atBatRepository,
                                final BaseRunningEventRepository stealingRepository,
                                final GameRepository gameRepository,
                                final LineupEntryRepository lineupEntryRepository,
                                final PlayerRepository playerRepository) {
        this.atBatRepository = atBatRepository;
        this.stealingRepository = stealingRepository;
        this.gameRepository = gameRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.playerRepository = playerRepository;
    }

    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getGameStats(final Long gameId) {
        final List<AtBat> atBats = atBatRepository.findByGameIdOrderBySequenceAsc(gameId);
        final List<BaseRunningEvent> steals = stealingRepository.findByGameIdOrderByIdAsc(gameId);
        final List<LineupEntry> lineup = lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId);

        final List<Player> players = collectPlayers(atBats, steals, lineup);
        return toResponses(calculator.calculateForPlayers(players, atBats, steals));
    }

    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getGameDayStats(final Long gameDayId) {
        final List<Game> games = gameRepository.findByGameDayIdOrderByGameNumberAsc(gameDayId);
        final List<Long> gameIds = games.stream().map(Game::getId).toList();
        if (gameIds.isEmpty()) return List.of();

        final List<AtBat> atBats = atBatRepository.findByGameIdInOrderBySequenceAsc(gameIds);
        final List<BaseRunningEvent> steals = stealingRepository.findByGameIdInOrderByIdAsc(gameIds);
        final List<LineupEntry> lineups = lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds);

        final List<Player> players = collectPlayers(atBats, steals, lineups);
        return toResponses(calculator.calculateForPlayers(players, atBats, steals));
    }

    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getSeasonStats(final Long seasonId) {
        final List<AtBat> atBats = atBatRepository.findBySeasonId(seasonId);
        final List<BaseRunningEvent> steals = stealingRepository.findBySeasonId(seasonId);
        return statsFromEvents(atBats, steals);
    }

    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getYearStats(final int year) {
        final List<AtBat> atBats = atBatRepository.findByYear(year);
        final List<BaseRunningEvent> steals = stealingRepository.findByYear(year);
        return statsFromEvents(atBats, steals);
    }

    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getAllTimeStats() {
        final List<AtBat> atBats = atBatRepository.findAll();
        final List<BaseRunningEvent> steals = stealingRepository.findAll();
        return statsFromEvents(atBats, steals);
    }

    private List<PlayerBattingStatsResponse> statsFromEvents(final List<AtBat> atBats, final List<BaseRunningEvent> steals) {
        final Set<Long> playerIds = new HashSet<>();
        for (final AtBat a : atBats) if (a.getBatter() != null) playerIds.add(a.getBatter().getId());
        for (final BaseRunningEvent e : steals) if (e.getRunner() != null) playerIds.add(e.getRunner().getId());
        if (playerIds.isEmpty()) return List.of();

        final List<Player> players = playerRepository.findAllById(playerIds);
        return toResponses(calculator.calculateForPlayers(players, atBats, steals));
    }

    private List<Player> collectPlayers(final List<AtBat> atBats,
                                         final List<BaseRunningEvent> steals,
                                         final List<LineupEntry> lineup) {
        // LinkedHashMap um Reihenfolge stabil zu halten (Batting-Order erst, dann andere)
        final Map<Long, Player> map = new LinkedHashMap<>();
        for (final LineupEntry e : lineup) {
            if (e.getPlayer() != null) map.putIfAbsent(e.getPlayer().getId(), e.getPlayer());
        }
        for (final AtBat a : atBats) {
            if (a.getBatter() != null) map.putIfAbsent(a.getBatter().getId(), a.getBatter());
        }
        for (final BaseRunningEvent e : steals) {
            if (e.getRunner() != null) map.putIfAbsent(e.getRunner().getId(), e.getRunner());
        }
        return new ArrayList<>(map.values());
    }

    private List<PlayerBattingStatsResponse> toResponses(final List<BattingStats> stats) {
        final List<PlayerBattingStatsResponse> result = new ArrayList<>(stats.size());
        for (final BattingStats s : stats) result.add(PlayerBattingStatsResponse.from(s));
        // Sortiert nach Trefferquote desc, dann Hits desc
        result.sort(Comparator
            .comparing(PlayerBattingStatsResponse::battingAverage).reversed()
            .thenComparing(Comparator.comparingInt(PlayerBattingStatsResponse::hits).reversed())
            .thenComparing(PlayerBattingStatsResponse::playerName));
        return result;
    }
}
