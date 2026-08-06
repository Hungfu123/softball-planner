package com.softball.domain.model;

import java.time.Instant;
import java.time.LocalDate;

public class Spielbogen {
    private Long id;
    private LocalDate date;
    private String location;
    private String homeTeamName;
    private String awayTeamName;
    private Season season;
    private BogenStatus status;
    private Integer currentInning;
    private BogenSide currentSide;
    private Integer homeRuns;
    private Integer awayRuns;
    private LeagueResult leagueResult;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant endedAt;
    private String publicToken;

    public Spielbogen() {}

    public Spielbogen(final LocalDate date, final String location,
                      final String homeTeamName, final String awayTeamName,
                      final Season season) {
        this.date = date;
        this.location = location;
        this.homeTeamName = homeTeamName;
        this.awayTeamName = awayTeamName;
        this.season = season;
        this.status = BogenStatus.DRAFT;
        this.currentInning = 1;
        this.currentSide = BogenSide.AWAY;
        this.homeRuns = 0;
        this.awayRuns = 0;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LocalDate getDate() { return date; }
    public void setDate(final LocalDate date) { this.date = date; }
    public String getLocation() { return location; }
    public void setLocation(final String location) { this.location = location; }
    public String getHomeTeamName() { return homeTeamName; }
    public void setHomeTeamName(final String homeTeamName) { this.homeTeamName = homeTeamName; }
    public String getAwayTeamName() { return awayTeamName; }
    public void setAwayTeamName(final String awayTeamName) { this.awayTeamName = awayTeamName; }
    public Season getSeason() { return season; }
    public void setSeason(final Season season) { this.season = season; }
    public BogenStatus getStatus() { return status; }
    public void setStatus(final BogenStatus status) { this.status = status; }
    public Integer getCurrentInning() { return currentInning; }
    public void setCurrentInning(final Integer currentInning) { this.currentInning = currentInning; }
    public BogenSide getCurrentSide() { return currentSide; }
    public void setCurrentSide(final BogenSide currentSide) { this.currentSide = currentSide; }
    public Integer getHomeRuns() { return homeRuns; }
    public void setHomeRuns(final Integer homeRuns) { this.homeRuns = homeRuns; }
    public Integer getAwayRuns() { return awayRuns; }
    public void setAwayRuns(final Integer awayRuns) { this.awayRuns = awayRuns; }
    public LeagueResult getLeagueResult() { return leagueResult; }
    public void setLeagueResult(final LeagueResult leagueResult) { this.leagueResult = leagueResult; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(final Instant endedAt) { this.endedAt = endedAt; }
    public String getPublicToken() { return publicToken; }
    public void setPublicToken(final String publicToken) { this.publicToken = publicToken; }
}
