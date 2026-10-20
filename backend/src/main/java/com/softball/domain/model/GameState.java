package com.softball.domain.model;

/**
 * Fuer welchen Spielstand ein Play gilt.
 *
 * Kein Zaehler, ein Etikett: dieselbe Situation hat bei 8:2 und bei 3:3 im letzten
 * Inning zwei verschiedene richtige Antworten, und ein Play soll sagen, welche es meint.
 */
public enum GameState {
    ANY,
    CLOSE_LATE,
    AHEAD,
    BEHIND
}
