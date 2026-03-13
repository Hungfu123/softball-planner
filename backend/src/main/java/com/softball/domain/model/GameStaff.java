package com.softball.domain.model;

public class GameStaff {
    private Long id;
    private Game game;
    private Player player;
    private StaffRole role;

    public GameStaff() {}

    public GameStaff(final Game game, final Player player, final StaffRole role) {
        this.game = game;
        this.player = player;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Game getGame() { return game; }
    public void setGame(final Game game) { this.game = game; }
    public Player getPlayer() { return player; }
    public void setPlayer(final Player player) { this.player = player; }
    public StaffRole getRole() { return role; }
    public void setRole(final StaffRole role) { this.role = role; }
}
