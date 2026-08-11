package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.GameDayEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.domain.model.Game;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.SpielbogenRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Rundlauf-Test fuer die Spielzeit-Uhr-Spalten (Task 1, additiv): speichern, neu laden, Werte
 * muessen ueberleben. Faellt, wenn eine Mapper-Richtung die drei Uhr-Felder nicht mitnimmt.
 *
 * {@code @Transactional}, weil {@code GameMapper.toDomain} beim Aufloesen der GameDay/Season-
 * Beziehung lazy nachladen muss — ohne offene Session (wie hier ausserhalb eines HTTP-Requests)
 * schlaegt das sonst mit LazyInitializationException fehl.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@Transactional
class GameClockPersistenceIntegrationTest {

    @Autowired private SpringSeasonRepository seasonRepository;
    @Autowired private SpringGameDayRepository gameDayRepository;
    @Autowired private SpringGameRepository gameRepository;
    @Autowired private GameRepository gameRepositoryPort;
    @Autowired private SpielbogenRepository spielbogenRepository;

    @AfterEach
    void tearDown() {
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
    }

    @Test
    void gameClockFieldsSurviveSaveAndReload() {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Uhr-Test-Saison", 2026));
        final GameDayEntity gameDay = gameDayRepository.save(
            new GameDayEntity(LocalDate.now(), "Uhr-Test", "Testplatz", season));
        final GameEntity gameEntity = gameRepository.save(new GameEntity(1, gameDay));

        final Instant runningSince = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        final Instant startedAt = runningSince.minusSeconds(600);
        final Game game = gameRepositoryPort.findById(gameEntity.getId()).orElseThrow();
        game.setTimerRunningSince(runningSince);
        game.setTimerAccumulatedSeconds(125);
        game.setTimeLimitMinutes(50);
        game.setTimerStartedAt(startedAt);
        gameRepositoryPort.save(game);

        final Game reloaded = gameRepositoryPort.findById(gameEntity.getId()).orElseThrow();
        assertThat(reloaded.getTimerRunningSince()).isEqualTo(runningSince);
        assertThat(reloaded.getTimerAccumulatedSeconds()).isEqualTo(125);
        assertThat(reloaded.getTimeLimitMinutes()).isEqualTo(50);
        assertThat(reloaded.getTimerStartedAt()).isEqualTo(startedAt);
    }

    @Test
    void spielbogenClockFieldsSurviveSaveAndReload() {
        final Spielbogen bogen = new Spielbogen(LocalDate.now(), "Testplatz", "Dead Sox", "Gegner", null);

        final Instant runningSince = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        final Instant startedAt = runningSince.minusSeconds(600);
        bogen.setTimerRunningSince(runningSince);
        bogen.setTimerAccumulatedSeconds(300);
        bogen.setTimeLimitMinutes(90);
        bogen.setTimerStartedAt(startedAt);

        final Spielbogen saved = spielbogenRepository.save(bogen);
        try {
            final Spielbogen reloaded = spielbogenRepository.findById(saved.getId()).orElseThrow();
            assertThat(reloaded.getTimerRunningSince()).isEqualTo(runningSince);
            assertThat(reloaded.getTimerAccumulatedSeconds()).isEqualTo(300);
            assertThat(reloaded.getTimeLimitMinutes()).isEqualTo(90);
            assertThat(reloaded.getTimerStartedAt()).isEqualTo(startedAt);
        } finally {
            spielbogenRepository.deleteById(saved.getId());
        }
    }
}
