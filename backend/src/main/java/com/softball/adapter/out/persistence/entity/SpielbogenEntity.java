package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "spielbogen")
public class SpielbogenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column
    private String location;

    @Column(name = "home_team_name", nullable = false)
    private String homeTeamName;

    @Column(name = "away_team_name", nullable = false)
    private String awayTeamName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id")
    private SeasonEntity season;

    @Column(nullable = false)
    private String status;

    @Column(name = "current_inning", nullable = false)
    private Integer currentInning;

    @Column(name = "current_side", nullable = false)
    private String currentSide;

    @Column(name = "home_runs", nullable = false)
    private Integer homeRuns;

    @Column(name = "away_runs", nullable = false)
    private Integer awayRuns;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "league_result_id")
    private LeagueResultEntity leagueResult;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @OneToMany(mappedBy = "bogen", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<SpielbogenSlotEntity> slots = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getHomeTeamName() { return homeTeamName; }
    public void setHomeTeamName(String homeTeamName) { this.homeTeamName = homeTeamName; }
    public String getAwayTeamName() { return awayTeamName; }
    public void setAwayTeamName(String awayTeamName) { this.awayTeamName = awayTeamName; }
    public SeasonEntity getSeason() { return season; }
    public void setSeason(SeasonEntity season) { this.season = season; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getCurrentInning() { return currentInning; }
    public void setCurrentInning(Integer currentInning) { this.currentInning = currentInning; }
    public String getCurrentSide() { return currentSide; }
    public void setCurrentSide(String currentSide) { this.currentSide = currentSide; }
    public Integer getHomeRuns() { return homeRuns; }
    public void setHomeRuns(Integer homeRuns) { this.homeRuns = homeRuns; }
    public Integer getAwayRuns() { return awayRuns; }
    public void setAwayRuns(Integer awayRuns) { this.awayRuns = awayRuns; }
    public LeagueResultEntity getLeagueResult() { return leagueResult; }
    public void setLeagueResult(LeagueResultEntity leagueResult) { this.leagueResult = leagueResult; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }
    public List<SpielbogenSlotEntity> getSlots() { return slots; }
    public void setSlots(List<SpielbogenSlotEntity> slots) { this.slots = slots; }
}
