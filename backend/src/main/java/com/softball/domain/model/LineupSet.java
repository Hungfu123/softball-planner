package com.softball.domain.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class LineupSet {
    private Long id;
    private Long gameDayId;
    private String name;
    private Instant createdAt;
    private int sortOrder;
    private List<LineupSetEntry> entries = new ArrayList<>();
    private List<LineupSetStaffEntry> staffEntries = new ArrayList<>();
    private List<LineupSetGameRotation> gameRotations = new ArrayList<>();
    private List<Long> availablePlayerIds = new ArrayList<>();

    public LineupSet() {}

    public LineupSet(final Long gameDayId, final String name, final int sortOrder) {
        this.gameDayId = gameDayId;
        this.name = name;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Long getGameDayId() { return gameDayId; }
    public void setGameDayId(final Long gameDayId) { this.gameDayId = gameDayId; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(final int sortOrder) { this.sortOrder = sortOrder; }
    public List<LineupSetEntry> getEntries() { return entries; }
    public void setEntries(final List<LineupSetEntry> entries) { this.entries = entries; }
    public List<LineupSetStaffEntry> getStaffEntries() { return staffEntries; }
    public void setStaffEntries(final List<LineupSetStaffEntry> staffEntries) { this.staffEntries = staffEntries; }
    public List<LineupSetGameRotation> getGameRotations() { return gameRotations; }
    public void setGameRotations(final List<LineupSetGameRotation> gameRotations) { this.gameRotations = gameRotations != null ? gameRotations : new ArrayList<>(); }
    public List<Long> getAvailablePlayerIds() { return availablePlayerIds; }
    public void setAvailablePlayerIds(final List<Long> availablePlayerIds) { this.availablePlayerIds = availablePlayerIds; }
}
