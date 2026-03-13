package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.TrainingPeriodEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SpringTrainingPeriodRepository extends JpaRepository<TrainingPeriodEntity, Long> {
    List<TrainingPeriodEntity> findAllByOrderByStartDateDesc();
    Optional<TrainingPeriodEntity> findByNameIgnoreCase(String name);
}
