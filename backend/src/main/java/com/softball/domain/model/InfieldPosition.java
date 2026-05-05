package com.softball.domain.model;

public enum InfieldPosition {
    FIRST_BASE,
    SECOND_BASE,
    SS,
    THIRD_BASE;

    public DrillCategory toDrillCategory() {
        return DrillCategory.valueOf(this.name());
    }
}
