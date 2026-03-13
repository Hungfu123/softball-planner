package com.softball.domain.model;

public class LineupEntry {
    private Long id;
    private Game game;
    private Player player;
    private Position position;
    private Integer battingOrder;
    private Player dhBatterPlayer;

    public LineupEntry() {}

    public LineupEntry(final Game game, final Player player, final Position position, final Integer battingOrder) {
        this.game = game;
        this.player = player;
        this.position = position;
        this.battingOrder = battingOrder;
    }

    public LineupEntry(final Game game, final Player player, final Position position, final Integer battingOrder, final Player dhBatterPlayer) {
        this(game, player, position, battingOrder);
        this.dhBatterPlayer = dhBatterPlayer;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Game getGame() { return game; }
    public void setGame(final Game game) { this.game = game; }
    public Player getPlayer() { return player; }
    public void setPlayer(final Player player) { this.player = player; }
    public Position getPosition() { return position; }
    public void setPosition(final Position position) { this.position = position; }
    public Integer getBattingOrder() { return battingOrder; }
    public void setBattingOrder(final Integer battingOrder) { this.battingOrder = battingOrder; }
    public Player getDhBatterPlayer() { return dhBatterPlayer; }
    public void setDhBatterPlayer(final Player dhBatterPlayer) { this.dhBatterPlayer = dhBatterPlayer; }
}
