package com.softball.domain.model;

import java.time.Instant;

public class SpielbogenRunnerAdvance {
    private Long id;
    private Spielbogen bogen;
    private SpielbogenAtBat atBat;
    private SpielbogenSlot slot;
    private BogenSide side;
    private Integer inning;
    private Integer fromBase;
    private Integer toBase;
    private RunnerAdvanceReason reason;
    private Instant createdAt;

    public SpielbogenRunnerAdvance() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Spielbogen getBogen() { return bogen; }
    public void setBogen(final Spielbogen bogen) { this.bogen = bogen; }
    public SpielbogenAtBat getAtBat() { return atBat; }
    public void setAtBat(final SpielbogenAtBat atBat) { this.atBat = atBat; }
    public SpielbogenSlot getSlot() { return slot; }
    public void setSlot(final SpielbogenSlot slot) { this.slot = slot; }
    public BogenSide getSide() { return side; }
    public void setSide(final BogenSide side) { this.side = side; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public Integer getFromBase() { return fromBase; }
    public void setFromBase(final Integer fromBase) { this.fromBase = fromBase; }
    public Integer getToBase() { return toBase; }
    public void setToBase(final Integer toBase) { this.toBase = toBase; }
    public RunnerAdvanceReason getReason() { return reason; }
    public void setReason(final RunnerAdvanceReason reason) { this.reason = reason; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
