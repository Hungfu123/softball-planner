package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.Position;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Entity
@Table(name = "lineup_entries", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"game_id", "batting_order"}),
    @UniqueConstraint(columnNames = {"game_id", "player_id"})
})
public class LineupEntryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    @JsonIgnore
    private GameEntity game;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private PlayerEntity player;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(255)")
    private Position position;

    @Min(1) @Max(10)
    @Column(name = "batting_order", nullable = false)
    private Integer battingOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dh_batter_player_id")
    private PlayerEntity dhBatterPlayer;

    public LineupEntryEntity() {}

    public LineupEntryEntity(final GameEntity game, final PlayerEntity player, final Position position, final Integer battingOrder) {
        this.game = game;
        this.player = player;
        this.position = position;
        this.battingOrder = battingOrder;
    }

    public LineupEntryEntity(final GameEntity game, final PlayerEntity player, final Position position, final Integer battingOrder, final PlayerEntity dhBatterPlayer) {
        this(game, player, position, battingOrder);
        this.dhBatterPlayer = dhBatterPlayer;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameEntity getGame() { return game; }
    public void setGame(final GameEntity game) { this.game = game; }
    public PlayerEntity getPlayer() { return player; }
    public void setPlayer(final PlayerEntity player) { this.player = player; }
    public Position getPosition() { return position; }
    public void setPosition(final Position position) { this.position = position; }
    public Integer getBattingOrder() { return battingOrder; }
    public void setBattingOrder(final Integer battingOrder) { this.battingOrder = battingOrder; }
    public PlayerEntity getDhBatterPlayer() { return dhBatterPlayer; }
    public void setDhBatterPlayer(final PlayerEntity dhBatterPlayer) { this.dhBatterPlayer = dhBatterPlayer; }
}
