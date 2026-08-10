package com.softball.application;

import com.softball.domain.model.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.GameStaffRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class GameService {

    private static final Logger log = LoggerFactory.getLogger(GameService.class);

    private final GameRepository gameRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final GameStaffRepository gameStaffRepository;
    private final LeagueTeamService leagueTeamService;
    private final GameClockService gameClockService;

    public GameService(final GameRepository gameRepository, final LineupEntryRepository lineupEntryRepository,
                       final GameStaffRepository gameStaffRepository, final LeagueTeamService leagueTeamService,
                       final GameClockService gameClockService) {
        this.gameRepository = gameRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.gameStaffRepository = gameStaffRepository;
        this.leagueTeamService = leagueTeamService;
        this.gameClockService = gameClockService;
    }

    @Transactional(readOnly = true)
    public Game findById(final Long id) {
        return gameRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Game", id));
    }

    @Transactional
    public Game updateOpponent(final Long gameId, final Long opponentTeamId) {
        final Game game = findById(gameId);
        if (opponentTeamId == null) {
            game.setOpponentTeam(null);
        } else {
            final LeagueTeam team = leagueTeamService.findById(opponentTeamId);
            if (team.isOwnTeam()) {
                throw new BusinessValidationException("Das eigene Team kann nicht als Gegner gesetzt werden");
            }
            final Long gameSeasonId = game.getGameDay().getSeason().getId();
            if (!team.getSeason().getId().equals(gameSeasonId)) {
                throw new BusinessValidationException("Team " + opponentTeamId + " gehoert nicht zur selben Saison wie das Spiel");
            }
            game.setOpponentTeam(team);
        }
        return gameRepository.save(game);
    }

    @Transactional
    public Game setScore(final Long gameId, final Integer scoreUs, final Integer scoreThem) {
        final Game game = findById(gameId);

        if ((scoreUs == null) != (scoreThem == null)) {
            throw new BusinessValidationException("scoreUs und scoreThem muessen beide gesetzt oder beide null sein");
        }
        if (scoreUs != null && scoreUs < 0) {
            throw new BusinessValidationException("scoreUs darf nicht negativ sein");
        }
        if (scoreThem != null && scoreThem < 0) {
            throw new BusinessValidationException("scoreThem darf nicht negativ sein");
        }

        game.setScoreUs(scoreUs);
        game.setScoreThem(scoreThem);
        return gameRepository.save(game);
    }

    @Transactional
    public Game setBattingSide(final Long gameId, final String battingSide) {
        if (battingSide != null && !battingSide.equals("top") && !battingSide.equals("bottom")) {
            throw new BusinessValidationException("battingSide muss 'top', 'bottom' oder null sein");
        }
        final Game game = findById(gameId);
        game.setBattingSide(battingSide);
        return gameRepository.save(game);
    }

    @Transactional
    public Game endGame(final Long gameId) {
        final Game game = findById(gameId);
        if (game.getEndedAt() != null) {
            return game;
        }
        game.setEndedAt(Instant.now());
        log.info("Spiel {} beendet", gameId);
        return gameRepository.save(game);
    }

    @Transactional
    public Game reopenGame(final Long gameId) {
        final Game game = findById(gameId);
        if (game.getEndedAt() == null) {
            return game;
        }
        // Vor dem Nullen von endedAt: laufende Uhr pausieren und deckeln (siehe
        // GameClockService.pauseClockBeforeReopen) — sonst zaehlt die Ableitung schlagartig alle
        // Stunden seit Spielende mit statt die Uhr pausiert zu lassen.
        gameClockService.pauseClockBeforeReopen(game);
        game.setEndedAt(null);
        log.info("Spiel {} wieder geoeffnet", gameId);
        return gameRepository.save(game);
    }

    @Transactional
    public Game setCoachRotation(final Long gameId,
                                  final CoachRotationPair firstBaseRotation,
                                  final CoachRotationPair thirdBaseRotation,
                                  final boolean firstBaseReversed,
                                  final boolean thirdBaseReversed) {
        final Game game = findById(gameId);
        game.setFirstBaseCoachRotation(firstBaseRotation);
        game.setThirdBaseCoachRotation(thirdBaseRotation);
        game.setFirstBaseCoachRotationReversed(firstBaseReversed);
        game.setThirdBaseCoachRotationReversed(thirdBaseReversed);
        log.info("Game {} coach-rotation set: 1B={} (rev={}), 3B={} (rev={})",
            gameId, firstBaseRotation, firstBaseReversed, thirdBaseRotation, thirdBaseReversed);
        return gameRepository.save(game);
    }

    @Transactional
    public List<Game> swapGames(final Long gameId1, final Long gameId2) {
        if (gameId1.equals(gameId2)) {
            throw new BusinessValidationException("Kann ein Spiel nicht mit sich selbst tauschen");
        }

        final Game gameA = findById(gameId1);
        final Game gameB = findById(gameId2);

        if (!gameA.getGameDay().getId().equals(gameB.getGameDay().getId())) {
            throw new BusinessValidationException("Games gehoeren nicht zum selben Spieltag");
        }

        log.info("Swap Games {} und {} (Spieltag {})", gameId1, gameId2, gameA.getGameDay().getId());

        record LineupSnapshot(Player player, Position position, int battingOrder, Player dhBatterPlayer) {}
        record StaffSnapshot(Player player, StaffRole role) {}

        final List<LineupSnapshot> snapshotA = lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId1).stream()
            .map(e -> new LineupSnapshot(e.getPlayer(), e.getPosition(), e.getBattingOrder(), e.getDhBatterPlayer()))
            .toList();
        final List<LineupSnapshot> snapshotB = lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId2).stream()
            .map(e -> new LineupSnapshot(e.getPlayer(), e.getPosition(), e.getBattingOrder(), e.getDhBatterPlayer()))
            .toList();
        final List<StaffSnapshot> staffSnapshotA = gameStaffRepository.findByGameId(gameId1).stream()
            .map(s -> new StaffSnapshot(s.getPlayer(), s.getRole()))
            .toList();
        final List<StaffSnapshot> staffSnapshotB = gameStaffRepository.findByGameId(gameId2).stream()
            .map(s -> new StaffSnapshot(s.getPlayer(), s.getRole()))
            .toList();

        lineupEntryRepository.deleteByGameId(gameId1);
        lineupEntryRepository.deleteByGameId(gameId2);
        gameStaffRepository.deleteByGameId(gameId1);
        gameStaffRepository.deleteByGameId(gameId2);

        swapGameFields(gameA, gameB);

        for (final LineupSnapshot snap : snapshotB) {
            final LineupEntry entry = new LineupEntry();
            entry.setGame(gameA);
            entry.setPlayer(snap.player());
            entry.setPosition(snap.position());
            entry.setBattingOrder(snap.battingOrder());
            entry.setDhBatterPlayer(snap.dhBatterPlayer());
            lineupEntryRepository.save(entry);
        }
        for (final LineupSnapshot snap : snapshotA) {
            final LineupEntry entry = new LineupEntry();
            entry.setGame(gameB);
            entry.setPlayer(snap.player());
            entry.setPosition(snap.position());
            entry.setBattingOrder(snap.battingOrder());
            entry.setDhBatterPlayer(snap.dhBatterPlayer());
            lineupEntryRepository.save(entry);
        }
        for (final StaffSnapshot snap : staffSnapshotB) {
            final GameStaff staff = new GameStaff();
            staff.setGame(gameA);
            staff.setPlayer(snap.player());
            staff.setRole(snap.role());
            gameStaffRepository.save(staff);
        }
        for (final StaffSnapshot snap : staffSnapshotA) {
            final GameStaff staff = new GameStaff();
            staff.setGame(gameB);
            staff.setPlayer(snap.player());
            staff.setRole(snap.role());
            gameStaffRepository.save(staff);
        }

        return List.of(gameA, gameB);
    }

    private void swapGameFields(final Game a, final Game b) {
        final LeagueTeam opponentA = a.getOpponentTeam();
        final Integer scoreUsA = a.getScoreUs();
        final Integer scoreThemA = a.getScoreThem();

        a.setOpponentTeam(b.getOpponentTeam());
        a.setScoreUs(b.getScoreUs());
        a.setScoreThem(b.getScoreThem());

        b.setOpponentTeam(opponentA);
        b.setScoreUs(scoreUsA);
        b.setScoreThem(scoreThemA);

        gameRepository.save(a);
        gameRepository.save(b);
    }
}
