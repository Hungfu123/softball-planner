package com.softball.application;

import com.softball.adapter.dto.TrainingStatsResponse;
import com.softball.domain.model.Player;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TrainingStatsService {

    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final PlayerRepository playerRepository;

    public TrainingStatsService(final TrainingRepository trainingRepository,
                                 final TrainingAttendanceRepository attendanceRepository,
                                 final PlayerRepository playerRepository) {
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.playerRepository = playerRepository;
    }

    @Transactional(readOnly = true)
    public List<TrainingStatsResponse> getStats(final Long periodId, final LocalDate since, final LocalDate until) {
        return getStats(periodId, since, until, List.of());
    }

    /**
     * @param excludeWeekdays ISO-Wochentage (1 = Montag … 7 = Sonntag), die NICHT mitzaehlen sollen.
     *                        Montag ist P/C-Training, die uebrigen Tage Basic — so laesst sich die
     *                        Anwesenheit getrennt auswerten. Leer/null = alle Tage zaehlen.
     */
    @Transactional(readOnly = true)
    public List<TrainingStatsResponse> getStats(final Long periodId, final LocalDate since, final LocalDate until,
                                                 final Collection<Integer> excludeWeekdays) {
        final List<Training> allTrainings = periodId != null
            ? trainingRepository.findByPeriodIdOrderByDateDesc(periodId)
            : trainingRepository.findAllByOrderByDateDesc();

        final Set<Integer> excluded = excludeWeekdays == null ? Set.of() : new HashSet<>(excludeWeekdays);

        final List<Training> nonCancelledTrainings = allTrainings.stream()
            .filter(t -> !t.isCancelled())
            .filter(t -> since == null || !t.getDate().isBefore(since))
            .filter(t -> until == null || !t.getDate().isAfter(until))
            .filter(t -> !excluded.contains(t.getDate().getDayOfWeek().getValue()))
            .toList();

        final long totalNonCancelled = nonCancelledTrainings.size();

        final List<Long> trainingIds = nonCancelledTrainings.stream().map(Training::getId).toList();
        final Map<Long, Long> attendedCountByPlayer;
        if (trainingIds.isEmpty()) {
            attendedCountByPlayer = Map.of();
        } else {
            attendedCountByPlayer = attendanceRepository.findByTrainingIdIn(trainingIds).stream()
                .filter(TrainingAttendance::isPresent)
                .collect(Collectors.groupingBy(
                    a -> a.getPlayer().getId(),
                    Collectors.counting()
                ));
        }

        final Set<Long> relevantPlayerIds = new HashSet<>(attendedCountByPlayer.keySet());
        final List<Player> regularPlayers = playerRepository.findByRegularTrue();
        regularPlayers.forEach(p -> relevantPlayerIds.add(p.getId()));

        final Map<Long, Player> playerMap = new HashMap<>();
        regularPlayers.forEach(p -> playerMap.put(p.getId(), p));
        if (!relevantPlayerIds.isEmpty()) {
            playerRepository.findAllById(relevantPlayerIds).forEach(p -> playerMap.put(p.getId(), p));
        }

        return playerMap.values().stream()
            .map(player -> new TrainingStatsResponse(
                player.getId(),
                player.getName(),
                attendedCountByPlayer.getOrDefault(player.getId(), 0L),
                totalNonCancelled,
                player.isRegular()
            ))
            .toList();
    }
}
