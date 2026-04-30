package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "spielbogen_slot",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"bogen_id", "side", "slot"}),
           @UniqueConstraint(columnNames = {"bogen_id", "side", "batting_order"})
       })
public class SpielbogenSlotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bogen_id", nullable = false)
    private SpielbogenEntity bogen;

    @Column(nullable = false)
    private String side;

    @Column(nullable = false)
    private Integer slot;

    @Column(nullable = false)
    private String name;

    @Column
    private String position;

    @Column(name = "batting_order", nullable = false)
    private Integer battingOrder;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SpielbogenEntity getBogen() { return bogen; }
    public void setBogen(SpielbogenEntity bogen) { this.bogen = bogen; }
    public String getSide() { return side; }
    public void setSide(String side) { this.side = side; }
    public Integer getSlot() { return slot; }
    public void setSlot(Integer slot) { this.slot = slot; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }
    public Integer getBattingOrder() { return battingOrder; }
    public void setBattingOrder(Integer battingOrder) { this.battingOrder = battingOrder; }
}
