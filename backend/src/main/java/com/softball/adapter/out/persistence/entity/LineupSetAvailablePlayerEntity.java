package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "lineup_set_available_player")
public class LineupSetAvailablePlayerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lineup_set_id", nullable = false)
    @JsonIgnore
    private LineupSetEntity lineupSet;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_id", nullable = false)
    private PlayerEntity player;

    public LineupSetAvailablePlayerEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LineupSetEntity getLineupSet() { return lineupSet; }
    public void setLineupSet(final LineupSetEntity lineupSet) { this.lineupSet = lineupSet; }
    public PlayerEntity getPlayer() { return player; }
    public void setPlayer(final PlayerEntity player) { this.player = player; }
}
