package com.softball.domain.service;

import com.softball.domain.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

class LineupSuggestionEngineTest {

    private LineupSuggestionEngine engine;

    @BeforeEach
    void setUp() {
        engine = new LineupSuggestionEngine();
    }

    // --- suggest tests ---

    @Test
    void emptyLineup_assigns7AutoPositions() {
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(42));

        assertThat(result).hasSize(7);
        final Set<String> positions = new HashSet<>();
        result.forEach(r -> positions.add(r.position()));
        assertThat(positions).containsExactlyInAnyOrder("1B", "2B", "3B", "SS", "LF", "CF", "RF");
    }

    @Test
    void manualPositions_arePreserved() {
        final Player pitcher = new Player(1L, "Pitcher", true);
        final Player catcher = new Player(2L, "Catcher", true);
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L);

        final Game game = new Game(100L, 1);
        final LineupEntry pEntry = new LineupEntry(game, pitcher, Position.P, 1);
        final LineupEntry cEntry = new LineupEntry(game, catcher, Position.C, 2);

        final List<SuggestionResult> result = engine.suggest(
            List.of(pEntry, cEntry), players, Set.of(), Map.of(), Map.of(), new Random(42));

        // P and C should be first (manual), then 7 auto positions
        assertThat(result).hasSize(9);
        assertThat(result.get(0).position()).isEqualTo("P");
        assertThat(result.get(0).playerId()).isEqualTo(1L);
        assertThat(result.get(1).position()).isEqualTo("C");
        assertThat(result.get(1).playerId()).isEqualTo(2L);

        // Remaining 7 should be auto-positions
        final Set<String> autoPositions = new HashSet<>();
        for (int i = 2; i < result.size(); i++) {
            autoPositions.add(result.get(i).position());
        }
        assertThat(autoPositions).containsExactlyInAnyOrder("1B", "2B", "3B", "SS", "LF", "CF", "RF");
    }

    @Test
    void ehPosition_isManual() {
        final Player ehPlayer = new Player(1L, "EH Player", true);
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L);

        final Game game = new Game(100L, 1);
        final LineupEntry ehEntry = new LineupEntry(game, ehPlayer, Position.EH, 1);

        final List<SuggestionResult> result = engine.suggest(
            List.of(ehEntry), players, Set.of(), Map.of(), Map.of(), new Random(42));

        // EH IS manual — kept in place, plus 7 auto positions
        assertThat(result).hasSize(8);
        assertThat(result.get(0).position()).isEqualTo("EH");
        assertThat(result.get(0).playerId()).isEqualTo(1L);
    }

    @Test
    void staffPlayers_areExcluded() {
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(1L), Map.of(), Map.of(), new Random(42));

        // Player 1 is staff, should not be assigned
        assertThat(result).hasSize(7);
        assertThat(result.stream().noneMatch(r -> r.playerId().equals(1L))).isTrue();
    }

    @Test
    void fewerPlayersThanPositions_fillsWhatItCan() {
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(42));

        assertThat(result).hasSize(3);
    }

    @Test
    void playersWithFewerGames_arePreferred() {
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L);
        // Players 1-7 have played 2 games, player 8 has played 0
        final Map<Long, Integer> gamesPlayed = new HashMap<>();
        for (long i = 1; i <= 7; i++) gamesPlayed.put(i, 2);
        gamesPlayed.put(8L, 0);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), gamesPlayed, Map.of(), new Random(42));

        // Player 8 should definitely be in the result (fewest games)
        assertThat(result.stream().anyMatch(r -> r.playerId().equals(8L))).isTrue();
    }

    @Test
    void battingOrderIsSequential() {
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(42));

        for (int i = 0; i < result.size(); i++) {
            assertThat(result.get(i).battingOrder()).isEqualTo(i + 1);
        }
    }

    @Test
    void dhBatterPlayer_isExcludedFromCandidates() {
        final Player fieldPlayer = new Player(1L, "Field", true);
        final Player dhBatter = new Player(2L, "DH Batter", true);
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L);

        final Game game = new Game(100L, 1);
        final LineupEntry entryWithDh = new LineupEntry(game, fieldPlayer, Position.P, 1, dhBatter);

        final List<SuggestionResult> result = engine.suggest(
            List.of(entryWithDh), players, Set.of(), Map.of(), Map.of(), new Random(42));

        // DH batter (player 2) should not be in auto assignments
        final List<SuggestionResult> autoResults = result.subList(1, result.size());
        assertThat(autoResults.stream().noneMatch(r -> r.playerId().equals(2L))).isTrue();
    }

    // --- countGamesPlayed tests ---

    @Test
    void countGamesPlayed_countsOnlyEntriesWithPosition() {
        final Game game1 = new Game(1L, 1);
        final Game game2 = new Game(2L, 2);
        final Player player = new Player(1L, "Player", true);

        final LineupEntry withPos = new LineupEntry(game1, player, Position.P, 1);
        final LineupEntry withoutPos = new LineupEntry(game2, player, null, 2);

        final Map<Long, Integer> count = engine.countGamesPlayed(List.of(withPos, withoutPos), null);

        assertThat(count.get(1L)).isEqualTo(1);
    }

    @Test
    void countGamesPlayed_excludesGame() {
        final Game game1 = new Game(1L, 1);
        final Game game2 = new Game(2L, 2);
        final Player player = new Player(1L, "Player", true);

        final LineupEntry entry1 = new LineupEntry(game1, player, Position.P, 1);
        final LineupEntry entry2 = new LineupEntry(game2, player, Position.C, 2);

        final Map<Long, Integer> count = engine.countGamesPlayed(List.of(entry1, entry2), 1L);

        assertThat(count.get(1L)).isEqualTo(1); // Only game2 counted
    }

    // --- addToCount / subtractFromCount tests ---

    @Test
    void addToCount_incrementsForPositionEntries() {
        final Game game = new Game(1L, 1);
        final Player player = new Player(1L, "Player", true);
        final LineupEntry entry = new LineupEntry(game, player, Position.P, 1);

        final Map<Long, Integer> count = new HashMap<>();
        engine.addToCount(count, List.of(entry));

        assertThat(count.get(1L)).isEqualTo(1);
    }

    @Test
    void subtractFromCount_decrementsButNotBelowZero() {
        final Game game = new Game(1L, 1);
        final Player player = new Player(1L, "Player", true);
        final LineupEntry entry = new LineupEntry(game, player, Position.P, 1);

        final Map<Long, Integer> count = new HashMap<>(Map.of(1L, 1));
        engine.subtractFromCount(count, List.of(entry));

        assertThat(count.get(1L)).isZero();

        // Subtract again — should not go below 0
        engine.subtractFromCount(count, List.of(entry));
        assertThat(count.get(1L)).isZero();
    }

    // --- helpers ---

    private Map<Long, Player> createPlayers(final Long... ids) {
        final Map<Long, Player> map = new LinkedHashMap<>();
        for (final Long id : ids) {
            map.put(id, new Player(id, "Player " + id, true));
        }
        return map;
    }
}
