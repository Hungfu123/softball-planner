package com.softball.entity;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "league_results")
public class LeagueResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "home_team_id", nullable = false)
    private LeagueTeam homeTeam;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "away_team_id", nullable = false)
    private LeagueTeam awayTeam;

    @Column(nullable = false)
    private int homeScore;

    @Column(nullable = false)
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
