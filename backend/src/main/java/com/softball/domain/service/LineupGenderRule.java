package com.softball.domain.service;

import com.softball.domain.model.Gender;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.Player;
import com.softball.domain.model.Position;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

/**
 * Frauen-Quote der Liga: mindestens zwei Frauen auf dem Feld, davon mindestens
 * eine im Infield.
 *
 * Gezaehlt wird, wer tatsaechlich auf dem Feld steht. Ein EH schlaegt nur, ein
 * DH-Batter ebenfalls — beide erfuellen die Quote nicht. Infield ist alles ausser
 * Outfield, Pitcherin und Catcherin eingeschlossen.
 *
 * Die Regel meldet Verstoesse, sie verbietet nichts: an einem Spieltag, an dem
 * nur eine Frau da ist, muss sich trotzdem eine Aufstellung speichern lassen.
 */
public class LineupGenderRule {

    public static final int MIN_WOMEN_ON_FIELD = 2;
    /** Verfuegbarkeit des Spieltags unbekannt — dann wird nur die Aufstellung bewertet. */
    public static final int UNKNOWN_AVAILABILITY = -1;
    public static final int MIN_WOMEN_IN_INFIELD = 1;

    private static final Set<Position> INFIELD = Set.of(
        Position.P, Position.C, Position.FIRST_BASE, Position.SECOND_BASE, Position.THIRD_BASE, Position.SS);

    public static boolean isInfield(final Position position) {
        return position != null && INFIELD.contains(position);
    }

    /** Verstoesse als fertige Saetze, leere Liste = alles erfuellt. */
    public List<String> check(final Collection<LineupEntry> entries) {
        return check(entries, UNKNOWN_AVAILABILITY);
    }

    /**
     * @param availableWomen wie viele Frauen an diesem Spieltag ueberhaupt zugesagt haben,
     *                       {@link #UNKNOWN_AVAILABILITY} wenn unbekannt. Sind es weniger
     *                       als die Quote verlangt, ist nichts zu reparieren — dann sagt
     *                       der Hinweis das, statt eine Umstellung zu fordern, die es
     *                       nicht gibt.
     */
    public List<String> check(final Collection<LineupEntry> entries, final int availableWomen) {
        final Count count = count(entries);
        final List<String> warnings = new ArrayList<>();

        if (count.onField < MIN_WOMEN_ON_FIELD) {
            if (availableWomen != UNKNOWN_AVAILABILITY && availableWomen < MIN_WOMEN_ON_FIELD) {
                warnings.add(availableWomen == 0
                    ? "Heute ist keine Frau dabei — die Liga verlangt zwei auf dem Feld."
                    : "Heute ist nur eine Frau dabei — die Liga verlangt zwei auf dem Feld.");
            } else {
                warnings.add(count.onField == 0
                    ? "Keine Frau auf dem Feld — die Liga verlangt mindestens zwei."
                    : "Nur eine Frau auf dem Feld — die Liga verlangt mindestens zwei.");
            }
        }
        if (count.inInfield < MIN_WOMEN_IN_INFIELD) {
            warnings.add("Keine Frau im Infield — die Liga verlangt mindestens eine (P, C, 1B, 2B, 3B oder SS).");
        }
        return warnings;
    }

    /** Wie viele Frauen stehen auf dem Feld, und wie viele davon im Infield? */
    public Count count(final Collection<LineupEntry> entries) {
        int onField = 0;
        int inInfield = 0;
        for (final LineupEntry entry : entries) {
            final Position position = entry.getPosition();
            if (position == null || !position.isFieldPosition()) continue;
            final Player player = entry.getPlayer();
            if (player == null || player.getGender() != Gender.FEMALE) continue;
            onField++;
            if (isInfield(position)) inInfield++;
        }
        return new Count(onField, inInfield);
    }

    public record Count(int onField, int inInfield) {}
}
