package com.softball.domain.model;

public class LineupSetStaffEntry {
    private Long id;
    private Integer gameNumber;
    private Player player;
    private StaffRole role;

    public LineupSetStaffEntry() {}

    public LineupSetStaffEntry(final Integer gameNumber, final Player player, final StaffRole role) {
        this.gameNumber = gameNumber;
        this.player = player;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public Player getPlayer() { return player; }
    public void setPlayer(final Player player) { this.player = player; }
    public StaffRole getRole() { return role; }
    public void setRole(final StaffRole role) { this.role = role; }
}
