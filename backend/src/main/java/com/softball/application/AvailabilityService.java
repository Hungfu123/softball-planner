package com.softball.application;

import com.softball.domain.model.*;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AvailabilityService {

    private static final Logger log = LoggerFactory.getLogger(AvailabilityService.class);

    private final GameDayRepository gameDayRepository;
    private final PlayerRepository playerRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final GameStaffRepository gameStaffRepository;

    public AvailabilityService(final GameDayRepository gameDayRepository, final PlayerRepository playerRepository,
                               final LineupEntryRepository lineupEntryRepository,
                               final GameStaffRepository gameStaffRepository) {
        this.gameDayRepository = gameDayRepository;
        this.playerRepository = playerRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.gameStaffRepository = gameStaffRepository;
    }

    @Transactional
    public GameDay setAvailablePlayers(final Long gameDayId, final List<Long> playerIds) {
        log.info("Verfuegbare Spieler setzen fuer Spieltag {}: {} Spieler", gameDayId, playerIds.size());
        // Load games AND players: syncGames in the persistence mapper would treat an
        // empty domain games list as "delete all entity games" via orphanRemoval, so we
        // must keep the games loaded when saving.
        final GameDay gameDay = gameDayRepository.findByIdWithGamesAndPlayers(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
        final List<Player> players = playerRepository.findAllById(playerIds);
        if (players.size() != playerIds.size()) {
            throw new ResourceNotFoundException("Einige Spieler wurden nicht gefunden");
        }

        final Set<Long> removedPlayerIds = findRemovedPlayerIds(gameDay, playerIds);

        if (!removedPlayerIds.isEmpty()) {
            cascadeRemovePlayers(gameDayId, removedPlayerIds);
        }

        gameDay.setAvailablePlayersList(players);
        final GameDay saved = gameDayRepository.save(gameDay);
        saved.getGames().size();
        return saved;
    }

    private Set<Long> findRemovedPlayerIds(final GameDay gameDay, final List<Long> newPlayerIds) {
        final Set<Long> newIds = new HashSet<>(newPlayerIds);
        return gameDay.getAvailablePlayers().stream()
            .map(Player::getId)
            .filter(id -> !newIds.contains(id))
            .collect(Collectors.toSet());
    }

    private void cascadeRemovePlayers(final Long gameDayId, final Set<Long> removedPlayerIds) {
        final GameDay gameDayWithGames = gameDayRepository.findByIdWithGames(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
        log.info("Spieler {} aus Spieltag {} entfernt, bereinige Lineups/Staff", removedPlayerIds, gameDayId);

        for (final Game game : gameDayWithGames.getGames()) {
            cascadeRemoveFromLineup(game.getId(), removedPlayerIds);
            cascadeRemoveFromStaff(game.getId(), removedPlayerIds);
        }
    }

    private void cascadeRemoveFromLineup(final Long gameId, final Set<Long> removedPlayerIds) {
        final List<LineupEntry> entries = lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId);

        // DH-Batter-Referenz auf null setzen
        for (final LineupEntry entry : entries) {
            if (entry.getDhBatterPlayer() != null && removedPlayerIds.contains(entry.getDhBatterPlayer().getId())) {
                entry.setDhBatterPlayer(null);
                lineupEntryRepository.save(entry);
            }
        }

        // LineupEntries loeschen
        final List<LineupEntry> toRemove = entries.stream()
            .filter(e -> removedPlayerIds.contains(e.getPlayer().getId()))
            .toList();
        if (!toRemove.isEmpty()) {
            lineupEntryRepository.deleteAll(toRemove);
            lineupEntryRepository.flush();
            renumberBattingOrder(gameId);
        }
    }

    private void renumberBattingOrder(final Long gameId) {
        final List<LineupEntry> remaining = lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId);
        int order = 1;
        boolean changed = false;
        for (final LineupEntry entry : remaining) {
            if (entry.getBattingOrder() != order) {
                entry.setBattingOrder(order);
                changed = true;
            }
            order++;
        }
        if (changed) {
            lineupEntryRepository.saveAll(remaining);
        }
    }

    private void cascadeRemoveFromStaff(final Long gameId, final Set<Long> removedPlayerIds) {
        final List<GameStaff> staffToRemove = gameStaffRepository.findByGameId(gameId).stream()
            .filter(s -> removedPlayerIds.contains(s.getPlayer().getId()))
            .toList();
        if (!staffToRemove.isEmpty()) {
            gameStaffRepository.deleteAll(staffToRemove);
        }
    }

}
