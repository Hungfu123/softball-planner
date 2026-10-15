package com.softball.application;

import com.softball.adapter.dto.TrainingStatsResponse;
import com.softball.domain.model.Player;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.domain.service.TrainingParticipationCalculator;
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
     *                        Ein Wochentag traegt das P/C-Training, die uebrigen Basic — so laesst
     *                        sich die Anwesenheit getrennt auswerten. Leer/null = alle Tage zaehlen.
     */
    @Transactional(readOnly = true)
    public List<TrainingStatsResponse> getStats(final Long periodId, final LocalDate since, final LocalDate until,
                                                 final Collection<Integer> excludeWeekdays) {
        final List<Training> nonCancelledTrainings = findHeldTrainings(periodId, since, until, excludeWeekdays);

        final long totalNonCancelled = nonCancelledTrainings.size();

        final List<Long> trainingIds = nonCancelledTrainings.stream().map(Training::getId).toList();
        final List<TrainingAttendance> attendances = trainingIds.isEmpty()
            ? List.of()
            : attendanceRepository.findByTrainingIdIn(trainingIds);

        final Map<Long, Long> attendedCountByPlayer = attendances.stream()
            .filter(TrainingAttendance::isPresent)
            .collect(Collectors.groupingBy(
                a -> a.getPlayer().getId(),
                Collectors.counting()
            ));

        // Dieselbe Quote, nach der die Auto-Aufstellung sortiert — damit eine Liste, die
        // diese Zahlen anzeigt, die Aufstellung auch erklaeren kann.
        final Map<Long, TrainingParticipationCalculator.Participation> participation =
            TrainingParticipationCalculator.participation(nonCancelledTrainings, attendances);

        final Set<Long> relevantPlayerIds = new HashSet<>(attendedCountByPlayer.keySet());
        final List<Player> regularPlayers = playerRepository.findByRegularTrue();
        regularPlayers.forEach(p -> relevantPlayerIds.add(p.getId()));

        final Map<Long, Player> playerMap = new HashMap<>();
        regularPlayers.forEach(p -> playerMap.put(p.getId(), p));
        if (!relevantPlayerIds.isEmpty()) {
            playerRepository.findAllById(relevantPlayerIds).forEach(p -> playerMap.put(p.getId(), p));
        }

        return playerMap.values().stream()
            .map(player -> {
                final var p = participation.get(player.getId());
                return new TrainingStatsResponse(
                    player.getId(),
                    player.getName(),
                    attendedCountByPlayer.getOrDefault(player.getId(), 0L),
                    totalNonCancelled,
                    p != null ? p.held() : 0L,
                    p != null ? p.rate() : 0.0,
                    player.isRegular()
                );
            })
            .toList();
    }

    /**
     * Trainingsbeteiligung als Quote je Spieler (0.0 bis 1.0) statt als Zaehler.
     *
     * <p>Fuer die Auto-Aufstellung: dort entscheidet die Beteiligung mit darueber, wer
     * spielt, und ein roher Zaehler benachteiligt Neuzugaenge. Details in
     * {@link TrainingParticipationCalculator}.
     */
    @Transactional(readOnly = true)
    public Map<Long, Double> getParticipationRates(final Long periodId, final LocalDate since, final LocalDate until,
                                                    final Collection<Integer> excludeWeekdays) {
        final List<Training> heldTrainings = findHeldTrainings(periodId, since, until, excludeWeekdays);
        final List<Long> trainingIds = heldTrainings.stream().map(Training::getId).toList();
        if (trainingIds.isEmpty()) return Map.of();
        return TrainingParticipationCalculator.rates(
            heldTrainings, attendanceRepository.findByTrainingIdIn(trainingIds));
    }

    /** Trainings, die im gewaehlten Zuschnitt wirklich stattgefunden haben. */
    private List<Training> findHeldTrainings(final Long periodId, final LocalDate since, final LocalDate until,
                                              final Collection<Integer> excludeWeekdays) {
        final List<Training> allTrainings = periodId != null
            ? trainingRepository.findByPeriodIdOrderByDateDesc(periodId)
            : trainingRepository.findAllByOrderByDateDesc();

        final Set<Integer> excluded = excludeWeekdays == null ? Set.of() : new HashSet<>(excludeWeekdays);

        return allTrainings.stream()
            .filter(t -> !t.isCancelled())
            .filter(t -> since == null || !t.getDate().isBefore(since))
            .filter(t -> until == null || !t.getDate().isAfter(until))
            .filter(t -> !excluded.contains(t.getDate().getDayOfWeek().getValue()))
            .toList();
    }
}
