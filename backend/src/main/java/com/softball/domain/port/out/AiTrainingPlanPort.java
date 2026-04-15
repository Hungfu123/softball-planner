package com.softball.domain.port.out;

import com.softball.domain.model.TrainingPlan;
import com.softball.domain.model.TrainingPlanContent;
import com.softball.domain.model.TrainingPlanRequest;

public interface AiTrainingPlanPort {
    TrainingPlanContent generate(TrainingPlanRequest request);
    TrainingPlanContent refine(TrainingPlan existingPlan, String userEdits);
}
