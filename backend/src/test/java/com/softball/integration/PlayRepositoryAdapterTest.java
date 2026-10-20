package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.domain.model.BallState;
import com.softball.domain.model.GameState;
import com.softball.domain.model.Play;
import com.softball.domain.model.PlayMarkers;
import com.softball.domain.model.PlayStep;
import com.softball.domain.port.out.PlayCategoryRepository;
import com.softball.domain.port.out.PlayRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class PlayRepositoryAdapterTest {

    @Autowired
    private PlayRepository plays;

    @Autowired
    private PlayCategoryRepository categories;

    private Long irgendeineKategorie() {
        return categories.findAll().getFirst().getId();
    }

    private static PlayMarkers vollesFeld() {
        final List<PlayMarkers.Defender> defenders = new ArrayList<>();
        final String[] positionen = {"P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF"};
        for (int i = 0; i < positionen.length; i++) {
            defenders.add(new PlayMarkers.Defender(positionen[i], 100 + i, 150 - i));
        }
        return new PlayMarkers(
                defenders,
                List.of(new PlayMarkers.Runner("r1", 196.02, 174.16, PlayMarkers.RunnerStatus.ACTIVE),
                        new PlayMarkers.Runner("r2", 155, 133.2, PlayMarkers.RunnerStatus.OUT)),
                new PlayMarkers.Ball(BallState.IN_HAND, "RF", 245, 62, PlayMarkers.Trajectory.AIR));
    }

    private Play neuesPlay(final String titel) {
        final Play play = new Play();
        play.setTitle(titel);
        play.setCategoryId(irgendeineKategorie());
        play.setGameState(GameState.CLOSE_LATE);
        play.setGameStateNote("Wir nehmen den Run nicht in Kauf.");
        play.setSteps(new ArrayList<>(List.of(
                new PlayStep(null, 1, 1200, "Kontakt", 1, vollesFeld()),
                new PlayStep(null, 2, 600, "Cut-Mann zieht raus", 1, vollesFeld()))));
        return play;
    }

    @Test
    void speichertUndLiestAlleMarkerZurueck() {
        final Play gespeichert = plays.save(neuesPlay("Marker-Rundreise"));

        final Play geladen = plays.findById(gespeichert.getId()).orElseThrow();
        assertThat(geladen.getTitle()).isEqualTo("Marker-Rundreise");
        assertThat(geladen.getGameState()).isEqualTo(GameState.CLOSE_LATE);
        assertThat(geladen.getSteps()).hasSize(2);

        final PlayMarkers marker = geladen.getSteps().getFirst().getMarkers();
        assertThat(marker.defenders()).hasSize(9);
        assertThat(marker.defenders().getFirst().position()).isEqualTo("P");
        assertThat(marker.defenders().getFirst().x()).isEqualTo(100.0);
        assertThat(marker.runners()).hasSize(2);
        assertThat(marker.runners().get(1).status()).isEqualTo(PlayMarkers.RunnerStatus.OUT);
        assertThat(marker.ball().state()).isEqualTo(BallState.IN_HAND);
        assertThat(marker.ball().holder()).isEqualTo("RF");

        plays.deleteById(geladen.getId());
    }

    @Test
    void ersetztAlleStaendeBeimSpeichern() {
        final Play gespeichert = plays.save(neuesPlay("Ersetzen"));

        gespeichert.setSteps(new ArrayList<>(List.of(
                new PlayStep(null, 1, 2000, "Nur noch einer", 0, vollesFeld()))));
        final Play erneut = plays.save(gespeichert);

        assertThat(erneut.getSteps()).hasSize(1);
        assertThat(erneut.getSteps().getFirst().getDurationMs()).isEqualTo(2000);

        plays.deleteById(erneut.getId());
    }

    @Test
    void loestVerweiseAndererPlaysBeimLoeschen() {
        final Play a = plays.save(neuesPlay("A"));
        final Play b = neuesPlay("B");
        b.setCounterpartPlayId(a.getId());
        final Play gespeichertesB = plays.save(b);

        plays.deleteById(a.getId());

        assertThat(plays.findById(gespeichertesB.getId()).orElseThrow().getCounterpartPlayId()).isNull();

        plays.deleteById(gespeichertesB.getId());
    }

    @Test
    void meldetBelegteKategorieUndHaengtPlaysUm() {
        final Long von = irgendeineKategorie();
        final Long nach = categories.findAll().get(1).getId();
        final Play play = plays.save(neuesPlay("Umhaengen"));

        assertThat(plays.existsByCategoryId(von)).isTrue();

        final int bewegt = plays.moveToCategory(von, nach);

        assertThat(bewegt).isGreaterThanOrEqualTo(1);
        assertThat(plays.findById(play.getId()).orElseThrow().getCategoryId()).isEqualTo(nach);

        plays.deleteById(play.getId());
    }
}
