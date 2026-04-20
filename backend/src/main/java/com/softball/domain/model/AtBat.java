package com.softball.domain.model;

import java.time.Instant;

public class AtBat {
    private Long id;
    private Game game;
    private Player batter;
    private Integer sequence;
    private Integer inning;
    private AtBatResult result;
    private BaseState baseStateAfter;
    private Integer runsScored;
    private Integer rbi;
    private Instant createdAt;
    private String createdBy;

    public AtBat() {}

    public AtBat(final Game game, final Player batter, final Integer sequence, final Integer inning,
                 final AtBatResult result, final BaseState baseStateAfter,
                 final Integer runsScored, final Integer rbi, final String createdBy) {
        this.game = game;
        this.batter = batter;
        this.sequence = sequence;
        this.inning = inning;
        this.result = result;
        this.baseStateAfter = baseStateAfter;
        this.runsScored = runsScored;
        this.rbi = rbi;
        this.createdBy = createdBy;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Game getGame() { return game; }
    public void setGame(final Game game) { this.game = game; }
    public Player getBatter() { return batter; }
    public void setBatter(final Player batter) { this.batter = batter; }
    public Integer getSequence() { return sequence; }
    public void setSequence(final Integer sequence) { this.sequence = sequence; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public AtBatResult getResult() { return result; }
    public void setResult(final AtBatResult result) { this.result = result; }
    public BaseState getBaseStateAfter() { return baseStateAfter; }
    public void setBaseStateAfter(final BaseState baseStateAfter) { this.baseStateAfter = baseStateAfter; }
    public Integer getRunsScored() { return runsScored; }
    public void setRunsScored(final Integer runsScored) { this.runsScored = runsScored; }
    public Integer getRbi() { return rbi; }
    public void setRbi(final Integer rbi) { this.rbi = rbi; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }
}
