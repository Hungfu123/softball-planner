package com.softball.domain.service;

import com.softball.domain.model.Play;
import com.softball.domain.model.PlayStep;
import com.softball.shared.exception.BusinessValidationException;

import java.util.List;
import java.util.Set;

/**
 * Prueft ein Play auf das, was die App selbst garantiert — und auf nichts weiter.
 *
 * Softball-Regeln werden hier ausdruecklich NICHT geprueft: zwei Runner auf einer Base,
 * ein Runner, der den Vordermann ueberholt, ein Out ohne Ball in der Naehe — all das darf
 * ein Trainer hinstellen. Der Playmaker zeichnet stumm, was dasteht. Geprueft wird nur,
 * was sonst zu kaputten Daten oder einer unbrauchbaren Darstellung fuehrt.
 */
public class PlayValidator {

    /** Die drei Dauern, die die Oberflaeche anbietet. Alles andere ist ein Programmfehler. */
    private static final Set<Integer> ERLAUBTE_DAUERN = Set.of(600, 1200, 2000);

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
            if (!ERLAUBTE_DAUERN.contains(step.getDurationMs())) {
                throw new BusinessValidationException(
                        "Stand " + erwartet + ": unzulaessige Dauer " + step.getDurationMs() + " ms.");
            }
            if (step.getMarkers() == null) {
                throw new BusinessValidationException("Stand " + erwartet + " hat keine Marker.");
            }
        }
    }
}
