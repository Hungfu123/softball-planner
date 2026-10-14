package com.softball.application;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.Game;
import com.softball.domain.model.Player;
import com.softball.domain.model.PlayerFormPoint;
import com.softball.domain.model.PlayerUsage;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.model.UsageScope;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.BaseRunningEventRepository;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.domain.service.BattingTimelineCalculator;
import com.softball.domain.service.PlayerUsageCalculator;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Auswertungen für EINEN Spieler — die Datenbasis der Spielerprofil-Seite.
 *
 * Bewusst neben {@link BattingStatsService} statt darin: die rechnet Tabellen über
 * Spieler-Mengen (Spiel/Saison/Gegner), hier geht es um den Verlauf eines einzelnen.
 *
 * Quelle ist wie beim Spiel-Verlauf ausschließlich das Old-Scoring (At-Bats);
 * Spielbogen-Daten fließen nicht ein, sonst spränge die Kurve je nach Erfassungsart.
 */
@Service
public class PlayerProfileService {

    private static final BattingTimelineCalculator CALCULATOR = new BattingTimelineCalculator();
    private static final PlayerUsageCalculator USAGE_CALCULATOR = new PlayerUsageCalculator();

    private final PlayerRepository playerRepository;
    private final AtBatRepository atBatRepository;
    private final GameRepository gameRepository;
    private final BaseRunningEventRepository baseRunningEventRepository;
    private final GameDayRepository gameDayRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;

    public PlayerProfileService(final PlayerRepository playerRepository,
                                final AtBatRepository atBatRepository,
                                final GameRepository gameRepository,
                                final BaseRunningEventRepository baseRunningEventRepository,
                                final GameDayRepository gameDayRepository,
                                final LineupEntryRepository lineupEntryRepository,
                                final TrainingRepository trainingRepository,
                                final TrainingAttendanceRepository attendanceRepository) {
        this.playerRepository = playerRepository;
        this.atBatRepository = atBatRepository;
        this.gameRepository = gameRepository;
        this.baseRunningEventRepository = baseRunningEventRepository;
        this.gameDayRepository = gameDayRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
    }

    /** Form-Kurve: ein Punkt je Spiel mit Plate Appearance, ältestes zuerst. */
    @Transactional(readOnly = true)
    public List<PlayerFormPoint> getFormTimeline(final Long playerId) {
        final Player player = playerRepository.findById(playerId)
            .orElseThrow(() -> new ResourceNotFoundException("Player", playerId));

        final List<AtBat> atBats = atBatRepository.findByBatterIdOrderByGameAndSequence(playerId);
        if (atBats.isEmpty()) return List.of();

        final List<Long> gameIds = atBats.stream()
            .map(AtBat::getGame).filter(Objects::nonNull).map(Game::getId).filter(Objects::nonNull)
            .distinct().toList();
        final Map<Long, Game> gamesById = gameRepository.findAllByIdWithDetails(gameIds).stream()
            .collect(java.util.stream.Collectors.toMap(Game::getId, Function.identity(), (a, b) -> a));

        // Steals desselben Spielers je Spiel — die At-Bats kennen sie nicht, sie sind
        // eigene Events. Gelesen wird über die Spiele, in denen er am Schlag war.
        final Map<Long, List<BaseRunningEvent>> stealsByGame = baseRunningEventRepository
            .findByGameIdInOrderByIdAsc(gameIds).stream()
            .filter(e -> e.getRunner() != null && playerId.equals(e.getRunner().getId()))
            .filter(e -> e.getGame() != null && e.getGame().getId() != null)
            .collect(java.util.stream.Collectors.groupingBy(e -> e.getGame().getId()));

        return CALCULATOR.calculate(player, atBats, gamesById, stealsByGame);
    }

    /**
     * Einsatz-Profil: Zusagen, Aufstellungen, Training und Schlagplatz.
     *
     * Bewusst eine eigene Abfrage neben der Form-Kurve: wer das Profil nur zum Schlagen
     * aufmacht, soll nicht alle Spieltage und Trainings mitladen.
     */
    @Transactional(readOnly = true)
    public PlayerUsage getUsage(final Long playerId) {
        return getUsage(playerId, UsageScope.all());
    }

    /** @param scope Jahr, Saison oder alles. */
    @Transactional(readOnly = true)
    public PlayerUsage getUsage(final Long playerId, final UsageScope scope) {
        if (!playerRepository.existsById(playerId)) {
            throw new ResourceNotFoundException("Player", playerId);
        }

        final Set<Long> availableGameDayIds = new HashSet<>(gameDayRepository.findGameDayIdsByAvailablePlayer(playerId));
        final Set<Long> playedGameDayIds = new HashSet<>(lineupEntryRepository.findGameDayIdsByPlayerId(playerId));
        final List<Integer> battingOrders = battingOrders(playerId, scope);
        final Set<Long> attendedTrainingIds = attendanceRepository.findByPlayerId(playerId).stream()
            .filter(TrainingAttendance::isPresent)
            .filter(a -> a.getTraining() != null && a.getTraining().getId() != null)
            .map(a -> a.getTraining().getId())
            .collect(Collectors.toSet());

        return USAGE_CALCULATOR.calculate(
            gameDayRepository.findAll(),
            availableGameDayIds,
            playedGameDayIds,
            battingOrders,
            // Ohne Trainings-Bezug gar nicht erst laden — eine Saison kennt keine.
            scope.coversTrainings() ? trainingRepository.findAllByOrderByDateDesc() : List.of(),
            attendedTrainingIds,
            LocalDate.now(),
            scope
        );
    }

    private List<Integer> battingOrders(final Long playerId, final UsageScope scope) {
        if (scope.seasonId() != null) {
            return lineupEntryRepository.findBattingOrdersByPlayerIdAndSeason(playerId, scope.seasonId());
        }
        if (scope.year() != null) {
            return lineupEntryRepository.findBattingOrdersByPlayerIdAndYear(playerId, scope.year());
        }
        return lineupEntryRepository.findBattingOrdersByPlayerId(playerId);
    }
}
