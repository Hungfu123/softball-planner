package com.softball.domain.model;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CoachRotationPairTest {

    @Test
    void pos_5_10_hasCorrectMappings() {
        final CoachRotationPair pair = CoachRotationPair.POS_5_10;
        assertEquals(5, pair.getLowerPosition());
        assertEquals(10, pair.getHigherPosition());
        assertEquals("6–10", pair.getLowerRangeLabel());
        assertEquals("1–5", pair.getHigherRangeLabel());
        assertEquals("#3–#4", pair.getLowerWarmupLabel());
        assertEquals("#8–#9", pair.getHigherWarmupLabel());
    }

    @Test
    void pos_4_9_hasWrapHigherRange() {
        final CoachRotationPair pair = CoachRotationPair.POS_4_9;
        assertEquals(4, pair.getLowerPosition());
        assertEquals(9, pair.getHigherPosition());
        assertEquals("5–9", pair.getLowerRangeLabel());
        assertEquals("10, 1–4", pair.getHigherRangeLabel());
    }

    @Test
    void pos_3_8_hasWrapHigherRange() {
        final CoachRotationPair pair = CoachRotationPair.POS_3_8;
        assertEquals(3, pair.getLowerPosition());
        assertEquals(8, pair.getHigherPosition());
        assertEquals("4–8", pair.getLowerRangeLabel());
        assertEquals("9–10, 1–3", pair.getHigherRangeLabel());
    }

    @Test
    void getPositions_returnsBothPositions() {
        assertEquals(List.of(5, 10), CoachRotationPair.POS_5_10.getPositions());
        assertEquals(List.of(4, 9), CoachRotationPair.POS_4_9.getPositions());
        assertEquals(List.of(3, 8), CoachRotationPair.POS_3_8.getPositions());
    }
}
