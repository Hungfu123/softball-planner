package com.softball.domain.service;

import com.softball.domain.service.LineupValidator.LineupInput;
import com.softball.domain.service.LineupValidator.LineupValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LineupValidatorTest {

    private LineupValidator validator;

    @BeforeEach
    void setUp() {
        validator = new LineupValidator();
    }

    private LineupInput entry(final long playerId, final String position, final int battingOrder) {
        return new LineupInput(playerId, position, battingOrder, null);
    }

    private LineupInput entryWithDh(final long playerId, final String position, final int battingOrder, final long dhId) {
        return new LineupInput(playerId, position, battingOrder, dhId);
    }

    @Test
    void validLineup_passes() {
        final List<LineupInput> entries = List.of(
            entry(1L, "P", 1),
            entry(2L, "C", 2),
            entry(3L, "1B", 3)
        );
        assertThatCode(() -> validator.validate(entries, Set.of(), Set.of(1L, 2L, 3L)))
            .doesNotThrowAnyException();
    }

    @Nested
    class Size {
        @Test
        void tooManyPlayers_throws() {
            final List<LineupInput> entries = List.of(
                entry(1L, "P", 1), entry(2L, "C", 2), entry(3L, "1B", 3),
                entry(4L, "2B", 4), entry(5L, "3B", 5), entry(6L, "SS", 6),
                entry(7L, "LF", 7), entry(8L, "CF", 8), entry(9L, "RF", 9),
                entry(10L, "EH", 10), entry(11L, null, 11)
            );
            assertThatThrownBy(() -> validator.validateSize(entries))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("maximal 10");
        }
    }

    @Nested
    class DuplicatePlayers {
        @Test
        void duplicatePlayer_throws() {
            final List<LineupInput> entries = List.of(
                entry(1L, "P", 1),
                entry(1L, "C", 2)
            );
            assertThatThrownBy(() -> validator.validateNoDuplicatePlayers(entries))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("doppelt");
        }
    }

    @Nested
    class BattingOrder {
        @Test
        void duplicateOrder_throws() {
            final List<LineupInput> entries = List.of(
                entry(1L, "P", 1),
                entry(2L, "C", 1)
            );
            assertThatThrownBy(() -> validator.validateBattingOrder(entries))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("doppelt");
        }

        @Test
        void nonSequential_throws() {
            final List<LineupInput> entries = List.of(
                entry(1L, "P", 1),
                entry(2L, "C", 3)
            );
            assertThatThrownBy(() -> validator.validateBattingOrder(entries))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("sequenziell");
        }

        @Test
        void sequential_passes() {
            final List<LineupInput> entries = List.of(
                entry(1L, "P", 1),
                entry(2L, "C", 2),
                entry(3L, "1B", 3)
            );
            assertThatCode(() -> validator.validateBattingOrder(entries))
                .doesNotThrowAnyException();
        }
    }

    @Nested
    class Positions {
        @Test
        void duplicateFieldPosition_throws() {
            final List<LineupInput> entries = List.of(
                entry(1L, "P", 1),
                entry(2L, "P", 2)
            );
            assertThatThrownBy(() -> validator.validatePositions(entries))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("doppelt");
        }

        @Test
        void multipleEH_allowed() {
            final List<LineupInput> entries = List.of(
                entry(1L, "EH", 1),
                entry(2L, "EH", 2)
            );
            assertThatCode(() -> validator.validatePositions(entries))
                .doesNotThrowAnyException();
        }

        @Test
        void nullPosition_ignored() {
            final List<LineupInput> entries = List.of(
                entry(1L, null, 1),
                entry(2L, "P", 2)
            );
            assertThatCode(() -> validator.validatePositions(entries))
                .doesNotThrowAnyException();
        }
    }

    @Nested
    class DhBatter {
        @Test
        void dhOnFieldPlayer_passes() {
            final List<LineupInput> entries = List.of(
                entryWithDh(1L, "1B", 1, 99L),
                entry(2L, "C", 2)
            );
            assertThatCode(() -> validator.validateDhBatter(entries))
                .doesNotThrowAnyException();
        }

        @Test
        void dhWithoutPosition_throws() {
            final List<LineupInput> entries = List.of(
                entryWithDh(1L, null, 1, 99L)
            );
            assertThatThrownBy(() -> validator.validateDhBatter(entries))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("ohne Position");
        }

        @Test
        void dhOnNonFieldPosition_throws() {
            final List<LineupInput> entries = List.of(
                entryWithDh(1L, "EH", 1, 99L)
            );
            assertThatThrownBy(() -> validator.validateDhBatter(entries))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("EH");
        }

        @Test
        void dhBatterInLineup_throws() {
            final List<LineupInput> entries = List.of(
                entryWithDh(1L, "1B", 1, 2L),
                entry(2L, "C", 2)
            );
            assertThatThrownBy(() -> validator.validateDhBatter(entries))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("selbst im Lineup");
        }

        @Test
        void multipleDhBatters_throws() {
            final List<LineupInput> entries = List.of(
                entryWithDh(1L, "1B", 1, 99L),
                entryWithDh(2L, "2B", 2, 98L)
            );
            assertThatThrownBy(() -> validator.validateDhBatter(entries))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("Maximal 1");
        }
    }

    @Nested
    class StaffConflict {
        @Test
        void playerIsStaff_throws() {
            final List<LineupInput> entries = List.of(entry(1L, "P", 1));
            assertThatThrownBy(() -> validator.validateNoConflictWithStaff(entries, Set.of(1L)))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("Base Coach");
        }

        @Test
        void noConflict_passes() {
            final List<LineupInput> entries = List.of(entry(1L, "P", 1));
            assertThatCode(() -> validator.validateNoConflictWithStaff(entries, Set.of(99L)))
                .doesNotThrowAnyException();
        }
    }

    @Nested
    class Availability {
        @Test
        void playerNotAvailable_throws() {
            final List<LineupInput> entries = List.of(entry(1L, "P", 1));
            assertThatThrownBy(() -> validator.validatePlayerAvailability(entries, Set.of(99L)))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("nicht fuer diesen Spieltag");
        }

        @Test
        void dhBatterNotAvailable_throws() {
            final List<LineupInput> entries = List.of(entryWithDh(1L, "1B", 1, 99L));
            assertThatThrownBy(() -> validator.validatePlayerAvailability(entries, Set.of(1L)))
                .isInstanceOf(LineupValidationException.class)
                .hasMessageContaining("DH-Batter");
        }

        @Test
        void emptyAvailability_skipsCheck() {
            final List<LineupInput> entries = List.of(entry(1L, "P", 1));
            assertThatCode(() -> validator.validate(entries, Set.of(), Set.of()))
                .doesNotThrowAnyException();
        }
    }
}
