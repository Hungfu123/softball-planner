package com.softball.domain.model;

public class LineupSetEntry {
    private Long id;
    private Integer gameNumber;
    private Player player;
    private Position position;
    private Integer battingOrder;
    private Player dhBatterPlayer;

    public LineupSetEntry() {}

    public LineupSetEntry(final Integer gameNumber, final Player player, final Position position,
                          final Integer battingOrder, final Player dhBatterPlayer) {
        this.gameNumber = gameNumber;
        this.player = player;
        this.position = position;
        this.battingOrder = battingOrder;
        this.dhBatterPlayer = dhBatterPlayer;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public Player getPlayer() { return player; }
    public void setPlayer(final Player player) { this.player = player; }
    public Position getPosition() { return position; }
    public void setPosition(final Position position) { this.position = position; }
    public Integer getBattingOrder() { return battingOrder; }
    public void setBattingOrder(final Integer battingOrder) { this.battingOrder = battingOrder; }
    public Player getDhBatterPlayer() { return dhBatterPlayer; }
    public void setDhBatterPlayer(final Player dhBatterPlayer) { this.dhBatterPlayer = dhBatterPlayer; }
}
