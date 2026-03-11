package com.softball.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "game_days", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"season_id", "date"})
})
public class GameDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private LocalDate date;

    private String label;

    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    @JsonIgnore
    private Season season;

    @ManyToMany
    @JoinTable(
        name = "game_day_players",
        joinColumns = @JoinColumn(name = "game_day_id"),
        inverseJoinColumns = @JoinColumn(name = "player_id")
    )
    private Set<Player> availablePlayers = new HashSet<>();

    @OneToMany(mappedBy = "gameDay", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("gameNumber ASC")
    private List<Game> games = new ArrayList<>();

    @OneToMany(mappedBy = "gameDay", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Car> cars = new ArrayList<>();

    public GameDay() {}

    public GameDay(final LocalDate date, final String label, final String location, final Season season) {
        this.date = date;
        this.label = label;
        this.location = location;
        this.season = season;
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
    public void setAvailablePlayersList(final List<Player> players) { this.availablePlayers = new HashSet<>(players); }
    public List<Game> getGames() { return games; }
    public void setGames(final List<Game> games) { this.games = games; }
    public Long getSeasonId() { return season != null ? season.getId() : null; }
}
