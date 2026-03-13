package com.softball.service;

import com.softball.dto.LineupEntryRequest;
import com.softball.dto.LineupEntryResponse;
import com.softball.dto.LineupSuggestionEntry;
import com.softball.dto.SuggestAllResponse;
import com.softball.dto.TrainingStatsResponse;
import com.softball.entity.*;
import com.softball.exception.ResourceNotFoundException;
import com.softball.repository.GameDayRepository;
import com.softball.repository.GameRepository;
import com.softball.repository.GameStaffRepository;
import com.softball.repository.LineupEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class LineupSuggestionService {

    /** Positions that auto-fill assigns. P, C, EH, DH stay manual. */
    static final List<Position> AUTO_POSITIONS = List.of(
        Position.FIRST_BASE, Position.SECOND_BASE, Position.THIRD_BASE,
        Position.SS, Position.LF, Position.CF, Position.RF
    );

    private final GameRepository gameRepository;
    private final GameDayRepository gameDayRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final GameStaffRepository gameStaffRepository;
    private final TrainingService trainingService;
    private final LineupService lineupService;

    public LineupSuggestionService(final GameRepository gameRepository,
                                    final GameDayRepository gameDayRepository,
                                    final LineupEntryRepository lineupEntryRepository,
                                    final GameStaffRepository gameStaffRepository,
                                    final TrainingService trainingService,
                                    final LineupService lineupService) {
        this.gameRepository = gameRepository;
        this.gameDayRepository = gameDayRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.gameStaffRepository = gameStaffRepository;
        this.trainingService = trainingService;
        this.lineupService = lineupService;
    }

    @Transactional(readOnly = true)
    public List<LineupSuggestionEntry> suggest(final Long gameId) {
        final Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new ResourceNotFoundException("Game", gameId));
        final Long gameDayId = game.getGameDay().getId();

        final GameDayContext ctx = loadGameDayContext(gameDayId);
        final Map<Long, Integer> gamesPlayedCount = countGamesPlayed(ctx.allEntries, gameId);

        return suggestForGame(game, ctx, gamesPlayedCount);
    }

    @Transactional
    public SuggestAllResponse suggestAndSaveAll(final Long gameDayId) {
        final GameDayContext ctx = loadGameDayContext(gameDayId);
        final List<Game> games = ctx.games;

        // Snapshot old lineups (for undo)
        final Map<Long, List<LineupEntryResponse>> oldLineups = new LinkedHashMap<>();
        for (final Game game : games) {
            final List<LineupEntry> entries = ctx.entriesByGame.getOrDefault(game.getId(), List.of());
            oldLineups.put(game.getId(), entries.stream().map(LineupEntryResponse::from).toList());
        }

        // Process games sequentially — each game's result affects the next
        final Map<Long, List<LineupEntryResponse>> newLineups = new LinkedHashMap<>();
        final Map<Long, Integer> gamesPlayedCount = countGamesPlayed(ctx.allEntries, null);

        for (final Game game : games) {
            final List<LineupEntry> currentEntries = ctx.entriesByGame.getOrDefault(game.getId(), List.of());

            // Subtract this game's old entries BEFORE suggesting (so current game doesn't count against itself)
            subtractFromCount(gamesPlayedCount, currentEntries);

            final List<LineupSuggestionEntry> suggestion = suggestForGame(game, ctx, gamesPlayedCount);

            // Save via LineupService (handles delete + create + validation)
            final List<LineupEntryRequest> requests = suggestion.stream()
                .map(s -> new LineupEntryRequest(s.playerId(), s.position(), s.battingOrder(), null))
                .toList();
            final List<LineupEntry> saved = lineupService.setLineup(game.getId(), requests);
            newLineups.put(game.getId(), saved.stream().map(LineupEntryResponse::from).toList());

            // Add new count contribution from this game
            addToCount(gamesPlayedCount, saved);

            // Update context so next game sees this game's lineup
            ctx.entriesByGame.put(game.getId(), saved);
        }

        return new SuggestAllResponse(oldLineups, newLineups);
    }

    @Transactional
    public Map<Long, List<LineupEntryResponse>> undoSuggestAll(final Long gameDayId,
                                                                final Map<Long, List<LineupEntryRequest>> oldLineups) {
        final GameDay gameDay = gameDayRepository.findByIdWithGames(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
        final Set<Long> gameDayGameIds = gameDay.getGames().stream()
            .map(Game::getId).collect(Collectors.toSet());

        final Map<Long, List<LineupEntryResponse>> restored = new LinkedHashMap<>();
        for (final var entry : oldLineups.entrySet()) {
            final Long gameId = entry.getKey();
            if (!gameDayGameIds.contains(gameId)) {
                throw new ResourceNotFoundException("Game " + gameId + " does not belong to GameDay " + gameDayId);
            }
            final List<LineupEntry> saved = lineupService.setLineup(gameId, entry.getValue());
            restored.put(gameId, saved.stream().map(LineupEntryResponse::from).toList());
        }
        return restored;
    }

    // --- Core algorithm ---

    private static final Set<String> MANUAL_POSITIONS = Set.of("P", "C", "EH");

    private List<LineupSuggestionEntry> suggestForGame(final Game game,
                                                        final GameDayContext ctx,
                                                        final Map<Long, Integer> gamesPlayedCount) {
        final Long gameId = game.getId();
        final List<LineupEntry> currentEntries = ctx.entriesByGame.getOrDefault(gameId, List.of());

        // Separate manual entries (P, C, EH only) from auto-position and unassigned entries
        final List<LineupEntry> manualEntries = new ArrayList<>();
        final Set<Long> manualPlayerIds = new HashSet<>();

        for (final LineupEntry entry : currentEntries) {
            final String posName = entry.getPosition() != null ? entry.getPosition().displayName() : null;
            if (posName != null && MANUAL_POSITIONS.contains(posName)) {
                // Only P, C, EH are truly manual — keep them
                manualEntries.add(entry);
                manualPlayerIds.add(entry.getPlayer().getId());
                if (entry.getDhBatterPlayer() != null) {
                    manualPlayerIds.add(entry.getDhBatterPlayer().getId());
                }
            } else {
                // Auto-position or no position → back to candidate pool (DH batter stays locked)
                if (entry.getDhBatterPlayer() != null) {
                    manualPlayerIds.add(entry.getDhBatterPlayer().getId());
                }
            }
        }

        // Staff for THIS game only
        final Set<Long> staffIds = ctx.staffByGame.getOrDefault(gameId, List.of()).stream()
            .map(s -> s.getPlayer().getId()).collect(Collectors.toSet());

        // All 7 auto-positions are always re-shuffled
        final List<Position> positionsToFill = new ArrayList<>(AUTO_POSITIONS);

        // Build candidate pool: available, not manual, not staff, not DH batter
        final List<Long> candidates = ctx.playerMap.keySet().stream()
            .filter(id -> !manualPlayerIds.contains(id))
            .filter(id -> !staffIds.contains(id))
            .sorted(Comparator
                .comparingInt((Long id) -> gamesPlayedCount.getOrDefault(id, 0))
                .thenComparingLong((Long id) -> -ctx.attendanceByPlayer.getOrDefault(id, 0L))
                .thenComparingLong(id -> id))
            .collect(Collectors.toCollection(ArrayList::new));

        // Take top candidates (up to 7)
        final List<Long> assignablePool = candidates.stream()
            .limit(positionsToFill.size())
            .collect(Collectors.toCollection(ArrayList::new));

        // Shuffle positions and players randomly
        final Random random = new Random();
        Collections.shuffle(positionsToFill, random);
        Collections.shuffle(assignablePool, random);

        final Map<Long, Position> newAssignments = new LinkedHashMap<>();
        for (int i = 0; i < positionsToFill.size() && i < assignablePool.size(); i++) {
            newAssignments.put(assignablePool.get(i), positionsToFill.get(i));
        }

        // Build final result: manual entries first, then new assignments
        final List<LineupSuggestionEntry> result = new ArrayList<>();
        int order = 1;

        for (final LineupEntry entry : manualEntries) {
            result.add(new LineupSuggestionEntry(entry.getPlayer().getId(), entry.getPlayer().getName(),
                entry.getPosition() != null ? entry.getPosition().displayName() : null, order++));
        }

        final List<Map.Entry<Long, Position>> assignmentList = new ArrayList<>(newAssignments.entrySet());
        Collections.shuffle(assignmentList, random);
        for (final var entry : assignmentList) {
            final Player player = ctx.playerMap.get(entry.getKey());
            if (player != null) {
                result.add(new LineupSuggestionEntry(player.getId(), player.getName(),
                    entry.getValue().displayName(), order++));
            }
        }

        return result;
    }

    // --- Game-day-wide games-played counting ---

    private void addToCount(final Map<Long, Integer> count, final List<LineupEntry> entries) {
        for (final LineupEntry entry : entries) {
            if (entry.getPosition() != null) {
                count.merge(entry.getPlayer().getId(), 1, Integer::sum);
            }
        }
    }

    private void subtractFromCount(final Map<Long, Integer> count, final List<LineupEntry> entries) {
        for (final LineupEntry entry : entries) {
            if (entry.getPosition() != null) {
                count.merge(entry.getPlayer().getId(), -1, (current, delta) -> Math.max(0, current + delta));
            }
        }
    }

    private Map<Long, Integer> countGamesPlayed(final List<LineupEntry> allEntries, final Long excludeGameId) {
        final Map<Long, Integer> count = new HashMap<>();
        for (final LineupEntry entry : allEntries) {
            if (excludeGameId != null && entry.getGame().getId().equals(excludeGameId)) {
                continue;
            }
            // DH-Batter does NOT count as played
            // Only entries with a position count as "played"
            if (entry.getPosition() != null) {
                count.merge(entry.getPlayer().getId(), 1, Integer::sum);
            }
        }
        return count;
    }

    // --- Batch-load all game day data in minimal DB calls ---

    private GameDayContext loadGameDayContext(final Long gameDayId) {
        final GameDay gdWithPlayers = gameDayRepository.findByIdWithPlayers(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
        final Map<Long, Player> playerMap = gdWithPlayers.getAvailablePlayers().stream()
            .collect(Collectors.toMap(Player::getId, p -> p));

        final GameDay gdWithGames = gameDayRepository.findByIdWithGames(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
        final List<Game> games = gdWithGames.getGames();
        final List<Long> gameIds = games.stream().map(Game::getId).toList();

        // Batch-load all lineup entries for all games
        final List<LineupEntry> allEntries = gameIds.isEmpty()
            ? List.of()
            : lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds);
        final Map<Long, List<LineupEntry>> entriesByGame = new HashMap<>(allEntries.stream()
            .collect(Collectors.groupingBy(e -> e.getGame().getId())));

        // Batch-load all staff for all games
        final List<GameStaff> allStaff = gameIds.isEmpty()
            ? List.of()
            : gameStaffRepository.findByGameIdIn(gameIds);
        final Map<Long, List<GameStaff>> staffByGame = allStaff.stream()
            .collect(Collectors.groupingBy(s -> s.getGame().getId()));

        // Training attendance
        final List<TrainingStatsResponse> trainingStats = trainingService.getStats(null, null);
        final Map<Long, Long> attendanceByPlayer = trainingStats.stream()
            .collect(Collectors.toMap(TrainingStatsResponse::playerId, TrainingStatsResponse::attended));

        return new GameDayContext(games, playerMap, allEntries, entriesByGame, staffByGame, attendanceByPlayer);
    }

    private List<LineupSuggestionEntry> buildResult(final List<LineupEntry> entries) {
        final List<LineupSuggestionEntry> result = new ArrayList<>();
        int order = 1;
        for (final LineupEntry entry : entries) {
            result.add(new LineupSuggestionEntry(
                entry.getPlayer().getId(), entry.getPlayer().getName(),
                entry.getPosition() != null ? entry.getPosition().displayName() : null, order++));
        }
        return result;
    }

    /** Holds all pre-loaded data for a game day to avoid repeated DB queries. */
    private static class GameDayContext {
        final List<Game> games;
        final Map<Long, Player> playerMap;
        final List<LineupEntry> allEntries;
        final Map<Long, List<LineupEntry>> entriesByGame;
        final Map<Long, List<GameStaff>> staffByGame;
        final Map<Long, Long> attendanceByPlayer;

        GameDayContext(final List<Game> games,
                       final Map<Long, Player> playerMap,
                       final List<LineupEntry> allEntries,
                       final Map<Long, List<LineupEntry>> entriesByGame,
                       final Map<Long, List<GameStaff>> staffByGame,
                       final Map<Long, Long> attendanceByPlayer) {
            this.games = games;
            this.playerMap = playerMap;
            this.allEntries = allEntries;
            this.entriesByGame = entriesByGame;
            this.staffByGame = staffByGame;
            this.attendanceByPlayer = attendanceByPlayer;
        }
    }
}
