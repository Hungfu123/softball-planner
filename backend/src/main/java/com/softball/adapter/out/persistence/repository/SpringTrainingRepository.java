package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.TrainingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface SpringTrainingRepository extends JpaRepository<TrainingEntity, Long> {
    List<TrainingEntity> findAllByOrderByDateDesc();
    long countByCancelledFalse();
    List<TrainingEntity> findByDateIn(Set<LocalDate> dates);
    List<TrainingEntity> findByPeriodIdOrderByDateDesc(Long periodId);
    boolean existsByDate(LocalDate date);
    Optional<TrainingEntity> findByDate(LocalDate date);
}
