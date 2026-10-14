package com.softball.domain.service;

import com.softball.domain.model.Position;
import com.softball.domain.model.PositionSlot;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PositionProfileValidatorTest {

    private final PositionProfileValidator validator = new PositionProfileValidator();

    @Test
    void emptyProfileIsValid() {
        assertThat(validator.validate(null, null, null)).isEmpty();
    }

    @Test
    void primaryAloneIsValid() {
        assertThat(validator.validate(PositionSlot.SS, null, null)).isEmpty();
    }

    @Test
    void overlappingGroupIsAllowed() {
        // "Am liebsten Shortstop, sonst irgendwo im Infield" ist eine sinnvolle Aussage.
        assertThat(validator.validate(PositionSlot.SS, PositionSlot.IF, PositionSlot.OF)).isEmpty();
    }

    @Test
    void sameSlotTwiceIsRejected() {
        assertThat(validator.validate(PositionSlot.CF, PositionSlot.CF, null))
            .singleElement().asString().contains("doppelt");
    }

    @Test
    void secondaryWithoutPrimaryIsRejected() {
        assertThat(validator.validate(null, PositionSlot.LF, null))
            .singleElement().asString().contains("Zweitposition ohne Erstposition");
    }

    @Test
    void tertiaryWithoutSecondaryIsRejected() {
        assertThat(validator.validate(PositionSlot.P, null, PositionSlot.RF))
            .singleElement().asString().contains("Drittposition ohne Zweitposition");
    }

    @Test
    void infieldGroupCoversTheFourCorners() {
        assertThat(PositionSlot.IF.expand()).containsExactlyInAnyOrder(
            Position.FIRST_BASE, Position.SECOND_BASE, Position.THIRD_BASE, Position.SS);
    }

    @Test
    void pitcherAndCatcherAreInNoGroup() {
        assertThat(PositionSlot.IF_OF.expand()).doesNotContain(Position.P, Position.C);
        assertThat(PositionSlot.IF.expand()).doesNotContain(Position.P, Position.C);
    }

    @Test
    void singlePositionExpandsToItself() {
        assertThat(PositionSlot.SS.expand()).containsExactly(Position.SS);
        assertThat(PositionSlot.FIRST_BASE.expand()).containsExactly(Position.FIRST_BASE);
    }

    @Test
    void displayNamesMatchTheScoresheet() {
        assertThat(PositionSlot.FIRST_BASE.displayName()).isEqualTo("1B");
        assertThat(PositionSlot.IF_OF.displayName()).isEqualTo("IF/OF");
        assertThat(PositionSlot.SS.displayName()).isEqualTo("SS");
    }
}
