package com.softball.domain.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class GameDay {
    private Long id;
    private LocalDate date;
    private String label;
    private String location;
    private Season season;
    private Set<Player> availablePlayers = new HashSet<>();
    private List<Game> games = new ArrayList<>();

    public GameDay() {}

    public GameDay(final LocalDate date, final String label, final String location, final Season season) {
        this.date = date;
        this.label = label;
        this.location = location;
        this.season = season;
    }

    public GameDay(final Long id, final LocalDate date, final String label, final String location) {
        this.id = id;
        this.date = date;
        this.label = label;
        this.location = location;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LocalDate getDate() { return date; }
    public void setDate(final LocalDate date) { this.date = date; }
    public String getLabel() { return label; }
    public void setLabel(final String label) { this.label = label; }
    public String getLocation() { return location; }
    public void setLocation(final String location) { this.location = location; }
    public Season getSeason() { return season; }
    public void setSeason(final Season season) { this.season = season; }
    public Set<Player> getAvailablePlayers() { return availablePlayers; }
    public void setAvailablePlayers(final Set<Player> availablePlayers) { this.availablePlayers = availablePlayers; }
    public List<Game> getGames() { return games; }
    public void setGames(final List<Game> games) { this.games = games; }
    public Long getSeasonId() { return season != null ? season.getId() : null; }

    public void setAvailablePlayersList(final List<Player> players) {
        this.availablePlayers = new HashSet<>(players);
    }
}
