package com.softball.application;

import com.softball.domain.model.Game;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.domain.service.GameClockCalculator;
import com.softball.domain.service.GameClockCalculator.ClockState;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
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
        return clockState(game, now);
    }

    @Transactional
    public ClockState pauseGameClock(final Long gameId) {
        final Game game = findGame(gameId);
        final Instant runningSince = rejectIfNotRunning(game.getTimerRunningSince());
        final Instant now = Instant.now();
        game.setTimerAccumulatedSeconds(bankElapsed(game.getTimerAccumulatedSeconds(), runningSince, now));
        game.setTimerRunningSince(null);
        gameRepository.save(game);
        return clockState(game, now);
    }

    @Transactional
    public ClockState resumeGameClock(final Long gameId) {
        final Game game = findGame(gameId);
        rejectIfRunning(game.getTimerRunningSince());
        rejectIfNeverStarted(game.getTimerRunningSince(), game.getTimerAccumulatedSeconds());
        final Instant now = Instant.now();
        game.setTimerRunningSince(now);
        gameRepository.save(game);
        return clockState(game, now);
    }

    @Transactional
    public ClockState resetGameClock(final Long gameId) {
        final Game game = findGame(gameId);
        game.setTimerRunningSince(null);
        game.setTimerAccumulatedSeconds(0);
        gameRepository.save(game);
        return clockState(game, Instant.now());
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
        return clockState(bogen, now);
    }

    @Transactional
    public ClockState pauseBogenClock(final Long bogenId) {
        final Spielbogen bogen = findBogen(bogenId);
        final Instant runningSince = rejectIfNotRunning(bogen.getTimerRunningSince());
        final Instant now = Instant.now();
        bogen.setTimerAccumulatedSeconds(bankElapsed(bogen.getTimerAccumulatedSeconds(), runningSince, now));
        bogen.setTimerRunningSince(null);
        spielbogenRepository.save(bogen);
        return clockState(bogen, now);
    }

    @Transactional
    public ClockState resumeBogenClock(final Long bogenId) {
        final Spielbogen bogen = findBogen(bogenId);
        rejectIfRunning(bogen.getTimerRunningSince());
        rejectIfNeverStarted(bogen.getTimerRunningSince(), bogen.getTimerAccumulatedSeconds());
        final Instant now = Instant.now();
        bogen.setTimerRunningSince(now);
        spielbogenRepository.save(bogen);
        return clockState(bogen, now);
    }

    @Transactional
    public ClockState resetBogenClock(final Long bogenId) {
        final Spielbogen bogen = findBogen(bogenId);
        bogen.setTimerRunningSince(null);
        bogen.setTimerAccumulatedSeconds(0);
        spielbogenRepository.save(bogen);
        return clockState(bogen, Instant.now());
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

    private int bankElapsed(final int accumulatedSeconds, final Instant runningSince, final Instant now) {
        final long delta = Duration.between(runningSince, now).getSeconds();
        return accumulatedSeconds + (int) Math.max(delta, 0);
    }
}
