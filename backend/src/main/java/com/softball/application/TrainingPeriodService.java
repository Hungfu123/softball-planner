package com.softball.application;

import com.softball.adapter.dto.TrainingPeriodResponse;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingPeriod;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingPeriodRepository;
import com.softball.domain.port.out.TrainingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class TrainingPeriodService {

    private final TrainingPeriodRepository periodRepository;
    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;

    public TrainingPeriodService(final TrainingPeriodRepository periodRepository,
                                  final TrainingRepository trainingRepository,
                                  final TrainingAttendanceRepository attendanceRepository) {
        this.periodRepository = periodRepository;
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
    }

    @Transactional(readOnly = true)
    public List<TrainingPeriodResponse> findAll() {
        return periodRepository.findAllByOrderByStartDateDesc().stream()
            .map(TrainingPeriodResponse::from)
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
    public TrainingPeriodResponse rename(final Long periodId, final String name) {
        final TrainingPeriod period = periodRepository.findById(periodId)
            .orElseThrow(() -> new ResourceNotFoundException("TrainingPeriod", periodId));
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name darf nicht leer sein");
        }
        period.setName(name.trim());
        return TrainingPeriodResponse.from(periodRepository.save(period));
    }

    @Transactional
    public void delete(final Long periodId) {
        if (!periodRepository.existsById(periodId)) {
            throw new ResourceNotFoundException("TrainingPeriod", periodId);
        }
        final List<Training> trainings = trainingRepository.findByPeriodIdOrderByDateDesc(periodId);
        final List<Long> trainingIds = trainings.stream().map(Training::getId).toList();
        if (!trainingIds.isEmpty()) {
            attendanceRepository.deleteByTrainingIds(trainingIds);
        }
        trainingRepository.deleteAll(trainings);
        periodRepository.deleteById(periodId);
    }
}
