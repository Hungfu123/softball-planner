package com.softball.domain.service;

import com.softball.domain.model.BallState;
import com.softball.domain.model.Play;
import com.softball.domain.model.PlayMarkers;
import com.softball.domain.model.PlayStep;
import com.softball.shared.exception.BusinessValidationException;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PlayValidatorTest {

    private final PlayValidator validator = new PlayValidator();

    private static PlayMarkers markers() {
        return new PlayMarkers(
                List.of(new PlayMarkers.Defender("P", 155, 175)),
                List.of(),
                new PlayMarkers.Ball(BallState.IN_HAND, "P", 155, 175, PlayMarkers.Trajectory.AIR));
    }

    private static PlayStep step(final int ordinal, final int durationMs, final int outs) {
        return new PlayStep(null, ordinal, durationMs, "Notiz", outs, markers());
    }

    private static Play play(final PlayStep... steps) {
        Play play = new Play();
        play.setId(1L);
        play.setTitle("Cut-off ins RF");
        play.setCategoryId(7L);
        play.setSteps(new ArrayList<>(List.of(steps)));
        return play;
    }

    @Test
    void nimmtEinGueltigesPlayAn() {
        assertThatCode(() -> validator.validate(play(step(1, 1200, 0), step(2, 600, 1))))
                .doesNotThrowAnyException();
    }

    @Test
    void lehntPlayOhneStaendeAb() {
        assertThatThrownBy(() -> validator.validate(play()))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("mindestens einen Stand");
    }

    @Test
    void lehntLueckenInDerReihenfolgeAb() {
        assertThatThrownBy(() -> validator.validate(play(step(1, 1200, 0), step(3, 1200, 0))))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("lueckenlos");
    }

    @Test
    void lehntMehrAlsDreiOutsAb() {
        assertThatThrownBy(() -> validator.validate(play(step(1, 1200, 4))))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Outs");
    }

    @Test
    void nimmtGenauDreiOutsAn() {
        assertThatCode(() -> validator.validate(play(step(1, 1200, 3))))
                .doesNotThrowAnyException();
    }

    @Test
    void lehntKrummeDauerAb() {
        assertThatThrownBy(() -> validator.validate(play(step(1, 999, 0))))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Dauer");
    }

    @Test
    void lehntUnsinnigLangeDauerAb() {
        assertThatThrownBy(() -> validator.validate(play(step(1, 20_000, 0))))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Dauer");
    }

    @Test
    void nimmtZwischenwerteAn() {
        // Die Start-Plays rechnen ihre Dauer aus der Strecke. Ein Stand, in dem jemand
        // 78 ft laeuft, dauert 3,2 s — nicht 2,0, weil das die naechste Taste waere.
        assertThatCode(() -> validator.validate(play(step(1, 1400, 0))))
                .doesNotThrowAnyException();
        assertThatCode(() -> validator.validate(play(step(1, 3200, 0))))
                .doesNotThrowAnyException();
    }

    @Test
    void lehntSichSelbstAlsGegenstueckAb() {
        Play play = play(step(1, 1200, 0));
        play.setCounterpartPlayId(play.getId());
        assertThatThrownBy(() -> validator.validate(play))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Gegenstueck");
    }

    @Test
    void lehntFehlendenTitelAb() {
        Play play = play(step(1, 1200, 0));
        play.setTitle("   ");
        assertThatThrownBy(() -> validator.validate(play))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Titel");
    }

    @Test
    void lehntStandOhneMarkerAb() {
        Play play = play(new PlayStep(null, 1, 1200, null, 0, null));
        assertThatThrownBy(() -> validator.validate(play))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Marker");
    }
}
