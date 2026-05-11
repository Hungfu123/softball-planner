package com.softball.domain.model;

import java.time.Instant;

public class Substitution {
    private Long id;
    private Game game;
    private Player playerOut;
    private Player playerIn;
    private Integer inning;
    private Instant createdAt;

    public Substitution() {}

    public Substitution(final Game game, final Player playerOut, final Player playerIn, final Integer inning) {
        this.game = game;
        this.playerOut = playerOut;
        this.playerIn = playerIn;
        this.inning = inning;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Game getGame() { return game; }
    public void setGame(final Game game) { this.game = game; }
    public Player getPlayerOut() { return playerOut; }
    public void setPlayerOut(final Player playerOut) { this.playerOut = playerOut; }
    public Player getPlayerIn() { return playerIn; }
    public void setPlayerIn(final Player playerIn) { this.playerIn = playerIn; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
