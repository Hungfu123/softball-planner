package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.softball.domain.model.BaseRunningEventType;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "base_running_events")
public class BaseRunningEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    @JsonIgnore
    private GameEntity game;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "runner_player_id", nullable = false)
    private PlayerEntity runner;

    @Column(nullable = false)
    private Integer inning;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(32)")
    private BaseRunningEventType type;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public BaseRunningEventEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameEntity getGame() { return game; }
    public void setGame(final GameEntity game) { this.game = game; }
    public PlayerEntity getRunner() { return runner; }
    public void setRunner(final PlayerEntity runner) { this.runner = runner; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public BaseRunningEventType getType() { return type; }
    public void setType(final BaseRunningEventType type) { this.type = type; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
