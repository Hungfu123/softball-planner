package com.softball.domain.service;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.shared.exception.BusinessValidationException;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BogenLineupValidatorTest {

    private final BogenLineupValidator validator = new BogenLineupValidator();

    @Test
    void accepts9SequentialSlots() {
        List<SpielbogenSlot> slots = buildSlots(9);
        assertThatCode(() -> validator.validate(slots, BogenSide.HOME)).doesNotThrowAnyException();
    }

    @Test
    void accepts10SequentialSlots() {
        List<SpielbogenSlot> slots = buildSlots(10);
        assertThatCode(() -> validator.validate(slots, BogenSide.HOME)).doesNotThrowAnyException();
    }

    @Test
    void rejectsFewerThan9() {
        List<SpielbogenSlot> slots = buildSlots(8);
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("mindestens 9");
    }

    @Test
    void rejectsMoreThan10() {
        List<SpielbogenSlot> slots = buildSlots(11);
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("höchstens 10");
    }

    @Test
    void rejectsDuplicateSlotNumbers() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(1).setSlot(1);
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Slot-Nummern");
    }

    @Test
    void rejectsDuplicateBattingOrder() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(1).setBattingOrder(1);
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Batting-Order");
    }

    @Test
    void rejectsNonSequentialBattingOrder() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(8).setBattingOrder(11);
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("sequenziell");
    }

    @Test
    void rejectsBlankName() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(0).setName("  ");
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Name");
    }

    @Test
    void acceptsNullPosition() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(0).setPosition(null);
        assertThatCode(() -> validator.validate(slots, BogenSide.HOME)).doesNotThrowAnyException();
    }

    @Test
    void rejectsInvalidPosition() {
        List<SpielbogenSlot> slots = buildSlots(9);
        slots.get(0).setPosition("XX");
        assertThatThrownBy(() -> validator.validate(slots, BogenSide.HOME))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Position");
    }

    private List<SpielbogenSlot> buildSlots(final int count) {
        List<SpielbogenSlot> slots = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            SpielbogenSlot s = new SpielbogenSlot();
            s.setSlot(i);
            s.setBattingOrder(i);
            s.setName("Spieler " + i);
            s.setPosition(i <= 9 ? String.valueOf(i) : "EH");
            s.setSide(BogenSide.HOME);
            slots.add(s);
        }
        return slots;
    }
}
