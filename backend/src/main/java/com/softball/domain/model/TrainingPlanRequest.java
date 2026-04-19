package com.softball.domain.model;

import java.util.List;

public class TrainingPlanRequest {
    private int playerCount;
    private String focus;
    private int durationMinutes;
    private List<Drill> availableDrills;

    public TrainingPlanRequest() {}

    public TrainingPlanRequest(final int playerCount, final String focus,
                               final int durationMinutes, final List<Drill> availableDrills) {
        this.playerCount = playerCount;
        this.focus = focus;
        this.durationMinutes = durationMinutes;
        this.availableDrills = availableDrills;
    }

    public int getPlayerCount() { return playerCount; }
    public void setPlayerCount(final int playerCount) { this.playerCount = playerCount; }
    public String getFocus() { return focus; }
    public void setFocus(final String focus) { this.focus = focus; }
    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(final int durationMinutes) { this.durationMinutes = durationMinutes; }
    public List<Drill> getAvailableDrills() { return availableDrills; }
    public void setAvailableDrills(final List<Drill> availableDrills) { this.availableDrills = availableDrills; }
}
