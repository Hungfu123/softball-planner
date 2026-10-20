package com.softball.domain.model;

/**
 * Wo der Ball gerade ist. Vier Zustaende, mehr braucht ein Play nicht.
 */
public enum BallState {
    /** Beim Pitcher, das Play laeuft noch nicht. */
    AT_BAT,
    /** Ein Fielder haelt ihn. Keine Linie, Kugel an der Kante der Scheibe. */
    IN_HAND,
    /** Unterwegs. Die Linie entsteht aus der Bewegung zum naechsten Stand. */
    IN_FLIGHT,
    /** Liegt frei — Fehler, Overthrow, Passed Ball. */
    LOOSE
}
