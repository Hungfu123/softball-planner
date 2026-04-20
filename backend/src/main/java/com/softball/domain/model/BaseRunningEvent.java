package com.softball.domain.model;

import java.time.Instant;

public class BaseRunningEvent {
    private Long id;
    private Game game;
    private Player runner;
    private Integer inning;
    private BaseRunningEventType type;
    private Instant createdAt;

    public BaseRunningEvent() {}

    public BaseRunningEvent(final Game game, final Player runner, final Integer inning,
                            final BaseRunningEventType type) {
        this.game = game;
        this.runner = runner;
        this.inning = inning;
        this.type = type;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Game getGame() { return game; }
    public void setGame(final Game game) { this.game = game; }
    public Player getRunner() { return runner; }
    public void setRunner(final Player runner) { this.runner = runner; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public BaseRunningEventType getType() { return type; }
    public void setType(final BaseRunningEventType type) { this.type = type; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
