package com.softball.application;

import com.softball.adapter.dto.LineupEntryRequest;
import com.softball.adapter.dto.LineupEntryResponse;
import com.softball.domain.model.*;
import com.softball.domain.service.LineupValidator;
import com.softball.domain.service.LineupValidator.LineupInput;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
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

    private static final Logger log = LoggerFactory.getLogger(LineupService.class);

    private final LineupEntryRepository lineupEntryRepository;
    private final GameStaffRepository gameStaffRepository;
    private final PlayerRepository playerRepository;
    private final GameRepository gameRepository;
    private final LineupValidator lineupValidator = new LineupValidator();

    public LineupService(final LineupEntryRepository lineupEntryRepository,
                         final GameStaffRepository gameStaffRepository,
                         final PlayerRepository playerRepository,
                         final GameRepository gameRepository) {
        this.lineupEntryRepository = lineupEntryRepository;
        this.gameStaffRepository = gameStaffRepository;
        this.playerRepository = playerRepository;
        this.gameRepository = gameRepository;
    }

    @Transactional(readOnly = true)
    public List<LineupEntry> getLineup(final Long gameId) {
        return lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId);
    }

    @Transactional(readOnly = true)
    public Map<Long, List<LineupEntryResponse>> getLineupsForGames(final List<Long> gameIds) {
        if (gameIds.isEmpty()) return Map.of();
        return lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds).stream()
            .collect(Collectors.groupingBy(
                e -> e.getGame().getId(),
                Collectors.mapping(LineupEntryResponse::from, Collectors.toList())
            ));
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
