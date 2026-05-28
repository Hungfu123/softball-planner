package com.softball.domain.port.out;

import com.softball.domain.model.PlanKind;
import com.softball.domain.model.TrainingPlan;

import java.util.List;
import java.util.Optional;

public interface TrainingPlanRepository {
    TrainingPlan save(TrainingPlan plan);
    Optional<TrainingPlan> findById(Long id);

    /** Liefert alle Pläne (MAIN und/oder BEGINNER) für ein Training (0-2 Einträge). */
    List<TrainingPlan> findAllByTrainingId(Long trainingId);

    /** Liefert den Plan für ein Training mit exakt diesem kind (typisch: MAIN oder BEGINNER). */
    Optional<TrainingPlan> findByTrainingIdAndKind(Long trainingId, PlanKind kind);

    List<TrainingPlan> findByTrainingIdIn(List<Long> trainingIds);
    void deleteById(Long id);
    void deleteByTrainingIds(List<Long> trainingIds);
}
