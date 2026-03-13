package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "training_attendance", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"training_id", "player_id"})
})
public class TrainingAttendanceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_id", nullable = false)
    @NotNull
    private TrainingEntity training;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_id", nullable = false)
    @NotNull
    private PlayerEntity player;

    @Column(nullable = false)
    private boolean present;

    public TrainingAttendanceEntity() {}

    public TrainingAttendanceEntity(final TrainingEntity training, final PlayerEntity player, final boolean present) {
        this.training = training;
        this.player = player;
        this.present = present;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public TrainingEntity getTraining() { return training; }
    public void setTraining(final TrainingEntity training) { this.training = training; }
    public PlayerEntity getPlayer() { return player; }
    public void setPlayer(final PlayerEntity player) { this.player = player; }
    public boolean isPresent() { return present; }
    public void setPresent(final boolean present) { this.present = present; }
}
