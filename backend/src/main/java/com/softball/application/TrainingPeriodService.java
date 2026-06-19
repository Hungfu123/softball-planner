package com.softball.application;

import com.softball.adapter.dto.TrainingPeriodResponse;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingPeriod;
import com.softball.domain.service.PeriodRhythmSync;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingPeriodRepository;
import com.softball.domain.port.out.TrainingPlanRepository;
import com.softball.domain.port.out.TrainingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class TrainingPeriodService {

    private final TrainingPeriodRepository periodRepository;
    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final TrainingPlanRepository trainingPlanRepository;
    private final RegularPlayerAutoFiller autoFiller;
    private final PeriodRhythmSync rhythmSync = new PeriodRhythmSync();

    public TrainingPeriodService(final TrainingPeriodRepository periodRepository,
                                  final TrainingRepository trainingRepository,
                                  final TrainingAttendanceRepository attendanceRepository,
                                  final TrainingPlanRepository trainingPlanRepository,
                                  final RegularPlayerAutoFiller autoFiller) {
        this.periodRepository = periodRepository;
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.trainingPlanRepository = trainingPlanRepository;
        this.autoFiller = autoFiller;
    }

    @Transactional(readOnly = true)
    public List<TrainingPeriodResponse> findAll() {
        return periodRepository.findAllByOrderByStartDateDesc().stream()
            .map(p -> {
                if (p.getWeekdays() != null && !p.getWeekdays().isEmpty()) {
                    return TrainingPeriodResponse.from(p);
                }
                final List<Integer> derived = trainingRepository.findByPeriodIdOrderByDateDesc(p.getId()).stream()
                    .map(t -> t.getDate().getDayOfWeek().getValue())
                    .distinct()
                    .sorted()
                    .toList();
                return TrainingPeriodResponse.from(p, derived);
            })
            .toList();
    }

    @Transactional
    public TrainingPeriodResponse create(final String name, final LocalDate startDate, final LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Startdatum darf nicht nach dem Enddatum liegen");
        }
        return TrainingPeriodResponse.from(periodRepository.save(new TrainingPeriod(name, startDate, endDate)));
    }

    @Transactional
    public TrainingPeriodResponse update(final Long periodId, final String name, final LocalDate startDate,
                                          final LocalDate endDate, final List<Integer> weekdays,
                                          final String time, final String location) {
        final TrainingPeriod period = periodRepository.findById(periodId)
            .orElseThrow(() -> new ResourceNotFoundException("TrainingPeriod", periodId));
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name darf nicht leer sein");
        }
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Startdatum darf nicht nach dem Enddatum liegen");
        }
        final List<Integer> safeWeekdays = weekdays != null ? weekdays : new ArrayList<>();
        for (final Integer d : safeWeekdays) {
            if (d == null || d < 1 || d > 7) {
                throw new IllegalArgumentException("Wochentag muss zwischen 1 (Montag) und 7 (Sonntag) liegen");
            }
        }

        period.setName(name.trim());
        period.setStartDate(startDate);
        period.setEndDate(endDate);
        period.setWeekdays(safeWeekdays);
        period.setTime(time);
        period.setLocation(location);
        final TrainingPeriod saved = periodRepository.save(period);

        final List<Training> existing = trainingRepository.findByPeriodIdOrderByDateDesc(periodId);
        final PeriodRhythmSync.SyncPlan plan = rhythmSync.computeFuture(
            safeWeekdays, startDate, endDate, LocalDate.now(), existing);

        for (final LocalDate date : plan.datesToCreate()) {
            Training training = new Training(date, time, location);
            training.setPeriod(saved);
            training = trainingRepository.save(training);
            autoFiller.autoFill(training);
        }

        if (!plan.trainingIdsToDelete().isEmpty()) {
            final Set<Long> ids = Set.copyOf(plan.trainingIdsToDelete());
            final List<Training> toDelete = existing.stream().filter(t -> ids.contains(t.getId())).toList();
            deleteTrainingsCascade(toDelete);
        }

        return TrainingPeriodResponse.from(saved);
    }

    @Transactional
    public void delete(final Long periodId) {
        if (!periodRepository.existsById(periodId)) {
            throw new ResourceNotFoundException("TrainingPeriod", periodId);
        }
        final List<Training> trainings = trainingRepository.findByPeriodIdOrderByDateDesc(periodId);
        deleteTrainingsCascade(trainings);
        periodRepository.deleteById(periodId);
    }

    private void deleteTrainingsCascade(final List<Training> trainings) {
        final List<Long> trainingIds = trainings.stream().map(Training::getId).toList();
        if (!trainingIds.isEmpty()) {
            // Cascade: training_plans und attendance explizit löschen bevor Trainings gelöscht werden
            trainingPlanRepository.deleteByTrainingIds(trainingIds);
            attendanceRepository.deleteByTrainingIds(trainingIds);
        }
        trainingRepository.deleteAll(trainings);
    }
}
