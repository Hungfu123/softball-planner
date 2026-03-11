package com.softball.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Entity
@Table(name = "lineup_entries", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"game_id", "batting_order"}),
    @UniqueConstraint(columnNames = {"game_id", "player_id"})
})
public class LineupEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    @JsonIgnore
    private Game game;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(255)")
    private Position position;

    @Min(1) @Max(10)
    @Column(name = "batting_order", nullable = false)
    private Integer battingOrder;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dh_batter_player_id")
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
