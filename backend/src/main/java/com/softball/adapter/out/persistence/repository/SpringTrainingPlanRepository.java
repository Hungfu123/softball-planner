package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.TrainingPlanEntity;
import com.softball.domain.model.PlanKind;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpringTrainingPlanRepository extends JpaRepository<TrainingPlanEntity, Long> {
    List<TrainingPlanEntity> findAllByTrainingId(Long trainingId);
    Optional<TrainingPlanEntity> findByTrainingIdAndKind(Long trainingId, PlanKind kind);
    List<TrainingPlanEntity> findByTrainingIdIn(List<Long> trainingIds);
    void deleteByTrainingIdIn(List<Long> trainingIds);
}
