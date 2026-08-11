package com.softball.domain.service;

import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Schätzt die Gesamtdauer eines Spiels <b>ohne</b> Zeitlimit aus dem bisherigen Tempo
 * (verstrichene Zeit je abgeschlossenem Halbinning), hochgerechnet auf ein reguläres Spiel
 * (7 Innings = 14 Halbinnings). Siehe docs/SPIELBOGEN.md, Abschnitt "Dauer-Schätzung ohne
 * Limit", für Herleitung und Display.
 *
 * <p>Bewusst ein eigener Service statt einer Erweiterung von
 * {@link GameClockCalculator#compute}: der Rechenkern der Uhr kennt nur die vier rohen
 * Timer-Felder, nichts vom Spielstand (Inning/Seite). Diese Schätzung braucht genau das
 * zusätzlich — und die beiden Aufrufer (Spielbogen, Legacy-{@code Game}) leiten "abgeschlossene
 * Halbinnings" grundverschieden her (siehe {@link #completedHalfInnings}), weil das Legacy-Game
 * nur die eigenen At-Bats trackt, keinen echten Seitenwechsel. Eine Vermischung würde
 * {@code GameClockCalculator} seine Eingangs-Reinheit nehmen.
 */
@Service
public class GameDurationEstimator {

    /** 7 Innings * 2 Halbinnings — das reguläre Soll, auf das hochgerechnet wird. */
    private static final int REGULATION_HALF_INNINGS = 14;

    /** Unter dieser Schwelle ist das bisherige Tempo zu verrauscht — kein Wert statt ein schlechter. */
    private static final int MIN_HALF_INNINGS_FOR_ESTIMATE = 3;

    public record DurationEstimate(int totalMinutes, int remainingMinutes, int completedHalfInnings) {
    }

    /**
     * @param elapsedSeconds       bisherige Spielzeit (Uhr-Wert, schließt Pausen aus — die
     *                             Schätzung ist also eine Spielzeit-, keine Wanduhr-Prognose)
     * @param completedHalfInnings siehe {@link #completedHalfInnings}
     * @param limitMinutes         gesetztes Limit; {@code null} = keins — nur dann gibt es
     *                             überhaupt eine Schätzung, sonst konkurriert sie mit der
     *                             Restzeit-Anzeige gegen das Limit
     * @param started              Uhr nie gestartet → keine Schätzung
     * @param ended                Spiel bereits beendet → keine Schätzung. Die gelaufene Zeit
     *                             IST dann schon die tatsächliche Gesamtdauer; eine Hochrechnung
     *                             würde ihr widersprechen statt sie zu ergänzen.
     */
    public Optional<DurationEstimate> estimate(final int elapsedSeconds, final int completedHalfInnings,
                                                final Integer limitMinutes, final boolean started,
                                                final boolean ended) {
        if (!started || ended || limitMinutes != null || completedHalfInnings < MIN_HALF_INNINGS_FOR_ESTIMATE) {
            return Optional.empty();
        }

        final double paceSecondsPerHalfInning = (double) elapsedSeconds / completedHalfInnings;
        final int totalSeconds = (int) Math.round(paceSecondsPerHalfInning * REGULATION_HALF_INNINGS);
        // Extra Innings koennen totalSeconds < elapsedSeconds machen (Tempo aus mehr als 14
        // Halbinnings hochgerechnet auf 14) -- dann ist "noch verbleibend" schlicht 0, nicht negativ.
        final int remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

        return Optional.of(new DurationEstimate(
            (int) Math.round(totalSeconds / 60.0),
            (int) Math.round(remainingSeconds / 60.0),
            completedHalfInnings));
    }

    /**
     * Abgeschlossene Halbinnings aus Inning-Nummer + "die zweite Hälfte des aktuellen Innings
     * läuft bereits"-Flag. Eine Formel, zwei sehr unterschiedliche Herleitungen:
     * <ul>
     *   <li><b>Spielbogen:</b> {@code secondHalfInProgress = currentSide == BogenSide.HOME} —
     *   Auswärts schlägt zuerst (top), sobald Heim dran ist (bottom), ist die erste Hälfte
     *   dieses Innings fertig.</li>
     *   <li><b>Legacy Game:</b> {@code secondHalfInProgress = outsInCurrentInning >= 3} — das
     *   Modell trackt nur die eigenen At-Bats, keinen echten Seitenwechsel. 3 Outs im eigenen
     *   Frame heißt "die eigene Hälfte ist fertig", die andere Hälfte läuft/lief bereits
     *   außerhalb der App.</li>
     * </ul>
     */
    public static int completedHalfInnings(final int inning, final boolean secondHalfInProgress) {
        return (inning - 1) * 2 + (secondHalfInProgress ? 1 : 0);
    }
}
