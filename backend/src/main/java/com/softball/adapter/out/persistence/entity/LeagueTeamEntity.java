package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "league_teams", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"season_id", "name"})
})
public class LeagueTeamEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    @JsonIgnore
    private SeasonEntity season;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private boolean ownTeam = false;

    public LeagueTeamEntity() {}

    public LeagueTeamEntity(final SeasonEntity season, final String name, final boolean ownTeam) {
        this.season = season;
        this.name = name;
        this.ownTeam = ownTeam;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public SeasonEntity getSeason() { return season; }
    public void setSeason(final SeasonEntity season) { this.season = season; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public boolean isOwnTeam() { return ownTeam; }
    public void setOwnTeam(final boolean ownTeam) { this.ownTeam = ownTeam; }
    public Long getSeasonId() { return season != null ? season.getId() : null; }
}
