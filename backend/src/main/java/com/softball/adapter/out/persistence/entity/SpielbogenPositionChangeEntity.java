package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "spielbogen_position_change")
public class SpielbogenPositionChangeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bogen_id", nullable = false)
    private SpielbogenEntity bogen;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slot_id", nullable = false)
    private SpielbogenSlotEntity slot;

    @Column(nullable = false)
    private String side;

    @Column(nullable = false)
    private Integer inning;

    @Column(name = "group_id", nullable = false)
    private String groupId;

    @Column(name = "old_position")
    private String oldPosition;

    @Column(name = "new_position")
    private String newPosition;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() { if (createdAt == null) createdAt = Instant.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SpielbogenEntity getBogen() { return bogen; }
    public void setBogen(SpielbogenEntity bogen) { this.bogen = bogen; }
    public SpielbogenSlotEntity getSlot() { return slot; }
    public void setSlot(SpielbogenSlotEntity slot) { this.slot = slot; }
    public String getSide() { return side; }
    public void setSide(String side) { this.side = side; }
    public Integer getInning() { return inning; }
    public void setInning(Integer inning) { this.inning = inning; }
    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
    public String getOldPosition() { return oldPosition; }
    public void setOldPosition(String oldPosition) { this.oldPosition = oldPosition; }
    public String getNewPosition() { return newPosition; }
    public void setNewPosition(String newPosition) { this.newPosition = newPosition; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
