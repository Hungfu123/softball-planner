package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.domain.model.Play;
import com.softball.domain.model.PlayMarkers;
import com.softball.domain.port.out.PlayRepository;
import com.softball.domain.service.PlayValidator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Prueft die 48 Start-Plays aus V68.
 *
 * Nicht die Fachlichkeit — ob ein Cut-Mann richtig steht, entscheidet der Trainer. Hier
 * wird geprueft, was eine Maschine pruefen kann: dass jedes Play vollstaendig, validierbar
 * und abspielbar ist. Ein kaputtes Start-Play waere das Erste, was ein Spieler sieht.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class SeedPlaysTest {

    private static final Set<String> POSITIONEN = Set.of("P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF");

    @Autowired
    private PlayRepository plays;

    private final PlayValidator validator = new PlayValidator();

    @Test
    void liefertAchtundvierzigPlays() {
        assertThat(plays.findAll()).hasSizeGreaterThanOrEqualTo(48);
    }

    @Test
    void jedesStartPlayIstGueltig() {
        for (final Play play : plays.findAll()) {
            assertThatCode(() -> validator.validate(play))
                    .as("Play \"%s\"", play.getTitle())
                    .doesNotThrowAnyException();
        }
    }

    @Test
    void jederStandHatAlleNeunVerteidigerUndEinenBall() {
        for (final Play play : plays.findAll()) {
            for (final var step : play.getSteps()) {
                final PlayMarkers marker = step.getMarkers();
                assertThat(marker.defenders())
                        .as("Play \"%s\", Stand %d", play.getTitle(), step.getOrdinal())
                        .hasSize(9);
                assertThat(marker.defenders().stream().map(PlayMarkers.Defender::position))
                        .containsExactlyInAnyOrderElementsOf(POSITIONEN);
                assertThat(marker.ball()).isNotNull();
            }
        }
    }

    @Test
    void keinMarkerLiegtAusserhalbDesFeldes() {
        for (final Play play : plays.findAll()) {
            for (final var step : play.getSteps()) {
                final PlayMarkers marker = step.getMarkers();
                marker.defenders().forEach(d -> pruefeBereich(play.getTitle(), d.x(), d.y()));
                marker.runners().forEach(r -> pruefeBereich(play.getTitle(), r.x(), r.y()));
                pruefeBereich(play.getTitle(), marker.ball().x(), marker.ball().y());
            }
        }
    }

    @Test
    void jedesPlayHatMindestensZweiStaendeAusserDerStandardaufstellung() {
        final List<Play> kurz = plays.findAll().stream()
                .filter(p -> p.getSteps().size() < 2)
                .toList();

        assertThat(kurz).allSatisfy(p -> assertThat(p.getTitle()).isEqualTo("Standard-Aufstellung"));
    }

    @Test
    void notizenSindGefuellt() {
        for (final Play play : plays.findAll()) {
            for (final var step : play.getSteps()) {
                assertThat(step.getNote())
                        .as("Play \"%s\", Stand %d ohne Notiz", play.getTitle(), step.getOrdinal())
                        .isNotBlank();
            }
        }
    }

    /** Grosszuegiger Rahmen: Home liegt bei (155,218), der Zaun 215 ft entfernt. */
    private void pruefeBereich(final String titel, final double x, final double y) {
        assertThat(x).as("x in \"%s\"", titel).isBetween(-20.0, 330.0);
        assertThat(y).as("y in \"%s\"", titel).isBetween(-20.0, 270.0);
    }
}
