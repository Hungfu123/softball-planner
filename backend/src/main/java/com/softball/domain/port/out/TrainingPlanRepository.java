package com.softball.domain.port.out;

import com.softball.domain.model.TrainingPlan;

import java.util.List;
import java.util.Optional;

public interface TrainingPlanRepository {
    TrainingPlan save(TrainingPlan plan);
    Optional<TrainingPlan> findById(Long id);
    Optional<TrainingPlan> findByTrainingId(Long trainingId);
    List<TrainingPlan> findByTrainingIdIn(List<Long> trainingIds);
    boolean existsByTrainingId(Long trainingId);
    void deleteById(Long id);
    void deleteByTrainingIds(List<Long> trainingIds);
}
