package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.Position;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "lineup_set_entry")
public class LineupSetEntryEntity {

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
    @Column(columnDefinition = "varchar(255)")
    private Position position;

    @Column(name = "batting_order", nullable = false)
    private Integer battingOrder;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dh_batter_player_id")
    private PlayerEntity dhBatterPlayer;

    public LineupSetEntryEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LineupSetEntity getLineupSet() { return lineupSet; }
    public void setLineupSet(final LineupSetEntity lineupSet) { this.lineupSet = lineupSet; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public PlayerEntity getPlayer() { return player; }
    public void setPlayer(final PlayerEntity player) { this.player = player; }
    public Position getPosition() { return position; }
    public void setPosition(final Position position) { this.position = position; }
    public Integer getBattingOrder() { return battingOrder; }
    public void setBattingOrder(final Integer battingOrder) { this.battingOrder = battingOrder; }
    public PlayerEntity getDhBatterPlayer() { return dhBatterPlayer; }
    public void setDhBatterPlayer(final PlayerEntity dhBatterPlayer) { this.dhBatterPlayer = dhBatterPlayer; }
}
