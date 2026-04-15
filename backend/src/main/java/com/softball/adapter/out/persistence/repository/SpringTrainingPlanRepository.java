package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.TrainingPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpringTrainingPlanRepository extends JpaRepository<TrainingPlanEntity, Long> {
    Optional<TrainingPlanEntity> findByTrainingId(Long trainingId);
    List<TrainingPlanEntity> findByTrainingIdIn(List<Long> trainingIds);
    boolean existsByTrainingId(Long trainingId);
    void deleteByTrainingIdIn(List<Long> trainingIds);
}
