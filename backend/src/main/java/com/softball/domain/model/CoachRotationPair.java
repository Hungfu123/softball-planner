package com.softball.domain.model;

import java.util.List;

public enum CoachRotationPair {
    POS_3_8(3, 8, "4–8", "9–10, 1–3", "#1–#2", "#6–#7"),
    POS_4_9(4, 9, "5–9", "10, 1–4", "#2–#3", "#7–#8"),
    POS_5_10(5, 10, "6–10", "1–5", "#3–#4", "#8–#9");

    private final int lowerPosition;
    private final int higherPosition;
    private final String lowerRangeLabel;
    private final String higherRangeLabel;
    private final String lowerWarmupLabel;
    private final String higherWarmupLabel;

    CoachRotationPair(final int lowerPosition, final int higherPosition,
                      final String lowerRangeLabel, final String higherRangeLabel,
                      final String lowerWarmupLabel, final String higherWarmupLabel) {
        this.lowerPosition = lowerPosition;
        this.higherPosition = higherPosition;
        this.lowerRangeLabel = lowerRangeLabel;
        this.higherRangeLabel = higherRangeLabel;
        this.lowerWarmupLabel = lowerWarmupLabel;
        this.higherWarmupLabel = higherWarmupLabel;
    }

    public int getLowerPosition() { return lowerPosition; }
    public int getHigherPosition() { return higherPosition; }
    public String getLowerRangeLabel() { return lowerRangeLabel; }
    public String getHigherRangeLabel() { return higherRangeLabel; }
    public String getLowerWarmupLabel() { return lowerWarmupLabel; }
    public String getHigherWarmupLabel() { return higherWarmupLabel; }

    public List<Integer> getPositions() {
        return List.of(lowerPosition, higherPosition);
    }
}
