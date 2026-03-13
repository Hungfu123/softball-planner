package com.softball.domain.port.out;

import com.softball.domain.model.Training;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface TrainingRepository {
    List<Training> findAllByOrderByDateDesc();
    Optional<Training> findById(Long id);
    Training save(Training training);
    List<Training> saveAll(List<Training> trainings);
    void deleteById(Long id);
    long countByCancelledFalse();
    List<Training> findByDateIn(Set<LocalDate> dates);
    List<Training> findByPeriodIdOrderByDateDesc(Long periodId);
    boolean existsByDate(LocalDate date);
    boolean existsById(Long id);
    Optional<Training> findByDate(LocalDate date);
    void flush();
    void deleteAll(List<Training> trainings);
}
