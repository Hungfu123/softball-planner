package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.StaffRole;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "lineup_set_staff")
public class LineupSetStaffEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lineup_set_id", nullable = false)
    @JsonIgnore
    private LineupSetEntity lineupSet;

    @Column(name = "game_number", nullable = false)
    private Integer gameNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_id", nullable = false)
    private PlayerEntity player;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 32)
    private StaffRole role;

    public LineupSetStaffEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LineupSetEntity getLineupSet() { return lineupSet; }
    public void setLineupSet(final LineupSetEntity lineupSet) { this.lineupSet = lineupSet; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public PlayerEntity getPlayer() { return player; }
    public void setPlayer(final PlayerEntity player) { this.player = player; }
    public StaffRole getRole() { return role; }
    public void setRole(final StaffRole role) { this.role = role; }
}
