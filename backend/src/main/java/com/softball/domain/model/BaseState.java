package com.softball.domain.model;

/**
 * Runner-Besetzung der Bases nach einem Event.
 * Null = leer, Long = Player-ID des Runners.
 */
public record BaseState(Long first, Long second, Long third) {

    public static BaseState empty() {
        return new BaseState(null, null, null);
    }

    public int occupiedCount() {
        int c = 0;
        if (first != null) c++;
        if (second != null) c++;
        if (third != null) c++;
        return c;
    }

    public boolean hasRunnerOn(final int base) {
        return switch (base) {
            case 1 -> first != null;
            case 2 -> second != null;
            case 3 -> third != null;
            default -> false;
        };
    }
}
