package com.softball.domain.service;

import com.softball.domain.model.PositionSlot;

import java.util.ArrayList;
import java.util.List;

/**
 * Prüft das Positions-Profil eines Spielers (Primär/Sekundär/Tertiär).
 *
 * Zwei Regeln, bewusst knapp gehalten:
 * 1. Keine Lücken — Sekundär nur mit Primär, Tertiär nur mit Sekundär. Sonst stünde
 *    eine Zweitposition ohne Erstposition da und die Reihenfolge verlöre ihren Sinn.
 * 2. Kein Slot doppelt.
 *
 * Überlappung ist ausdrücklich erlaubt: Primär SS + Sekundär IF heißt "am liebsten
 * Shortstop, sonst irgendwo im Infield" — eine sinnvolle Aussage, keine Dublette.
 */
public class PositionProfileValidator {

    /** @return Fehlermeldungen (leer = gültig). Deutsch, sie gehen direkt an die UI. */
    public List<String> validate(final PositionSlot primary,
                                 final PositionSlot secondary,
                                 final PositionSlot tertiary) {
        final List<String> errors = new ArrayList<>();

        if (primary == null && secondary != null) {
            errors.add("Zweitposition ohne Erstposition — erst die Erstposition setzen");
        }
        if (secondary == null && tertiary != null) {
            errors.add("Drittposition ohne Zweitposition — erst die Zweitposition setzen");
        }

        final List<PositionSlot> seen = new ArrayList<>();
        for (final PositionSlot slot : new PositionSlot[] { primary, secondary, tertiary }) {
            if (slot == null) continue;
            if (seen.contains(slot)) {
                errors.add(slot.displayName() + " steht doppelt im Profil");
            } else {
                seen.add(slot);
            }
        }

        return errors;
    }
}
