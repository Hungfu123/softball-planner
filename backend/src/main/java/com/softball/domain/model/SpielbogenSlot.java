package com.softball.domain.model;

public class SpielbogenSlot {
    private Long id;
    private Spielbogen bogen;
    private BogenSide side;
    private Integer slot;
    private String name;
    private String position;
    private Integer battingOrder;

    public SpielbogenSlot() {}

    public SpielbogenSlot(final Spielbogen bogen, final BogenSide side,
                          final Integer slot, final String name,
                          final String position, final Integer battingOrder) {
        this.bogen = bogen;
        this.side = side;
        this.slot = slot;
        this.name = name;
        this.position = position;
        this.battingOrder = battingOrder;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Spielbogen getBogen() { return bogen; }
    public void setBogen(final Spielbogen bogen) { this.bogen = bogen; }
    public BogenSide getSide() { return side; }
    public void setSide(final BogenSide side) { this.side = side; }
    public Integer getSlot() { return slot; }
    public void setSlot(final Integer slot) { this.slot = slot; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public String getPosition() { return position; }
    public void setPosition(final String position) { this.position = position; }
    public Integer getBattingOrder() { return battingOrder; }
    public void setBattingOrder(final Integer battingOrder) { this.battingOrder = battingOrder; }
}
