package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lineup_set")
public class LineupSetEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_day_id", nullable = false)
    private Long gameDayId;

    @Column(nullable = false)
    private String name;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @OneToMany(mappedBy = "lineupSet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<LineupSetEntryEntity> entries = new ArrayList<>();

    @OneToMany(mappedBy = "lineupSet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<LineupSetStaffEntity> staff = new ArrayList<>();

    @OneToMany(mappedBy = "lineupSet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<LineupSetAvailablePlayerEntity> availablePlayers = new ArrayList<>();

    public LineupSetEntity() {}

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
    public List<LineupSetEntryEntity> getEntries() { return entries; }
    public void setEntries(final List<LineupSetEntryEntity> entries) { this.entries = entries; }
    public List<LineupSetStaffEntity> getStaff() { return staff; }
    public void setStaff(final List<LineupSetStaffEntity> staff) { this.staff = staff; }
    public List<LineupSetAvailablePlayerEntity> getAvailablePlayers() { return availablePlayers; }
    public void setAvailablePlayers(final List<LineupSetAvailablePlayerEntity> availablePlayers) { this.availablePlayers = availablePlayers; }
}
