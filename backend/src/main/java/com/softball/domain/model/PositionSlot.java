package com.softball.domain.model;

import java.util.List;
import java.util.Set;

/**
 * Was ein Spieler auf dem Feld abdeckt — die drei Slots des Positions-Profils
 * (Primär/Sekundär/Tertiär) am {@link Player}.
 *
 * Bewusst ein eigenes Enum und NICHT {@link Position}: Position kennt EH (kein
 * Feldposten) und keine Gruppen. Hier ist es umgekehrt — EH gibt es nicht, dafür
 * die Sammelwerte IF, OF und IF_OF für Spieler, die mehr als einen Posten abdecken.
 *
 * P und C stehen immer für sich: Pitcher und Catcher sind in KEINER Gruppe
 * enthalten, auch nicht in IF_OF. Wer wirft oder fängt, wird explizit benannt.
 *
 * Die Namen der Einzelpositionen sind identisch zu {@link Position} — der Backfill
 * aus gespielten Lineups (V61) kopiert sie deshalb direkt.
 */
public enum PositionSlot {
    P, C, FIRST_BASE, SECOND_BASE, THIRD_BASE, SS, LF, CF, RF,
    /** Alles im Infield außer P und C. */
    IF,
    /** Alles im Outfield. */
    OF,
    /** Überall im Feld außer P und C. */
    IF_OF;

    private static final Set<Position> INFIELD =
        Set.of(Position.FIRST_BASE, Position.SECOND_BASE, Position.THIRD_BASE, Position.SS);
    private static final Set<Position> OUTFIELD =
        Set.of(Position.LF, Position.CF, Position.RF);

    /** Welche echten Feldpositionen dieser Slot abdeckt. */
    public Set<Position> expand() {
        return switch (this) {
            case IF -> INFIELD;
            case OF -> OUTFIELD;
            case IF_OF -> Set.copyOf(concat(INFIELD, OUTFIELD));
            default -> Set.of(Position.valueOf(name()));
        };
    }

    public boolean isGroup() {
        return this == IF || this == OF || this == IF_OF;
    }

    public String displayName() {
        return switch (this) {
            case FIRST_BASE -> "1B";
            case SECOND_BASE -> "2B";
            case THIRD_BASE -> "3B";
            case IF_OF -> "IF/OF";
            default -> name();
        };
    }

    private static List<Position> concat(final Set<Position> a, final Set<Position> b) {
        final List<Position> all = new java.util.ArrayList<>(a);
        all.addAll(b);
        return all;
    }
}
