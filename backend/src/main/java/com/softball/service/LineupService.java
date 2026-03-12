package com.softball.service;

import com.softball.dto.LineupEntryRequest;
import com.softball.dto.LineupEntryResponse;
import com.softball.entity.*;
import com.softball.exception.BusinessValidationException;
import com.softball.exception.ResourceNotFoundException;
import com.softball.repository.GameRepository;
import com.softball.repository.GameStaffRepository;
import com.softball.repository.LineupEntryRepository;
import com.softball.repository.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LineupService {

    private static final Logger log = LoggerFactory.getLogger(LineupService.class);
    private static final int MAX_LINEUP_SIZE = 10;

    private final LineupEntryRepository lineupEntryRepository;
    private final GameStaffRepository gameStaffRepository;
    private final PlayerRepository playerRepository;
    private final GameRepository gameRepository;

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
        lineupEntryRepository.flush();

        return entries.stream().map(req -> {
            final Player player = playerRepository.findById(req.playerId())
                .orElseThrow(() -> new ResourceNotFoundException("Player", req.playerId()));
            final Position position = req.position() != null ? parsePosition(req.position()) : null;
            Player dhBatterPlayer = null;
            if (req.dhBatterPlayerId() != null) {
                dhBatterPlayer = playerRepository.findById(req.dhBatterPlayerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Player", req.dhBatterPlayerId()));
            }
            return lineupEntryRepository.save(new LineupEntry(game, player, position, req.battingOrder(), dhBatterPlayer));
        }).toList();
    }

    private void validate(final Game game, final List<LineupEntryRequest> entries) {
        if (entries.size() > MAX_LINEUP_SIZE) {
            throw new BusinessValidationException("Lineup darf maximal " + MAX_LINEUP_SIZE + " Spieler haben");
        }

        validateNoDuplicatePlayers(entries);
        validateBattingOrder(entries);
        validatePositions(entries);
        validateDhBatter(entries);
        validateNoConflictWithStaff(game.getId(), entries);
        validatePlayerAvailability(game, entries);
    }

    private void validateNoDuplicatePlayers(final List<LineupEntryRequest> entries) {
        final Set<Long> playerIds = new HashSet<>();
        for (final LineupEntryRequest entry : entries) {
            if (!playerIds.add(entry.playerId())) {
                throw new BusinessValidationException("Spieler " + entry.playerId() + " ist doppelt im Lineup");
            }
        }
    }

    private void validateBattingOrder(final List<LineupEntryRequest> entries) {
        final Set<Integer> battingOrders = new HashSet<>();
        for (final LineupEntryRequest entry : entries) {
            if (!battingOrders.add(entry.battingOrder())) {
                throw new BusinessValidationException("Batting Order " + entry.battingOrder() + " ist doppelt vergeben");
            }
        }

        final List<Integer> sorted = battingOrders.stream().sorted().toList();
        for (int i = 0; i < sorted.size(); i++) {
            if (sorted.get(i) != i + 1) {
                throw new BusinessValidationException("Batting Order muss sequenziell sein (1, 2, 3, ...), fehlt: " + (i + 1));
            }
        }
    }

    private void validatePositions(final List<LineupEntryRequest> entries) {
        final Set<Position> usedFieldPositions = new HashSet<>();
        for (final LineupEntryRequest entry : entries) {
            if (entry.position() == null) {
                continue;
            }
            final Position pos = parsePosition(entry.position());
            if (pos.isFieldPosition() && !usedFieldPositions.add(pos)) {
                throw new BusinessValidationException("Position " + pos.displayName() + " ist doppelt vergeben");
            }
        }
    }

    private void validateDhBatter(final List<LineupEntryRequest> entries) {
        final Set<Long> lineupPlayerIds = entries.stream()
            .map(LineupEntryRequest::playerId)
            .collect(Collectors.toSet());
        int dhBatterCount = 0;
        for (final LineupEntryRequest entry : entries) {
            if (entry.dhBatterPlayerId() != null) {
                dhBatterCount++;
                if (entry.position() == null) {
                    throw new BusinessValidationException("DH-Batter darf nur fuer Feldspieler gesetzt werden, nicht ohne Position");
                }
                final Position pos = parsePosition(entry.position());
                if (!pos.isFieldPosition()) {
                    throw new BusinessValidationException("DH-Batter darf nur fuer Feldspieler gesetzt werden, nicht fuer " + pos.displayName());
                }
                if (lineupPlayerIds.contains(entry.dhBatterPlayerId())) {
                    throw new BusinessValidationException("DH-Batter " + entry.dhBatterPlayerId() + " darf nicht selbst im Lineup sein");
                }
                if (dhBatterCount > 1) {
                    throw new BusinessValidationException("Maximal 1 DH-Batter pro Lineup erlaubt");
                }
            }
        }
    }

    private void validateNoConflictWithStaff(final Long gameId, final List<LineupEntryRequest> entries) {
        final Set<Long> staffPlayerIds = gameStaffRepository.findByGameId(gameId).stream()
            .map(s -> s.getPlayer().getId())
            .collect(Collectors.toSet());
        for (final LineupEntryRequest entry : entries) {
            if (staffPlayerIds.contains(entry.playerId())) {
                throw new BusinessValidationException("Spieler " + entry.playerId() + " ist bereits als Base Coach eingeteilt");
            }
        }
    }

    private void validatePlayerAvailability(final Game game, final List<LineupEntryRequest> entries) {
        final GameDay gameDay = game.getGameDay();
        if (gameDay.getAvailablePlayers() != null && !gameDay.getAvailablePlayers().isEmpty()) {
            final Set<Long> availableIds = gameDay.getAvailablePlayers().stream()
                .map(Player::getId)
                .collect(Collectors.toSet());
            for (final LineupEntryRequest entry : entries) {
                if (!availableIds.contains(entry.playerId())) {
                    throw new BusinessValidationException("Spieler " + entry.playerId() + " ist nicht fuer diesen Spieltag eingetragen");
                }
                if (entry.dhBatterPlayerId() != null && !availableIds.contains(entry.dhBatterPlayerId())) {
                    throw new BusinessValidationException("DH-Batter " + entry.dhBatterPlayerId() + " ist nicht fuer diesen Spieltag eingetragen");
                }
            }
        }
    }

    static Position parsePosition(final String position) {
        try {
            return Position.fromString(position);
        } catch (final IllegalArgumentException e) {
            throw new BusinessValidationException("Ungueltige Position: " + position + ". Erlaubt: P, C, 1B, 2B, 3B, SS, LF, CF, RF, EH");
        }
    }
}
