package com.softball.domain.port.out;

import com.softball.domain.model.TrainingPeriod;
import java.util.List;
import java.util.Optional;

public interface TrainingPeriodRepository {
    List<TrainingPeriod> findAllByOrderByStartDateDesc();
    Optional<TrainingPeriod> findById(Long id);
    Optional<TrainingPeriod> findByNameIgnoreCase(String name);
    TrainingPeriod save(TrainingPeriod period);
    void deleteById(Long id);
    boolean existsById(Long id);
}
