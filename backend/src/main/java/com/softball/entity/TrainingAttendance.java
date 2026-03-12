package com.softball.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "training_attendance", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"training_id", "player_id"})
})
public class TrainingAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_id", nullable = false)
    @NotNull
    private Training training;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_id", nullable = false)
    @NotNull
    private Player player;

    @Column(nullable = false)
    private boolean present;

    public TrainingAttendance() {}

    public TrainingAttendance(final Training training, final Player player, final boolean present) {
        this.training = training;
        this.player = player;
        this.present = present;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Training getTraining() { return training; }
    public void setTraining(final Training training) { this.training = training; }
    public Player getPlayer() { return player; }
    public void setPlayer(final Player player) { this.player = player; }
    public boolean isPresent() { return present; }
    public void setPresent(final boolean present) { this.present = present; }
}
