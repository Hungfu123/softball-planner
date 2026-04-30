package com.softball.domain.service;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.shared.exception.BusinessValidationException;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class BogenLineupValidator {

    private static final Set<String> VALID_POSITIONS = Set.of(
        "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "EH", "DH",
        "1", "2", "3", "4", "5", "6", "7", "8", "9"
    );

    public void validate(final List<SpielbogenSlot> slots, final BogenSide side) {
        if (slots.size() < 9) {
            throw new BusinessValidationException(
                "Lineup für " + side + " muss mindestens 9 Spieler haben (aktuell: " + slots.size() + ")"
            );
        }
        if (slots.size() > 10) {
            throw new BusinessValidationException(
                "Lineup für " + side + " darf höchstens 10 Spieler haben (aktuell: " + slots.size() + ")"
            );
        }

        Set<Integer> slotNumbers = new HashSet<>();
        Set<Integer> battingOrders = new HashSet<>();
        for (SpielbogenSlot slot : slots) {
            if (slot.getName() == null || slot.getName().isBlank()) {
                throw new BusinessValidationException("Name darf nicht leer sein");
            }
            if (!slotNumbers.add(slot.getSlot())) {
                throw new BusinessValidationException("Doppelte Slot-Nummern in " + side + "-Lineup");
            }
            if (!battingOrders.add(slot.getBattingOrder())) {
                throw new BusinessValidationException("Doppelte Batting-Order in " + side + "-Lineup");
            }
            if (slot.getPosition() != null && !VALID_POSITIONS.contains(slot.getPosition())) {
                throw new BusinessValidationException(
                    "Ungültige Position '" + slot.getPosition() + "' in " + side + "-Lineup"
                );
            }
        }

        for (int i = 1; i <= slots.size(); i++) {
            if (!battingOrders.contains(i)) {
                throw new BusinessValidationException(
                    "Batting-Order muss sequenziell 1.." + slots.size() + " sein (fehlt: " + i + ")"
                );
            }
        }
    }
}
