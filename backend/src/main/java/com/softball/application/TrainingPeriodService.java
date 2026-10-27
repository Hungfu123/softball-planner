package com.softball.application;

import com.softball.adapter.dto.TrainingPeriodResponse;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingPeriod;
import com.softball.domain.service.PeriodRhythmSync;
import com.softball.domain.service.TrainingCycleEvaluator;
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
import java.util.Map;
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
                                          final String time, final Map<Integer, String> weekdayTimes,
                                          final String location,
                                          final Map<Integer, String> weekdayLocations,
                                          final Integer cycleWeeksParam,
                                          final List<Integer> activeWeeksInCycleParam,
                                          final List<Integer> pcOnlyWeekdays) {
        final List<Integer> pcOnly = pcOnlyWeekdays != null ? pcOnlyWeekdays : List.of();
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
        for (final Integer d : safeWeekdays) {
            final String t = weekdayTimes != null ? weekdayTimes.get(d) : null;
            if (t == null || !t.matches("^\\d{2}:\\d{2}$")) {
                throw new IllegalArgumentException("Für jeden Trainingstag muss eine Uhrzeit (HH:mm) gesetzt sein");
            }
        }
        final int cycleWeeks = cycleWeeksParam != null ? cycleWeeksParam : 1;
        if (cycleWeeks < 1) {
            throw new IllegalArgumentException("Zyklus-Länge muss mindestens 1 Woche betragen");
        }
        final List<Integer> activeWeeksInCycle = TrainingCycleEvaluator.normalize(activeWeeksInCycleParam);
        for (final Integer w : activeWeeksInCycle) {
            if (w == null || w < 1 || w > cycleWeeks) {
                throw new IllegalArgumentException("Aktive Woche im Zyklus muss zwischen 1 und " + cycleWeeks + " liegen");
            }
        }

        period.setName(name.trim());
        period.setStartDate(startDate);
        period.setEndDate(endDate);
        period.setWeekdays(safeWeekdays);
        period.setTime(time);
        period.setWeekdayTimes(weekdayTimes);
        period.setLocation(location);
        period.setWeekdayLocations(weekdayLocations);
        period.setCycleWeeks(cycleWeeks);
        period.setActiveWeeksInCycle(activeWeeksInCycle);
        period.setPcOnlyWeekdays(pcOnly);
        final TrainingPeriod saved = periodRepository.save(period);

        final LocalDate today = LocalDate.now();
        final List<Training> existing = trainingRepository.findByPeriodIdOrderByDateDesc(periodId);
        final PeriodRhythmSync.SyncPlan plan = rhythmSync.computeFuture(
            safeWeekdays, startDate, endDate, today, existing, cycleWeeks, activeWeeksInCycle);

        for (final LocalDate date : plan.datesToCreate()) {
            Training training = new Training(date, weekdayTimes.get(date.getDayOfWeek().getValue()),
                saved.ortFuer(date.getDayOfWeek().getValue()));
            training.setOpenToAll(saved.isOpenToAllOn(date.getDayOfWeek().getValue()));
            training.setPeriod(saved);
            training = trainingRepository.save(training);
            autoFiller.autoFill(training);
        }

        final Set<Long> idsToDelete = Set.copyOf(plan.trainingIdsToDelete());
        if (!idsToDelete.isEmpty()) {
            final List<Training> toDelete = existing.stream().filter(t -> idsToDelete.contains(t.getId())).toList();
            deleteTrainingsCascade(toDelete);
        }

        // Beibehaltene zukünftige Trainings: Zeit an die (evtl. geänderte) Wochentags-Zeit angleichen.
        for (final Training t : existing) {
            if (idsToDelete.contains(t.getId()) || t.getDate().isBefore(today)) {
                continue;
            }
            final String expected = weekdayTimes.get(t.getDate().getDayOfWeek().getValue());
            final boolean open = saved.isOpenToAllOn(t.getDate().getDayOfWeek().getValue());
            /*
             * Der Ort wandert mit, wie die Uhrzeit: wer den Montag in eine andere Halle legt,
             * meint die kuenftigen Montage, nicht nur die neu angelegten. Vergangene Termine
             * bleiben unangetastet — sie haben stattgefunden, wo sie stattgefunden haben.
             */
            final String ort = saved.ortFuer(t.getDate().getDayOfWeek().getValue());
            final boolean ortNeu = ort != null && !ort.equals(t.getLocation());
            if ((expected != null && !expected.equals(t.getTime())) || open != t.isOpenToAll() || ortNeu) {
                if (expected != null) t.setTime(expected);
                if (ortNeu) t.setLocation(ort);
                t.setOpenToAll(open);
                trainingRepository.save(t);
            }
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
