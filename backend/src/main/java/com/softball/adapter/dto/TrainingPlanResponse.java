package com.softball.adapter.dto;

import com.softball.domain.model.InfieldPosition;
import com.softball.domain.model.TrainingPlan;

import java.time.LocalDateTime;
import java.util.List;

public record TrainingPlanResponse(
        Long id, Long trainingId, int playerCount, String focus, int durationMinutes,
        TrainingPlanContentResponse content,
        LocalDateTime createdAt, LocalDateTime updatedAt,
        List<InfieldPosition> infieldPositions) {

    public static TrainingPlanResponse from(final TrainingPlan plan) {
        return new TrainingPlanResponse(
                plan.getId(), plan.getTrainingId(), plan.getPlayerCount(), plan.getFocus(),
                plan.getDurationMinutes(),
                TrainingPlanContentResponse.from(plan.getContent()),
                plan.getCreatedAt(), plan.getUpdatedAt(),
                plan.getInfieldPositions()
        );
    }
}
