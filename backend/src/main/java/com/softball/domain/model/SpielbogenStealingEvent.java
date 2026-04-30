package com.softball.domain.model;

import java.time.Instant;

public class SpielbogenStealingEvent {
    private Long id;
    private Spielbogen bogen;
    private SpielbogenSlot slot;
    private BogenSide side;
    private Integer inning;
    private StealingEventType type;
    private Integer fromBase;
    private Integer toBase;
    private Instant createdAt;

    public SpielbogenStealingEvent() {}

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
    public StealingEventType getType() { return type; }
    public void setType(final StealingEventType type) { this.type = type; }
    public Integer getFromBase() { return fromBase; }
    public void setFromBase(final Integer fromBase) { this.fromBase = fromBase; }
    public Integer getToBase() { return toBase; }
    public void setToBase(final Integer toBase) { this.toBase = toBase; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
