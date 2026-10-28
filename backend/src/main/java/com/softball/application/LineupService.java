package com.softball.application;

import com.softball.adapter.dto.LineupEntryRequest;
import com.softball.adapter.dto.LineupRuleCheckResponse;
import com.softball.adapter.dto.LineupEntryResponse;
import com.softball.domain.model.*;
import com.softball.domain.service.LineupValidator;
import com.softball.domain.service.LineupGenderRule;
import com.softball.domain.service.LineupValidator.LineupInput;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.GameStaffRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class LineupService {

    private static final LineupGenderRule GENDER_RULE = new LineupGenderRule();

    private static final Logger log = LoggerFactory.getLogger(LineupService.class);

    private final LineupEntryRepository lineupEntryRepository;
    private final GameStaffRepository gameStaffRepository;
    private final PlayerRepository playerRepository;
    private final GameRepository gameRepository;
    private final GameDayRepository gameDayRepository;
    private final LineupValidator lineupValidator = new LineupValidator();

    public LineupService(final LineupEntryRepository lineupEntryRepository,
                         final GameStaffRepository gameStaffRepository,
                         final PlayerRepository playerRepository,
                         final GameRepository gameRepository,
                         final GameDayRepository gameDayRepository) {
        this.lineupEntryRepository = lineupEntryRepository;
        this.gameStaffRepository = gameStaffRepository;
        this.playerRepository = playerRepository;
        this.gameRepository = gameRepository;
        this.gameDayRepository = gameDayRepository;
    }

    @Transactional(readOnly = true)
    public List<LineupEntry> getLineup(final Long gameId) {
        return lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId);
    }

    @Transactional(readOnly = true)
    public Map<Long, List<LineupEntryResponse>> getLineupsForGames(final List<Long> gameIds) {
        return getLineupModelsForGames(gameIds).entrySet().stream().collect(Collectors.toMap(
            Map.Entry::getKey,
            e -> e.getValue().stream().map(LineupEntryResponse::from).toList()));
    }

    /** Dasselbe als Domaenenmodelle, nach Schlagplatz sortiert. */
    @Transactional(readOnly = true)
    public Map<Long, List<LineupEntry>> getLineupModelsForGames(final List<Long> gameIds) {
        if (gameIds.isEmpty()) return Map.of();
        return lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds).stream()
            .collect(Collectors.groupingBy(e -> e.getGame().getId()));
    }

    @Transactional
    public List<LineupEntry> setLineup(final Long gameId, final List<LineupEntryRequest> entries) {
        final Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new ResourceNotFoundException("Game", gameId));
        log.info("Lineup setzen fuer Game {} mit {} Eintraegen", game.getId(), entries.size());
        validate(game, entries);

        lineupEntryRepository.deleteByGameId(game.getId());

        // Batch-load all referenced players in one query (avoids N+1)
        final Set<Long> allPlayerIds = new LinkedHashSet<>();
        entries.forEach(req -> {
            allPlayerIds.add(req.playerId());
            if (req.dhBatterPlayerId() != null) allPlayerIds.add(req.dhBatterPlayerId());
        });
        final Map<Long, Player> playerMap = playerRepository.findAllById(allPlayerIds).stream()
            .collect(Collectors.toMap(Player::getId, Function.identity()));

        return entries.stream().map(req -> {
            final Player player = playerMap.get(req.playerId());
            if (player == null) throw new ResourceNotFoundException("Player", req.playerId());
            final Position position = req.position() != null ? parsePosition(req.position()) : null;
            Player dhBatterPlayer = null;
            if (req.dhBatterPlayerId() != null) {
                dhBatterPlayer = playerMap.get(req.dhBatterPlayerId());
                if (dhBatterPlayer == null) throw new ResourceNotFoundException("Player", req.dhBatterPlayerId());
            }
            final LineupEntry entry = new LineupEntry();
            entry.setGame(game);
            entry.setPlayer(player);
            entry.setPosition(position);
            entry.setBattingOrder(req.battingOrder());
            entry.setDhBatterPlayer(dhBatterPlayer);
            return lineupEntryRepository.save(entry);
        }).toList();
    }

    /**
     * Prüft eine (auch noch nicht gespeicherte) Aufstellung gegen die Frauen-Quote.
     * Reine Lesefunktion: der Editor fragt damit seinen Entwurf ab.
     */
    @Transactional(readOnly = true)
    public LineupRuleCheckResponse checkRules(final Long gameId, final List<LineupEntryRequest> entries) {
        final Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new ResourceNotFoundException("Game", gameId));
        final Set<Long> playerIds = entries.stream().map(LineupEntryRequest::playerId).collect(Collectors.toSet());
        final Map<Long, Player> playerMap = playerRepository.findAllById(playerIds).stream()
            .collect(Collectors.toMap(Player::getId, Function.identity()));

        final List<LineupEntry> draft = entries.stream().map(req -> {
            final LineupEntry entry = new LineupEntry();
            entry.setPlayer(playerMap.get(req.playerId()));
            entry.setPosition(req.position() != null ? parsePosition(req.position()) : null);
            entry.setBattingOrder(req.battingOrder());
            return entry;
        }).toList();

        final LineupGenderRule.Count count = GENDER_RULE.count(draft);
        return new LineupRuleCheckResponse(
            GENDER_RULE.check(draft, availableWomen(game)), count.onField(), count.inInfield());
    }

    /**
     * Wie viele Frauen an diesem Spieltag zugesagt haben. Sind es weniger als die Quote
     * verlangt, gibt es nichts umzustellen — der Hinweis sagt dann, woran es liegt.
     */
    private int availableWomen(final Game game) {
        if (game.getGameDay() == null || game.getGameDay().getId() == null) {
            return LineupGenderRule.UNKNOWN_AVAILABILITY;
        }
        return gameDayRepository.findByIdWithPlayers(game.getGameDay().getId())
            .map(day -> (int) day.getAvailablePlayers().stream()
                .filter(p -> p.getGender() == Gender.FEMALE)
                .count())
            .orElse(LineupGenderRule.UNKNOWN_AVAILABILITY);
    }

    private void validate(final Game game, final List<LineupEntryRequest> entries) {
        final List<LineupInput> inputs = entries.stream()
            .map(e -> new LineupInput(e.playerId(), e.position(), e.battingOrder(), e.dhBatterPlayerId()))
            .toList();

        final Set<Long> staffPlayerIds = gameStaffRepository.findByGameId(game.getId()).stream()
            .map(s -> s.getPlayer().getId())
            .collect(Collectors.toSet());

        final Set<Long> availableIds = (game.getGameDay().getAvailablePlayers() != null)
            ? game.getGameDay().getAvailablePlayers().stream().map(Player::getId).collect(Collectors.toSet())
            : Set.of();

        try {
            lineupValidator.validate(inputs, staffPlayerIds, availableIds, playerNamesFor(inputs, staffPlayerIds));
        } catch (final LineupValidator.LineupValidationException e) {
            throw new BusinessValidationException(e.getMessage());
        }
    }

    /** id → Name fuer alle beteiligten Spieler (Lineup, DH-Batter, Coaches), damit Fehlermeldungen Namen nennen. */
    private Map<Long, String> playerNamesFor(final List<LineupInput> inputs, final Set<Long> staffPlayerIds) {
        final Set<Long> ids = new LinkedHashSet<>(staffPlayerIds);
        inputs.forEach(i -> {
            ids.add(i.playerId());
            if (i.dhBatterPlayerId() != null) ids.add(i.dhBatterPlayerId());
        });
        if (ids.isEmpty()) return Map.of();
        return playerRepository.findAllById(ids).stream()
            .collect(Collectors.toMap(Player::getId, Player::getName));
    }

    static Position parsePosition(final String position) {
        try {
            return Position.fromString(position);
        } catch (final IllegalArgumentException e) {
            throw new BusinessValidationException("Ungueltige Position: " + position + ". Erlaubt: P, C, 1B, 2B, 3B, SS, LF, CF, RF, EH");
        }
    }
}
