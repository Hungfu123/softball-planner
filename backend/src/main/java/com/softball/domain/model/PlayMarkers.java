package com.softball.domain.model;

import java.util.List;

/**
 * Alles, was in einem Stand auf dem Feld liegt.
 *
 * Koordinaten sind Board-Einheiten: eine Einheit ist ein Fuss, der Ursprung liegt oben
 * links, y zeigt nach unten (SVG-Konvention), Home liegt bei (155, 218). Das System ist
 * fest — der Zuschnitt der Darstellung veraendert nur das Bild, nie die Daten.
 *
 * Die Linie zwischen zwei Staenden wird nicht gespeichert. Sie ist die Bewegung vom
 * vorigen zum aktuellen Stand und entsteht beim Zeichnen. Deshalb verschwindet die
 * Schlaglinie von selbst, sobald der Fielder wirft.
 */
public record PlayMarkers(
        List<Defender> defenders,
        List<Runner> runners,
        Ball ball
) {

    /** Ein Verteidiger. {@code position} ist das Kuerzel: P, C, 1B, 2B, SS, 3B, LF, CF, RF. */
    public record Defender(String position, double x, double y) {}

    /**
     * Ein Laeufer. {@code id} haelt ihn ueber die Staende hinweg zusammen, damit die
     * Animation weiss, welcher Runner sich wohin bewegt hat.
     */
    public record Runner(String id, double x, double y, RunnerStatus status) {}

    /**
     * Der Ball. Genau einer.
     *
     * {@code holder} ist das Positionskuerzel des Fielders, der ihn haelt, sonst null.
     * Gehaltene Baelle werden an der Kante der Scheibe gezeichnet, nicht in deren Mitte —
     * mittig waeren sie unsichtbar, weil der Ball keine Kontur traegt.
     */
    public record Ball(BallState state, String holder, double x, double y, Trajectory trajectory) {}

    public enum RunnerStatus { ACTIVE, OUT, SCORED }

    /** Flugform zwischen zwei Staenden: Bogen oder flach am Boden. */
    public enum Trajectory { AIR, GROUND }
}
