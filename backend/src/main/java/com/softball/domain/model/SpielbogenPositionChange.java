package com.softball.domain.model;

import java.time.Instant;

public class SpielbogenPositionChange {
    private Long id;
    private Spielbogen bogen;
    private SpielbogenSlot slot;
    private BogenSide side;
    private Integer inning;
    private String groupId;
    private String oldPosition;
    private String newPosition;
    private Instant createdAt;

    public SpielbogenPositionChange() {}

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
    public String getGroupId() { return groupId; }
    public void setGroupId(final String groupId) { this.groupId = groupId; }
    public String getOldPosition() { return oldPosition; }
    public void setOldPosition(final String oldPosition) { this.oldPosition = oldPosition; }
    public String getNewPosition() { return newPosition; }
    public void setNewPosition(final String newPosition) { this.newPosition = newPosition; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
}
