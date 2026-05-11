package com.softball.domain.model;

import java.time.Instant;

public class InningAdvanceEvent {
    private Long id;
    private Game game;
    private Integer toInning;
    private Integer opponentRuns;
    private Instant createdAt;
    private String createdBy;

    public InningAdvanceEvent() {}

    public InningAdvanceEvent(final Game game, final Integer toInning, final Integer opponentRuns, final String createdBy) {
        this.game = game;
        this.toInning = toInning;
        this.opponentRuns = opponentRuns;
        this.createdBy = createdBy;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Game getGame() { return game; }
    public void setGame(final Game game) { this.game = game; }
    public Integer getToInning() { return toInning; }
    public void setToInning(final Integer toInning) { this.toInning = toInning; }
    public Integer getOpponentRuns() { return opponentRuns; }
    public void setOpponentRuns(final Integer opponentRuns) { this.opponentRuns = opponentRuns; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }
}
