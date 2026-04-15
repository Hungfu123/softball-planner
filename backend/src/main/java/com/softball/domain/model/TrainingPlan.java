package com.softball.domain.model;

import java.time.LocalDateTime;

public class TrainingPlan {
    private Long id;
    private Long trainingId;
    private int playerCount;
    private String focus;
    private int durationMinutes;
    private String availablePositions;
    private TrainingPlanContent content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public TrainingPlan() {}

    public TrainingPlan(final Long trainingId, final int playerCount, final String focus,
                        final int durationMinutes, final String availablePositions) {
        this.trainingId = trainingId;
        this.playerCount = playerCount;
        this.focus = focus;
        this.durationMinutes = durationMinutes;
        this.availablePositions = availablePositions;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(final Long trainingId) { this.trainingId = trainingId; }
    public int getPlayerCount() { return playerCount; }
    public void setPlayerCount(final int playerCount) { this.playerCount = playerCount; }
    public String getFocus() { return focus; }
    public void setFocus(final String focus) { this.focus = focus; }
    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(final int durationMinutes) { this.durationMinutes = durationMinutes; }
    public String getAvailablePositions() { return availablePositions; }
    public void setAvailablePositions(final String availablePositions) { this.availablePositions = availablePositions; }
    public TrainingPlanContent getContent() { return content; }
    public void setContent(final TrainingPlanContent content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(final LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
