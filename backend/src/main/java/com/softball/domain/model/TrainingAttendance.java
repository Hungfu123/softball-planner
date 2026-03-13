package com.softball.domain.model;

public class TrainingAttendance {
    private Long id;
    private Training training;
    private Player player;
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
