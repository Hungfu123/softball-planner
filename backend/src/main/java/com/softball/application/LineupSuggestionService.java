package com.softball.application;

import com.softball.adapter.dto.LineupEntryRequest;
import com.softball.adapter.dto.LineupEntryResponse;
import com.softball.adapter.dto.LineupSuggestionEntry;
import com.softball.adapter.dto.SuggestAllResponse;
import com.softball.domain.model.*;
import com.softball.domain.service.LineupSuggestionEngine;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.GameStaffRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LineupSuggestionService {

    /**
     * ISO-Wochentag des P/C-Trainings (1 = Montag … 7 = Sonntag).
     *
     * <p>Bis Oktober 2026 der Montag, seit der Winterstruktur der Donnerstag. Pendant zu
     * {@code frontend/src/utils/trainingWeekday.ts} — beim naechsten Strukturwechsel
     * muessen beide Stellen mitziehen.
     */
    private static final int PITCHER_CATCHER_WEEKDAY = 4;

    /** Monat, in dem das Trainingsjahr beginnt — mit der Winterstruktur der November. */
    private static final int TRAINING_YEAR_START_MONTH = 11;

    /**
     * Beginn des laufenden Trainingsjahres: der letzte 1. November.
     *
     * <p>Die Trainingsbeteiligung zaehlt ab hier, nicht ueber ein rollendes Fenster. Das
     * Fenster waechst damit ueber die Saison — im Februar ist es schmal und aktuell, im
     * September elf Monate breit und entsprechend traege. Bewusst so: ein Trainingsjahr
     * zaehlt als Ganzes, und der Schnitt im November faellt in die spielfreie Zeit.
     *
     * <p>Pendant im Frontend: {@code frontend/src/utils/trainingYear.ts}.
     */
    static LocalDate trainingYearStart(final LocalDate today) {
        final LocalDate startThisYear = LocalDate.of(today.getYear(), TRAINING_YEAR_START_MONTH, 1);
        return today.isBefore(startThisYear) ? startThisYear.minusYears(1) : startThisYear;
    }

    private final GameRepository gameRepository;
    private final GameDayRepository gameDayRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final GameStaffRepository gameStaffRepository;
    private final TrainingStatsService trainingStatsService;
    private final LineupService lineupService;
    private final LineupSuggestionEngine engine = new LineupSuggestionEngine();

    public LineupSuggestionService(final GameRepository gameRepository,
                                    final GameDayRepository gameDayRepository,
                                    final LineupEntryRepository lineupEntryRepository,
                                    final GameStaffRepository gameStaffRepository,
                                    final TrainingStatsService trainingStatsService,
                                    final LineupService lineupService) {
        this.gameRepository = gameRepository;
        this.gameDayRepository = gameDayRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.gameStaffRepository = gameStaffRepository;
        this.trainingStatsService = trainingStatsService;
        this.lineupService = lineupService;
    }

    @Transactional(readOnly = true)
    public List<LineupSuggestionEntry> suggest(final Long gameId) {
        final Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new ResourceNotFoundException("Game", gameId));
        final Long gameDayId = game.getGameDay().getId();

        final GameDayContext ctx = loadGameDayContext(gameDayId);
        final Map<Long, Integer> gamesPlayedCount = engine.countGamesPlayed(ctx.allEntries, gameId);

        return toDto(suggestForGame(game, ctx, gamesPlayedCount));
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
        final Map<Long, Integer> gamesPlayedCount = engine.countGamesPlayed(ctx.allEntries, null);

        for (final Game game : games) {
            final List<LineupEntry> currentEntries = ctx.entriesByGame.getOrDefault(game.getId(), List.of());

            // Subtract this game's old entries BEFORE suggesting
            engine.subtractFromCount(gamesPlayedCount, currentEntries);

            final List<SuggestionResult> suggestion = suggestForGame(game, ctx, gamesPlayedCount);

            // Save via LineupService
            final List<LineupEntryRequest> requests = suggestion.stream()
                .map(s -> new LineupEntryRequest(s.playerId(), s.position(), s.battingOrder(), null))
                .toList();
            final List<LineupEntry> saved = lineupService.setLineup(game.getId(), requests);
            newLineups.put(game.getId(), saved.stream().map(LineupEntryResponse::from).toList());

            // Add new count contribution from this game
            engine.addToCount(gamesPlayedCount, saved);

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

    // --- Delegates to domain engine ---

    private List<SuggestionResult> suggestForGame(final Game game,
                                                    final GameDayContext ctx,
                                                    final Map<Long, Integer> gamesPlayedCount) {
        final Long gameId = game.getId();
        final List<LineupEntry> currentEntries = ctx.entriesByGame.getOrDefault(gameId, List.of());

        final Set<Long> staffIds = ctx.staffByGame.getOrDefault(gameId, List.of()).stream()
            .map(s -> s.getPlayer().getId()).collect(Collectors.toSet());

        return engine.suggest(currentEntries, ctx.playerMap, staffIds,
            gamesPlayedCount, ctx.participationByPlayer, new Random());
    }

    private List<LineupSuggestionEntry> toDto(final List<SuggestionResult> results) {
        return results.stream()
            .map(r -> new LineupSuggestionEntry(r.playerId(), r.playerName(), r.position(), r.battingOrder()))
            .toList();
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

        final List<LineupEntry> allEntries = gameIds.isEmpty()
            ? List.of()
            : lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds);
        final Map<Long, List<LineupEntry>> entriesByGame = new HashMap<>(allEntries.stream()
            .collect(Collectors.groupingBy(e -> e.getGame().getId())));

        final List<GameStaff> allStaff = gameIds.isEmpty()
            ? List.of()
            : gameStaffRepository.findByGameIdIn(gameIds);
        final Map<Long, List<GameStaff>> staffByGame = allStaff.stream()
            .collect(Collectors.groupingBy(s -> s.getGame().getId()));

        // Beteiligung als Quote, nicht als Zaehler, und ohne das P/C-Training: dorthin sind
        // nur Pitcher und Catcher eingeladen, wer nur Basic kann laege sonst strukturell
        // hinten. Zaehler und Nenner kommen beide aus derselben gefilterten Menge.
        //
        // Das Fenster endet AM SPIELTAG, nicht offen. Ohne obere Grenze zaehlen bereits
        // angelegte kuenftige Trainings in den Nenner, bei denen niemand da gewesen sein
        // kann — und sie treffen kleine Nenner am haertesten, also genau die Neuzugaenge,
        // fuer die die Quote gebaut ist. Der Spieltag ist auch der richtige Anker: die
        // Aufstellung fuer den 20.06. interessiert, wer bis dahin trainiert hat.
        final LocalDate asOf = gdWithPlayers.getDate() != null ? gdWithPlayers.getDate() : LocalDate.now();
        final Map<Long, Double> participationByPlayer = trainingStatsService.getParticipationRates(
            null, trainingYearStart(asOf), asOf, Set.of(PITCHER_CATCHER_WEEKDAY));

        return new GameDayContext(games, playerMap, allEntries, entriesByGame, staffByGame, participationByPlayer);
    }

    /** Holds all pre-loaded data for a game day to avoid repeated DB queries. */
    static class GameDayContext {
        final List<Game> games;
        final Map<Long, Player> playerMap;
        final List<LineupEntry> allEntries;
        final Map<Long, List<LineupEntry>> entriesByGame;
        final Map<Long, List<GameStaff>> staffByGame;
        final Map<Long, Double> participationByPlayer;

        GameDayContext(final List<Game> games,
                       final Map<Long, Player> playerMap,
                       final List<LineupEntry> allEntries,
                       final Map<Long, List<LineupEntry>> entriesByGame,
                       final Map<Long, List<GameStaff>> staffByGame,
                       final Map<Long, Double> participationByPlayer) {
            this.games = games;
            this.playerMap = playerMap;
            this.allEntries = allEntries;
            this.entriesByGame = entriesByGame;
            this.staffByGame = staffByGame;
            this.participationByPlayer = participationByPlayer;
        }
    }
}
