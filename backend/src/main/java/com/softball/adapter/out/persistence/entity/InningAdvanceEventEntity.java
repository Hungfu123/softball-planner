package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "inning_advance_events")
public class InningAdvanceEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    @JsonIgnore
    private GameEntity game;

    @Column(name = "to_inning", nullable = false)
    private Integer toInning;

    @Column(name = "opponent_runs", nullable = false)
    private Integer opponentRuns;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", nullable = false, length = 64)
    private String createdBy;

    public InningAdvanceEventEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameEntity getGame() { return game; }
    public void setGame(final GameEntity game) { this.game = game; }
    public Integer getToInning() { return toInning; }
    public void setToInning(final Integer toInning) { this.toInning = toInning; }
    public Integer getOpponentRuns() { return opponentRuns; }
    public void setOpponentRuns(final Integer opponentRuns) { this.opponentRuns = opponentRuns; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
