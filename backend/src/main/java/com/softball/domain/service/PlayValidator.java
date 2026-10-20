package com.softball.domain.service;

import com.softball.domain.model.Play;
import com.softball.domain.model.PlayStep;
import com.softball.shared.exception.BusinessValidationException;

import java.util.List;

/**
 * Prueft ein Play auf das, was die App selbst garantiert — und auf nichts weiter.
 *
 * Softball-Regeln werden hier ausdruecklich NICHT geprueft: zwei Runner auf einer Base,
 * ein Runner, der den Vordermann ueberholt, ein Out ohne Ball in der Naehe — all das darf
 * ein Trainer hinstellen. Der Playmaker zeichnet stumm, was dasteht. Geprueft wird nur,
 * was sonst zu kaputten Daten oder einer unbrauchbaren Darstellung fuehrt.
 */
public class PlayValidator {

    /**
     * Die Oberflaeche bietet drei Dauern an (600, 1200, 2000 ms), die Daten lassen mehr zu.
     *
     * Die Start-Plays rechnen ihre Dauer aus der laengsten Strecke des Standes: ein Runner
     * legt rund 24 ft/s zurueck, und 78 ft in 2 Sekunden sehen nicht nach Laufen aus,
     * sondern nach einem Sprung. Dafuer braucht es Zwischenwerte. Geprueft wird deshalb ein
     * Bereich in Zweihundertstel-Schritten statt einer Liste — krumme Werte wie 999 ms
     * bleiben ein Programmfehler, 1400 ms sind es nicht.
     */
    private static final int MIN_DAUER_MS = 200;
    private static final int MAX_DAUER_MS = 6000;
    private static final int DAUER_RASTER_MS = 200;

    private static final int MAX_OUTS = 3;

    public void validate(final Play play) {
        validateTitle(play);
        validateCounterpart(play);
        validateSteps(play.getSteps());
    }

    private void validateTitle(final Play play) {
        if (play.getTitle() == null || play.getTitle().isBlank()) {
            throw new BusinessValidationException("Das Play braucht einen Titel.");
        }
    }

    private void validateCounterpart(final Play play) {
        if (play.getCounterpartPlayId() != null && play.getCounterpartPlayId().equals(play.getId())) {
            throw new BusinessValidationException("Ein Play kann nicht sein eigenes Gegenstueck sein.");
        }
    }

    private void validateSteps(final List<PlayStep> steps) {
        if (steps == null || steps.isEmpty()) {
            throw new BusinessValidationException("Ein Play braucht mindestens einen Stand.");
        }

        for (int i = 0; i < steps.size(); i++) {
            final PlayStep step = steps.get(i);
            final int erwartet = i + 1;

            if (step.getOrdinal() != erwartet) {
                throw new BusinessValidationException(
                        "Die Staende muessen lueckenlos von 1 an durchnummeriert sein — "
                                + "erwartet " + erwartet + ", gefunden " + step.getOrdinal() + ".");
            }
            if (step.getOuts() < 0 || step.getOuts() > MAX_OUTS) {
                throw new BusinessValidationException(
                        "Stand " + erwartet + ": Outs muessen zwischen 0 und " + MAX_OUTS + " liegen.");
            }
            final int dauer = step.getDurationMs();
            if (dauer < MIN_DAUER_MS || dauer > MAX_DAUER_MS || dauer % DAUER_RASTER_MS != 0) {
                throw new BusinessValidationException(
                        "Stand " + erwartet + ": unzulaessige Dauer " + step.getDurationMs() + " ms.");
            }
            if (step.getMarkers() == null) {
                throw new BusinessValidationException("Stand " + erwartet + " hat keine Marker.");
            }
        }
    }
}
