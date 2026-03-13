package com.softball.domain.service;

import com.softball.domain.model.Position;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class LineupValidator {

    private static final int MAX_LINEUP_SIZE = 10;

    public record LineupInput(Long playerId, String position, Integer battingOrder, Long dhBatterPlayerId) {}

    public void validate(final List<LineupInput> entries,
                         final Set<Long> staffPlayerIds,
                         final Set<Long> availablePlayerIds) {
        validateSize(entries);
        validateNoDuplicatePlayers(entries);
        validateBattingOrder(entries);
        validatePositions(entries);
        validateDhBatter(entries);
        validateNoConflictWithStaff(entries, staffPlayerIds);
        if (availablePlayerIds != null && !availablePlayerIds.isEmpty()) {
            validatePlayerAvailability(entries, availablePlayerIds);
        }
    }

    void validateSize(final List<LineupInput> entries) {
        if (entries.size() > MAX_LINEUP_SIZE) {
            throw new LineupValidationException("Lineup darf maximal " + MAX_LINEUP_SIZE + " Spieler haben");
        }
    }

    void validateNoDuplicatePlayers(final List<LineupInput> entries) {
        final Set<Long> playerIds = new HashSet<>();
        for (final LineupInput entry : entries) {
            if (!playerIds.add(entry.playerId())) {
                throw new LineupValidationException("Spieler " + entry.playerId() + " ist doppelt im Lineup");
            }
        }
    }

    void validateBattingOrder(final List<LineupInput> entries) {
        final Set<Integer> battingOrders = new HashSet<>();
        for (final LineupInput entry : entries) {
            if (!battingOrders.add(entry.battingOrder())) {
                throw new LineupValidationException("Batting Order " + entry.battingOrder() + " ist doppelt vergeben");
            }
        }

        final List<Integer> sorted = battingOrders.stream().sorted().toList();
        for (int i = 0; i < sorted.size(); i++) {
            if (sorted.get(i) != i + 1) {
                throw new LineupValidationException("Batting Order muss sequenziell sein (1, 2, 3, ...), fehlt: " + (i + 1));
            }
        }
    }

    void validatePositions(final List<LineupInput> entries) {
        final Set<Position> usedFieldPositions = new HashSet<>();
        for (final LineupInput entry : entries) {
            if (entry.position() == null) {
                continue;
            }
            final Position pos = Position.fromString(entry.position());
            if (pos.isFieldPosition() && !usedFieldPositions.add(pos)) {
                throw new LineupValidationException("Position " + pos.displayName() + " ist doppelt vergeben");
            }
        }
    }

    void validateDhBatter(final List<LineupInput> entries) {
        final Set<Long> lineupPlayerIds = new HashSet<>();
        for (final LineupInput entry : entries) {
            lineupPlayerIds.add(entry.playerId());
        }
        int dhBatterCount = 0;
        for (final LineupInput entry : entries) {
            if (entry.dhBatterPlayerId() != null) {
                dhBatterCount++;
                if (entry.position() == null) {
                    throw new LineupValidationException("DH-Batter darf nur fuer Feldspieler gesetzt werden, nicht ohne Position");
                }
                final Position pos = Position.fromString(entry.position());
                if (!pos.isFieldPosition()) {
                    throw new LineupValidationException("DH-Batter darf nur fuer Feldspieler gesetzt werden, nicht fuer " + pos.displayName());
                }
                if (lineupPlayerIds.contains(entry.dhBatterPlayerId())) {
                    throw new LineupValidationException("DH-Batter " + entry.dhBatterPlayerId() + " darf nicht selbst im Lineup sein");
                }
                if (dhBatterCount > 1) {
                    throw new LineupValidationException("Maximal 1 DH-Batter pro Lineup erlaubt");
                }
            }
        }
    }

    void validateNoConflictWithStaff(final List<LineupInput> entries, final Set<Long> staffPlayerIds) {
        for (final LineupInput entry : entries) {
            if (staffPlayerIds.contains(entry.playerId())) {
                throw new LineupValidationException("Spieler " + entry.playerId() + " ist bereits als Base Coach eingeteilt");
            }
        }
    }

    void validatePlayerAvailability(final List<LineupInput> entries, final Set<Long> availablePlayerIds) {
        for (final LineupInput entry : entries) {
            if (!availablePlayerIds.contains(entry.playerId())) {
                throw new LineupValidationException("Spieler " + entry.playerId() + " ist nicht fuer diesen Spieltag eingetragen");
            }
            if (entry.dhBatterPlayerId() != null && !availablePlayerIds.contains(entry.dhBatterPlayerId())) {
                throw new LineupValidationException("DH-Batter " + entry.dhBatterPlayerId() + " ist nicht fuer diesen Spieltag eingetragen");
            }
        }
    }

    public static class LineupValidationException extends RuntimeException {
        public LineupValidationException(final String message) {
            super(message);
        }
    }
}
