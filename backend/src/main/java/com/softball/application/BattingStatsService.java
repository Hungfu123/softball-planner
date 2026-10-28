package com.softball.application;

import com.softball.adapter.dto.OpponentBattingStatsResponse;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
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

    /**
     * @param mitAufstellung darf der Anfragende die Aufstellung sehen? Die Aufstellung ist der
     *        einzige Keim in {@link #collectPlayers}, der Spieler OHNE At-Bat aufnimmt — bei
     *        einem Spiel, das noch nicht angefangen hat, waere die Antwort exakt die
     *        Aufstellung und sonst nichts. Ist sie verborgen, wird nur aus At-Bats und Steals
     *        aufgesammelt: ein kuenftiges Spiel liefert dann nichts, ein gespieltes alles.
     */
    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getGameStats(final Long gameId, final boolean mitAufstellung) {
        final List<AtBat> atBats = atBatRepository.findByGameIdOrderBySequenceAsc(gameId);
        final List<BaseRunningEvent> steals = stealingRepository.findByGameIdOrderByIdAsc(gameId);
        final List<LineupEntry> lineup = mitAufstellung
            ? lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId)
            : List.of();

        final List<Player> players = collectPlayers(atBats, steals, lineup);
        return toResponses(calculator.calculateForPlayers(players, atBats, steals));
    }

    /** @param mitAufstellung siehe {@link #getGameStats(Long, boolean)}. */
    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getGameDayStats(final Long gameDayId, final boolean mitAufstellung) {
        return toResponses(gameDayBattingStats(gameDayId, mitAufstellung));
    }

    /**
     * Domänen-Aggregation pro Spieltag (für Awards & DTO-Wiederverwendung).
     *
     * <p>Mit Aufstellung: die Auszeichnungen brauchen keine Lesegrenze, weil
     * {@code GamedayAwardCalculator} mindestens zwei Plate Appearances (bzw. einen Steal oder
     * Walk) verlangt — wer nur aufgestellt ist, taucht dort nie auf.
     */
    @Transactional(readOnly = true)
    public List<BattingStats> getGameDayBattingStats(final Long gameDayId) {
        return gameDayBattingStats(gameDayId, true);
    }

    private List<BattingStats> gameDayBattingStats(final Long gameDayId, final boolean mitAufstellung) {
        final List<Game> games = gameRepository.findByGameDayIdOrderByGameNumberAsc(gameDayId);
        final List<Long> gameIds = games.stream().map(Game::getId).toList();
        if (gameIds.isEmpty()) return List.of();

        final List<AtBat> atBats = atBatRepository.findByGameIdInOrderBySequenceAsc(gameIds);
        final List<BaseRunningEvent> steals = stealingRepository.findByGameIdInOrderByIdAsc(gameIds);
        final List<LineupEntry> lineups = mitAufstellung
            ? lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds)
            : List.of();

        final List<Player> players = collectPlayers(atBats, steals, lineups);
        return calculator.calculateForPlayers(players, atBats, steals);
    }

    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getSeasonStats(final Long seasonId) {
        return toResponses(getSeasonBattingStats(seasonId));
    }

    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getYearStats(final int year) {
        return toResponses(getYearBattingStats(year));
    }

    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getAllTimeStats() {
        return toResponses(getAllTimeBattingStats());
    }

    /** Domänen-Aggregation (für Awards & DTO-Wiederverwendung) — pro Saison / Jahr / All-Time. */
    @Transactional(readOnly = true)
    public List<BattingStats> getSeasonBattingStats(final Long seasonId) {
        return battingStatsFromEvents(
            atBatRepository.findBySeasonId(seasonId), stealingRepository.findBySeasonId(seasonId));
    }

    @Transactional(readOnly = true)
    public List<BattingStats> getYearBattingStats(final int year) {
        return battingStatsFromEvents(
            atBatRepository.findByYear(year), stealingRepository.findByYear(year));
    }

    @Transactional(readOnly = true)
    public List<BattingStats> getAllTimeBattingStats() {
        return battingStatsFromEvents(atBatRepository.findAll(), stealingRepository.findAll());
    }

    /**
     * Gegner-Split: Schlag-Statistik aller Spieler gegen EINEN Gegner —
     * über alle eigenen Spiele vs. dieses Team, übergreifend über alle Saisons
     * ("womit schlage ich gut gegen X?"). Schlüssel ist der Team-NAME: League-Teams
     * sind pro Saison angelegt, derselbe Gegner existiert über die Jahre als
     * mehrere Zeilen mit unterschiedlichen IDs.
     */
    @Transactional(readOnly = true)
    public List<PlayerBattingStatsResponse> getOpponentBattingStats(final String teamName) {
        final List<Long> gameIds = gameRepository.findAllWithOpponent().stream()
            .filter(g -> g.getOpponentTeam().getName().trim().equals(teamName.trim()))
            .map(Game::getId)
            .toList();
        if (gameIds.isEmpty()) {
            return List.of();
        }
        return toResponses(battingStatsFromEvents(
            atBatRepository.findByGameIdInOrderBySequenceAsc(gameIds),
            stealingRepository.findByGameIdInOrderByIdAsc(gameIds)));
    }

    /**
     * Gegner-Übersicht: team-aggregierte Schlag-Stats pro Gegner, absteigend nach AVG —
     * zeigt auf einen Blick, gegen wen das Team gut schlägt. Gruppiert nach Team-Namen
     * über alle Saisons hinweg (gleiche Gegender aus verschiedenen Saisons werden
     * zu einer Zeile zusammengefasst).
     */
    @Transactional(readOnly = true)
    public List<OpponentBattingStatsResponse> getOpponentBattingOverview() {
        final List<Game> games = gameRepository.findAllWithOpponent();
        // AtBats tragen nur die minimale Game-Referenz — Gegner-Lookup über gameId
        final Map<Long, String> opponentNameByGameId = new HashMap<>();
        final Map<String, Integer> gamesByOpponent = new HashMap<>();
        for (final Game g : games) {
            final String rawName = g.getOpponentTeam().getName().trim();
            opponentNameByGameId.put(g.getId(), rawName);
            gamesByOpponent.merge(rawName, 1, Integer::sum);
        }

        // At-Bats pro Gegner aggregieren — [pa, ab, hits, runs]
        final Map<String, int[]> totalsByOpponent = new HashMap<>();
        for (final AtBat ab : atBatRepository.findAll()) {
            final String opponent = opponentNameByGameId.get(ab.getGame().getId());
            if (opponent == null) continue;
            final int[] t = totalsByOpponent.computeIfAbsent(opponent, k -> new int[4]);
            t[0]++;
            if (ab.getResult() != null && ab.getResult().countsAsAtBat()) t[1]++;
            if (ab.getResult() != null && ab.getResult().isHit()) t[2]++;
            t[3] += ab.getRunsScored() != null ? ab.getRunsScored() : 0;
        }

        final List<OpponentBattingStatsResponse> result = new ArrayList<>();
        for (final var entry : gamesByOpponent.entrySet()) {
            final int[] t = totalsByOpponent.getOrDefault(entry.getKey(), new int[4]);
            result.add(new OpponentBattingStatsResponse(
                entry.getKey(), entry.getValue(), t[0], t[1], t[2], t[3],
                divide(t[2], t[1])));
        }
        result.sort(Comparator.comparing(OpponentBattingStatsResponse::battingAverage).reversed()
            .thenComparing(OpponentBattingStatsResponse::teamName));
        return result;
    }

    private static BigDecimal divide(final int numerator, final int denominator) {
        if (denominator == 0) return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        return BigDecimal.valueOf(numerator)
            .divide(BigDecimal.valueOf(denominator), 3, RoundingMode.HALF_UP);
    }

    private List<BattingStats> battingStatsFromEvents(final List<AtBat> atBats, final List<BaseRunningEvent> steals) {
        final Set<Long> playerIds = new HashSet<>();
        for (final AtBat a : atBats) if (a.getBatter() != null) playerIds.add(a.getBatter().getId());
        for (final BaseRunningEvent e : steals) if (e.getRunner() != null) playerIds.add(e.getRunner().getId());
        if (playerIds.isEmpty()) return List.of();

        final List<Player> players = playerRepository.findAllById(playerIds).stream()
            .filter(p -> !p.isArchived())
            .toList();
        return calculator.calculateForPlayers(players, atBats, steals);
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
        return map.values().stream().filter(p -> !p.isArchived()).toList();
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
