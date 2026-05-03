package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "training_plans")
public class TrainingPlanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "training_id", nullable = false, unique = true)
    private Long trainingId;

    @NotNull
    @Column(name = "player_count", nullable = false)
    private int playerCount;

    @NotNull
    @Column(nullable = false, length = 50)
    private String focus;

    @NotNull
    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "plan_content", columnDefinition = "jsonb", nullable = false)
    private String planContent;

    @Column(name = "infield_positions", length = 100)
    private String infieldPositions;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public TrainingPlanEntity() {}

    @PrePersist
    void prePersist() {
        final LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
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
    public String getPlanContent() { return planContent; }
    public void setPlanContent(final String planContent) { this.planContent = planContent; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(final LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getInfieldPositions() { return infieldPositions; }
    public void setInfieldPositions(final String infieldPositions) { this.infieldPositions = infieldPositions; }
}
