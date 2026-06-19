package com.softball.application;

import com.softball.adapter.dto.TrainingResponse;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingPeriod;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.TrainingPeriodRepository;
import com.softball.domain.port.out.TrainingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TrainingService {

    private final TrainingRepository trainingRepository;
    private final TrainingPeriodRepository periodRepository;
    private final RegularPlayerAutoFiller autoFiller;

    public TrainingService(final TrainingRepository trainingRepository,
                           final TrainingPeriodRepository periodRepository,
                           final RegularPlayerAutoFiller autoFiller) {
        this.trainingRepository = trainingRepository;
        this.periodRepository = periodRepository;
        this.autoFiller = autoFiller;
    }

    @Transactional(readOnly = true)
    public List<TrainingResponse> findAll(final Long periodId) {
        final List<Training> trainings = periodId != null
            ? trainingRepository.findByPeriodIdOrderByDateDesc(periodId)
            : trainingRepository.findAllByOrderByDateDesc();
        return trainings.stream()
            .map(TrainingResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public Training findById(final Long id) {
        return trainingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Training", id));
    }

    @Transactional
    public TrainingResponse create(final LocalDate date, final String time, final String location, final String type) {
        final var existing = trainingRepository.findByDate(date);
        if (existing.isPresent()) {
            final Training training = existing.get();
            training.setTime(time);
            training.setLocation(location);
            if (type != null) {
                training.setType(type);
            }
            return TrainingResponse.from(trainingRepository.save(training));
        }

        Training training = new Training(date, time, location);
        if (type != null) {
            training.setType(type);
        }
        training = trainingRepository.save(training);
        autoFiller.autoFill(training);
        return TrainingResponse.from(training);
    }

    @Transactional
    public List<TrainingResponse> createBulk(final List<Integer> weekdays, final LocalDate startDate,
                                              final LocalDate endDate, final String time,
                                              final String location, final String periodName,
                                              final String type) {
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Startdatum darf nicht nach dem Enddatum liegen");
        }

        final Set<DayOfWeek> targetDays = weekdays.stream()
            .peek(d -> {
                if (d < 1 || d > 7) {
                    throw new IllegalArgumentException("Wochentag muss zwischen 1 (Montag) und 7 (Sonntag) liegen");
                }
            })
            .map(DayOfWeek::of)
            .collect(Collectors.toSet());

        TrainingPeriod period = null;
        if (periodName != null && !periodName.isBlank()) {
            period = periodRepository.findByNameIgnoreCase(periodName.trim())
                .orElseGet(() -> periodRepository.save(new TrainingPeriod(periodName.trim(), startDate, endDate)));
            period.setWeekdays(new java.util.ArrayList<>(weekdays));
            period.setTime(time);
            period.setLocation(location);
            period = periodRepository.save(period);
        }

        final List<LocalDate> candidateDates = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            if (targetDays.contains(date.getDayOfWeek())) {
                candidateDates.add(date);
            }
        }

        final Map<LocalDate, Training> existingByDate = trainingRepository
            .findByDateIn(Set.copyOf(candidateDates)).stream()
            .collect(Collectors.toMap(Training::getDate, t -> t));

        final List<TrainingResponse> results = new ArrayList<>();
        for (final LocalDate d : candidateDates) {
            final Training existing = existingByDate.get(d);
            if (existing != null) {
                if (time != null) existing.setTime(time);
                if (location != null) existing.setLocation(location);
                if (type != null) existing.setType(type);
                if (period != null) existing.setPeriod(period);
                results.add(TrainingResponse.from(trainingRepository.save(existing)));
            } else {
                Training training = new Training(d, time, location);
                if (type != null) training.setType(type);
                training.setPeriod(period);
                training = trainingRepository.save(training);
                autoFiller.autoFill(training);
                results.add(TrainingResponse.from(training));
            }
        }

        return results;
    }

    @Transactional
    public TrainingResponse update(final Long id, final LocalDate date, final String time,
                                   final String location, final Boolean cancelled, final String type) {
        final Training training = findById(id);
        if (date != null) {
            training.setDate(date);
        }
        training.setTime(time);
        training.setLocation(location);
        if (cancelled != null) {
            training.setCancelled(cancelled);
        }
        if (type != null) {
            training.setType(type);
        }
        return TrainingResponse.from(trainingRepository.save(training));
    }

    @Transactional
    public void delete(final Long id) {
        if (!trainingRepository.existsById(id)) {
            throw new ResourceNotFoundException("Training", id);
        }
        trainingRepository.deleteById(id);
    }
}
