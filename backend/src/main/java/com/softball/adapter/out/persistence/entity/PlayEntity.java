package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "play")
public class PlayEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 160)
    private String title;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "game_state", nullable = false, length = 16)
    private String gameState;

    @Column(name = "game_state_note", length = 300)
    private String gameStateNote;

    @Column(name = "counterpart_play_id")
    private Long counterpartPlayId;

    @OneToMany(mappedBy = "play", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("ordinal ASC")
    private List<PlayStepEntity> steps = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        final LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(final String title) { this.title = title; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(final Long categoryId) { this.categoryId = categoryId; }

    public String getGameState() { return gameState; }
    public void setGameState(final String gameState) { this.gameState = gameState; }

    public String getGameStateNote() { return gameStateNote; }
    public void setGameStateNote(final String gameStateNote) { this.gameStateNote = gameStateNote; }

    public Long getCounterpartPlayId() { return counterpartPlayId; }
    public void setCounterpartPlayId(final Long counterpartPlayId) { this.counterpartPlayId = counterpartPlayId; }

    public List<PlayStepEntity> getSteps() { return steps; }
    public void setSteps(final List<PlayStepEntity> steps) { this.steps = steps; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(final LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
