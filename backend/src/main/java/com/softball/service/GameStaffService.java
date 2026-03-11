package com.softball.service;

import com.softball.dto.GameStaffRequest;
import com.softball.entity.*;
import com.softball.exception.LineupValidationException;
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
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class GameStaffService {

    private static final Logger log = LoggerFactory.getLogger(GameStaffService.class);

    private final GameStaffRepository gameStaffRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final PlayerRepository playerRepository;
    private final GameRepository gameRepository;

    public GameStaffService(final GameStaffRepository gameStaffRepository,
                            final LineupEntryRepository lineupEntryRepository,
                            final PlayerRepository playerRepository,
                            final GameRepository gameRepository) {
        this.gameStaffRepository = gameStaffRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.playerRepository = playerRepository;
        this.gameRepository = gameRepository;
    }

    @Transactional(readOnly = true)
    public List<GameStaff> getStaff(final Long gameId) {
        return gameStaffRepository.findByGameId(gameId);
    }

    @Transactional
    public List<GameStaff> setStaff(final Long gameId, final List<GameStaffRequest> staffRequests) {
        final Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new ResourceNotFoundException("Game", gameId));
        log.info("Staff setzen fuer Game {} mit {} Eintraegen", game.getId(), staffRequests.size());
        validate(game.getId(), staffRequests);

        gameStaffRepository.deleteByGameId(game.getId());
        gameStaffRepository.flush();

        return staffRequests.stream().map(req -> {
            final Player player = playerRepository.findById(req.playerId())
                .orElseThrow(() -> new ResourceNotFoundException("Player", req.playerId()));
            final StaffRole role = parseStaffRole(req.role());
            return gameStaffRepository.save(new GameStaff(game, player, role));
        }).toList();
    }

    private void validate(final Long gameId, final List<GameStaffRequest> staffRequests) {
        if (staffRequests.size() > 2) {
            throw new LineupValidationException("Maximal 2 Base Coaches erlaubt");
        }

        final Set<Long> playerIds = new HashSet<>();
        for (final GameStaffRequest req : staffRequests) {
            if (!playerIds.add(req.playerId())) {
                throw new LineupValidationException("Spieler " + req.playerId() + " ist doppelt als Coach eingetragen");
            }
        }

        final Set<String> roles = new HashSet<>();
        for (final GameStaffRequest req : staffRequests) {
            if (!roles.add(req.role())) {
                throw new LineupValidationException("Rolle " + req.role() + " ist doppelt vergeben");
            }
            parseStaffRole(req.role());
        }

        final Set<Long> lineupPlayerIds = lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId).stream()
            .map(e -> e.getPlayer().getId())
            .collect(Collectors.toSet());
        for (final GameStaffRequest req : staffRequests) {
            if (lineupPlayerIds.contains(req.playerId())) {
                throw new LineupValidationException("Spieler " + req.playerId() + " ist bereits im Lineup");
            }
        }
    }

    private StaffRole parseStaffRole(final String role) {
        try {
            return StaffRole.valueOf(role);
        } catch (final IllegalArgumentException e) {
            throw new LineupValidationException("Ungueltige Rolle: " + role + ". Erlaubt: BASE_COACH_1ST, BASE_COACH_3RD");
        }
    }
}
