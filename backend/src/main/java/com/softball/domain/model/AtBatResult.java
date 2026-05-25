package com.softball.domain.model;

public enum AtBatResult {
    SINGLE, DOUBLE, TRIPLE, HOMERUN, INSIDE_PARK_HR, WALK, HIT_BY_PITCH, STRIKEOUT, OUT, REACHED_ON_ERROR;

    public boolean isHit() {
        return this == SINGLE || this == DOUBLE || this == TRIPLE || this == HOMERUN || this == INSIDE_PARK_HR;
    }

    /** At-Bat zählt für die Trefferquote. Walks und HBP zählen nicht. ROE zählt als AB (BA-Penalty). */
    public boolean countsAsAtBat() {
        return this != WALK && this != HIT_BY_PITCH;
    }

    public boolean reachedBase() {
        return isHit() || this == WALK || this == HIT_BY_PITCH || this == REACHED_ON_ERROR;
    }

    public int totalBases() {
        return switch (this) {
            case SINGLE -> 1;
            case DOUBLE -> 2;
            case TRIPLE -> 3;
            case HOMERUN, INSIDE_PARK_HR -> 4;
            default -> 0;
        };
    }

    public boolean isOut() {
        return this == STRIKEOUT || this == OUT;
    }

    public String displayNameDe() {
        return switch (this) {
            case SINGLE -> "Single";
            case DOUBLE -> "Double";
            case TRIPLE -> "Triple";
            case HOMERUN -> "Homerun";
            case INSIDE_PARK_HR -> "Park-HR";
            case WALK -> "Walk";
            case HIT_BY_PITCH -> "Hit-by-Pitch";
            case STRIKEOUT -> "Strikeout";
            case OUT -> "Aus";
            case REACHED_ON_ERROR -> "Reached on Error";
        };
    }
}
