package com.softball.domain.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * Leitgrundsatz: die Uhr liest den Spielzustand, sie schreibt nie hinein. Reine Ableitung aus
 * den vier Rohwerten — keine Repositories, kein Zugriff auf die Systemuhr.
 */
@Service
public class GameClockCalculator {

    /**
     * @param elapsedSeconds verstrichene Zeit, gedeckelt gegen {@code endedAt} falls gesetzt
     * @param running        true nur, solange die Uhr tatsaechlich weiterlaeuft — false, sobald
     *                       {@code endedAt} sie eingefroren hat, damit das Frontend nicht lokal
     *                       weiterzaehlt
     * @param started        false nur, wenn die Uhr nie gestartet wurde
     * @param limitMinutes   durchgereichtes Limit, {@code null} = keins gesetzt
     * @param overLimit      true, sobald {@code elapsedSeconds} das Limit ueberschreitet (echtes
     *                       Erreichen des Limits zaehlt noch nicht als drueber)
     */
    public record ClockState(int elapsedSeconds, boolean running, boolean started,
                              Integer limitMinutes, boolean overLimit) {
    }

    public ClockState compute(final Instant runningSince, final int accumulatedSeconds,
                               final Integer limitMinutes, final Instant endedAt, final Instant now) {
        final boolean runningSinceSet = runningSince != null;

        // Beendetes Spiel: gegen endedAt deckeln statt gegen now, damit die Zeit beim Spielende
        // einfriert, ohne dass irgendein Schreibvorgang das ausloesen muss.
        final Instant bezugszeit = endedAt != null ? endedAt : now;

        long delta = 0;
        if (runningSinceSet) {
            delta = Duration.between(runningSince, bezugszeit).getSeconds();
            if (delta < 0) delta = 0; // Randfall: endedAt vor runningSince darf nicht negativ werden
        }

        final int elapsedSeconds = (int) (accumulatedSeconds + delta);
        final boolean started = runningSinceSet || accumulatedSeconds > 0;
        // Eingefroren durch endedAt zaehlt fuer die Anzeige nicht mehr als "laeuft" — sonst
        // wuerde das Frontend ab dem gemeldeten Wert lokal weiterticken.
        final boolean running = runningSinceSet && endedAt == null;
        final boolean overLimit = limitMinutes != null && elapsedSeconds > limitMinutes * 60L;

        return new ClockState(elapsedSeconds, running, started, limitMinutes, overLimit);
    }
}
