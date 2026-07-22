package com.softball.domain.model;

import java.time.Instant;

public class AutomaticOutEvent {
    private Long id;
    private Game game;
    private Integer inning;
    private Instant createdAt;
    private String createdBy;

    public AutomaticOutEvent() {}

    public AutomaticOutEvent(final Game game, final Integer inning, final String createdBy) {
        this.game = game;
        this.inning = inning;
        this.createdBy = createdBy;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Game getGame() { return game; }
    public void setGame(final Game game) { this.game = game; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }
}
