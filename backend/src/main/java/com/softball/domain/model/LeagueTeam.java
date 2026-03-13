package com.softball.domain.model;

public class LeagueTeam {
    private Long id;
    private Season season;
    private String name;
    private boolean ownTeam;

    public LeagueTeam() {}

    public LeagueTeam(final Season season, final String name, final boolean ownTeam) {
        this.season = season;
        this.name = name;
        this.ownTeam = ownTeam;
    }

    public LeagueTeam(final Long id, final String name, final boolean ownTeam) {
        this.id = id;
        this.name = name;
        this.ownTeam = ownTeam;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Season getSeason() { return season; }
    public void setSeason(final Season season) { this.season = season; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public boolean isOwnTeam() { return ownTeam; }
    public void setOwnTeam(final boolean ownTeam) { this.ownTeam = ownTeam; }
    public Long getSeasonId() { return season != null ? season.getId() : null; }
}
