package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "spielbogen_stealing_event")
public class SpielbogenStealingEventEntity {

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

    @Column(nullable = false)
    private String type;

    @Column(name = "from_base", nullable = false)
    private Integer fromBase;

    @Column(name = "to_base", nullable = false)
    private Integer toBase;

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
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Integer getFromBase() { return fromBase; }
    public void setFromBase(Integer fromBase) { this.fromBase = fromBase; }
    public Integer getToBase() { return toBase; }
    public void setToBase(Integer toBase) { this.toBase = toBase; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
