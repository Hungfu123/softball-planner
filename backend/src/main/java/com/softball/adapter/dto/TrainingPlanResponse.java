package com.softball.adapter.dto;

import com.softball.domain.model.TrainingPlan;

import java.time.LocalDateTime;

public record TrainingPlanResponse(
        Long id, Long trainingId, int playerCount, String focus, int durationMinutes,
        TrainingPlanContentResponse content,
        LocalDateTime createdAt, LocalDateTime updatedAt) {

    public static TrainingPlanResponse from(final TrainingPlan plan) {
        return new TrainingPlanResponse(
                plan.getId(), plan.getTrainingId(), plan.getPlayerCount(), plan.getFocus(),
                plan.getDurationMinutes(),
                TrainingPlanContentResponse.from(plan.getContent()),
                plan.getCreatedAt(), plan.getUpdatedAt()
        );
    }
}
