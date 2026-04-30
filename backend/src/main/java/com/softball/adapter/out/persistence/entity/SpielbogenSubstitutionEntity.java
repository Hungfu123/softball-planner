package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "spielbogen_substitution")
public class SpielbogenSubstitutionEntity {

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

    @Column(name = "player_out_name", nullable = false)
    private String playerOutName;

    @Column(name = "player_in_name", nullable = false)
    private String playerInName;

    @Column(name = "is_pinch_hitter", nullable = false)
    private Boolean isPinchHitter = Boolean.FALSE;

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
    public String getPlayerOutName() { return playerOutName; }
    public void setPlayerOutName(String playerOutName) { this.playerOutName = playerOutName; }
    public String getPlayerInName() { return playerInName; }
    public void setPlayerInName(String playerInName) { this.playerInName = playerInName; }
    public Boolean getIsPinchHitter() { return isPinchHitter; }
    public void setIsPinchHitter(Boolean isPinchHitter) { this.isPinchHitter = isPinchHitter; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
