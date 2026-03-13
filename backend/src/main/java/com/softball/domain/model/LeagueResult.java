package com.softball.domain.model;

import java.time.LocalDate;

public class LeagueResult {
    private Long id;
    private Season season;
    private LeagueTeam homeTeam;
    private LeagueTeam awayTeam;
    private int homeScore;
    private int awayScore;
    private LocalDate date;

    public LeagueResult() {}

    public LeagueResult(final Season season, final LeagueTeam homeTeam, final LeagueTeam awayTeam,
                        final int homeScore, final int awayScore, final LocalDate date) {
        this.season = season;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.homeScore = homeScore;
        this.awayScore = awayScore;
        this.date = date;
    }

    public LeagueResult(final Long id, final LeagueTeam homeTeam, final LeagueTeam awayTeam,
                        final int homeScore, final int awayScore, final LocalDate date) {
        this.id = id;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.homeScore = homeScore;
        this.awayScore = awayScore;
        this.date = date;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Season getSeason() { return season; }
    public void setSeason(final Season season) { this.season = season; }
    public LeagueTeam getHomeTeam() { return homeTeam; }
    public void setHomeTeam(final LeagueTeam homeTeam) { this.homeTeam = homeTeam; }
    public LeagueTeam getAwayTeam() { return awayTeam; }
    public void setAwayTeam(final LeagueTeam awayTeam) { this.awayTeam = awayTeam; }
    public int getHomeScore() { return homeScore; }
    public void setHomeScore(final int homeScore) { this.homeScore = homeScore; }
    public int getAwayScore() { return awayScore; }
    public void setAwayScore(final int awayScore) { this.awayScore = awayScore; }
    public LocalDate getDate() { return date; }
    public void setDate(final LocalDate date) { this.date = date; }
}
