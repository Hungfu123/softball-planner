package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.softball.domain.model.AtBatResult;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "at_bats", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"game_id", "sequence"})
})
public class AtBatEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    @JsonIgnore
    private GameEntity game;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batter_player_id", nullable = false)
    private PlayerEntity batter;

    @Column(nullable = false)
    private Integer sequence;

    @Column(nullable = false)
    private Integer inning;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(32)")
    private AtBatResult result;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "runner_first_id")
    private PlayerEntity runnerFirst;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "runner_second_id")
    private PlayerEntity runnerSecond;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "runner_third_id")
    private PlayerEntity runnerThird;

    @Column(name = "runs_scored", nullable = false)
    private Integer runsScored = 0;

    @Column(nullable = false)
    private Integer rbi = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", nullable = false, length = 64)
    private String createdBy;

    public AtBatEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameEntity getGame() { return game; }
    public void setGame(final GameEntity game) { this.game = game; }
    public PlayerEntity getBatter() { return batter; }
    public void setBatter(final PlayerEntity batter) { this.batter = batter; }
    public Integer getSequence() { return sequence; }
    public void setSequence(final Integer sequence) { this.sequence = sequence; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public AtBatResult getResult() { return result; }
    public void setResult(final AtBatResult result) { this.result = result; }
    public PlayerEntity getRunnerFirst() { return runnerFirst; }
    public void setRunnerFirst(final PlayerEntity runnerFirst) { this.runnerFirst = runnerFirst; }
    public PlayerEntity getRunnerSecond() { return runnerSecond; }
    public void setRunnerSecond(final PlayerEntity runnerSecond) { this.runnerSecond = runnerSecond; }
    public PlayerEntity getRunnerThird() { return runnerThird; }
    public void setRunnerThird(final PlayerEntity runnerThird) { this.runnerThird = runnerThird; }
    public Integer getRunsScored() { return runsScored; }
    public void setRunsScored(final Integer runsScored) { this.runsScored = runsScored; }
    public Integer getRbi() { return rbi; }
    public void setRbi(final Integer rbi) { this.rbi = rbi; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
