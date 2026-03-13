package com.softball.domain.service;

import com.softball.domain.model.*;

import java.util.*;
import java.util.stream.Collectors;

public class LineupSuggestionEngine {

    static final List<Position> AUTO_POSITIONS = List.of(
        Position.FIRST_BASE, Position.SECOND_BASE, Position.THIRD_BASE,
        Position.SS, Position.LF, Position.CF, Position.RF
    );

    private static final Set<String> MANUAL_POSITIONS = Set.of("P", "C", "EH");

    public List<SuggestionResult> suggest(final List<LineupEntry> currentEntries,
                                           final Map<Long, Player> playerMap,
                                           final Set<Long> staffIds,
                                           final Map<Long, Integer> gamesPlayedCount,
                                           final Map<Long, Long> attendanceByPlayer,
                                           final Random random) {

        // Separate manual entries (P, C, EH only) from auto-position and unassigned entries
        final List<LineupEntry> manualEntries = new ArrayList<>();
        final Set<Long> manualPlayerIds = new HashSet<>();

        for (final LineupEntry entry : currentEntries) {
            final String posName = entry.getPosition() != null ? entry.getPosition().displayName() : null;
            if (posName != null && MANUAL_POSITIONS.contains(posName)) {
                manualEntries.add(entry);
                manualPlayerIds.add(entry.getPlayer().getId());
                if (entry.getDhBatterPlayer() != null) {
                    manualPlayerIds.add(entry.getDhBatterPlayer().getId());
                }
            } else {
                if (entry.getDhBatterPlayer() != null) {
                    manualPlayerIds.add(entry.getDhBatterPlayer().getId());
                }
            }
        }

        // All 7 auto-positions are always re-shuffled
        final List<Position> positionsToFill = new ArrayList<>(AUTO_POSITIONS);

        // Build candidate pool: available, not manual, not staff, not DH batter
        final List<Long> candidates = playerMap.keySet().stream()
            .filter(id -> !manualPlayerIds.contains(id))
            .filter(id -> !staffIds.contains(id))
            .sorted(Comparator
                .comparingInt((Long id) -> gamesPlayedCount.getOrDefault(id, 0))
                .thenComparingLong((Long id) -> -attendanceByPlayer.getOrDefault(id, 0L))
                .thenComparingLong(id -> id))
            .collect(Collectors.toCollection(ArrayList::new));

        // Take top candidates (up to 7)
        final List<Long> assignablePool = candidates.stream()
            .limit(positionsToFill.size())
            .collect(Collectors.toCollection(ArrayList::new));

        // Shuffle positions and players randomly
        Collections.shuffle(positionsToFill, random);
        Collections.shuffle(assignablePool, random);

        final Map<Long, Position> newAssignments = new LinkedHashMap<>();
        for (int i = 0; i < positionsToFill.size() && i < assignablePool.size(); i++) {
            newAssignments.put(assignablePool.get(i), positionsToFill.get(i));
        }

        // Build final result: manual entries first, then new assignments
        final List<SuggestionResult> result = new ArrayList<>();
        int order = 1;

        for (final LineupEntry entry : manualEntries) {
            result.add(new SuggestionResult(entry.getPlayer().getId(), entry.getPlayer().getName(),
                entry.getPosition() != null ? entry.getPosition().displayName() : null, order++));
        }

        final List<Map.Entry<Long, Position>> assignmentList = new ArrayList<>(newAssignments.entrySet());
        Collections.shuffle(assignmentList, random);
        for (final var entry : assignmentList) {
            final Player player = playerMap.get(entry.getKey());
            if (player != null) {
                result.add(new SuggestionResult(player.getId(), player.getName(),
                    entry.getValue().displayName(), order++));
            }
        }

        return result;
    }

    public Map<Long, Integer> countGamesPlayed(final List<LineupEntry> allEntries, final Long excludeGameId) {
        final Map<Long, Integer> count = new HashMap<>();
        for (final LineupEntry entry : allEntries) {
            if (excludeGameId != null && entry.getGame().getId().equals(excludeGameId)) {
                continue;
            }
            if (entry.getPosition() != null) {
                count.merge(entry.getPlayer().getId(), 1, Integer::sum);
            }
        }
        return count;
    }

    public void addToCount(final Map<Long, Integer> count, final List<LineupEntry> entries) {
        for (final LineupEntry entry : entries) {
            if (entry.getPosition() != null) {
                count.merge(entry.getPlayer().getId(), 1, Integer::sum);
            }
        }
    }

    public void subtractFromCount(final Map<Long, Integer> count, final List<LineupEntry> entries) {
        for (final LineupEntry entry : entries) {
            if (entry.getPosition() != null) {
                count.merge(entry.getPlayer().getId(), -1, (current, delta) -> Math.max(0, current + delta));
            }
        }
    }
}
