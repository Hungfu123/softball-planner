package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.StaffRole;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "game_staff", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"game_id", "role"}),
    @UniqueConstraint(columnNames = {"game_id", "player_id"})
})
public class GameStaffEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    @JsonIgnore
    private GameEntity game;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_id", nullable = false)
    private PlayerEntity player;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StaffRole role;

    public GameStaffEntity() {}

    public GameStaffEntity(final GameEntity game, final PlayerEntity player, final StaffRole role) {
        this.game = game;
        this.player = player;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameEntity getGame() { return game; }
    public void setGame(final GameEntity game) { this.game = game; }
    public PlayerEntity getPlayer() { return player; }
    public void setPlayer(final PlayerEntity player) { this.player = player; }
    public StaffRole getRole() { return role; }
    public void setRole(final StaffRole role) { this.role = role; }
}
