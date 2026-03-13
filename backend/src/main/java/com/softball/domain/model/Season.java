package com.softball.domain.model;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class Season {
    private Long id;
    private String name;
    private Integer year;
    private Set<GameDay> gameDays = new HashSet<>();
    private List<LeagueTeam> leagueTeams = new ArrayList<>();

    public Season() {}

    public Season(final String name, final Integer year) {
        this.name = name;
        this.year = year;
    }

    public Season(final Long id, final String name, final Integer year) {
        this.id = id;
        this.name = name;
        this.year = year;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public Integer getYear() { return year; }
    public void setYear(final Integer year) { this.year = year; }
    public Set<GameDay> getGameDays() { return gameDays; }
    public void setGameDays(final Set<GameDay> gameDays) { this.gameDays = gameDays; }
    public List<LeagueTeam> getLeagueTeams() { return leagueTeams; }
    public void setLeagueTeams(final List<LeagueTeam> leagueTeams) { this.leagueTeams = leagueTeams; }
}
