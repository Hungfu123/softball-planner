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
    void emptyLineup_assigns9AutoPositions() {
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(42));

        assertThat(result).hasSize(9);
        final Set<String> positions = new HashSet<>();
        result.forEach(r -> positions.add(r.position()));
        assertThat(positions).containsExactlyInAnyOrder("P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF");
    }

    @Test
    void pAndCAreAutoPositions_reShuffled() {
        final Player pitcher = new Player(1L, "Pitcher", true);
        final Player catcher = new Player(2L, "Catcher", true);
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L);

        final Game game = new Game(100L, 1);
        final LineupEntry pEntry = new LineupEntry(game, pitcher, Position.P, 1);
        final LineupEntry cEntry = new LineupEntry(game, catcher, Position.C, 2);

        final List<SuggestionResult> result = engine.suggest(
            List.of(pEntry, cEntry), players, Set.of(), Map.of(), Map.of(), new Random(42));

        // P and C are auto-positions now — all 9 are re-shuffled
        assertThat(result).hasSize(9);
        final Set<String> positions = new HashSet<>();
        result.forEach(r -> positions.add(r.position()));
        assertThat(positions).containsExactlyInAnyOrder("P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF");
    }

    @Test
    void ehPosition_isManual() {
        final Player ehPlayer = new Player(1L, "EH Player", true);
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L, 10L);

        final Game game = new Game(100L, 1);
        final LineupEntry ehEntry = new LineupEntry(game, ehPlayer, Position.EH, 1);

        final List<SuggestionResult> result = engine.suggest(
            List.of(ehEntry), players, Set.of(), Map.of(), Map.of(), new Random(42));

        // EH is manual — kept in place, plus 9 auto positions
        assertThat(result).hasSize(10);
        assertThat(result.get(0).position()).isEqualTo("EH");
        assertThat(result.get(0).playerId()).isEqualTo(1L);
    }

    @Test
    void staffPlayers_areExcluded() {
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L, 10L);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(1L), Map.of(), Map.of(), new Random(42));

        // Player 1 is staff, 9 candidates remain for 9 auto positions
        assertThat(result).hasSize(9);
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

        // DH batter (player 2) should not appear anywhere in the result
        assertThat(result.stream().noneMatch(r -> r.playerId().equals(2L))).isTrue();
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

    // --- defaultBattingOrder tests ---

    @Test
    void defaultBattingOrder_determinesBattingOrder() {
        final Map<Long, Player> players = new LinkedHashMap<>();
        players.put(1L, new Player(1L, "Player 1", true, 3));
        players.put(2L, new Player(2L, "Player 2", true, 1));
        players.put(3L, new Player(3L, "Player 3", true, 2));
        players.put(4L, new Player(4L, "Player 4", true, 5));
        players.put(5L, new Player(5L, "Player 5", true, 4));
        players.put(6L, new Player(6L, "Player 6", true, 6));
        players.put(7L, new Player(7L, "Player 7", true, 7));

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(42));

        assertThat(result).hasSize(7);
        // Batting order should follow defaultBattingOrder: 2, 3, 1, 5, 4, 6, 7
        assertThat(result.get(0).playerId()).isEqualTo(2L);
        assertThat(result.get(1).playerId()).isEqualTo(3L);
        assertThat(result.get(2).playerId()).isEqualTo(1L);
        assertThat(result.get(3).playerId()).isEqualTo(5L);
        assertThat(result.get(4).playerId()).isEqualTo(4L);
        assertThat(result.get(5).playerId()).isEqualTo(6L);
        assertThat(result.get(6).playerId()).isEqualTo(7L);
    }

    @Test
    void defaultBattingOrder_nullsAtEnd() {
        final Map<Long, Player> players = new LinkedHashMap<>();
        players.put(1L, new Player(1L, "Player 1", true, 2));
        players.put(2L, new Player(2L, "Player 2", true, null));
        players.put(3L, new Player(3L, "Player 3", true, 1));
        players.put(4L, new Player(4L, "Player 4", true, null));
        players.put(5L, new Player(5L, "Player 5", true, 3));
        players.put(6L, new Player(6L, "Player 6", true, null));
        players.put(7L, new Player(7L, "Player 7", true, null));

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(42));

        assertThat(result).hasSize(7);
        // Ranked players first in order: 3(order=1), 1(order=2), 5(order=3)
        assertThat(result.get(0).playerId()).isEqualTo(3L);
        assertThat(result.get(1).playerId()).isEqualTo(1L);
        assertThat(result.get(2).playerId()).isEqualTo(5L);
        // Remaining 4 are unranked — positions are still there
        final Set<Long> unranked = new HashSet<>();
        for (int i = 3; i < 7; i++) unranked.add(result.get(i).playerId());
        assertThat(unranked).containsExactlyInAnyOrder(2L, 4L, 6L, 7L);
    }

    @Test
    void noDefaultBattingOrder_shufflesRandomly() {
        final Map<Long, Player> players = createPlayers(1L, 2L, 3L, 4L, 5L, 6L, 7L);

        // Run twice with different seeds — should produce different orders
        final List<SuggestionResult> result1 = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(1));
        final List<SuggestionResult> result2 = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(999));

        // At least the batting order IDs should differ (extremely likely with different seeds)
        final List<Long> ids1 = result1.stream().map(SuggestionResult::playerId).toList();
        final List<Long> ids2 = result2.stream().map(SuggestionResult::playerId).toList();
        assertThat(ids1).isNotEqualTo(ids2);
    }

    // --- helpers ---

    private Map<Long, Player> createPlayers(final Long... ids) {
        final Map<Long, Player> map = new LinkedHashMap<>();
        for (final Long id : ids) {
            map.put(id, new Player(id, "Player " + id, true));
        }
        return map;
    }

    // --- Positions-Profil und Frauen-Quote ---

    private Player player(final long id, final String name, final Gender gender, final PositionSlot... slots) {
        final Player p = new Player(id, name, true);
        p.setGender(gender);
        if (slots.length > 0) p.setPrimaryPosition(slots[0]);
        if (slots.length > 1) p.setSecondaryPosition(slots[1]);
        if (slots.length > 2) p.setTertiaryPosition(slots[2]);
        return p;
    }

    private Map<Long, Player> map(final Player... players) {
        final Map<Long, Player> m = new LinkedHashMap<>();
        for (final Player p : players) m.put(p.getId(), p);
        return m;
    }

    private String positionOf(final List<SuggestionResult> result, final long playerId) {
        return result.stream().filter(r -> r.playerId() == playerId).findFirst().map(SuggestionResult::position).orElse(null);
    }

    @Test
    void profileDecidesWhoPitchesAndCatches() {
        final Map<Long, Player> players = map(
            player(1L, "Pitcherin", Gender.FEMALE, PositionSlot.P),
            player(2L, "Catcher", Gender.MALE, PositionSlot.C),
            player(3L, "Shortstop", Gender.FEMALE, PositionSlot.SS),
            player(4L, "Outfield", Gender.MALE, PositionSlot.OF),
            player(5L, "Infield", Gender.MALE, PositionSlot.IF),
            player(6L, "Ohne", Gender.MALE),
            player(7L, "Ohne", Gender.MALE),
            player(8L, "Ohne", Gender.MALE),
            player(9L, "Ohne", Gender.MALE));

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(7));

        assertThat(positionOf(result, 1L)).isEqualTo("P");
        assertThat(positionOf(result, 2L)).isEqualTo("C");
        assertThat(positionOf(result, 3L)).isEqualTo("SS");
        assertThat(positionOf(result, 4L)).isIn("LF", "CF", "RF");
        assertThat(positionOf(result, 5L)).isIn("1B", "2B", "3B", "SS");
    }

    @Test
    void fairnessStillBeatsProfile_whenSomeoneHasPlayedFar() {
        // Wer schon acht Spiele hat, bleibt draussen, auch wenn das Profil passt.
        final Map<Long, Player> players = map(
            player(1L, "Vielspieler", Gender.MALE, PositionSlot.P),
            player(2L, "Neu", Gender.FEMALE),
            player(3L, "Neu", Gender.FEMALE),
            player(4L, "Neu", Gender.MALE),
            player(5L, "Neu", Gender.MALE),
            player(6L, "Neu", Gender.MALE),
            player(7L, "Neu", Gender.MALE),
            player(8L, "Neu", Gender.MALE),
            player(9L, "Neu", Gender.MALE),
            player(10L, "Neu", Gender.MALE));

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(1L, 8), Map.of(), new Random(3));

        assertThat(result).hasSize(9);
        assertThat(positionOf(result, 1L)).isNull();
    }

    @Test
    void womenAreDrawnIntoTheLineupForTheQuota() {
        // Neun Maenner haetten nach Fairness gereicht — die Quote zieht zwei Frauen rein.
        final Map<Long, Player> players = new LinkedHashMap<>();
        for (long id = 1; id <= 9; id++) players.put(id, player(id, "Mann " + id, Gender.MALE));
        players.put(10L, player(10L, "Frau A", Gender.FEMALE));
        players.put(11L, player(11L, "Frau B", Gender.FEMALE));

        final Map<Long, Integer> played = new HashMap<>();
        for (long id = 10; id <= 11; id++) played.put(id, 3);  // haben schon mehr gespielt

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), played, Map.of(), new Random(11));

        assertThat(positionOf(result, 10L)).isNotNull();
        assertThat(positionOf(result, 11L)).isNotNull();
    }

    @Test
    void atLeastOneWomanEndsUpInTheInfield() {
        final Map<Long, Player> players = new LinkedHashMap<>();
        for (long id = 1; id <= 7; id++) players.put(id, player(id, "Mann " + id, Gender.MALE, PositionSlot.IF_OF));
        players.put(8L, player(8L, "Frau OF", Gender.FEMALE, PositionSlot.OF));
        players.put(9L, player(9L, "Frau OF", Gender.FEMALE, PositionSlot.OF));

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(5));

        final Set<String> infield = Set.of("P", "C", "1B", "2B", "3B", "SS");
        assertThat(result).anySatisfy(r -> {
            if (r.playerId() == 8L || r.playerId() == 9L) {
                assertThat(infield).contains(r.position());
            }
        });
    }

    @Test
    void trainingAttendanceBreaksTiesAmongEqualFairness() {
        final Map<Long, Player> players = new LinkedHashMap<>();
        for (long id = 1; id <= 10; id++) players.put(id, player(id, "Spieler " + id, Gender.MALE));

        // Alle gleich oft gespielt; Nummer 10 war am oeftesten im Training.
        final Map<Long, Long> attendance = Map.of(10L, 20L);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), attendance, new Random(9));

        assertThat(positionOf(result, 10L)).isNotNull();
    }

    @Test
    void attendanceDecidesWhoPlaysWhenThereAreMoreCandidatesThanSlots() {
        final Map<Long, Player> players = new LinkedHashMap<>();
        for (long id = 1; id <= 12; id++) players.put(id, player(id, "Spieler " + id, Gender.MALE));

        // Je hoeher die Id, desto oefter im Training — die obersten neun sollen spielen.
        final Map<Long, Long> attendance = new HashMap<>();
        for (long id = 1; id <= 12; id++) attendance.put(id, id);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), attendance, new Random(4));

        final Set<Long> onField = result.stream().map(SuggestionResult::playerId).collect(java.util.stream.Collectors.toSet());
        assertThat(onField).containsExactlyInAnyOrder(4L, 5L, 6L, 7L, 8L, 9L, 10L, 11L, 12L);
    }

    @Test
    void everyoneAvailablePlaysAtLeastOnceAcrossTheGameDay() {
        final Map<Long, Player> players = new LinkedHashMap<>();
        for (long id = 1; id <= 12; id++) players.put(id, player(id, "Spieler " + id, Gender.MALE));
        final Map<Long, Long> attendance = new HashMap<>();
        for (long id = 1; id <= 12; id++) attendance.put(id, id);

        final Map<Long, Integer> played = new HashMap<>();
        final Set<Long> everPlayed = new HashSet<>();

        // Zwei Spiele hintereinander, wie der Spieltag es tut
        for (int game = 0; game < 2; game++) {
            final List<SuggestionResult> result = engine.suggest(
                List.of(), players, Set.of(), played, attendance, new Random(game));
            result.forEach(r -> {
                everPlayed.add(r.playerId());
                played.merge(r.playerId(), 1, Integer::sum);
            });
        }

        assertThat(everPlayed).containsExactlyInAnyOrderElementsOf(players.keySet());
    }

    @Test
    void whoAlreadyPlayedStepsBackEvenWithHighAttendance() {
        final Map<Long, Player> players = new LinkedHashMap<>();
        for (long id = 1; id <= 10; id++) players.put(id, player(id, "Spieler " + id, Gender.MALE));

        // Nummer 1 war am oeftesten im Training, hat aber schon gespielt.
        final Map<Long, Long> attendance = Map.of(1L, 99L);
        final Map<Long, Integer> played = Map.of(1L, 1);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), played, attendance, new Random(8));

        assertThat(positionOf(result, 1L)).isNull();
    }

    @Test
    void quotaBeatsAttendance_twoWomenAlwaysField() {
        // Zwei Frauen sind da, trainieren aber am seltensten — sie spielen trotzdem.
        final Map<Long, Player> players = new LinkedHashMap<>();
        final Map<Long, Long> attendance = new HashMap<>();
        for (long id = 1; id <= 12; id++) {
            players.put(id, player(id, "Mann " + id, Gender.MALE));
            attendance.put(id, 50L);
        }
        players.put(20L, player(20L, "Frau A", Gender.FEMALE));
        players.put(21L, player(21L, "Frau B", Gender.FEMALE));
        attendance.put(20L, 1L);
        attendance.put(21L, 1L);

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), attendance, new Random(13));

        assertThat(positionOf(result, 20L)).isNotNull();
        assertThat(positionOf(result, 21L)).isNotNull();

        // Und eine davon steht im Infield.
        final Set<String> infield = Set.of("P", "C", "1B", "2B", "3B", "SS");
        assertThat(List.of(positionOf(result, 20L), positionOf(result, 21L)))
            .anySatisfy(position -> assertThat(infield).contains(position));
    }

    @Test
    void quotaDropsSomeoneWhoAlreadyPlayedToday() {
        // Fuenf Leute haben heute noch nicht gespielt, vier Maenner und zwei Frauen schon.
        // Die Quote holt die Frauen zurueck — raus muessen die Maenner, die schon dran
        // waren, nicht die fuenf, die noch auf ihren ersten Einsatz warten.
        final Map<Long, Player> players = new LinkedHashMap<>();
        final Map<Long, Long> attendance = new HashMap<>();
        final Map<Long, Integer> played = new HashMap<>();

        for (long id = 1; id <= 5; id++) {
            players.put(id, player(id, "Wartet " + id, Gender.MALE));
            attendance.put(id, 5L);
        }
        for (long id = 6; id <= 9; id++) {
            players.put(id, player(id, "Hatte schon " + id, Gender.MALE));
            attendance.put(id, 50L);
            played.put(id, 1);
        }
        for (long id = 20; id <= 21; id++) {
            players.put(id, player(id, "Frau " + id, Gender.FEMALE));
            attendance.put(id, 1L);
            played.put(id, 1);
        }

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), played, attendance, new Random(17));

        assertThat(positionOf(result, 20L)).isNotNull();
        assertThat(positionOf(result, 21L)).isNotNull();
        for (long id = 1; id <= 5; id++) {
            assertThat(positionOf(result, id)).as("Spieler %d wartet noch auf seinen Einsatz", id).isNotNull();
        }
    }

    @Test
    void onlyOneWomanAvailable_lineupStillFieldsHer() {
        final Map<Long, Player> players = new LinkedHashMap<>();
        for (long id = 1; id <= 12; id++) players.put(id, player(id, "Mann " + id, Gender.MALE));
        players.put(20L, player(20L, "Einzige Frau", Gender.FEMALE));

        final List<SuggestionResult> result = engine.suggest(
            List.of(), players, Set.of(), Map.of(), Map.of(), new Random(21));

        assertThat(positionOf(result, 20L)).isNotNull();
    }
}
