package com.softball.domain.model;

public enum Position {
    P, C, FIRST_BASE, SECOND_BASE, THIRD_BASE, SS, LF, CF, RF, EH;

    public boolean isFieldPosition() {
        return this != EH;
    }

    public double getGameWeight() {
        return isFieldPosition() ? 1.0 : 0.5;
    }

    public String displayName() {
        return switch (this) {
            case FIRST_BASE -> "1B";
            case SECOND_BASE -> "2B";
            case THIRD_BASE -> "3B";
            default -> name();
        };
    }

    public static Position fromString(final String value) {
        return switch (value.toUpperCase().trim()) {
            case "1B" -> FIRST_BASE;
            case "2B" -> SECOND_BASE;
            case "3B" -> THIRD_BASE;
            default -> valueOf(value.toUpperCase().trim());
        };
    }
}
