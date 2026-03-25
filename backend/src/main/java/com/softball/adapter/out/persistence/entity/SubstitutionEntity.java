package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Entity
@Table(name = "substitutions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"game_id", "player_out_id", "inning"})
})
public class SubstitutionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    @JsonIgnore
    private GameEntity game;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_out_id", nullable = false)
    private PlayerEntity playerOut;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_in_id", nullable = false)
    private PlayerEntity playerIn;

    @Min(1) @Max(6)
    @Column(nullable = false)
    private Integer inning;

    public SubstitutionEntity() {}

    public SubstitutionEntity(final GameEntity game, final PlayerEntity playerOut, final PlayerEntity playerIn, final Integer inning) {
        this.game = game;
        this.playerOut = playerOut;
        this.playerIn = playerIn;
        this.inning = inning;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameEntity getGame() { return game; }
    public void setGame(final GameEntity game) { this.game = game; }
    public PlayerEntity getPlayerOut() { return playerOut; }
    public void setPlayerOut(final PlayerEntity playerOut) { this.playerOut = playerOut; }
    public PlayerEntity getPlayerIn() { return playerIn; }
    public void setPlayerIn(final PlayerEntity playerIn) { this.playerIn = playerIn; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
}
