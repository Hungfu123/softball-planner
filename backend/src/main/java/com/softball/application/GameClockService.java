package com.softball.application;

import com.softball.domain.model.Game;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.domain.service.GameClockCalculator;
import com.softball.domain.service.GameClockCalculator.ClockState;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Start/Pause/Fortsetzen/Reset der Spielzeit-Uhr — für Legacy-{@link Game} UND
 * {@link Spielbogen} in einem Service, weil die vier Aktionen samt ihrer Ablehnungsregeln für
 * beide Aggregate identisch sind (nur der Repository-Typ unterscheidet sich); zwei Services
 * würden dieselbe Validierung und Zeit-Arithmetik zweimal duplizieren, was dem Grundsatz aus
 * {@link GameClockCalculator} widerspricht ("Die Rechnung gehört an eine Stelle").
 *
 * <p>Leitgrundsatz gilt auch hier, nur umgekehrt: dieser Service schreibt ausschließlich in die
 * drei Uhr-Felder ({@code timerRunningSince}, {@code timerAccumulatedSeconds},
 * {@code timeLimitMinutes}) — nie in Score, Inning, Outs, At-Bats oder {@code endedAt}.
 */
@Service
public class GameClockService {

    private static final Logger log = LoggerFactory.getLogger(GameClockService.class);

    private final GameRepository gameRepository;
    private final SpielbogenRepository spielbogenRepository;
    private final GameClockCalculator clockCalculator;

    public GameClockService(final GameRepository gameRepository,
                             final SpielbogenRepository spielbogenRepository,
                             final GameClockCalculator clockCalculator) {
        this.gameRepository = gameRepository;
        this.spielbogenRepository = spielbogenRepository;
        this.clockCalculator = clockCalculator;
    }

    // ===== Legacy Game =====

    @Transactional
    public ClockState startGameClock(final Long gameId, final Integer limitMinutes) {
        final Game game = findGame(gameId);
        rejectIfRunning(game.getTimerRunningSince());
        final Instant now = Instant.now();
        game.setTimerRunningSince(now);
        game.setTimeLimitMinutes(limitMinutes);
        gameRepository.save(game);
        final ClockState state = clockState(game, now);
        log.info("Game {} Uhr gestartet: Limit={}", gameId, limitMinutes != null ? limitMinutes + "min" : "keins");
        return state;
    }

    @Transactional
    public ClockState pauseGameClock(final Long gameId) {
        final Game game = findGame(gameId);
        final Instant runningSince = rejectIfNotRunning(game.getTimerRunningSince());
        final Instant now = Instant.now();
        game.setTimerAccumulatedSeconds(
            bankElapsed(runningSince, game.getTimerAccumulatedSeconds(), game.getEndedAt(), now));
        game.setTimerRunningSince(null);
        gameRepository.save(game);
        final ClockState state = clockState(game, now);
        log.info("Game {} Uhr pausiert: {}s angesammelt", gameId, state.elapsedSeconds());
        return state;
    }

    @Transactional
    public ClockState resumeGameClock(final Long gameId) {
        final Game game = findGame(gameId);
        rejectIfRunning(game.getTimerRunningSince());
        rejectIfNeverStarted(game.getTimerRunningSince(), game.getTimerAccumulatedSeconds());
        final Instant now = Instant.now();
        game.setTimerRunningSince(now);
        gameRepository.save(game);
        final ClockState state = clockState(game, now);
        log.info("Game {} Uhr fortgesetzt: {}s bereits angesammelt", gameId, state.elapsedSeconds());
        return state;
    }

    @Transactional
    public ClockState resetGameClock(final Long gameId) {
        final Game game = findGame(gameId);
        game.setTimerRunningSince(null);
        game.setTimerAccumulatedSeconds(0);
        gameRepository.save(game);
        final ClockState state = clockState(game, Instant.now());
        log.info("Game {} Uhr zurückgesetzt", gameId);
        return state;
    }

    /** Uhr-Zustand eines bereits geladenen Games — für die bestehenden Lese-Endpunkte. */
    public ClockState gameClockState(final Game game) {
        return clockState(game, Instant.now());
    }

    private ClockState clockState(final Game game, final Instant now) {
        return clockCalculator.compute(game.getTimerRunningSince(), game.getTimerAccumulatedSeconds(),
            game.getTimeLimitMinutes(), game.getEndedAt(), now);
    }

    private Game findGame(final Long id) {
        return gameRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Game", id));
    }

    // ===== Spielbogen =====

    @Transactional
    public ClockState startBogenClock(final Long bogenId, final Integer limitMinutes) {
        final Spielbogen bogen = findBogen(bogenId);
        rejectIfRunning(bogen.getTimerRunningSince());
        final Instant now = Instant.now();
        bogen.setTimerRunningSince(now);
        bogen.setTimeLimitMinutes(limitMinutes);
        spielbogenRepository.save(bogen);
        final ClockState state = clockState(bogen, now);
        log.info("Spielbogen {} Uhr gestartet: Limit={}", bogenId, limitMinutes != null ? limitMinutes + "min" : "keins");
        return state;
    }

    @Transactional
    public ClockState pauseBogenClock(final Long bogenId) {
        final Spielbogen bogen = findBogen(bogenId);
        final Instant runningSince = rejectIfNotRunning(bogen.getTimerRunningSince());
        final Instant now = Instant.now();
        bogen.setTimerAccumulatedSeconds(
            bankElapsed(runningSince, bogen.getTimerAccumulatedSeconds(), bogen.getEndedAt(), now));
        bogen.setTimerRunningSince(null);
        spielbogenRepository.save(bogen);
        final ClockState state = clockState(bogen, now);
        log.info("Spielbogen {} Uhr pausiert: {}s angesammelt", bogenId, state.elapsedSeconds());
        return state;
    }

    @Transactional
    public ClockState resumeBogenClock(final Long bogenId) {
        final Spielbogen bogen = findBogen(bogenId);
        rejectIfRunning(bogen.getTimerRunningSince());
        rejectIfNeverStarted(bogen.getTimerRunningSince(), bogen.getTimerAccumulatedSeconds());
        final Instant now = Instant.now();
        bogen.setTimerRunningSince(now);
        spielbogenRepository.save(bogen);
        final ClockState state = clockState(bogen, now);
        log.info("Spielbogen {} Uhr fortgesetzt: {}s bereits angesammelt", bogenId, state.elapsedSeconds());
        return state;
    }

    @Transactional
    public ClockState resetBogenClock(final Long bogenId) {
        final Spielbogen bogen = findBogen(bogenId);
        bogen.setTimerRunningSince(null);
        bogen.setTimerAccumulatedSeconds(0);
        spielbogenRepository.save(bogen);
        final ClockState state = clockState(bogen, Instant.now());
        log.info("Spielbogen {} Uhr zurückgesetzt", bogenId);
        return state;
    }

    /** Uhr-Zustand eines bereits geladenen Spielbogens — für die bestehenden Lese-Endpunkte. */
    public ClockState bogenClockState(final Spielbogen bogen) {
        return clockState(bogen, Instant.now());
    }

    private ClockState clockState(final Spielbogen bogen, final Instant now) {
        return clockCalculator.compute(bogen.getTimerRunningSince(), bogen.getTimerAccumulatedSeconds(),
            bogen.getTimeLimitMinutes(), bogen.getEndedAt(), now);
    }

    private Spielbogen findBogen(final Long id) {
        return spielbogenRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", id));
    }

    // ===== gemeinsame Validierung, beide Aggregate =====

    private void rejectIfRunning(final Instant runningSince) {
        if (runningSince != null) {
            throw new BusinessValidationException("Die Uhr läuft bereits.");
        }
    }

    private Instant rejectIfNotRunning(final Instant runningSince) {
        if (runningSince == null) {
            throw new BusinessValidationException("Die Uhr läuft nicht — Pause nicht möglich.");
        }
        return runningSince;
    }

    private void rejectIfNeverStarted(final Instant runningSince, final int accumulatedSeconds) {
        if (runningSince == null && accumulatedSeconds == 0) {
            throw new BusinessValidationException("Die Uhr wurde noch nie gestartet.");
        }
    }

    /**
     * Bucht die laufende Spanne ins Konto — über den Calculator, nicht handgestrickt, damit ein
     * beendetes Spiel/Bogen mit noch laufender Uhr an {@code endedAt} deckelt statt an {@code now}.
     * Sonst würde ein spätes Pause auf ein längst beendetes Spiel die Zeit seit Spielende
     * mitzählen — genau der Sprung, den die Ableitung in {@link GameClockCalculator} verhindert.
     */
    private int bankElapsed(final Instant runningSince, final int accumulatedSeconds,
                             final Instant endedAt, final Instant now) {
        return clockCalculator.compute(runningSince, accumulatedSeconds, null, endedAt, now).elapsedSeconds();
    }

    // ===== Wiederöffnen — die eine Ausnahme vom Leitgrundsatz =====

    /**
     * Pausiert eine laufende Uhr, unmittelbar bevor der Aufrufer {@code endedAt} nullt (Reopen).
     * Der einzige Schreibvorgang vom Spielablauf in die Uhr — sonst gilt strikt "Uhr liest,
     * schreibt nie" (siehe Klassenkommentar). Reopen löscht {@code endedAt}; ohne dieses Banking
     * verlöre die Ableitung in {@link GameClockCalculator} schlagartig ihre Obergrenze und
     * zählte alle Stunden seit Spielende mit statt die Uhr pausiert zu lassen. Muss aufgerufen
     * werden, WÄHREND {@code endedAt} noch gesetzt ist — danach ist die Deckelung nicht mehr
     * rekonstruierbar.
     */
    public void pauseClockBeforeReopen(final Game game) {
        if (game.getTimerRunningSince() == null) {
            return;
        }
        game.setTimerAccumulatedSeconds(
            bankElapsed(game.getTimerRunningSince(), game.getTimerAccumulatedSeconds(), game.getEndedAt(), Instant.now()));
        game.setTimerRunningSince(null);
    }

    /** Wie {@link #pauseClockBeforeReopen(Game)}, für den Spielbogen. */
    public void pauseClockBeforeReopen(final Spielbogen bogen) {
        if (bogen.getTimerRunningSince() == null) {
            return;
        }
        bogen.setTimerAccumulatedSeconds(
            bankElapsed(bogen.getTimerRunningSince(), bogen.getTimerAccumulatedSeconds(), bogen.getEndedAt(), Instant.now()));
        bogen.setTimerRunningSince(null);
    }
}
