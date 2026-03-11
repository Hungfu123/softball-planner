package com.softball.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "seasons")
public class Season {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @NotNull
    @Column(name = "season_year", nullable = false)
    private Integer year;

    @OneToMany(mappedBy = "season", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<GameDay> gameDays = new HashSet<>();

    @OneToMany(mappedBy = "season", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<LeagueTeam> leagueTeams = new ArrayList<>();

    @OneToMany(mappedBy = "season", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<LeagueResult> leagueResults = new ArrayList<>();

    public Season() {}

    public Season(String name, Integer year) {
        this.name = name;
        this.year = year;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }
    public Set<GameDay> getGameDays() { return gameDays; }
    public void setGameDays(Set<GameDay> gameDays) { this.gameDays = gameDays; }
    public List<LeagueTeam> getLeagueTeams() { return leagueTeams; }
    public void setLeagueTeams(List<LeagueTeam> leagueTeams) { this.leagueTeams = leagueTeams; }
}
