package com.softball.domain.model;

import java.time.Instant;

public class SpielbogenSubstitution {
    private Long id;
    private Spielbogen bogen;
    private SpielbogenSlot slot;
    private BogenSide side;
    private Integer inning;
    private String playerOutName;
    private String playerInName;
    private Boolean isPinchHitter;
    private Instant createdAt;

    public SpielbogenSubstitution() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Spielbogen getBogen() { return bogen; }
    public void setBogen(final Spielbogen bogen) { this.bogen = bogen; }
    public SpielbogenSlot getSlot() { return slot; }
    public void setSlot(final SpielbogenSlot slot) { this.slot = slot; }
    public BogenSide getSide() { return side; }
    public void setSide(final BogenSide side) { this.side = side; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public String getPlayerOutName() { return playerOutName; }
    public void setPlayerOutName(final String playerOutName) { this.playerOutName = playerOutName; }
    public String getPlayerInName() { return playerInName; }
    public void setPlayerInName(final String playerInName) { this.playerInName = playerInName; }
    public Boolean getIsPinchHitter() { return isPinchHitter; }
    public void setIsPinchHitter(final Boolean isPinchHitter) { this.isPinchHitter = isPinchHitter; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
