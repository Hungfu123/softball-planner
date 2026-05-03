package com.softball.domain.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

public class TrainingPlan {
    private Long id;
    private Long trainingId;
    private int playerCount;
    private String focus;
    private int durationMinutes;
    private TrainingPlanContent content;
    private List<InfieldPosition> infieldPositions = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public TrainingPlan() {}

    public TrainingPlan(final Long trainingId, final int playerCount, final String focus,
                        final int durationMinutes) {
        this.trainingId = trainingId;
        this.playerCount = playerCount;
        this.focus = focus;
        this.durationMinutes = durationMinutes;
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
    public TrainingPlanContent getContent() { return content; }
    public void setContent(final TrainingPlanContent content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(final LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<InfieldPosition> getInfieldPositions() { return infieldPositions; }
    public void setInfieldPositions(final List<InfieldPosition> infieldPositions) { this.infieldPositions = infieldPositions; }
}
